<script lang="ts">
	import { enhance } from '$app/forms';
	import { bugStamp } from '#lib/game/labels.js';
	import type { PageData } from './$types';

	let {
		a,
		prs,
		htProjects
	}: { a: PageData['t']['a']; prs: PageData['t']['fixes']; htProjects: PageData['htProjects'] } =
		$props();

	let busy = $state(false);
	const keepScreenshot = $derived(Boolean(a.forkScreenshotUrl));
</script>

<div class="head">
	<h2>Ship your fixes</h2>
	{#if a.hoursStatus === 'approved'}<span class="chip ok">{a.approvedHours}h approved</span>{/if}
	{#if a.hoursStatus === 'pending'}<span class="chip info">
			{a.claimedHours}h waiting for review
		</span>{/if}
	{#if a.hoursStatus === 'rejected'}<span class="chip bad">Not approved</span>{/if}
</div>

{#if a.hoursStatus === 'rejected' && a.hoursNote}
	<p class="note">Reviewer: {a.hoursNote}</p>
{/if}

{#if a.hoursStatus === 'approved'}
	<p class="links">
		{#if a.forkDemoUrl}<a class="btn small ghost" href={a.forkDemoUrl}>Your demo</a>{/if}
		{#if a.forkUrl}<a class="btn small ghost" href={a.forkUrl}>Your fork</a>{/if}
	</p>
{:else if prs.length === 0}
	<p class="muted">
		Send a fix PR first. Once one is in, put your fixes on your own fork, deploy it and ship it here
		to get your hours.
	</p>
{:else}
	<p class="muted">
		Fork the project, put your fixes in, and deploy your fork so anyone can try it. Your own keys
		and hosting.
	</p>
	<form
		method="POST"
		action="?/ship"
		enctype="multipart/form-data"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		<input type="hidden" name="assignmentId" value={a.id} />
		<div class="field">
			<label for="fork">
				Your fork <span class="hint">On your GitHub, forked from this project</span>
			</label>
			<input
				id="fork"
				name="forkUrl"
				type="url"
				required
				value={a.forkUrl ?? ''}
				placeholder="https://github.com/you/project"
			/>
		</div>
		<div class="field">
			<label for="demo">
				Demo of your fixed version <span class="hint">Where anyone can try it, no building</span>
			</label>
			<input
				id="demo"
				name="demoUrl"
				type="url"
				required
				value={a.forkDemoUrl ?? ''}
				placeholder="https://..."
			/>
		</div>
		<div class="field">
			<label for="shot">
				Screenshot
				<span class="hint">
					{keepScreenshot
						? 'Leave it empty to keep the one you sent before'
						: 'Of your fixed version. PNG, JPEG or WebP, under 5MB'}
				</span>
			</label>
			<input
				id="shot"
				name="screenshot"
				type="file"
				accept="image/png,image/jpeg,image/webp"
				required={!keepScreenshot}
			/>
		</div>
		<div class="field">
			<span class="label">Fix PRs that go with it</span>
			<ul class="prs">
				{#each prs as f (f.id)}
					<li>
						<a href={f.prUrl}>#{f.prNumber} {f.prTitle}</a>
						<span class="muted">{bugStamp[f.status].text}</span>
					</li>
				{/each}
			</ul>
		</div>
		<div class="field">
			<label for="ht">
				Hackatime project for this target <span class="hint">Use a separate one for each fork</span>
			</label>
			<select id="ht" name="project" required>
				<option value="">Pick one</option>
				{#each htProjects as p (p.name)}
					<option value={p.name} selected={a.hackatimeProject === p.name}>
						{p.name} ({(p.seconds / 3600).toFixed(1)}h)
					</option>
				{/each}
			</select>
		</div>
		<div class="field">
			<label for="tried">What did you work on?</label>
			<textarea id="tried" name="note" rows="2" required>{a.note ?? ''}</textarea>
		</div>
		<button class="btn small" disabled={busy}>
			{busy ? 'Shipping…' : a.hoursStatus === 'none' ? 'Ship fixes' : 'Ship again'}
		</button>
	</form>
{/if}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-2) var(--s-3);
		margin-bottom: var(--s-4);
	}
	h2 {
		margin: 0;
		font-size: var(--fs-4);
	}
	.note,
	.muted {
		margin: 0 0 var(--s-4);
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2);
		margin: 0;
	}
	.label {
		display: block;
		font-weight: 600;
	}
	.prs {
		margin: var(--s-1) 0 0;
		padding-left: var(--s-5);
	}
	.prs .muted {
		margin: 0;
		font-size: var(--fs-1);
	}
	button {
		margin-top: var(--s-5);
	}
</style>
