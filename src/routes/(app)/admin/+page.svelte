<script lang="ts">
	import { enhance } from '$app/forms';
	import Acorn from '#lib/ui/Acorn.svelte';
	import Stamp from '#lib/ui/Stamp.svelte';
	import StaffFlash from '#lib/ui/staff/StaffFlash.svelte';
	import { phaseLabel } from '#lib/game/phase.js';
	import { num, utc, utcInput } from '#lib/ui/staff/format.js';
	import { keep } from '#lib/ui/staff/forms.js';
	import Facts from './_components/Facts.svelte';
	import Fields from './_components/Fields.svelte';
	import PageHead from './_components/PageHead.svelte';
	import Panel from './_components/Panel.svelte';
	import Split from './_components/Split.svelte';
	import Stats from './_components/Stats.svelte';
	import Table from './_components/Table.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const phaseTone = {
		upcoming: 'plain',
		build: 'info',
		break: 'warn',
		scoring: 'warn',
		ready: 'ok',
		closed: 'plain'
	} as const;

	const blockerInfo: Record<string, { label: string; href: string }> = {
		pendingShips: { label: 'ships waiting for review', href: '/review/ships' },
		openDisputes: { label: 'open disputes', href: '/review/disputes' },
		pendingHours: { label: 'break hours waiting', href: '/review/hours' },
		missingVerdicts: { label: 'missing verdicts', href: '/review/verdicts' },
		uncheckedFixes: { label: 'spot checks left', href: '/review/checks' },
		unmergedFixes: { label: 'unmerged fixes to settle', href: '/review/unmerged' }
	};

	const settingHelp: [string, string][] = [
		['baseAcornsPerHour', 'Acorns paid per approved hour, right away.'],
		['poolAcornsPerHour', 'Acorns added to the round pool per approved hour.'],
		['acornCents', 'What 1 acorn is worth, in US cents.'],
		['capMultiplier', "Bonus cap, as a multiple of the person's base acorns that round."],
		['targetsPerRaccoon', 'Targets each raccoon gets.'],
		['responseHours', 'Hours a builder has to answer a fix PR.'],
		['scoringHours', 'Wrap-up after break week. Merges count until it ends.'],
		['fixPoints', 'Raccoon points per merged fix [minor, major, critical].'],
		['findValue', 'Points a valid bug takes off the builder [minor, major, critical].'],
		['tierStake', 'Builder starting points [tier 1, 2, 3].'],
		['maxPairPrsPerRound', 'Most fixes one raccoon can send to one project in a round.'],
		[
			'unbreakableMultiplier',
			'Unbreakable bonus: stake multiplier for a really good project that survived real attacks.'
		],
		['checkRates', 'Share of fixes that get a spot check [minor, major, critical], 0 to 1.'],
		[
			'shipMinHours',
			'Minimum hours for each ship in a round, lowest first. Its length is the most ships a round.'
		]
	];

	const blockers = $derived(
		data.preview ? Object.entries(data.preview.blockers).filter(([, n]) => n > 0) : []
	);
</script>

<StaffFlash {form} />

