<script lang="ts">
	import { page } from '$app/state';
	const banned = $derived(page.url.searchParams.get('why') === 'banned');
</script>

<svelte:head><title>Not this time · Hideout</title></svelte:head>

<div class="narrow page">
	<section class="card">
		{#if banned}
			<h1>Your account is banned</h1>
			<p>An admin banned your account. If you think that's a mistake, ask in #hideout on Slack.</p>
		{:else}
			<h1>You can't join just yet</h1>
			<p>
				Hideout is for teens 13 to 18 who've verified with Hack Club Auth. If you haven't verified
				yet, do that at
				<a href="https://auth.hackclub.com">auth.hackclub.com</a> and check again.
			</p>
		{/if}
		<div class="row">
			{#if !banned}<a class="btn" href="/auth/start?next=/home">Check again</a>{/if}
			<form method="POST" action="/logout"><button class="btn ghost">Sign out</button></form>
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 560px;
		padding: var(--s-5) 0 calc(var(--s-8) * 2);
	}
</style>
