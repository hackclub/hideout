<script lang="ts">
	import type { Snippet } from 'svelte';

	let { small = false, children }: { small?: boolean; children: Snippet } = $props();
</script>

<div class="table-scroll">
	<table class="table" class:small>{@render children()}</table>
</div>

<style>
	.small {
		font-size: var(--fs-1);
	}
	.small :global(th) {
		font-size: var(--fs-1);
	}
	table :global(th) {
		white-space: nowrap;
	}
	table :global(tr:last-child td) {
		border-bottom: 0;
	}
	table :global(.n) {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	table :global(.nowrap) {
		white-space: nowrap;
	}
	table :global(tr.dim td) {
		opacity: 0.55;
	}
	table :global(td form) {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2);
	}
</style>
