<script lang="ts">
	import Acorn from '#lib/ui/Acorn.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { acorns } from '#lib/game/labels.js';

	let {
		name,
		avatarUrl,
		balance,
		compact = false
	}: { name: string; avatarUrl: string | null; balance: number; compact?: boolean } = $props();
</script>

<div class="profile" class:compact>
	<a class="avatar" href="/settings" aria-label="Your settings">
		{#if avatarUrl}<img src={avatarUrl} alt="" />{:else}{name.slice(0, 1)}{/if}
	</a>
	<span class="who">
		<b>{name.split(' ')[0]}</b>
		<a class="bal" href="/shop">
			<Acorn size={16} /><span data-testid="balance">{acorns(balance)}</span><span
				class="visually-hidden"
			>
				acorns
			</span>
		</a>
	</span>
	<a class="icon-btn" href="/settings" aria-label="Settings" title="Settings">
		<Icon name="settings" size={20} />
	</a>
	<form method="POST" action="/logout">
		<button class="icon-btn" aria-label="Log out" title="Log out">
			<Icon name="logout" size={20} />
		</button>
	</form>
</div>

<style>
	.profile {
		display: flex;
		align-items: center;
		gap: var(--s-1);
		height: var(--row);
		padding: 0 var(--s-3) 0 var(--s-5);
	}
	form {
		margin: 0;
	}
	.avatar {
		flex: none;
		width: 40px;
		height: 40px;
		margin-right: var(--s-3);
		border-radius: var(--r-round);
		background: var(--band);
		display: grid;
		place-items: center;
		overflow: hidden;
		color: var(--on-band);
		font: 800 var(--fs-3) / 1 var(--font-display);
		text-decoration: none;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.who {
		flex: 1;
		min-width: 0;
	}
	b {
		display: block;
		font: 700 var(--fs-3) / 1.1 var(--font-display);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.bal {
		display: inline-flex;
		align-items: center;
		gap: var(--s-1);
		font-weight: 600;
		font-size: var(--fs-1);
		font-variant-numeric: tabular-nums;
		color: inherit;
		text-decoration: none;
	}
	.icon-btn {
		flex: none;
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
	.icon-btn:hover {
		background: rgba(60, 30, 10, 0.08);
	}
	.profile :focus-visible {
		outline-color: var(--on-wood);
	}

	.compact {
		justify-content: center;
		padding: 0;
	}
	.compact .avatar {
		margin: 0;
	}
	.compact .who,
	.compact .icon-btn,
	.compact form {
		display: none;
	}

	@media (max-width: 760px) {
		.profile,
		.compact {
			flex-direction: column;
			height: auto;
			gap: var(--s-1);
			padding: 0 0 0 var(--s-4);
			border-left: 1px solid rgba(59, 35, 20, 0.25);
		}
		.avatar {
			margin: 0;
		}
		.who,
		.compact .who {
			display: block;
		}
		b,
		.icon-btn,
		form {
			display: none;
		}
	}
</style>
