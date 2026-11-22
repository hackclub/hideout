<script lang="ts">
	let {
		name,
		github = null,
		href = null
	}: { name: string; github?: string | null; href?: string | null } = $props();
</script>

<span class="who">
	{#if href}<a {href}>{name}</a>{:else}<span class="name">{name}</span>{/if}
	{#if github}<a
			class="gh mono"
			href="https://github.com/{github}"
			rel="noreferrer"
			target="_blank"
		>
			@{github}
		</a>{/if}
</span>

<style>
	.who {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0 var(--s-2);
		align-items: baseline;
	}
	.who > :first-child {
		font-weight: 600;
	}
	.gh {
		font-size: var(--fs-1);
		color: var(--muted);
		text-decoration: none;
	}
	.gh:hover {
		text-decoration: underline;
	}
</style>
