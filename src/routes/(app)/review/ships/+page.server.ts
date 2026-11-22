import { requireStaff } from '#lib/server/guards.js';
import { SHIP_STATUSES, shipQueue } from '#lib/server/game/admin.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireStaff(locals);
	const asked = url.searchParams.get('status') ?? 'pending';
	const status =
		asked === 'all' || (SHIP_STATUSES as readonly string[]).includes(asked) ? asked : 'pending';
	return { status, ships: await shipQueue(status) };
};
