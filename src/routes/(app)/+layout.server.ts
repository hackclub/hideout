import { requireUser } from '#lib/server/guards.js';
import { gameState } from '#lib/server/game/season.js';
import { unreadCount, wallet } from '#lib/server/views.js';
import { now } from '#lib/server/clock.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	const user = requireUser(locals, url.pathname);
	const { season, config, round, rounds } = await gameState();
	return {
		me: {
			id: user.id,
			name: user.name,
			avatarUrl: user.avatarUrl,
			email: user.email,
			role: user.role,
			githubLogin: user.githubLogin,
			hackatime: Boolean(user.hackatimeUserId),
			hasAddress: Boolean(user.address)
		},
		season: season ? { name: season.name } : null,
		acornCents: config.acornCents,
		round: round
			? {
					id: round.id,
					number: round.number,
					phase: round.phase,
					buildStartsAt: round.buildStartsAt,
					breakStartsAt: round.breakStartsAt,
					breakEndsAt: round.breakEndsAt,
					scoringEndsAt: round.scoringEndsAt
				}
			: null,
		roundCount: rounds.length,
		now: now(),
		wallet: await wallet(user.id),
		unread: await unreadCount(user.id),
		sidebarClosed: cookies.get('sidebar') === 'closed'
	};
};
