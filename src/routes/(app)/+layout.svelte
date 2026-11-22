<script lang="ts">
	import Scene from '#lib/ui/Scene.svelte';
	import Sidebar from '#lib/ui/shell/Sidebar.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	let closed = $derived(data.sidebarClosed);
	function toggleSidebar() {
		closed = !closed;
		document.cookie = `sidebar=${closed ? 'closed' : 'open'}; path=/; max-age=31536000; samesite=lax`;
	}
</script>

<Scene tabbar>
	<a class="skip" href="#main">Skip to content</a>
	<div class="app" class:closed>
		<Sidebar
			me={data.me}
			balance={data.wallet.acorns}
			unread={data.unread}
			round={data.round}
			now={data.now}
			{closed}
			ontoggle={toggleSidebar}
		/>
		<main id="main">
			{@render children()}
		</main>
	</div>
</Scene>

<style>
	.skip {
		position: absolute;
		left: -999px;
	}
	.skip:focus {
		left: var(--s-4);
		top: var(--s-4);
		z-index: 50;
		padding: var(--s-2) var(--s-4);
		background: var(--surface);
	}
	.app {
		flex: 1;
		display: grid;
		grid-template-columns: 272px minmax(0, 1fr);
		column-gap: var(--s-7);
		padding: 0 var(--s-5);
	}
	.closed {
		grid-template-columns: 88px minmax(0, 1fr);
	}
	main {
		min-width: 0;
		max-width: 960px;
		padding: var(--s-5) 0 var(--s-7);
	}

	@media (max-width: 760px) {
		.app {
			display: block;
			padding: var(--s-4) var(--s-4) 0;
		}
		main {
			padding: 0 0 var(--s-8);
		}
	}
</style>
