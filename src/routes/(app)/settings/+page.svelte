<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Flash from '#lib/ui/Flash.svelte';
	import Stamp from '#lib/ui/Stamp.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const connected = $derived(page.url.searchParams.get('connected'));
	const a = $derived(data.address);
</script>

<svelte:head><title>Settings · Hideout</title></svelte:head>

<header class="page-head">
	<h1>Settings</h1>
</header>

{#if connected && !form}<Flash
		form={{ ok: true, message: `${connected === 'github' ? 'GitHub' : 'Hackatime'} connected.` }}
	/>{/if}
<Flash {form} />

<div class="stack" style="--gap: var(--s-5)">
	<section class="card">
		<h2>Accounts</h2>
		<ul class="list">
			<li>
				<span>
					<b>Hackatime</b>
					<span class="meta">Tracks your coding time. Only Hackatime hours earn acorns.</span>
				</span>
				{#if data.hackatime}
					<div class="row">
						<Stamp text="Connected" tone="ok" />
						<form method="POST" action="?/unlinkHackatime" use:enhance>
							<button class="btn small ghost">Disconnect</button>
						</form>
					</div>
				{:else}
					<a class="btn small" href="/connect/hackatime">Connect Hackatime</a>
				{/if}
			</li>
			{#if data.kairosOn}
				<li>
					<span>
						<b>Kairos</b>
						<span class="meta">Our new tracking tool. It works great with AI too.</span>
					</span>
					{#if data.kairos === true}
						<Stamp text="Installed" tone="ok" />
					{:else if data.kairos === false}
						<a class="btn small" href="https://kairos.hackclub.com" target="_blank" rel="noopener">
							Get Kairos
						</a>
					{:else}
						<span class="muted">Kairos didn't answer. Try again in a minute.</span>
					{/if}
				</li>
			{/if}
			<li>
				<span>
					<b>GitHub</b>
					<span class="meta">Your fix PRs have to come from this account.</span>
				</span>
				<div class="row">
					{#if data.githubLogin}<Stamp text="@{data.githubLogin}" tone="ok" />{/if}
					<a class="btn small" href="/connect/github/start">
						{data.githubLogin ? 'Reconnect' : 'Connect GitHub'}
					</a>
				</div>
			</li>
			<li>
				<span>
					<b>Slack</b>
					{#if data.slack}
						<span class="meta">
							Heidi DMs you when something needs you, like a new fix or a timer about to run out.
						</span>
					{:else}
						<span class="meta">
							Your Hack Club account has no Slack linked, so news only shows up in <a
								href="/notifications"
							>
								Notifications
							</a>.
						</span>
					{/if}
				</span>
				{#if data.slack}<Stamp text="Linked through Hack Club" tone="ok" />{/if}
			</li>
		</ul>
	</section>

	<section class="card">
		<h2>Address</h2>
		<p class="muted">
			This comes from your Hack Club Auth account. Hack Club needs it when your hours are sent over,
			and Shop prizes get mailed here.
		</p>
		<dl>
			<dt>Address</dt>
			<dd>
				{#if a}
					{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}{a.state ? `, ${a.state}` : ''}
					{a.postcode}<br />{a.country}
				{:else}
					Missing
				{/if}
			</dd>
		</dl>
		<div class="row">
			<a class="btn small" href={data.hcaUrl} target="_blank" rel="noopener">
				Edit on Hack Club Auth
			</a>
			<a class="btn small ghost" href="/auth/start?next=/settings">Refresh</a>
		</div>
	</section>
</div>

<style>
	h2 {
		font-size: var(--fs-4);
		margin: 0;
	}
	h2 + p {
		margin: var(--s-2) 0 var(--s-5);
	}
	li > span {
		min-width: 0;
		max-width: 52ch;
	}
	li .row {
		flex-wrap: nowrap;
	}
	.meta {
		display: block;
	}
	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: var(--s-3) var(--s-5);
		margin: 0 0 var(--s-5);
	}
	dt {
		font-weight: 700;
	}
	dd {
		margin: 0;
	}
	@media (max-width: 760px) {
		li {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
