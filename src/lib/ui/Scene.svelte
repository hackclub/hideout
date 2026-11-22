<script lang="ts">
	import type { Snippet } from 'svelte';
	import Footer from './Footer.svelte';

	let {
		children,
		grass = true,
		tabbar = false
	}: { children: Snippet; grass?: boolean; tabbar?: boolean } = $props();
</script>

<div class="world" class:tabbar>
	{@render children()}
	{#if grass}<div class="meadow" aria-hidden="true"></div>{/if}
	<Footer />
</div>

<style>
	.world {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background:
			url('/textures/sky.webp') center top / cover no-repeat fixed,
			var(--sky);
	}
	.meadow {
		height: 240px;
		margin-top: calc(var(--s-8) * -1);
		background: url('/textures/grass.webp') 0 100% / auto 100% repeat-x;
		pointer-events: none;
	}

	@media (max-width: 760px) {
		.world {
			background-attachment: scroll;
		}
		.tabbar {
			--footer-bottom: calc(var(--s-8) + var(--s-7));
		}
		.meadow {
			height: 160px;
		}
	}
</style>
