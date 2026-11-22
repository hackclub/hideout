import { error } from '@sveltejs/kit';
import { gameState } from '#lib/server/game/season.js';
import { submitFix, withdrawFix, type Severity } from '#lib/server/game/bugs.js';
import { shipFixes } from '#lib/server/game/hours.js';
import * as hackatime from '#lib/server/services/hackatime.js';
import { myTargets } from '#lib/server/views.js';
import { attempt, num, str } from '#lib/server/actions.js';
import { rateLimit } from '#lib/server/ratelimit.js';
import { now } from '#lib/server/clock.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const { raid: round, config } = await gameState();
	if (!round) error(404, 'Not found');
	const t = (await myTargets(user.id, round.id)).find((t) => t.a.id === Number(params.id));
	if (!t) error(404, 'Not found');
	const htProjects =
		hackatime.isConnected(user) && ['break', 'scoring'].includes(round.phase)
			? await hackatime.projects(user, round.breakStartsAt, now())
			: [];
	return { t, phase: round.phase, htProjects, fixPoints: config.fixPoints };
};

export const actions: Actions = {
	fix: async ({ request, locals }) => {
		const f = await request.formData();
		return attempt(async () => {
			rateLimit(locals.user!.id, 'fix');
			return submitFix(locals.user!, {
				assignmentId: num(f, 'assignmentId'),
				prUrl: str(f, 'prUrl'),
				severity: str(f, 'severity') as Severity,
				note: str(f, 'note')
			});
		}, 'Fix sent! The builder has 24 hours to answer.');
	},
	withdraw: async ({ request, locals }) => {
		const f = await request.formData();
		return attempt(() => withdrawFix(locals.user!, num(f, 'bugId')), 'Fix withdrawn.');
	},
	ship: async ({ request, locals }) => {
		const f = await request.formData();
		const file = f.get('screenshot');
		return attempt(async () => {
			rateLimit(locals.user!.id, 'shipFixes');
			return shipFixes(locals.user!, num(f, 'assignmentId'), {
				forkUrl: str(f, 'forkUrl'),
				demoUrl: str(f, 'demoUrl'),
				project: str(f, 'project'),
				note: str(f, 'note'),
				screenshot: file instanceof File && file.size > 0 ? file : null
			});
		}, 'Fixes shipped. A reviewer will check them and approve your hours.');
	}
};
