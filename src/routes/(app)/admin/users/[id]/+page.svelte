<script lang="ts">
	import { enhance } from '$app/forms';
	import Acorn from '#lib/ui/Acorn.svelte';
	import Stamp from '#lib/ui/Stamp.svelte';
	import StaffFlash from '#lib/ui/staff/StaffFlash.svelte';
	import { acorns, orderStamp, shipStamp } from '#lib/game/labels.js';
	import { keep } from '#lib/ui/staff/forms.js';
	import { hrs, num, et } from '#lib/ui/staff/format.js';
	import Facts from '../../_components/Facts.svelte';
	import PageHead from '../../_components/PageHead.svelte';
	import Panel from '../../_components/Panel.svelte';
	import Split from '../../_components/Split.svelte';
	import Table from '../../_components/Table.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const u = $derived(data.user);
	const self = $derived(u.id === data.me.id);
	const reasons: Record<string, string> = {
		build_hours: 'Build hours',
		break_hours: 'Break hours',
		round_bonus: 'Round bonus',
		season_prize: 'Season prize',
		purchase: 'Order',
		refund: 'Refund',
		manual: 'Manual'
	};
</script>

<StaffFlash {form} />

<PageHead title={u.name} back={{ href: '/admin/users', label: 'Users' }}>
	#{u.id} · {u.email}
	{#if u.githubLogin}· <a
			class="mono"
			href="https://github.com/{u.githubLogin}"
			target="_blank"
			rel="noreferrer"
		>
			@{u.githubLogin}
		</a>{/if}
	{#if u.slackId}· Slack <span class="mono">{u.slackId}</span>{/if}
	{#snippet actions()}
		<span class="chip {u.role === 'admin' ? 'bad' : u.role === 'reviewer' ? 'info' : ''}">
			{u.role}
		</span>
		{#if u.banned}<Stamp text="Banned" tone="bad" />{/if}
		<span class="chip"><Acorn size={14} /> {acorns(data.balance)} acorns</span>
	{/snippet}
</PageHead>

<Split>
	<Panel title="Profile">
		<Facts>
			<dt>Verification</dt>
			<dd>
				{#if u.verification === 'verified'}<span class="chip ok">verified</span>{:else}<span
						class="chip warn"
					>
						{u.verification.replace(/_/g, ' ')}
					</span>{/if}
			</dd>
			<dt>Hackatime</dt>
			<dd>{u.hackatime ? 'Connected' : 'Not connected'}</dd>
			<dt>Address</dt>
			<dd>
				{#if u.address}
					{u.address.name}, {u.address.line1}{u.address.line2 ? `, ${u.address.line2}` : ''}, {u
						.address.city}{u.address.state ? `, ${u.address.state}` : ''}
					{u.address.postcode}, {u.address.country}
				{:else}<span class="muted">None</span>{/if}
			</dd>
			<dt>Fix PRs</dt>
			<dd>{data.fixes.sent} sent, {data.fixes.merged} merged</dd>
			<dt>Joined</dt>
			<dd>{et(u.createdAt)}</dd>
			<dt>Last seen</dt>
			<dd>{et(u.lastSeenAt)}</dd>
			{#if u.banned}<dt>Ban reason</dt>
				<dd>{u.bannedReason ?? '-'}</dd>{/if}
			<dt>Audit</dt>
			<dd><a href="/admin/audit?type=user&id={u.id}">Changes made to this account</a></dd>
		</Facts>
	</Panel>

	<Panel title="Acorn history">
		{#if data.ledger.length}
			<Table small>
				<thead><tr><th>When</th><th>What</th><th class="n">Acorns</th><th>Note</th></tr></thead>
				<tbody>
					{#each data.ledger as l (l.entry.id)}
						<tr>
							<td class="nowrap">{et(l.entry.createdAt).replace(' ET', '')}</td>
							<td>
								{reasons[l.entry.reason] ?? l.entry.reason}{l.round?.number
									? ` · R${l.round.number}`
									: ''}
								{#if l.actor?.name}<span class="muted"> by {l.actor.name}</span>{/if}
							</td>
							<td class="n" class:plus={l.entry.amount > 0} class:minus={l.entry.amount < 0}>
								{l.entry.amount > 0 ? '+' : ''}{num(l.entry.amount)}
							</td>
							<td>{l.entry.note ?? ''}</td>
						</tr>
					{/each}
				</tbody>
			</Table>
		{:else}
			<p class="muted">No acorns yet.</p>
		{/if}
	</Panel>

	{#if data.ships.length}
		<Panel title="Ships">
			<Table small>
				<thead>
					<tr>
						<th class="n">Round</th><th>Project</th><th>Status</th><th class="n">Tier</th><th
							class="n"
						>
							Hours
						</th>
					</tr>
				</thead>
				<tbody>
					{#each data.ships as s (s.id)}
						<tr>
							<td class="n">{s.roundNumber}</td>
							<td><a href="/review/ships/{s.id}">{s.projectName}</a></td>
							<td><Stamp {...shipStamp[s.status]} /></td>
							<td class="n">{s.tier ?? '-'}</td>
							<td class="n">{hrs(s.approvedHours)} / {hrs(s.claimedHours)}</td>
						</tr>
					{/each}
				</tbody>
			</Table>
		</Panel>
	{/if}

	{#if data.orders.length}
		<Panel title="Orders">
			<Table small>
				<thead>
					<tr><th>#</th><th>Item</th><th class="n">Total</th><th>Status</th><th>Placed</th></tr>
				</thead>
				<tbody>
					{#each data.orders as o (o.order.id)}
						<tr>
							<td>{o.order.id}</td>
							<td>{o.item.name}{o.order.quantity > 1 ? ` x${o.order.quantity}` : ''}</td>
							<td class="n">{o.order.total}</td>
							<td><Stamp {...orderStamp[o.order.status]} /></td>
							<td class="nowrap">{et(o.order.createdAt).replace(' ET', '')}</td>
						</tr>
					{/each}
				</tbody>
			</Table>
		</Panel>
	{/if}

	{#snippet aside()}
		<Panel title="Role">
			<form method="POST" action="?/role" use:enhance={keep}>
				<div class="field">
					<label for="role" class="visually-hidden">Role</label>
					<select id="role" name="role">
						<option value="user" selected={u.role === 'user'}>User</option>
						<option value="reviewer" selected={u.role === 'reviewer'}>
							Reviewer: reviews ships, disputes, hours
						</option>
						<option value="admin" selected={u.role === 'admin'}>
							Admin: also rounds, shop, users
						</option>
					</select>
				</div>
				<div class="field"><button class="btn small" disabled={self}>Change role</button></div>
			</form>
			{#if self}<p class="meta">You can't change your own role.</p>{/if}
		</Panel>

		<Panel title="Adjust acorns">
			<form method="POST" action="?/acorns" use:enhance>
				<div class="field">
					<label for="amount">
						Amount <span class="hint">Use a minus to take acorns off, like -10.</span>
					</label>
					<input id="amount" name="amount" type="number" step="0.01" required />
				</div>
				<div class="field">
					<label for="anote">
						Note <span class="hint">Needed. They see it in their history.</span>
					</label>
					<textarea id="anote" name="note" required minlength="3"></textarea>
				</div>
				<div class="field"><button class="btn small">Save adjustment</button></div>
			</form>
		</Panel>

		{#if u.banned}
			<Panel
				title="Banned"
				note="Lifting the ban lets them sign in again. Voided targets and fixes stay void."
			>
				<form method="POST" action="?/unban" use:enhance>
					<button class="btn small">Lift ban</button>
				</form>
			</Panel>
		{:else}
			<Panel
				title="Ban"
				danger
				note="Blocks sign-in, voids their targets and throws out their open fixes. Acorns stay."
			>
				<form method="POST" action="?/ban" use:enhance>
					<div class="field">
						<label for="reason">Reason <span class="hint">Kept in the audit log.</span></label>
						<textarea id="reason" name="reason" required minlength="3"></textarea>
					</div>
					<div class="field">
						<label class="check">
							<input type="checkbox" name="confirm" value="yes" required /> Yes, ban {u.name}
						</label>
					</div>
					<div class="field"><button class="btn small berry" disabled={self}>Ban</button></div>
				</form>
			</Panel>
		{/if}
	{/snippet}
</Split>

<style>
	.meta {
		margin: var(--s-2) 0 0;
	}
	.plus {
		color: var(--ok-ink);
		font-weight: 700;
	}
	.minus {
		color: var(--bad-ink);
		font-weight: 700;
	}
</style>
