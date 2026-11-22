import { error } from '@sveltejs/kit';
import { requireStaff } from '#lib/server/guards.js';
import { shipDetail } from '#lib/server/game/admin.js';
import { GameError, reviewShip, type ReviewInput } from '#lib/server/game/ships.js';
import { attempt, num, str } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireStaff(locals);
	const id = Number(params.id);
	const detail = Number.isInteger(id) ? await shipDetail(id) : null;
	if (!detail) error(404, 'Ship not found');
	const { round, ...rest } = detail;
	return { ...rest, shipRound: round };
};

const done: Record<string, string> = {
	approved: 'Approved. Their build hours are paid.',
	changes: 'Sent back. They can fix it and ship again.',
	rejected: 'Marked as not accepted.'
};

export const actions: Actions = {
	review: async ({ request, locals, params }) => {
		const me = requireStaff(locals);
		const f = await request.formData();
		const decision = str(f, 'decision') as ReviewInput['decision'];
		return attempt(async () => {
			if (!(decision in done)) throw new GameError('Pick a decision.');
			const hoursRaw = str(f, 'approvedHours').trim();
			if (decision === 'approved' && !hoursRaw) throw new GameError('Fill in the approved hours.');
			const hours = Number(hoursRaw);
			if (decision === 'approved' && !Number.isFinite(hours))
				throw new GameError('Approved hours must be a number.');
			await reviewShip(me, Number(params.id), {
				decision,
				tier: num(f, 'tier') || null,
				approvedHours: decision === 'approved' ? hours : null,
				note: str(f, 'note')
			});
		}, done[decision] ?? 'Saved.');
	}
};
