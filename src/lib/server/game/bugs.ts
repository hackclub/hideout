import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { db, isUniqueViolation, schema, type Tx } from '../db/index.js';
import { now } from '../clock.js';
import { logAudit } from '../audit.js';
import { notify } from '../notify.js';
import * as github from '../services/github.js';
import { gameState, roundById } from './season.js';
import { GameError } from './ships.js';
import type { SessionUser } from '../session.js';

export type Severity = 'minor' | 'major' | 'critical';
export const SEVERITIES: Severity[] = ['minor', 'major', 'critical'];
const DISPUTE_KINDS = ['not_a_bug', 'duplicate', 'severity', 'other'];

async function loadBug(tx: Tx, id: number) {
	const [row] = await tx
		.select({ bug: schema.bugs, ship: schema.ships })
		.from(schema.bugs)
		.innerJoin(schema.ships, eq(schema.ships.id, schema.bugs.shipId))
		.where(eq(schema.bugs.id, id))
		.for('update', { of: schema.bugs });
	if (!row) throw new GameError('That fix was not found.');
	return row;
}

export async function submitFix(
	user: SessionUser,
	input: { assignmentId: number; prUrl: string; severity: Severity; note: string }
) {
	const { round, config } = await gameState();
	if (!round || round.phase !== 'break')
		throw new GameError('Fix PRs can only be sent during break week.');
	if (!user.githubLogin) throw new GameError('Link your GitHub account first (settings).');
	if (!SEVERITIES.includes(input.severity)) throw new GameError('Pick a severity.');

	const [assignment] = await db
		.select({ a: schema.assignments, ship: schema.ships })
		.from(schema.assignments)
		.innerJoin(schema.ships, eq(schema.ships.id, schema.assignments.shipId))
		.where(eq(schema.assignments.id, input.assignmentId));
	if (!assignment || assignment.a.raccoonId !== user.id || assignment.a.roundId !== round.id)
		throw new GameError('That is not one of your targets.');
	if (assignment.a.status !== 'active') throw new GameError('This target is no longer in play.');

	const pr = github.parsePr(input.prUrl);
	if (!pr)
		throw new GameError('Paste a pull request link like https://github.com/owner/repo/pull/12');
	const target = github.parseRepo(assignment.ship.repoUrl)!;
	if (pr.repo.full !== target.full) throw new GameError(`The PR has to be on ${target.full}.`);

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(schema.bugs)
		.where(
			and(
				eq(schema.bugs.assignmentId, assignment.a.id),
				inArray(schema.bugs.status, ['waiting', 'accepted', 'disputed', 'merged'])
			)
		);
	if (count >= config.maxPairPrsPerRound)
		throw new GameError(
			`You can send at most ${config.maxPairPrsPerRound} fixes to one project per round.`
		);

	const [dupe] = await db
		.select({ id: schema.bugs.id })
		.from(schema.bugs)
		.where(eq(schema.bugs.prUrl, `https://github.com/${pr.repo.full}/pull/${pr.number}`));
	if (dupe) throw new GameError('That PR was already handed in.');

	const info = await github.getPr(pr.repo, pr.number);
	if (!info) throw new GameError("We couldn't find that PR on GitHub.");
	if (info.author !== user.githubLogin.toLowerCase())
		throw new GameError(
			`That PR was opened by @${info.author}, not your linked account @${user.githubLogin}.`
		);
	if (info.state === 'closed' && !info.merged) throw new GameError('That PR is closed.');
	if (info.createdAt && round.assignedAt && info.createdAt.getTime() < round.assignedAt.getTime())
		throw new GameError('That PR was opened before break week. Only new PRs count.');
	const files = await github.prFiles(pr.repo, pr.number);
	if (github.onlyTrivialFiles(files))
		throw new GameError('PRs that only change docs or text files do not count as fixes.');
	const risky = github.riskyFiles(files);
	const sevIndex = SEVERITIES.indexOf(input.severity);
	const needsCheck = Math.random() < config.checkRates[sevIndex];

	const respondBy = new Date(now().getTime() + config.responseHours * 36e5);
	try {
		return await db.transaction(async (tx) => {
			const [bug] = await tx
				.insert(schema.bugs)
				.values({
					roundId: round.id,
					shipId: assignment.ship.id,
					assignmentId: assignment.a.id,
					raccoonId: user.id,
					prUrl: info.url,
					prNumber: info.number,
					prTitle: info.title.slice(0, 200),
					proposedSeverity: input.severity,
					severity: input.severity,
					note: input.note.trim().slice(0, 1000) || null,
					respondBy,
					createdAt: now(),
					needsCheck,
					riskyFiles: risky.length ? risky : null,
					...(info.merged
						? { status: 'merged' as const, mergedAt: info.mergedAt ?? now(), mergedBy: 'builder' }
						: {})
				})
				.returning();
			await notify(
				assignment.ship.userId,
				{
					kind: 'bug.new',
					title: 'A raccoon got into your hideout',
					body:
						`A ${input.severity} fix PR was sent: "${bug.prTitle}". You have ${config.responseHours}h to accept or dispute it.` +
						(risky.length
							? ` Careful: it changes ${risky.slice(0, 3).join(', ')}. Read those changes before merging.`
							: ''),
					link: `/break/fix/${bug.id}`,
					dedupeKey: `bug.new.${bug.id}`
				},
				tx
			);
			await logAudit(
				user.id,
				'bug.submitted',
				{ type: 'bug', id: bug.id },
				{ prUrl: info.url },
				tx
			);
			return bug;
		});
	} catch (e) {
		if (isUniqueViolation(e)) throw new GameError('That PR was already handed in.');
		throw e;
	}
}

