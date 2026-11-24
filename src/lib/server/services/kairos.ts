import { config } from '../config.js';

export type KairosProject = { name: string; seconds: number };

export type KairosSummary = {
	seconds: number;
	categories: Record<string, number>;
	agentSeconds: number;
};

export type KairosHours =
	{ state: 'unpicked' | 'none' | 'down' } | ({ state: 'ok' } & KairosSummary);

type KairosUser = { id: number; hcaId: string; slackId: string | null };

const NO_ACCOUNT_MS = 60_000;
const accounts = new Map<number, { has: boolean; at: number }>();

export function enabled() {
	return Boolean(config.kairos.apiKey);
}

async function read<T>(user: KairosUser, path: string, params: Record<string, string>) {
	for (const ident of new Set([user.hcaId, user.slackId])) {
		if (!ident) continue;
		const url = new URL(
			`${config.kairos.baseUrl}/api/v1/users/${encodeURIComponent(ident)}/${path}`
		);
		for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
		const res = await fetch(url, {
			headers: { authorization: `Bearer ${config.kairos.apiKey}` },
			signal: AbortSignal.timeout(5_000)
		});
		if (res.status === 404) continue;
		if (!res.ok) throw new Error(`Kairos ${path} failed: ${res.status}`);
		return (await res.json()) as T;
	}
	return null;
}

export async function hasAccount(user: KairosUser): Promise<boolean | null> {
	if (!enabled()) return null;
	const known = accounts.get(user.id);
	if (known && (known.has || Date.now() - known.at < NO_ACCOUNT_MS)) return known.has;
	try {
		const at = new Date().toISOString();
		const has =
			(await read(user, 'stats', { total_seconds: 'true', start_date: at, end_date: at })) !== null;
		accounts.set(user.id, { has, at: Date.now() });
		return has;
	} catch (e) {
		console.error(e);
		return null;
	}
}

export async function projects(
	user: KairosUser,
	since?: Date,
	until?: Date
): Promise<KairosProject[] | null> {
	const params: Record<string, string> = {};
	if (since) params.start_date = since.toISOString();
	if (until) params.end_date = until.toISOString();
	const body = await read<{ projects?: { name: string; total_seconds: number }[] }>(
		user,
		'projects/details',
		params
	);
	if (!body) return null;
	return (body.projects ?? []).map((p) => ({ name: p.name, seconds: p.total_seconds }));
}

export async function projectsOrDown(
	user: KairosUser,
	since?: Date,
	until?: Date
): Promise<{ state: 'off' | 'none' | 'down' | 'ok'; projects: KairosProject[] }> {
	if (!enabled()) return { state: 'off', projects: [] };
	try {
		const found = await projects(user, since, until);
		return found ? { state: 'ok', projects: found } : { state: 'none', projects: [] };
	} catch (e) {
		console.error(e);
		return { state: 'down', projects: [] };
	}
}

export async function summary(
	user: KairosUser,
	names: string[],
	since: Date,
	until: Date
): Promise<KairosSummary | null> {
	const filter = names.filter((n) => !n.includes(','));
	if (!filter.length) return { seconds: 0, categories: {}, agentSeconds: 0 };
	const body = await read<{
		data: {
			total_seconds: number;
			kairos: { categories: Record<string, number>; agent_seconds: number };
		};
	}>(user, 'stats', {
		start_date: since.toISOString(),
		end_date: until.toISOString(),
		filter_by_project: filter.join(','),
		features: 'projects'
	});
	if (!body) return null;
	return {
		seconds: body.data.total_seconds,
		categories: body.data.kairos.categories,
		agentSeconds: body.data.kairos.agent_seconds
	};
}

export async function summaryOrDown(
	user: KairosUser,
	names: string[],
	since: Date,
	until: Date
): Promise<KairosHours | null> {
	if (!enabled()) return null;
	if (!names.length) return { state: 'unpicked' };
	try {
		const hours = await summary(user, names, since, until);
		return hours ? { state: 'ok', ...hours } : { state: 'none' };
	} catch (e) {
		console.error(e);
		return { state: 'down' };
	}
}
