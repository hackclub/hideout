import { error } from '@sveltejs/kit';
import { gameState } from '#lib/server/game/season.js';
import {
	isLocked,
	projectFor,
	saveProject,
	shipProject,
	shipsIn,
	type ProjectInput
} from '#lib/server/game/ships.js';
import * as hackatime from '#lib/server/services/hackatime.js';
import { incomingFixes } from '#lib/server/views.js';
import { attempt, str } from '#lib/server/actions.js';
import { rateLimit } from '#lib/server/ratelimit.js';
import { now } from '#lib/server/clock.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;
	const row = await projectFor(user.id, Number(params.id));
	if (!row) error(404, 'Project not found');
	const { round } = await gameState();
	const building = round?.phase === 'build';
	const others = round
		? (await shipsIn(user.id, [round.id])).filter(
				(s) => s.status !== 'rejected' && s.projectId !== row.project.id
			)
		: [];
	const htProjects =
		!isLocked(row.ship) && hackatime.isConnected(user)
			? (
					await hackatime.projects(
						user,
						building ? round!.buildStartsAt : undefined,
						building ? now() : undefined
					)
				).sort((a, b) => b.seconds - a.seconds)
			: [];
	for (const name of row.project.hackatimeProjects)
		if (!htProjects.some((p) => p.name === name)) htProjects.push({ name, seconds: 0 });
	return {
		project: row.project,
		ship: row.ship,
		shipRound: row.round,
		fixes: row.ship ? await incomingFixes([row.ship.id]) : [],
		htProjects,
		building,
		taken: others.flatMap((s) => s.hackatimeProjects)
	};
};

function projectInput(f: FormData): ProjectInput {
	return {
		name: str(f, 'name'),
		description: str(f, 'description'),
		repoUrl: str(f, 'repoUrl'),
		demoUrl: str(f, 'demoUrl'),
		hackatimeProjects: f.getAll('hackatime').map(String),
		isUpdate: f.get('isUpdate') === 'on',
		updateDescription: str(f, 'updateDescription'),
		screenshots: ['screenshot1', 'screenshot2'].map((key) => {
			const file = f.get(key);
			return file instanceof File && file.size > 0 ? file : null;
		})
	};
}

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const f = await request.formData();
		return attempt(async () => {
			rateLimit(locals.user!.id, 'save', 30);
			await saveProject(locals.user!, Number(params.id), projectInput(f));
		}, 'Saved.');
	},
	ship: async ({ request, locals, params }) => {
		const f = await request.formData();
		return attempt(async () => {
			rateLimit(locals.user!.id, 'ship');
			await shipProject(locals.user!, Number(params.id), projectInput(f));
		}, 'Shipped! Your project is frozen at this commit. A reviewer will look at it soon.');
	}
};
