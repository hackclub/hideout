import { describe, expect, it } from 'vitest';
import {
	unifiedFields,
	unifiedFixFields,
	type UnifiedFixInput,
	type UnifiedInput
} from '../../src/lib/game/unified.js';

const input = (over: Partial<UnifiedInput> = {}): UnifiedInput => ({
	appUrl: 'https://hideout.hackclub.com',
	ship: {
		id: 42,
		repoUrl: 'https://github.com/mayabuilds/mossy-notes',
		demoUrl: 'https://mayabuilds.github.io/mossy-notes',
		commitSha: 'abc1234',
		screenshots: ['/uploads/shot.png', 'https://cdn.example.com/b.webp'],
		hackatimeProjects: ['mossy-notes', 'mossy-api'],
		claimedHours: 12.5,
		approvedHours: 12.5,
		reviewNote: 'Nice work.',
		reviewedAt: new Date('2026-11-10T12:00:00Z'),
		createdAt: new Date('2026-11-08T18:00:00Z')
	},
	user: {
		name: 'Maya Lin',
		firstName: null,
		lastName: null,
		email: 'maya@example.com',
		birthday: '2010-04-02',
		githubLogin: 'mayabuilds',
		hackatimeUserId: 'ht-maya',
		address: {
			line1: '12 Oak Lane',
			city: 'Portland',
			state: 'OR',
			postcode: '97201',
			country: 'US'
		}
	},
	project: { description: 'A notes app for the woods.', updateDescription: null },
	season: { name: 'Season 1' },
	round: { number: 2, buildStartsAt: new Date('2026-11-02T00:00:00Z') },
	reviewer: { name: 'Seba' },
	...over
});

const justification = (i: UnifiedInput) =>
	unifiedFields(i)['Optional - Override Hours Spent Justification'] as string;

describe('unified fields', () => {
	it('maps a ship to the submission fields', () => {
		const f = unifiedFields(input());
		expect(f).toMatchObject({
			hideout_ship_id: '42',
			'First Name': 'Maya',
			'Last Name': 'Lin',
			Email: 'maya@example.com',
			Birthday: '2010-04-02',
			'Code URL': 'https://github.com/mayabuilds/mossy-notes',
			'Playable URL': 'https://mayabuilds.github.io/mossy-notes',
			'GitHub Username': 'mayabuilds',
			'Optional - Override Hours Spent': 12.5,
			City: 'Portland'
		});
	});

	it('sends both screenshots, making local ones absolute', () => {
		expect(unifiedFields(input()).Screenshot).toEqual([
			{ url: 'https://hideout.hackclub.com/uploads/shot.png' },
			{ url: 'https://cdn.example.com/b.webp' }
		]);
		const none = input();
		none.ship = { ...none.ship, screenshots: [] };
		expect(unifiedFields(none).Screenshot).toBeUndefined();
	});

	it('prefers HCA names and falls back to splitting the display name', () => {
		const hca = input();
		hca.user = { ...hca.user, name: 'maya', firstName: 'Maya', lastName: 'Lin-Park' };
		expect(unifiedFields(hca)).toMatchObject({ 'First Name': 'Maya', 'Last Name': 'Lin-Park' });
		const split = input();
		split.user = { ...split.user, name: 'Maya Rose Lin' };
		expect(unifiedFields(split)).toMatchObject({ 'First Name': 'Maya', 'Last Name': 'Rose Lin' });
	});

	it('only adds a deflation section when hours were cut', () => {
		expect(justification(input())).not.toContain('[DEFLATION]');
		const cut = input();
		cut.ship = { ...cut.ship, approvedHours: 10, reviewNote: 'One project was mostly config.' };
		const text = justification(cut);
		expect(text).toContain('[DEFLATION]\nCut from 12.5h to 10h (2.5h removed).');
		expect(text).toContain('Reason: One project was mostly config.');
	});

	it('covers hackatime, review and project details', () => {
		const text = justification(input());
		expect(text).toContain('Hackatime user ID: ht-maya');
		expect(text).toContain('Projects: mossy-notes, mossy-api');
		expect(text).toContain('Range: 2026-11-02 to 2026-11-08');
		expect(text).toContain('Reviewed by Seba on 2026-11-10.');
		expect(text).toContain('Review page: https://hideout.hackclub.com/review/ships/42');
		expect(text).toContain('https://github.com/mayabuilds/mossy-notes/tree/abc1234');
		expect(text).toContain('https://github.com/mayabuilds/mossy-notes/commits/abc1234');
		expect(text).toContain('Season 1, round 2.');
		expect(text).not.toContain("What's new");
		expect(unifiedFields(input())['Optional - Override Duplicate Justification']).toBeUndefined();
	});

	it('sends what is new for updates to older projects', () => {
		const update = input({
			project: { description: 'A notes app.', updateDescription: 'Added sync and dark mode.' }
		});
		expect(unifiedFields(update)['Optional - Override Duplicate Justification']).toBe(
			'Added sync and dark mode.'
		);
		const text = justification(update);
		expect(text).toContain("What's new: Added sync and dark mode.");
		expect(text).toContain("only cover time since this round's build start");
	});
});

