<script lang="ts">
	import StaffShell from '#lib/ui/staff/StaffShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<StaffShell role={data.me.role} counts={data.desk}>
	{@render children()}
</StaffShell>
