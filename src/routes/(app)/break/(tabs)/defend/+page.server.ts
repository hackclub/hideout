import { gameState } from '#lib/server/game/season.js';
import { shipsIn } from '#lib/server/game/ships.js';
import { incomingFixes } from '#lib/server/views.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const { round, raid } = await gameState();
	const roundIds = [...new Set([raid?.id, round?.id].filter((id) => id !== undefined))];
	const ships = await shipsIn(user.id, roundIds);
	return { fixes: await incomingFixes(ships.map((s) => s.id)) };
};
