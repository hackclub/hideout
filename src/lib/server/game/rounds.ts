import { and, eq, inArray, lt, ne, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { now } from '../clock.js';
import { logAudit } from '../audit.js';
import { notify } from '../notify.js';
import { assignTargets } from '../../game/assign.js';
import { counts, payout, scoreRound, type ScoreBug } from '../../game/score.js';
import { roundById } from './season.js';
import { GameError } from './ships.js';
import type { SessionUser } from '../session.js';

async function liveShips(roundId: number) {
	return db
		.select()
		.from(schema.ships)
		.where(
			and(eq(schema.ships.roundId, roundId), inArray(schema.ships.status, ['pending', 'approved']))
		);
}

export async function generateAssignments(roundId: number, actorId: number | null) {
	const r = await roundById(roundId);
	if (!r) throw new GameError('Round not found.');
	if (r.round.assignedAt) throw new GameError('Targets were already handed out for this round.');

	const ships = await liveShips(roundId);
	const banned = new Set(
		(
			await db
				.select({ id: schema.users.id })
				.from(schema.users)
				.where(eq(schema.users.banned, true))
		).map((u) => u.id)
	);
	const shippers = await db
		.select({ userId: schema.ships.userId })
		.from(schema.ships)
		.where(and(eq(schema.ships.roundId, roundId), ne(schema.ships.status, 'withdrawn')));
	const raiderIds = [...new Set(shippers.map((s) => s.userId))].filter((id) => !banned.has(id));

	const earlier = await db
		.select({ raccoonId: schema.assignments.raccoonId, ownerId: schema.ships.userId })
		.from(schema.assignments)
		.innerJoin(schema.ships, eq(schema.ships.id, schema.assignments.shipId))
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.assignments.roundId))
		.where(
			and(eq(schema.rounds.seasonId, r.round.seasonId), lt(schema.rounds.number, r.round.number))
		);

	const pairs = assignTargets({
		raiders: raiderIds.map((userId) => ({ userId })),
		targets: ships
			.filter((s) => !banned.has(s.userId))
			.map((s) => ({ shipId: s.id, ownerId: s.userId, tier: s.tier })),
		k: r.config.targetsPerRaccoon,
		pastPairs: new Set(earlier.map((e) => `${e.raccoonId}:${e.ownerId}`))
	});

	await db.transaction(async (tx) => {
		const [locked] = await tx
			.update(schema.rounds)
			.set({ assignedAt: now() })
			.where(and(eq(schema.rounds.id, roundId), sql`${schema.rounds.assignedAt} is null`))
			.returning();
		if (!locked) throw new GameError('Targets were already handed out for this round.');
		if (pairs.length) {
			await tx
				.insert(schema.assignments)
				.values(pairs.map((p) => ({ roundId, raccoonId: p.userId, shipId: p.shipId })));
		}
		for (const id of new Set(pairs.map((p) => p.userId))) {
			await notify(
				id,
				{
					kind: 'targets',
					title: 'Break week! Your targets are ready',
					body: '3 projects are waiting for you to try and break them!',
					link: '/break',
					dedupeKey: `targets.${roundId}.${id}`
				},
				tx
			);
		}
		await logAudit(
			actorId,
			'round.assigned',
			{ type: 'round', id: roundId },
			{ pairs: pairs.length },
			tx
		);
	});
	return pairs.length;
}

export async function suggestVerdict(shipId: number) {
	const rows = await db
		.select({ a: schema.assignments })
		.from(schema.assignments)
		.where(
			and(eq(schema.assignments.shipId, shipId), eq(schema.assignments.hoursStatus, 'approved'))
		);
	const busy = rows.filter((r) => (r.a.approvedHours ?? 0) >= 1.5).length;
	const [{ prs }] = await db
		.select({ prs: sql<number>`count(*)::int` })
		.from(schema.bugs)
		.where(eq(schema.bugs.shipId, shipId));
	return {
		busy,
		prs,
		suggestion: busy >= 2 && prs >= 1 ? ('attacked' as const) : ('not_attacked' as const)
	};
}

