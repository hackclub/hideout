import { requireAdmin } from '#lib/server/guards.js';
import { ORDER_STATUSES, orderList } from '#lib/server/game/admin.js';
import { setOrderStatus } from '#lib/server/game/shop.js';
import { GameError } from '#lib/server/game/ships.js';
import { attempt, num, str } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals);
	const asked = url.searchParams.get('status') ?? 'pending';
	const status =
		asked === 'all' || (ORDER_STATUSES as readonly string[]).includes(asked) ? asked : 'pending';
	const { rows, byStatus } = await orderList(status);
	return { status, orders: rows, byStatus };
};

const done: Record<string, string> = {
	approved: 'Order approved.',
	fulfilled: 'Marked as sent.',
	rejected: 'Order rejected. The acorns went back to them.'
};

export const actions: Actions = {
	set: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		const status = str(f, 'status') as 'approved' | 'fulfilled' | 'rejected';
		const note = str(f, 'note').trim();
		const tracking = str(f, 'tracking').trim();
		return attempt(async () => {
			if (!(status in done)) throw new GameError('Pick what to do with the order.');
			if (status === 'rejected' && !note)
				throw new GameError('Write why it was rejected. They see the note.');
			await setOrderStatus(me, num(f, 'orderId'), status, {
				staffNote: note || undefined,
				tracking: tracking || undefined
			});
		}, done[status] ?? 'Saved.');
	}
};
