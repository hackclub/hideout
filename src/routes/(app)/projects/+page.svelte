<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '#lib/ui/Flash.svelte';
	import Stamp from '#lib/ui/Stamp.svelte';
	import ShipForm, { type Draft } from './ShipForm.svelte';
	import { bugStamp, shipStamp, when } from '#lib/game/labels.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const phase = $derived(data.round?.phase ?? 'upcoming');
	const offset = $derived(new Date(data.now).getTime() - Date.now());
	const ship = $derived(data.current);
	const canShip = $derived(phase === 'build' && (!ship || ship.status === 'changes'));
	const project = $derived(data.project);

	let draft = $state<Draft>({
		fields: { name: '', repoUrl: '', description: '', demoUrl: '' },
		picked: []
	});

	let seeded = false;

	$effect.pre(() => {
		if (!seeded) {
			seeded = true;
			draft.fields = {
				name: project?.name ?? '',
				repoUrl: project?.repoUrl ?? '',
				description: project?.description ?? '',
				demoUrl: project?.demoUrl ?? ''
			};
		}
		if (draft.picked.length === 0 && ship?.hackatimeProjects)
			draft.picked = [...ship.hackatimeProjects];
	});

	const strip = (url: string) => url.replace(/^https?:\/\/(github\.com\/)?/, '');
</script>

<svelte:head><title>Projects · Hideout</title></svelte:head>

<header class="page-head">
	<h1>Projects</h1>
	<p>
		Build something, write a README that says what it does and how to run it, then ship it. In break
		week raccoons try to break it.
	</p>
</header>

<Flash {form} />

<div class="stack" style="--gap: var(--s-5)">
	{#if ship}
		<section class="card">
			<div class="head">
				<h2>{project?.name ?? `Round ${data.round?.number} ship`}</h2>
				<Stamp {...shipStamp[ship.status]} />
			</div>
			{#if project?.description}<p class="muted">{project.description}</p>{/if}
			{#if ship.screenshotUrl}
				<img
					class="shot"
					src={ship.screenshotUrl}
					alt="Screenshot of {project?.name ?? 'your project'}"
					loading="lazy"
				/>
			{/if}
			<dl class="facts">
				<div>
					<dt>Repo</dt>
					<dd><a href={ship.repoUrl}>{strip(ship.repoUrl)}</a></dd>
				</div>
				<div>
					<dt>Commit</dt>
					<dd>
						<a class="mono" href="{ship.repoUrl}/tree/{ship.commitSha}">
							{ship.commitSha.slice(0, 7)}
						</a>
					</dd>
				</div>
				<div>
					<dt>README</dt>
					<dd><a href="{ship.repoUrl}/tree/{ship.commitSha}#readme">Read it</a></dd>
				</div>
				{#if ship.demoUrl}<div>
						<dt>Demo</dt>
						<dd><a href={ship.demoUrl}>{strip(ship.demoUrl)}</a></dd>
					</div>{/if}
				<div>
					<dt>Hours</dt>
					<dd>
						{ship.approvedHours ?? ship.claimedHours}h {ship.approvedHours === null
							? 'claimed'
							: 'approved'}
					</dd>
				</div>
				{#if ship.tier}<div>
						<dt>Tier</dt>
						<dd>{ship.tier}</dd>
					</div>{/if}
			</dl>
			{#if ship.reviewNote}
				<div class="note">
					<b>From your reviewer</b>
					<p>{ship.reviewNote}</p>
				</div>
			{/if}
			{#if ship.status === 'pending' && phase === 'build'}
				<form method="POST" action="?/withdraw" use:enhance class="row withdraw">
					<input type="hidden" name="shipId" value={ship.id} />
					<button class="btn small ghost">Withdraw and edit</button>
					<span class="hint">You can ship again before build week ends.</span>
				</form>
			{/if}
		</section>

		{#if data.fixes.length}
			<section class="card">
				<h2>Fixes from raccoons</h2>
				<ul class="list">
					{#each data.fixes as f (f.bug.id)}
						<li>
							<a href="/break/fix/{f.bug.id}">
								<b>{f.bug.prTitle}</b><span class="meta">
									from {f.raccoon.name} · {f.bug.severity}
								</span>
							</a>
							{#if f.bug.status === 'waiting'}
								<span class="chip warn">Needs your answer</span>
							{:else}
								<Stamp {...bugStamp[f.bug.status]} />
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}

	{#if canShip}
		<ShipForm
			bind:draft
			htProjects={data.htProjects}
			closesAt={data.round?.breakStartsAt}
			{offset}
			again={ship?.status === 'changes'}
			keepScreenshot={Boolean(ship?.screenshotUrl)}
			ready={Boolean(data.me.hackatime && data.me.githubLogin)}
			details={data.me.hasAddress}
		/>
	{:else if !ship}
		<section class="card">
			<h2>Nothing shipped this round</h2>
			{#if phase === 'upcoming'}
				<p class="muted">Build week hasn't started yet.</p>
			{:else if phase === 'break' || phase === 'scoring'}
				<p class="muted">
					Shipping is closed for this round. Ship a project next round to take part in break week.
				</p>
			{:else}
				<p class="muted">No round is open right now.</p>
			{/if}
		</section>
	{/if}

	{#if data.history.length}
		<section class="card">
			<h2>Earlier rounds</h2>
			<ul class="list">
				{#each data.history as h (h.ship.id)}
					<li>
						<span>
							<b>Round {h.round.number}</b><span class="meta">
								{when(h.ship.createdAt)} · {h.ship.approvedHours ?? h.ship.claimedHours}h{h.ship
									.tier
									? ` · tier ${h.ship.tier}`
									: ''}
							</span>
						</span>
						<Stamp {...shipStamp[h.ship.status]} />
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-3);
	}
	h2 {
		font-size: var(--fs-4);
		margin: 0;
	}
	.head + p {
		margin: var(--s-1) 0 0;
	}
	h2 + p {
		margin: var(--s-2) 0 0;
	}
	.shot {
		display: block;
		width: 100%;
		max-width: 640px;
		height: auto;
		margin-top: var(--s-5);
		border: 1px solid var(--line);
		border-radius: var(--r-1);
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-3) var(--s-6);
		margin: var(--s-5) 0 0;
	}
	dt {
		font-size: var(--fs-1);
		color: var(--muted);
	}
	dd {
		margin: 0;
	}
	.note {
		margin-top: var(--s-5);
	}
	.note p {
		margin: var(--s-1) 0 0;
	}
	.withdraw {
		margin-top: var(--s-5);
	}
</style>
