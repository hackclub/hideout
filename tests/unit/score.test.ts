import { describe, expect, it } from 'vitest';
import {
	payout,
	payoutUsers,
	scoreRound,
	type ScoreBug,
	type ScoreConfig,
	type ScoreShip
} from '../../src/lib/game/score.js';

const cfg: ScoreConfig = {
	fixPoints: [5, 15, 40],
	findValue: [2, 6, 16],
	tierStake: [0, 20, 40],
	capMultiplier: 3,
	unbreakableMultiplier: 1.5
};

const ship = (over: Partial<ScoreShip> = {}): ScoreShip => ({
	shipId: 1,
	userId: 10,
	approved: true,
	tier: 2,
	verdict: null,
	...over
});

const bug = (over: Partial<ScoreBug> = {}): ScoreBug => ({
	shipId: 1,
	raccoonId: 20,
	severity: 'minor',
	status: 'merged',
	mergedBy: 'builder',
	overturned: false,
	checkResult: null,
	...over
});

describe('scoreRound', () => {
	it('gives raccoons fix points only for merged PRs', () => {
		const p = scoreRound(
			cfg,
			[ship()],
			[
				bug({ severity: 'major' }),
				bug({ raccoonId: 21, status: 'accepted' }),
				bug({ raccoonId: 22, status: 'invalid' })
			]
		);
		expect(p.get(20)!.raccoon).toBe(15);
		expect(p.get(21)?.raccoon ?? 0).toBe(0);
		expect(p.get(22)?.raccoon ?? 0).toBe(0);
	});

	it('matches the PDF example: tier 2 with one merged minor is 19', () => {
		const p = scoreRound(cfg, [ship()], [bug()]);
		expect(p.get(10)!.builder).toBe(19);
	});

	it('never rewards planting a bug: zero bugs beats any bugs', () => {
		for (const tier of [1, 2, 3]) {
			const clean = scoreRound(cfg, [ship({ tier, verdict: 'not_attacked' })], []).get(10)!.builder;
			const planted = scoreRound(cfg, [ship({ tier })], [bug()]).get(10)!.builder;
			expect(clean).toBeGreaterThanOrEqual(planted);
		}
	});

	it('pays the unbreakable bonus only when a reviewer says it was attacked', () => {
		expect(scoreRound(cfg, [ship({ tier: 3, verdict: 'attacked' })], []).get(10)!.builder).toBe(60);
		expect(scoreRound(cfg, [ship({ tier: 3, verdict: 'not_attacked' })], []).get(10)!.builder).toBe(
			40
		);
		expect(scoreRound(cfg, [ship({ tier: 3, verdict: 'unrunnable' })], []).get(10)!.builder).toBe(
			0
		);
	});

	it('pays a "too simple" ship its stake with no bonus', () => {
		for (const tier of [1, 2, 3]) {
			const simple = scoreRound(cfg, [ship({ tier, verdict: 'too_simple' })], []).get(10)!.builder;
			expect(simple).toBe(cfg.tierStake[tier - 1]);
			expect(simple).toBe(
				scoreRound(cfg, [ship({ tier, verdict: 'not_attacked' })], []).get(10)!.builder
			);
		}
	});

	it('charges full cost for overturned disputes and reviewer-approved merges', () => {
		expect(scoreRound(cfg, [ship()], [bug({ overturned: true })]).get(10)!.builder).toBe(18);
		expect(scoreRound(cfg, [ship()], [bug({ mergedBy: 'reviewer' })]).get(10)!.builder).toBe(18);
		expect(
			scoreRound(cfg, [ship()], [bug({ status: 'accepted', mergedBy: null })]).get(10)!.builder
		).toBe(18);
	});

	it('floors builder points at zero and ignores rejected checks', () => {
		const many = Array.from({ length: 5 }, () =>
			bug({ severity: 'critical', mergedBy: 'reviewer' })
		);
		expect(scoreRound(cfg, [ship()], many).get(10)!.builder).toBe(0);
		const p = scoreRound(cfg, [ship()], [bug({ checkResult: 'rejected' })]);
		expect(p.get(10)!.builder).toBe(20);
		expect(p.get(20)?.raccoon ?? 0).toBe(0);
	});

	it('gives nothing to unapproved ships', () => {
		expect(scoreRound(cfg, [ship({ approved: false })], []).get(10)).toBeUndefined();
	});
});

