import { requireStaff } from '#lib/server/guards.js';
import { deskCounts } from '#lib/server/game/admin.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const me = requireStaff(locals);
	return { desk: await deskCounts(me.role === 'admin') };
};
