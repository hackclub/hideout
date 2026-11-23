import { gameState } from '#lib/server/game/season.js';
import { shipFor } from '#lib/server/game/ships.js';
import { targetCards } from '#lib/server/views.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const { raid: round, config } = await gameState();
	if (!round) return { targets: [], shipped: false, config, raidRound: null };
	return {
		targets: await targetCards(user.id, round.id),
		raidRound: { phase: round.phase, scoringEndsAt: round.scoringEndsAt },
		shipped: Boolean(await shipFor(user.id, round.id)),
		config: { responseHours: config.responseHours, maxPairPrsPerRound: config.maxPairPrsPerRound }
	};
};
