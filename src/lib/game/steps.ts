import type { Phase } from './phase.js';

export type StepInput = {
	phase: Phase | null;
	hackatime: boolean;
	github: boolean;
	ship: { status: string } | null;
	targets: number;
	waiting: number;
};

export type Step = {
	key:
		| 'answer'
		| 'hackatime'
		| 'github'
		| 'ship'
		| 'changes'
		| 'review'
		| 'approved'
		| 'break'
		| 'no-targets'
		| 'counting'
		| 'none';
	title: string;
	help: string;
	action?: { label: string; href: string };
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function nextSteps(s: StepInput): Step[] {
	const steps: Step[] = [];

	if (s.waiting > 0)
		steps.push({
			key: 'answer',
			title: `Answer ${plural(s.waiting, 'fix', 'fixes')} on your project`,
			help: 'Raccoons sent fixes to your project. Accept or dispute each one within 24 hours :)',
			action: { label: 'Answer fixes', href: '/break/defend' }
		});
	if (!s.hackatime)
		steps.push({
			key: 'hackatime',
			title: 'Connect Hackatime',
			help: 'You need Hackatime to track your hours!',
			action: { label: 'Connect', href: '/settings' }
		});
	if (!s.github)
		steps.push({
			key: 'github',
			title: 'Link your GitHub account',
			help: 'We use it to check your project and the fixes you send.',
			action: { label: 'Link GitHub', href: '/settings' }
		});

	switch (s.phase) {
		case 'upcoming':
		case 'build':
			if (!s.ship)
				steps.push({
					key: 'ship',
					title: 'Build something and ship it',
					help: 'Ship your project before build week ends. Next week, raccoons will try to break it.',
					action: { label: 'Go to your project', href: '/projects' }
				});
			else if (s.ship.status === 'changes')
				steps.push({
					key: 'changes',
					title: 'Your project needs changes',
					help: 'A reviewer asked for a few changes. Make them and ship your project.',
					action: { label: 'See what to change', href: '/projects' }
				});
			else if (s.ship.status === 'pending')
				steps.push({
					key: 'review',
					title: 'Your project is waiting for review',
					help: 'A reviewer will look at it soon. Keep building in the meantime.'
				});
			else
				steps.push({
					key: 'approved',
					title: 'Your project is approved',
					help: 'Break week starts after build week. Get ready to break into other projects.'
				});
			break;
		case 'break':
		case 'scoring':
			if (s.targets > 0)
				steps.push({
					key: 'break',
					title: `You have ${plural(s.targets, 'target', 'targets')}. Send a fix.`,
					help: 'Find something broken in one of these projects and open a pull request that fixes it. Then deploy your fork and ship your fixes :)',
					action: { label: 'Send a fix', href: '/break' }
				});
			else
				steps.push({
					key: 'no-targets',
					title: 'No targets this round',
					help: "You didn't ship any project this round. You can still join in the next round."
				});
			break;
		case 'ready':
		case 'closed':
			steps.push({
				key: 'counting',
				title: 'Acorns are being counted',
				help: 'The round is over. You will get your bonus once all projects are reviewed!'
			});
			break;
		default:
			steps.push({
				key: 'none',
				title: 'Nothing running yet',
				help: 'The season has not started. Check back soon.'
			});
	}
	return steps;
}
