<script lang="ts">
	import Acorn from '#lib/ui/Acorn.svelte';
	import { acorns } from '#lib/game/labels.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Shop · Hideout</title></svelte:head>

<header class="page-head">
	<h1>Shop</h1>
	<p>
		Swap your acorns for grants and gear. One acorn is worth $0.25. <a href="/shop/orders">
			See your orders
		</a>
	</p>
</header>

<ul class="grid items">
	{#each data.items as item (item.id)}
		{@const short = item.price - data.wallet.acorns}
		<li>
			<a class="card item" href="/shop/{item.id}">
				<span class="plate">
					{#if item.imageUrl}<img src={item.imageUrl} alt="" />{/if}
				</span>
				<div class="body">
					<h2>{item.name}</h2>
					<p class="blurb">{item.blurb}</p>
					<p class="foot">
						<span class="price"><Acorn size={18} /> {acorns(item.price)}</span>
						{#if item.stock === 0}
							<span class="chip bad">Out of stock</span>
						{:else if short <= 0}
							<span class="chip ok">You can get this</span>
						{:else}
							<span class="need">{acorns(short)} more to go</span>
						{/if}
					</p>
				</div>
			</a>
		</li>
	{/each}
</ul>

<style>
	.items {
		--min: 240px;
		--gap: var(--s-5);
		list-style: none;
		padding: 0;
		margin: 0;
	}
	li:nth-child(3n + 2) {
		--c: var(--clay);
	}
	li:nth-child(3n) {
		--c: var(--blue);
	}
	li:nth-child(4n + 2) .plate {
		background-image: repeating-linear-gradient(135deg, var(--p) 0 6px, transparent 6px 18px);
		background-size: auto;
	}
	li:nth-child(4n + 3) .plate {
		background-image: conic-gradient(
			var(--p) 25%,
			transparent 0 50%,
			var(--p) 0 75%,
			transparent 0
		);
		background-size: 32px 32px;
	}
	li:nth-child(4n) .plate {
		background-image:
			linear-gradient(135deg, var(--p) 25%, transparent 25%),
			linear-gradient(225deg, var(--p) 25%, transparent 25%);
		background-size: 24px 24px;
	}
	.item {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: var(--s-3);
	}
	.body {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: var(--s-4) var(--s-2) var(--s-1);
	}
	h2 {
		margin: 0;
		font-size: var(--fs-3);
	}
	.blurb {
		margin: var(--s-1) 0 var(--s-4);
		font-size: var(--fs-1);
		color: var(--muted);
	}
	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-2);
		margin: auto 0 0;
	}
	.price {
		display: inline-flex;
		align-items: center;
		gap: var(--s-1);
		font: 800 var(--fs-3) / 1 var(--font-display);
	}
	.need {
		font-size: var(--fs-1);
		color: var(--muted);
	}
</style>
