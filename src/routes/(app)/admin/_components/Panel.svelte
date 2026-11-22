<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		note,
		id,
		danger = false,
		actions,
		children
	}: {
		title?: string;
		note?: string;
		id?: string;
		danger?: boolean;
		actions?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<section class="card panel" class:danger {id}>
	{#if title || actions}
		<div class="top">
			{#if title}<h2>{title}</h2>{/if}
			{#if actions}<div class="row">{@render actions()}</div>{/if}
		</div>
	{/if}
	{#if note}<p class="lead">{note}</p>{/if}
	{@render children?.()}
</section>

<style>
	section.panel {
		min-width: 0;
		scroll-margin-top: var(--s-5);
	}
	.danger h2 {
		color: var(--bad-ink);
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-2) var(--s-3);
		margin-bottom: var(--s-3);
	}
	.panel h2 {
		margin: 0;
		font-size: var(--fs-3);
	}
	.lead {
		margin: calc(-1 * var(--s-2)) 0 var(--s-4);
		font-size: var(--fs-1);
		color: var(--muted);
	}
	.panel > :global(:last-child) {
		margin-bottom: 0;
	}
</style>
