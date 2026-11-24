<script lang="ts">
	import { et } from '#lib/ui/staff/format.js';
	import Fields from '../_components/Fields.svelte';
	import PageHead from '../_components/PageHead.svelte';
	import Panel from '../_components/Panel.svelte';
	import Table from '../_components/Table.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const link = (type: string | null, id: number | null) => {
		if (!type || id === null) return null;
		if (type === 'ship') return `/review/ships/${id}`;
		if (type === 'user') return `/admin/users/${id}`;
		if (type === 'item') return `/admin/shop?edit=${id}`;
		if (type === 'order') return `/admin/orders?status=all`;
		if (type === 'round') return `/admin?preview=${id}#preview`;
		return null;
	};

	const short = (d: unknown) => {
		if (!d) return '';
		const text = JSON.stringify(d);
		return text.length > 90 ? `${text.slice(0, 90)}...` : text;
	};

	const filtered = $derived(Boolean(data.filter.action || data.filter.type || data.filter.id));
</script>

<PageHead title="Audit log">
	Everything people and staff changed, newest first. Shows the latest 200 that match.
</PageHead>

<Panel>
	<form method="GET">
		<Fields>
			<div class="field">
				<label for="action">Action starts with</label>
				<input
					id="action"
					name="action"
					value={data.filter.action}
					list="prefixes"
					placeholder="ship. or bug.resolved"
				/>
				<datalist id="prefixes">
					{#each data.prefixes as p (p)}<option value="{p}."></option>{/each}
				</datalist>
			</div>
			<div class="field">
				<label for="type">Target</label>
				<select id="type" name="type">
					<option value="">Anything</option>
					{#each data.types as t (t)}<option value={t} selected={data.filter.type === t}>
							{t}
						</option>{/each}
				</select>
			</div>
			<div class="field">
				<label for="id">Target id</label>
				<input id="id" name="id" inputmode="numeric" value={data.filter.id} />
			</div>
			<div class="row">
				<button class="btn small">Filter</button>
				{#if filtered}<a class="btn small ghost" href="?">Clear</a>{/if}
			</div>
		</Fields>
	</form>

	<Table small>
		<thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
		<tbody>
			{#each data.rows as r (r.entry.id)}
				{@const href = link(r.entry.targetType, r.entry.targetId)}
				<tr>
					<td class="nowrap">{et(r.entry.createdAt).replace(' ET', '')}</td>
					<td class="nowrap">
						{#if r.actor?.id}<a href="/admin/users/{r.actor.id}">{r.actor.name}</a>{:else}<span
								class="muted"
							>
								system
							</span>{/if}
					</td>
					<td>
						<a class="mono" href="?action={encodeURIComponent(r.entry.action)}">{r.entry.action}</a>
					</td>
					<td class="nowrap">
						{#if r.entry.targetType}
							{#if href}<a {href}>{r.entry.targetType} {r.entry.targetId}</a>{:else}{r.entry
									.targetType}
								{r.entry.targetId}{/if}
							<a
								class="muted"
								href="?type={r.entry.targetType}&id={r.entry.targetId}"
								title="Everything about this {r.entry.targetType}"
							>
								(all)
							</a>
						{/if}
					</td>
					<td class="data">
						{#if r.entry.data}
							<details>
								<summary class="mono">{short(r.entry.data)}</summary>
								<pre>{JSON.stringify(r.entry.data, null, 2)}</pre>
							</details>
						{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="muted">Nothing matches.</td></tr>
			{/each}
		</tbody>
	</Table>
</Panel>

<style>
	form {
		margin-bottom: var(--s-5);
	}
	.data {
		min-width: 260px;
		max-width: 480px;
	}
	summary {
		color: var(--muted);
		overflow-wrap: anywhere;
		cursor: pointer;
	}
	pre {
		margin: var(--s-2) 0 0;
		padding: var(--s-2) var(--s-3);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		background: var(--well);
		border-radius: var(--r-1);
	}
</style>
