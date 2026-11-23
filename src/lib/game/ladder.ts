export function ordinal(n: number) {
	const teen = n % 100 >= 11 && n % 100 <= 13;
	return `${n}${teen ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;
}

export function fitsLadder(ladder: number[], hours: number[]) {
	if (hours.length > ladder.length) return false;
	const steps = [...ladder].sort((a, b) => a - b);
	return [...hours].sort((a, b) => a - b).every((h, i) => h >= steps[i]);
}

export function minHoursNext(ladder: number[], others: number[]) {
	if (others.length >= ladder.length) return null;
	const options = [0, ...ladder].sort((a, b) => a - b);
	return options.find((h) => fitsLadder(ladder, [...others, h])) ?? null;
}

export function ladderProblem(ladder: number[], others: number[], hours: number) {
	if (others.length >= ladder.length)
		return `You can ship up to ${ladder.length} ${ladder.length === 1 ? 'project' : 'projects'} a round.`;
	if (fitsLadder(ladder, [...others, hours])) return null;
	const need = minHoursNext(ladder, others);
	if (need === null)
		return "Your other projects this round don't fit the hour rules anymore. Ask in #hideout.";
	return `Your ${ordinal(others.length + 1)} project this round needs at least ${need} hours. This one has ${hours}h.`;
}

export function sharedHackatime(others: string[][], picked: string[]) {
	const used = new Set(others.flat());
	return picked.filter((p) => used.has(p));
}
