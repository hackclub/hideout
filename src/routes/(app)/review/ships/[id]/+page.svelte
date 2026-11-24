<script lang="ts">
	import { enhance } from '$app/forms';
	import Stamp from '#lib/ui/Stamp.svelte';
	import StaffFlash from '#lib/ui/staff/StaffFlash.svelte';
	import Who from '#lib/ui/staff/Who.svelte';
	import { bugStamp, sevTone, shipStamp } from '#lib/game/labels.js';
	import { age, hrs, repoName, shortSha, et } from '#lib/ui/staff/format.js';
	import { tiers, verdicts } from '#lib/ui/staff/tiers.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const ship = $derived(data.ship);
	const own = $derived(ship.userId === data.me.id);
	const flagged = $derived(data.perDay > 12);
	const next = $derived(data.queue.find((q) => q.id !== ship.id && q.userId !== data.me.id));
	let decision = $state<'approved' | 'changes' | 'rejected'>('approved');
	const buttonText = { approved: 'Approve', changes: 'Send back', rejected: 'Not accepted' };
	const noteHint = {
		approved: 'Optional. The maker sees it.',
		changes: 'Required. Tell them what to fix before they ship again.',
		rejected: 'Required. Tell them why it was not accepted.'
	};
</script>

<svelte:head><title>{data.project.name} · Review desk</title></svelte:head>

<StaffFlash {form} />