export async function setVerdict(
	reviewer: SessionUser,
	shipId: number,
	verdict: 'attacked' | 'not_attacked' | 'too_simple' | 'unrunnable'
) {
	const [s] = await db.select().from(schema.ships).where(eq(schema.ships.id, shipId));
	if (!s) throw new GameError('Ship not found.');
	if (s.userId === reviewer.id) throw new GameError("You can't judge your own hideout.");
	if (s.status !== 'approved') throw new GameError('Only approved ships get a verdict.');
	const r = await roundById(s.roundId);
	if (!r || r.round.status === 'closed') throw new GameError('That round is already closed.');
	if (!['break', 'scoring', 'ready'].includes(r.round.phase))
		throw new GameError('Verdicts come after break week starts.');
	const bugs = await db.select().from(schema.bugs).where(eq(schema.bugs.shipId, shipId));
	if (bugs.some((b) => counts(b)))
		throw new GameError('This hideout has valid bugs, so it does not need a verdict.');
	await db
		.update(schema.ships)
		.set({ verdict, verdictBy: reviewer.id })
		.where(eq(schema.ships.id, shipId));
	await logAudit(reviewer.id, 'ship.verdict', { type: 'ship', id: shipId }, { verdict });
}

export async function previewRound(roundId: number) {
	const r = await roundById(roundId);
	if (!r) throw new GameError('Round not found.');
	const ships = await db.select().from(schema.ships).where(eq(schema.ships.roundId, roundId));
	const bugs = await db.select().from(schema.bugs).where(eq(schema.bugs.roundId, roundId));
	const baseRows = await db
		.select({ userId: schema.ledger.userId, total: sql<string>`sum(${schema.ledger.amount})` })
		.from(schema.ledger)
		.where(
			and(
				eq(schema.ledger.roundId, roundId),
				inArray(schema.ledger.reason, ['build_hours', 'break_hours'])
			)
		)
		.groupBy(schema.ledger.userId);
	const base = new Map(baseRows.map((b) => [b.userId, Number(b.total)]));

	const points = scoreRound(
		r.config,
		ships.map((s) => ({
			shipId: s.id,
			userId: s.userId,
			approved: s.status === 'approved',
			tier: s.tier,
			verdict: s.verdict
		})),
		bugs.map((b): ScoreBug => ({
			shipId: b.shipId,
			raccoonId: b.raccoonId,
			severity: b.severity,
			status: b.status,
			mergedBy: b.mergedBy,
			overturned: b.overturned,
			checkResult: b.checkResult
		}))
	);

	const totalBase = [...base.values()].reduce((s, n) => s + n, 0);
	const poolFromHours = (totalBase / r.config.baseAcornsPerHour) * r.config.poolAcornsPerHour;
	const pool = Math.round((poolFromHours + r.round.rolloverIn) * 100) / 100;

	const userIds = [...new Set([...points.keys(), ...base.keys()])];
	const result = payout({
		pool,
		capMultiplier: r.config.capMultiplier,
		users: userIds.map((id) => {
			const p = points.get(id) ?? { raccoon: 0, builder: 0 };
			return { userId: id, points: p.raccoon + p.builder, base: base.get(id) ?? 0 };
		})
	});

	const blockers = {
		pendingShips: ships.filter((s) => s.status === 'pending').length,
		openDisputes: bugs.filter((b) => b.status === 'disputed').length,
		pendingHours: (
			await db
				.select({ id: schema.assignments.id })
				.from(schema.assignments)
				.where(
					and(
						eq(schema.assignments.roundId, roundId),
						eq(schema.assignments.hoursStatus, 'pending')
					)
				)
		).length,
		missingVerdicts: ships.filter(
			(s) =>
				s.status === 'approved' && !s.verdict && !bugs.some((b) => b.shipId === s.id && counts(b))
		).length,
		uncheckedFixes: bugs.filter((b) => b.needsCheck && !b.checkResult && counts(b)).length,
		unmergedFixes: bugs.filter((b) => b.status === 'accepted' && !b.unmergedReviewed).length
	};

	return { ...r, pool, points, ...result, blockers };
}

