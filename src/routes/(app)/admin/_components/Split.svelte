<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		aside,
		sticky = false,
		asideFirst = false,
		children
	}: { aside: Snippet; sticky?: boolean; asideFirst?: boolean; children: Snippet } = $props();
</script>

<div class="split">
	<div class="col">{@render children()}</div>
	<aside class="col" class:sticky class:first={asideFirst}>{@render aside()}</aside>
</div>

<style>
	.split {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
		gap: var(--s-5);
		align-items: start;
	}
	.col {
		display: grid;
		gap: var(--s-5);
		min-width: 0;
	}
	.sticky {
		position: sticky;
		top: var(--s-5);
	}

	@media (max-width: 980px) {
		.split {
			grid-template-columns: minmax(0, 1fr);
		}
		.sticky {
			position: static;
		}
		.first {
			order: -1;
		}
	}
</style>
