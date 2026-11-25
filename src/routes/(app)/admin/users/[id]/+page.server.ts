import { error } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/guards.js';
import {
	adjustAcorns,
	banUser,
	setInviter,
	setRole,
	unbanUser,
	userDetail
} from '#lib/server/game/admin.js';
import { GameError } from '#lib/server/game/ships.js';
import { attempt, str } from '#lib/server/actions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireAdmin(locals);
	const id = Number(params.id);
	const detail = Number.isInteger(id) ? await userDetail(id) : null;
	if (!detail) error(404, 'User not found');
	return detail;
};

export const actions: Actions = {
	role: async ({ request, locals, params }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		return attempt(() => setRole(me, Number(params.id), str(f, 'role')), 'Role changed.');
	},
	acorns: async ({ request, locals, params }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		return attempt(async () => {
			const raw = str(f, 'amount').trim();
			if (!raw) throw new GameError('Enter an amount like 25 or -10.');
			await adjustAcorns(me, Number(params.id), Number(raw), str(f, 'note'));
		}, 'Acorns adjusted.');
	},
	ban: async ({ request, locals, params }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		return attempt(async () => {
			if (f.get('confirm') !== 'yes') throw new GameError('Tick the box to confirm first.');
			await banUser(me, Number(params.id), str(f, 'reason'));
		}, 'Banned. Their targets and open fixes are void.');
	},
	inviter: async ({ request, locals, params }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		return attempt(
			() => setInviter(me, Number(params.id), Number(str(f, 'inviterId'))),
			'Inviter set.'
		);
	},
	unban: async ({ locals, params }) => {
		const me = requireAdmin(locals);
		return attempt(() => unbanUser(me, Number(params.id)), 'Ban lifted.');
	}
};
