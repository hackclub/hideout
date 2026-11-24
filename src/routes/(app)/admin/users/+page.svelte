<script lang="ts">
	import Acorn from '#lib/ui/Acorn.svelte';
	import { acorns } from '#lib/game/labels.js';
	import { et } from '#lib/ui/staff/format.js';
	import PageHead from '../_components/PageHead.svelte';
	import Panel from '../_components/Panel.svelte';
	import Table from '../_components/Table.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const roleTag = { admin: 'bad', reviewer: 'info', user: '' } as const;
</script>

<PageHead title="Users">Open someone to change their role, adjust acorns or ban them.</PageHead>

<Panel>
	<form method="GET" class="search" role="search" data-sveltekit-keepfocus>
		<label for="q" class="visually-hidden">Search users</label>
		<input id="q" name="q" value={data.q} placeholder="Name, email, @github or id" />
		<button class="btn small">Search</button>
		{#if data.q}<a class="btn small ghost" href="?">Clear</a>{/if}
	</form>
	<p class="meta">
		{data.users.length === 100
			? 'Showing the first 100.'
			: `${data.users.length} ${data.users.length === 1 ? 'person' : 'people'}.`}
	</p>
	<Table small>
		<thead>
			<tr>
				<th>Name</th>
				<th>Email</th>
				<th>GitHub</th>
				<th>Role</th>
				<th>Status</th>
				<th class="n">Acorns</th>
				<th>Joined</th>
			</tr>
		</thead>
		<tbody>
			{#each data.users as u (u.id)}
				<tr class:dim={u.banned}>
					<td class="nowrap">
						<a href="/admin/users/{u.id}">{u.name}</a> <span class="meta">#{u.id}</span>
					</td>
					<td>{u.email}</td>
					<td class="mono">{u.githubLogin ? `@${u.githubLogin}` : '-'}</td>
					<td><span class="chip {roleTag[u.role]}">{u.role}</span></td>
					<td>
						{#if u.banned}<span class="chip bad">banned</span>
						{:else if u.verification !== 'verified'}<span class="chip warn">
								{u.verification.replace(/_/g, ' ')}
							</span>
						{:else}<span class="chip ok">ok</span>{/if}
					</td>
					<td class="n"><Acorn size={14} /> {acorns(u.balance)}</td>
					<td class="nowrap">{et(u.createdAt).replace(' ET', '')}</td>
				</tr>
			{:else}
				<tr><td colspan="7" class="muted">Nobody matches "{data.q}".</td></tr>
			{/each}
		</tbody>
	</Table>
</Panel>

<style>
	.search {
		display: flex;
		gap: var(--s-2);
		align-items: center;
	}
	.search input {
		flex: 1;
		min-width: 0;
	}
	.meta {
		margin: var(--s-3) 0;
	}
</style>