<PageHead title="Rounds">
	{#if data.season}
		{data.season.name} started {utc(data.season.startsAt)}. All times here are UTC.
	{:else}
		No season yet. Run the seed script to create one.
	{/if}
</PageHead>

{#if data.season}
	<Panel>
		<ul class="rounds">
			{#each data.rounds as r (r.id)}
				{@const open = r.status === 'open'}
				<li>
					<div class="top">
						<h2>Round {r.number}</h2>
						<Stamp text={phaseLabel[r.phase]} tone={phaseTone[r.phase]} />
						{#if r.assignedAt}<span class="meta">Targets out {utc(r.assignedAt)}</span>{/if}
						{#if r.rolloverIn > 0}<span class="meta">
								{num(r.rolloverIn)} acorns rolled in
							</span>{/if}
						<a class="btn small ghost" href="?preview={r.id}#preview" data-sveltekit-reset>
							{open ? 'Preview payout' : 'See payout'}
						</a>
					</div>

					{#if open}
						<form method="POST" action="?/dates" use:enhance={keep}>
							<input type="hidden" name="roundId" value={r.id} />
							<Fields>
								<div class="field">
									<label for="b-{r.id}">Build week starts</label>
									<input
										id="b-{r.id}"
										type="datetime-local"
										name="buildStartsAt"
										value={utcInput(r.buildStartsAt)}
										required
									/>
								</div>
								<div class="field">
									<label for="k-{r.id}">Break week starts</label>
									<input
										id="k-{r.id}"
										type="datetime-local"
										name="breakStartsAt"
										value={utcInput(r.breakStartsAt)}
										required
									/>
								</div>
								<div class="field">
									<label for="e-{r.id}">Break week ends</label>
									<input
										id="e-{r.id}"
										type="datetime-local"
										name="breakEndsAt"
										value={utcInput(r.breakEndsAt)}
										required
									/>
								</div>
								<div><button class="btn small">Save dates</button></div>
							</Fields>
							<p class="meta">Merges count until {utc(r.scoringEndsAt)}.</p>
						</form>
					{:else}
						<Facts>
							<dt>Build</dt>
							<dd>{utc(r.buildStartsAt)}</dd>
							<dt>Break</dt>
							<dd>{utc(r.breakStartsAt)} to {utc(r.breakEndsAt)}</dd>
							<dt>Closed</dt>
							<dd>{utc(r.closedAt)}</dd>
							<dt>Paid</dt>
							<dd>
								pool <Acorn size={14} />
								{num(r.pool)} · point value {num(r.pointValue, 3)} · rolled over {num(
									r.rolloverOut
								)}
							</dd>
						</Facts>
					{/if}

					{#if open && !r.assignedAt && ['break', 'scoring', 'ready'].includes(r.phase)}
						<form method="POST" action="?/assign" use:enhance class="row">
							<input type="hidden" name="roundId" value={r.id} />
							<button class="btn small">Hand out targets now</button>
							<span class="meta">This normally happens by itself when break week starts.</span>
						</form>
					{/if}

					{#if open && ['scoring', 'ready'].includes(r.phase)}
						<form method="POST" action="?/close" use:enhance class="row">
							<input type="hidden" name="roundId" value={r.id} />
							<label class="check">
								<input type="checkbox" name="confirm" value="yes" required />
								I looked at the preview. Pay out round {r.number} now.
							</label>
							<button class="btn small berry" disabled={r.phase !== 'ready'}>Close round</button>
							{#if r.phase !== 'ready'}<span class="meta">
									Opens after {utc(r.scoringEndsAt)}.
								</span>{/if}
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	</Panel>

	{#if data.preview}
		{@const p = data.preview}
		<Panel
			id="preview"
			title="Round {p.number} payout{p.status === 'closed' ? ', worked out again' : ' preview'}"
			note={p.status === 'closed'
				? "This round is closed. These numbers come from today's data and may differ from what was paid."
				: 'Nothing is saved until you close the round.'}
		>
			{#snippet actions()}<a class="btn small ghost" href="?">Hide</a>{/snippet}
			<Stats
				items={[
					{ label: 'Pool', value: num(p.pool), acorns: true },
					{ label: 'Point value', value: num(p.pointValue, 3) },
					{ label: 'Rolls over', value: num(p.rollover), acorns: true },
					{ label: 'People', value: p.rows.length }
				]}
			/>
			{#if blockers.length}
				<div class="blocked">
					<strong>Can't close yet.</strong>
					<ul>
						{#each blockers as [key, n] (key)}
							<li><a href={blockerInfo[key]?.href}>{n} {blockerInfo[key]?.label ?? key}</a></li>
						{/each}
					</ul>
				</div>
			{:else}
				<p><span class="chip ok">Nothing is blocking the close</span></p>
			{/if}
			{#if p.rows.length}
				<Table>
					<thead>
						<tr>
							<th>Person</th>
							<th class="n">Raccoon pts</th>
							<th class="n">Builder pts</th>
							<th class="n">Total pts</th>
							<th class="n">Base acorns</th>
							<th class="n">Bonus</th>
							<th class="n" title="Cut off by the cap, rolls over">Capped</th>
						</tr>
					</thead>
					<tbody>
						{#each p.rows as row (row.userId)}
							<tr>
								<td class="nowrap"><a href="/admin/users/{row.userId}">{row.name}</a></td>
								<td class="n">{num(row.raccoon)}</td>
								<td class="n">{num(row.builder)}</td>
								<td class="n"><strong>{num(row.points)}</strong></td>
								<td class="n">{num(row.base)}</td>
								<td class="n"><strong>{num(row.bonus)}</strong></td>
								<td class="n">{row.capped > 0 ? num(row.capped) : '-'}</td>
							</tr>
						{/each}
					</tbody>
				</Table>
			{:else}
				<p class="muted">Nobody has points or approved hours in this round yet.</p>
			{/if}
		</Panel>
	{/if}

	<Split>
		<Panel
			title="Season settings"
			note="Numbers only. Changes apply to every open round of {data.season.name} right away."
		>
			<form method="POST" action="?/config" use:enhance={keep}>
				<input type="hidden" name="seasonId" value={data.season.id} />
				<label for="config" class="visually-hidden">Season settings as JSON</label>
				<textarea id="config" name="config" class="mono" spellcheck="false" rows="18"
					>{data.configText}</textarea
				>
				<button class="btn small">Save settings</button>
			</form>
			<details>
				<summary>What each setting means</summary>
				<Facts>
					{#each settingHelp as [k, v] (k)}<dt class="mono">{k}</dt>
						<dd>{v}</dd>{/each}
				</Facts>
			</details>
		</Panel>

		{#snippet aside()}
			<Panel
				title="Leftover pool"
				note="Acorns nobody could take after round 4 land here. Nothing pays them out, so use them for extra prizes however you like."
			>
				<form method="POST" action="?/prize" use:enhance={keep}>
					<input type="hidden" name="seasonId" value={data.season.id} />
					<Fields min="120px">
						<div class="field">
							<label for="prize">Acorns</label>
							<input
								id="prize"
								type="number"
								name="prizePool"
								min="0"
								step="0.01"
								value={data.season.prizePool}
							/>
						</div>
						<div><button class="btn small">Save</button></div>
					</Fields>
				</form>
			</Panel>
		{/snippet}
	</Split>
{/if}

<style>
	.rounds {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.rounds > li {
		display: grid;
		gap: var(--s-3);
		padding: var(--s-5) 0;
		border-top: 1px solid var(--line);
	}
	.rounds > li:first-child {
		padding-top: 0;
		border-top: 0;
	}
	.rounds > li:last-child {
		padding-bottom: 0;
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--s-2) var(--s-3);
	}
	.top h2 {
		margin: 0;
		font-size: var(--fs-3);
	}
	.top .btn {
		margin-left: auto;
	}
	form .meta {
		margin: var(--s-2) 0 0;
	}
	.blocked {
		margin-bottom: var(--s-4);
		padding: var(--s-3) var(--s-4);
		color: var(--bad-ink);
		background: var(--bad-tint);
		border-radius: var(--r-1);
	}
	.blocked ul {
		margin: var(--s-1) 0 0;
		padding-left: var(--s-5);
	}
	.blocked a {
		color: inherit;
	}
	textarea {
		min-height: 400px;
		margin-bottom: var(--s-3);
		font-size: var(--fs-1);
		line-height: 1.5;
	}
	details {
		margin-top: var(--s-4);
	}
	summary {
		margin-bottom: var(--s-3);
		font-weight: 600;
		color: var(--link);
		cursor: pointer;
	}
</style>
