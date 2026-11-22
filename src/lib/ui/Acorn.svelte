<script lang="ts">
	let { size = 18, title = 'acorns' }: { size?: number; title?: string } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={title} class="acorn">
	<path
		d="M12 3.2c.4-1 1.3-1.6 2.3-1.7"
		fill="none"
		stroke="#4e301b"
		stroke-width="1.8"
		stroke-linecap="round"
	/>
	<path
		d="M4 9.6C4 6.4 7.6 4 12 4s8 2.4 8 5.6c0 .8-.6 1.4-1.4 1.4H5.4C4.6 11 4 10.4 4 9.6Z"
		fill="#7a4e2d"
	/>
	<path d="M5.6 11h12.8c0 5.2-2.8 9.8-6.4 10.8C8.4 20.8 5.6 16.2 5.6 11Z" fill="#c9772f" />
	<path
		d="M8 12.6c.3 2.8 1.5 5.2 3.2 6.4"
		fill="none"
		stroke="#e9a35e"
		stroke-width="1.4"
		stroke-linecap="round"
	/>
</svg>

<style>
	.acorn {
		display: inline-block;
		vertical-align: -0.18em;
		flex: none;
	}
</style>
