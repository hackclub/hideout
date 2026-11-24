import { describe, expect, it } from 'vitest';
import { assignTargets, seeded } from '../../src/lib/game/assign.js';

function make(n: number, m: number) {
	const raiders = Array.from({ length: n }, (_, i) => ({ userId: i + 1 }));
	const targets = Array.from({ length: m }, (_, i) => ({
		shipId: 100 + i,
		ownerId: i + 1,
		claimedHours: 5 + ((i * 7) % m)
	}));
	return { raiders, targets };
}

describe('assignTargets', () => {
	it('gives everyone 3 targets, never their own, and balances load', () => {
		const { raiders, targets } = make(100, 90);
		const pairs = assignTargets({
			raiders,
			targets,
			k: 3,
			pastPairs: new Set(),
			random: seeded(1)
		});
		expect(pairs.length).toBe(300);
		const owner = new Map(targets.map((t) => [t.shipId, t.ownerId]));
		for (const p of pairs) expect(owner.get(p.shipId)).not.toBe(p.userId);
		const load = new Map<number, number>();
		for (const p of pairs) load.set(p.shipId, (load.get(p.shipId) ?? 0) + 1);
		const loads = [...load.values()];
		expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(1);
		const perUser = new Map<number, Set<number>>();
		for (const p of pairs)
			perUser.set(p.userId, (perUser.get(p.userId) ?? new Set()).add(p.shipId));
		for (const s of perUser.values()) expect(s.size).toBe(3);
	});

	it('works with tiny groups', () => {
		const { raiders, targets } = make(3, 3);
		const pairs = assignTargets({
			raiders,
			targets,
			k: 3,
			pastPairs: new Set(),
			random: seeded(2)
		});
		expect(pairs.length).toBe(6);
		const one = make(1, 1);
		expect(assignTargets({ ...one, k: 3, pastPairs: new Set(), random: seeded(3) })).toEqual([]);
	});

	it('mixes small, medium and big projects for each raccoon', () => {
		const { raiders, targets } = make(30, 30);
		const pairs = assignTargets({
			raiders,
			targets,
			k: 3,
			pastPairs: new Set(),
			random: seeded(5)
		});
		const sorted = [...targets].sort((a, b) => a.claimedHours - b.claimedHours);
		const band = new Map(sorted.map((t, i) => [t.shipId, Math.floor(i / 10)]));
		const perUser = new Map<number, Set<number>>();
		for (const p of pairs)
			perUser.set(p.userId, (perUser.get(p.userId) ?? new Set()).add(band.get(p.shipId)!));
		for (const bands of perUser.values()) expect(bands.size).toBe(3);
	});

	it('avoids pairs from earlier rounds when it can', () => {
		const { raiders, targets } = make(10, 10);
		const past = new Set<string>();
		for (let u = 1; u <= 10; u++)
			for (const o of [(u % 10) + 1, ((u + 1) % 10) + 1]) past.add(`${u}:${o}`);
		const pairs = assignTargets({ raiders, targets, k: 3, pastPairs: past, random: seeded(4) });
		const owner = new Map(targets.map((t) => [t.shipId, t.ownerId]));
		const repeats = pairs.filter((p) => past.has(`${p.userId}:${owner.get(p.shipId)}`)).length;
		expect(repeats).toBe(0);
	});
});
