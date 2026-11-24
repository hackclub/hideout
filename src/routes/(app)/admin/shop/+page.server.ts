import { requireAdmin } from '#lib/server/guards.js';
import { saveItem, shopItems } from '#lib/server/game/admin.js';
import { attempt, num, str } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals);
	const items = await shopItems();
	const editId = Number(url.searchParams.get('edit'));
	return { items, editing: items.find((i) => i.id === editId) ?? null };
};

function optional(f: FormData, key: string) {
	const v = str(f, key).trim();
	return v === '' ? null : Number(v);
}

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		const id = num(f, 'id') || null;
		return attempt(
			() =>
				saveItem(me, id, {
					name: str(f, 'name'),
					blurb: str(f, 'blurb'),
					category: str(f, 'category'),
					price: Number(str(f, 'price').trim() || NaN),
					stock: optional(f, 'stock'),
					maxPerUser: optional(f, 'maxPerUser'),
					imageUrl: str(f, 'imageUrl'),
					logos: str(f, 'logos').split(','),
					active: f.get('active') === 'on',
					sort: Number(str(f, 'sort').trim() || 0)
				}),
			id ? 'Item saved.' : 'Item added to the shop.'
		);
	}
};
