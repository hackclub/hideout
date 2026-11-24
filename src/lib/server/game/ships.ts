import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db, isUniqueViolation, schema } from '../db/index.js';
import { now } from '../clock.js';
import { logAudit } from '../audit.js';
import { notify } from '../notify.js';
import * as github from '../services/github.js';
import * as hackatime from '../services/hackatime.js';
import * as kairos from '../services/kairos.js';
import * as storage from '../services/storage.js';
import { gameState, lockUser } from './season.js';
import { ladderProblem, sharedHackatime } from '../../game/ladder.js';
import type { SessionUser } from '../session.js';

export class GameError extends Error {}

export async function callService<T>(service: string, fn: () => Promise<T>) {
	try {
		return await fn();
	} catch (e) {
		console.error(e);
		throw new GameError(`${service} didn't answer. Try again in a minute.`);
	}
}

const MAX_SCREENSHOT_MB = 5;
export const SCREENSHOTS = 2;

export type ProjectInput = {
	name: string;
	description: string;
	repoUrl: string;
	demoUrl: string;
	hackatimeProjects: string[];
	kairosProjects: string[];
	isUpdate: boolean;
	updateDescription: string;
	screenshots: (File | null)[];
};

type Ship = typeof schema.ships.$inferSelect;

export function isDemoUrl(url: string) {
	return /^https?:\/\//.test(url.trim());
}

export function isLocked(ship: Pick<Ship, 'status'> | null) {
	return Boolean(ship && ship.status !== 'changes');
}

function projectRows() {
	return db
		.select({
			project: schema.projects,
			ship: schema.ships,
			round: { number: schema.rounds.number }
		})
		.from(schema.projects)
		.leftJoin(schema.ships, eq(schema.ships.projectId, schema.projects.id))
		.leftJoin(schema.rounds, eq(schema.rounds.id, schema.ships.roundId));
}

export async function myProjects(userId: number) {
	return projectRows().where(eq(schema.projects.ownerId, userId)).orderBy(desc(schema.projects.id));
}

export async function projectFor(userId: number, projectId: number) {
	if (!Number.isInteger(projectId)) return null;
	const [row] = await projectRows().where(
		and(eq(schema.projects.id, projectId), eq(schema.projects.ownerId, userId))
	);
	return row ?? null;
}

export async function shipsIn(userId: number, roundIds: number[]) {
	if (!roundIds.length) return [];
	return db
		.select()
		.from(schema.ships)
		.where(and(eq(schema.ships.userId, userId), inArray(schema.ships.roundId, roundIds)));
}

function checkName(raw: string) {
	const name = raw.trim();
	if (name.length < 2 || name.length > 60)
		throw new GameError('Give your project a name (2-60 characters).');
	return name;
}

export async function createProject(user: SessionUser, name: string) {
	const [project] = await db
		.insert(schema.projects)
		.values({ ownerId: user.id, name: checkName(name) })
		.returning();
	await logAudit(user.id, 'project.created', { type: 'project', id: project.id });
	return project;
}

export async function saveProject(user: SessionUser, projectId: number, input: ProjectInput) {
	const name = checkName(input.name);
	const repoUrl = input.repoUrl.trim();
	const repo = repoUrl ? github.parseRepo(repoUrl) : null;
	if (repoUrl && !repo)
		throw new GameError(
			'The repo must be a public GitHub link like https://github.com/you/project.'
		);
	const demoUrl = input.demoUrl.trim();
	if (demoUrl && !isDemoUrl(demoUrl))
		throw new GameError('The demo link should start with https://');
	const description = input.description.trim();
	if (description.length > 500) throw new GameError('Keep the description under 500 characters.');
	if (input.hackatimeProjects.length > 20 || input.hackatimeProjects.some((p) => p.length > 200))
		throw new GameError('Pick up to 20 Hackatime projects.');
	if (input.kairosProjects.length > 20 || input.kairosProjects.some((p) => p.length > 200))
		throw new GameError('Pick up to 20 Kairos projects.');
	const update = input.isUpdate ? input.updateDescription.trim() : '';
	if (update.length > 1000) throw new GameError("Keep what's new under 1000 characters.");

	const row = await projectFor(user.id, projectId);
	if (!row) throw new GameError('Project not found.');
	if (isLocked(row.ship)) throw new GameError("This project is shipped, so it can't be edited.");

	const uploads = await Promise.all(
		input.screenshots.slice(0, SCREENSHOTS).map((f) => (f ? screenshotBytes(f) : null))
	);
	const saved = await Promise.all(uploads.map((b) => (b ? storage.saveImage(b) : null)));

	return db.transaction(async (tx) => {
		await lockUser(tx, user.id);
		const [shipped] = await tx
			.select({ status: schema.ships.status })
			.from(schema.ships)
			.where(eq(schema.ships.projectId, projectId));
		if (isLocked(shipped ?? null))
			throw new GameError("This project is shipped, so it can't be edited.");
		const [current] = await tx
			.select({ screenshots: schema.projects.screenshots })
			.from(schema.projects)
			.where(eq(schema.projects.id, projectId));
		const screenshots = Array.from(
			{ length: SCREENSHOTS },
			(_, i) => saved[i] ?? current.screenshots[i] ?? null
		).filter((url): url is string => Boolean(url));
		const [project] = await tx
			.update(schema.projects)
			.set({
				name,
				description,
				repoUrl: repo ? `https://github.com/${repo.owner}/${repo.repo}` : null,
				demoUrl: demoUrl || null,
				hackatimeProjects: [...new Set(input.hackatimeProjects)],
				kairosProjects: [...new Set(input.kairosProjects)],
				updateDescription: update || null,
				screenshots,
				updatedAt: now()
			})
			.where(and(eq(schema.projects.id, projectId), eq(schema.projects.ownerId, user.id)))
			.returning();
		return project;
	});
}

