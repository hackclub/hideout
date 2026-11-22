import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { building, dev } from '$app/env';
import { readSession } from '#lib/server/session.js';
import { startTicker, stopTicker } from '#lib/server/tick.js';
import { requireUser } from '#lib/server/guards.js';
import { closeDb, migrateDb } from '#lib/server/db/index.js';
import { startupProblems } from '#lib/server/startup.js';
import { seedIfEmpty } from '#lib/server/seed.js';

export const init: ServerInit = async () => {
	if (building) return;
	const missing = startupProblems(process.env);
	if (!dev && !process.env.ORIGIN?.trim()) missing.push('ORIGIN');
	if (missing.length) throw new Error(`Refusing to start, missing settings: ${missing.join(', ')}`);
	await migrateDb();
	await seedIfEmpty();
	startTicker();
	process.once('sveltekit:shutdown', async () => {
		stopTicker();
		await closeDb();
	});
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await readSession(event.cookies);
	const id = event.route.id;
	if (id && (id.startsWith('/(app)') || id.startsWith('/connect/')))
		requireUser(event.locals, event.url.pathname);
	const response = await resolve(event);
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('x-content-type-options', 'nosniff');
	return response;
};
