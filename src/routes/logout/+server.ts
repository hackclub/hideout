import { redirect } from '@sveltejs/kit';
import { endSession } from '#lib/server/session.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	await endSession(cookies);
	redirect(303, '/');
};
