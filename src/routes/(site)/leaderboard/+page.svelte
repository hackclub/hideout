<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const fmt = (n: number) => (Number.isInteger(n) ? n : n.toFixed(1));
</script>

<svelte:head><title>Leaderboard · Hideout</title></svelte:head>

<div class="wrap page">
	<header class="page-head">
		<h1>Leaderboard</h1>
		{#if data.season}<p>
				{data.season.name} so far{data.live ? ', including the round in progress' : ''}.
			</p>{/if}
	</header>

	{#if !data.season}
		<p class="card muted">No season yet.</p>
	{:else}
		<div class="boards">
			<section class="card">
				<h2>Builders</h2>
				<p class="muted">Points for cool projects.</p>
				{#if data.builders.length}
					<table class="table">
						<thead><tr><th>#</th><th>Name</th><th class="num">Points</th></tr></thead>
						<tbody>
							{#each data.builders as r, i (r.userId)}
								<tr>
									<td class="muted">{i + 1}</td><td>{r.name}</td><td class="num">
										{fmt(r.builder)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="muted">No points yet. Rounds count after break week.</p>
				{/if}
			</section>
			<section class="card">
				<h2>Raccoons</h2>
				<p class="muted">Points for merged fixes.</p>
				{#if data.raccoons.length}
					<table class="table">
						<thead>
							<tr><th>#</th><th>Name</th><th class="num">Fixes</th><th class="num">Points</th></tr>
						</thead>
						<tbody>
							{#each data.raccoons as r, i (r.userId)}
								<tr>
									<td class="muted">{i + 1}</td><td>{r.name}</td><td class="num">{r.fixes}</td><td
										class="num"
									>
										{fmt(r.raccoon)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="muted">No fixes merged yet.</p>
				{/if}
			</section>
		</div>
	{/if}
</div>

<style>
	.page {
		padding: var(--s-5) 0 calc(var(--s-8) * 2);
	}
	.boards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--s-5);
		align-items: start;
	}
	h2 {
		font-size: var(--fs-4);
		margin: 0;
	}
	.card > p {
		margin: var(--s-1) 0 var(--s-4);
	}
	.card > p:last-child {
		margin-bottom: 0;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	th:first-child,
	td:first-child {
		width: var(--s-6);
	}

	@media (max-width: 760px) {
		.boards {
			grid-template-columns: 1fr;
		}
	}
</style>
