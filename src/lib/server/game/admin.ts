import {
	and,
	asc,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	like,
	ne,
	or,
	sql,
	type SQL
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, schema } from '../db/index.js';
import { logAudit } from '../audit.js';
import { notify } from '../notify.js';
import { DEFAULT_SEASON_CONFIG, type SeasonConfig } from '../db/schema.js';
import { counts as bugCounts, LIVE_FIX } from '../../game/score.js';
import { balance, lockUser, seasonConfig, viewRound, type RoundView } from './season.js';
import { GameError } from './ships.js';
import { reviewUnmerged } from './bugs.js';
import { refreshClaimed } from './hours.js';
import { suggestVerdict, voidUser } from './rounds.js';
import type { SessionUser } from '../session.js';

const raccoon = alias(schema.users, 'raccoon');
const builder = alias(schema.users, 'builder');
const actor = alias(schema.users, 'actor');

export type StaffRound = RoundView & { seasonName: string; config: SeasonConfig };

export async function allRounds(): Promise<StaffRound[]> {
	const rows = await db
		.select({ round: schema.rounds, season: schema.seasons })
		.from(schema.rounds)
		.innerJoin(schema.seasons, eq(schema.seasons.id, schema.rounds.seasonId))
		.orderBy(asc(schema.rounds.buildStartsAt));
	return rows.map(({ round, season }) => {
		const config = seasonConfig(season);
		return { ...viewRound(round, config), seasonName: season.name, config };
	});
}

const ids = (rounds: StaffRound[], test: (r: StaffRound) => boolean) =>
	rounds.filter(test).map((r) => r.id);

async function count(
	table:
		| typeof schema.ships
		| typeof schema.bugs
		| typeof schema.assignments
		| typeof schema.orders
		| typeof schema.unifiedOutbox,
	where: SQL | undefined
) {
	const [row] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(table)
		.where(where);
	return row.n;
}

const BUSY_PHASES = ['scoring', 'ready'];

async function cleanShips(roundIds: number[], onlyMissing: boolean) {
	if (!roundIds.length) return [];
	const ships = await db
		.select({ id: schema.ships.id, verdict: schema.ships.verdict })
		.from(schema.ships)
		.where(and(inArray(schema.ships.roundId, roundIds), eq(schema.ships.status, 'approved')));
	const bugs = await db
		.select({
			shipId: schema.bugs.shipId,
			status: schema.bugs.status,
			checkResult: schema.bugs.checkResult
		})
		.from(schema.bugs)
		.where(inArray(schema.bugs.roundId, roundIds));
	return ships.filter(
		(s) => (!onlyMissing || !s.verdict) && !bugs.some((b) => b.shipId === s.id && bugCounts(b))
	);
}

export type DeskCounts = Awaited<ReturnType<typeof deskCounts>>;

export async function deskCounts(withAdmin: boolean) {
	const rounds = await allRounds();
	const open = ids(rounds, (r) => r.status === 'open');
	const ready = ids(rounds, (r) => r.phase === 'ready');
	const due = ids(rounds, (r) => BUSY_PHASES.includes(r.phase));
	const [ships, disputes, checks, unmerged, hours, verdicts] = await Promise.all([
		count(
			schema.ships,
			and(eq(schema.ships.status, 'pending'), inArray(schema.ships.roundId, open))
		),
		count(schema.bugs, and(eq(schema.bugs.status, 'disputed'), inArray(schema.bugs.roundId, open))),
		count(
			schema.bugs,
			and(
				eq(schema.bugs.needsCheck, true),
				isNull(schema.bugs.checkResult),
				inArray(schema.bugs.status, ['accepted', 'merged']),
				inArray(schema.bugs.roundId, open)
			)
		),
		count(
			schema.bugs,
			and(
				eq(schema.bugs.status, 'accepted'),
				eq(schema.bugs.unmergedReviewed, false),
				inArray(schema.bugs.roundId, ready)
			)
		),
		count(
			schema.assignments,
			and(eq(schema.assignments.hoursStatus, 'pending'), inArray(schema.assignments.roundId, open))
		),
		cleanShips(due, true).then((s) => s.length)
	]);
	const admin = withAdmin
		? {
				orders: await count(schema.orders, eq(schema.orders.status, 'pending')),
				unified: await count(schema.unifiedOutbox, eq(schema.unifiedOutbox.state, 'error'))
			}
		: { orders: 0, unified: 0 };
	return { ships, disputes, checks, unmerged, hours, verdicts, ...admin };
}

