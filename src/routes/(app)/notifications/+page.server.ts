import { and, desc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { now } from '#lib/server/clock.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const items = await db
		.select()
		.from(schema.notifications)
		.where(eq(schema.notifications.userId, locals.user!.id))
		.orderBy(desc(schema.notifications.createdAt))
		.limit(100);
	return { items };
};

export const actions: Actions = {
	read: async ({ locals }) => {
		await db
			.update(schema.notifications)
			.set({ readAt: now() })
			.where(
				and(eq(schema.notifications.userId, locals.user!.id), isNull(schema.notifications.readAt))
			);
		return { ok: true, message: null };
	}
};
