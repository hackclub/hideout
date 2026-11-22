<script lang="ts">
	import type { Snippet } from 'svelte';

	let { min = '180px', children }: { min?: string; children: Snippet } = $props();
</script>

<div class="fields" style:--min={min}>{@render children()}</div>

<style>
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(var(--min), 100%), 1fr));
		gap: var(--s-3);
		align-items: end;
	}
	.fields > :global(.field + .field) {
		margin-top: 0;
	}
</style>