describe('several ships from one builder', () => {
	it('adds up builder points from every approved ship', () => {
		const p = scoreRound(
			cfg,
			[
				ship({ shipId: 1, tier: 2 }),
				ship({ shipId: 2, tier: 3 }),
				ship({ shipId: 3, tier: 3, approved: false }),
				ship({ shipId: 4, userId: 11, tier: 1 })
			],
			[bug({ shipId: 1 }), bug({ shipId: 2, severity: 'major', mergedBy: 'reviewer' })]
		);
		expect(p.get(10)!.builder).toBe(19 + 34);
		expect(p.get(11)!.builder).toBe(0);
	});

	it('caps the bonus on all approved hours together', () => {
		const points = scoreRound(cfg, [ship({ shipId: 1 }), ship({ shipId: 2, tier: 3 })], []);
		const base = new Map([
			[10, 5 * 10 + 8 * 10],
			[30, 1000]
		]);
		points.set(30, { raccoon: 1, builder: 0 });
		const users = payoutUsers(points, base);
		expect(users).toContainEqual({ userId: 10, points: 60, base: 130 });
		const r = payout({ pool: 10000, capMultiplier: 3, users });
		expect(r.rows.find((x) => x.userId === 10)!.bonus).toBe(390);
	});

	it('keeps people with only base or only points', () => {
		const users = payoutUsers(new Map([[1, { raccoon: 5, builder: 0 }]]), new Map([[2, 40]]));
		expect(users).toEqual([
			{ userId: 1, points: 5, base: 0 },
			{ userId: 2, points: 0, base: 40 }
		]);
	});
});

describe('payout', () => {
	it('matches the PDF example point value', () => {
		const users = Array.from({ length: 100 }, (_, i) => ({ userId: i, points: 32, base: 160 }));
		const r = payout({ pool: 16000, users, capMultiplier: 3 });
		expect(r.pointValue).toBe(5);
		expect(r.rows[0].bonus).toBe(160);
		expect(r.rollover).toBe(0);
	});

	it('shares capped overflow with people under their cap first', () => {
		const r = payout({
			pool: 1000,
			capMultiplier: 3,
			users: [
				{ userId: 1, points: 90, base: 10 },
				{ userId: 2, points: 10, base: 1000 }
			]
		});
		expect(r.rows[0].bonus).toBe(30);
		expect(r.rows[1].bonus).toBe(970);
		expect(r.rollover).toBe(0);
	});

	it('rolls over what nobody can take', () => {
		const r = payout({
			pool: 1000,
			capMultiplier: 3,
			users: [{ userId: 1, points: 10, base: 10 }]
		});
		expect(r.rows[0].bonus).toBe(30);
		expect(r.rollover).toBe(970);
	});

	it('handles zero points and zero base', () => {
		expect(payout({ pool: 500, capMultiplier: 3, users: [] }).rollover).toBe(500);
		const r = payout({ pool: 500, capMultiplier: 3, users: [{ userId: 1, points: 50, base: 0 }] });
		expect(r.rows[0].bonus).toBe(0);
		expect(r.rollover).toBe(500);
	});

	it('never pays out more than the pool', () => {
		for (let seed = 1; seed < 50; seed++) {
			const users = Array.from({ length: 20 }, (_, i) => ({
				userId: i,
				points: ((seed * (i + 3)) % 37) + (i % 3 === 0 ? 0 : 1),
				base: ((seed * (i + 7)) % 50) * 10
			}));
			const r = payout({ pool: 3333.33, capMultiplier: 3, users });
			const paid = r.rows.reduce((s, x) => s + x.bonus, 0);
			expect(paid + r.rollover).toBeCloseTo(3333.33, 1);
			for (const row of r.rows) expect(row.bonus).toBeLessThanOrEqual(row.base * 3 + 1e-6);
		}
	});
});