export async function withdrawFix(user: SessionUser, bugId: number) {
	await db.transaction(async (tx) => {
		const { bug } = await loadBug(tx, bugId);
		if (bug.raccoonId !== user.id) throw new GameError('That is not your fix.');
		if (!['waiting', 'accepted', 'disputed'].includes(bug.status))
			throw new GameError('This fix is already settled.');
		await tx
			.update(schema.bugs)
			.set({ status: 'withdrawn', resolvedAt: now() })
			.where(eq(schema.bugs.id, bugId));
		await logAudit(user.id, 'bug.withdrawn', { type: 'bug', id: bugId }, undefined, tx);
	});
}

export async function respond(
	user: SessionUser,
	bugId: number,
	answer: { action: 'accept' } | { action: 'dispute'; kind: string; reason: string }
) {
	await db.transaction(async (tx) => {
		const { bug, ship } = await loadBug(tx, bugId);
		if (ship.userId !== user.id) throw new GameError('This fix is not on your hideout.');
		if (bug.status !== 'waiting') throw new GameError('You already answered this one.');
		if (bug.respondBy.getTime() < now().getTime())
			throw new GameError('The answer window closed, so it was accepted.');

		if (answer.action === 'accept') {
			await tx
				.update(schema.bugs)
				.set({ status: 'accepted', resolvedAt: now() })
				.where(eq(schema.bugs.id, bugId));
			await notify(
				bug.raccoonId,
				{
					kind: 'bug.accepted',
					title: 'Your fix was accepted',
					body: `"${bug.prTitle}" counts once it is merged. Ship your fixes for this target too, that's what gets you hours.`,
					link: `/break/targets/${bug.assignmentId}`
				},
				tx
			);
		} else {
			if (!DISPUTE_KINDS.includes(answer.kind))
				throw new GameError('Pick why you are disputing it.');
			if (answer.reason.trim().length < 10)
				throw new GameError('Explain the dispute in a sentence or two.');
			await tx
				.update(schema.bugs)
				.set({
					status: 'disputed',
					disputeKind: answer.kind,
					disputeReason: answer.reason.trim().slice(0, 2000)
				})
				.where(eq(schema.bugs.id, bugId));
			await notify(
				bug.raccoonId,
				{
					kind: 'bug.disputed',
					title: 'Your fix was disputed',
					body: `A reviewer will decide. Reason: ${answer.reason.trim().slice(0, 300)}`,
					link: `/break/targets/${bug.assignmentId}`
				},
				tx
			);
		}
		await logAudit(user.id, `bug.${answer.action}`, { type: 'bug', id: bugId }, answer, tx);
	});
}

