import { requireAdmin } from '#lib/server/guards.js';
import { auditLog } from '#lib/server/game/admin.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals);
	const action = url.searchParams.get('action') ?? '';
	const type = url.searchParams.get('type') ?? '';
	const idRaw = url.searchParams.get('id') ?? '';
	const id = /^\d+$/.test(idRaw) ? Number(idRaw) : null;
	const log = await auditLog({ action, targetType: type, targetId: id });
	return { filter: { action, type, id: id === null ? '' : String(id) }, ...log };
};
