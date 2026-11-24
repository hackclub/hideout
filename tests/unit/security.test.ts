import { describe, expect, it } from 'vitest';
import { eligibility, hcaAddress, hcaBirthday } from '../../src/lib/server/services/hca.js';
import { parsePr, parseRepo } from '../../src/lib/server/services/github.js';
import { slackMessage } from '../../src/lib/server/notify.js';
import { REQUIRED_ENV, startupProblems } from '../../src/lib/server/startup.js';

describe('hca address', () => {
	it('maps the OIDC address and splits line 2 off', () => {
		expect(
			hcaAddress(
				{
					street_address: '305 Maple Ave\nApt 4B',
					locality: 'Edison',
					region: 'NJ',
					postal_code: '08817',
					country: 'US'
				},
				'Priya Raman'
			)
		).toEqual({
			name: 'Priya Raman',
			line1: '305 Maple Ave',
			line2: 'Apt 4B',
			city: 'Edison',
			state: 'NJ',
			postcode: '08817',
			country: 'United States'
		});
	});

	it('returns null when there is no usable address', () => {
		expect(hcaAddress(undefined, 'x')).toBeNull();
		expect(hcaAddress({ street_address: '1 Road', country: 'CA' }, 'x')).toBeNull();
	});
});

describe('hca birthday', () => {
	it('keeps a plain YYYY-MM-DD date and drops anything else', () => {
		expect(hcaBirthday('2009-04-17')).toBe('2009-04-17');
		expect(hcaBirthday(' 2009-04-17 ')).toBe('2009-04-17');
		expect(hcaBirthday('2009-02-30')).toBeNull();
		expect(hcaBirthday('17/04/2009')).toBeNull();
		expect(hcaBirthday('2009-04-17T00:00:00Z')).toBeNull();
		expect(hcaBirthday(1239926400)).toBeNull();
		expect(hcaBirthday(undefined)).toBeNull();
	});
});

describe('hca eligibility', () => {
	it('needs verified and ysws_eligible true', () => {
		expect(eligibility({ verification_status: 'verified', ysws_eligible: true })).toEqual({
			eligible: true,
			verification: 'verified'
		});
	});

	it('stores verified but not eligible people as ineligible', () => {
		expect(eligibility({ verification_status: 'verified', ysws_eligible: false })).toEqual({
			eligible: false,
			verification: 'verified_but_ineligible'
		});
		expect(eligibility({ verification_status: 'verified' })).toEqual({
			eligible: false,
			verification: 'verified_but_ineligible'
		});
	});

	it('keeps other statuses as they are', () => {
		expect(eligibility({ verification_status: 'pending', ysws_eligible: true })).toEqual({
			eligible: false,
			verification: 'pending'
		});
		expect(eligibility({})).toEqual({ eligible: false, verification: 'unknown' });
	});
});

describe('github links', () => {
	it('parses normal repo and PR links', () => {
		expect(parseRepo('https://github.com/Maya/mossy-notes.git')?.full).toBe('maya/mossy-notes');
		expect(parseRepo('https://github.com/maya/.github')?.full).toBe('maya/.github');
		expect(parsePr('https://github.com/maya/mossy/pull/12')).toMatchObject({
			number: 12,
			repo: { full: 'maya/mossy' }
		});
	});

	it('rejects owner or repo made only of dots', () => {
		expect(parseRepo('https://github.com/maya/..')).toBeNull();
		expect(parseRepo('https://github.com/../x')).toBeNull();
		expect(parseRepo('https://github.com/maya/..git')).toBeNull();
		expect(parsePr('https://github.com/../../pull/1')).toBeNull();
		expect(parsePr('https://github.com/maya/./pull/1')).toBeNull();
	});
});

describe('slack messages', () => {
	it('escapes user text but keeps our own link', () => {
		const msg = slackMessage(
			{
				title: 'Dispute <b>',
				body: 'see <https://evil.example|Open in Hideout> & more',
				link: '/break/fix/3'
			},
			'https://hideout.example'
		);
		expect(msg).toBe(
			'*Dispute &lt;b&gt;*\nsee &lt;https://evil.example|Open in Hideout&gt; &amp; more\n<https://hideout.example/break/fix/3|Open in Hideout>'
		);
	});
});

describe('startup config', () => {
	const full = Object.fromEntries(REQUIRED_ENV.map((name) => [name, 'x']));

	it('passes when every required setting is there', () => {
		expect(startupProblems(full)).toEqual([]);
	});

	it('names every setting on an empty environment', () => {
		expect(startupProblems({})).toEqual([...REQUIRED_ENV]);
	});

	it('names missing and blank settings', () => {
		const env: Record<string, string> = { ...full, SLACK_BOT_TOKEN: ' ', TOKEN_ENCRYPTION_KEY: '' };
		delete env.GITHUB_TOKEN;
		expect(startupProblems(env)).toEqual([
			'TOKEN_ENCRYPTION_KEY',
			'GITHUB_TOKEN',
			'SLACK_BOT_TOKEN'
		]);
	});
});
