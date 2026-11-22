<script lang="ts">
	import Acorn from '#lib/ui/Acorn.svelte';

	type Stat = { label: string; value: string | number; acorns?: boolean; tone?: 'bad' };
	let { items }: { items: Stat[] } = $props();
</script>

<dl>
	{#each items as s (s.label)}
		<div>
			<dt>{s.label}</dt>
			<dd class:bad={s.tone === 'bad'}>
				{#if s.acorns}<Acorn size={18} />{/if}{s.value}
			</dd>
		</div>
	{/each}
</dl>

<style>
	dl {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: var(--s-3);
		margin: 0 0 var(--s-4);
	}
	div {
		padding-top: var(--s-2);
		border-top: 1px solid var(--line);
	}
	dt {
		font-size: var(--fs-1);
		color: var(--muted);
	}
	dd {
		display: flex;
		align-items: center;
		gap: var(--s-1);
		margin: 0;
		font: 800 var(--fs-4) / 1.2 var(--font-display);
		font-variant-numeric: tabular-nums;
	}
	.bad {
		color: var(--bad-ink);
	}
</style>
