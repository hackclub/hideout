<script lang="ts">
	import { rules } from '#lib/content/copy.js';
	const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-');
</script>

<svelte:head><title>How it works · Hideout</title></svelte:head>

<div class="narrow page">
	<header class="page-head">
		<h1>How it works</h1>
		<p>{rules.intro}</p>
	</header>

	<article class="card">
		{#each rules.sections as s (s.title)}
			<section id={slug(s.title)}>
				<h2>{s.title}</h2>
				<ul>
					{#each s.items as item (item)}<li>{item}</li>{/each}
				</ul>
			</section>
		{/each}

		<section id="example">
			<h2>An example round</h2>
			<div class="example">
				<p>
					Say a round has 100 people and 1,600 approved hours. The pool is 16,000 acorns. Everyone
					earns 3,200 points in total, so each point is worth 5 acorns.
				</p>
				<p>
					Maya logs 10 hours building and 6 hours breaking, which is 160 acorns. Two of her fixes
					get merged, a major (15) and a minor (5). Her tier 2 project had one minor bug, and she
					merged that fix herself (20 − 1 = 19). That's 39 points, so 195 bonus acorns.
				</p>
				<p><strong>Her round: 355 acorns, about $89 in the Shop, for 16 hours.</strong></p>
			</div>
		</section>
	</article>
</div>

<style>
	.page {
		padding: var(--s-5) 0 calc(var(--s-8) * 2);
	}
	section {
		padding-top: var(--s-5);
		border-top: 1px solid var(--line);
		scroll-margin-top: var(--s-4);
	}
	section:first-child {
		padding-top: 0;
		border-top: 0;
	}
	section + section {
		margin-top: var(--s-5);
	}
	h2 {
		font-size: var(--fs-4);
	}
	ul {
		margin: 0;
		padding-left: var(--s-5);
		display: grid;
		gap: var(--s-2);
	}
	.example p:last-child {
		margin: 0;
	}
</style>
