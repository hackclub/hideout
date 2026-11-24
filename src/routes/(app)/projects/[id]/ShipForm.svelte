<script lang="ts" module>
	export type Draft = {
		fields: {
			name: string;
			repoUrl: string;
			description: string;
			demoUrl: string;
			updateDescription: string;
		};
		isUpdate: boolean;
		picked: string[];
		kairosPicked: string[];
	};
</script>

<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import Countdown from '#lib/ui/Countdown.svelte';
	import Flash from '#lib/ui/Flash.svelte';

	let {
		draft = $bindable(),
		form,
		htProjects,
		htDown,
		kairosProjects,
		kairos,
		taken,
		building,
		screenshots,
		closesAt,
		offset,
		again,
		ready,
		details
	}: {
		draft: Draft;
		form: { ok?: boolean; message?: string | null } | null | undefined;
		htProjects: { name: string; seconds: number }[];
		htDown: boolean;
		kairosProjects: { name: string; seconds: number }[];
		kairos: 'off' | 'none' | 'down' | 'ok';
		taken: string[];
		building: boolean;
		screenshots: string[];
		closesAt: Date | string | undefined;
		offset: number;
		again: boolean;
		ready: boolean;
		details: boolean;
	} = $props();

	let busy = $state<'save' | 'ship' | null>(null);

	const hoursPicked = $derived(
		htProjects.filter((p) => draft.picked.includes(p.name)).reduce((s, p) => s + p.seconds, 0) /
			3600
	);
</script>

