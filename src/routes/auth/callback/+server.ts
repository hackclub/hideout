import { error, redirect } from '@sveltejs/kit';
import { config } from '#lib/server/config.js';
import { exchangeCode } from '#lib/server/services/hca.js';
import { isStaff, upsertUser } from '#lib/server/users.js';
import { createSession } from '#lib/server/session.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const saved = cookies.get('hideout_oauth');
	cookies.delete('hideout_oauth', { path: '/' });
	const { state, next } = saved ? JSON.parse(saved) : { state: null, next: '/home' };
	if (!state || state !== url.searchParams.get('state'))
		error(400, 'Login expired, please try again.');
	const code = url.searchParams.get('code');
	if (!code) error(400, 'Missing code from Hack Club Auth.');

	const profile = await exchangeCode(code, `${config.appUrl}/auth/callback`);
	const user = await upsertUser({
		hcaId: profile.sub,
		email: profile.email,
		name: profile.name,
		firstName: profile.firstName,
		lastName: profile.lastName,
		slackId: profile.slackId,
		address: profile.address,
		verification: profile.verification
	});
	await createSession(cookies, user.id);
	redirect(303, profile.eligible ? safeNext(next) : isStaff(user) ? '/review' : '/ineligible');
};

function safeNext(next: string) {
	return next.startsWith('/') && !next.startsWith('//') ? next : '/home';
}
