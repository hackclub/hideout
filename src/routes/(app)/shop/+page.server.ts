import { asc, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const items = await db
		.select()
		.from(schema.items)
		.where(eq(schema.items.active, true))
		.orderBy(asc(schema.items.sort));
	return { items };
};
