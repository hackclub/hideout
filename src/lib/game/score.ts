export type Sev = 'minor' | 'major' | 'critical';
const IDX: Record<Sev, 0 | 1 | 2> = { minor: 0, major: 1, critical: 2 };

export type ScoreConfig = {
	fixPoints: [number, number, number];
	findValue: [number, number, number];
	tierStake: [number, number, number];
	capMultiplier: number;
	unbreakableMultiplier: number;
};

export type ScoreShip = {
	shipId: number;
	userId: number;
	approved: boolean;
	tier: number | null;
	verdict: 'attacked' | 'not_attacked' | 'too_simple' | 'unrunnable' | null;
};

export type ScoreBug = {
	shipId: number;
	raccoonId: number;
	severity: Sev;
	status: string;
	mergedBy: string | null;
	overturned: boolean;
	checkResult: string | null;
};

export function counts(bug: Pick<ScoreBug, 'status' | 'checkResult'>) {
	return (bug.status === 'accepted' || bug.status === 'merged') && bug.checkResult !== 'rejected';
}

export const LIVE_FIX = ['waiting', 'accepted', 'disputed', 'merged'] as const;
export const isLiveFix = (status: string) => (LIVE_FIX as readonly string[]).includes(status);

export type Points = { raccoon: number; builder: number };

export function scoreRound(cfg: ScoreConfig, ships: ScoreShip[], bugs: ScoreBug[]) {
	const points = new Map<number, Points>();
	const add = (userId: number, key: keyof Points, n: number) => {
		const p = points.get(userId) ?? { raccoon: 0, builder: 0 };
		p[key] += n;
		points.set(userId, p);
	};

	for (const bug of bugs) {
		if (bug.status === 'merged' && bug.checkResult !== 'rejected')
			add(bug.raccoonId, 'raccoon', cfg.fixPoints[IDX[bug.severity]]);
	}

	for (const ship of ships) {
		if (!ship.approved || !ship.tier) continue;
		const stake = cfg.tierStake[ship.tier - 1] ?? 0;
		const valid = bugs.filter((b) => b.shipId === ship.shipId && counts(b));
		let builder: number;
		if (valid.length === 0) {
			if (ship.verdict === 'unrunnable') builder = 0;
			else if (ship.verdict === 'attacked') builder = stake * cfg.unbreakableMultiplier;
			else builder = stake;
		} else {
			const cost = valid.reduce((sum, b) => {
				const full = cfg.findValue[IDX[b.severity]];
				const half = b.status === 'merged' && b.mergedBy === 'builder' && !b.overturned;
				return sum + (half ? full / 2 : full);
			}, 0);
			builder = Math.max(0, stake - cost);
		}
		add(ship.userId, 'builder', builder);
	}
	return points;
}

export function payoutUsers(points: Map<number, Points>, base: Map<number, number>) {
	return [...new Set([...points.keys(), ...base.keys()])].map((userId) => {
		const p = points.get(userId) ?? { raccoon: 0, builder: 0 };
		return { userId, points: p.raccoon + p.builder, base: base.get(userId) ?? 0 };
	});
}

export type PayoutInput = {
	pool: number;
	users: { userId: number; points: number; base: number }[];
	capMultiplier: number;
};

export type PayoutRow = {
	userId: number;
	points: number;
	base: number;
	bonus: number;
	capped: number;
};

export function payout({ pool, users, capMultiplier }: PayoutInput) {
	const rows: PayoutRow[] = users.map((u) => ({ ...u, bonus: 0, capped: 0 }));
	let left = pool;
	let open = rows.filter((r) => r.points > 0 && r.base > 0);

	for (let i = 0; i < 50 && left > 0.005 && open.length; i++) {
		const total = open.reduce((s, r) => s + r.points, 0);
		const next: PayoutRow[] = [];
		let given = 0;
		for (const r of open) {
			const room = r.base * capMultiplier - r.bonus;
			const share = (left * r.points) / total;
			const take = Math.min(share, room);
			r.bonus += take;
			given += take;
			if (share < room - 1e-9) next.push(r);
		}
		left -= given;
		if (next.length === open.length) break;
		open = next;
	}
	for (const r of rows) {
		const uncapped =
			(pool * r.points) /
			Math.max(
				1e-9,
				rows.reduce((s, x) => s + x.points, 0)
			);
		r.capped = Math.max(0, Math.round((uncapped - r.bonus) * 100) / 100);
		r.bonus = Math.floor(r.bonus * 100) / 100;
	}
	const paid = rows.reduce((s, r) => s + r.bonus, 0);
	const totalPoints = rows.reduce((s, r) => s + r.points, 0);
	return {
		rows,
		rollover: Math.max(0, Math.round((pool - paid) * 100) / 100),
		pointValue: totalPoints > 0 ? pool / totalPoints : 0
	};
}