export async function shipProject(user: SessionUser, projectId: number, input: ProjectInput) {
	const project = await saveProject(user, projectId, input);
	const { round, config } = await gameState();
	if (!round || round.phase !== 'build')
		throw new GameError('You can only ship during build week.');
	if (!user.githubLogin) throw new GameError('Link your GitHub account first (settings).');
	if (!hackatime.isConnected(user)) throw new GameError('Connect Hackatime first (settings).');
	if (!user.address)
		throw new GameError('Add your address on Hack Club Auth, then refresh it in settings.');

	const repo = project.repoUrl ? github.parseRepo(project.repoUrl) : null;
	if (!repo)
		throw new GameError('Add a public GitHub repo link like https://github.com/you/project.');
	if (!project.description) throw new GameError('Add a short description of your project.');
	if (!project.demoUrl) throw new GameError('Add a demo link.');
	if (project.screenshots.length < SCREENSHOTS)
		throw new GameError(`Add ${SCREENSHOTS} screenshots of your project.`);
	if (!project.hackatimeProjects.length)
		throw new GameError('Pick at least one Hackatime project.');
	if (kairos.enabled() && !project.kairosProjects.length)
		throw new GameError('Pick at least one Kairos project.');
	if (input.isUpdate && !project.updateDescription)
		throw new GameError("You ticked the update box, so say what's new.");

	const sha = await callService('GitHub', () => github.headSha(repo));
	if (!sha) throw new GameError("We couldn't find that repo on GitHub. Is it public?");

	const claimedHours = await callService('Hackatime', () =>
		hackatime.hoursFor(user, project.hackatimeProjects, round.buildStartsAt, now())
	);
	if (claimedHours <= 0)
		throw new GameError('Those Hackatime projects have no time logged this round yet.');

	try {
		return await db.transaction(async (tx) => {
			await lockUser(tx, user.id);
			const [existing] = await tx
				.select()
				.from(schema.ships)
				.where(eq(schema.ships.projectId, project.id));
			if (existing && existing.status !== 'changes')
				throw new GameError('This project is already shipped.');
			if (existing && existing.roundId !== round.id) {
				const [worked] = await tx
					.select({ id: schema.assignments.id })
					.from(schema.assignments)
					.where(eq(schema.assignments.shipId, existing.id))
					.limit(1);
				if (worked)
					throw new GameError(
						'Raccoons already worked on this ship in an earlier round. Make a new project for it and tick the update box.'
					);
			}
			const others = (
				await tx
					.select()
					.from(schema.ships)
					.where(
						and(
							eq(schema.ships.userId, user.id),
							eq(schema.ships.roundId, round.id),
							ne(schema.ships.status, 'rejected')
						)
					)
			).filter((s) => s.id !== existing?.id);
			const clash = sharedHackatime(
				others.map((s) => s.hackatimeProjects),
				project.hackatimeProjects
			);
			if (clash.length)
				throw new GameError(
					`${clash.join(', ')} already counts for another project you shipped this round. Each Hackatime project can only count once.`
				);
			const problem = ladderProblem(
				config.shipMinHours,
				others.map((s) => s.claimedHours),
				claimedHours
			);
			if (problem) throw new GameError(problem);

			const shipValues = {
				projectId: project.id,
				userId: user.id,
				roundId: round.id,
				repoUrl: `https://github.com/${repo.owner}/${repo.repo}`,
				demoUrl: project.demoUrl,
				commitSha: sha,
				screenshots: project.screenshots,
				hackatimeProjects: project.hackatimeProjects,
				kairosProjects: project.kairosProjects,
				claimedHours,
				status: 'pending' as const,
				createdAt: now()
			};
			let saved;
			if (existing) {
				[saved] = await tx
					.update(schema.ships)
					.set(shipValues)
					.where(eq(schema.ships.id, existing.id))
					.returning();
			} else {
				[saved] = await tx.insert(schema.ships).values(shipValues).returning();
			}
			await logAudit(
				user.id,
				existing ? 'ship.reshipped' : 'ship.created',
				{ type: 'ship', id: saved.id },
				{ sha },
				tx
			);
			return saved;
		});
	} catch (e) {
		if (isUniqueViolation(e)) throw new GameError('This project is already shipped.');
		throw e;
	}
}

