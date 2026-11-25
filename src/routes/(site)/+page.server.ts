import { INVITE_COOKIE, inviterByCode } from '#lib/server/invites.js';
import { firstName } from '#lib/game/invites.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	if (locals.user) return { invitedBy: null };
	const code = url.searchParams.get('ref') ?? cookies.get(INVITE_COOKIE);
	const inviter = code ? await inviterByCode(code) : null;
	return { invitedBy: inviter ? firstName(inviter) : null };
};
