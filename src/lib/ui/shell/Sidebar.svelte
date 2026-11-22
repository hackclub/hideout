<script lang="ts">
	import { page } from '$app/state';
	import Icon, { type IconName } from '#lib/ui/Icon.svelte';
	import RoundStatus from './RoundStatus.svelte';
	import ProfileCard from './ProfileCard.svelte';
	import type { ComponentProps } from 'svelte';

	type Link = { href: string; label: string; icon: IconName; match: string[]; count?: number };

	let {
		me,
		balance,
		unread,
		round,
		now,
		closed,
		ontoggle
	}: {
		me: { name: string; avatarUrl: string | null; role: string };
		balance: number;
		unread: number;
		round: ComponentProps<typeof RoundStatus>['round'] | null;
		now: Date;
		closed: boolean;
		ontoggle: () => void;
	} = $props();

	const links: Link[] = [
		{ href: '/home', label: 'Home', icon: 'home', match: ['/home'] },
		{ href: '/projects', label: 'Projects', icon: 'project', match: ['/projects'] },
		{ href: '/break', label: 'Break', icon: 'break', match: ['/break'] },
		{ href: '/shop', label: 'Shop', icon: 'shop', match: ['/shop'] }
	];

	const staffLink = $derived<Link | null>(
		me.role === 'admin'
			? { href: '/admin', label: 'Admin', icon: 'admin', match: ['/admin', '/review'] }
			: me.role === 'reviewer'
				? { href: '/review', label: 'Review', icon: 'review', match: ['/review'] }
				: null
	);

	const more = $derived<Link[]>([
		{
			href: '/notifications',
			label: 'Notifications',
			icon: 'bell',
			match: ['/notifications'],
			count: unread
		},
		...(staffLink ? [staffLink] : [])
	]);

	const isActive = (l: Link) =>
		l.match.some((m) => page.url.pathname === m || page.url.pathname.startsWith(`${m}/`));
</script>

