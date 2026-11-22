import { GameError } from './game/ships.js';

const hits = new Map<string, number[]>();

export function rateLimit(userId: number, action: string, max = 10, windowMs = 10 * 60e3) {
	const key = `${action}:${userId}`;
	const at = Date.now();
	const recent = (hits.get(key) ?? []).filter((t) => at - t < windowMs);
	if (recent.length >= max)
		throw new GameError('Too many tries in a row. Wait a few minutes and try again.');
	recent.push(at);
	hits.set(key, recent);
}
