<script lang="ts">
	import Flash from '#lib/ui/Flash.svelte';
	import Stamp from '#lib/ui/Stamp.svelte';
	import ShipForm, { type Draft } from './ShipForm.svelte';
	import { bugStamp, shipStamp } from '#lib/game/labels.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const offset = $derived(new Date(data.now).getTime() - Date.now());
	const project = $derived(data.project);
	const ship = $derived(data.ship);
	const editable = $derived(!ship || ship.status === 'changes');

	let draft = $state<Draft>({
		fields: { name: '', repoUrl: '', description: '', demoUrl: '', updateDescription: '' },
		isUpdate: false,
		picked: []
	});

	let seeded = 0;

	$effect.pre(() => {
		if (seeded === project.id) return;
		seeded = project.id;
		draft = {
			fields: {
				name: project.name,
				repoUrl: project.repoUrl ?? '',
				description: project.description,
				demoUrl: project.demoUrl ?? '',
				updateDescription: project.updateDescription ?? ''
			},
			isUpdate: Boolean(project.updateDescription),
			picked: [...project.hackatimeProjects]
		};
	});

	const strip = (url: string) => url.replace(/^https?:\/\/(github\.com\/)?/, '');
</script>

<svelte:head><title>{project.name} · Hideout</title></svelte:head>

<a class="back" href="/projects">All projects</a>

<header class="page-head">
	<h1>{project.name}</h1>
	{#if project.description}<p>{project.description}</p>{/if}
</header>

<Flash {form} />

<div class="stack" style="--gap: var(--s-5)">
	{#if ship}
		<section class="card">
			<div class="head">
				<h2>Round {data.shipRound?.number} ship</h2>
				<Stamp {...shipStamp[ship.status]} />
			</div>
			{#if ship.screenshots.length}
				<div class="shots">
					{#each ship.screenshots as src, i (i)}
						<img class="shot" {src} alt="Screenshot {i + 1} of {project.name}" loading="lazy" />
					{/each}
				</div>
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
			{#if project.updateDescription && !editable}
				<div class="note">
					<b>What's new</b>
					<p>{project.updateDescription}</p>
				</div>
			{/if}
			{#if ship.reviewNote}
				<div class="note">
					<b>From your reviewer</b>
					<p>{ship.reviewNote}</p>
				</div>
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

	{#if editable}
		<ShipForm
			bind:draft
			htProjects={data.htProjects}
			taken={data.taken}
			building={data.building}
			screenshots={project.screenshots}
			closesAt={data.round?.breakStartsAt}
			{offset}
			again={ship?.status === 'changes'}
			ready={Boolean(data.me.hackatime && data.me.githubLogin)}
			details={data.me.hasAddress}
		/>
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
	.shots {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--s-3);
		margin-top: var(--s-5);
	}
	.shot {
		display: block;
		width: 100%;
		height: auto;
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
		white-space: pre-wrap;
	}
</style>
