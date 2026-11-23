import type { Phase } from './phase.js';

export type StepInput = {
	phase: Phase | null;
	hackatime: boolean;
	github: boolean;
	ships: { status: string }[];
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
	const count = (status: string) => s.ships.filter((x) => x.status === status).length;

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
			if (count('changes'))
				steps.push({
					key: 'changes',
					title:
						count('changes') === 1
							? 'Your project needs changes'
							: `${count('changes')} of your projects need changes`,
					help: 'A reviewer asked for a few changes. Make them and ship it again.',
					action: { label: 'See what to change', href: '/projects' }
				});
			else if (count('pending'))
				steps.push({
					key: 'review',
					title:
						count('pending') === 1
							? 'Your project is waiting for review'
							: `${count('pending')} of your projects are waiting for review`,
					help: 'A reviewer will look at it soon. Keep building in the meantime.'
				});
			else if (count('approved'))
				steps.push({
					key: 'approved',
					title:
						count('approved') === 1
							? 'Your project is approved'
							: `${count('approved')} of your projects are approved`,
					help: 'Break week starts after build week. Get ready to break into other projects.'
				});
			else
				steps.push({
					key: 'ship',
					title: 'Build something and ship it',
					help: 'Make a project and ship it before build week ends. Next week, raccoons will try to break it.',
					action: { label: 'Go to your projects', href: '/projects' }
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
