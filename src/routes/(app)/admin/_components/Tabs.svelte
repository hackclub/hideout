<script lang="ts">
	type Tab = { href: string; label: string; n?: number; current: boolean };
	let { items, label }: { items: Tab[]; label: string } = $props();
</script>

<nav aria-label={label}>
	{#each items as t (t.href)}
		<a href={t.href} aria-current={t.current ? 'page' : undefined}>
			{t.label}
			{#if t.n !== undefined}<span>{t.n}</span>{/if}
		</a>
	{/each}
</nav>

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2);
	}
	a {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		padding: var(--s-1) var(--s-3);
		font-weight: 600;
		color: var(--text);
		text-decoration: none;
		border: 1px solid var(--line);
		border-radius: var(--r-round);
	}
	a:hover {
		background: color-mix(in srgb, var(--text) 8%, transparent);
	}
	a[aria-current='page'] {
		color: var(--on-band);
		background: var(--band);
		border-color: var(--band);
	}
	span {
		font-size: var(--fs-1);
		opacity: 0.75;
	}
</style>
