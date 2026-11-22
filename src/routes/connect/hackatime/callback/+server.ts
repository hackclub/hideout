import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, isUniqueViolation, schema } from '#lib/server/db/index.js';
import { exchange } from '#lib/server/services/hackatime.js';
import { encrypt } from '#lib/server/crypto.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
	if (!locals.user) redirect(303, '/login');
	const state = cookies.get('hideout_ht');
	cookies.delete('hideout_ht', { path: '/' });
	if (!state || state !== url.searchParams.get('state'))
		error(400, 'Connection expired, try again.');
	const code = url.searchParams.get('code');
	if (!code) error(400, 'Missing code from Hackatime.');
	const { userId, token } = await exchange(code);
	const taken = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.where(eq(schema.users.hackatimeUserId, userId));
	if (taken.some((t) => t.id !== locals.user!.id))
		error(409, 'That Hackatime account is linked to someone else.');
	try {
		await db
			.update(schema.users)
			.set({ hackatimeUserId: userId, hackatimeToken: encrypt(token) })
			.where(eq(schema.users.id, locals.user.id));
	} catch (e) {
		if (isUniqueViolation(e)) error(409, 'That Hackatime account is linked to someone else.');
		throw e;
	}
	redirect(303, '/settings?connected=hackatime');
};
