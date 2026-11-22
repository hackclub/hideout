import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, isUniqueViolation, schema } from '#lib/server/db/index.js';
import { config } from '#lib/server/config.js';
import { logAudit } from '#lib/server/audit.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
	if (!locals.user) redirect(303, '/login');
	const state = cookies.get('hideout_gh');
	cookies.delete('hideout_gh', { path: '/' });
	if (!state || state !== url.searchParams.get('state'))
		error(400, 'Connection expired, try again.');
	const res = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: { accept: 'application/json', 'content-type': 'application/json' },
		body: JSON.stringify({
			client_id: config.github.clientId,
			client_secret: config.github.clientSecret,
			code: url.searchParams.get('code')
		})
	});
	const { access_token } = (await res.json()) as { access_token?: string };
	if (!access_token) error(400, 'GitHub did not give us a token, try again.');
	const me = await fetch('https://api.github.com/user', {
		headers: { authorization: `Bearer ${access_token}`, 'user-agent': 'hideout-ysws' }
	});
	const { login } = me.ok ? ((await me.json()) as { login?: unknown }) : {};
	if (typeof login !== 'string' || !login)
		error(400, "We couldn't read your GitHub account, try again.");
	const taken = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.where(eq(schema.users.githubLogin, login.toLowerCase()));
	if (taken.some((t) => t.id !== locals.user!.id))
		error(409, 'That GitHub account is linked to someone else.');
	try {
		await db
			.update(schema.users)
			.set({ githubLogin: login.toLowerCase() })
			.where(eq(schema.users.id, locals.user.id));
	} catch (e) {
		if (isUniqueViolation(e)) error(409, 'That GitHub account is linked to someone else.');
		throw e;
	}
	await logAudit(
		locals.user.id,
		'user.github_linked',
		{ type: 'user', id: locals.user.id },
		{ login }
	);
	redirect(303, '/settings?connected=github');
};
