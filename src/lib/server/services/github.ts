import { config } from '../config.js';

export type RepoRef = { owner: string; repo: string; full: string };

export type PullRequest = {
	number: number;
	title: string;
	author: string;
	baseRepo: string;
	state: 'open' | 'closed';
	merged: boolean;
	mergedAt: Date | null;
	mergedBy: string | null;
	createdAt: Date | null;
	url: string;
};

const onlyDots = (segment: string) => /^\.+$/.test(segment);

export function parseRepo(url: string): RepoRef | null {
	const m = url.trim().match(/^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
	if (!m || onlyDots(m[1]) || onlyDots(m[2])) return null;
	return { owner: m[1], repo: m[2], full: `${m[1]}/${m[2]}`.toLowerCase() };
}

export function parsePr(url: string): { repo: RepoRef; number: number } | null {
	const m = url.trim().match(/^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)\/?$/i);
	if (!m || onlyDots(m[1]) || onlyDots(m[2])) return null;
	return {
		repo: { owner: m[1], repo: m[2], full: `${m[1]}/${m[2]}`.toLowerCase() },
		number: Number(m[3])
	};
}

async function gh(path: string) {
	const res = await fetch(`https://api.github.com${path}`, {
		headers: {
			accept: 'application/vnd.github+json',
			'user-agent': 'hideout-ysws',
			...(config.github.token ? { authorization: `Bearer ${config.github.token}` } : {})
		},
		signal: AbortSignal.timeout(10_000)
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`GitHub ${path} failed: ${res.status}`);
	return res.json();
}

export async function headSha(repo: RepoRef): Promise<string | null> {
	const info = await gh(`/repos/${repo.full}`);
	if (!info) return null;
	const branch = await gh(`/repos/${repo.full}/branches/${info.default_branch}`);
	return branch?.commit?.sha ?? null;
}

export async function forkOf(
	repo: RepoRef,
	upstream: RepoRef
): Promise<{ owner: string; isFork: boolean } | null> {
	const info = await gh(`/repos/${repo.full}`);
	if (!info) return null;
	const parents = [info.parent?.full_name, info.source?.full_name].map((n) =>
		String(n ?? '').toLowerCase()
	);
	return {
		owner: String(info.owner?.login ?? '').toLowerCase(),
		isFork: Boolean(info.fork) && parents.includes(upstream.full)
	};
}

export async function getPr(repo: RepoRef, number: number): Promise<PullRequest | null> {
	const url = `https://github.com/${repo.full}/pull/${number}`;
	const pr = await gh(`/repos/${repo.full}/pulls/${number}`);
	if (!pr) return null;
	return {
		number,
		title: pr.title,
		author: String(pr.user?.login ?? '').toLowerCase(),
		baseRepo: String(pr.base?.repo?.full_name ?? '').toLowerCase(),
		state: pr.state,
		merged: Boolean(pr.merged),
		mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
		mergedBy: pr.merged_by?.login ?? null,
		createdAt: pr.created_at ? new Date(pr.created_at) : null,
		url
	};
}

export async function prFiles(repo: RepoRef, number: number): Promise<string[]> {
	const files = (await gh(`/repos/${repo.full}/pulls/${number}/files?per_page=100`)) as
		{ filename: string }[] | null;
	return (files ?? []).map((f) => f.filename);
}

const RISKY = [
	/^\.github\//,
	/(^|\/)package(-lock)?\.json$/,
	/(^|\/)(pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/,
	/(^|\/)(requirements.*\.txt|pyproject\.toml|poetry\.lock|Pipfile(\.lock)?)$/,
	/(^|\/)(Gemfile(\.lock)?|go\.(mod|sum)|Cargo\.(toml|lock)|composer\.(json|lock))$/,
	/(^|\/)(Dockerfile|docker-compose\.ya?ml|Makefile)$/,
	/\.(sh|ps1|bat)$/,
	/(^|\/)(postinstall|preinstall|setup\.py)/
];

export function riskyFiles(files: string[]) {
	return files.filter((f) => RISKY.some((r) => r.test(f)));
}

export function onlyTrivialFiles(files: string[]) {
	return files.length > 0 && files.every((f) => /(\.(md|txt|rst)$|^docs\/|(^|\/)LICENSE)/i.test(f));
}
