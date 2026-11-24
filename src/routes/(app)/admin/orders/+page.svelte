<script lang="ts">
	import { enhance } from '$app/forms';
	import Acorn from '#lib/ui/Acorn.svelte';
	import Stamp from '#lib/ui/Stamp.svelte';
	import StaffFlash from '#lib/ui/staff/StaffFlash.svelte';
	import { orderStamp } from '#lib/game/labels.js';
	import { et } from '#lib/ui/staff/format.js';
	import Facts from '../_components/Facts.svelte';
	import PageHead from '../_components/PageHead.svelte';
	import Panel from '../_components/Panel.svelte';
	import Tabs from '../_components/Tabs.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const filters = [
		{ key: 'pending', label: 'Pending' },
		{ key: 'approved', label: 'Approved' },
		{ key: 'fulfilled', label: 'Sent' },
		{ key: 'rejected', label: 'Rejected' },
		{ key: 'cancelled', label: 'Cancelled' },
		{ key: 'all', label: 'All' }
	] as const;

	const count = (key: string) =>
		key === 'all'
			? Object.values(data.byStatus).reduce((s, n) => s + n, 0)
			: data.byStatus[key as keyof typeof data.byStatus];
	const tabs = $derived(
		filters.map((f) => ({
			href: `?status=${f.key}`,
			label: f.label,
			n: count(f.key),
			current: data.status === f.key
		}))
	);
</script>

<StaffFlash {form} />

<PageHead title="Orders">
	Acorns come off when someone orders, and rejecting gives them back. Physical items ship to the
	address on the order.
</PageHead>

<Tabs label="Filter by status" items={tabs} />

{#if data.orders.length === 0}
	<Panel>
		<p class="muted">
			{data.status === 'pending'
				? 'Nothing waiting. The shop is quiet.'
				: 'No orders with this status.'}
		</p>
	</Panel>
{:else}
	<div class="orders">
		{#each data.orders as o (o.order.id)}
			{@const open =
				o.order.status === 'pending' ||
				o.order.status === 'approved' ||
				o.order.status === 'fulfilled'}
			{@const physical = o.item.category === 'physical'}
			<Panel
				title="#{o.order.id} · {o.item.name}{o.order.quantity > 1 ? ` x${o.order.quantity}` : ''}"
			>
				{#snippet actions()}<Stamp {...orderStamp[o.order.status]} />{/snippet}
				<Facts>
					<dt>For</dt>
					<dd>
						<a href="/admin/users/{o.user.id}">{o.user.name}</a>
						<span class="meta">{o.user.email}</span>
						{#if o.user.banned}<span class="chip bad">banned</span>{/if}
					</dd>
					<dt>Total</dt>
					<dd><Acorn size={15} /> {o.order.total} <span class="meta">{o.item.category}</span></dd>
					<dt>Placed</dt>
					<dd>{et(o.order.createdAt)}</dd>
					{#if o.order.note}<dt>Their note</dt>
						<dd>{o.order.note}</dd>{/if}
					{#if physical}
						<dt>Ship to</dt>
						<dd>
							{#if o.order.address}
								{@const a = o.order.address}
								<address>
									{a.name}<br />{a.line1}{#if a.line2}<br />{a.line2}{/if}<br />{a.city}{a.state
										? `, ${a.state}`
										: ''}
									{a.postcode}<br />{a.country}{#if a.phone}<br />{a.phone}{/if}
								</address>
							{:else}
								<span class="chip bad">No address</span>
							{/if}
						</dd>
					{/if}
					{#if o.order.tracking}<dt>Tracking</dt>
						<dd class="mono">{o.order.tracking}</dd>{/if}
					{#if o.order.staffNote}<dt>Staff note</dt>
						<dd>{o.order.staffNote}</dd>{/if}
					{#if o.handler?.name}<dt>Handled by</dt>
						<dd>{o.handler.name} · {et(o.order.updatedAt)}</dd>{/if}
				</Facts>
				{#if open}
					<form method="POST" action="?/set" use:enhance>
						<input type="hidden" name="orderId" value={o.order.id} />
						{#if physical || o.item.category === 'digital'}
							<div class="field">
								<label for="t-{o.order.id}">
									{physical ? 'Tracking number' : 'Code or link'}
									<span class="hint">For "Mark sent". Optional.</span>
								</label>
								<input id="t-{o.order.id}" name="tracking" value={o.order.tracking ?? ''} />
							</div>
						{/if}
						<div class="field">
							<label for="n-{o.order.id}">
								Note to them <span class="hint">Needed to reject.</span>
							</label>
							<textarea id="n-{o.order.id}" name="note"></textarea>
						</div>
						<div class="row">
							{#if o.order.status === 'pending'}<button
									class="btn small leafy"
									name="status"
									value="approved"
								>
									Approve
								</button>{/if}
							<button class="btn small" name="status" value="fulfilled">
								{o.order.status === 'fulfilled' ? 'Update sent info' : 'Mark sent'}
							</button>
							<button class="btn small ghost" name="status" value="rejected">
								Reject and refund
							</button>
						</div>
					</form>
				{/if}
			</Panel>
		{/each}
	</div>
{/if}

<style>
	.orders {
		display: grid;
		gap: var(--s-5);
		grid-template-columns: repeat(auto-fill, minmax(min(440px, 100%), 1fr));
		align-items: start;
	}
	address {
		font-style: normal;
	}
	form {
		margin-top: var(--s-4);
		padding-top: var(--s-4);
		border-top: 1px solid var(--line);
	}
	textarea {
		min-height: 64px;
	}
	.row {
		margin-top: var(--s-3);
	}
</style>
