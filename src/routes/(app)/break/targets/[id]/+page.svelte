<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '#lib/ui/Flash.svelte';
	import { bugStamp, sevTone } from '#lib/game/labels.js';
	import { isLiveFix } from '#lib/game/score.js';
	import FixForm from './FixForm.svelte';
	import ShipFixes from './ShipFixes.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const t = $derived(data.t);
	const canFix = $derived(data.phase === 'break' && t.a.status === 'active');
	const canLog = $derived(
		['break', 'scoring'].includes(data.phase) || t.a.hoursStatus === 'approved'
	);
</script>

<svelte:head><title>{t.project.name} · Hideout</title></svelte:head>

<a class="back" href="/break">All targets</a>

<Flash {form} />

<article class="card sheet">
	<header class="hero">
		<span class="cover">
			{#if t.ship.screenshotUrl}<img
					src={t.ship.screenshotUrl}
					alt="Screenshot of {t.project.name}"
				/>{/if}
		</span>
		<div class="body">
			<h1>{t.project.name}</h1>
			<p class="meta">
				by {t.owner.name}{t.ship.tier ? ` · tier ${t.ship.tier}` : ''}
				{#if t.a.status === 'void'}· <span class="chip bad">Closed</span>{/if}
			</p>
			<p class="desc">{t.project.description}</p>
			{#if t.ship.runSteps}
				<details>
					<summary>How to run it</summary>
					<pre>{t.ship.runSteps}</pre>
				</details>
			{/if}
			<p class="actions">
				{#if t.ship.demoUrl}<a class="btn small ghost" href={t.ship.demoUrl}>Demo</a>{/if}
				<a class="btn small ghost" href={t.ship.repoUrl}>Repository</a>
				<a class="btn small ghost" href="{t.ship.repoUrl}/tree/{t.ship.commitSha}#readme">README</a>
			</p>
		</div>
	</header>

	{#if t.fixes.length}
		<section>
			<h2>Your fixes</h2>
			<ul class="list">
				{#each t.fixes as f (f.id)}
					<li>
						<a href={f.prUrl}>
							<b>{f.prTitle}</b>
							<span class="meta">
								#{f.prNumber}{f.resolutionNote ? ` · ${f.resolutionNote}` : ''}
							</span>
						</a>
						<span class="row">
							<span class="chip {sevTone[f.severity]}">{f.severity}</span>
							<span class="chip {bugStamp[f.status].tone}">{bugStamp[f.status].text}</span>
							{#if ['waiting', 'accepted', 'disputed'].includes(f.status)}
								<form method="POST" action="?/withdraw" use:enhance>
									<input type="hidden" name="bugId" value={f.id} />
									<button class="btn small ghost">Withdraw</button>
								</form>
							{/if}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if canFix || canLog}
		<div class="two">
			{#if canFix}
				<section>
					<h2>Send a fix</h2>
					<FixForm assignmentId={t.a.id} repoUrl={t.ship.repoUrl} fixPoints={data.fixPoints} />
				</section>
			{/if}
			{#if canLog}
				<section>
					<ShipFixes
						a={t.a}
						prs={t.fixes.filter((f) => isLiveFix(f.status))}
						htProjects={data.htProjects}
					/>
				</section>
			{/if}
		</div>
	{/if}
</article>

<style>
	.back {
		margin-bottom: var(--s-3);
	}
	.hero {
		display: flex;
		gap: var(--s-6);
	}
	.hero .cover {
		flex: 5 1 0;
		align-self: start;
	}
	.body {
		flex: 4 1 0;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	h1 {
		margin: 0;
	}
	.meta {
		margin: 0;
	}
	.desc {
		margin: var(--s-3) 0 var(--s-4);
	}
	details {
		margin-bottom: var(--s-4);
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	pre {
		margin: var(--s-2) 0 0;
		padding: var(--s-3);
		white-space: pre-wrap;
		background: var(--well);
		border-radius: var(--r-1);
	}
	.actions {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(0, 1fr);
		gap: var(--s-3);
		margin: auto 0 0;
	}
	.sheet > section,
	.two {
		margin-top: var(--s-5);
		padding-top: var(--s-5);
		border-top: 1px solid var(--line);
	}
	h2 {
		margin: 0 0 var(--s-4);
		font-size: var(--fs-4);
	}
	li {
		flex-wrap: wrap;
	}
	.list {
		margin: 0;
	}
	.row {
		--gap: var(--s-2);
	}
	.two {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(0, 1fr);
		gap: var(--s-7);
	}

	@media (max-width: 760px) {
		.hero {
			flex-direction: column;
			gap: var(--s-4);
		}
		.hero :is(.cover, .body) {
			flex: none;
			align-self: stretch;
		}
		.actions,
		.two {
			grid-auto-flow: row;
		}
		.actions {
			gap: var(--s-2);
		}
		.sheet > section,
		.two {
			margin-top: var(--s-4);
			padding-top: var(--s-4);
		}
		.two {
			gap: var(--s-4);
		}
		.two > section + section {
			padding-top: var(--s-4);
			border-top: 1px solid var(--line);
		}
	}
</style>
