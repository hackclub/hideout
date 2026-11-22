import { requireStaff } from '#lib/server/guards.js';
import { settleUnmerged, unmergedQueue } from '#lib/server/game/admin.js';
import { attempt, num, str } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	return { fixes: await unmergedQueue() };
};

export const actions: Actions = {
	settle: async ({ request, locals }) => {
		const me = requireStaff(locals);
		const f = await request.formData();
		const approve = str(f, 'approve') === 'yes';
		return attempt(
			() => settleUnmerged(me, num(f, 'bugId'), approve, str(f, 'note')),
			approve ? 'Counted as merged.' : 'Left unmerged.'
		);
	}
};
