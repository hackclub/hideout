import { requireStaff } from '#lib/server/guards.js';
import { checkQueue } from '#lib/server/game/admin.js';
import { checkFix, SEVERITIES, type Severity } from '#lib/server/game/bugs.js';
import { GameError } from '#lib/server/game/ships.js';
import { attempt, num, str } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	return { checks: await checkQueue() };
};

const done: Record<string, string> = {
	confirmed: 'Checked: looks right.',
	downgraded: 'Checked: severity lowered.',
	rejected: "Checked: this fix doesn't count."
};

export const actions: Actions = {
	check: async ({ request, locals }) => {
		const me = requireStaff(locals);
		const f = await request.formData();
		const result = str(f, 'result') as 'confirmed' | 'downgraded' | 'rejected';
		const severity = str(f, 'severity') as Severity;
		return attempt(async () => {
			if (!(result in done)) throw new GameError('Pick a result.');
			await checkFix(me, num(f, 'bugId'), {
				result,
				severity: SEVERITIES.includes(severity) ? severity : undefined,
				note: str(f, 'note')
			});
		}, done[result] ?? 'Saved.');
	}
};
