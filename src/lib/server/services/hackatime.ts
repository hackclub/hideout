import { config } from '../config.js';
import { decrypt } from '../crypto.js';

export type HackatimeProject = { name: string; seconds: number };

type HackatimeUser = { id: number; hackatimeUserId: string | null; hackatimeToken: string | null };

export function isConnected(user: HackatimeUser) {
	return Boolean(user.hackatimeUserId);
}

export function connectUrl(state: string) {
	const url = new URL(`${config.hackatime.baseUrl}/oauth/authorize`);
	url.searchParams.set('client_id', config.hackatime.clientId);
	url.searchParams.set('redirect_uri', `${config.appUrl}/connect/hackatime/callback`);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', 'profile read');
	url.searchParams.set('state', state);
	return url.toString();
}

export async function exchange(code: string): Promise<{ userId: string; token: string }> {
	const res = await fetch(`${config.hackatime.baseUrl}/oauth/token`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: `${config.appUrl}/connect/hackatime/callback`,
			client_id: config.hackatime.clientId,
			client_secret: config.hackatime.clientSecret
		})
	});
	if (!res.ok) throw new Error(`Hackatime token exchange failed: ${res.status}`);
	const { access_token } = (await res.json()) as { access_token: string };
	const me = await fetch(`${config.hackatime.baseUrl}/api/v1/authenticated/me`, {
		headers: { authorization: `Bearer ${access_token}` }
	});
	if (!me.ok) throw new Error(`Hackatime profile failed: ${me.status}`);
	const body = (await me.json()) as { id: number | string };
	return { userId: String(body.id), token: access_token };
}

export async function projects(
	user: HackatimeUser,
	since?: Date,
	until?: Date
): Promise<HackatimeProject[]> {
	if (!user.hackatimeUserId) return [];
	const url = new URL(`${config.hackatime.baseUrl}/api/v1/authenticated/projects`);
	if (since) url.searchParams.set('start_date', since.toISOString());
	if (until) url.searchParams.set('end_date', until.toISOString());
	const res = await fetch(url, {
		headers: { authorization: `Bearer ${decrypt(user.hackatimeToken!)}` },
		signal: AbortSignal.timeout(10_000)
	});
	if (!res.ok) throw new Error(`Hackatime projects failed: ${res.status}`);
	const body = (await res.json()) as { projects?: { name: string; total_seconds: number }[] };
	return (body.projects ?? []).map((p) => ({ name: p.name, seconds: p.total_seconds }));
}

export async function projectsOrDown(user: HackatimeUser, since?: Date, until?: Date) {
	try {
		return { projects: await projects(user, since, until), down: false };
	} catch (e) {
		console.error(e);
		return { projects: [] as HackatimeProject[], down: true };
	}
}

export async function hoursFor(user: HackatimeUser, names: string[], since?: Date, until?: Date) {
	const all = await projects(user, since, until);
	const seconds = all.filter((p) => names.includes(p.name)).reduce((sum, p) => sum + p.seconds, 0);
	return Math.round((seconds / 3600) * 100) / 100;
}
