import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, url }) => {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
	redirect(303, `/auth/start${url.search}`);
};

function safeNext(next: string | null) {
	return next && next.startsWith('/') && !next.startsWith('//') ? next : '/home';
}