{#snippet tab(l: Link, small = false)}
	<a
		class="tab"
		class:small
		href={l.href}
		aria-current={isActive(l) ? 'page' : undefined}
		title={closed ? l.label : undefined}
	>
		<span class="ico"><Icon name={l.icon} size={small ? 20 : 24} /></span>
		<span class="label">{l.label}</span>
		{#if l.count}<span class="dot" aria-label="{l.count} unread">{l.count}</span>{/if}
	</a>
{/snippet}

<aside class="side" class:closed>
	<div class="panel">
		<div class="brand-row">
			<a class="brand" href="/home">
				<img src="/leaf-28.png" srcset="/leaf-56.png 2x" width="28" height="28" alt="" />
				Hideout
			</a>
			<button
				class="toggle"
				onclick={ontoggle}
				aria-expanded={!closed}
				aria-label={closed ? 'Open sidebar' : 'Close sidebar'}
				title={closed ? 'Open sidebar' : 'Close sidebar'}
			>
				<Icon name={closed ? 'sidebar-open' : 'sidebar-close'} size={22} />
			</button>
		</div>
		<nav class="tabs" aria-label="Main">
			{#each links as l (l.href)}{@render tab(l)}{/each}
		</nav>
		<nav class="more" aria-label="More">
			{#each more as l (l.href)}{@render tab(l, true)}{/each}
		</nav>
		{#if round}<RoundStatus {round} {now} hidden={closed} />{/if}
		<div class="me">
			<ProfileCard name={me.name} avatarUrl={me.avatarUrl} {balance} compact={closed} />
		</div>
	</div>
</aside>

<style>
	.side {
		position: sticky;
		top: 0;
		padding: var(--s-5) 0;
		z-index: 5;
	}
	.panel {
		display: flex;
		flex-direction: column;
		height: calc(100dvh - 2 * var(--s-5));
		overflow: hidden auto;
		background: var(--wood);
		color: var(--on-wood);
		border-radius: var(--r-2);
		box-shadow:
			var(--halo),
			0 4px 0 -1px rgba(31, 42, 58, 0.18);
	}
	@supports (height: round(down, 100px, 64px)) {
		.panel {
			height: round(down, calc(100dvh - 2 * var(--s-5)), var(--row));
		}
	}
	.panel > * {
		flex: none;
	}
	.brand-row {
		display: flex;
		align-items: center;
		height: var(--row);
		padding: 0 var(--s-3) 0 var(--s-5);
	}
	.brand {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--s-3);
		font: 800 var(--fs-4) / 1 var(--font-display);
		color: inherit;
		text-decoration: none;
	}
	.brand img {
		width: 28px;
		height: 28px;
		flex: none;
	}
	.toggle {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: var(--r-1);
		background: none;
		color: inherit;
		cursor: pointer;
	}
	.toggle:hover {
		background: rgba(60, 30, 10, 0.08);
	}
	.tabs,
	.more {
		display: flex;
		flex-direction: column;
	}
	.more {
		margin-bottom: auto;
	}
	.tab {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--s-4);
		height: var(--row);
		padding: 0 var(--s-5);
		font: 700 var(--fs-4) / 1 var(--font-display);
		color: inherit;
		text-decoration: none;
		white-space: nowrap;
	}
	.tab.small {
		font-size: var(--fs-3);
	}
	.ico {
		flex: none;
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: var(--r-round);
	}
	.tab:hover {
		background: rgba(60, 30, 10, 0.07);
	}
	.tab[aria-current] {
		background: var(--band);
		color: var(--on-band);
	}
	.tab[aria-current] .ico {
		background: var(--on-band);
		color: var(--band);
	}
	.tab:focus-visible {
		outline: 3px solid var(--on-wood);
		outline-offset: -4px;
	}
	.dot {
		margin-left: auto;
		min-width: 24px;
		height: 24px;
		padding: 0 var(--s-2);
		display: grid;
		place-items: center;
		border-radius: var(--r-round);
		background: var(--clay);
		color: #fff;
		font: 700 var(--fs-1) / 1 var(--font-body);
	}

	.closed .brand-row {
		justify-content: center;
		padding: 0;
	}
	.closed .brand,
	.closed .label {
		display: none;
	}
	.closed .tab {
		justify-content: center;
		padding: 0;
	}
	.closed .dot {
		position: absolute;
		top: var(--s-1);
		right: var(--s-2);
		min-width: 20px;
		height: 20px;
		padding: 0 var(--s-1);
	}

	@media (max-width: 760px) {
		.side,
		.closed {
			position: static;
			display: flex;
			align-items: center;
			gap: var(--s-4);
			margin-bottom: var(--s-5);
			padding: var(--s-3) var(--s-4);
			color: var(--on-wood);
			background: var(--wood-grain), #dcab84;
			border-radius: var(--r-2);
			box-shadow:
				var(--halo),
				0 4px 0 -1px rgba(31, 42, 58, 0.18);
		}
		.panel {
			display: contents;
		}
		.brand-row {
			display: none;
		}
		.me {
			order: 2;
		}
		.more {
			order: 1;
			flex-direction: row;
			gap: var(--s-1);
			margin-bottom: 0;
		}
		.more .tab {
			width: 40px;
			height: 40px;
			padding: 0;
			justify-content: center;
		}
		.more .label {
			display: none;
		}
		.tabs {
			position: fixed;
			z-index: 10;
			left: var(--s-2);
			right: var(--s-2);
			bottom: calc(var(--s-2) + env(safe-area-inset-bottom));
			height: var(--row);
			flex-direction: row;
			padding: var(--s-1);
			background: var(--wood);
			color: var(--on-wood);
			border-radius: var(--r-2);
			box-shadow:
				var(--halo),
				0 4px 0 -1px rgba(31, 42, 58, 0.18);
		}
		.tab,
		.closed .tab {
			flex: 1;
			flex-direction: column;
			justify-content: center;
			gap: var(--s-1);
			height: 100%;
			padding: 0;
			border-radius: var(--r-1);
			font-size: var(--fs-1);
		}
		.closed .label {
			display: inline;
		}
		.ico {
			width: 28px;
			height: 28px;
		}
		.dot,
		.closed .dot {
			position: absolute;
			top: var(--s-1);
			right: 18%;
			min-width: 18px;
			height: 18px;
			padding: 0 var(--s-1);
			margin: 0;
		}
	}
</style>