export async function deskOutlook() {
	const rounds = await allRounds();
	const notReady = ids(rounds, (r) => r.status === 'open' && r.phase !== 'ready');
	const unmergedLater = await count(
		schema.bugs,
		and(
			eq(schema.bugs.status, 'accepted'),
			eq(schema.bugs.unmergedReviewed, false),
			inArray(schema.bugs.roundId, notReady)
		)
	);
	const waiting = await count(
		schema.bugs,
		and(eq(schema.bugs.status, 'waiting'), inArray(schema.bugs.roundId, notReady))
	);
	const inPlay = rounds.filter((r) => r.status === 'open' && r.phase !== 'upcoming');
	const stats = [];
	for (const r of inPlay) {
		const [ships] = await db
			.select({
				shipped: sql<number>`count(*)::int`,
				approved: sql<number>`count(*) filter (where ${schema.ships.status} = 'approved')::int`
			})
			.from(schema.ships)
			.where(eq(schema.ships.roundId, r.id));
		const [fixes] = await db
			.select({
				fixes: sql<number>`count(*)::int`,
				merged: sql<number>`count(*) filter (where ${schema.bugs.status} = 'merged')::int`
			})
			.from(schema.bugs)
			.where(eq(schema.bugs.roundId, r.id));
		const [raccoons] = await db
			.select({ n: sql<number>`count(distinct ${schema.assignments.raccoonId})::int` })
			.from(schema.assignments)
			.where(eq(schema.assignments.roundId, r.id));
		stats.push({
			id: r.id,
			number: r.number,
			phase: r.phase,
			scoringEndsAt: r.scoringEndsAt,
			...ships,
			...fixes,
			raccoons: raccoons.n
		});
	}
	return { unmergedLater, waiting, rounds: stats };
}

export const SHIP_STATUSES = ['pending', 'changes', 'approved', 'rejected'] as const;
type ShipStatus = (typeof SHIP_STATUSES)[number];

async function shippedTimes(shipIds: number[]) {
	if (!shipIds.length) return new Map<number, Date>();
	const rows = await db
		.select({ id: schema.audit.targetId, at: sql<string>`max(${schema.audit.createdAt})` })
		.from(schema.audit)
		.where(
			and(
				eq(schema.audit.targetType, 'ship'),
				inArray(schema.audit.action, ['ship.created', 'ship.reshipped']),
				inArray(schema.audit.targetId, shipIds)
			)
		)
		.groupBy(schema.audit.targetId);
	return new Map(rows.map((r) => [r.id!, new Date(r.at)]));
}

export function hoursPerDay(claimed: number, buildStartsAt: Date, shippedAt: Date) {
	const days = Math.max(1, Math.ceil((shippedAt.getTime() - buildStartsAt.getTime()) / 864e5));
	return Math.round((claimed / days) * 10) / 10;
}

export async function shipQueue(status: string) {
	const known = (SHIP_STATUSES as readonly string[]).includes(status);
	const rows = await db
		.select({
			ship: {
				id: schema.ships.id,
				status: schema.ships.status,
				tier: schema.ships.tier,
				claimedHours: schema.ships.claimedHours,
				approvedHours: schema.ships.approvedHours,
				createdAt: schema.ships.createdAt,
				reviewedAt: schema.ships.reviewedAt,
				userId: schema.ships.userId
			},
			project: { name: schema.projects.name },
			maker: { name: builder.name, githubLogin: builder.githubLogin },
			round: {
				number: schema.rounds.number,
				buildStartsAt: schema.rounds.buildStartsAt,
				status: schema.rounds.status
			}
		})
		.from(schema.ships)
		.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
		.innerJoin(builder, eq(builder.id, schema.ships.userId))
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.ships.roundId))
		.where(known ? eq(schema.ships.status, status as ShipStatus) : undefined)
		.orderBy(desc(schema.ships.createdAt))
		.limit(300);
	const shipped = await shippedTimes(rows.map((r) => r.ship.id));
	const list = rows.map((r) => {
		const shippedAt = shipped.get(r.ship.id) ?? r.ship.createdAt;
		return {
			...r,
			shippedAt,
			perDay: hoursPerDay(r.ship.claimedHours, r.round.buildStartsAt, shippedAt)
		};
	});
	if (status === 'pending' || status === 'changes')
		list.sort((a, b) => a.shippedAt.getTime() - b.shippedAt.getTime());
	return list;
}

