import { requireAdmin } from '#lib/server/guards.js';
import { queueUnified, retryUnified, unifiedRows } from '#lib/server/game/admin.js';
import { flushUnified } from '#lib/server/game/unified.js';
import { logAudit } from '#lib/server/audit.js';
import { attempt, num } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	return { rows: await unifiedRows() };
};

export const actions: Actions = {
	retry: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		return attempt(
			() => retryUnified(me, num(f, 'id') || null),
			'Queued again. It goes out on the next timer run.'
		);
	},
	queue: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		return attempt(
			() => queueUnified(me, num(f, 'id') || null),
			'Queued. It goes out on the next timer run.'
		);
	},
	send: async ({ locals }) => {
		const me = requireAdmin(locals);
		return attempt(async () => {
			await flushUnified();
			await logAudit(me.id, 'unified.flush');
		}, 'Sent what was queued.');
	}
};
