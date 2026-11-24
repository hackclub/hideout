<script lang="ts">
	import { enhance } from '$app/forms';
	import Acorn from '#lib/ui/Acorn.svelte';
	import GrantCard from '#lib/ui/GrantCard.svelte';
	import Flash from '#lib/ui/Flash.svelte';
	import { acorns } from '#lib/game/labels.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const item = $derived(data.item);
	let qty = $state(1);
	const total = $derived(item.price * qty);
	const short = $derived(total - data.wallet.acorns);
	const physical = $derived(item.category === 'physical');
	const grant = $derived(item.category === 'grant');
	const needsAddress = $derived(physical && !data.me.hasAddress);
	const facts = $derived(
		[
			`About ${Math.max(1, Math.round(item.price / 10))}h of building`,
			item.stock !== null && `${item.stock} left`,
			item.maxPerUser && `up to ${item.maxPerUser} per person`,
			physical && data.me.hasAddress && 'ships to the address in your settings'
		].filter(Boolean)
	);
</script>

<svelte:head><title>{item.name} · Shop · Hideout</title></svelte:head>

<header class="page-head">
	<a class="back" href="/shop">Back to the shop</a>
	<h1>{item.name}</h1>
</header>

<article class="card" class:split={item.imageUrl || grant}>
	{#if grant}
		<span class="plate">
			<GrantCard
				name={item.name}
				price={item.price}
				acornCents={data.acornCents}
				image={item.imageUrl}
				logos={item.logos}
			/>
		</span>
	{:else if item.imageUrl}<span class="plate">
			<img src={item.imageUrl} alt={item.name} />
		</span>{/if}
	<div>
		<p class="blurb">{item.blurb}</p>
		<p class="price"><Acorn size={24} /> {acorns(item.price)}</p>
		<p class="muted facts">{facts.join(' · ')}</p>

		<Flash {form} />

		<form method="POST" action="?/order" use:enhance>
			<div class="field qty">
				<label for="quantity">How many?</label>
				<input
					id="quantity"
					name="quantity"
					type="number"
					min="1"
					max={item.maxPerUser ?? 10}
					bind:value={qty}
				/>
			</div>
			<div class="field">
				<label for="note">
					Anything we should know? <span class="hint">Optional, like a size or which domain</span>
				</label>
				<textarea id="note" name="note" rows="2"></textarea>
			</div>
			{#if needsAddress}
				<p class="note">
					This one gets shipped, so add your address on Hack Club Auth and refresh it in <a
						href="/settings"
					>
						settings
					</a> first.
				</p>
			{/if}
			<div class="row">
				<button class="btn" disabled={short > 0 || needsAddress}>
					Get it for {acorns(total)} acorns
				</button>
				{#if short > 0}<span class="muted">You need {acorns(short)} more.</span>{/if}
			</div>
		</form>
	</div>
</article>

<style>
	.card {
		max-width: 720px;
	}
	.split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: var(--s-6);
		align-items: start;
		max-width: none;
	}
	.plate {
		aspect-ratio: 4 / 3;
		--pad: var(--s-6);
	}
	.blurb {
		margin: 0;
	}
	.price {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		margin: var(--s-4) 0 0;
		font: 800 var(--fs-5) / 1.2 var(--font-display);
	}
	.facts {
		margin: 0 0 var(--s-5);
		font-size: var(--fs-1);
	}
	.qty input {
		max-width: 120px;
	}
	.note {
		margin: var(--s-4) 0 0;
	}
	.row {
		margin-top: var(--s-5);
	}

	@media (max-width: 760px) {
		.split {
			grid-template-columns: 1fr;
			gap: var(--s-5);
		}
	}
</style>