export async function shipDetail(id: number) {
	const [row] = await db
		.select({
			ship: schema.ships,
			project: schema.projects,
			maker: {
				id: builder.id,
				name: builder.name,
				githubLogin: builder.githubLogin,
				slackId: builder.slackId,
				banned: builder.banned,
				createdAt: builder.createdAt
			},
			round: schema.rounds,
			season: schema.seasons
		})
		.from(schema.ships)
		.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
		.innerJoin(builder, eq(builder.id, schema.ships.userId))
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.ships.roundId))
		.innerJoin(schema.seasons, eq(schema.seasons.id, schema.rounds.seasonId))
		.where(eq(schema.ships.id, id));
	if (!row) return null;
	const config = seasonConfig(row.season);
	const round = viewRound(row.round, config);

	const names = async (userId: number | null) => {
		if (!userId) return null;
		const [u] = await db
			.select({ name: schema.users.name })
			.from(schema.users)
			.where(eq(schema.users.id, userId));
		return u?.name ?? null;
	};
	const past = await db
		.select({
			id: schema.ships.id,
			status: schema.ships.status,
			tier: schema.ships.tier,
			claimedHours: schema.ships.claimedHours,
			approvedHours: schema.ships.approvedHours,
			verdict: schema.ships.verdict,
			createdAt: schema.ships.createdAt,
			reviewNote: schema.ships.reviewNote,
			roundNumber: schema.rounds.number,
			projectName: schema.projects.name
		})
		.from(schema.ships)
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.ships.roundId))
		.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
		.where(and(eq(schema.ships.userId, row.maker.id), ne(schema.ships.id, id)))
		.orderBy(desc(schema.ships.createdAt));
	const fixes = await db
		.select({
			id: schema.bugs.id,
			prUrl: schema.bugs.prUrl,
			prTitle: schema.bugs.prTitle,
			severity: schema.bugs.severity,
			status: schema.bugs.status,
			raccoon: raccoon.name
		})
		.from(schema.bugs)
		.innerJoin(raccoon, eq(raccoon.id, schema.bugs.raccoonId))
		.where(eq(schema.bugs.shipId, id))
		.orderBy(asc(schema.bugs.createdAt));
	const shippedAt = (await shippedTimes([id])).get(id) ?? row.ship.createdAt;
	const queue = await shipQueue('pending');
	const next = queue.find((q) => q.ship.id !== id);

	return {
		ship: row.ship,
		project: row.project,
		maker: row.maker,
		round,
		config,
		shippedAt,
		perDay: hoursPerDay(row.ship.claimedHours, row.round.buildStartsAt, shippedAt),
		reviewer: await names(row.ship.reviewerId),
		verdictBy: await names(row.ship.verdictBy),
		past,
		fixes,
		queue: queue.map((q) => ({ id: q.ship.id, userId: q.ship.userId })),
		nextId: next?.ship.id ?? null
	};
}

const bugSelect = {
	bug: schema.bugs,
	ship: {
		id: schema.ships.id,
		repoUrl: schema.ships.repoUrl,
		tier: schema.ships.tier,
		commitSha: schema.ships.commitSha
	},
	project: { name: schema.projects.name },
	raccoon: { id: raccoon.id, name: raccoon.name, githubLogin: raccoon.githubLogin },
	builder: { id: builder.id, name: builder.name, githubLogin: builder.githubLogin },
	round: { id: schema.rounds.id, number: schema.rounds.number }
};

function bugRows(where: SQL | undefined) {
	return db
		.select(bugSelect)
		.from(schema.bugs)
		.innerJoin(schema.ships, eq(schema.ships.id, schema.bugs.shipId))
		.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
		.innerJoin(raccoon, eq(raccoon.id, schema.bugs.raccoonId))
		.innerJoin(builder, eq(builder.id, schema.ships.userId))
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.bugs.roundId))
		.where(where)
		.orderBy(asc(schema.bugs.createdAt));
}

async function siblings(shipIds: number[]) {
	if (!shipIds.length) return [];
	return db
		.select({
			id: schema.bugs.id,
			shipId: schema.bugs.shipId,
			prUrl: schema.bugs.prUrl,
			prTitle: schema.bugs.prTitle,
			severity: schema.bugs.severity,
			status: schema.bugs.status,
			createdAt: schema.bugs.createdAt,
			raccoon: raccoon.name
		})
		.from(schema.bugs)
		.innerJoin(raccoon, eq(raccoon.id, schema.bugs.raccoonId))
		.where(inArray(schema.bugs.shipId, shipIds))
		.orderBy(asc(schema.bugs.createdAt));
}

export async function disputeQueue() {
	const rounds = await allRounds();
	const rows = await bugRows(
		and(
			eq(schema.bugs.status, 'disputed'),
			inArray(
				schema.bugs.roundId,
				ids(rounds, (r) => r.status === 'open')
			)
		)
	);
	const others = await siblings([...new Set(rows.map((r) => r.ship.id))]);
	return rows.map((r) => ({
		...r,
		others: others.filter((o) => o.shipId === r.ship.id && o.id !== r.bug.id)
	}));
}

const SEV_RANK = { critical: 0, major: 1, minor: 2 } as const;

export async function checkQueue() {
	const rounds = await allRounds();
	const rows = await bugRows(
		and(
			eq(schema.bugs.needsCheck, true),
			isNull(schema.bugs.checkResult),
			inArray(schema.bugs.status, ['accepted', 'merged']),
			inArray(
				schema.bugs.roundId,
				ids(rounds, (r) => r.status === 'open')
			)
		)
	);
	return rows.sort((a, b) => SEV_RANK[a.bug.severity] - SEV_RANK[b.bug.severity]);
}