export async function closeRound(admin: SessionUser, roundId: number) {
	const p = await previewRound(roundId);
	if (p.round.status === 'closed') throw new GameError('This round is already closed.');
	if (p.round.phase !== 'ready')
		throw new GameError('The round can be closed after the wrap-up window ends.');
	const words: Record<string, string> = {
		pendingShips: 'ships waiting for review',
		openDisputes: 'disputes',
		pendingHours: 'break-hour claims',
		missingVerdicts: 'unbreakable verdicts',
		uncheckedFixes: 'spot checks',
		unmergedFixes: 'unmerged fixes'
	};
	const open = Object.entries(p.blockers).filter(([, n]) => n > 0);
	if (open.length)
		throw new GameError(
			`Still to do: ${open.map(([k, n]) => `${n} ${words[k] ?? k}`).join(', ')}.`
		);

	await db.transaction(async (tx) => {
		const [locked] = await tx
			.update(schema.rounds)
			.set({
				status: 'closed',
				closedAt: now(),
				pool: p.pool,
				pointValue: p.pointValue,
				rolloverOut: p.rollover
			})
			.where(and(eq(schema.rounds.id, roundId), eq(schema.rounds.status, 'open')))
			.returning();
		if (!locked) throw new GameError('This round is already closed.');

		for (const row of p.rows) {
			const pts = p.points.get(row.userId) ?? { raccoon: 0, builder: 0 };
			const [score] = await tx
				.insert(schema.roundScores)
				.values({
					roundId,
					userId: row.userId,
					raccoonPoints: pts.raccoon,
					builderPoints: pts.builder,
					baseAcorns: row.base,
					bonusAcorns: row.bonus,
					cappedAcorns: row.capped
				})
				.returning();
			if (row.bonus > 0) {
				await tx.insert(schema.ledger).values({
					userId: row.userId,
					amount: row.bonus,
					reason: 'round_bonus',
					roundId,
					refType: 'round_score',
					refId: score.id,
					actorId: admin.id
				});
			}
			await notify(
				row.userId,
				{
					kind: 'round.paid',
					title: `Round ${p.round.number} is counted`,
					body: `${row.points} points, ${row.bonus} bonus acorns from the pool.`,
					link: '/home',
					dedupeKey: `round.paid.${roundId}.${row.userId}`
				},
				tx
			);
		}

		const [next] = await tx
			.select()
			.from(schema.rounds)
			.where(
				and(
					eq(schema.rounds.seasonId, p.round.seasonId),
					eq(schema.rounds.number, p.round.number + 1)
				)
			);
		if (next) {
			await tx
				.update(schema.rounds)
				.set({ rolloverIn: sql`${schema.rounds.rolloverIn} + ${p.rollover}` })
				.where(eq(schema.rounds.id, next.id));
		} else {
			await tx
				.update(schema.seasons)
				.set({ prizePool: sql`${schema.seasons.prizePool} + ${p.rollover}` })
				.where(eq(schema.seasons.id, p.round.seasonId));
		}
		await logAudit(
			admin.id,
			'round.closed',
			{ type: 'round', id: roundId },
			{ pool: p.pool, rollover: p.rollover },
			tx
		);
	});
}

export async function voidUser(admin: SessionUser, userId: number, reason: string) {
	await db.transaction(async (tx) => {
		await tx
			.update(schema.users)
			.set({ banned: true, bannedReason: reason })
			.where(eq(schema.users.id, userId));
		await tx
			.update(schema.assignments)
			.set({ status: 'void' })
			.where(and(eq(schema.assignments.raccoonId, userId), ne(schema.assignments.status, 'void')));
		await tx
			.update(schema.bugs)
			.set({ status: 'invalid', resolutionNote: 'Account banned.', resolvedAt: now() })
			.where(
				and(
					eq(schema.bugs.raccoonId, userId),
					inArray(schema.bugs.status, ['waiting', 'accepted', 'disputed'])
				)
			);
		await logAudit(admin.id, 'user.banned', { type: 'user', id: userId }, { reason }, tx);
	});
}