export async function resolveDispute(
	reviewer: SessionUser,
	bugId: number,
	input: { outcome: 'upheld' | 'invalid' | 'duplicate'; severity?: Severity; note: string }
) {
	await db.transaction(async (tx) => {
		const { bug, ship } = await loadBug(tx, bugId);
		if (bug.status !== 'disputed') throw new GameError('This fix is not in dispute.');
		if (reviewer.id === bug.raccoonId || reviewer.id === ship.userId)
			throw new GameError("You're part of this one, let someone else decide.");
		if (!input.note.trim()) throw new GameError('Write a short reason, both sides will see it.');

		const status = input.outcome === 'upheld' ? 'accepted' : input.outcome;
		await tx
			.update(schema.bugs)
			.set({
				status,
				overturned: input.outcome === 'upheld',
				severity: input.outcome === 'upheld' && input.severity ? input.severity : bug.severity,
				resolvedBy: reviewer.id,
				resolutionNote: input.note.trim(),
				resolvedAt: now()
			})
			.where(eq(schema.bugs.id, bugId));
		const msg = {
			kind: `bug.${input.outcome}`,
			title: `Dispute settled: ${input.outcome}`,
			body: input.note.trim()
		};
		await notify(bug.raccoonId, { ...msg, link: `/break/targets/${bug.assignmentId}` }, tx);
		await notify(ship.userId, { ...msg, link: `/break/fix/${bugId}` }, tx);
		await logAudit(reviewer.id, 'bug.resolved', { type: 'bug', id: bugId }, input, tx);
	});
}

export async function markMerged(
	bugId: number,
	by: 'builder' | 'reviewer',
	actorId: number | null,
	at = now()
) {
	await db.transaction(async (tx) => {
		const { bug, ship } = await loadBug(tx, bugId);
		if (bug.status === 'merged') return;
		if (by === 'reviewer' && bug.status !== 'accepted')
			throw new GameError('Only accepted fixes can be approved as merged.');
		if (!['waiting', 'accepted'].includes(bug.status)) return;
		await tx
			.update(schema.bugs)
			.set({ status: 'merged', mergedAt: at, mergedBy: by, resolvedAt: bug.resolvedAt ?? at })
			.where(eq(schema.bugs.id, bugId));
		await notify(
			bug.raccoonId,
			{
				kind: 'bug.merged',
				title: 'Your fix was merged',
				body: `"${bug.prTitle}" on ${ship.repoUrl.replace('https://github.com/', '')} counts for this round.`,
				link: `/break/targets/${bug.assignmentId}`,
				dedupeKey: `bug.merged.${bug.id}`
			},
			tx
		);
		await logAudit(actorId, 'bug.merged', { type: 'bug', id: bugId }, { by }, tx);
	});
}

export async function checkFix(
	reviewer: SessionUser,
	bugId: number,
	input: { result: 'confirmed' | 'downgraded' | 'rejected'; severity?: Severity; note: string }
) {
	await db.transaction(async (tx) => {
		const { bug, ship } = await loadBug(tx, bugId);
		if (reviewer.id === bug.raccoonId || reviewer.id === ship.userId)
			throw new GameError("You're part of this one, let someone else check it.");
		if (input.result !== 'confirmed' && !input.note.trim())
			throw new GameError('Write a short reason, both sides will see it.');
		if (
			input.result === 'downgraded' &&
			(!input.severity || SEVERITIES.indexOf(input.severity) >= SEVERITIES.indexOf(bug.severity))
		)
			throw new GameError('Pick a lower severity.');
		await tx
			.update(schema.bugs)
			.set({
				checkResult: input.result,
				checkedBy: reviewer.id,
				checkedAt: now(),
				severity: input.result === 'downgraded' ? input.severity! : bug.severity,
				resolutionNote: input.note.trim() || bug.resolutionNote
			})
			.where(eq(schema.bugs.id, bugId));
		if (input.result !== 'confirmed') {
			await notify(
				bug.raccoonId,
				{
					kind: `bug.check.${input.result}`,
					title:
						input.result === 'rejected'
							? 'A reviewer did not count your fix'
							: 'A reviewer lowered your fix severity',
					body: input.note.trim(),
					link: `/break/targets/${bug.assignmentId}`
				},
				tx
			);
		}
		await logAudit(reviewer.id, 'bug.checked', { type: 'bug', id: bugId }, input, tx);
	});
}