export async function unmergedQueue() {
	const rounds = await allRounds();
	const ready = ids(rounds, (r) => r.phase === 'ready');
	const rows = await bugRows(
		and(
			eq(schema.bugs.status, 'accepted'),
			eq(schema.bugs.unmergedReviewed, false),
			inArray(schema.bugs.roundId, ready)
		)
	);
	const aIds = [...new Set(rows.map((r) => r.bug.assignmentId))];
	const forks = aIds.length
		? await db
				.select({
					id: schema.assignments.id,
					forkUrl: schema.assignments.forkUrl,
					demoUrl: schema.assignments.forkDemoUrl
				})
				.from(schema.assignments)
				.where(inArray(schema.assignments.id, aIds))
		: [];
	return rows
		.map((r) => {
			const f = forks.find((x) => x.id === r.bug.assignmentId);
			return { ...r, fork: f?.demoUrl ? { url: f.forkUrl, demoUrl: f.demoUrl } : null };
		})
		.sort((a, b) => SEV_RANK[a.bug.severity] - SEV_RANK[b.bug.severity]);
}

export async function settleUnmerged(
	reviewer: SessionUser,
	bugId: number,
	approve: boolean,
	note: string
) {
	const [row] = await bugRows(eq(schema.bugs.id, bugId));
	if (!row) throw new GameError('That fix was not found.');
	if (row.bug.status !== 'accepted' || row.bug.unmergedReviewed)
		throw new GameError('This one is already settled.');
	if (reviewer.id === row.raccoon.id || reviewer.id === row.builder.id)
		throw new GameError("You're part of this one, let someone else decide.");
	const rounds = await allRounds();
	if (rounds.find((r) => r.id === row.bug.roundId)?.phase !== 'ready')
		throw new GameError('Wait until the merge deadline has passed.');
	if (!approve && !note.trim()) throw new GameError('Say why it stays unmerged.');
	await reviewUnmerged(reviewer, bugId, approve, note.trim() || row.bug.resolutionNote || '');
}

export async function hoursQueue() {
	const rounds = await allRounds();
	const rows = await db
		.select({
			a: schema.assignments,
			raccoon: { id: raccoon.id, name: raccoon.name, githubLogin: raccoon.githubLogin },
			ship: {
				id: schema.ships.id,
				repoUrl: schema.ships.repoUrl,
				tier: schema.ships.tier,
				status: schema.ships.status
			},
			project: { name: schema.projects.name },
			owner: { id: builder.id, name: builder.name },
			round: { id: schema.rounds.id, number: schema.rounds.number }
		})
		.from(schema.assignments)
		.innerJoin(raccoon, eq(raccoon.id, schema.assignments.raccoonId))
		.innerJoin(schema.ships, eq(schema.ships.id, schema.assignments.shipId))
		.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
		.innerJoin(builder, eq(builder.id, schema.ships.userId))
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.assignments.roundId))
		.where(
			and(
				eq(schema.assignments.hoursStatus, 'pending'),
				inArray(
					schema.assignments.roundId,
					ids(rounds, (r) => r.status === 'open')
				)
			)
		)
		.orderBy(asc(schema.assignments.id));
	const aIds = rows.map((r) => r.a.id);
	const prs = aIds.length
		? await db
				.select({
					assignmentId: schema.bugs.assignmentId,
					id: schema.bugs.id,
					prUrl: schema.bugs.prUrl,
					prNumber: schema.bugs.prNumber,
					prTitle: schema.bugs.prTitle,
					severity: schema.bugs.severity,
					status: schema.bugs.status
				})
				.from(schema.bugs)
				.where(
					and(inArray(schema.bugs.assignmentId, aIds), inArray(schema.bugs.status, [...LIVE_FIX]))
				)
				.orderBy(asc(schema.bugs.createdAt))
		: [];
	return rows.map((r) => ({ ...r, prs: prs.filter((p) => p.assignmentId === r.a.id) }));
}

export async function refreshHours(staff: SessionUser, assignmentId: number) {
	const [a] = await db
		.select()
		.from(schema.assignments)
		.where(eq(schema.assignments.id, assignmentId));
	if (!a || a.hoursStatus !== 'pending') throw new GameError('Nothing to recheck here.');
	const hours = await refreshClaimed(assignmentId);
	if (hours === null) throw new GameError("We couldn't read Hackatime for this one.");
	await db
		.update(schema.assignments)
		.set({ claimedHours: hours })
		.where(
			and(eq(schema.assignments.id, assignmentId), eq(schema.assignments.hoursStatus, 'pending'))
		);
	await logAudit(
		staff.id,
		'hours.refreshed',
		{ type: 'assignment', id: assignmentId },
		{ from: a.claimedHours, to: hours }
	);
	return hours;
}

