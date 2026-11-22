<script lang="ts">
	import SiteHeader from '#lib/ui/SiteHeader.svelte';
	import Scene from '#lib/ui/Scene.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<Scene>
	<SiteHeader user={data.user} />
	<main>
		{@render children()}
	</main>
</Scene>

<style>
	main {
		flex: 1;
	}
</style>
