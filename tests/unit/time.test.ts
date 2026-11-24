import { describe, expect, it } from 'vitest';
import { etDay, etInput, parseEt } from '../../src/lib/game/time.js';
import { when } from '../../src/lib/game/labels.js';
import { roundDates } from '../../src/lib/game/phase.js';

describe('new york time', () => {
	it('reads a wall time as new york time in winter and summer', () => {
		expect(parseEt('2026-11-24T00:00').toISOString()).toBe('2026-11-24T05:00:00.000Z');
		expect(parseEt('2026-07-04T12:30').toISOString()).toBe('2026-07-04T16:30:00.000Z');
	});

	it('round trips through the admin input format', () => {
		for (const v of [
			'2026-11-24T00:00',
			'2026-12-01T23:59',
			'2027-03-14T03:30',
			'2027-11-07T00:30'
		])
			expect(etInput(parseEt(v))).toBe(v);
	});

	it('uses the new york calendar day, not the utc one', () => {
		expect(etDay(new Date('2026-12-01T03:00:00Z'))).toBe('2026-11-30');
	});

	it('labels times the same way wherever the code runs', () => {
		expect(when(new Date('2026-11-24T05:00:00Z'))).toBe('Nov 24, 12:00 AM ET');
	});

	it('keeps every season 1 round on midnight new york time', () => {
		const start = new Date('2026-11-24T00:00:00-05:00');
		for (let n = 1; n <= 4; n++) {
			const r = roundDates(start, n);
			for (const d of [r.buildStartsAt, r.breakStartsAt, r.breakEndsAt])
				expect(etInput(d).slice(11)).toBe('00:00');
		}
	});

	it('rejects junk', () => {
		expect(Number.isNaN(parseEt('nope').getTime())).toBe(true);
	});
});
