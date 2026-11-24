export const site = {
	name: 'Hideout',
	tagline: 'Build your hideout. Keep Heidi out.',
	madeBy: 'Obay',
	sponsoredBy: 'Seba',
	slackChannel: '#hideout',
	slackUrl: 'https://hackclub.slack.com/archives/C0CFKL2CVMG'
};

export const faq: { q: string; a: string }[] = [
	{
		q: 'Who can join?',
		a: "Anyone aged 13 to 18, and it's free! You'll verify your age with Hack Club when you sign up."
	},
	{
		q: 'What can I build?',
		a: "Any software: web apps, games, bots, CLIs, libraries, browser extensions, desktop apps. We don't support hardware :("
	},
	{
		q: 'How many hours do I need?',
		a: "Each project needs at least 5 hours on Hackatime from that round's build week. You can ship up to 3 a round: if you ship 2, one of them needs 8h+, and if you ship 3, one needs 8h+ and another 15h+."
	},
	{
		q: 'How do I find bugs?',
		a: "Run the project and see what breaks. You can hunt for security bugs too, but only on your own copy, never on someone's live site. When you find something broken, fix it and open a pull request with steps to reproduce and a screenshot or log that shows the bug."
	},
	{
		q: 'What if someone sends me a fix I disagree with?',
		a: 'You get 24 hours to accept or dispute it. No answer counts as accepted. If you dispute, a reviewer decides. Merging the fix yourself halves what the bug costs you, but a dispute the reviewer overturns costs full.'
	}
];

export const rules = {
	intro: 'Something not making sense? Feel free to ask in #hideout on Slack.',
	sections: [
		{
			title: 'Seasons and rounds',
			items: [
				'A season runs for 8 weeks, split into 4 two-week rounds.',
				'Week 1 is Build week. Week 2 is Break week.',
				'You can make a project any time, but you can only ship it during Build week.',
				"Every round's ship is a new project. If it builds on something older, tick the update box and say what's new."
			]
		},
		{
			title: 'Shipping',
			items: [
				'To ship, you need a public GitHub repo, a working demo link, 2 screenshots, and a README that explains your project and how to run it.',
				"Only hours from that round's Build week count, and each Hackatime project can only count for one ship.",
				"Once you ship, your project is frozen at that commit. You can't edit it unless a reviewer asks for changes."
			]
		},
		{
			title: 'Tiers',
			items: [
				'Tier 1: A static page or simple script.',
				'Tier 2: Real features, stored data, and actual app logic.',
				'Tier 3: Logins, a backend, multiplayer, or anything with actual attack surface.',
				'Higher tiers give you more bonus points.'
			]
		},
		{
			title: 'Breaking in',
			items: [
				"During Break week, you'll be assigned 3 other people's projects to break into.",
				"A bug is anything reproducible that crashes, is a security hole, or doesn't work the way it was intended to.",
				'Once you find a bug, open a PR on their repo that fixes it, then submit it here.',
				'To get your break hours, deploy your fork with your fixes and ship it here, one per target.',
				"Only PRs opened during Break week are valid, and PRs that only change docs (like the README) don't count.",
				'You can submit up to 3 fixes per target project each round.',
				'Track your time finding and fixing bugs using Hackatime, make sure to make a new folder for each target.'
			]
		},
		{
			title: 'Severity',
			items: [
				'Minor: Broken mobile layout, dead links, or a typo in a key flow.',
				"Major: Something that doesn't work as intended, like a crash, or data not saving.",
				'Critical: Security holes (leaked user data, XSS, bad password storage), data loss, etc...'
			]
		},
		{
			title: 'Answering fixes',
			items: [
				"Builders have 24 hours to accept or dispute a fix. If you ignore it, it's accepted automatically.",
				'If the builder disputes a fix, a reviewer settles it within 24 hours.'
			]
		},
		{
			title: 'Acorns',
			items: [
				'Every approved hour of building or breaking earns 10 acorns.',
				'Every approved hour logged by anyone also adds 10 acorns to the round bonus pool.',
				'At the end of the round, the pool gets split by points. Your bonus caps at 3x the acorns your hours earned that round.',
				'Leftover acorns roll into the next round.'
			]
		},
		{
			title: 'Points',
			items: [
				'If your fix gets merged, you earn 5 (minor), 15 (major), or 40 (critical) points.',
				'Your own project starts with 0 (Tier 1), 20 (Tier 2), or 40 (Tier 3) points.',
				'Every bug found in your project takes off 2, 6, or 16 points, depending on its severity. Merge the fix yourself and you only lose half the points :)',
				"The Unbreakable bonus: if nobody finds a bug and a reviewer agrees that your project is high-quality, your project's points get multiplied by 1.5x."
			]
		},
		{
			title: 'Final rules...',
			items: [
				"Only break into the projects you were assigned, and only by sending fixes. Don't attack anyone's servers, spam them, etc...",
				"We're allowing AI-made projects as long as they're tracked with Kairos (kairos.hackclub.com). Just keep in mind low-effort submissions will still get rejected.",
				"Don't sneak anything malicious into a PR and don't try to harm anyone.",
				'Planting bugs for friends, using alt accounts, faking hours or gaming Hackatime will get you banned.'
			]
		}
	]
};
