import { requireAdmin } from '#lib/server/guards.js';
import { deskCounts } from '#lib/server/game/admin.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	return { desk: await deskCounts(true) };
};
