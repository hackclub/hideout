import { and, eq, ne } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { now } from '../clock.js';
import { logAudit } from '../audit.js';
import { notify } from '../notify.js';
import * as github from '../services/github.js';
import * as hackatime from '../services/hackatime.js';
import * as kairos from '../services/kairos.js';
import * as storage from '../services/storage.js';
import { roundById } from './season.js';
import { GameError, callService, isDemoUrl, screenshotBytes } from './ships.js';
import type { SessionUser } from '../session.js';

export type FixShipInput = {
	forkUrl: string;
	demoUrl: string;
	project: string;
	kairosProject: string;
	note: string;
	screenshot: File | string | null;
};

export async function shipFixes(user: SessionUser, assignmentId: number, input: FixShipInput) {
	const [row] = await db
		.select({ a: schema.assignments, ship: schema.ships })
		.from(schema.assignments)
		.innerJoin(schema.ships, eq(schema.ships.id, schema.assignments.shipId))
		.where(eq(schema.assignments.id, assignmentId));
	if (!row || row.a.raccoonId !== user.id) throw new GameError('That is not one of your targets.');
	const { a, ship } = row;
	const round = (await roundById(a.roundId))?.round;
	if (!round || round.status !== 'open' || !['break', 'scoring'].includes(round.phase))
		throw new GameError('You can ship your fixes during break week and the wrap-up after it.');
	if (a.hoursStatus === 'approved')
		throw new GameError('Your fixes for this one are already approved.');
	if (!user.githubLogin) throw new GameError('Link your GitHub account first (settings).');
	if (!user.birthday)
		throw new GameError('Add your birthday on Hack Club Auth, then refresh it in settings.');
	const login = user.githubLogin.toLowerCase();

	const sent = await db
		.select({ id: schema.bugs.id })
		.from(schema.bugs)
		.where(and(eq(schema.bugs.assignmentId, a.id), ne(schema.bugs.status, 'withdrawn')));
	if (!sent.length)
		throw new GameError('Send at least one fix PR to this project first. No PR, no hours.');

	const fork = github.parseRepo(input.forkUrl);
	if (!fork)
		throw new GameError('The fork should be a GitHub link like https://github.com/you/project.');
	if (fork.owner.toLowerCase() !== login)
		throw new GameError(`The fork has to be on your linked GitHub account, @${user.githubLogin}.`);
	if (!input.demoUrl.trim()) throw new GameError('Add a demo link to your fixed version.');
	if (!isDemoUrl(input.demoUrl)) throw new GameError('The demo link should start with https://');
	if (!input.project) throw new GameError('Pick the Hackatime project you used for this target.');
	if (input.project.length > 200) throw new GameError('That Hackatime project name is too long.');
	const kairosProject = input.kairosProject.trim();
	if (kairos.enabled() && !kairosProject)
		throw new GameError('Pick your Kairos project for this target.');
	if (kairosProject.length > 200) throw new GameError('That Kairos project name is too long.');
	if (input.note.trim().length < 10)
		throw new GameError('Write a sentence about what you worked on.');
	const upload = input.screenshot instanceof File ? await screenshotBytes(input.screenshot) : null;
	const kept = typeof input.screenshot === 'string' ? input.screenshot : a.forkScreenshotUrl;
	if (!upload && !kept) throw new GameError('Add a screenshot of the fixed version.');

	const ownShips = await db
		.select({ hackatimeProjects: schema.ships.hackatimeProjects })
		.from(schema.ships)
		.where(and(eq(schema.ships.userId, user.id), eq(schema.ships.roundId, a.roundId)));
	if (ownShips.some((s) => s.hackatimeProjects.includes(input.project)))
		throw new GameError(
			"That Hackatime project is already counted for your own hideout. Use a separate one for each target's fork."
		);
	const taken = await db
		.select({ id: schema.assignments.id })
		.from(schema.assignments)
		.where(
			and(
				eq(schema.assignments.raccoonId, user.id),
				eq(schema.assignments.roundId, a.roundId),
				eq(schema.assignments.hackatimeProject, input.project)
			)
		);
	if (taken.some((t) => t.id !== a.id))
		throw new GameError('That Hackatime project is already used for another target.');

	const upstream = github.parseRepo(ship.repoUrl);
	const info = upstream ? await callService('GitHub', () => github.forkOf(fork, upstream)) : null;
	if (!info) throw new GameError("We couldn't find that fork on GitHub. Is it public?");
	if (info.owner !== login)
		throw new GameError(`The fork has to be on your linked GitHub account, @${user.githubLogin}.`);
	if (!info.isFork)
		throw new GameError(
			`That repo isn't a fork of ${ship.repoUrl.replace('https://github.com/', '')}. Fork it on GitHub and push your fixes there.`
		);

	const claimed = await callService('Hackatime', () =>
		hackatime.hoursFor(user, [input.project], round.breakStartsAt, round.breakEndsAt)
	);
	const screenshotUrl = upload ? await storage.saveImage(upload) : kept;
	const updated = await db
		.update(schema.assignments)
		.set({
			forkUrl: `https://github.com/${fork.owner}/${fork.repo}`,
			forkDemoUrl: input.demoUrl.trim(),
			forkScreenshotUrl: screenshotUrl,
			hackatimeProject: input.project,
			kairosProject: kairosProject || null,
			note: input.note.trim().slice(0, 2000),
			claimedHours: claimed,
			hoursStatus: 'pending'
		})
		.where(and(eq(schema.assignments.id, a.id), ne(schema.assignments.hoursStatus, 'approved')))
		.returning({ id: schema.assignments.id });
	if (!updated.length) throw new GameError('Your fixes for this one are already approved.');
	await logAudit(
		user.id,
		'hours.logged',
		{ type: 'assignment', id: a.id },
		{ project: input.project, claimed, fork: fork.full }
	);
	return claimed;
}

