import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { respond } from '#lib/server/game/bugs.js';
import { gameState } from '#lib/server/game/season.js';
import { attempt, str } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [row] = await db
		.select({
			bug: schema.bugs,
			ship: schema.ships,
			raccoon: { name: schema.users.name, githubLogin: schema.users.githubLogin }
		})
		.from(schema.bugs)
		.innerJoin(schema.ships, eq(schema.ships.id, schema.bugs.shipId))
		.innerJoin(schema.users, eq(schema.users.id, schema.bugs.raccoonId))
		.where(eq(schema.bugs.id, Number(params.id)));
	if (!row || row.ship.userId !== locals.user!.id) error(404, 'Not found');
	const { config } = await gameState();
	return { ...row, stake: { fixPoints: config.fixPoints, findValue: config.findValue } };
};

export const actions: Actions = {
	accept: async ({ params, locals }) =>
		attempt(
			() => respond(locals.user!, Number(params.id), { action: 'accept' }),
			'Accepted. Merge the PR on GitHub to get half the cost back.'
		),
	dispute: async ({ params, locals, request }) => {
		const f = await request.formData();
		return attempt(
			() =>
				respond(locals.user!, Number(params.id), {
					action: 'dispute',
					kind: str(f, 'kind'),
					reason: str(f, 'reason')
				}),
			'Disputed. A reviewer will decide.'
		);
	}
};
