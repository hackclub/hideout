import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { gameState } from '#lib/server/game/season.js';
import { shipsIn } from '#lib/server/game/ships.js';
import { targetCards } from '#lib/server/views.js';
import * as kairos from '#lib/server/services/kairos.js';
import { nextSteps } from '#lib/game/steps.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const kairosAccount = kairos.hasAccount(user);
	const { round, raid } = await gameState();
	const targets = raid ? await targetCards(user.id, raid.id) : [];

	const ships = await shipsIn(
		user.id,
		[...new Set([round?.id, raid?.id])].filter((id) => id !== undefined)
	);
	const shipIds = ships.map((s) => s.id);
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
		ships: ships.filter((s) => s.roundId === round?.id).map((s) => ({ status: s.status })),
		targets: targets.length,
		waiting
	});

	return { steps, targets, kairosBanner: (await kairosAccount) !== true };
};
