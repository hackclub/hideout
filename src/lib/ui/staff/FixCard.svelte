<script lang="ts">
	import type { Snippet } from 'svelte';
	import Who from './Who.svelte';
	import { prRef } from './format.js';

	type Person = { id: number; name: string; githubLogin: string | null };

	let {
		row,
		me,
		tags,
		facts,
		children,
		decide
	}: {
		row: {
			bug: { prUrl: string; prTitle: string };
			ship: { id: number; tier: number | null };
			project: { name: string };
			round: { number: number };
			raccoon: Person;
			builder: Person;
		};
		me: number;
		tags?: Snippet;
		facts?: Snippet;
		children?: Snippet;
		decide: Snippet;
	} = $props();

	const party = $derived(row.raccoon.id === me || row.builder.id === me);
</script>

<article class="card">
	<div class="card-top">
		<h3>
			<a class="pr" href={row.bug.prUrl} target="_blank" rel="noreferrer">{row.bug.prTitle}</a>
			<span class="ref mono muted">{prRef(row.bug.prUrl)}</span>
		</h3>
		{#if tags}<div class="row">{@render tags()}</div>{/if}
	</div>
	<dl class="facts">
		<dt>Project</dt>
		<dd>
			<a href="/review/ships/{row.ship.id}">{row.project.name}</a>
			<span class="muted small">
				round {row.round.number}{row.ship.tier ? ` · tier ${row.ship.tier}` : ''}
			</span>
		</dd>
		<dt>Raccoon</dt>
		<dd><Who name={row.raccoon.name} github={row.raccoon.githubLogin} /></dd>
		<dt>Builder</dt>
		<dd><Who name={row.builder.name} github={row.builder.githubLogin} /></dd>
		{@render facts?.()}
	</dl>
	{@render children?.()}
	{#if party}
		<p class="actions muted">You're on this one, so someone else on the team decides.</p>
	{:else}
		{@render decide()}
	{/if}
</article>

<style>
	.row {
		--gap: var(--s-2);
	}
</style>
