import { redirect } from '@sveltejs/kit';
import { config } from '#lib/server/config.js';
import { authorizeUrl } from '#lib/server/services/hca.js';
import { randomToken } from '#lib/server/crypto.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies, url }) => {
	const state = randomToken(16);
	const next = url.searchParams.get('next') ?? '/home';
	cookies.set('hideout_oauth', JSON.stringify({ state, next }), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 600
	});
	redirect(303, authorizeUrl(state, `${config.appUrl}/auth/callback`), { external: true });
};
