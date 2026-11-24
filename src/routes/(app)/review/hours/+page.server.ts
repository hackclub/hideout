import { requireStaff } from '#lib/server/guards.js';
import { hoursQueue, refreshHours } from '#lib/server/game/admin.js';
import { reviewBreakHours } from '#lib/server/game/hours.js';
import { GameError } from '#lib/server/game/ships.js';
import { attempt, num, str } from '#lib/server/actions.js';
import * as kairos from '#lib/server/services/kairos.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	const claims = await hoursQueue();
	const hours = await Promise.all(
		claims.map((c) =>
			kairos.summaryOrDown(
				c.raccoon,
				c.a.kairosProject ? [c.a.kairosProject] : [],
				c.round.breakStartsAt,
				c.round.breakEndsAt
			)
		)
	);
	return {
		claims: claims.map(({ raccoon: { hcaId, slackId, ...raccoon }, ...c }, i) => ({
			...c,
			raccoon,
			kairos: hours[i]
		}))
	};
};

export const actions: Actions = {
	review: async ({ request, locals }) => {
		const me = requireStaff(locals);
		const f = await request.formData();
		const approve = str(f, 'approve') === 'yes';
		return attempt(
			async () => {
				const hours = approve ? Number(str(f, 'hours').trim() || NaN) : 0;
				if (!Number.isFinite(hours)) throw new GameError('Fill in how many hours to approve.');
				await reviewBreakHours(me, num(f, 'assignmentId'), {
					approve,
					hours,
					note: str(f, 'note')
				});
			},
			approve ? 'Hours approved and paid.' : 'Hours not approved.'
		);
	},
	refresh: async ({ request, locals }) => {
		const me = requireStaff(locals);
		const f = await request.formData();
		return attempt(() => refreshHours(me, num(f, 'assignmentId')), 'Rechecked Hackatime.');
	}
};
