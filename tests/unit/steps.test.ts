import { describe, expect, it } from 'vitest';
import { nextSteps, type StepInput } from '../../src/lib/game/steps.js';

const ready: StepInput = {
	phase: 'build',
	hackatime: true,
	github: true,
	ship: null,
	targets: 0,
	waiting: 0
};

const keys = (s: Partial<StepInput>) => nextSteps({ ...ready, ...s }).map((x) => x.key);

describe('next steps', () => {
	it('leads with answering fixes, since they expire in 24h', () => {
		expect(keys({ waiting: 2, hackatime: false })).toEqual(['answer', 'hackatime', 'ship']);
	});

	it('asks for setup before the round work', () => {
		expect(keys({ hackatime: false, github: false })).toEqual(['hackatime', 'github', 'ship']);
	});

	it('follows the ship through review', () => {
		expect(keys({ ship: { status: 'changes' } })).toEqual(['changes']);
		expect(keys({ ship: { status: 'pending' } })).toEqual(['review']);
		expect(keys({ ship: { status: 'approved' } })).toEqual(['approved']);
	});

	it('sends raccoons to their targets in break week', () => {
		const [step] = nextSteps({ ...ready, phase: 'break', targets: 3 });
		expect(step.title).toBe('You have 3 targets. Send a fix.');
		expect(keys({ phase: 'break', targets: 0 })).toEqual(['no-targets']);
	});

	it('has something to say before the season starts', () => {
		expect(keys({ phase: null })).toEqual(['none']);
	});
});
