<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '#lib/ui/Flash.svelte';
	import Countdown from '#lib/ui/Countdown.svelte';
	import { bugStamp, sevTone, when } from '#lib/game/labels.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const offset = $derived(new Date(data.now).getTime() - Date.now());
	const bug = $derived(data.bug);
	let disputing = $state(false);
	const sevIndex = $derived(['minor', 'major', 'critical'].indexOf(bug.severity));
	const cost = $derived(data.stake.findValue[sevIndex]);
	const theirPoints = $derived(data.stake.fixPoints[sevIndex]);
	const points = (n: number) => (n === 1 ? '1 point' : `${n} points`);
	const status = $derived(
		bug.status === 'waiting' ? { text: 'Waiting on you', tone: 'warn' } : bugStamp[bug.status]
	);
</script>

<svelte:head><title>Fix #{bug.prNumber} · Hideout</title></svelte:head>

<header class="page-head">
	<a class="back" href="/break/defend">Back to Defend</a>
	<h1>{bug.prTitle}</h1>
	<p>
		From {data.raccoon.name}{data.raccoon.githubLogin ? ` (@${data.raccoon.githubLogin})` : ''},
		sent {when(bug.createdAt)}
	</p>
</header>

<Flash {form} />

<div class="split">
	<article class="card">
		<p class="row facts">
			<span class="chip {status.tone}">{status.text}</span>
			<span class="chip {sevTone[bug.severity]}">{bug.severity}</span>
			{#if bug.severity !== bug.proposedSeverity}<span class="muted">
					They said {bug.proposedSeverity}
				</span>{/if}
			<a href={bug.prUrl}>Open #{bug.prNumber} on GitHub</a>
		</p>

		{#if bug.riskyFiles?.length}
			<p class="warning">
				<b>Read this one carefully before merging.</b> It changes files that can run code on your
				machine or in CI:
				<span class="mono">{bug.riskyFiles.join(', ')}</span>
			</p>
		{/if}

		{#if bug.note}
			<h3>Their note</h3>
			<p>{bug.note}</p>
		{/if}

		<section class="answer">
			{#if bug.status === 'waiting'}
				<h2>Your answer</h2>
				<p>
					You have <b><Countdown to={bug.respondBy} {offset} /></b> to answer, or it will count as accepted.
					Accepting means you agree it's a real bug. If you merge the PR too, it will only cost you half
					the points :)
				</p>
				<div class="row">
					<form method="POST" action="?/accept" use:enhance>
						<button class="btn leafy">Accept, it's a real bug</button>
					</form>
					<button
						class="btn ghost"
						onclick={() => (disputing = !disputing)}
						aria-expanded={disputing}
					>
						Dispute it
					</button>
				</div>
				{#if disputing}
					<form method="POST" action="?/dispute" use:enhance class="dispute">
						<fieldset>
							<legend>Why?</legend>
							<label class="check">
								<input type="radio" name="kind" value="not_a_bug" required /> It's not a bug
							</label>
							<label class="check">
								<input type="radio" name="kind" value="duplicate" /> Someone already reported it
							</label>
							<label class="check">
								<input type="radio" name="kind" value="severity" /> It's real, but the severity is too
								high
							</label>
							<label class="check">
								<input type="radio" name="kind" value="other" /> Something else
							</label>
						</fieldset>
						<div class="field">
							<label for="reason">Explain it for the reviewer</label>
							<textarea id="reason" name="reason" required minlength="10" rows="3"></textarea>
						</div>
						<button class="btn berry">Send dispute</button>
					</form>
				{/if}
			{:else}
				{#if bug.status === 'accepted'}
					<p>
						You accepted this{bug.autoAccepted ? ' (no answer in time)' : ''}. Merge it on GitHub to
						get half of your points back.
					</p>
				{:else if bug.status === 'disputed'}
					<p>You disputed this. A reviewer will decide soon.</p>
					{#if bug.disputeReason}<p class="muted">Your reason: {bug.disputeReason}</p>{/if}
				{:else if bug.status === 'merged'}
					<p>
						Merged{bug.mergedBy === 'reviewer' ? ' (approved by a reviewer)' : ''}. Thanks for
						fixing it.
					</p>
				{/if}
				{#if bug.resolutionNote}<p class="muted">Reviewer: {bug.resolutionNote}</p>{/if}
			{/if}
		</section>
	</article>

	<aside class="card">
		<h3>What's at stake</h3>
		<ul>
			<li>If it's a bug and you merge it, your project loses {points(cost / 2)}.</li>
			<li>If it's a bug and you don't merge it, you lose {points(cost)}.</li>
			<li>{data.raccoon.name} gets {points(theirPoints)} once it's merged.</li>
		</ul>
		{#if ['waiting', 'accepted', 'disputed'].includes(bug.status)}
			<h3>Before you merge</h3>
			<ul>
				<li>Read every changed line.</li>
				<li>Run it on your machine.</li>
				<li>Be extra careful with CI, install scripts and dependencies.</li>
			</ul>
		{/if}
	</aside>
</div>

<style>
	.split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 320px;
		gap: var(--s-7) var(--s-6);
		align-items: start;
	}
	.facts {
		margin: 0;
	}
	.warning {
		margin: var(--s-5) 0 0;
		padding: var(--s-3) var(--s-4);
		border-radius: var(--r-1);
		color: var(--bad-ink);
		background: var(--bad-tint);
	}
	h3 {
		margin: var(--s-5) 0 var(--s-2);
		font-size: var(--fs-2);
	}
	aside h3:first-child {
		margin-top: 0;
	}
	.answer {
		margin-top: var(--s-5);
		padding-top: var(--s-5);
		border-top: 1px solid var(--line);
	}
	.answer > :last-child {
		margin-bottom: 0;
	}
	h2 {
		margin: 0 0 var(--s-2);
		font-size: var(--fs-4);
	}
	.dispute {
		margin-top: var(--s-5);
	}
	fieldset {
		display: grid;
		gap: var(--s-2);
		margin: 0 0 var(--s-4);
		padding: 0;
		border: 0;
	}
	legend {
		padding: 0;
		margin-bottom: var(--s-1);
		font-weight: 600;
	}
	fieldset label {
		margin: 0;
	}
	.dispute .btn {
		margin-top: var(--s-4);
	}
	ul {
		margin: 0;
		padding-left: var(--s-5);
		display: grid;
		gap: var(--s-2);
		font-size: var(--fs-1);
	}
	@media (max-width: 900px) {
		.split {
			grid-template-columns: 1fr;
		}
	}
</style>