const fixInput = (over: Partial<UnifiedFixInput> = {}): UnifiedFixInput => ({
	appUrl: 'https://hideout.hackclub.com',
	fix: {
		assignmentId: 7,
		forkUrl: 'https://github.com/mayabuilds/pocket-forge',
		demoUrl: 'https://mayabuilds.github.io/pocket-forge',
		screenshotUrl: '/uploads/fix.png',
		hackatimeProject: 'pocket-forge-fork',
		claimedHours: 4,
		approvedHours: 4,
		reviewNote: null,
		reviewedAt: new Date('2026-11-20T09:00:00Z')
	},
	target: {
		shipId: 9,
		name: 'Pocket Forge',
		repoUrl: 'https://github.com/noahdev/pocket-forge',
		commitSha: 'def5678'
	},
	prs: [
		{
			url: 'https://github.com/noahdev/pocket-forge/pull/3',
			title: 'Fix crash on empty save',
			status: 'merged'
		},
		{
			url: 'https://github.com/noahdev/pocket-forge/pull/5',
			title: 'Escape item names',
			status: 'accepted'
		}
	],
	user: input().user,
	season: { name: 'Season 1' },
	round: {
		number: 2,
		breakStartsAt: new Date('2026-11-16T00:00:00Z'),
		breakEndsAt: new Date('2026-11-23T00:00:00Z')
	},
	reviewer: { name: 'Seba' },
	...over
});

const fixJustification = (i: UnifiedFixInput) =>
	unifiedFixFields(i)['Optional - Override Hours Spent Justification'] as string;

describe('unified fields for shipped fixes', () => {
	it('maps fixes to their own row with the fork, its demo and the raccoon', () => {
		const f = unifiedFixFields(fixInput());
		expect(f).toMatchObject({
			hideout_ship_id: 'fix-7',
			'First Name': 'Maya',
			'Last Name': 'Lin',
			Email: 'maya@example.com',
			Birthday: '2010-04-02',
			City: 'Portland',
			'GitHub Username': 'mayabuilds',
			'Code URL': 'https://github.com/mayabuilds/pocket-forge',
			'Playable URL': 'https://mayabuilds.github.io/pocket-forge',
			Screenshot: [{ url: 'https://hideout.hackclub.com/uploads/fix.png' }],
			'Optional - Override Hours Spent': 4
		});
	});

	it('never shares an id with a build ship', () => {
		const shipId = unifiedFields(input({ ship: { ...input().ship, id: 7 } })).hideout_ship_id;
		expect(unifiedFixFields(fixInput()).hideout_ship_id).not.toBe(shipId);
	});

	it('says which project it fixes, the round and the PR links', () => {
		const d = unifiedFixFields(fixInput()).Description as string;
		expect(d).toContain('Pocket Forge (https://github.com/noahdev/pocket-forge)');
		expect(d).toContain('round 2');
		expect(d).toContain('- https://github.com/noahdev/pocket-forge/pull/3');
		expect(d).toContain('- https://github.com/noahdev/pocket-forge/pull/5');
	});

	it('justifies the hours like a build ship', () => {
		const text = fixJustification(fixInput());
		expect(text).toContain('Hackatime user ID: ht-maya');
		expect(text).toContain('Project: pocket-forge-fork');
		expect(text).toContain('Range: 2026-11-16 to 2026-11-23');
		expect(text).toContain('Claimed 4h, approved 4h.');
		expect(text).toContain('Reviewed by Seba on 2026-11-20.');
		expect(text).toContain('https://hideout.hackclub.com/review/ships/9');
		expect(text).toContain('https://github.com/noahdev/pocket-forge/tree/def5678');
		expect(text).toContain('Fork with the fixes: https://github.com/mayabuilds/pocket-forge');
		expect(text).toContain('- https://github.com/noahdev/pocket-forge/pull/3 (merged)');
		expect(text).not.toContain('[DEFLATION]');
	});

	it('adds a deflation section when hours were cut', () => {
		const cut = fixInput();
		cut.fix = {
			...cut.fix,
			approvedHours: 2.5,
			reviewNote: 'Half of it was setting up the deploy.'
		};
		const text = fixJustification(cut);
		expect(text).toContain('[DEFLATION]\nCut from 4h to 2.5h (1.5h removed).');
		expect(text).toContain('Reason: Half of it was setting up the deploy.');
		expect(unifiedFixFields(cut)['Optional - Override Hours Spent']).toBe(2.5);
	});
});
