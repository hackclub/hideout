<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import StaffNav from './StaffNav.svelte';

	let {
		role,
		counts,
		children
	}: {
		role: string;
		counts: ComponentProps<typeof StaffNav>['counts'];
		children: Snippet;
	} = $props();
</script>

<div class="staff">
	<StaffNav {role} {counts} />
	{@render children()}
</div>

<style>
	.staff :global(.head) {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--s-2) var(--s-4);
		margin-bottom: var(--s-5);
	}
	.staff :global(.head h1) {
		margin: 0;
		line-height: 40px;
	}
	.staff :global(.head p) {
		margin: var(--s-2) 0 0;
		max-width: 60ch;
		color: var(--muted);
	}
	.staff :global(h2) {
		font-size: var(--fs-4);
	}
	.staff :global(.chips) {
		display: inline-flex;
		flex-wrap: wrap;
		gap: var(--s-1);
		margin-bottom: var(--s-5);
		padding: var(--s-1);
		background: color-mix(in srgb, var(--text) 8%, transparent);
		border-radius: var(--r-1);
	}
	.staff :global(.chips a) {
		display: inline-flex;
		gap: var(--s-1);
		align-items: center;
		padding: var(--s-1) var(--s-3);
		border-radius: var(--r-1);
		font-size: var(--fs-1);
		font-weight: 600;
		color: var(--muted);
		text-decoration: none;
	}
	.staff :global(.chips a:hover) {
		color: var(--text);
	}
	.staff :global(.chips a[aria-current='page']) {
		background: var(--band);
		color: var(--on-band);
	}
	.staff :global(.paper) {
		min-width: 0;
	}
	.staff :global(.cards) {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--s-5);
	}
	.staff :global(.card-top) {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2) var(--s-4);
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: var(--s-4);
	}
	.staff :global(.card-top h3) {
		margin: 0;
		font-size: var(--fs-3);
	}
	.staff :global(.facts) {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: var(--s-2) var(--s-4);
		margin: 0 0 var(--s-4);
	}
	.staff :global(.facts dt) {
		color: var(--muted);
	}
	.staff :global(.facts dd) {
		margin: 0;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.staff :global(.quote) {
		margin: 0;
		padding: var(--s-3) var(--s-4);
		background: var(--well);
		border-radius: var(--r-1);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.staff :global(.quote.warn) {
		background: var(--warn-tint);
	}
	.staff :global(.actions) {
		display: grid;
		gap: var(--s-3);
		margin: var(--s-4) 0 0;
		padding-top: var(--s-4);
		border-top: 1px solid var(--line);
	}
	.staff :global(.actions textarea) {
		min-height: 64px;
	}
	.staff :global(.btns) {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2);
		align-items: center;
	}
	.staff :global(.empty p) {
		margin: 0;
	}
	.staff :global(.pr) {
		font-weight: 600;
		overflow-wrap: break-word;
	}
	.staff :global(.card-top .ref) {
		display: block;
		margin-top: var(--s-1);
		font-size: var(--fs-1);
		font-weight: 400;
	}
	.staff :global(.table td.n),
	.staff :global(.table th.n) {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.staff :global(.table .nowrap) {
		white-space: nowrap;
	}
	.staff :global(.table tr.dim td) {
		opacity: 0.6;
	}
	.staff :global(.small:not(.btn)) {
		font-size: var(--fs-1);
	}
	.staff :global(.inline) {
		display: inline;
	}
	.staff :global(.mini-label) {
		display: block;
		margin-bottom: var(--s-1);
		font-size: var(--fs-1);
		font-weight: 600;
		color: var(--muted);
	}
	.staff :global(details > summary) {
		cursor: pointer;
		font-weight: 600;
		color: var(--link);
	}
	.staff :global(input.short) {
		width: 120px;
	}

	@media (max-width: 760px) {
		.staff :global(.head h1) {
			line-height: 1.15;
		}
	}
</style>
