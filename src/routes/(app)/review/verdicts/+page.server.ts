import { requireStaff } from '#lib/server/guards.js';
import { verdictQueue } from '#lib/server/game/admin.js';
import { setVerdict } from '#lib/server/game/rounds.js';
import { GameError } from '#lib/server/game/ships.js';
import { attempt, num, str } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	return { groups: await verdictQueue() };
};

const VERDICTS = ['attacked', 'too_simple', 'not_attacked', 'unrunnable'] as const;

export const actions: Actions = {
	verdict: async ({ request, locals }) => {
		const me = requireStaff(locals);
		const f = await request.formData();
		const verdict = str(f, 'verdict') as (typeof VERDICTS)[number];
		return attempt(async () => {
			if (!VERDICTS.includes(verdict)) throw new GameError('Pick a verdict.');
			await setVerdict(me, num(f, 'shipId'), verdict);
		}, 'Verdict saved.');
	}
};
