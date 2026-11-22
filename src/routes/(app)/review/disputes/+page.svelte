<script lang="ts">
	import { enhance } from '$app/forms';
	import Stamp from '#lib/ui/Stamp.svelte';
	import FixCard from '#lib/ui/staff/FixCard.svelte';
	import StaffFlash from '#lib/ui/staff/StaffFlash.svelte';
	import { bugStamp, sevTone } from '#lib/game/labels.js';
	import { age, disputeKind, severities } from '#lib/ui/staff/format.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Disputes · Review desk</title></svelte:head>

<StaffFlash {form} />

<header class="page-head">
	<h1>Disputes</h1>
	<p>
		The builder says a fix shouldn't count. Read the PR, check it against their README and decide.
		Both sides see your reason, so try to settle each one within a day.
	</p>
</header>

{#if data.disputes.length === 0}
	<section class="card empty"><p class="muted">No disputes right now.</p></section>
{:else}
	<div class="cards">
		{#each data.disputes as d (d.bug.id)}
			<FixCard row={d} me={data.me.id}>
				{#snippet tags()}
					<Stamp text={d.bug.severity} tone={sevTone[d.bug.severity]} />
				{/snippet}
				{#snippet facts()}
					<dt>Sent</dt>
					<dd>{age(d.bug.createdAt, data.now)} ago</dd>
					{#if d.bug.severity !== d.bug.proposedSeverity}
						<dt>Severity</dt>
						<dd>Raccoon said {d.bug.proposedSeverity}, now {d.bug.severity}</dd>
					{/if}
				{/snippet}
				<div class="sides">
					<div>
						<span class="mini-label">
							Builder: {disputeKind[d.bug.disputeKind ?? ''] ?? d.bug.disputeKind ?? 'dispute'}
						</span>
						<p class="quote warn">{d.bug.disputeReason}</p>
					</div>
					<div>
						<span class="mini-label">Raccoon's note</span>
						{#if d.bug.note}<p class="quote">{d.bug.note}</p>{:else}<p class="muted small">
								No note.
							</p>{/if}
					</div>
				</div>
				{#if d.others.length}
					<details>
						<summary>Other fixes on this project ({d.others.length})</summary>
						<div class="table-scroll">
							<table class="table small">
								<tbody>
									{#each d.others as o (o.id)}
										<tr>
											<td>
												<a class="pr" href={o.prUrl} target="_blank" rel="noreferrer">
													{o.prTitle}
												</a>
											</td>
											<td>{o.raccoon}</td>
											<td class="nowrap">{age(o.createdAt, data.now)} ago</td>
											<td><Stamp text={o.severity} tone={sevTone[o.severity]} /></td>
											<td><Stamp {...bugStamp[o.status]} /></td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</details>
				{/if}
				{#snippet decide()}
					<form method="POST" action="?/resolve" use:enhance class="actions">
						<input type="hidden" name="bugId" value={d.bug.id} />
						<div class="row">
							<label for="sev-{d.bug.id}" class="inline">If it counts, the severity is</label>
							<select id="sev-{d.bug.id}" name="severity">
								{#each severities as s (s)}<option value={s} selected={s === d.bug.severity}>
										{s}
									</option>{/each}
							</select>
						</div>
						<div>
							<label for="note-{d.bug.id}">
								Reason <span class="hint">Required. Both sides see this.</span>
							</label>
							<textarea id="note-{d.bug.id}" name="note" required></textarea>
						</div>
						<div class="btns">
							<button class="btn small leafy" name="outcome" value="upheld">It counts</button>
							<button class="btn small berry" name="outcome" value="invalid">Not a bug</button>
							<button class="btn small ghost" name="outcome" value="duplicate">Duplicate</button>
						</div>
					</form>
				{/snippet}
			</FixCard>
		{/each}
	</div>
{/if}

<style>
	.sides {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--s-4);
	}
	details {
		margin-top: var(--s-4);
	}
	select {
		width: auto;
	}
	@media (max-width: 760px) {
		.sides {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
