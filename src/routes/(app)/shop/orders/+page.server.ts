import { desc, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { setOrderStatus } from '#lib/server/game/shop.js';
import { attempt, num } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const orders = await db
		.select({ order: schema.orders, item: { name: schema.items.name } })
		.from(schema.orders)
		.innerJoin(schema.items, eq(schema.items.id, schema.orders.itemId))
		.where(eq(schema.orders.userId, locals.user!.id))
		.orderBy(desc(schema.orders.createdAt));
	return { orders };
};

export const actions: Actions = {
	cancel: async ({ request, locals }) => {
		const f = await request.formData();
		return attempt(
			() => setOrderStatus(locals.user!, num(f, 'orderId'), 'cancelled'),
			'Order cancelled, acorns are back.'
		);
	}
};
