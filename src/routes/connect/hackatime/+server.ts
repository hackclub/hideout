import { redirect } from '@sveltejs/kit';
import { connectUrl } from '#lib/server/services/hackatime.js';
import { randomToken } from '#lib/server/crypto.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, cookies }) => {
	if (!locals.user) redirect(303, '/login');
	const state = randomToken(16);
	cookies.set('hideout_ht', state, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600 });
	redirect(303, connectUrl(state), { external: true });
};
