import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../src/lib/server/config.js';
import * as kairos from '../../src/lib/server/services/kairos.js';

type Reply = { status: number; body?: unknown };

let calls: { url: URL; auth: string }[] = [];
let nextId = 1;

function stub(...replies: Reply[]) {
	const queue = [...replies];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: URL, init: RequestInit) => {
			calls.push({
				url: new URL(url),
				auth: (init.headers as Record<string, string>).authorization
			});
			const r = queue.shift() ?? { status: 500 };
			return new Response(JSON.stringify(r.body ?? { error: 'User not found' }), {
				status: r.status
			});
		})
	);
}

function user(slackId: string | null = null) {
	return { id: nextId++, hcaId: 'ident!abc', slackId };
}

const stats = {
	data: {
		total_seconds: 7200,
		kairos: {
			focus_seconds: { editing: 3600 },
			categories: { 'ai coding': 1800, coding: 5000, 'running tests': 400, researching: 0 },
			agent_seconds: 900
		}
	},
	trust_factor: { trust_level: 'blue', trust_value: 0 }
};

beforeEach(() => {
	calls = [];
	config.kairos.baseUrl = 'https://kairos.test';
	config.kairos.apiKey = 'kp_test';
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe('kairos off', () => {
	it('is off without a key and never calls out', async () => {
		config.kairos.apiKey = '';
		stub();
		expect(kairos.enabled()).toBe(false);
		expect(await kairos.hasAccount(user())).toBeNull();
		expect(await kairos.projectsOrDown(user())).toEqual({ state: 'off', projects: [] });
		expect(await kairos.summaryOrDown(user(), ['a'], new Date(), new Date())).toBeNull();
		expect(calls).toHaveLength(0);
	});
});

describe('kairos hasAccount', () => {
	it('sends the program key to the stats endpoint with an empty window', async () => {
		stub({ status: 200, body: { total_seconds: 0 } });
		expect(await kairos.hasAccount(user())).toBe(true);
		expect(calls).toHaveLength(1);
		const { url, auth } = calls[0];
		expect(auth).toBe('Bearer kp_test');
		expect(url.origin + url.pathname).toBe('https://kairos.test/api/v1/users/ident!abc/stats');
		expect(url.searchParams.get('total_seconds')).toBe('true');
		expect(url.searchParams.get('start_date')).toBe(url.searchParams.get('end_date'));
	});

	it('keeps a yes for good', async () => {
		vi.useFakeTimers();
		const u = user();
		stub({ status: 200, body: { total_seconds: 0 } });
		expect(await kairos.hasAccount(u)).toBe(true);
		vi.advanceTimersByTime(24 * 3600_000);
		expect(await kairos.hasAccount(u)).toBe(true);
		expect(calls).toHaveLength(1);
	});

	it('keeps a no for 60 seconds, then asks again', async () => {
		vi.useFakeTimers();
		const u = user();
		stub({ status: 404 }, { status: 200, body: { total_seconds: 0 } });
		expect(await kairos.hasAccount(u)).toBe(false);
		vi.advanceTimersByTime(59_000);
		expect(await kairos.hasAccount(u)).toBe(false);
		expect(calls).toHaveLength(1);
		vi.advanceTimersByTime(2_000);
		expect(await kairos.hasAccount(u)).toBe(true);
		expect(calls).toHaveLength(2);
	});

	it('returns null when Kairos fails and does not cache it', async () => {
		const u = user();
		stub({ status: 500 }, { status: 200, body: { total_seconds: 0 } });
		expect(await kairos.hasAccount(u)).toBeNull();
		expect(await kairos.hasAccount(u)).toBe(true);
		expect(calls).toHaveLength(2);
	});

	it('returns null when fetch throws', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('timeout');
			})
		);
		expect(await kairos.hasAccount(user())).toBeNull();
	});

	it('falls back to the Slack id when the Hack Club Auth id is unknown', async () => {
		stub({ status: 404 }, { status: 200, body: { total_seconds: 0 } });
		expect(await kairos.hasAccount(user('U123'))).toBe(true);
		expect(calls.map((c) => c.url.pathname)).toEqual([
			'/api/v1/users/ident!abc/stats',
			'/api/v1/users/U123/stats'
		]);
	});

	it('does not try a Slack id that is missing', async () => {
		stub({ status: 404 });
		expect(await kairos.hasAccount(user())).toBe(false);
		expect(calls).toHaveLength(1);
	});
});

