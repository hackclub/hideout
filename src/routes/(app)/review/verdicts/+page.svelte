<script lang="ts">
	import { enhance } from '$app/forms';
	import StaffFlash from '#lib/ui/staff/StaffFlash.svelte';
	import Who from '#lib/ui/staff/Who.svelte';
	import { phaseLabel } from '#lib/game/phase.js';
	import { verdicts } from '#lib/ui/staff/tiers.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const keys = ['attacked', 'too_simple', 'not_attacked', 'unrunnable'] as const;
	type Group = (typeof data.groups)[number];
	const stake = (g: Group, tier: number | null) => (tier ? g.round.stakes[tier - 1] : 0);
	const points = (g: Group, key: (typeof keys)[number], tier: number | null) =>
		key === 'attacked'
			? stake(g, tier) * g.round.multiplier
			: key === 'unrunnable'
				? 0
				: stake(g, tier);
	const multiplier = $derived(data.groups[0]?.round.multiplier ?? 1.5);
</script>

<svelte:head><title>Verdicts · Review desk</title></svelte:head>

<StaffFlash {form} />

<header class="page-head">
	<h1>Verdicts</h1>
	<p>
		Approved ships nobody found a valid bug in. Decide if raccoons really tried to get in, and if
		the project is good enough for the bonus. A round can't close until each one has a verdict.
	</p>
</header>

<dl class="card legend">
	<dt>Unbreakable</dt>
	<dd>
		A really good project, raccoons truly went at it, and they still found nothing. Both have to be
		true. Pays {multiplier}x the stake.
	</dd>
	<dt>Too simple</dt>
	<dd>
		Raccoons tried and found nothing, but there wasn't much to break. Pays the stake, no bonus.
	</dd>
	<dt>Not attacked</dt>
	<dd>Nobody gave it a real try. Pays the stake.</dd>
	<dt>Couldn't run</dt>
	<dd>Nobody could get it running. Pays 0.</dd>
	<dd>
		We suggest "Unbreakable" when at least 2 raccoons had 1.5 h or more approved and someone sent a
		PR. That only covers the attack part, you still decide if the project is good enough.
	</dd>
</dl>

{#if data.groups.length === 0}
	<section class="card empty">
		<p class="muted">Verdicts open once a round reaches break week.</p>
	</section>
{/if}

{#each data.groups as g (g.round.id)}
	{@const missing = g.ships.filter((s) => !s.ship.verdict).length}
	<section class="card group">
		<div class="card-top">
			<h2>Round {g.round.number} <span class="muted small">{phaseLabel[g.round.phase]}</span></h2>
			{#if g.ships.length}<span class="tag {missing ? 'warn' : 'ok'}">
					{missing ? `${missing} left` : 'All done'}
				</span>{/if}
		</div>
		{#if g.round.phase === 'break'}
			<p class="muted">
				Break week is still on, so these ships can still get broken into. Best to decide after it
				ends.
			</p>
		{/if}
		{#if g.ships.length === 0}
			<p class="muted">
				Every approved ship in this round has at least one valid bug. Nothing to judge.
			</p>
		{:else}
			<ul class="ships">
				{#each g.ships as s (s.ship.id)}
					<li>
						<div>
							<a href="/review/ships/{s.ship.id}"><b>{s.project.name}</b></a>
							<Who name={s.maker.name} github={s.maker.githubLogin} />
							<p class="meta">
								Tier {s.ship.tier} ({stake(g, s.ship.tier)} pts) · {s.raccoons} raccoons, {s.hint
									.busy} with 1.5 h+ approved · {s.hint.prs} PRs · suggested
								<span class="tag {s.hint.suggestion === 'attacked' ? 'ok' : ''}">
									{verdicts[s.hint.suggestion].label}
								</span>
							</p>
						</div>
						{#if s.ship.userId === data.me.id}
							<span class="muted small">Your ship</span>
						{:else}
							<form method="POST" action="?/verdict" use:enhance class="btns">
								<input type="hidden" name="shipId" value={s.ship.id} />
								{#each keys as k (k)}
									<button
										class="btn small {s.ship.verdict === k
											? k === 'unrunnable'
												? 'berry'
												: 'leafy'
											: 'ghost'}"
										name="verdict"
										value={k}
										aria-pressed={s.ship.verdict === k}
										title="{points(g, k, s.ship.tier)} points"
									>
										{verdicts[k].label}
									</button>
								{/each}
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/each}

<style>
	.legend {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: var(--s-1) var(--s-4);
		margin: 0 0 var(--s-5);
	}
	.legend dt {
		font-weight: 600;
	}
	.legend dd {
		margin: 0;
		color: var(--muted);
	}
	.legend dd:last-child {
		grid-column: 1 / -1;
		margin-top: var(--s-2);
		font-size: var(--fs-1);
	}
	.group + .group {
		margin-top: var(--s-5);
	}
	.group h2 {
		margin: 0;
	}
	.ships {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-3) var(--s-4);
		padding: var(--s-4) 0;
		border-top: 1px solid var(--line);
	}
	li:last-child {
		padding-bottom: 0;
	}
	li > div {
		flex: 1 1 320px;
		min-width: 0;
	}
	b {
		font-weight: 600;
		margin-right: var(--s-2);
	}
	.meta {
		margin: var(--s-1) 0 0;
		font-size: var(--fs-1);
		color: var(--muted);
	}
	.meta .tag {
		padding: 0 var(--s-2);
	}
</style>
