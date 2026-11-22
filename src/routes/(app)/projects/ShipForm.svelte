<script lang="ts" module>
	export type Draft = {
		fields: { name: string; repoUrl: string; description: string; demoUrl: string };
		picked: string[];
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import Countdown from '#lib/ui/Countdown.svelte';

	let {
		draft = $bindable(),
		htProjects,
		closesAt,
		offset,
		again,
		keepScreenshot,
		ready,
		details
	}: {
		draft: Draft;
		htProjects: { name: string; seconds: number }[];
		closesAt: Date | string | undefined;
		offset: number;
		again: boolean;
		keepScreenshot: boolean;
		ready: boolean;
		details: boolean;
	} = $props();

	let busy = $state(false);

	const hoursPicked = $derived(
		htProjects.filter((p) => draft.picked.includes(p.name)).reduce((s, p) => s + p.seconds, 0) /
			3600
	);
</script>

<section class="card">
	<div class="head">
		<h2>{again ? 'Ship it again' : 'Ship your project'}</h2>
		{#if closesAt}<span class="chip warn">Closes in <Countdown to={closesAt} {offset} /></span>{/if}
	</div>
	{#if !ready}
		<p class="note">
			Connect Hackatime and link GitHub in <a href="/settings">settings</a> before you ship.
		</p>
	{/if}
	{#if !details}
		<p class="note">
			Hack Club needs your address. Add it on Hack Club Auth, then refresh it in <a
				href="/settings"
			>
				settings
			</a>.
		</p>
	{/if}
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
		<div class="cols">
			<div class="field">
				<label for="name">Name</label>
				<input
					id="name"
					name="name"
					required
					maxlength="60"
					bind:value={draft.fields.name}
					placeholder="Mossy Notes"
				/>
			</div>
			<div class="field">
				<label for="repoUrl">
					GitHub repo <span class="hint">Public, so raccoons can see it</span>
				</label>
				<input
					id="repoUrl"
					name="repoUrl"
					type="url"
					required
					bind:value={draft.fields.repoUrl}
					placeholder="https://github.com/you/project"
				/>
			</div>
		</div>
		<div class="field">
			<label for="description">What is it? <span class="hint">One or two sentences</span></label>
			<textarea
				id="description"
				name="description"
				rows="2"
				maxlength="500"
				bind:value={draft.fields.description}></textarea>
		</div>
		<div class="field">
			<label for="demoUrl">Demo link <span class="hint">Where raccoons can try it</span></label>
			<input
				id="demoUrl"
				name="demoUrl"
				type="url"
				required
				bind:value={draft.fields.demoUrl}
				placeholder="https://..."
			/>
		</div>
		<div class="field">
			<label for="screenshot">
				Screenshot
				<span class="hint">
					{keepScreenshot
						? 'Leave it empty to keep the one you shipped before'
						: 'The screenshot would appear on your project card. PNG, JPEG or WebP, under 5MB'}
				</span>
			</label>
			<input
				id="screenshot"
				name="screenshot"
				type="file"
				accept="image/png,image/jpeg,image/webp"
				required={!keepScreenshot}
			/>
		</div>

		<p>Your README has to say what the project does and how to run it</p>

		<fieldset>
			<legend>
				Hackatime projects <span class="hint">
					Pick the ones you worked on for this. Only time from this round counts.
				</span>
			</legend>
			{#if htProjects.length}
				<div class="grid ht">
					{#each htProjects as p (p.name)}
						<label class="check">
							<input type="checkbox" name="hackatime" value={p.name} bind:group={draft.picked} />
							<span class="mono">{p.name}</span>
							<span class="muted hours">{(p.seconds / 3600).toFixed(1)}h</span>
						</label>
					{/each}
				</div>
				<p class="hint">Picked: <strong>{hoursPicked.toFixed(1)}h</strong></p>
			{:else}
				<p class="muted">
					No Hackatime time this round yet. Is Hackatime installed in your editor?
				</p>
			{/if}
		</fieldset>

		<div class="row">
			<button class="btn big" disabled={busy}>{busy ? 'Shipping…' : 'Ship it'}</button>
			<span class="hint">Shipping freezes your repo at its current commit for this round.</span>
		</div>
	</form>
</section>

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-3);
		margin-bottom: var(--s-5);
	}
	h2 {
		font-size: var(--fs-4);
		margin: 0;
	}
	.note {
		margin: 0 0 var(--s-5);
	}
	form > * + * {
		margin-top: var(--s-5);
	}
	.cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--s-4);
		align-items: end;
	}
	.cols .field + .field {
		margin-top: 0;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin-inline: 0;
	}
	legend {
		font-weight: 600;
		margin-bottom: var(--s-2);
		padding: 0;
	}
	.ht {
		--min: 220px;
		--gap: var(--s-2);
	}
	.hours {
		margin-left: auto;
		font-size: var(--fs-1);
	}
	fieldset p {
		margin: var(--s-2) 0 0;
	}
	@media (max-width: 700px) {
		.cols {
			grid-template-columns: 1fr;
		}
	}
</style>
