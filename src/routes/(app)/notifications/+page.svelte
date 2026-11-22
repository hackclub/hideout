<script lang="ts">
	import { enhance } from '$app/forms';
	import { when } from '#lib/game/labels.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const unread = $derived(data.items.filter((n) => !n.readAt).length);
</script>

<svelte:head><title>Notifications · Hideout</title></svelte:head>

<header class="page-head">
	<h1>Notifications</h1>
</header>

<section class="card">
	{#if data.items.length}
		{#if unread}
			<form method="POST" action="?/read" use:enhance>
				<button class="btn small ghost">Mark all read</button>
			</form>
		{/if}
		<ul class="list">
			{#each data.items as n (n.id)}
				<li class:unread={!n.readAt}>
					<span class="when">{when(n.createdAt)}</span>
					<div>
						<p class="t">
							{#if n.link}<a href={n.link}>{n.title}</a>{:else}{n.title}{/if}
						</p>
						{#if n.body}<p class="b">{n.body}</p>{/if}
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">Nothing yet. News about your project, fixes and orders shows up here.</p>
	{/if}
</section>

<style>
	form {
		margin-bottom: var(--s-4);
	}
	.list {
		margin: 0;
	}
	li {
		display: grid;
		grid-template-columns: 136px 1fr;
		padding-block: var(--s-3);
	}
	.when {
		font-size: var(--fs-1);
		color: var(--muted);
	}
	.unread .when::before {
		content: '';
		display: inline-block;
		width: 8px;
		height: 8px;
		margin-right: var(--s-2);
		border-radius: var(--r-round);
		background: var(--warn-ink);
	}
	.t,
	.b {
		margin: 0;
	}
	.unread .t {
		font-weight: 700;
	}
	.b {
		font-size: var(--fs-1);
		color: var(--muted);
	}
	a {
		color: inherit;
	}

	@media (max-width: 760px) {
		li {
			grid-template-columns: 1fr;
			gap: var(--s-1);
		}
	}
</style>
