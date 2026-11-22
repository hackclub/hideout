import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { gameState } from '#lib/server/game/season.js';
import { previewRound } from '#lib/server/game/rounds.js';
import type { PageServerLoad } from './$types';

type Row = { userId: number; raccoon: number; builder: number; fixes: number };

export const load: PageServerLoad = async () => {
	const { season, rounds, round } = await gameState();
	if (!season) return { season: null, builders: [], raccoons: [], live: false };

	const totals = new Map<number, Row>();
	const bump = (userId: number, raccoon: number, builder: number) => {
		const r = totals.get(userId) ?? { userId, raccoon: 0, builder: 0, fixes: 0 };
		r.raccoon += raccoon;
		r.builder += builder;
		totals.set(userId, r);
	};

	const closedIds = rounds.filter((r) => r.status === 'closed').map((r) => r.id);
	if (closedIds.length) {
		const scores = await db
			.select()
			.from(schema.roundScores)
			.where(inArray(schema.roundScores.roundId, closedIds));
		for (const s of scores) bump(s.userId, s.raccoonPoints, s.builderPoints);
	}
	const live =
		round && round.status === 'open' && ['break', 'scoring', 'ready'].includes(round.phase);
	if (live) {
		const p = await previewRound(round.id);
		for (const [userId, pts] of p.points) bump(userId, pts.raccoon, pts.builder);
	}
	const roundIds = rounds.map((r) => r.id);
	const merged = roundIds.length
		? await db
				.select({ raccoonId: schema.bugs.raccoonId, roundId: schema.bugs.roundId })
				.from(schema.bugs)
				.where(eq(schema.bugs.status, 'merged'))
		: [];
	for (const m of merged)
		if (roundIds.includes(m.roundId) && totals.has(m.raccoonId)) totals.get(m.raccoonId)!.fixes++;

	const ids = [...totals.keys()];
	const people = ids.length
		? await db
				.select({
					id: schema.users.id,
					name: schema.users.name,
					githubLogin: schema.users.githubLogin,
					banned: schema.users.banned
				})
				.from(schema.users)
				.where(inArray(schema.users.id, ids))
		: [];
	const who = new Map(people.filter((p) => !p.banned).map((p) => [p.id, p]));
	const rows = [...totals.values()]
		.filter((r) => who.has(r.userId))
		.map((r) => ({ ...r, name: who.get(r.userId)!.name }));

	return {
		season: { name: season.name },
		live,
		builders: rows
			.filter((r) => r.builder > 0)
			.sort((a, b) => b.builder - a.builder)
			.slice(0, 25),
		raccoons: rows
			.filter((r) => r.raccoon > 0)
			.sort((a, b) => b.raccoon - a.raccoon)
			.slice(0, 25)
	};
};
