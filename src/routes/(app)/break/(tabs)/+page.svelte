<script lang="ts">
	import Countdown from '#lib/ui/Countdown.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

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
		In break week you get 3 projects to break into. Find a bug (something that doesn't work the way
		it was intended, a crash or a security bug), fix it in a fork and open a pull request. Then
		deploy your fork and ship your fixes to get acorns.
	</p>
{/if}

{#if phase === 'upcoming' || phase === 'build'}
	<section class="card">
		<h2>Break week hasn't started yet</h2>
		{#if data.shipped}
			<p class="muted">You shipped this round, so you'll get targets when it starts.</p>
		{:else}
			<p class="muted">
				Only people who ship a project this round get targets. <a href="/projects">Ship yours</a>
				before break week starts to join in.
			</p>
		{/if}
	</section>
{:else if data.targets.length === 0}
	<section class="card">
		<h2>No targets this round</h2>
		<p class="muted">
			Targets only go to people who shipped a project this round. Ship a project next round to join
			in :)
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
		Up to {data.config.maxPairPrsPerRound} fixes per project. Only PRs opened in this break week will
		be valid, the builder will have
		{data.config.responseHours}h to answer. <a href="/rules">How it works</a>
	</p>
{/if}

<style>
	h2 {
		font-size: var(--fs-4);
		margin: 0 0 var(--s-2);
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