describe('kairos projects', () => {
	it('reads project details for the window', async () => {
		stub({
			status: 200,
			body: {
				projects: [
					{ name: 'you/game', total_seconds: 5400, languages: [] },
					{ name: 'notes', total_seconds: 60 }
				]
			}
		});
		const since = new Date('2026-11-01T00:00:00Z');
		const until = new Date('2026-11-08T12:30:00.500Z');
		expect(await kairos.projects(user(), since, until)).toEqual([
			{ name: 'you/game', seconds: 5400 },
			{ name: 'notes', seconds: 60 }
		]);
		const { url, auth } = calls[0];
		expect(auth).toBe('Bearer kp_test');
		expect(url.pathname).toBe('/api/v1/users/ident!abc/projects/details');
		expect(url.searchParams.get('start_date')).toBe('2026-11-01T00:00:00.000Z');
		expect(url.searchParams.get('end_date')).toBe('2026-11-08T12:30:00.500Z');
	});

	it('leaves the window to Kairos when none is given', async () => {
		stub({ status: 200, body: { projects: [] } });
		expect(await kairos.projects(user())).toEqual([]);
		expect([...calls[0].url.searchParams.keys()]).toEqual([]);
	});

	it('is null without an account and throws on other failures', async () => {
		stub({ status: 404 }, { status: 404 });
		expect(await kairos.projects(user('U1'))).toBeNull();
		stub({ status: 503 });
		await expect(kairos.projects(user())).rejects.toThrow('503');
	});

	it('maps to states for the pickers', async () => {
		stub({ status: 200, body: { projects: [{ name: 'a', total_seconds: 1 }] } });
		expect(await kairos.projectsOrDown(user())).toEqual({
			state: 'ok',
			projects: [{ name: 'a', seconds: 1 }]
		});
		stub({ status: 404 });
		expect(await kairos.projectsOrDown(user())).toEqual({ state: 'none', projects: [] });
		stub({ status: 500 });
		expect(await kairos.projectsOrDown(user())).toEqual({ state: 'down', projects: [] });
	});
});

describe('kairos summary', () => {
	const since = new Date('2026-11-01T00:00:00Z');
	const until = new Date('2026-11-08T00:00:00Z');

	it('asks stats for the picked projects and window', async () => {
		stub({ status: 200, body: stats });
		expect(await kairos.summary(user(), ['you/game', 'Notes'], since, until)).toEqual({
			seconds: 7200,
			categories: { 'ai coding': 1800, coding: 5000, 'running tests': 400, researching: 0 },
			agentSeconds: 900
		});
		const { url, auth } = calls[0];
		expect(auth).toBe('Bearer kp_test');
		expect(url.pathname).toBe('/api/v1/users/ident!abc/stats');
		expect(url.searchParams.get('start_date')).toBe('2026-11-01T00:00:00.000Z');
		expect(url.searchParams.get('end_date')).toBe('2026-11-08T00:00:00.000Z');
		expect(url.searchParams.get('filter_by_project')).toBe('you/game,Notes');
		expect(url.searchParams.get('features')).toBe('projects');
	});

	it('skips names with a comma since the filter splits on them', async () => {
		stub({ status: 200, body: stats });
		await kairos.summary(user(), ['a,b', 'c'], since, until);
		expect(calls[0].url.searchParams.get('filter_by_project')).toBe('c');
	});

	it('is null without an account and throws on a 500', async () => {
		stub({ status: 404 });
		expect(await kairos.summary(user(), ['a'], since, until)).toBeNull();
		stub({ status: 500 });
		await expect(kairos.summary(user(), ['a'], since, until)).rejects.toThrow('500');
	});

	it('maps to states for the review pages', async () => {
		stub();
		expect(await kairos.summaryOrDown(user(), [], since, until)).toEqual({ state: 'unpicked' });
		expect(calls).toHaveLength(0);
		stub({ status: 200, body: stats });
		expect(await kairos.summaryOrDown(user(), ['a'], since, until)).toMatchObject({
			state: 'ok',
			seconds: 7200
		});
		stub({ status: 404 });
		expect(await kairos.summaryOrDown(user(), ['a'], since, until)).toEqual({ state: 'none' });
		stub({ status: 500 });
		expect(await kairos.summaryOrDown(user(), ['a'], since, until)).toEqual({ state: 'down' });
	});
});
