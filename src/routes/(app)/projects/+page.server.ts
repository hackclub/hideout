import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { gameState } from '#lib/server/game/season.js';
import { myProject, ship, shipFor, withdrawShip } from '#lib/server/game/ships.js';
import * as hackatime from '#lib/server/services/hackatime.js';
import { incomingFixes } from '#lib/server/views.js';
import { attempt, num, str } from '#lib/server/actions.js';
import { rateLimit } from '#lib/server/ratelimit.js';
import { now } from '#lib/server/clock.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const { round } = await gameState();
	const project = await myProject(user.id);
	const current = round ? await shipFor(user.id, round.id) : null;
	const history = await db
		.select({ ship: schema.ships, round: { number: schema.rounds.number } })
		.from(schema.ships)
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.ships.roundId))
		.where(eq(schema.ships.userId, user.id))
		.orderBy(desc(schema.ships.createdAt));
	const htProjects =
		round && hackatime.isConnected(user)
			? (await hackatime.projects(user, round.buildStartsAt, now())).sort(
					(a, b) => b.seconds - a.seconds
				)
			: [];
	return {
		project,
		current,
		history: history.filter((h) => h.ship.id !== current?.id),
		htProjects,
		fixes: current ? await incomingFixes(current.id) : []
	};
};

export const actions: Actions = {
	ship: async ({ request, locals }) => {
		const f = await request.formData();
		const file = f.get('screenshot');
		return attempt(async () => {
			rateLimit(locals.user!.id, 'ship');
			return ship(locals.user!, {
				name: str(f, 'name'),
				description: str(f, 'description'),
				repoUrl: str(f, 'repoUrl'),
				demoUrl: str(f, 'demoUrl'),
				hackatimeProjects: f.getAll('hackatime').map(String),
				screenshot: file instanceof File && file.size > 0 ? file : null
			});
		}, 'Shipped! Your project is frozen at this commit. A reviewer will look at it soon.');
	},
	withdraw: async ({ request, locals }) => {
		const f = await request.formData();
		return attempt(
			() => withdrawShip(locals.user!, num(f, 'shipId')),
			'Ship withdrawn. You can ship again before build week ends.'
		);
	}
};
