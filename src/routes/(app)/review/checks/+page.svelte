<script lang="ts">
	import { enhance } from '$app/forms';
	import Stamp from '#lib/ui/Stamp.svelte';
	import FixCard from '#lib/ui/staff/FixCard.svelte';
	import StaffFlash from '#lib/ui/staff/StaffFlash.svelte';
	import { bugStamp, sevTone } from '#lib/game/labels.js';
	import { age, severities } from '#lib/ui/staff/format.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const lower = (s: string) =>
		severities.slice(0, severities.indexOf(s as (typeof severities)[number]));
</script>

<svelte:head><title>Spot checks · Review desk</title></svelte:head>

<StaffFlash {form} />

<header class="page-head">
	<h1>Spot checks</h1>
	<p>
		Every critical fix and a random share of the rest get a second look. Open the PR: is it a real
		bug, actually fixed, at the right severity?
	</p>
</header>

{#if data.checks.length === 0}
	<section class="card empty"><p class="muted">No fixes waiting for a spot check.</p></section>
{:else}
	<div class="cards">
		{#each data.checks as c (c.bug.id)}
			{@const below = lower(c.bug.severity)}
			<FixCard row={c} me={data.me.id}>
				{#snippet tags()}
					<Stamp text={c.bug.severity} tone={sevTone[c.bug.severity]} />
					<Stamp {...bugStamp[c.bug.status]} />
				{/snippet}
				{#snippet facts()}
					<dt>Sent</dt>
					<dd>
						{age(c.bug.createdAt, data.now)} ago
						{#if c.bug.autoAccepted}<span class="tag">auto-accepted</span>{/if}
						{#if c.bug.overturned}<span class="tag warn">won a dispute</span>{/if}
					</dd>
					{#if c.bug.riskyFiles?.length}
						<dt>Touches</dt>
						<dd class="row" style="--gap: var(--s-1)">
							{#each c.bug.riskyFiles as file (file)}<span class="tag warn mono">
									{file}
								</span>{/each}
						</dd>
					{/if}
				{/snippet}
				{#if c.bug.note}
					<span class="mini-label">Raccoon's note</span>
					<p class="quote">{c.bug.note}</p>
				{/if}
				{#snippet decide()}
					<form method="POST" action="?/check" use:enhance class="actions">
						<input type="hidden" name="bugId" value={c.bug.id} />
						<div>
							<label for="note-{c.bug.id}">
								Note <span class="hint">
									Needed if you lower it or throw it out. The raccoon sees it.
								</span>
							</label>
							<textarea id="note-{c.bug.id}" name="note"></textarea>
						</div>
						<div class="btns">
							<button class="btn small leafy" name="result" value="confirmed">Looks right</button>
							{#if below.length}
								<span class="btns">
									<button class="btn small acorn" name="result" value="downgraded">Lower to</button>
									<label for="sev-{c.bug.id}" class="visually-hidden">New severity</label>
									<select id="sev-{c.bug.id}" name="severity">
										{#each [...below].reverse() as s (s)}<option value={s}>{s}</option>{/each}
									</select>
								</span>
							{/if}
							<button class="btn small berry" name="result" value="rejected">Doesn't count</button>
						</div>
					</form>
				{/snippet}
			</FixCard>
		{/each}
	</div>
{/if}

<style>
	select {
		width: auto;
		min-height: 36px;
	}
</style>
