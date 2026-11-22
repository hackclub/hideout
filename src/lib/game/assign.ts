export type Raider = { userId: number };
export type Target = { shipId: number; ownerId: number; tier: number | null };
export type Pair = { userId: number; shipId: number };

export type AssignInput = {
	raiders: Raider[];
	targets: Target[];
	k: number;
	pastPairs: Set<string>;
	random?: () => number;
};

export function shuffle<T>(list: T[], random: () => number) {
	const a = [...list];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

export function assignTargets({
	raiders,
	targets,
	k,
	pastPairs,
	random = Math.random
}: AssignInput): Pair[] {
	const load = new Map(targets.map((t) => [t.shipId, 0]));
	const picks = new Map<number, Target[]>(raiders.map((r) => [r.userId, []]));
	const order = shuffle(raiders, random);
	const out: Pair[] = [];

	for (let pass = 0; pass < k; pass++) {
		for (const r of order) {
			const mine = picks.get(r.userId)!;
			const options = targets.filter(
				(t) => t.ownerId !== r.userId && !mine.some((m) => m.shipId === t.shipId)
			);
			if (!options.length) continue;
			let best: Target | null = null;
			let bestScore = Infinity;
			for (const t of options) {
				const score =
					load.get(t.shipId)! * 100 +
					(pastPairs.has(`${r.userId}:${t.ownerId}`) ? 40 : 0) +
					(t.tier !== null && mine.some((m) => m.tier === t.tier) ? 5 : 0) +
					random();
				if (score < bestScore) {
					bestScore = score;
					best = t;
				}
			}
			mine.push(best!);
			load.set(best!.shipId, load.get(best!.shipId)! + 1);
		}
	}

	const users = order.map((r) => r.userId).filter((id) => picks.get(id)!.length);
	const cost = (userId: number, list: Target[]) =>
		list.reduce(
			(sum, t, i) =>
				sum +
				(pastPairs.has(`${userId}:${t.ownerId}`) ? 100 : 0) +
				(t.tier !== null && list.findIndex((x) => x.tier === t.tier) < i ? 1 : 0),
			0
		);
	for (let i = 0; i < users.length * 60 && users.length > 1; i++) {
		const a = users[Math.floor(random() * users.length)];
		const b = users[Math.floor(random() * users.length)];
		if (a === b) continue;
		const la = picks.get(a)!;
		const lb = picks.get(b)!;
		const ia = Math.floor(random() * la.length);
		const ib = Math.floor(random() * lb.length);
		const ta = la[ia];
		const tb = lb[ib];
		if (ta.shipId === tb.shipId || tb.ownerId === a || ta.ownerId === b) continue;
		if (la.some((t) => t.shipId === tb.shipId) || lb.some((t) => t.shipId === ta.shipId)) continue;
		const na = la.map((t, j) => (j === ia ? tb : t));
		const nb = lb.map((t, j) => (j === ib ? ta : t));
		if (cost(a, na) + cost(b, nb) < cost(a, la) + cost(b, lb)) {
			picks.set(a, na);
			picks.set(b, nb);
		}
	}

	for (const [userId, list] of picks) for (const t of list) out.push({ userId, shipId: t.shipId });
	return out;
}

export function seeded(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
