import { requireStaff } from '#lib/server/guards.js';
import { deskOutlook } from '#lib/server/game/admin.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	return { outlook: await deskOutlook() };
};
