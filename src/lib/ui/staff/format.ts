export function hrs(n: number | null | undefined) {
	if (n === null || n === undefined) return '-';
	return `${Math.round(n * 100) / 100} h`;
}

export function num(n: number | null | undefined, digits = 2) {
	if (n === null || n === undefined) return '-';
	const f = 10 ** digits;
	return (Math.round(n * f) / f).toLocaleString('en-US');
}

export function utc(d: Date | string | null | undefined) {
	if (!d) return '-';
	return (
		new Date(d).toLocaleString('en-GB', {
			timeZone: 'UTC',
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}) + ' UTC'
	);
}

export function utcInput(d: Date | string | null | undefined) {
	if (!d) return '';
	return new Date(d).toISOString().slice(0, 16);
}

export function age(from: Date | string, to: Date | string) {
	const ms = new Date(to).getTime() - new Date(from).getTime();
	if (ms < 60e3) return 'under a minute';
	const m = Math.floor(ms / 60e3);
	const d = Math.floor(m / 1440);
	const h = Math.floor((m % 1440) / 60);
	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m % 60}m`;
	return `${m}m`;
}

export function shortSha(sha: string) {
	return sha.slice(0, 7);
}

export function prRef(url: string) {
	return url.replace(/^https?:\/\/github\.com\//, '').replace('/pull/', '#');
}

export function repoName(url: string) {
	return url.replace(/^https?:\/\/github\.com\//, '');
}

export const severities = ['minor', 'major', 'critical'] as const;

export const disputeKind: Record<string, string> = {
	not_a_bug: "It's not a bug",
	duplicate: 'Already reported',
	severity: 'Severity too high',
	other: 'Something else'
};
