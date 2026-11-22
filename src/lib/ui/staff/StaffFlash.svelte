<script lang="ts">
	import Flash from '#lib/ui/Flash.svelte';

	let { form }: { form: { ok?: boolean; message?: string | null } | null | undefined } = $props();
	let closed = $state.raw<unknown>(null);
	const open = $derived(Boolean(form?.message) && closed !== form);
</script>

{#if open}
	<div class="dock">
		<Flash {form} />
		<button type="button" class="x" onclick={() => (closed = form)} aria-label="Hide message">
			Hide
		</button>
	</div>
{/if}

<style>
	.dock {
		position: sticky;
		top: var(--s-4);
		z-index: 15;
		display: flex;
		gap: var(--s-2);
		margin-bottom: var(--s-4);
	}
	.dock :global(.flash) {
		flex: 1;
		margin: 0;
		box-shadow: var(--halo);
	}
	.x {
		flex: none;
		padding: 0 var(--s-3);
		font: 600 var(--fs-1) / 1 var(--font-body);
		color: var(--muted);
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--r-1);
		cursor: pointer;
	}
	.x:hover {
		color: var(--text);
	}
</style>
