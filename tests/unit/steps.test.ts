import { describe, expect, it } from 'vitest';
import { nextSteps, type StepInput } from '../../src/lib/game/steps.js';

const ready: StepInput = {
	phase: 'build',
	hackatime: true,
	github: true,
	ships: [],
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
		expect(keys({ ships: [{ status: 'changes' }] })).toEqual(['changes']);
		expect(keys({ ships: [{ status: 'pending' }] })).toEqual(['review']);
		expect(keys({ ships: [{ status: 'approved' }] })).toEqual(['approved']);
	});

	it('puts changes first when there are several ships', () => {
		const ships = [{ status: 'approved' }, { status: 'pending' }, { status: 'changes' }];
		expect(keys({ ships })).toEqual(['changes']);
		expect(keys({ ships: ships.slice(0, 2) })).toEqual(['review']);
		const [step] = nextSteps({ ...ready, ships: [{ status: 'pending' }, { status: 'pending' }] });
		expect(step.title).toBe('2 of your projects are waiting for review');
	});

	it('asks for a new ship when the only one was rejected', () => {
		expect(keys({ ships: [{ status: 'rejected' }] })).toEqual(['ship']);
	});

	it('sends raccoons to their targets in break week', () => {
		const [step] = nextSteps({ ...ready, phase: 'break', targets: 3 });
		expect(step.title).toBe('You have 3 targets. Send a fix.');
		expect(keys({ phase: 'break', targets: 0 })).toEqual(['no-targets']);
	});

	it('keeps asking for changes in break week and wrap-up, ahead of the targets', () => {
		const ships = [{ status: 'changes' }];
		expect(keys({ phase: 'break', targets: 3, ships })).toEqual(['changes', 'break']);
		expect(keys({ phase: 'scoring', targets: 3, ships })).toEqual(['changes', 'break']);
	});

	it('has something to say before the season starts', () => {
		expect(keys({ phase: null })).toEqual(['none']);
	});
});
