<script lang="ts">
	import Countdown from '#lib/ui/Countdown.svelte';
	import { roundProgress, type Phase } from '#lib/game/phase.js';

	type Round = {
		number: number;
		phase: Phase;
		buildStartsAt: Date;
		breakStartsAt: Date;
		breakEndsAt: Date;
		scoringEndsAt: Date;
	};

	let { round, now, hidden = false }: { round: Round; now: Date; hidden?: boolean } = $props();

	const offset = $derived(new Date(now).getTime() - Date.now());
	const p = $derived(roundProgress(round, round.phase, new Date(now)));
</script>

<section class="status" class:hidden aria-label="This round">
	<p>
		<span class="k">Round {round.number}</span>
		<span class="v">
			{#if p.deadline?.label === 'starts'}
				Starts in <Countdown to={p.deadline.at} {offset} />
			{:else if p.deadline?.label === 'ship'}
				<Countdown to={p.deadline.at} {offset} /> to ship
			{:else if p.deadline?.label === 'break'}
				<Countdown to={p.deadline.at} {offset} /> left
			{:else if p.deadline?.label === 'merges'}
				Merges count for <Countdown to={p.deadline.at} {offset} />
			{:else if round.phase === 'closed'}
				Round over
			{:else}
				Counting acorns
			{/if}
		</span>
	</p>
	<ol class="steps">
		<li
			class:on={p.step === 'build'}
			style="--p: {p.build}%"
			aria-current={p.step === 'build' ? 'step' : undefined}
		>
			Build
		</li>
		<li
			class:on={p.step === 'break'}
			style="--p: {p.break}%"
			aria-current={p.step === 'break' ? 'step' : undefined}
		>
			Break
		</li>
	</ol>
</section>

<style>
	.hidden {
		display: none;
	}
	p,
	.steps {
		height: var(--row);
		margin: 0;
		padding: 0 var(--s-5);
	}
	p {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.k {
		font-size: var(--fs-1);
		font-weight: 600;
		line-height: 1.3;
		opacity: 0.8;
	}
	.v {
		font: 700 var(--fs-3) / 1.2 var(--font-display);
	}
	.steps {
		list-style: none;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--s-2);
		align-content: center;
	}
	li {
		display: flex;
		flex-direction: column;
		gap: var(--s-1);
		font-size: var(--fs-1);
		line-height: 1.3;
		opacity: 0.8;
	}
	li::before {
		content: '';
		height: 8px;
		border-radius: var(--r-round);
		background: linear-gradient(90deg, currentColor var(--p), rgba(59, 35, 20, 0.2) 0);
	}
	li.on {
		font-weight: 700;
		opacity: 1;
	}

	@media (max-width: 760px) {
		.status,
		.hidden {
			display: block;
			flex: 1;
			min-width: 0;
		}
		p,
		.steps {
			height: auto;
			padding: 0;
		}
		p {
			display: block;
		}
		.k,
		.v {
			display: inline;
			font: 700 var(--fs-2) / 1.3 var(--font-display);
			opacity: 1;
		}
		.v::before {
			content: ' · ';
		}
		.steps {
			margin-top: var(--s-2);
		}
	}
</style>
