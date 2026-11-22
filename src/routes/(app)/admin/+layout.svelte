<script lang="ts">
	import StaffShell from '#lib/ui/staff/StaffShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<StaffShell role={data.me.role} counts={data.desk}>
	<div class="admin">
		{@render children()}
	</div>
</StaffShell>

<style>
	.admin > :global(* + *) {
		margin-top: var(--s-4);
	}
	.admin > :global(:is(.card, .split, .orders) + *) {
		margin-top: var(--s-5);
	}
	.admin :global(.meta) {
		font-size: var(--fs-1);
		color: var(--muted);
	}
</style>