export async function verdictQueue() {
	const rounds = (await allRounds()).filter(
		(r) => r.status === 'open' && ['break', 'scoring', 'ready'].includes(r.phase)
	);
	const out = [];
	for (const round of rounds) {
		const clean = (await cleanShips([round.id], false)).map((s) => s.id);
		const rows = clean.length
			? await db
					.select({
						ship: {
							id: schema.ships.id,
							tier: schema.ships.tier,
							verdict: schema.ships.verdict,
							userId: schema.ships.userId,
							repoUrl: schema.ships.repoUrl
						},
						project: { name: schema.projects.name },
						maker: { name: builder.name, githubLogin: builder.githubLogin }
					})
					.from(schema.ships)
					.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
					.innerJoin(builder, eq(builder.id, schema.ships.userId))
					.where(inArray(schema.ships.id, clean))
					.orderBy(asc(schema.ships.id))
			: [];
		const assigned = clean.length
			? await db
					.select({ shipId: schema.assignments.shipId, n: sql<number>`count(*)::int` })
					.from(schema.assignments)
					.where(inArray(schema.assignments.shipId, clean))
					.groupBy(schema.assignments.shipId)
			: [];
		const ships = [];
		for (const r of rows) {
			ships.push({
				...r,
				hint: await suggestVerdict(r.ship.id),
				raccoons: assigned.find((a) => a.shipId === r.ship.id)?.n ?? 0
			});
		}
		out.push({
			round: {
				id: round.id,
				number: round.number,
				phase: round.phase,
				stakes: round.config.tierStake,
				multiplier: round.config.unbreakableMultiplier
			},
			ships
		});
	}
	return out;
}

export async function updateRoundDates(
	admin: SessionUser,
	roundId: number,
	dates: { buildStartsAt: Date; breakStartsAt: Date; breakEndsAt: Date }
) {
	const values = [dates.buildStartsAt, dates.breakStartsAt, dates.breakEndsAt];
	if (values.some((d) => !(d instanceof Date) || Number.isNaN(d.getTime())))
		throw new GameError('Fill in all three dates.');
	if (!(values[0] < values[1] && values[1] < values[2]))
		throw new GameError('Dates must go in order: build starts, break starts, break ends.');
	const [r] = await db.select().from(schema.rounds).where(eq(schema.rounds.id, roundId));
	if (!r) throw new GameError('Round not found.');
	if (r.status !== 'open') throw new GameError('Closed rounds keep their dates.');
	await db.update(schema.rounds).set(dates).where(eq(schema.rounds.id, roundId));
	await logAudit(
		admin.id,
		'round.dates',
		{ type: 'round', id: roundId },
		{
			from: {
				buildStartsAt: r.buildStartsAt,
				breakStartsAt: r.breakStartsAt,
				breakEndsAt: r.breakEndsAt
			},
			to: dates
		}
	);
}

const LIST_KEYS = ['shipMinHours'];
const TUPLE_KEYS = Object.entries(DEFAULT_SEASON_CONFIG)
	.filter(([k, v]) => Array.isArray(v) && !LIST_KEYS.includes(k))
	.map(([k]) => k);
const WHOLE_KEYS = ['targetsPerRaccoon', 'responseHours', 'scoringHours', 'maxPairPrsPerRound'];

export function checkSeasonConfig(text: string, current: SeasonConfig): SeasonConfig {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new GameError("That isn't valid JSON. Check for a missing comma or quote.");
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
		throw new GameError('The settings must be one JSON object.');
	const known = Object.keys(DEFAULT_SEASON_CONFIG);
	const out: Record<string, unknown> = { ...current };
	const okNum = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
	for (const [key, value] of Object.entries(parsed)) {
		if (!known.includes(key))
			throw new GameError(`"${key}" is not a setting. Known ones: ${known.join(', ')}.`);
		if (LIST_KEYS.includes(key)) {
			if (!Array.isArray(value) || value.length < 1 || value.length > 10 || !value.every(okNum))
				throw new GameError(
					`"${key}" needs 1 to 10 numbers, one for each ship in a round, like [5, 8, 15].`
				);
		} else if (TUPLE_KEYS.includes(key)) {
			if (!Array.isArray(value) || value.length !== 3 || !value.every(okNum))
				throw new GameError(
					`"${key}" needs 3 numbers (minor, major, critical or tier 1, 2, 3), like [1, 2, 3].`
				);
		} else if (!okNum(value)) {
			throw new GameError(`"${key}" must be a number, 0 or more.`);
		} else if (WHOLE_KEYS.includes(key) && !Number.isInteger(value)) {
			throw new GameError(`"${key}" must be a whole number.`);
		}
		out[key] = value;
	}
	const cfg = out as SeasonConfig;
	if (cfg.checkRates.some((n) => n > 1))
		throw new GameError('"checkRates" are shares between 0 and 1.');
	if (cfg.targetsPerRaccoon < 1) throw new GameError('"targetsPerRaccoon" must be at least 1.');
	if (cfg.baseAcornsPerHour <= 0) throw new GameError('"baseAcornsPerHour" must be more than 0.');
	return cfg;
}

export async function saveSeasonConfig(admin: SessionUser, seasonId: number, text: string) {
	const [season] = await db.select().from(schema.seasons).where(eq(schema.seasons.id, seasonId));
	if (!season) throw new GameError('Season not found.');
	const before = seasonConfig(season);
	const config = checkSeasonConfig(text, before);
	await db.update(schema.seasons).set({ config }).where(eq(schema.seasons.id, seasonId));
	const changed = Object.fromEntries(
		Object.entries(config).filter(
			([k, v]) => JSON.stringify(v) !== JSON.stringify(before[k as keyof SeasonConfig])
		)
	);
	await logAudit(admin.id, 'season.config', { type: 'season', id: seasonId }, { changed });
}

