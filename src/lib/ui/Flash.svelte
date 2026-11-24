<script lang="ts">
	let { form }: { form: { ok?: boolean; message?: string | null } | null | undefined } = $props();

	let el = $state<HTMLElement>();

	$effect(() => {
		if (form?.message) el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	});
</script>

{#if form?.message}
	<div
		bind:this={el}
		class="flash"
		class:bad={form.ok === false}
		role={form.ok === false ? 'alert' : 'status'}
	>
		{form.message}
	</div>
{/if}

<style>
	.flash {
		margin-bottom: var(--s-4);
		padding: var(--s-3) var(--s-4);
		border-radius: var(--r-1);
		background: var(--ok-tint);
		color: var(--ok-ink);
		font-weight: 600;
	}
	.bad {
		background: var(--bad-tint);
		color: var(--bad-ink);
	}
</style>
