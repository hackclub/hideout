<script lang="ts">
	import { page } from '$app/state';
	let { user }: { user: { name: string } | null } = $props();
	const links = [
		{ href: '/rules', label: 'How it works' },
		{ href: '/leaderboard', label: 'Leaderboard' }
	];
</script>

<header class="site-header wrap">
	<a class="brand" href="/">
		<img src="/leaf-28.png" srcset="/leaf-56.png 2x" width="28" height="28" alt="" />
		Hideout
	</a>
	<nav aria-label="Main">
		{#each links as l (l.href)}
			<a href={l.href} aria-current={page.url.pathname === l.href ? 'page' : undefined}>
				{l.label}
			</a>
		{/each}
		{#if user}
			<a class="btn small" href="/home">Open Hideout</a>
		{:else}
			<a class="btn small" href="/login">Sign in</a>
		{/if}
	</nav>
</header>

<style>
	.site-header {
		position: relative;
		z-index: 5;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-3) var(--s-5);
		padding: var(--s-4) 0;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		font: 800 var(--fs-4) / 1 var(--font-display);
		color: var(--text);
		text-decoration: none;
	}
	.brand img {
		width: 28px;
		height: 28px;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--s-2) var(--s-5);
	}
	nav a:not(.btn) {
		font: 700 var(--fs-2) / 1.2 var(--font-display);
		color: var(--muted);
		text-decoration: none;
	}
	nav a:not(.btn):hover,
	nav a[aria-current='page'] {
		color: var(--text);
	}

	@media (max-width: 760px) {
		nav {
			gap: var(--s-2) var(--s-4);
		}
	}
</style>