export async function reviewBreakHours(
	reviewer: SessionUser,
	assignmentId: number,
	input: { approve: boolean; hours: number; note: string }
) {
	await db.transaction(async (tx) => {
		const [a] = await tx
			.select()
			.from(schema.assignments)
			.where(eq(schema.assignments.id, assignmentId))
			.for('update');
		if (!a) throw new GameError('Not found.');
		if (a.raccoonId === reviewer.id) throw new GameError("You can't review your own hours.");
		if (a.hoursStatus !== 'pending') throw new GameError('Nothing to review here.');
		const r = await roundById(a.roundId);
		if (!r) throw new GameError('Round not found.');
		const max = a.claimedHours ?? 0;
		const hours = input.approve ? input.hours : 0;
		if (hours < 0 || hours > max) throw new GameError(`Approved hours must be 0 to ${max}.`);
		if (!input.approve && !input.note.trim())
			throw new GameError('Say why the hours were not approved.');
		if (input.approve && hours > 0) {
			if (!a.forkUrl || !a.forkDemoUrl)
				throw new GameError(
					'This one has no fork or demo. Turn it down so they can ship their fixes.'
				);
			const sent = await tx
				.select({ id: schema.bugs.id })
				.from(schema.bugs)
				.where(and(eq(schema.bugs.assignmentId, a.id), ne(schema.bugs.status, 'withdrawn')));
			if (!sent.length)
				throw new GameError(
					'They withdrew every fix PR on this target (or never sent one), so there are no hours to approve.'
				);
		}

		await tx
			.update(schema.assignments)
			.set({
				hoursStatus: input.approve ? 'approved' : 'rejected',
				approvedHours: hours,
				hoursReviewerId: reviewer.id,
				hoursNote: input.note.trim() || null,
				hoursReviewedAt: now()
			})
			.where(eq(schema.assignments.id, a.id));
		if (input.approve && hours > 0) {
			await tx.insert(schema.ledger).values({
				userId: a.raccoonId,
				amount: Math.round(hours * r.config.baseAcornsPerHour * 100) / 100,
				reason: 'break_hours',
				roundId: a.roundId,
				refType: 'assignment',
				refId: a.id,
				actorId: reviewer.id
			});
			await tx
				.insert(schema.unifiedOutbox)
				.values({ assignmentId: a.id, state: 'waiting' })
				.onConflictDoUpdate({
					target: schema.unifiedOutbox.assignmentId,
					set: { state: 'waiting', error: null }
				});
		}
		await notify(
			a.raccoonId,
			{
				kind: input.approve ? 'hours.approved' : 'hours.rejected',
				title: input.approve ? `${hours}h of break time approved` : 'Break hours not approved',
				body: input.note.trim(),
				link: `/break/targets/${a.id}`
			},
			tx
		);
		await logAudit(reviewer.id, 'hours.reviewed', { type: 'assignment', id: a.id }, input, tx);
	});
}

export async function refreshClaimed(assignmentId: number) {
	const [row] = await db
		.select({ a: schema.assignments, user: schema.users })
		.from(schema.assignments)
		.innerJoin(schema.users, eq(schema.users.id, schema.assignments.raccoonId))
		.where(eq(schema.assignments.id, assignmentId));
	if (!row?.a.hackatimeProject) return null;
	const r = await roundById(row.a.roundId);
	if (!r) return null;
	const end = now() < r.round.breakEndsAt ? now() : r.round.breakEndsAt;
	return hackatime.hoursFor(row.user, [row.a.hackatimeProject], r.round.breakStartsAt, end);
}
