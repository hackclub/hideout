<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<dl>{@render children()}</dl>

<style>
	dl {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: var(--s-2) var(--s-4);
		margin: 0;
	}
	dl > :global(dt) {
		color: var(--muted);
		font-weight: 600;
	}
	dl > :global(dd) {
		margin: 0;
		overflow-wrap: anywhere;
	}

	@media (max-width: 520px) {
		dl {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}
		dl > :global(dd + dt) {
			margin-top: var(--s-2);
		}
	}
</style>
