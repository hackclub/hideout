import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { config } from '#lib/server/config.js';
import { attempt } from '#lib/server/actions.js';
import * as kairos from '#lib/server/services/kairos.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const u = locals.user!;
	return {
		githubLogin: u.githubLogin,
		hackatime: Boolean(u.hackatimeUserId),
		kairosOn: kairos.enabled(),
		kairos: await kairos.hasAccount(u),
		slack: Boolean(u.slackId),
		address: u.address,
		hcaUrl: config.hca.issuer
	};
};

export const actions: Actions = {
	unlinkHackatime: async ({ locals }) =>
		attempt(async () => {
			await db
				.update(schema.users)
				.set({ hackatimeUserId: null, hackatimeToken: null })
				.where(eq(schema.users.id, locals.user!.id));
		}, 'Hackatime disconnected.')
};
