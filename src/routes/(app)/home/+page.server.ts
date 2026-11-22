import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { gameState } from '#lib/server/game/season.js';
import { shipFor } from '#lib/server/game/ships.js';
import { targetCards } from '#lib/server/views.js';
import { nextSteps } from '#lib/game/steps.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const { round, raid } = await gameState();
	const ship = round ? await shipFor(user.id, round.id) : null;
	const targets = raid ? await targetCards(user.id, raid.id) : [];

	const raidShip = raid && raid.id !== round?.id ? await shipFor(user.id, raid.id) : null;
	const shipIds = [ship, raidShip].flatMap((s) => (s ? [s.id] : []));
	const [{ waiting }] = shipIds.length
		? await db
				.select({ waiting: sql<number>`count(*)::int` })
				.from(schema.bugs)
				.where(and(inArray(schema.bugs.shipId, shipIds), eq(schema.bugs.status, 'waiting')))
		: [{ waiting: 0 }];

	const steps = nextSteps({
		phase: round?.phase ?? null,
		hackatime: Boolean(user.hackatimeUserId),
		github: Boolean(user.githubLogin),
		ship: ship ? { status: ship.status } : null,
		targets: targets.length,
		waiting
	});

	return { steps, targets };
};