<nav class="crumbs small" aria-label="Ships">
	<span><a href="/review/ships">Ships</a> / #{ship.id}</span>
	{#if next}<a href="/review/ships/{next.id}">Next waiting ship</a>{/if}
</nav>

<header class="head">
	<div>
		<h1>{data.project.name}</h1>
		{#if data.project.description}<p>{data.project.description}</p>{/if}
	</div>
	<Stamp {...shipStamp[ship.status]} />
</header>

<div class="split">
	<div class="cards">
		<section class="card">
			<h2>Where to look</h2>
			{#if ship.screenshots.length}
				<div class="shots">
					{#each ship.screenshots as src, i (i)}
						<a href={src} target="_blank" rel="noreferrer">
							<img
								class="shot"
								{src}
								alt="Screenshot {i + 1} of {data.project.name}"
								loading="lazy"
							/>
						</a>
					{/each}
				</div>
			{/if}
			<dl class="facts">
				<dt>Shipped</dt>
				<dd>{age(data.shippedAt, data.now)} ago, in round {data.shipRound.number}</dd>
				<dt>Repo</dt>
				<dd>
					<a href={ship.repoUrl} target="_blank" rel="noreferrer" class="mono">
						{repoName(ship.repoUrl)}
					</a>
				</dd>
				<dt>Frozen at</dt>
				<dd>
					<a
						href="{ship.repoUrl}/tree/{ship.commitSha}"
						target="_blank"
						rel="noreferrer"
						class="mono"
					>
						{shortSha(ship.commitSha)}
					</a>
					<span class="muted small">Review this commit, not the latest one.</span>
				</dd>
				<dt>README</dt>
				<dd>
					<a href="{ship.repoUrl}/tree/{ship.commitSha}#readme" target="_blank" rel="noreferrer">
						Read it
					</a>
					<span class="muted small">It should say what the project does and how to run it.</span>
				</dd>
				<dt>Demo</dt>
				<dd>
					{#if ship.demoUrl}
						<a href={ship.demoUrl} target="_blank" rel="noreferrer">{ship.demoUrl}</a>
					{:else}
						<span class="muted">No demo link, use the run steps.</span>
					{/if}
				</dd>
			</dl>
			{#if ship.runSteps}
				<span class="mini-label">Run steps</span>
				<pre class="steps">{ship.runSteps}</pre>
			{/if}
			{#if data.project.updateDescription}
				<span class="mini-label">Update to an older project. What's new:</span>
				<p class="quote small update">{data.project.updateDescription}</p>
			{/if}
		</section>

		<section class="card">
			<h2>Hours</h2>
			<dl class="facts">
				<dt>Hackatime</dt>
				<dd class="row" style="--gap: var(--s-1)">
					{#each ship.hackatimeProjects as p (p)}<span class="tag mono">{p}</span>{/each}
				</dd>
				<dt>Claimed</dt>
				<dd>
					<strong>{hrs(ship.claimedHours)}</strong>
					<span class="muted small">
						{#if new Date(data.shippedAt) > new Date(data.shipRound.buildStartsAt)}
							from {et(data.shipRound.buildStartsAt)} to {et(data.shippedAt)}
						{:else}
							counted from {et(data.shipRound.buildStartsAt)}
						{/if}
					</span>
				</dd>
				<dt>Per day</dt>
				<dd>
					{data.perDay} h
					{#if flagged}<span class="tag warn">Over 12 h a day</span>{/if}
				</dd>
			</dl>
			{#if flagged}
				<p class="quote warn small">
					That is a lot of time each day. Look at their Hackatime before you approve the full
					amount.
				</p>
			{/if}
		</section>

		<section class="card">
			<h2>Maker</h2>
			<p>
				<Who
					name={data.maker.name}
					github={data.maker.githubLogin}
					href={data.me.role === 'admin' ? `/admin/users/${data.maker.id}` : null}
				/>
				{#if data.maker.banned}<span class="tag bad">Banned</span>{/if}
				<span class="muted small">· joined {et(data.maker.createdAt).replace(' ET', '')}</span>
			</p>
			{#if data.past.length}
				<span class="mini-label">Other ships by them</span>
				<div class="table-scroll">
					<table class="table">
						<thead>
							<tr>
								<th class="n">Round</th><th>Project</th><th>Status</th><th class="n">Tier</th><th
									class="n"
								>
									Hours
								</th><th>Verdict</th>
							</tr>
						</thead>
						<tbody>
							{#each data.past as p (p.id)}
								<tr>
									<td class="n">{p.roundNumber}</td>
									<td><a href="/review/ships/{p.id}">{p.projectName}</a></td>
									<td><Stamp {...shipStamp[p.status]} /></td>
									<td class="n">{p.tier ?? '-'}</td>
									<td class="n">{hrs(p.approvedHours)} / {hrs(p.claimedHours)}</td>
									<td>{p.verdict ? verdicts[p.verdict].label : '-'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="muted small">This is their first ship.</p>
			{/if}
		</section>

		{#if data.fixes.length}
			<section class="card">
				<h2>Fixes on this project</h2>
				<div class="table-scroll">
					<table class="table">
						<thead><tr><th>PR</th><th>Raccoon</th><th>Severity</th><th>Status</th></tr></thead>
						<tbody>
							{#each data.fixes as b (b.id)}
								<tr>
									<td>
										<a class="pr" href={b.prUrl} target="_blank" rel="noreferrer">{b.prTitle}</a>
									</td>
									<td>{b.raccoon}</td>
									<td><Stamp text={b.severity} tone={sevTone[b.severity]} /></td>
									<td><Stamp {...bugStamp[b.status]} /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}
	</div>

	<aside class="card side">
		{#if own}
			<h2>This is your ship</h2>
			<p class="muted">Someone else on the team has to review it.</p>
		{:else if ship.status === 'approved'}
			<h2>Review</h2>
			<dl class="facts">
				<dt>Tier</dt>
				<dd>{ship.tier}</dd>
				<dt>Hours</dt>
				<dd>{hrs(ship.approvedHours)} of {hrs(ship.claimedHours)}</dd>
				<dt>By</dt>
				<dd>
					{data.reviewer ?? '-'}
					{#if ship.reviewedAt}<span class="muted small">{et(ship.reviewedAt)}</span>{/if}
				</dd>
				{#if ship.reviewNote}<dt>Note</dt>
					<dd>{ship.reviewNote}</dd>{/if}
				<dt>Verdict</dt>
				<dd>
					{ship.verdict ? `${verdicts[ship.verdict].label} (${data.verdictBy ?? '-'})` : 'Not yet'}
				</dd>
			</dl>
			{#if data.shipRound.status === 'open'}
				<details>
					<summary>Fix the tier</summary>
					<form method="POST" action="?/review" use:enhance class="stack fix-tier">
						<input type="hidden" name="decision" value="approved" />
						<input type="hidden" name="approvedHours" value={ship.approvedHours} />
						<fieldset class="tiers">
							<legend class="visually-hidden">Tier</legend>
							{#each tiers as t (t.n)}
								<label class="check">
									<input type="radio" name="tier" value={t.n} checked={ship.tier === t.n} />
									{t.title}
								</label>
							{/each}
						</fieldset>
						<p class="muted small">
							Hours stay at {hrs(ship.approvedHours)}. They can't be changed here after approval.
						</p>
						<button class="btn small">Save tier</button>
					</form>
				</details>
			{/if}
		{:else}
			<h2>Your call</h2>
			<p class="muted small">
				Check the README first. If it doesn't say what the project does and how to run it, send it
				back.
			</p>
			{#if ship.status !== 'pending'}
				<p class="quote small">
					{ship.status === 'changes' ? 'Sent back' : 'Not accepted'} by {data.reviewer ??
						'a reviewer'}{ship.reviewNote ? `: ${ship.reviewNote}` : '.'}
				</p>
			{/if}
			<form method="POST" action="?/review" use:enhance class="stack">
				<fieldset>
					<legend class="mini-label">Decision</legend>
					<div class="choices">
						<label class="check">
							<input type="radio" name="decision" value="approved" bind:group={decision} /> Approve
						</label>
						<label class="check">
							<input type="radio" name="decision" value="changes" bind:group={decision} /> Send back
						</label>
						<label class="check">
							<input type="radio" name="decision" value="rejected" bind:group={decision} /> Not accepted
						</label>
					</div>
				</fieldset>

				{#if decision === 'approved'}
					<fieldset>
						<legend class="mini-label">Tier</legend>
						<div class="tiers">
							{#each tiers as t (t.n)}
								<label class="check tier">
									<input type="radio" name="tier" value={t.n} required />
									<span>
										<strong>{t.title}</strong>
										<span class="muted small">
											{t.blurb} Stake {data.config.tierStake[t.n - 1]} points.
										</span>
									</span>
								</label>
							{/each}
						</div>
					</fieldset>
					<div class="field">
						<label for="hours">
							Approved hours <span class="hint">
								They claimed {hrs(ship.claimedHours)}. Lower it if Hackatime looks off.
							</span>
						</label>
						<input
							id="hours"
							name="approvedHours"
							type="number"
							step="0.01"
							min="0"
							max={ship.claimedHours}
							value={ship.claimedHours}
							required
						/>
					</div>
				{/if}

				<div class="field">
					<label for="note">Note <span class="hint">{noteHint[decision]}</span></label>
					<textarea id="note" name="note" required={decision !== 'approved'}></textarea>
				</div>
				<button
					class="btn {decision === 'rejected'
						? 'berry'
						: decision === 'changes'
							? 'acorn'
							: 'leafy'}"
				>
					{buttonText[decision]}
				</button>
			</form>
		{/if}
	</aside>
</div>

<style>
	.crumbs {
		display: flex;
		justify-content: space-between;
		gap: var(--s-4);
		margin-bottom: var(--s-2);
		color: var(--muted);
	}
	.split {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
		gap: var(--s-5);
		align-items: start;
	}
	h2 {
		margin: 0 0 var(--s-3);
	}
	.shots {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--s-3);
		margin-bottom: var(--s-4);
	}
	.shot {
		display: block;
		width: 100%;
		height: auto;
		border: 1px solid var(--line);
		border-radius: var(--r-1);
	}
	.update {
		white-space: pre-wrap;
	}
	.side {
		position: sticky;
		top: var(--s-4);
	}
	.fix-tier {
		margin-top: var(--s-3);
	}
	fieldset {
		border: 0;
		padding: 0;
		margin-inline: 0;
		min-width: 0;
	}
	.choices,
	.tiers {
		display: grid;
		gap: var(--s-2);
	}
	.choices .check {
		padding: var(--s-2) var(--s-3);
	}
	.tier {
		align-items: flex-start;
	}
	.tier input {
		flex: none;
		margin-top: var(--s-1);
	}
	.tier span {
		display: grid;
	}
	.steps {
		margin: 0;
		padding: var(--s-3) var(--s-4);
		background: var(--well);
		border-radius: var(--r-1);
		font-size: var(--fs-1);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	@media (max-width: 900px) {
		.split {
			grid-template-columns: minmax(0, 1fr);
		}
		.side {
			position: static;
		}
	}
</style>