<section class="card">
	<div class="head">
		<h2>{again ? 'Ship it again' : building ? 'Ship your project' : 'Edit your project'}</h2>
		{#if building && closesAt}
			<span class="chip warn">Closes in <Countdown to={closesAt} {offset} /></span>
		{/if}
	</div>
	{#if !building}
		<p class="note">
			{again
				? "This round is over, so it can't be shipped again. Make a new project next round and tick the update box."
				: 'You can ship it once build week starts. Save it for now.'}
		</p>
	{/if}
	{#if building && !ready}
		<p class="note">
			Connect Hackatime and link GitHub in <a href="/settings">settings</a> before you ship.
		</p>
	{/if}
	{#if building && !details}
		<p class="note">
			Hack Club needs your address and birthday. Add them on Hack Club Auth, then refresh them in <a
				href="/settings"
			>
				settings
			</a>.
		</p>
	{/if}
	<form
		method="POST"
		action="?/save"
		enctype="multipart/form-data"
		use:enhance={({ action, submitter, formElement, formData, cancel }) => {
			if ([...formData.values()].some((v) => v instanceof File && v.size > 5 * 1024 * 1024)) {
				cancel();
				applyAction({
					type: 'failure',
					status: 400,
					location: action.pathname,
					data: { ok: false, message: 'That screenshot is too big. Keep it under 5MB.' }
				});
				return;
			}
			busy = submitter?.getAttribute('formaction') === '?/ship' ? 'ship' : 'save';
			return async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success')
					formElement
						.querySelectorAll<HTMLInputElement>('input[type=file]')
						.forEach((input) => (input.value = ''));
				busy = null;
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
					minlength="2"
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
				required
				maxlength="1000"
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

		<div class="cols shots">
			{#each [0, 1] as i (i)}
				<div class="field">
					<label for="screenshot{i + 1}">
						Screenshot {i + 1}
						<span class="hint">
							{screenshots[i] ? 'Leave it empty to keep this one' : 'PNG, JPEG or WebP, under 5MB'}
						</span>
					</label>
					{#if screenshots[i]}
						<img class="shot" src={screenshots[i]} alt="Screenshot {i + 1}" loading="lazy" />
					{/if}
					<input
						id="screenshot{i + 1}"
						name="screenshot{i + 1}"
						type="file"
						accept="image/png,image/jpeg,image/webp"
						required={!screenshots[i]}
					/>
				</div>
			{/each}
		</div>

		<div class="update">
			<label class="check">
				<input type="checkbox" name="isUpdate" bind:checked={draft.isUpdate} />
				<span>
					This project was started before this round, or was shipped before to Hack Club (including
					Hideout).
				</span>
			</label>
			{#if draft.isUpdate}
				<div class="field">
					<label for="updateDescription">
						What's new? <span class="hint">What you added or changed this round</span>
					</label>
					<textarea
						id="updateDescription"
						name="updateDescription"
						rows="3"
						required
						maxlength="1000"
						bind:value={draft.fields.updateDescription}></textarea>
				</div>
			{/if}
		</div>

		<p>Your README has to explain what the project does and how to run it</p>

		<fieldset>
			<legend>
				Hackatime projects
				<span class="hint">
					{building
						? "Pick the ones you worked on for this. Hours count from the start of this round's build week."
						: 'Pick the ones you work on for this. Only build week hours count when you ship.'}
				</span>
			</legend>
			{#if htDown}
				<p class="note">Hackatime didn't answer. Refresh this page in a minute.</p>
			{/if}
			{#if htProjects.length}
				<div class="grid ht">
					{#each htProjects as p (p.name)}
						{@const used = taken.includes(p.name)}
						<label class="check" class:used>
							<input
								type="checkbox"
								name="hackatime"
								value={p.name}
								disabled={used && !draft.picked.includes(p.name)}
								bind:group={draft.picked}
							/>
							<span class="mono">{p.name}</span>
							<span class="muted hours">
								{used ? 'in another ship' : `${(p.seconds / 3600).toFixed(1)}h`}
							</span>
						</label>
					{/each}
				</div>
				<p class="hint">
					Picked: <strong>{hoursPicked.toFixed(1)}h</strong>
				</p>
			{:else if !htDown}
				<p class="muted">
					No Hackatime time {building ? 'this round' : ''} yet. Is Hackatime installed in your editor?
				</p>
			{/if}
		</fieldset>

		{#if kairos !== 'off'}
			<fieldset>
				<legend>
					Kairos projects
					<span class="hint">Pick the ones you worked on for this.</span>
				</legend>
				{#if kairos === 'none'}
					<p class="note">
						You need Kairos to ship. Get it at <a
							href="https://kairos.hackclub.com"
							target="_blank"
							rel="noopener"
						>
							kairos.hackclub.com
						</a>, then come back and pick your project.
					</p>
				{:else if kairos === 'down'}
					<p class="note">Kairos didn't answer. Refresh this page in a minute.</p>
				{/if}
				{#if kairosProjects.length}
					<div class="grid ht">
						{#each kairosProjects as p (p.name)}
							<label class="check">
								<input
									type="checkbox"
									name="kairos"
									value={p.name}
									bind:group={draft.kairosPicked}
								/>
								<span class="mono">{p.name}</span>
								<span class="muted hours">{(p.seconds / 3600).toFixed(1)}h</span>
							</label>
						{/each}
					</div>
				{:else if kairos === 'ok'}
					<p class="muted">No Kairos time this round yet. Is Kairos running?</p>
				{/if}
			</fieldset>
		{/if}

		<Flash {form} />
		<div class="row">
			<button class="btn ghost" formaction="?/save" formnovalidate disabled={busy !== null}>
				{busy === 'save' ? 'Saving…' : 'Save'}
			</button>
			{#if building}
				<button class="btn big" formaction="?/ship" disabled={busy !== null}>
					{busy === 'ship' ? 'Shipping…' : 'Ship it'}
				</button>
				<span class="hint">
					Shipping freezes your repo at its current commit. You can't edit it after that.
				</span>
			{/if}
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
	.shots {
		align-items: start;
	}
	.shot {
		display: block;
		width: 100%;
		max-height: 180px;
		object-fit: contain;
		margin-bottom: var(--s-2);
		background: var(--well);
		border: 1px solid var(--line);
		border-radius: var(--r-1);
	}
	.update .field {
		margin-top: var(--s-4);
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
	.used:not(:has(input:checked)) {
		opacity: 0.6;
		cursor: not-allowed;
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
