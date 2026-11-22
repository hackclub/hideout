<script lang="ts">
	import { enhance } from '$app/forms';
	import StaffFlash from '#lib/ui/staff/StaffFlash.svelte';
	import Who from '#lib/ui/staff/Who.svelte';
	import { hrs } from '#lib/ui/staff/format.js';
	import { bugStamp } from '#lib/game/labels.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Break hours · Review desk</title></svelte:head>

<StaffFlash {form} />

<header class="page-head">
	<h1>Break hours</h1>
	<p>
		Raccoons ship their fixes for each target: their fork, a live demo of it, a screenshot, the fix
		PRs and one Hackatime project. Try the demo and check the fixes are really in it. Each approved
		hour pays 10 acorns right away and goes to Unified.
	</p>
</header>

{#if data.claims.length === 0}
	<section class="card empty"><p class="muted">No break hours waiting.</p></section>
{:else}
	<div class="cards">
		{#each data.claims as c (c.a.id)}
			<article class="card">
				<div class="card-top">
					<h3><Who name={c.raccoon.name} github={c.raccoon.githubLogin} /></h3>
					{#if c.a.status === 'void'}<span class="tag bad">Target void</span>{/if}
				</div>
				<dl class="facts">
					<dt>Target</dt>
					<dd>
						<a href="/review/ships/{c.ship.id}">{c.project.name}</a>
						<span class="muted small">
							by {c.owner.name} · round {c.round.number}{c.ship.tier
								? ` · tier ${c.ship.tier}`
								: ''}
						</span>
					</dd>
					<dt>Fork</dt>
					<dd>
						{#if c.a.forkUrl}<a href={c.a.forkUrl}>
								{c.a.forkUrl.replace('https://github.com/', '')}
							</a>{:else}<span class="muted">-</span>{/if}
					</dd>
					<dt>Demo</dt>
					<dd>
						{#if c.a.forkDemoUrl}<a href={c.a.forkDemoUrl}>{c.a.forkDemoUrl}</a>{:else}<span
								class="muted"
							>
								-
							</span>{/if}
					</dd>
					<dt>Hackatime</dt>
					<dd><span class="tag mono">{c.a.hackatimeProject}</span></dd>
					<dt>Claimed</dt>
					<dd class="row">
						<strong>{hrs(c.a.claimedHours)}</strong>
						<form method="POST" action="?/refresh" use:enhance>
							<input type="hidden" name="assignmentId" value={c.a.id} />
							<button class="btn small ghost">Recheck Hackatime</button>
						</form>
					</dd>
					<dt>Fix PRs</dt>
					<dd>
						{#if c.prs.length}
							<ul class="prs">
								{#each c.prs as p (p.id)}
									<li>
										<a href={p.prUrl}>#{p.prNumber} {p.prTitle}</a>
										<span class="muted small">{p.severity} · {bugStamp[p.status].text}</span>
									</li>
								{/each}
							</ul>
						{:else}
							<span class="tag warn">None left standing</span>
						{/if}
					</dd>
				</dl>
				{#if c.a.forkScreenshotUrl}
					<a class="shot" href={c.a.forkScreenshotUrl}>
						<img src={c.a.forkScreenshotUrl} alt="Screenshot of the fixed version" />
					</a>
				{/if}
				<span class="mini-label">What they worked on</span>
				<p class="quote">{c.a.note}</p>
				{#if c.raccoon.id === data.me.id}
					<p class="actions muted">These are your hours, so someone else approves them.</p>
				{:else}
					<form method="POST" action="?/review" use:enhance class="actions">
						<input type="hidden" name="assignmentId" value={c.a.id} />
						<div class="row">
							<label for="h-{c.a.id}" class="inline">Hours to approve</label>
							<input
								id="h-{c.a.id}"
								class="short"
								name="hours"
								type="number"
								step="0.01"
								min="0"
								max={c.a.claimedHours}
								value={c.a.claimedHours}
							/>
							<span class="muted small">of {hrs(c.a.claimedHours)}</span>
						</div>
						<div>
							<label for="n-{c.a.id}">
								Note <span class="hint">Needed if you don't approve. The raccoon sees it.</span>
							</label>
							<textarea id="n-{c.a.id}" name="note"></textarea>
						</div>
						<div class="btns">
							<button class="btn small leafy" name="approve" value="yes">Approve</button>
							<button class="btn small berry" name="approve" value="no">Not approved</button>
						</div>
					</form>
				{/if}
			</article>
		{/each}
	</div>
{/if}

<style>
	.prs {
		margin: 0;
		padding-left: var(--s-4);
	}
	.shot img {
		display: block;
		max-width: 100%;
		max-height: 260px;
		margin: var(--s-3) 0;
		border-radius: var(--r-1);
		border: 1px solid var(--line);
	}
</style>
