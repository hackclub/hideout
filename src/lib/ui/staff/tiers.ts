export const tiers = [
	{ n: 1, title: 'Tier 1', blurb: 'A static page or a simple script.' },
	{ n: 2, title: 'Tier 2', blurb: 'Real features, stored data, logic.' },
	{
		n: 3,
		title: 'Tier 3',
		blurb: 'Logins, a backend, multiplayer, anything with real attack surface.'
	}
];

export const verdicts = {
	attacked: { label: 'Unbreakable' },
	too_simple: { label: 'Too simple' },
	not_attacked: { label: 'Not attacked' },
	unrunnable: { label: "Couldn't run" }
} as const;
