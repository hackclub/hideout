<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Stamp from '#lib/ui/Stamp.svelte';
	import Flash from '#lib/ui/Flash.svelte';
	import Acorn from '#lib/ui/Acorn.svelte';
	import { acorns, orderStamp, when } from '#lib/game/labels.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const placed = $derived(page.url.searchParams.get('placed') === '1');
</script>

<svelte:head><title>Your orders · Hideout</title></svelte:head>

<header class="page-head">
	<h1>Your orders</h1>
	<p>
		We take the acorns when you order and give them back if it gets rejected. You can cancel while
		it's pending. <a href="/shop">Back to the shop</a>
	</p>
</header>

{#if placed && !form}
	<Flash form={{ ok: true, message: 'Order placed!' }} />
{/if}
<Flash {form} />

<section class="card">
	{#if data.orders.length}
		<ul class="orders">
			{#each data.orders as o (o.order.id)}
				<li>
					<div class="what">
						<b>{o.item.name}{o.order.quantity > 1 ? ` × ${o.order.quantity}` : ''}</b>
						<span class="meta">
							#{o.order.id} · {when(o.order.createdAt)} · <Acorn size={14} />
							{acorns(o.order.total)}
						</span>
						{#if o.order.tracking}<span class="meta">
								Tracking: <span class="mono">{o.order.tracking}</span>
							</span>{/if}
						{#if o.order.staffNote}<span class="meta">Note from us: {o.order.staffNote}</span>{/if}
					</div>
					<div class="side">
						{#if o.order.status === 'pending'}
							<form method="POST" action="?/cancel" use:enhance>
								<input type="hidden" name="orderId" value={o.order.id} />
								<button class="btn small ghost">Cancel</button>
							</form>
						{/if}
						<Stamp {...orderStamp[o.order.status]} />
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted empty">No orders yet.</p>
	{/if}
</section>

<style>
	.orders {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	li {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--s-3) var(--s-4);
		padding: var(--s-4) 0;
		border-top: 1px solid var(--line);
	}
	li:first-child {
		padding-top: 0;
		border-top: 0;
	}
	li:last-child {
		padding-bottom: 0;
	}
	.what {
		flex: 1 1 240px;
		min-width: 0;
	}
	b {
		display: block;
		font-weight: 600;
	}
	.meta {
		display: block;
		font-size: var(--fs-1);
		color: var(--muted);
	}
	.side {
		display: flex;
		align-items: center;
		gap: var(--s-3);
		flex: none;
	}
	.empty {
		margin: 0;
	}
</style>
