import { asc, desc, eq, sql } from 'drizzle-orm';
import { db, schema, type Tx } from '../db/index.js';
import { now } from '../clock.js';
import { DEFAULT_SEASON_CONFIG, type SeasonConfig } from '../db/schema.js';
import { phaseOf, pickCurrent, scoringEndsAt, type Phase } from '../../game/phase.js';

export type Round = typeof schema.rounds.$inferSelect;
export type Season = typeof schema.seasons.$inferSelect;

export type RoundView = Round & { phase: Phase; scoringEndsAt: Date };

export async function currentSeason(): Promise<Season | null> {
	const [season] = await db
		.select()
		.from(schema.seasons)
		.orderBy(desc(schema.seasons.startsAt))
		.limit(1);
	return season ?? null;
}

export function seasonConfig(season: Season | null): SeasonConfig {
	const saved: Partial<Record<string, unknown>> = season?.config ?? {};
	return Object.fromEntries(
		Object.entries(DEFAULT_SEASON_CONFIG).map(([k, v]) => [k, saved[k] ?? v])
	) as SeasonConfig;
}

export function viewRound(round: Round, config: SeasonConfig, at = now()): RoundView {
	return {
		...round,
		phase: phaseOf(round, at, config.scoringHours),
		scoringEndsAt: scoringEndsAt(round, config.scoringHours)
	};
}

export async function seasonRounds(seasonId: number) {
	return db
		.select()
		.from(schema.rounds)
		.where(eq(schema.rounds.seasonId, seasonId))
		.orderBy(asc(schema.rounds.number));
}

export async function gameState() {
	const season = await currentSeason();
	const config = seasonConfig(season);
	if (!season)
		return {
			season: null,
			config,
			rounds: [] as RoundView[],
			round: null as RoundView | null,
			raid: null as RoundView | null
		};
	const rounds = (await seasonRounds(season.id)).map((r) => viewRound(r, config));
	const current = pickCurrent(rounds, now());
	const round = current ? rounds.find((r) => r.id === current.id)! : null;
	const raid = rounds.find((r) => r.phase === 'break' || r.phase === 'scoring') ?? round;
	return { season, config, rounds, round, raid };
}

export async function roundById(id: number) {
	const [round] = await db.select().from(schema.rounds).where(eq(schema.rounds.id, id));
	if (!round) return null;
	const [season] = await db
		.select()
		.from(schema.seasons)
		.where(eq(schema.seasons.id, round.seasonId));
	const config = seasonConfig(season ?? null);
	return { round: viewRound(round, config), season, config };
}

export async function balance(userId: number, tx?: Tx) {
	const [row] = await (tx ?? db)
		.select({ total: sql<string>`coalesce(sum(${schema.ledger.amount}), 0)` })
		.from(schema.ledger)
		.where(eq(schema.ledger.userId, userId));
	return Number(row.total);
}

export async function lockUser(tx: Tx, userId: number) {
	await tx.execute(sql`select pg_advisory_xact_lock(${userId})`);
}
