<script lang="ts">
	import { onMount } from 'svelte';

	let { to, offset = 0 }: { to: Date | string; offset?: number } = $props();
	let clientNow = $state(Date.now());

	onMount(() => {
		const id = setInterval(() => (clientNow = Date.now()), 30e3);
		return () => clearInterval(id);
	});

	const text = $derived.by(() => {
		const ms = new Date(to).getTime() - (clientNow + offset);
		if (ms <= 0) return 'now';
		const m = Math.floor(ms / 60e3);
		const d = Math.floor(m / 1440);
		const h = Math.floor((m % 1440) / 60);
		const mm = m % 60;
		if (d > 0) return `${d}d ${h}h`;
		if (h > 0) return `${h}h ${mm}m`;
		return `${mm}m`;
	});

	const local = $derived(
		new Date(to).toLocaleString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		})
	);
</script>

<time datetime={new Date(to).toISOString()} title={local}>{text}</time>
