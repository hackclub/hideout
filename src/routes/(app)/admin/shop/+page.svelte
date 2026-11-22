<script lang="ts">
	import { enhance } from '$app/forms';
	import Acorn from '#lib/ui/Acorn.svelte';
	import StaffFlash from '#lib/ui/staff/StaffFlash.svelte';
	import { keep } from '#lib/ui/staff/forms.js';
	import Fields from '../_components/Fields.svelte';
	import PageHead from '../_components/PageHead.svelte';
	import Panel from '../_components/Panel.svelte';
	import Split from '../_components/Split.svelte';
	import Table from '../_components/Table.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const item = $derived(data.editing);
	const categories = [
		{ key: 'grant', label: 'Grant' },
		{ key: 'physical', label: 'Physical' },
		{ key: 'digital', label: 'Digital' }
	];

	const nextSort = $derived(Math.max(0, ...data.items.map((i) => i.sort)) + 1);
</script>

<StaffFlash {form} />

<PageHead title="Shop">
	What people can buy with acorns. 1 acorn is $0.25. Open an item to edit it. Turning one off hides
	it and keeps its orders.
</PageHead>

<Split sticky asideFirst>
	<Panel>
		<Table small>
			<thead>
				<tr>
					<th>Item</th>
					<th>Kind</th>
					<th class="n">Price</th>
					<th class="n">Stock</th>
					<th class="n">Max each</th>
					<th class="n">Sold</th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as i (i.id)}
					<tr class:dim={!i.active} class:editing={item?.id === i.id}>
						<td class="item">
							<a href="?edit={i.id}" data-sveltekit-noscroll><strong>{i.name}</strong></a>
							{#if !i.active}<span class="chip">hidden</span>{/if}
							<span class="meta">{i.blurb}</span>
						</td>
						<td>{i.category}</td>
						<td class="n"><Acorn size={14} /> {i.price}</td>
						<td class="n">{i.stock ?? '∞'}</td>
						<td class="n">{i.maxPerUser ?? '-'}</td>
						<td class="n">{i.sold}</td>
					</tr>
				{:else}
					<tr><td colspan="6" class="muted">No items yet. Add the first one.</td></tr>
				{/each}
			</tbody>
		</Table>
	</Panel>

	{#snippet aside()}
		{#key item?.id}
			<Panel title={item ? `Edit ${item.name}` : 'New item'}>
				{#snippet actions()}
					{#if item}<a class="btn small ghost" href="?" data-sveltekit-noscroll>New item</a>{/if}
				{/snippet}
				<form method="POST" action="?/save" use:enhance={item ? keep : undefined}>
					{#if item}<input type="hidden" name="id" value={item.id} />{/if}
					<div class="field">
						<label for="name">Name</label>
						<input id="name" name="name" value={item?.name ?? ''} required maxlength="80" />
					</div>
					<div class="field">
						<label for="blurb">Blurb <span class="hint">One or two short lines.</span></label>
						<textarea id="blurb" name="blurb" maxlength="500">{item?.blurb ?? ''}</textarea>
					</div>
					<div class="field">
						<Fields min="140px">
							<div class="field">
								<label for="category">Kind</label>
								<select id="category" name="category" required>
									{#each categories as c (c.key)}<option
											value={c.key}
											selected={item?.category === c.key}
										>
											{c.label}
										</option>{/each}
								</select>
							</div>
							<div class="field">
								<label for="price">Price in acorns</label>
								<input
									id="price"
									name="price"
									type="number"
									min="1"
									step="1"
									value={item?.price ?? ''}
									required
								/>
							</div>
							<div class="field">
								<label for="stock">Stock <span class="hint">empty = no limit</span></label>
								<input
									id="stock"
									name="stock"
									type="number"
									min="0"
									step="1"
									value={item?.stock ?? ''}
								/>
							</div>
							<div class="field">
								<label for="max">Max per person <span class="hint">empty = no limit</span></label>
								<input
									id="max"
									name="maxPerUser"
									type="number"
									min="1"
									step="1"
									value={item?.maxPerUser ?? ''}
								/>
							</div>
						</Fields>
					</div>
					<div class="field">
						<label for="image">
							Image link <span class="hint">https:// or a path like /items/keyboard.png</span>
						</label>
						<input
							id="image"
							name="imageUrl"
							type="text"
							value={item?.imageUrl ?? ''}
							pattern="(https://|/).*"
						/>
					</div>
					<div class="field">
						<Fields min="140px">
							<div class="field">
								<label for="sort">Sort <span class="hint">lower shows first</span></label>
								<input
									id="sort"
									name="sort"
									type="number"
									step="1"
									value={item?.sort ?? nextSort}
								/>
							</div>
							<label class="check">
								<input type="checkbox" name="active" checked={item ? item.active : true} /> On sale
							</label>
						</Fields>
					</div>
					<div class="field">
						<button class="btn small">{item ? 'Save item' : 'Add item'}</button>
					</div>
				</form>
			</Panel>
		{/key}
	{/snippet}
</Split>

<style>
	.item {
		min-width: 200px;
	}
	.item .meta {
		display: block;
	}
	tr.editing td {
		background: var(--well);
	}
</style>
