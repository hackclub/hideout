<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '#lib/ui/Flash.svelte';
	import { shipStamp } from '#lib/game/labels.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const phase = $derived(data.round?.phase ?? 'upcoming');
	const ladder = $derived([...data.ladder].sort((a, b) => a - b));
</script>

<svelte:head><title>Projects · Hideout</title></svelte:head>

<header class="page-head">
	<h1>Projects</h1>
	<p>
		Make a project any time, then ship it in build week. Write a README that says what it does and
		how to run it. In break week raccoons try to break it.
	</p>
</header>

<Flash {form} />

<div class="stack" style="--gap: var(--s-5)">
	<section class="card">
		<h2>New project</h2>
		<form method="POST" action="?/create" use:enhance class="row create">
			<label class="visually-hidden" for="name">Name</label>
			<input
				id="name"
				name="name"
				required
				minlength="2"
				maxlength="60"
				placeholder="Mossy Notes"
			/>
			<button class="btn">Create</button>
		</form>
	</section>

	{#if phase === 'build'}
		<p class="muted">
			You shipped {data.shipped} of {ladder.length} this round.
		</p>
	{/if}

	{#if data.projects.length}
		<ul class="grid projects" aria-label="Your projects">
			{#each data.projects as p (p.id)}
				{@const stamp = p.ship ? shipStamp[p.ship.status] : { text: 'Not shipped', tone: 'plain' }}
				<li>
					<a class="card project" href="/projects/{p.id}">
						<span class="cover">
							{#if p.screenshot}<img src={p.screenshot} alt="" loading="lazy" />{/if}
						</span>
						<span class="body">
							<b>{p.name}</b>
							<span class="meta">
								{p.ship?.round ? `Round ${p.ship.round}` : 'Not shipped yet'}
							</span>
							{#if p.description}<span class="desc">{p.description}</span>{/if}
							<span class="foot"><span class="chip {stamp.tone}">{stamp.text}</span></span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	h2 {
		font-size: var(--fs-4);
		margin: 0;
	}
	.create {
		margin-top: var(--s-4);
		flex-wrap: nowrap;
	}
	.create input {
		flex: 1;
	}
	.projects {
		padding: 0;
		margin: 0;
		list-style: none;
	}
	.project {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: var(--s-3);
	}
	.body {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: var(--s-4) var(--s-1) var(--s-1);
	}
	b {
		font: 700 var(--fs-3) / 1.2 var(--font-display);
	}
	.desc {
		margin: var(--s-2) 0 0;
		font-size: var(--fs-1);
		color: var(--muted);
	}
	.foot {
		margin-top: auto;
		padding-top: var(--s-4);
	}
</style>
