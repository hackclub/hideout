<script lang="ts">
	import KairosBanner from './KairosBanner.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const lead = $derived(data.steps[0]);
	const later = $derived(data.steps.slice(1));
</script>

<svelte:head><title>Home · Hideout</title></svelte:head>

<header class="page-head">
	<h1>Home</h1>
</header>

{#if data.kairosBanner}<KairosBanner />{/if}

<article class="card">
	<h2>{lead.title}</h2>
	<p class="help">{lead.help}</p>
	{#if lead.action}<a class="btn" href={lead.action.href}>{lead.action.label}</a>{/if}

	{#if later.length}
		<ul class="list" aria-label="Also to do">
			{#each later as s (s.key)}
				<li>
					<span class="todo" aria-hidden="true"></span>
					<span><b>{s.title}</b><span class="meta">{s.help}</span></span>
					{#if s.action}<a class="chip" href={s.action.href}>{s.action.label}</a>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</article>

{#if data.targets.length}
	<h2 class="sub">Your targets</h2>
	<ul class="grid targets">
		{#each data.targets as t (t.id)}
			<li>
				<a class="card mini" href="/break/targets/{t.id}">
					<span class="cover">
						{#if t.screenshot}<img src={t.screenshot} alt="" loading="lazy" />{/if}
					</span>
					<span class="body">
						<b>{t.name}</b>
						<span class="meta">by {t.owner.split(' ')[0]}</span>
						<span class="chip {t.status.tone}">{t.status.text}</span>
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	h2 {
		margin: 0;
	}
	.help {
		max-width: 52ch;
		margin: var(--s-2) 0 var(--s-5);
		color: var(--muted);
	}
	.list {
		margin-top: var(--s-6);
	}
	.list li {
		display: grid;
		grid-template-columns: 40px minmax(0, 1fr) auto;
	}
	.todo {
		width: 24px;
		height: 24px;
		justify-self: center;
		background: var(--well);
		box-shadow: inset 0 0 0 2px var(--line);
		border-radius: var(--r-round);
	}
	.list .chip {
		justify-self: end;
	}
	a.chip:hover {
		color: var(--text);
	}
	.sub {
		margin: var(--s-7) 0 var(--s-4);
		font-size: var(--fs-4);
	}
	.targets {
		padding: 0;
		margin: 0;
		list-style: none;
	}
	.mini {
		display: flex;
		gap: var(--s-4);
		height: 100%;
		padding: var(--s-3);
	}
	.mini .cover {
		--pad: var(--s-1);
		flex: none;
		width: 96px;
		aspect-ratio: auto;
	}
	.mini .body {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
		padding-block: var(--s-1);
	}
	.mini b {
		font: 700 var(--fs-3) / 1.2 var(--font-display);
	}
	.mini .chip {
		margin-top: var(--s-3);
	}

	@media (max-width: 760px) {
		.list li {
			gap: var(--s-3);
		}
	}
</style>
