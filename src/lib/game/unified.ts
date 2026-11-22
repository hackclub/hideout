export type UnifiedInput = {
	appUrl: string;
	ship: {
		id: number;
		repoUrl: string;
		demoUrl: string | null;
		commitSha: string;
		screenshotUrl: string | null;
		hackatimeProjects: string[];
		claimedHours: number;
		approvedHours: number | null;
		reviewNote: string | null;
		reviewedAt: Date | null;
		createdAt: Date;
	};
	user: {
		name: string;
		firstName: string | null;
		lastName: string | null;
		email: string;
		birthday: string | null;
		githubLogin: string | null;
		hackatimeUserId: string | null;
		address: {
			line1: string;
			line2?: string;
			city: string;
			state?: string;
			postcode: string;
			country: string;
		} | null;
	};
	project: { description: string };
	season: { name: string };
	round: { number: number; buildStartsAt: Date };
	reviewer: { name: string } | null;
	earlier: { round: number; approvedHours: number }[];
};

const day = (d: Date) => d.toISOString().slice(0, 10);

export function absoluteUrl(url: string, appUrl: string) {
	return /^https?:\/\//i.test(url) ? url : `${appUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function splitName(user: UnifiedInput['user']) {
	const [first, ...rest] = user.name.trim().split(' ');
	return {
		firstName: user.firstName || first || user.name,
		lastName: user.lastName || rest.join(' ')
	};
}

export function justification({
	appUrl,
	ship,
	user,
	season,
	round,
	reviewer,
	earlier
}: UnifiedInput) {
	const approved = ship.approvedHours ?? 0;
	const sections = [
		[
			'[HACKATIME]',
			`Hackatime user ID: ${user.hackatimeUserId ?? 'unknown'}`,
			`Projects: ${ship.hackatimeProjects.join(', ')}`,
			`Range: ${day(round.buildStartsAt)} to ${day(ship.createdAt)} (round build start to ship date)`
		],
		[
			'[REVIEW]',
			`Claimed ${ship.claimedHours}h, approved ${approved}h.`,
			`Reviewed by ${reviewer?.name ?? 'unknown'}${ship.reviewedAt ? ` on ${day(ship.reviewedAt)}` : ''}.`,
			...(ship.reviewNote ? [`Note: ${ship.reviewNote}`] : []),
			`Review page: ${appUrl}/review/ships/${ship.id}`
		]
	];
	if (approved < ship.claimedHours)
		sections.push([
			'[DEFLATION]',
			`Cut from ${ship.claimedHours}h to ${approved}h (${Math.round((ship.claimedHours - approved) * 100) / 100}h removed).`,
			`Reason: ${ship.reviewNote ?? 'no note'}`
		]);
	sections.push([
		'[PROJECT]',
		`${season.name}, round ${round.number}.`,
		`Repo at shipped commit: ${ship.repoUrl}/tree/${ship.commitSha}`,
		`Commit history: ${ship.repoUrl}/commits/${ship.commitSha}`,
		...(earlier.length
			? [
					'Shipped in earlier rounds:',
					...earlier.map((e) => `- Round ${e.round}: ${e.approvedHours}h approved`),
					"These hours only cover time since this round's build start, so nothing is counted twice."
				]
			: [])
	]);
	return sections.map((s) => s.join('\n')).join('\n\n');
}

function userFields(user: UnifiedInput['user']) {
	const { firstName, lastName } = splitName(user);
	return {
		'First Name': firstName,
		'Last Name': lastName,
		Email: user.email,
		Birthday: user.birthday ?? undefined,
		'Address (Line 1)': user.address?.line1,
		'Address (Line 2)': user.address?.line2,
		City: user.address?.city,
		'State / Province': user.address?.state,
		'ZIP / Postal Code': user.address?.postcode,
		Country: user.address?.country,
		'GitHub Username': user.githubLogin ?? ''
	};
}

