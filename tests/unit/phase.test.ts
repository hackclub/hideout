import { describe, expect, it } from 'vitest';
import { phaseOf, pickCurrent, roundDates, roundProgress } from '../../src/lib/game/phase.js';

const start = new Date('2026-12-01T00:00:00Z');
const rounds = [1, 2, 3, 4].map((n) => ({
	id: n,
	...roundDates(start, n),
	status: 'open' as const
}));

describe('phases', () => {
	it('walks through a round', () => {
		const r = rounds[0];
		expect(phaseOf(r, new Date('2026-11-30T00:00:00Z'), 24)).toBe('upcoming');
		expect(phaseOf(r, new Date('2026-12-03T00:00:00Z'), 24)).toBe('build');
		expect(phaseOf(r, new Date('2026-12-09T00:00:00Z'), 24)).toBe('break');
		expect(phaseOf(r, new Date('2026-12-15T12:00:00Z'), 24)).toBe('scoring');
		expect(phaseOf(r, new Date('2026-12-16T01:00:00Z'), 24)).toBe('ready');
		expect(phaseOf({ ...r, status: 'closed' }, new Date('2026-12-16T01:00:00Z'), 24)).toBe(
			'closed'
		);
	});

	it('season is 8 weeks', () => {
		expect(rounds[3].breakEndsAt.toISOString()).toBe('2027-01-26T00:00:00.000Z');
	});

	it('picks the right current round', () => {
		expect(pickCurrent(rounds, new Date('2026-11-20T00:00:00Z'))!.id).toBe(1);
		expect(pickCurrent(rounds, new Date('2026-12-16T00:00:00Z'))!.id).toBe(2);
		const closed1 = rounds.map((r) => (r.id === 1 ? { ...r, status: 'closed' as const } : r));
		expect(pickCurrent(closed1, new Date('2026-12-15T01:00:00Z'))!.id).toBe(2);
	});
});

describe('round progress', () => {
	const r = { ...rounds[0], scoringEndsAt: new Date('2026-12-16T00:00:00Z') };

	it('fills build week first, then break week', () => {
		const mid = roundProgress(r, 'build', new Date('2026-12-04T12:00:00Z'));
		expect(mid.build).toBe(50);
		expect(mid.break).toBe(0);
		expect(mid.step).toBe('build');
		expect(mid.deadline).toEqual({ at: r.breakStartsAt, label: 'ship' });

		const brk = roundProgress(r, 'break', new Date('2026-12-11T12:00:00Z'));
		expect(brk.build).toBe(100);
		expect(brk.break).toBe(50);
		expect(brk.deadline?.label).toBe('break');
	});

	it('has no deadline once the round is being counted', () => {
		const done = roundProgress(r, 'ready', new Date('2026-12-20T00:00:00Z'));
		expect(done.step).toBeNull();
		expect(done.deadline).toBeNull();
		expect(done.break).toBe(100);
	});
});
