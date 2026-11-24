<script lang="ts">
	import Icon from '#lib/ui/Icon.svelte';
	import { phaseLabel } from '#lib/game/phase.js';
	import { et } from '#lib/ui/staff/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const queues = $derived([
		{
			href: '/review/ships',
			n: data.desk.ships,
			title: 'Ships waiting',
			line: 'Projects to approve, send back or turn down.'
		},
		{
			href: '/review/disputes',
			n: data.desk.disputes,
			title: 'Disputes',
			line: "Builders say a fix doesn't count. You decide."
		},
		{
			href: '/review/checks',
			n: data.desk.checks,
			title: 'Spot checks',
			line: 'Every critical fix and a few random ones, for a second look.'
		},
		{
			href: '/review/unmerged',
			n: data.desk.unmerged,
			title: 'Unmerged fixes',
			line: 'Accepted fixes nobody merged before the deadline.'
		},
		{
			href: '/review/hours',
			n: data.desk.hours,
			title: 'Break hours',
			line: "Raccoons' break week time, waiting for approval."
		},
		{
			href: '/review/verdicts',
			n: data.desk.verdicts,
			title: 'Verdicts',
			line: 'Ships nobody got into. Were they really tested?'
		}
	]);

	const steps = $derived(
		data.round
			? [
					{ key: 'build', label: 'Build week starts', at: data.round.buildStartsAt },
					{ key: 'break', label: 'Break week starts', at: data.round.breakStartsAt },
					{ key: 'scoring', label: 'Break week ends', at: data.round.breakEndsAt },
					{ key: 'ready', label: 'Merge deadline', at: data.round.scoringEndsAt }
				]
			: []
	);

	const order = ['upcoming', 'build', 'break', 'scoring', 'ready', 'closed'];
	const reached = (key: string) =>
		data.round && order.indexOf(data.round.phase) >= order.indexOf(key);
</script>

<svelte:head><title>Review desk · Hideout</title></svelte:head>

<header class="page-head">
	<h1>Review desk</h1>
	{#if data.round}
		<p>
			{data.season?.name}, round {data.round.number}. Times on staff pages are New York time (ET).
		</p>
	{:else}
		<p>No season yet.</p>
	{/if}
</header>

{#if data.round}
	<ol class="timeline" aria-label="Round {data.round.number} dates">
		{#each steps as s (s.key)}
			<li class:done={reached(s.key)} class:now={data.round.phase === s.key}>
				<span class="dot" aria-hidden="true"></span>
				<span class="mini-label">{s.label}</span>
				{et(s.at).replace(' ET', '')}
			</li>
		{/each}
	</ol>
{/if}

<ul class="card queues" aria-label="Queues">
	{#each queues as q (q.href)}
		<li>
			<a href={q.href}>
				<span class="count" class:busy={q.n > 0}>{q.n}</span>
				<span><b>{q.title}</b><span class="meta">{q.line}</span></span>
				<Icon name="arrow" size={20} />
			</a>
		</li>
	{/each}
</ul>

<section class="card">
	<h2>Rounds in play</h2>
	{#if data.outlook.rounds.length}
		<div class="table-scroll">
			<table class="table">
				<thead>
					<tr>
						<th>Round</th>
						<th class="n">Shipped</th>
						<th class="n">Approved</th>
						<th class="n">Raccoons</th>
						<th class="n">Fixes</th>
						<th class="n">Merged</th>
					</tr>
				</thead>
				<tbody>
					{#each data.outlook.rounds as r (r.id)}
						<tr>
							<td>
								<strong class="nowrap">Round {r.number}</strong>
								<span class="sub muted small">{phaseLabel[r.phase]}</span>
								{#if r.phase === 'scoring'}<span class="sub small muted">
										Merges count until {et(r.scoringEndsAt)}
									</span>{/if}
								{#if r.phase === 'ready'}<span class="sub small">
										Ready to close{#if data.me.role === 'admin'}: <a
												href="/admin?preview={r.id}#preview"
											>
												preview payout
											</a>{/if}
									</span>{/if}
							</td>
							<td class="n">{r.shipped}</td>
							<td class="n">{r.approved}</td>
							<td class="n">{r.raccoons}</td>
							<td class="n">{r.fixes}</td>
							<td class="n">{r.merged}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="muted">No round has started yet.</p>
	{/if}

	<h3>Coming up</h3>
	<ul class="soon">
		<li>
			{data.outlook.waiting} fix {data.outlook.waiting === 1 ? 'PR is' : 'PRs are'} waiting on the builder's
			answer. No answer in 24 h means accepted.
		</li>
		<li>
			{data.outlook.unmergedLater} accepted {data.outlook.unmergedLater === 1
				? 'fix is'
				: 'fixes are'} not merged yet. Any still open after the merge deadline land in Unmerged.
		</li>
		<li>Verdicts are due once break week ends.</li>
	</ul>
</section>

<style>
	.card + .card {
		margin-top: var(--s-5);
	}
	.timeline {
		list-style: none;
		margin: 0 0 var(--s-6);
		padding: 0;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--s-4);
	}
	.timeline li {
		position: relative;
		padding-left: var(--s-5);
		color: var(--muted);
	}
	.timeline .done {
		color: var(--text);
	}
	.dot {
		position: absolute;
		left: 0;
		top: var(--s-1);
		width: 12px;
		height: 12px;
		border-radius: var(--r-round);
		border: 2px solid var(--line);
		background: var(--surface);
	}
	.done .dot {
		border-color: var(--success);
		background: var(--success);
	}
	.now .dot {
		border-color: var(--clay);
		background: var(--surface);
	}
	.queues {
		list-style: none;
		margin: 0;
	}
	.queues li + li {
		border-top: 1px solid var(--line);
	}
	.queues a {
		display: grid;
		grid-template-columns: 40px minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--s-4);
		padding: var(--s-3) 0;
		color: var(--muted);
		text-decoration: none;
	}
	.queues li:first-child a {
		padding-top: 0;
	}
	.queues li:last-child a {
		padding-bottom: 0;
	}
	.queues a:hover {
		color: var(--text);
	}
	.queues a:hover b {
		text-decoration: underline;
	}
	b {
		display: block;
		font-weight: 600;
		color: var(--text);
	}
	.meta {
		font-size: var(--fs-1);
	}
	.count {
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: var(--r-1);
		background: var(--well);
		color: var(--muted);
		font: 800 var(--fs-3) / 1 var(--font-display);
	}
	.count.busy {
		background: var(--clay);
		color: #fff;
	}
	h2 {
		margin: 0 0 var(--s-3);
	}
	h3 {
		margin: var(--s-5) 0 var(--s-2);
	}
	.soon {
		margin: 0;
		padding-left: var(--s-5);
		color: var(--muted);
	}
	.soon li + li {
		margin-top: var(--s-1);
	}
	.sub {
		display: block;
	}
	@media (max-width: 760px) {
		.timeline {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			font-size: var(--fs-1);
		}
	}
</style>
