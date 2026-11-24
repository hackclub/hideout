<script lang="ts">
	let {
		name,
		price,
		acornCents,
		image = null,
		logos = []
	}: {
		name: string;
		price: number;
		acornCents: number;
		image?: string | null;
		logos?: string[];
	} = $props();

	const dollars = $derived((price * acornCents) / 100);
	const amount = $derived(Number.isInteger(dollars) ? `${dollars}` : dollars.toFixed(2));
</script>

{#snippet logo(slug: string)}
	<span class="logo" style:--src="url(/logos/{slug}.svg)">
		<img src="/logos/{slug}.svg" alt="" />
	</span>
{/snippet}

<span class="fit">
	<span class="grant" role="img" aria-label="{name}, ${amount}">
		<span class="face">
			<span class="say">
				<img class="leaf" src="/leaf-56.png" alt="" />
				<span>
					<span class="amt">${amount}</span>
					<span class="name">{name}</span>
				</span>
			</span>
			<span class="pic">
				{#if image}
					<span class="logos">
						{#each logos as slug (slug)}{@render logo(slug)}{/each}
					</span>
					<span class="shot"><img src={image} alt="" /></span>
				{:else}
					<span class="big" style:--n={[0, 5.5, 3.75][logos.length] ?? 3}>
						{#each logos as slug (slug)}{@render logo(slug)}{/each}
					</span>
				{/if}
			</span>
		</span>
	</span>
</span>

<style>
	.fit {
		position: absolute;
		inset: var(--pad, 0);
		container-type: size;
		display: grid;
		place-items: center;
	}
	.grant {
		--ar: 1.75;
		position: relative;
		display: block;
		width: min(100cqw, 100cqh * var(--ar));
		aspect-ratio: var(--ar);
		container-type: inline-size;
	}
	.grant img {
		position: static;
		display: block;
		margin: 0;
		max-width: none;
		max-height: none;
		border-radius: 0;
	}
	.face {
		--u: 5cqw;
		position: absolute;
		inset: 0;
		display: flex;
		gap: calc(var(--u) * 0.75);
		padding: calc(var(--u) * 1.25) calc(var(--u) * 1.25) calc(var(--u) * 1.25) calc(var(--u) * 1.5);
		overflow: hidden;
		color: var(--on-wood);
		background:
			var(--wood-grain),
			linear-gradient(
				90deg,
				rgba(255, 240, 220, 0.18),
				transparent 30%,
				transparent 70%,
				rgba(90, 48, 22, 0.08)
			),
			#dcab84;
		border-radius: var(--u);
		box-shadow: 0 calc(var(--u) * 0.25) 0 #5c341e;
	}
	.say {
		flex: 0 0 46%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
	.leaf {
		width: calc(var(--u) * 1.75);
		height: auto;
	}
	.amt,
	.name {
		display: block;
		font-family: var(--font-display);
		mix-blend-mode: multiply;
	}
	.amt {
		margin-bottom: calc(var(--u) * 0.25);
		font-size: calc(var(--u) * 3.8125);
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.01em;
	}
	.name {
		font-size: max(11px, calc(var(--u) * 1.25));
		font-weight: 700;
		line-height: 1.1;
		text-wrap: balance;
	}
	.pic {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: calc(var(--u) * 0.5);
	}
	.logos {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: calc(var(--u) * 0.5);
	}
	.logo {
		--s: calc(var(--u) * 1.25);
		flex: none;
		display: block;
		height: var(--s);
		background: currentColor;
		mix-blend-mode: multiply;
		-webkit-mask: var(--src) center / 100% 100% no-repeat;
		mask: var(--src) center / 100% 100% no-repeat;
	}
	.logo img {
		width: auto;
		height: 100%;
		visibility: hidden;
	}
	.shot {
		position: relative;
		flex: 1;
		min-height: 0;
	}
	.shot img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center bottom;
	}
	.big {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		align-content: center;
		justify-content: center;
		gap: calc(var(--u) * 0.75);
	}
	.big .logo {
		--s: calc(var(--u) * var(--n));
	}

	@container (width < 320px) {
		.logos .logo {
			--s: calc(var(--u) * 2);
		}
		.logos .logo:nth-child(n + 3) {
			display: none;
		}
	}
</style>