export async function screenshotBytes(file: File) {
	if (file.size > MAX_SCREENSHOT_MB * 1024 * 1024)
		throw new GameError(`That screenshot is too big. Keep it under ${MAX_SCREENSHOT_MB}MB.`);
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!storage.imageType(bytes))
		throw new GameError('The screenshot has to be a PNG, JPEG or WebP image.');
	return bytes;
}

export type ReviewInput = {
	decision: 'approved' | 'changes' | 'rejected';
	tier: number | null;
	approvedHours: number | null;
	note: string;
};

export async function reviewShip(reviewer: SessionUser, shipId: number, input: ReviewInput) {
	const { config } = await gameState();
	return db.transaction(async (tx) => {
		const [s] = await tx
			.select()
			.from(schema.ships)
			.where(eq(schema.ships.id, shipId))
			.for('update');
		if (!s) throw new GameError('Ship not found.');
		if (s.userId === reviewer.id) throw new GameError("You can't review your own ship.");
		if (s.status === 'approved' && input.decision !== 'approved')
			throw new GameError('This ship is already approved. Ask an admin to undo it.');
		const [round] = await tx.select().from(schema.rounds).where(eq(schema.rounds.id, s.roundId));
		if (s.status === 'approved' && round?.status === 'closed')
			throw new GameError('That round is closed and paid, so this ship can no longer change.');
		if (input.decision !== 'approved' && !input.note.trim())
			throw new GameError('Write a note so they know what to fix.');

		if (input.decision === 'approved') {
			if (!input.tier || input.tier < 1 || input.tier > 3)
				throw new GameError('Pick a tier (1-3).');
			const hours = input.approvedHours ?? 0;
			if (hours < 0 || hours > s.claimedHours)
				throw new GameError(`Approved hours must be 0 to ${s.claimedHours}.`);

			await tx
				.update(schema.ships)
				.set({
					status: 'approved',
					tier: input.tier,
					approvedHours: hours,
					reviewerId: reviewer.id,
					reviewNote: input.note.trim() || null,
					reviewedAt: now()
				})
				.where(eq(schema.ships.id, shipId));
			const amount = Math.round(hours * config.baseAcornsPerHour * 100) / 100;
			await tx
				.insert(schema.ledger)
				.values({
					userId: s.userId,
					amount,
					reason: 'build_hours',
					roundId: s.roundId,
					refType: 'ship',
					refId: s.id,
					actorId: reviewer.id
				})
				.onConflictDoUpdate({
					target: [schema.ledger.reason, schema.ledger.refType, schema.ledger.refId],
					set: { amount, actorId: reviewer.id }
				});
			await tx
				.insert(schema.unifiedOutbox)
				.values({ shipId: s.id })
				.onConflictDoUpdate({
					target: schema.unifiedOutbox.shipId,
					set: { state: 'queued', error: null }
				});
			await notify(
				s.userId,
				{
					kind: 'ship.approved',
					title:
						s.status === 'approved' ? 'Your ship review was updated' : 'Your project was approved',
					body: `Tier ${input.tier}, ${hours} hours approved (${amount} acorns).`,
					link: `/projects/${s.projectId}`,
					dedupeKey: s.status === 'approved' ? undefined : `ship.approved.${s.id}`
				},
				tx
			);
		} else {
			await tx
				.update(schema.ships)
				.set({
					status: input.decision,
					reviewerId: reviewer.id,
					reviewNote: input.note.trim(),
					reviewedAt: now()
				})
				.where(eq(schema.ships.id, shipId));
			await notify(
				s.userId,
				{
					kind: `ship.${input.decision}`,
					title:
						input.decision === 'changes'
							? 'Your project needs a few changes'
							: 'Your project got rejected :(',
					body: input.note.trim(),
					link: `/projects/${s.projectId}`
				},
				tx
			);
			if (input.decision === 'rejected') {
				await tx
					.update(schema.assignments)
					.set({ status: 'void' })
					.where(eq(schema.assignments.shipId, s.id));
				await tx
					.update(schema.bugs)
					.set({
						status: 'invalid',
						resolutionNote: 'The target ship was rejected.',
						resolvedAt: now()
					})
					.where(
						and(eq(schema.bugs.shipId, s.id), inArray(schema.bugs.status, ['waiting', 'disputed']))
					);
				await tx
					.update(schema.bugs)
					.set({ status: 'merged', mergedBy: 'reviewer', mergedAt: now() })
					.where(and(eq(schema.bugs.shipId, s.id), eq(schema.bugs.status, 'accepted')));
			}
		}
		await logAudit(
			reviewer.id,
			`ship.${input.decision}`,
			{ type: 'ship', id: shipId },
			{ ...input },
			tx
		);
	});
}