export async function setPrizePool(admin: SessionUser, seasonId: number, amount: number) {
	if (!Number.isFinite(amount) || amount < 0)
		throw new GameError('The prize pool must be 0 or more acorns.');
	const [season] = await db.select().from(schema.seasons).where(eq(schema.seasons.id, seasonId));
	if (!season) throw new GameError('Season not found.');
	const value = Math.round(amount * 100) / 100;
	await db.update(schema.seasons).set({ prizePool: value }).where(eq(schema.seasons.id, seasonId));
	await logAudit(
		admin.id,
		'season.prize_pool',
		{ type: 'season', id: seasonId },
		{ from: season.prizePool, to: value }
	);
}

export async function namesFor(userIds: number[]) {
	if (!userIds.length) return new Map<number, { name: string; githubLogin: string | null }>();
	const rows = await db
		.select({ id: schema.users.id, name: schema.users.name, githubLogin: schema.users.githubLogin })
		.from(schema.users)
		.where(inArray(schema.users.id, userIds));
	return new Map(rows.map((r) => [r.id, { name: r.name, githubLogin: r.githubLogin }]));
}

export const CATEGORIES = ['grant', 'physical', 'digital'] as const;

export type ItemInput = {
	name: string;
	blurb: string;
	category: string;
	price: number;
	stock: number | null;
	maxPerUser: number | null;
	imageUrl: string;
	active: boolean;
	sort: number;
};

export async function shopItems() {
	const items = await db
		.select()
		.from(schema.items)
		.orderBy(asc(schema.items.sort), asc(schema.items.id));
	const sold = await db
		.select({
			itemId: schema.orders.itemId,
			n: sql<number>`coalesce(sum(${schema.orders.quantity}), 0)::int`
		})
		.from(schema.orders)
		.where(sql`${schema.orders.status} not in ('rejected', 'cancelled')`)
		.groupBy(schema.orders.itemId);
	return items.map((i) => ({ ...i, sold: sold.find((s) => s.itemId === i.id)?.n ?? 0 }));
}

export async function saveItem(admin: SessionUser, id: number | null, input: ItemInput) {
	const name = input.name.trim();
	if (name.length < 2 || name.length > 80)
		throw new GameError('Give the item a name (2-80 characters).');
	if (!(CATEGORIES as readonly string[]).includes(input.category))
		throw new GameError('Pick a category.');
	if (!Number.isInteger(input.price) || input.price < 1)
		throw new GameError('The price must be a whole number of acorns, 1 or more.');
	if (input.stock !== null && (!Number.isInteger(input.stock) || input.stock < 0))
		throw new GameError('Stock must be a whole number, or empty for no limit.');
	if (input.maxPerUser !== null && (!Number.isInteger(input.maxPerUser) || input.maxPerUser < 1))
		throw new GameError('"Max per person" must be 1 or more, or empty for no limit.');
	const imageUrl = input.imageUrl.trim();
	if (imageUrl && !/^(https:\/\/|\/)/.test(imageUrl))
		throw new GameError('The image link should start with https:// or /.');
	if (!Number.isInteger(input.sort)) throw new GameError('Sort must be a whole number.');
	const values = {
		name,
		blurb: input.blurb.trim().slice(0, 500),
		category: input.category as (typeof CATEGORIES)[number],
		price: input.price,
		stock: input.stock,
		maxPerUser: input.maxPerUser,
		imageUrl: imageUrl || null,
		active: input.active,
		sort: input.sort
	};
	if (id) {
		const [saved] = await db
			.update(schema.items)
			.set(values)
			.where(eq(schema.items.id, id))
			.returning();
		if (!saved) throw new GameError('Item not found.');
		await logAudit(admin.id, 'item.updated', { type: 'item', id }, values);
		return saved;
	}
	const [saved] = await db.insert(schema.items).values(values).returning();
	await logAudit(admin.id, 'item.created', { type: 'item', id: saved.id }, values);
	return saved;
}

