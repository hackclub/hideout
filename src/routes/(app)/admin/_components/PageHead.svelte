<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		back,
		children,
		actions
	}: {
		title: string;
		back?: { href: string; label: string };
		children?: Snippet;
		actions?: Snippet;
	} = $props();
</script>

<svelte:head><title>{title} · Admin</title></svelte:head>

<header class="page-head">
	<div class="text">
		{#if back}<a class="back" href={back.href}>{back.label}</a>{/if}
		<h1>{title}</h1>
		{#if children}<p>{@render children()}</p>{/if}
	</div>
	{#if actions}<div class="row">{@render actions()}</div>{/if}
</header>

<style>
	header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--s-3) var(--s-4);
	}
	.text {
		min-width: 0;
	}
</style>
