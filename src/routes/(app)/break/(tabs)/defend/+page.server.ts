import { gameState } from '#lib/server/game/season.js';
import { shipFor } from '#lib/server/game/ships.js';
import { incomingFixes } from '#lib/server/views.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const { round, raid } = await gameState();
	const roundIds = [...new Set([raid?.id, round?.id].filter((id) => id !== undefined))];
	const ships = (await Promise.all(roundIds.map((id) => shipFor(user.id, id)))).filter(
		(s) => s !== null
	);
	const fixes = (await Promise.all(ships.map((s) => incomingFixes(s.id)))).flat();
	return { fixes };
};
