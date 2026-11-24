<script lang="ts">
	import { page } from '$app/state';

	type Counts = {
		ships: number;
		disputes: number;
		checks: number;
		unmerged: number;
		hours: number;
		verdicts: number;
		orders: number;
		unified: number;
	};
	type Link = { href: string; label: string; n?: number; exact?: boolean; alarm?: boolean };

	let { role, counts }: { role: string; counts: Counts } = $props();

	const review: Link[] = $derived([
		{ href: '/review', label: 'Overview', exact: true },
		{ href: '/review/ships', label: 'Ships', n: counts.ships },
		{ href: '/review/disputes', label: 'Disputes', n: counts.disputes },
		{ href: '/review/checks', label: 'Spot checks', n: counts.checks },
		{ href: '/review/unmerged', label: 'Unmerged', n: counts.unmerged },
		{ href: '/review/hours', label: 'Break hours', n: counts.hours },
		{ href: '/review/verdicts', label: 'Verdicts', n: counts.verdicts }
	]);

	const admin: Link[] = $derived([
		{ href: '/admin', label: 'Rounds', exact: true },
		{ href: '/admin/shop', label: 'Shop' },
		{ href: '/admin/orders', label: 'Orders', n: counts.orders },
		{ href: '/admin/users', label: 'Users' },
		{ href: '/admin/audit', label: 'Audit log' },
		{ href: '/admin/unified', label: 'Airtable', n: counts.unified, alarm: true }
	]);

	const here = (l: Link) =>
		l.exact
			? page.url.pathname === l.href
			: page.url.pathname === l.href || page.url.pathname.startsWith(`${l.href}/`);
</script>

{#snippet group(title: string | null, links: Link[])}
	<div class="group">
		{#if title}<span class="title">{title}</span>{/if}
		<div class="links">
			{#each links as l (l.href)}
				<a href={l.href} aria-current={here(l) ? 'page' : undefined}>
					{l.label}
					{#if l.n}<span class="n" class:alarm={l.alarm}>{l.n}</span>{/if}
				</a>
			{/each}
		</div>
	</div>
{/snippet}

<nav class="desk" aria-label="Staff">
	{#if role === 'admin'}
		{@render group('Review', review)}
		{@render group('Admin', admin)}
	{:else}
		{@render group(null, review)}
	{/if}
</nav>

<style>
	.desk {
		margin-bottom: var(--s-5);
	}
	.group {
		display: flex;
		align-items: center;
		gap: var(--s-3);
		min-width: 0;
	}
	.group + .group {
		margin-top: var(--s-1);
		padding-top: var(--s-1);
		border-top: 1px solid var(--line);
	}
	.title {
		flex: none;
		width: 64px;
		font-size: var(--fs-1);
		font-weight: 600;
		color: var(--muted);
	}
	.links {
		display: flex;
		gap: var(--s-1);
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}
	a {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		padding: var(--s-1) var(--s-3);
		border-radius: var(--r-1);
		font: 700 var(--fs-2) / 24px var(--font-display);
		color: var(--muted);
		text-decoration: none;
		white-space: nowrap;
	}
	a:hover {
		color: var(--text);
	}
	a[aria-current='page'] {
		background: var(--band);
		color: var(--on-band);
	}
	.n {
		min-width: 20px;
		padding: 0 var(--s-1);
		border-radius: var(--r-round);
		background: color-mix(in srgb, var(--text) 10%, transparent);
		color: var(--text);
		font: 700 var(--fs-1) / 20px var(--font-body);
		text-align: center;
	}
	[aria-current='page'] .n {
		background: var(--on-band);
		color: var(--band);
	}
	.n.alarm {
		background: var(--danger);
		color: #fff;
	}
	@media (max-width: 760px) {
		.group {
			display: block;
		}
		.title {
			display: block;
			width: auto;
			padding-top: var(--s-1);
		}
	}
</style>
