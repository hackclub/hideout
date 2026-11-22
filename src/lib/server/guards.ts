import { error, redirect } from '@sveltejs/kit';
import type { SessionUser } from './session.js';
import { isEligible, isStaff } from './users.js';

export const isStaffPath = (path: string) => /^\/(review|admin)(\/|$)/.test(path);

export function requireUser(locals: App.Locals, path = '/home'): SessionUser {
	const user = locals.user;
	if (!user) redirect(303, `/login?next=${encodeURIComponent(path)}`);
	if (user.banned) redirect(303, '/ineligible?why=banned');
	if (!isEligible(user) && !(isStaff(user) && isStaffPath(path))) redirect(303, '/ineligible');
	return user;
}

export function requireStaff(locals: App.Locals): SessionUser {
	const user = requireUser(locals, '/review');
	if (user.role !== 'reviewer' && user.role !== 'admin') error(404, 'Not found');
	return user;
}

export function requireAdmin(locals: App.Locals): SessionUser {
	const user = requireUser(locals, '/admin');
	if (user.role !== 'admin') error(404, 'Not found');
	return user;
}
