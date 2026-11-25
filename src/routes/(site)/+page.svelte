<script lang="ts">
	import { faq, site } from '#lib/content/copy.js';
	import { FRIEND_ACORNS } from '#lib/game/invites.js';
	import Faq from './Faq.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const steps = [
		{
			title: 'Build week',
			when: 'Days 1 to 7',
			text: 'Build any coding project and ship it properly. Every approved hour gets you 10 acorns, our shop currency you can trade for prizes.'
		},
		{
			title: 'Break week',
			when: 'Days 8 to 14',
			text: 'You get 3 other projects to break. For every bug you find, send a pull request that fixes it. Every approved hour you spend breaking and fixing gets you 10 acorns too.'
		},
		{
			title: 'Bonus',
			when: 'When the round ends',
			text: 'At the end of each round, we split a bonus pool by points. You get points for finding and fixing bugs in other projects and for keeping your own project unbreakable, and you lose points when someone finds bugs in yours.'
		}
	];
</script>

<svelte:head>
	<title>Hideout · {site.tagline}</title>
	<meta
		name="description"
		content="Build your best project for a week, then spend a week breaking other people's projects."
	/>
</svelte:head>

<section class="wrap hero">
	{#if data.invitedBy}
		<p class="invited">
			{data.invitedBy} invited you. Ship your first project for {FRIEND_ACORNS} bonus acorns.
		</p>
	{/if}
	<h1><span>Build your hideout.</span> <span>Keep Heidi out.</span></h1>
	<p class="lead">
		Build your best project for a week, then spend a week breaking other people's projects.
	</p>
	<a class="btn big" href={data.user ? '/home' : '/login'}>
		{data.user ? 'Open Hideout' : 'Join Hideout'}
	</a>
</section>

<div class="wrap">
	<section class="sec card">
		<h2>What's Hideout?</h2>
		<div class="about">
			<p>It's a Hack Club program where you ship technical projects and get free prizes.</p>
			<p>
				It has 2 parts: you build an awesome project for a week, then the next week you try to break
				other people's projects by finding bugs and fixing them, while they try to break yours.
				That's how open source works in real life :)
			</p>
			<p>Hideout runs for 4 rounds, and each round is 2 weeks.</p>
		</div>
	</section>

	<section class="sec card">
		<h2>How a round works</h2>
		<ol class="steps">
			{#each steps as s, i (s.title)}
				<li>
					<span class="num" aria-hidden="true">{i + 1}</span>
					<div>
						<h3>{s.title}</h3>
						<p class="meta">{s.when}</p>
						<p>{s.text}</p>
					</div>
				</li>
			{/each}
		</ol>
	</section>

	<section class="sec card">
		<h2>Questions</h2>
		<Faq items={faq} />
	</section>
</div>

<style>
	.hero {
		padding-block: var(--s-8) var(--s-7);
	}
	.invited {
		display: inline-block;
		margin: 0 0 var(--s-5);
		padding: var(--s-2) var(--s-4);
		font-weight: 600;
		background: var(--surface);
		border-radius: var(--r-1);
	}
	h1 {
		margin: 0;
		font-size: clamp(var(--fs-6), 6vw, calc(var(--fs-6) * 2));
		line-height: 1.05;
	}
	h1 span {
		display: block;
	}
	.lead {
		max-width: 44ch;
		margin: var(--s-4) 0 var(--s-6);
		font-size: var(--fs-3);
		font-weight: 500;
	}
	.sec {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
		gap: var(--s-5) var(--s-7);
		align-items: start;
		margin-bottom: var(--s-6);
		padding: var(--s-6);
	}
	.sec:last-child {
		margin-bottom: calc(var(--s-8) * 2);
	}
	h2 {
		margin: 0;
	}
	.about {
		max-width: 60ch;
		font-size: var(--fs-3);
	}
	.about p:last-child {
		margin: 0;
	}
	.steps {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.steps li {
		display: grid;
		grid-template-columns: var(--s-7) minmax(0, 1fr);
		gap: var(--s-4);
		padding-block: var(--s-4);
	}
	.steps li + li {
		border-top: 1px solid var(--line);
	}
	.steps li:first-child {
		padding-top: 0;
	}
	.steps li:last-child {
		padding-bottom: 0;
	}
	.num {
		font: 800 var(--fs-5) / 1 var(--font-display);
	}
	h3 {
		margin: 0;
	}
	.steps .meta {
		margin: 0 0 var(--s-2);
	}
	.steps p:last-child {
		max-width: 60ch;
		margin: 0;
	}

	@media (max-width: 760px) {
		.hero {
			padding-block: var(--s-7);
		}
		.lead {
			font-size: var(--fs-2);
		}
		.sec {
			grid-template-columns: minmax(0, 1fr);
			margin-bottom: var(--s-5);
			padding: var(--s-4);
		}
		.about {
			font-size: var(--fs-2);
		}
	}
</style>
