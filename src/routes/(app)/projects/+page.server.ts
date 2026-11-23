import { redirect } from '@sveltejs/kit';
import { gameState } from '#lib/server/game/season.js';
import { createProject, myProjects } from '#lib/server/game/ships.js';
import { attempt, str } from '#lib/server/actions.js';
import { rateLimit } from '#lib/server/ratelimit.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { round, config } = await gameState();
	const rows = await myProjects(locals.user!.id);
	const live = rows.flatMap((r) =>
		r.ship && r.ship.roundId === round?.id && r.ship.status !== 'rejected' ? [r.ship] : []
	);
	return {
		projects: rows.map((r) => ({
			id: r.project.id,
			name: r.project.name,
			description: r.project.description,
			screenshot: r.project.screenshots[0] ?? null,
			ship: r.ship ? { status: r.ship.status, round: r.round?.number ?? null } : null
		})),
		ladder: config.shipMinHours,
		shipped: live.length
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const f = await request.formData();
		return attempt(async () => {
			rateLimit(locals.user!.id, 'project');
			const project = await createProject(locals.user!, str(f, 'name'));
			redirect(303, `/projects/${project.id}`);
		});
	}
};
