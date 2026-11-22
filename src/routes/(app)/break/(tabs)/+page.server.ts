import { and, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { gameState } from '#lib/server/game/season.js';
import { joinRaid, leaveRaid } from '#lib/server/game/rounds.js';
import { shipFor } from '#lib/server/game/ships.js';
import { targetCards } from '#lib/server/views.js';
import { attempt } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const { raid: round, config } = await gameState();
	if (!round) return { targets: [], raider: false, shipped: false, config, raidRound: null };
	const raider =
		(
			await db
				.select()
				.from(schema.raiders)
				.where(and(eq(schema.raiders.roundId, round.id), eq(schema.raiders.userId, user.id)))
		).length > 0;
	return {
		targets: await targetCards(user.id, round.id),
		raider,
		raidRound: { phase: round.phase, scoringEndsAt: round.scoringEndsAt },
		shipped: Boolean(await shipFor(user.id, round.id)),
		config: { responseHours: config.responseHours, maxPairPrsPerRound: config.maxPairPrsPerRound }
	};
};

export const actions: Actions = {
	join: async ({ locals }) =>
		attempt(() => joinRaid(locals.user!), "You're in! You'll get targets when break week starts."),
	leave: async ({ locals }) => attempt(() => leaveRaid(locals.user!), 'You left the raid.')
};
