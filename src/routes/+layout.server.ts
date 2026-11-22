import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const u = locals.user;
	return {
		user: u ? { id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl } : null
	};
};
