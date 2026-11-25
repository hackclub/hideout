import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../src/lib/server/config.js';
import { joinChannels } from '../../src/lib/server/services/slack.js';

let calls: { url: string; body: { channel: string; users: string } }[] = [];

function stub(...replies: object[]) {
	const queue = [...replies];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit) => {
			calls.push({ url, body: JSON.parse(init.body as string) });
			return new Response(JSON.stringify(queue.shift() ?? { ok: true }));
		})
	);
}

let errors: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	calls = [];
	config.slack.signupChannels = ['C1', 'C2', 'C3'];
	errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('joinChannels', () => {
	it('invites the user to every signup channel', async () => {
		stub();
		await joinChannels('U123');
		expect(calls.map((c) => c.url)).toEqual(
			Array(3).fill('https://slack.com/api/conversations.invite')
		);
		expect(calls.map((c) => c.body)).toEqual([
			{ channel: 'C1', users: 'U123' },
			{ channel: 'C2', users: 'U123' },
			{ channel: 'C3', users: 'U123' }
		]);
	});

	it('keeps going after a failure and stays quiet about already_in_channel', async () => {
		stub({ ok: false, error: 'already_in_channel' }, { ok: false, error: 'cant_invite' });
		await joinChannels('U123');
		expect(calls).toHaveLength(3);
		expect(errors).toHaveBeenCalledTimes(1);
		expect(errors).toHaveBeenCalledWith('[slack] invite failed', 'C2', 'cant_invite');
	});

	it('does nothing without channels', async () => {
		config.slack.signupChannels = [];
		stub();
		await joinChannels('U123');
		expect(calls).toHaveLength(0);
	});
});
