import { redirect } from '@sveltejs/kit';
import { config } from '#lib/server/config.js';
import { randomToken } from '#lib/server/crypto.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, cookies }) => {
	if (!locals.user) redirect(303, '/login');
	const state = randomToken(16);
	cookies.set('hideout_gh', state, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600 });
	const url = new URL('https://github.com/login/oauth/authorize');
	url.searchParams.set('client_id', config.github.clientId);
	url.searchParams.set('redirect_uri', `${config.appUrl}/connect/github/callback`);
	url.searchParams.set('scope', 'read:user');
	url.searchParams.set('state', state);
	redirect(303, url.toString(), { external: true });
};
