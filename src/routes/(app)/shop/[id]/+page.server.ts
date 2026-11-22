import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { placeOrder } from '#lib/server/game/shop.js';
import { attempt, num, str } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [item] = await db
		.select()
		.from(schema.items)
		.where(eq(schema.items.id, Number(params.id)));
	if (!item || !item.active) error(404, 'Not found');
	return { item };
};

export const actions: Actions = {
	order: async ({ request, locals, params }) => {
		const f = await request.formData();
		const result = await attempt(() =>
			placeOrder(locals.user!, Number(params.id), num(f, 'quantity') || 1, str(f, 'note'))
		);
		if ('ok' in result && result.ok) redirect(303, '/shop/orders?placed=1');
		return result;
	}
};
