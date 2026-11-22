<script lang="ts">
	import Stamp from '#lib/ui/Stamp.svelte';
	import { shipStamp } from '#lib/game/labels.js';
	import { age, hrs } from '#lib/ui/staff/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const filters = [
		{ key: 'pending', label: 'Waiting' },
		{ key: 'changes', label: 'Sent back' },
		{ key: 'approved', label: 'Approved' },
		{ key: 'rejected', label: 'Not accepted' },
		{ key: 'withdrawn', label: 'Withdrawn' },
		{ key: 'all', label: 'All' }
	];
</script>

<svelte:head><title>Ships · Review desk</title></svelte:head>

<header class="page-head">
	<h1>Ships</h1>
	<p>Oldest first. Open one to check the repo, README and hours, then decide.</p>
</header>

<nav class="chips" aria-label="Filter by status">
	{#each filters as f (f.key)}
		<a href="?status={f.key}" aria-current={data.status === f.key ? 'page' : undefined}>
			{f.label}
		</a>
	{/each}
</nav>

<section class="card">
	{#if data.ships.length === 0}
		<p class="muted none">
			{data.status === 'pending' ? 'No ships waiting. Nice work.' : 'No ships with this status.'}
		</p>
	{:else}
		<div class="table-scroll">
			<table class="table">
				<thead>
					<tr>
						<th>Project</th>
						<th>Maker</th>
						<th class="n">Round</th>
						<th>Shipped</th>
						<th class="n">Claimed</th>
						<th class="n">Per day</th>
						<th>Status</th>
						<th class="n">Tier</th>
					</tr>
				</thead>
				<tbody>
					{#each data.ships as s (s.ship.id)}
						<tr class:dim={s.round.status === 'closed'}>
							<td class="nowrap">
								<a href="/review/ships/{s.ship.id}"><strong>{s.project.name}</strong></a>
							</td>
							<td class="nowrap">
								{s.maker.name}
								{#if s.maker.githubLogin}<span class="gh muted small mono">
										@{s.maker.githubLogin}
									</span>{/if}
							</td>
							<td class="n">{s.round.number}</td>
							<td class="nowrap" title={new Date(s.shippedAt).toISOString()}>
								{age(s.shippedAt, data.now)} ago
							</td>
							<td class="n">{hrs(s.ship.claimedHours)}</td>
							<td class="n">
								{#if s.perDay > 12}<span class="tag warn" title="More than 12 hours a day">
										{s.perDay} h
									</span>{:else}{s.perDay} h{/if}
							</td>
							<td><Stamp {...shipStamp[s.ship.status]} /></td>
							<td class="n">{s.ship.tier ?? '-'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.none {
		margin: 0;
		padding: var(--s-2) 0;
	}
	tbody tr:last-child td {
		border-bottom: 0;
	}
	td {
		vertical-align: middle;
	}
	.gh {
		display: block;
	}
</style>
