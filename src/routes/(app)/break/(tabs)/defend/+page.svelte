<script lang="ts">
	import Countdown from '#lib/ui/Countdown.svelte';
	import { bugStamp, sevTone } from '#lib/game/labels.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const offset = $derived(new Date(data.now).getTime() - Date.now());
	const waiting = $derived(data.fixes.filter((f) => f.bug.status === 'waiting'));
	const settled = $derived(data.fixes.filter((f) => f.bug.status !== 'waiting'));
</script>

<svelte:head><title>Defend · Break · Hideout</title></svelte:head>

<p class="muted intro">
	Fixes raccoons sent to your projects. Accept or dispute each one within 24 hours, or it will count
	as accepted.
</p>

{#if data.fixes.length === 0}
	<section class="card">
		<h2>No fixes yet</h2>
		<p class="muted">When a raccoon sends a fix to one of your projects, it will show up here.</p>
	</section>
{:else}
	{#if waiting.length}
		<section class="card">
			<h2>Waiting on you</h2>
			<ul class="list">
				{#each waiting as f (f.bug.id)}
					<li>
						<a href="/break/fix/{f.bug.id}">
							<b>{f.bug.prTitle}</b><span class="meta">
								from {f.raccoon.name} on {f.project.name} · answer within <Countdown
									to={f.bug.respondBy}
									{offset}
								/>
							</span>
						</a>
						<span class="chip {sevTone[f.bug.severity]}">{f.bug.severity}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
	{#if settled.length}
		<section class="card">
			<h2>Answered</h2>
			<ul class="list">
				{#each settled as f (f.bug.id)}
					<li>
						<a href="/break/fix/{f.bug.id}">
							<b>{f.bug.prTitle}</b><span class="meta">
								from {f.raccoon.name} on {f.project.name} · {f.bug.severity}
							</span>
						</a>
						<span class="chip {bugStamp[f.bug.status].tone}">{bugStamp[f.bug.status].text}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}

<style>
	section + section {
		margin-top: var(--s-7);
	}
	h2 {
		font-size: var(--fs-4);
		margin: 0;
	}
</style>
