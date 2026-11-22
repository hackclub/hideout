<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '#lib/ui/Flash.svelte';
	import Countdown from '#lib/ui/Countdown.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const raid = $derived(data.raidRound ?? data.round);
	const phase = $derived(raid?.phase ?? 'upcoming');
	const offset = $derived(new Date(data.now).getTime() - Date.now());
</script>

<svelte:head><title>Break · Hideout</title></svelte:head>

{#if phase === 'scoring' && data.raidRound}
	<p class="intro">
		Break week is over. You can still ship your fixes for the next <Countdown
			to={data.raidRound.scoringEndsAt}
			{offset}
		/>, and merges will be valid until then.
	</p>
{:else}
	<p class="intro">
		In break week you get three projects to break into. Find a bug (something that doesn't work the
		way it was intended, a crash or a security bug), fix it in a fork and open a pull request. Then
		deploy your fork and ship your fixes to get your hours.
	</p>
{/if}

<Flash {form} />

{#if phase === 'upcoming' || phase === 'build'}
	<section class="card">
		<h2>Break week hasn't started yet</h2>
		{#if data.shipped}
			<p class="muted">You shipped this round, so you'll get targets when it starts.</p>
		{:else if data.raider}
			<p class="row">
				<span class="chip ok">In the raid</span>
				<span class="muted">You'll get targets even without shipping.</span>
			</p>
			<form method="POST" action="?/leave" use:enhance>
				<button class="btn small ghost">Leave the raid</button>
			</form>
		{:else}
			<p class="muted">
				Not building this round? Join the raid anyway and earn acorns for break time and fixes.
			</p>
			<form method="POST" action="?/join" use:enhance>
				<button class="btn">Join the raid</button>
			</form>
		{/if}
	</section>
{:else if data.targets.length === 0}
	<section class="card">
		<h2>No targets this round</h2>
		<p class="muted">
			Targets only go to people who shipped or joined the raid before break week. Next round, ship
			something or join early.
		</p>
	</section>
{:else}
	<ul class="grid targets" aria-label="Your targets">
		{#each data.targets as t (t.id)}
			<li>
				<a class="card target" href="/break/targets/{t.id}">
					<span class="cover">
						{#if t.screenshot}<img src={t.screenshot} alt="" loading="lazy" />{/if}
					</span>
					<span class="body">
						<b>{t.name}</b>
						<span class="meta">by {t.owner}</span>
						<span class="desc">{t.description}</span>
						<span class="chip {t.status.tone}">{t.status.text}</span>
					</span>
				</a>
			</li>
		{/each}
	</ul>
	<p class="muted rules">
		Up to {data.config.maxPairPrsPerRound} fixes per project. Only PRs opened this break week count, and
		docs-only changes don't. The builder has
		{data.config.responseHours}h to answer. <a href="/rules">How it works</a>
	</p>
{/if}

<style>
	h2 {
		font-size: var(--fs-4);
		margin: 0 0 var(--s-2);
	}
	.card .row {
		margin-bottom: var(--s-4);
	}
	.targets {
		padding: 0;
		margin: 0;
		list-style: none;
	}
	.target {
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
		margin: var(--s-2) 0 var(--s-4);
		font-size: var(--fs-1);
		color: var(--muted);
	}
	.chip {
		margin-top: auto;
	}
	.rules {
		margin: var(--s-6) 0 0;
		font-size: var(--fs-1);
	}
</style>
