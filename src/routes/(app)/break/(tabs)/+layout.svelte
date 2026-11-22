<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const tabs = [
		{ href: '/break', label: 'Break in' },
		{ href: '/break/defend', label: 'Defend' }
	];
</script>

<header class="page-head">
	<h1>Break</h1>
</header>

<nav class="tabs" aria-label="Break">
	{#each tabs as t (t.href)}
		<a href={t.href} aria-current={page.url.pathname === t.href ? 'page' : undefined}>{t.label}</a>
	{/each}
</nav>

{@render children()}

<style>
	.tabs {
		display: inline-flex;
		gap: var(--s-1);
		margin-bottom: var(--s-5);
		padding: var(--s-1);
		background: color-mix(in srgb, var(--text) 8%, transparent);
		border-radius: var(--r-1);
	}
	a {
		padding: var(--s-2) var(--s-4);
		border-radius: var(--r-1);
		font: 700 var(--fs-2) / 1.2 var(--font-display);
		color: var(--muted);
		text-decoration: none;
	}
	a:hover {
		color: var(--text);
	}
	a[aria-current] {
		background: var(--band);
		color: var(--on-band);
	}
</style>
