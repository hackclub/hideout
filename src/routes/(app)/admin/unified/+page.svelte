<script lang="ts">
	import { enhance } from '$app/forms';
	import Stamp from '#lib/ui/Stamp.svelte';
	import StaffFlash from '#lib/ui/staff/StaffFlash.svelte';
	import { hrs, utc } from '#lib/ui/staff/format.js';
	import PageHead from '../_components/PageHead.svelte';
	import Panel from '../_components/Panel.svelte';
	import Stats from '../_components/Stats.svelte';
	import Table from '../_components/Table.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const tone = { queued: 'info', sent: 'ok', error: 'bad' } as const;
	const tally = $derived({
		queued: data.rows.filter((r) => r.o.state === 'queued').length,
		sent: data.rows.filter((r) => r.o.state === 'sent').length,
		error: data.rows.filter((r) => r.o.state === 'error').length
	});
</script>

<StaffFlash {form} />

<PageHead title="Unified">
	Every approved ship, and every approved set of break-week fixes, goes to Hack Club's Unified YSWS
	database. The timer sends queued ones every minute and failures stay here.
	{#snippet actions()}
		{#if tally.error}
			<form method="POST" action="?/retry" use:enhance>
				<button class="btn small">Retry all {tally.error} failed</button>
			</form>
		{/if}
		<form method="POST" action="?/send" use:enhance>
			<button class="btn small ghost" disabled={!tally.queued}>Send queued now</button>
		</form>
	{/snippet}
</PageHead>

{#if data.rows.length === 0}
	<Panel>
		<p class="muted">Nothing yet. Ships and fixes show up here once they're approved.</p>
	</Panel>
{:else}
	<Panel>
		<Stats
			items={[
				{ label: 'Queued', value: tally.queued },
				{ label: 'Sent', value: tally.sent },
				{ label: 'Failed', value: tally.error, tone: tally.error ? 'bad' : undefined }
			]}
		/>
		<Table small>
			<thead>
				<tr>
					<th>#</th><th>Project</th><th>Maker</th><th class="n">Hours</th><th>State</th><th>
						Error
					</th><th>Sent</th><th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.rows as r (r.o.id)}
					<tr>
						<td>{r.o.id}</td>
						<td>
							{#if r.fix}<span class="muted">Fixes for</span>{/if}
							<a href="/review/ships/{r.ship.id}">{r.project.name}</a>
							<span class="muted">R{r.round.number}</span>
						</td>
						<td><a href="/admin/users/{r.user.id}">{r.user.name}</a></td>
						<td class="n">{hrs(r.fix ? r.fix.approvedHours : r.ship.approvedHours)}</td>
						<td>
							<Stamp text={r.o.state} tone={tone[r.o.state as keyof typeof tone] ?? 'plain'} />
						</td>
						<td class="err">{r.o.error ?? ''}</td>
						<td class="nowrap">{r.o.sentAt ? utc(r.o.sentAt).replace(' UTC', '') : '-'}</td>
						<td>
							{#if r.o.state === 'error'}
								<form method="POST" action="?/retry" use:enhance>
									<input type="hidden" name="id" value={r.o.id} />
									<button class="btn small ghost">Retry</button>
								</form>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</Table>
	</Panel>
{/if}

<style>
	.err {
		max-width: 340px;
		color: var(--bad-ink);
		font-family: var(--font-mono);
		overflow-wrap: anywhere;
	}
</style>
