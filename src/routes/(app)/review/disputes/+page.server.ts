import { requireStaff } from '#lib/server/guards.js';
import { disputeQueue } from '#lib/server/game/admin.js';
import { resolveDispute, SEVERITIES, type Severity } from '#lib/server/game/bugs.js';
import { GameError } from '#lib/server/game/ships.js';
import { attempt, num, str } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	return { disputes: await disputeQueue() };
};

const done: Record<string, string> = {
	upheld: 'Settled: the fix counts.',
	invalid: 'Settled: not a bug.',
	duplicate: 'Settled: duplicate.'
};

export const actions: Actions = {
	resolve: async ({ request, locals }) => {
		const me = requireStaff(locals);
		const f = await request.formData();
		const outcome = str(f, 'outcome') as 'upheld' | 'invalid' | 'duplicate';
		const severity = str(f, 'severity') as Severity;
		return attempt(async () => {
			if (!(outcome in done)) throw new GameError('Pick an outcome.');
			await resolveDispute(me, num(f, 'bugId'), {
				outcome,
				severity: SEVERITIES.includes(severity) ? severity : undefined,
				note: str(f, 'note')
			});
		}, done[outcome] ?? 'Saved.');
	}
};