export const ORDER_STATUSES = [
	'pending',
	'approved',
	'fulfilled',
	'rejected',
	'cancelled'
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

export async function orderList(status: string) {
	const known = (ORDER_STATUSES as readonly string[]).includes(status);
	const rows = await db
		.select({
			order: schema.orders,
			item: {
				id: schema.items.id,
				name: schema.items.name,
				category: schema.items.category,
				price: schema.items.price
			},
			user: {
				id: builder.id,
				name: builder.name,
				email: builder.email,
				slackId: builder.slackId,
				banned: builder.banned
			},
			handler: { name: actor.name }
		})
		.from(schema.orders)
		.innerJoin(schema.items, eq(schema.items.id, schema.orders.itemId))
		.innerJoin(builder, eq(builder.id, schema.orders.userId))
		.leftJoin(actor, eq(actor.id, schema.orders.handledBy))
		.where(known ? eq(schema.orders.status, status as OrderStatus) : undefined)
		.orderBy(status === 'pending' ? asc(schema.orders.createdAt) : desc(schema.orders.updatedAt))
		.limit(200);
	const tally = await db
		.select({ status: schema.orders.status, n: sql<number>`count(*)::int` })
		.from(schema.orders)
		.groupBy(schema.orders.status);
	const byStatus = Object.fromEntries(
		ORDER_STATUSES.map((s) => [s, tally.find((t) => t.status === s)?.n ?? 0])
	) as Record<OrderStatus, number>;
	return { rows, byStatus };
}

export const ROLES = ['user', 'reviewer', 'admin'] as const;

async function balances(userIds: number[]) {
	if (!userIds.length) return new Map<number, number>();
	const rows = await db
		.select({ userId: schema.ledger.userId, total: sql<string>`sum(${schema.ledger.amount})` })
		.from(schema.ledger)
		.where(inArray(schema.ledger.userId, userIds))
		.groupBy(schema.ledger.userId);
	return new Map(rows.map((r) => [r.userId, Number(r.total)]));
}

const userFields = {
	id: schema.users.id,
	name: schema.users.name,
	email: schema.users.email,
	githubLogin: schema.users.githubLogin,
	slackId: schema.users.slackId,
	role: schema.users.role,
	verification: schema.users.verification,
	banned: schema.users.banned,
	bannedReason: schema.users.bannedReason,
	hackatime: sql<boolean>`${schema.users.hackatimeUserId} is not null`,
	createdAt: schema.users.createdAt,
	lastSeenAt: schema.users.lastSeenAt
};

export async function findUsers(q: string) {
	const term = q.trim().replace(/^@/, '');
	const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
	const where = term
		? or(
				ilike(schema.users.name, pattern),
				ilike(schema.users.email, pattern),
				ilike(schema.users.githubLogin, pattern),
				/^\d+$/.test(term) ? eq(schema.users.id, Number(term)) : undefined
			)
		: undefined;
	const rows = await db
		.select(userFields)
		.from(schema.users)
		.where(where)
		.orderBy(desc(schema.users.id))
		.limit(100);
	const money = await balances(rows.map((r) => r.id));
	return rows.map((r) => ({ ...r, balance: money.get(r.id) ?? 0 }));
}

export async function userDetail(id: number) {
	const [user] = await db
		.select({ ...userFields, address: schema.users.address, hcaId: schema.users.hcaId })
		.from(schema.users)
		.where(eq(schema.users.id, id));
	if (!user) return null;
	const ledger = await db
		.select({
			entry: schema.ledger,
			actor: { name: actor.name },
			round: { number: schema.rounds.number }
		})
		.from(schema.ledger)
		.leftJoin(actor, eq(actor.id, schema.ledger.actorId))
		.leftJoin(schema.rounds, eq(schema.rounds.id, schema.ledger.roundId))
		.where(eq(schema.ledger.userId, id))
		.orderBy(desc(schema.ledger.id))
		.limit(50);
	const ships = await db
		.select({
			id: schema.ships.id,
			status: schema.ships.status,
			tier: schema.ships.tier,
			approvedHours: schema.ships.approvedHours,
			claimedHours: schema.ships.claimedHours,
			roundNumber: schema.rounds.number,
			projectName: schema.projects.name
		})
		.from(schema.ships)
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.ships.roundId))
		.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
		.where(eq(schema.ships.userId, id))
		.orderBy(desc(schema.ships.createdAt));
	const orders = await db
		.select({ order: schema.orders, item: { name: schema.items.name } })
		.from(schema.orders)
		.innerJoin(schema.items, eq(schema.items.id, schema.orders.itemId))
		.where(eq(schema.orders.userId, id))
		.orderBy(desc(schema.orders.id))
		.limit(20);
	const [fixes] = await db
		.select({
			sent: sql<number>`count(*)::int`,
			merged: sql<number>`count(*) filter (where ${schema.bugs.status} = 'merged')::int`
		})
		.from(schema.bugs)
		.where(eq(schema.bugs.raccoonId, id));
	return { user, balance: await balance(id), ledger, ships, orders, fixes };
}

export async function setRole(admin: SessionUser, userId: number, role: string) {
	if (!(ROLES as readonly string[]).includes(role)) throw new GameError('Pick a role.');
	if (userId === admin.id && role !== 'admin')
		throw new GameError("You can't take away your own admin role.");
	const [u] = await db
		.select({ role: schema.users.role })
		.from(schema.users)
		.where(eq(schema.users.id, userId));
	if (!u) throw new GameError('User not found.');
	if (u.role === role) throw new GameError('Nothing changed, that is already their role.');
	await db
		.update(schema.users)
		.set({ role: role as (typeof ROLES)[number] })
		.where(eq(schema.users.id, userId));
	await logAudit(admin.id, 'user.role', { type: 'user', id: userId }, { from: u.role, to: role });
}