export function unifiedFields(input: UnifiedInput): Record<string, unknown> {
	const { appUrl, ship, user, project } = input;
	return {
		hideout_ship_id: String(ship.id),
		...userFields(user),
		'Code URL': ship.repoUrl,
		'Playable URL': ship.demoUrl ?? ship.repoUrl,
		Description: project.description,
		Screenshot: ship.screenshotUrl ? [{ url: absoluteUrl(ship.screenshotUrl, appUrl) }] : undefined,
		'Optional - Override Hours Spent': ship.approvedHours ?? 0,
		'Optional - Override Hours Spent Justification': justification(input)
	};
}

export type UnifiedFixInput = {
	appUrl: string;
	fix: {
		assignmentId: number;
		forkUrl: string;
		demoUrl: string;
		screenshotUrl: string | null;
		hackatimeProject: string;
		claimedHours: number;
		approvedHours: number;
		reviewNote: string | null;
		reviewedAt: Date | null;
	};
	target: { shipId: number; name: string; repoUrl: string; commitSha: string };
	prs: { url: string; title: string; status: string }[];
	user: UnifiedInput['user'];
	season: { name: string };
	round: { number: number; breakStartsAt: Date; breakEndsAt: Date };
	reviewer: { name: string } | null;
};

export function fixDescription({ target, prs, season, round }: UnifiedFixInput) {
	return [
		`Bug fixes for ${target.name} (${target.repoUrl}), made in break week of Hideout ${season.name}, round ${round.number}.`,
		'Fix PRs:',
		...prs.map((p) => `- ${p.url}`)
	].join('\n');
}

export function fixJustification({
	appUrl,
	fix,
	target,
	prs,
	user,
	season,
	round,
	reviewer
}: UnifiedFixInput) {
	const sections = [
		[
			'[HACKATIME]',
			`Hackatime user ID: ${user.hackatimeUserId ?? 'unknown'}`,
			`Project: ${fix.hackatimeProject} (one project for this target's fork only)`,
			`Range: ${day(round.breakStartsAt)} to ${day(round.breakEndsAt)} (round break week)`
		],
		[
			'[REVIEW]',
			`Claimed ${fix.claimedHours}h, approved ${fix.approvedHours}h.`,
			`Reviewed by ${reviewer?.name ?? 'unknown'}${fix.reviewedAt ? ` on ${day(fix.reviewedAt)}` : ''}.`,
			...(fix.reviewNote ? [`Note: ${fix.reviewNote}`] : []),
			`Target review page: ${appUrl}/review/ships/${target.shipId}`
		]
	];
	if (fix.approvedHours < fix.claimedHours)
		sections.push([
			'[DEFLATION]',
			`Cut from ${fix.claimedHours}h to ${fix.approvedHours}h (${Math.round((fix.claimedHours - fix.approvedHours) * 100) / 100}h removed).`,
			`Reason: ${fix.reviewNote ?? 'no note'}`
		]);
	sections.push([
		'[FIXES]',
		`${season.name}, round ${round.number}, break week.`,
		`Target: ${target.name}, frozen at ${target.repoUrl}/tree/${target.commitSha}`,
		`Fork with the fixes: ${fix.forkUrl}`,
		`Live demo of the fork: ${fix.demoUrl}`,
		'Fix PRs to the target repo:',
		...prs.map((p) => `- ${p.url} (${p.status})`),
		"These hours are the raccoon's own time on the fork. The target's build hours are on the builder's own row, so nothing is counted twice."
	]);
	return sections.map((s) => s.join('\n')).join('\n\n');
}

export function unifiedFixFields(input: UnifiedFixInput): Record<string, unknown> {
	const { appUrl, fix, user } = input;
	return {
		hideout_ship_id: `fix-${fix.assignmentId}`,
		...userFields(user),
		'Code URL': fix.forkUrl,
		'Playable URL': fix.demoUrl,
		Description: fixDescription(input),
		Screenshot: fix.screenshotUrl ? [{ url: absoluteUrl(fix.screenshotUrl, appUrl) }] : undefined,
		'Optional - Override Hours Spent': fix.approvedHours,
		'Optional - Override Hours Spent Justification': fixJustification(input)
	};
}
