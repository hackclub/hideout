<script lang="ts" module>
	const paths = {
		home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9.5h11V10"/><path d="M10.5 19.5v-5h3v5"/>',
		project:
			'<rect x="3.5" y="8.5" width="17" height="11" rx="2"/><path d="M9 8.5V6.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6.5v2"/><path d="M3.5 13.5h17"/>',
		break:
			'<path d="M9.5 7.5a2.5 2.5 0 0 1 5 0"/><path d="M7.5 10h9v4a4.5 4.5 0 0 1-9 0z"/><path d="M12 10v8.5M3.5 13h4M16.5 13h4M5 8l2.5 2M19 8l-2.5 2M5 18.5l2.6-2M19 18.5l-2.6-2"/>',
		shop: '<path d="M5 8.5h14l-1.2 11H6.2z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
		review: '<path d="M5 4.5h14v15H5z"/><path d="M8.5 9.5l2 2 4-4M8.5 15h7"/>',
		admin:
			'<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2 18 18M6 18l1.8-1.8M16.2 7.8 18 6"/>',
		settings:
			'<path d="M4 7h9M18 7h2M4 17h3M11 17h9"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="8.5" cy="17" r="2.3"/>',
		logout: '<path d="M10 4.5H5.5v15H10"/><path d="M14.5 8 18.5 12l-4 4M18.5 12H9.5"/>',
		'sidebar-open':
			'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/><path d="m13.5 10 2 2-2 2"/>',
		'sidebar-close':
			'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/><path d="m16 10-2 2 2 2"/>',
		arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
		check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
		bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'
	};
	export type IconName = keyof typeof paths;
</script>

<script lang="ts">
	let { name, size = 24 }: { name: IconName; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2.2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{@html paths[name]}
</svg>

<style>
	svg {
		display: block;
		flex: none;
	}
</style>