export async function reviewUnmerged(
	reviewer: SessionUser,
	bugId: number,
	approve: boolean,
	note: string
) {
	const [row] = await db
		.select({ bug: schema.bugs, ownerId: schema.ships.userId })
		.from(schema.bugs)
		.innerJoin(schema.ships, eq(schema.ships.id, schema.bugs.shipId))
		.where(eq(schema.bugs.id, bugId));
	if (!row) throw new GameError('That fix was not found.');
	if (row.bug.status !== 'accepted' || row.bug.unmergedReviewed)
		throw new GameError('This fix is not waiting on that decision.');
	if (reviewer.id === row.bug.raccoonId || reviewer.id === row.ownerId)
		throw new GameError("You're part of this one, let someone else decide.");
	const r = await roundById(row.bug.roundId);
	if (!r || !['ready', 'closed'].includes(r.round.phase))
		throw new GameError('Wait until the merge deadline has passed.');
	if (!approve && !note.trim()) throw new GameError('Say why it stays unmerged.');

	if (approve) await markMerged(bugId, 'reviewer', reviewer.id);
	await db
		.update(schema.bugs)
		.set({ unmergedReviewed: true, resolutionNote: note.trim() || row.bug.resolutionNote })
		.where(eq(schema.bugs.id, bugId));
	await logAudit(
		reviewer.id,
		'bug.unmerged_reviewed',
		{ type: 'bug', id: bugId },
		{ approve, note }
	);
}

export async function autoAcceptExpired() {
	const expired = await db
		.update(schema.bugs)
		.set({ status: 'accepted', autoAccepted: true, resolvedAt: now() })
		.where(and(eq(schema.bugs.status, 'waiting'), lt(schema.bugs.respondBy, now())))
		.returning();
	for (const bug of expired) {
		await notify(bug.raccoonId, {
			kind: 'bug.accepted',
			title: 'Your fix was accepted',
			body: `The builder didn't answer in time, so "${bug.prTitle}" was accepted.`,
			link: `/break/targets/${bug.assignmentId}`,
			dedupeKey: `bug.auto.${bug.id}`
		});
	}
	return expired.length;
}

export async function syncMerges() {
	const open = await db
		.select({ bug: schema.bugs, roundStatus: schema.rounds.status })
		.from(schema.bugs)
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.bugs.roundId))
		.where(
			and(inArray(schema.bugs.status, ['waiting', 'accepted']), eq(schema.rounds.status, 'open'))
		);
	let merged = 0;
	for (const { bug } of open) {
		const pr = github.parsePr(bug.prUrl);
		if (!pr) continue;
		const info = await github.getPr(pr.repo, pr.number);
		if (info?.merged) {
			const r = await roundById(bug.roundId);
			if (r && info.mergedAt && info.mergedAt.getTime() > r.round.scoringEndsAt.getTime()) continue;
			await markMerged(bug.id, 'builder', null, info.mergedAt ?? now());
			merged++;
		}
	}
	return merged;
}

export async function remindBuilders() {
	const soon = new Date(now().getTime() + 6 * 36e5);
	const rows = await db
		.select({ bug: schema.bugs, ownerId: schema.ships.userId })
		.from(schema.bugs)
		.innerJoin(schema.ships, eq(schema.ships.id, schema.bugs.shipId))
		.where(and(eq(schema.bugs.status, 'waiting'), lt(schema.bugs.respondBy, soon)));
	for (const { bug, ownerId } of rows) {
		await notify(ownerId, {
			kind: 'bug.reminder',
			title: '6 hours left to answer a fix PR',
			body: `"${bug.prTitle}" will be accepted automatically if you don't answer.`,
			link: `/break/fix/${bug.id}`,
			dedupeKey: `bug.reminder.${bug.id}`
		});
	}
}
