<script lang="ts">
	import { enhance } from '$app/forms';
	import Stamp from '#lib/ui/Stamp.svelte';
	import FixCard from '#lib/ui/staff/FixCard.svelte';
	import StaffFlash from '#lib/ui/staff/StaffFlash.svelte';
	import { sevTone } from '#lib/game/labels.js';
	import { utc } from '#lib/ui/staff/format.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Unmerged fixes · Review desk</title></svelte:head>

<StaffFlash {form} />

<header class="page-head">
	<h1>Unmerged fixes</h1>
	<p>
		Accepted fixes the builder never merged before the merge deadline. If the fix is good and they
		just sat on it, count it as merged so the raccoon gets their points. If the PR is broken or
		unsafe, leave it. When the raccoon shipped their fixes, their demo shows the fix running.
	</p>
</header>

{#if data.fixes.length === 0}
	<section class="card empty">
		<p class="muted">Nothing here. Fixes show up once a round's merge deadline passes.</p>
	</section>
{:else}
	<div class="cards">
		{#each data.fixes as u (u.bug.id)}
			<FixCard row={u} me={data.me.id}>
				{#snippet tags()}
					<Stamp text={u.bug.severity} tone={sevTone[u.bug.severity]} />
				{/snippet}
				{#snippet facts()}
					<dt>Accepted</dt>
					<dd>
						{u.bug.resolvedAt ? utc(u.bug.resolvedAt) : '-'}
						{#if u.bug.autoAccepted}<span class="tag">no answer, auto-accepted</span>{/if}
						{#if u.bug.overturned}<span class="tag warn">after a dispute</span>{/if}
					</dd>
					<dt>Their demo</dt>
					<dd>
						{#if u.fork}
							<a href={u.fork.demoUrl}>{u.fork.demoUrl}</a>
							{#if u.fork.url}<span class="muted small">
									from <a href={u.fork.url}>their fork</a>
								</span>{/if}
						{:else}
							<span class="muted">They didn't ship their fixes for this one.</span>
						{/if}
					</dd>
				{/snippet}
				{#if u.bug.note}
					<span class="mini-label">Raccoon's note</span>
					<p class="quote">{u.bug.note}</p>
				{/if}
				{#snippet decide()}
					<form method="POST" action="?/settle" use:enhance class="actions">
						<input type="hidden" name="bugId" value={u.bug.id} />
						<div>
							<label for="note-{u.bug.id}">
								Note <span class="hint">Needed if you leave it unmerged.</span>
							</label>
							<textarea id="note-{u.bug.id}" name="note"></textarea>
						</div>
						<div class="btns">
							<button class="btn small leafy" name="approve" value="yes">Count as merged</button>
							<button class="btn small ghost" name="approve" value="no">Leave unmerged</button>
						</div>
					</form>
				{/snippet}
			</FixCard>
		{/each}
	</div>
{/if}
