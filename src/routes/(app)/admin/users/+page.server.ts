import { requireAdmin } from '#lib/server/guards.js';
import { findUsers } from '#lib/server/game/admin.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals);
	const q = url.searchParams.get('q') ?? '';
	return { q, users: await findUsers(q) };
};
