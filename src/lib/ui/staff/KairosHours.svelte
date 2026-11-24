<script lang="ts">
	import { hrs } from './format.js';

	let {
		kairos,
		names,
		unpicked
	}: {
		kairos:
			| { state: 'unpicked' | 'none' | 'down' }
			| {
					state: 'ok';
					seconds: number;
					categories: Record<string, number>;
					agentSeconds: number;
			  };
		names: string[];
		unpicked: string;
	} = $props();

	const short = (seconds: number) => `${Math.round(seconds / 360) / 10}h`;
</script>

{#if names.length}
	<div class="row" style="--gap: var(--s-1)">
		{#each names as n (n)}<span class="tag mono">{n}</span>{/each}
	</div>
{/if}
{#if kairos.state === 'ok'}
	<strong>{hrs(kairos.seconds / 3600)}</strong>
	<span class="muted small">
		{Object.entries(kairos.categories)
			.filter(([, s]) => s > 0)
			.map(([c, s]) => `${c.replace(/^ai /, 'AI ')} ${short(s)}`)
			.join(', ')}
	</span>
	{#if kairos.agentSeconds > 0}
		<span class="muted small">Agent time {short(kairos.agentSeconds)}</span>
	{/if}
{:else if kairos.state === 'unpicked'}
	{unpicked}
{:else if kairos.state === 'none'}
	No Kairos account
{:else}
	Kairos didn't answer
{/if}
