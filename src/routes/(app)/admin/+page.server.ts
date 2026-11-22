import { requireAdmin } from '#lib/server/guards.js';
import {
	allRounds,
	namesFor,
	saveSeasonConfig,
	setPrizePool,
	updateRoundDates
} from '#lib/server/game/admin.js';
import { closeRound, generateAssignments, previewRound } from '#lib/server/game/rounds.js';
import { currentSeason, seasonConfig } from '#lib/server/game/season.js';
import { GameError } from '#lib/server/game/ships.js';
import { attempt, num, str } from '#lib/server/actions.js';
import type { SeasonConfig } from '#lib/server/db/schema.js';
import type { Actions, PageServerLoad } from './$types';

function configText(config: SeasonConfig) {
	return `{\n${Object.entries(config)
		.map(([k, v]) => `  "${k}": ${JSON.stringify(v).replace(/,/g, ', ')}`)
		.join(',\n')}\n}`;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals);
	const season = await currentSeason();
	if (!season) return { season: null, rounds: [], configText: '', preview: null };
	const rounds = (await allRounds()).filter((r) => r.seasonId === season.id);

	const previewId = Number(url.searchParams.get('preview'));
	let preview = null;
	if (rounds.some((r) => r.id === previewId)) {
		const p = await previewRound(previewId);
		const names = await namesFor(p.rows.map((r) => r.userId));
		preview = {
			roundId: previewId,
			number: p.round.number,
			status: p.round.status,
			pool: p.pool,
			pointValue: p.pointValue,
			rollover: p.rollover,
			blockers: p.blockers,
			rows: p.rows
				.map((row) => ({
					...row,
					name: names.get(row.userId)?.name ?? `#${row.userId}`,
					raccoon: p.points.get(row.userId)?.raccoon ?? 0,
					builder: p.points.get(row.userId)?.builder ?? 0
				}))
				.sort((a, b) => b.points - a.points || b.base - a.base)
		};
	}

	return {
		season: {
			id: season.id,
			name: season.name,
			startsAt: season.startsAt,
			prizePool: season.prizePool
		},
		rounds: rounds.map((r) => ({
			id: r.id,
			number: r.number,
			phase: r.phase,
			status: r.status,
			buildStartsAt: r.buildStartsAt,
			breakStartsAt: r.breakStartsAt,
			breakEndsAt: r.breakEndsAt,
			scoringEndsAt: r.scoringEndsAt,
			assignedAt: r.assignedAt,
			closedAt: r.closedAt,
			pool: r.pool,
			pointValue: r.pointValue,
			rolloverIn: r.rolloverIn,
			rolloverOut: r.rolloverOut
		})),
		configText: configText(seasonConfig(season)),
		preview
	};
};

function utcDate(f: FormData, key: string) {
	const v = str(f, key).trim();
	return new Date(v.length === 16 ? `${v}:00Z` : `${v}Z`);
}

export const actions: Actions = {
	dates: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		return attempt(
			() =>
				updateRoundDates(me, num(f, 'roundId'), {
					buildStartsAt: utcDate(f, 'buildStartsAt'),
					breakStartsAt: utcDate(f, 'breakStartsAt'),
					breakEndsAt: utcDate(f, 'breakEndsAt')
				}),
			'Dates saved.'
		);
	},
	assign: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		return attempt(() => generateAssignments(num(f, 'roundId'), me.id), 'Targets handed out.');
	},
	close: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		return attempt(async () => {
			if (f.get('confirm') !== 'yes') throw new GameError('Tick the box to confirm first.');
			await closeRound(me, num(f, 'roundId'));
		}, 'Round closed and paid out.');
	},
	config: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		return attempt(
			() => saveSeasonConfig(me, num(f, 'seasonId'), str(f, 'config')),
			'Season settings saved.'
		);
	},
	prize: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const f = await request.formData();
		return attempt(async () => {
			const raw = str(f, 'prizePool').trim();
			if (!raw) throw new GameError('Enter an amount.');
			await setPrizePool(me, num(f, 'seasonId'), Number(raw));
		}, 'Prize pool saved.');
	}
};
