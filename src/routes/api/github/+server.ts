import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { config } from '#lib/server/config.js';
import { markMerged } from '#lib/server/game/bugs.js';
import { roundById } from '#lib/server/game/season.js';
import type { RequestHandler } from './$types';

function verify(body: string, signature: string | null) {
	if (!config.github.webhookSecret || !signature) return false;
	const expected = `sha256=${createHmac('sha256', config.github.webhookSecret).update(body).digest('hex')}`;
	const a = Buffer.from(expected);
	const b = Buffer.from(signature);
	return a.length === b.length && timingSafeEqual(a, b);
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	if (!verify(body, request.headers.get('x-hub-signature-256')))
		return new Response('bad signature', { status: 401 });
	if (request.headers.get('x-github-event') !== 'pull_request')
		return new Response(null, { status: 204 });

	const event = JSON.parse(body) as {
		action: string;
		pull_request?: { html_url: string; merged: boolean; merged_at: string | null };
	};
	const pr = event.pull_request;
	if (event.action !== 'closed' || !pr?.merged) return new Response(null, { status: 204 });

	const [bug] = await db
		.select()
		.from(schema.bugs)
		.where(eq(schema.bugs.prUrl, pr.html_url.toLowerCase()));
	if (!bug) return new Response(null, { status: 204 });
	const r = await roundById(bug.roundId);
	const at = pr.merged_at ? new Date(pr.merged_at) : new Date();
	if (r && r.round.status === 'open' && at.getTime() <= r.round.scoringEndsAt.getTime()) {
		await markMerged(bug.id, 'builder', null, at).catch(() => undefined);
	}
	return new Response(null, { status: 204 });
};
