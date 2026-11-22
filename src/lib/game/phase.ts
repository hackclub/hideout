export type Phase = 'upcoming' | 'build' | 'break' | 'scoring' | 'ready' | 'closed';

export type RoundTimes = {
	buildStartsAt: Date;
	breakStartsAt: Date;
	breakEndsAt: Date;
	status: 'open' | 'closed';
};

export function scoringEndsAt(round: RoundTimes, scoringHours: number) {
	return new Date(round.breakEndsAt.getTime() + scoringHours * 36e5);
}

export function phaseOf(round: RoundTimes, now: Date, scoringHours: number): Phase {
	if (round.status === 'closed') return 'closed';
	const t = now.getTime();
	if (t < round.buildStartsAt.getTime()) return 'upcoming';
	if (t < round.breakStartsAt.getTime()) return 'build';
	if (t < round.breakEndsAt.getTime()) return 'break';
	if (t < scoringEndsAt(round, scoringHours).getTime()) return 'scoring';
	return 'ready';
}

export function pickCurrent<T extends RoundTimes>(rounds: T[], now: Date): T | null {
	const sorted = [...rounds].sort((a, b) => a.buildStartsAt.getTime() - b.buildStartsAt.getTime());
	const started = sorted.filter((r) => r.buildStartsAt.getTime() <= now.getTime());
	const open = started.filter((r) => r.status === 'open');
	if (open.length) return open[open.length - 1];
	const next = sorted.find((r) => r.buildStartsAt.getTime() > now.getTime());
	return next ?? sorted[sorted.length - 1] ?? null;
}

export const phaseLabel: Record<Phase, string> = {
	upcoming: 'Starting soon',
	build: 'Build week',
	break: 'Break week',
	scoring: 'Wrapping up',
	ready: 'Counting acorns',
	closed: 'Round over'
};

export function roundDates(seasonStart: Date, number: number) {
	const day = 864e5;
	const buildStartsAt = new Date(seasonStart.getTime() + (number - 1) * 14 * day);
	return {
		buildStartsAt,
		breakStartsAt: new Date(buildStartsAt.getTime() + 7 * day),
		breakEndsAt: new Date(buildStartsAt.getTime() + 14 * day)
	};
}

export type RoundProgress = {
	build: number;
	break: number;
	step: 'build' | 'break' | null;
	deadline: { at: Date; label: 'starts' | 'ship' | 'break' | 'merges' } | null;
};

export function roundProgress(
	round: Pick<RoundTimes, 'buildStartsAt' | 'breakStartsAt' | 'breakEndsAt'> & {
		scoringEndsAt: Date;
	},
	phase: Phase,
	now: Date
): RoundProgress {
	const pct = (from: Date, to: Date) =>
		Math.min(
			100,
			Math.max(0, ((now.getTime() - from.getTime()) / (to.getTime() - from.getTime())) * 100)
		);
	const deadlines: Partial<Record<Phase, RoundProgress['deadline']>> = {
		upcoming: { at: round.buildStartsAt, label: 'starts' },
		build: { at: round.breakStartsAt, label: 'ship' },
		break: { at: round.breakEndsAt, label: 'break' },
		scoring: { at: round.scoringEndsAt, label: 'merges' }
	};
	return {
		build: pct(round.buildStartsAt, round.breakStartsAt),
		break: pct(round.breakStartsAt, round.breakEndsAt),
		step: phase === 'build' || phase === 'break' ? phase : null,
		deadline: deadlines[phase] ?? null
	};
}
