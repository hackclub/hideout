import { fail } from '@sveltejs/kit';
import { GameError } from './game/ships.js';

export async function attempt<T>(fn: () => Promise<T>, okMessage?: string) {
	try {
		const result = await fn();
		return { ok: true as const, message: okMessage ?? null, result: result ?? null };
	} catch (e) {
		if (e instanceof GameError) return fail(400, { ok: false as const, message: e.message });
		throw e;
	}
}

export function str(form: FormData, key: string) {
	const v = form.get(key);
	return typeof v === 'string' ? v : '';
}

export function num(form: FormData, key: string) {
	const v = Number(str(form, key));
	return Number.isFinite(v) ? v : NaN;
}