export async function adjustAcorns(
	admin: SessionUser,
	userId: number,
	amount: number,
	note: string
) {
	if (!Number.isFinite(amount) || amount === 0)
		throw new GameError('Enter an amount like 25 or -10.');
	if (Math.abs(amount) > 100000)
		throw new GameError('That is a lot of acorns. Keep it under 100,000.');
	if (note.trim().length < 3)
		throw new GameError('Write a note. The person sees it in their history.');
	const value = Math.round(amount * 100) / 100;
	await db.transaction(async (tx) => {
		const [u] = await tx
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.id, userId));
		if (!u) throw new GameError('User not found.');
		await lockUser(tx, userId);
		const [entry] = await tx
			.insert(schema.ledger)
			.values({
				userId,
				amount: value,
				reason: 'manual',
				note: note.trim().slice(0, 500),
				actorId: admin.id
			})
			.returning();
		await notify(
			userId,
			{
				kind: 'acorns.manual',
				title: value > 0 ? `${value} acorns added` : `${Math.abs(value)} acorns taken off`,
				body: note.trim(),
				link: '/shop'
			},
			tx
		);
		await logAudit(
			admin.id,
			'user.acorns',
			{ type: 'user', id: userId },
			{ amount: value, note: note.trim(), ledgerId: entry.id },
			tx
		);
	});
}

export async function banUser(admin: SessionUser, userId: number, reason: string) {
	if (userId === admin.id) throw new GameError("You can't ban yourself.");
	if (reason.trim().length < 3) throw new GameError('Write why. It is kept in the audit log.');
	const [u] = await db
		.select({ banned: schema.users.banned })
		.from(schema.users)
		.where(eq(schema.users.id, userId));
	if (!u) throw new GameError('User not found.');
	if (u.banned) throw new GameError('They are already banned.');
	await voidUser(admin, userId, reason.trim());
}

export async function unbanUser(admin: SessionUser, userId: number) {
	const [u] = await db
		.select({ banned: schema.users.banned })
		.from(schema.users)
		.where(eq(schema.users.id, userId));
	if (!u?.banned) throw new GameError('They are not banned.');
	await db
		.update(schema.users)
		.set({ banned: false, bannedReason: null })
		.where(eq(schema.users.id, userId));
	await logAudit(admin.id, 'user.unbanned', { type: 'user', id: userId });
}

export async function auditLog(filter: {
	action: string;
	targetType: string;
	targetId: number | null;
}) {
	const action = filter.action.trim();
	const where = and(
		action ? like(schema.audit.action, `${action.replace(/[\\%_]/g, '\\$&')}%`) : undefined,
		filter.targetType ? eq(schema.audit.targetType, filter.targetType) : undefined,
		filter.targetId !== null ? eq(schema.audit.targetId, filter.targetId) : undefined
	);
	const rows = await db
		.select({ entry: schema.audit, actor: { id: actor.id, name: actor.name } })
		.from(schema.audit)
		.leftJoin(actor, eq(actor.id, schema.audit.actorId))
		.where(where)
		.orderBy(desc(schema.audit.id))
		.limit(200);
	const types = await db
		.selectDistinct({ t: schema.audit.targetType })
		.from(schema.audit)
		.orderBy(asc(schema.audit.targetType));
	const prefixes = await db
		.selectDistinct({ p: sql<string>`split_part(${schema.audit.action}, '.', 1)` })
		.from(schema.audit);
	return {
		rows,
		types: types.map((t) => t.t).filter((t): t is string => Boolean(t)),
		prefixes: prefixes.map((p) => p.p).sort()
	};
}

export async function unifiedRows() {
	const rows = await db
		.select({
			o: schema.unifiedOutbox,
			ship: {
				id: schema.ships.id,
				approvedHours: schema.ships.approvedHours,
				repoUrl: schema.ships.repoUrl
			},
			fix: { id: schema.assignments.id, approvedHours: schema.assignments.approvedHours },
			project: { name: schema.projects.name },
			user: { id: builder.id, name: builder.name, email: builder.email },
			round: { number: schema.rounds.number }
		})
		.from(schema.unifiedOutbox)
		.leftJoin(schema.assignments, eq(schema.assignments.id, schema.unifiedOutbox.assignmentId))
		.innerJoin(
			schema.ships,
			sql`${schema.ships.id} = coalesce(${schema.unifiedOutbox.shipId}, ${schema.assignments.shipId})`
		)
		.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
		.innerJoin(
			builder,
			sql`${builder.id} = coalesce(${schema.assignments.raccoonId}, ${schema.ships.userId})`
		)
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.ships.roundId))
		.orderBy(desc(schema.unifiedOutbox.id))
		.limit(300);
	return rows;
}

export async function retryUnified(admin: SessionUser, id: number | null) {
	const where = id
		? and(eq(schema.unifiedOutbox.id, id), ne(schema.unifiedOutbox.state, 'sent'))
		: eq(schema.unifiedOutbox.state, 'error');
	const done = await db
		.update(schema.unifiedOutbox)
		.set({ state: 'queued', error: null })
		.where(where)
		.returning();
	if (!done.length)
		throw new GameError(id ? 'That one was already sent.' : 'Nothing failed, nothing to retry.');
	await logAudit(admin.id, 'unified.retry', id ? { type: 'unified', id } : undefined, {
		count: done.length
	});
	return done.length;
}
