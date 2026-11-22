<script lang="ts">
	let { items }: { items: { q: string; a: string }[] } = $props();
</script>

<div>
	{#each items as f, i (f.q)}
		<details name="faq" open={i === 0}>
			<summary>{f.q}</summary>
			<p>{f.a}</p>
		</details>
	{/each}
</div>

<style>
	details + details {
		border-top: 1px solid var(--line);
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-4);
		min-height: var(--row);
		padding: var(--s-4) 0;
		font: 700 var(--fs-3) / 1.2 var(--font-display);
		cursor: pointer;
		list-style: none;
	}
	details:first-child summary {
		min-height: 0;
		padding-top: 0;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary::after {
		content: '';
		flex: none;
		width: var(--s-4);
		height: var(--s-4);
		background:
			linear-gradient(currentColor, currentColor) center / 100% 2px no-repeat,
			linear-gradient(currentColor, currentColor) center / 2px 100% no-repeat;
	}
	details[open] summary::after {
		background: linear-gradient(currentColor, currentColor) center / 100% 2px no-repeat;
	}
	p {
		max-width: 60ch;
		margin: 0;
		padding-bottom: var(--s-5);
	}
	details:last-child p {
		padding-bottom: 0;
	}
</style>
