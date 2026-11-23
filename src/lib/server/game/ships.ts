import { and, eq, inArray, ne } from 'drizzle-orm';
import { db, isUniqueViolation, schema } from '../db/index.js';
import { now } from '../clock.js';
import { logAudit } from '../audit.js';
import { notify } from '../notify.js';
import * as github from '../services/github.js';
import * as hackatime from '../services/hackatime.js';
import * as storage from '../services/storage.js';
import { gameState } from './season.js';
import type { SessionUser } from '../session.js';

export class GameError extends Error {}

const MAX_SCREENSHOT_MB = 5;

export type ShipInput = {
	name: string;
	description: string;
	repoUrl: string;
	demoUrl: string;
	hackatimeProjects: string[];
	screenshot: File | string | null;
};

export function isDemoUrl(url: string) {
	return /^https?:\/\//.test(url.trim());
}

export async function myProject(userId: number) {
	const [project] = await db
		.select()
		.from(schema.projects)
		.where(eq(schema.projects.ownerId, userId))
		.orderBy(schema.projects.id)
		.limit(1);
	return project ?? null;
}

export async function shipFor(userId: number, roundId: number) {
	const [ship] = await db
		.select()
		.from(schema.ships)
		.where(
			and(
				eq(schema.ships.userId, userId),
				eq(schema.ships.roundId, roundId),
				ne(schema.ships.status, 'withdrawn')
			)
		);
	return ship ?? null;
}

export async function ship(user: SessionUser, input: ShipInput) {
	const { round } = await gameState();
	if (!round || round.phase !== 'build')
		throw new GameError('You can only ship during build week.');
	if (!user.githubLogin) throw new GameError('Link your GitHub account first (settings).');
	if (!hackatime.isConnected(user)) throw new GameError('Connect Hackatime first (settings).');
	if (!user.address)
		throw new GameError('Add your address on Hack Club Auth, then refresh it in settings.');

	const name = input.name.trim();
	if (name.length < 2 || name.length > 60)
		throw new GameError('Give your project a name (2-60 characters).');
	const repo = github.parseRepo(input.repoUrl);
	if (!repo)
		throw new GameError(
			'The repo must be a public GitHub link like https://github.com/you/project.'
		);
	if (!input.demoUrl.trim()) throw new GameError('Add a demo link.');
	if (!isDemoUrl(input.demoUrl)) throw new GameError('The demo link should start with https://');
	if (!input.description.trim()) throw new GameError('Add a short description of your project.');
	if (input.description.trim().length > 500)
		throw new GameError('Keep the description under 500 characters.');
	if (!input.hackatimeProjects.length) throw new GameError('Pick at least one Hackatime project.');
	if (input.hackatimeProjects.length > 20 || input.hackatimeProjects.some((p) => p.length > 200))
		throw new GameError('Pick up to 20 Hackatime projects.');

	const prior = await shipFor(user.id, round.id);
	if (prior && prior.status !== 'changes') throw new GameError('You already shipped this round.');
	const upload = input.screenshot instanceof File ? await screenshotBytes(input.screenshot) : null;
	const kept =
		typeof input.screenshot === 'string' ? input.screenshot : (prior?.screenshotUrl ?? null);
	if (!upload && !kept) throw new GameError('Add a screenshot of your project.');

	const sha = await github.headSha(repo);
	if (!sha) throw new GameError("We couldn't find that repo on GitHub. Is it public?");

	const claimedHours = await hackatime.hoursFor(
		user,
		input.hackatimeProjects,
		round.buildStartsAt,
		now()
	);
	if (claimedHours <= 0)
		throw new GameError('Those Hackatime projects have no time logged this round yet.');
	const screenshotUrl = upload ? await storage.saveImage(upload) : kept;

	try {
		return await db.transaction(async (tx) => {
			const [existing] = await tx
				.select()
				.from(schema.ships)
				.where(
					and(
						eq(schema.ships.userId, user.id),
						eq(schema.ships.roundId, round.id),
						ne(schema.ships.status, 'withdrawn')
					)
				)
				.for('update');
			if (existing && existing.status !== 'changes')
				throw new GameError('You already shipped this round.');
			let project = await myProject(user.id);
			const projectValues = {
				name,
				description: input.description.trim(),
				repoUrl: `https://github.com/${repo.owner}/${repo.repo}`,
				demoUrl: input.demoUrl.trim(),
				updatedAt: now()
			};
			if (project) {
				[project] = await tx
					.update(schema.projects)
					.set(projectValues)
					.where(eq(schema.projects.id, project.id))
					.returning();
			} else {
				[project] = await tx
					.insert(schema.projects)
					.values({ ownerId: user.id, ...projectValues })
					.returning();
			}

			const shipValues = {
				projectId: project.id,
				userId: user.id,
				roundId: round.id,
				repoUrl: projectValues.repoUrl,
				demoUrl: projectValues.demoUrl,
				commitSha: sha,
				screenshotUrl,
				hackatimeProjects: input.hackatimeProjects,
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
		if (isUniqueViolation(e)) throw new GameError('You already shipped this round.');
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
					body: `Tier ${input.tier}, ${hours} hours approved (${hours * config.baseAcornsPerHour} acorns).`,
					link: '/projects',
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
					link: '/projects'
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

export async function withdrawShip(user: SessionUser, shipId: number) {
	const { round } = await gameState();
	const [s] = await db.select().from(schema.ships).where(eq(schema.ships.id, shipId));
	if (!s || s.userId !== user.id) throw new GameError('Ship not found.');
	if (!round || round.id !== s.roundId || round.phase !== 'build')
		throw new GameError('You can only withdraw during build week.');
	if (s.status === 'approved') throw new GameError('Approved ships cannot be withdrawn.');
	await db.update(schema.ships).set({ status: 'withdrawn' }).where(eq(schema.ships.id, shipId));
	await logAudit(user.id, 'ship.withdrawn', { type: 'ship', id: shipId });
}
