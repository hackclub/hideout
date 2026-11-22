<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		assignmentId,
		repoUrl,
		fixPoints
	}: { assignmentId: number; repoUrl: string; fixPoints: number[] } = $props();

	const levels = [
		{ value: 'minor', label: 'Minor' },
		{ value: 'major', label: 'Major' },
		{ value: 'critical', label: 'Critical' }
	];
</script>

<form method="POST" action="?/fix" use:enhance>
	<input type="hidden" name="assignmentId" value={assignmentId} />
	<div class="field">
		<label for="pr">Pull request link</label>
		<input id="pr" name="prUrl" type="url" required placeholder="{repoUrl}/pull/1" />
	</div>
	<fieldset class="field">
		<legend>How bad is it?</legend>
		<div class="sev">
			{#each levels as l, i (l.value)}
				<label class="check">
					<input type="radio" name="severity" value={l.value} required={i === 0} />
					{l.label}
					<span class="muted">{fixPoints[i]} pts</span>
				</label>
			{/each}
		</div>
	</fieldset>
	<div class="field">
		<label for="note">Note for the builder <span class="hint">Optional</span></label>
		<textarea id="note" name="note" rows="2"></textarea>
	</div>
	<button class="btn">Send fix</button>
</form>

<style>
	fieldset {
		min-width: 0;
		border: 0;
		padding: 0;
		margin-inline: 0;
	}
	legend {
		padding: 0;
		margin-bottom: var(--s-1);
		font-weight: 600;
	}
	.sev {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--s-2);
	}
	.sev label {
		position: relative;
		flex-direction: column;
		gap: 0;
		padding: var(--s-2);
	}
	.sev input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.sev label:has(:focus-visible) {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}
	.sev .muted {
		font-size: var(--fs-1);
	}
	.btn {
		margin-top: var(--s-5);
	}
</style>
