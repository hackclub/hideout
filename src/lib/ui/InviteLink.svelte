<script lang="ts">
	let { url, joined, shipped }: { url: string; joined: number; shipped: number } = $props();

	let input = $state<HTMLInputElement>();
	let copied = $state(false);

	async function copy() {
		input?.select();
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {}
	}
</script>

<div class="row invite-link">
	<label for="invite-url" class="visually-hidden">Your invite link</label>
	<input
		bind:this={input}
		id="invite-url"
		type="text"
		readonly
		value={url}
		onfocus={(e) => e.currentTarget.select()}
	/>
	<button type="button" class="btn small" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
</div>
<p class="meta">{joined} joined · {shipped} shipped</p>

<style>
	.invite-link {
		flex-wrap: nowrap;
	}
	input {
		flex: 1;
		min-width: 0;
	}
	.btn {
		flex: none;
	}
	.meta {
		margin: var(--s-2) 0 0;
	}
</style>
