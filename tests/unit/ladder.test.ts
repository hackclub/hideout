import { describe, expect, it } from 'vitest';
import {
	fitsLadder,
	ladderProblem,
	minHoursNext,
	ordinal,
	sharedHackatime
} from '../../src/lib/game/ladder.js';

const ladder = [5, 8, 15];

describe('ship hours ladder', () => {
	it('needs 5h for a first ship', () => {
		expect(ladderProblem(ladder, [], 5)).toBeNull();
		expect(ladderProblem(ladder, [], 4.9)).toBe(
			'Your 1st project this round needs at least 5 hours. This one has 4.9h.'
		);
	});

	it('needs 8h for a 2nd and 15h for a 3rd', () => {
		expect(ladderProblem(ladder, [6], 7)).toBe(
			'Your 2nd project this round needs at least 8 hours. This one has 7h.'
		);
		expect(ladderProblem(ladder, [6], 8)).toBeNull();
		expect(ladderProblem(ladder, [6, 9], 14)).toBe(
			'Your 3rd project this round needs at least 15 hours. This one has 14h.'
		);
		expect(ladderProblem(ladder, [6, 9], 15)).toBeNull();
	});

	it("doesn't care about the order you ship in", () => {
		expect(ladderProblem(ladder, [20], 6)).toBeNull();
		expect(ladderProblem(ladder, [20, 9], 5)).toBeNull();
		expect(fitsLadder(ladder, [16, 5, 8])).toBe(true);
		expect(fitsLadder(ladder, [16, 5, 7])).toBe(false);
	});

	it('asks for what the new ship needs, given the others', () => {
		expect(minHoursNext(ladder, [])).toBe(5);
		expect(minHoursNext(ladder, [20])).toBe(5);
		expect(minHoursNext(ladder, [6])).toBe(8);
		expect(minHoursNext(ladder, [5, 8])).toBe(15);
		expect(ladderProblem(ladder, [5, 8], 10)).toBe(
			'Your 3rd project this round needs at least 15 hours. This one has 10h.'
		);
	});

	it('caps ships at the ladder length', () => {
		expect(minHoursNext(ladder, [20, 20, 20])).toBeNull();
		expect(ladderProblem(ladder, [20, 20, 20], 50)).toBe('You can ship up to 3 projects a round.');
		expect(ladderProblem([5], [6], 50)).toBe('You can ship up to 1 project a round.');
	});

	it('sorts the ladder itself', () => {
		expect(fitsLadder([15, 5, 8], [5, 8])).toBe(true);
		expect(ladderProblem([15, 5, 8], [6], 7)).toContain('needs at least 8 hours');
	});

	it('says so when the other ships no longer fit', () => {
		expect(ladderProblem([10, 20], [6], 50)).toBe(
			"Your other projects this round don't fit the hour rules anymore. Ask in #hideout."
		);
	});

	it('writes ordinals', () => {
		expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
			'1st',
			'2nd',
			'3rd',
			'4th',
			'11th',
			'12th',
			'13th',
			'21st',
			'22nd'
		]);
	});
});

describe('hackatime projects across ships', () => {
	it('finds names already used by another ship this round', () => {
		expect(sharedHackatime([['mossy'], ['acorn-api', 'acorn-web']], ['acorn-web', 'new'])).toEqual([
			'acorn-web'
		]);
		expect(sharedHackatime([], ['a'])).toEqual([]);
		expect(sharedHackatime([['a']], ['b'])).toEqual([]);
	});
});
