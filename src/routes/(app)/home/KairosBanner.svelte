<script lang="ts">
	const MARK = [
		'...o##...',
		'.ooo####.',
		'.oo.####.',
		'oo..##.oo',
		'oo.....oo',
		'oo.....oo',
		'.oo...oo.',
		'.ooooooo.',
		'...ooo...'
	];
	const cells = MARK.flatMap((row, y) =>
		[...row].flatMap((cell, x) => (cell === '.' ? [] : [{ x, y, soft: cell === 'o' }]))
	);
</script>

<a class="kairos" href="https://kairos.hackclub.com" target="_blank" rel="noopener">
	<svg viewBox="0 0 9 9" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">
		{#each cells as c (`${c.x}-${c.y}`)}
			<rect x={c.x} y={c.y} width="1" height="1" opacity={c.soft ? 0.42 : 1} />
		{/each}
	</svg>
	<span class="words">
		<b>Track your time with Kairos</b>
		<span>
			Kairos is our new tracking tool. It's more accurate and will help us credit you the right
			time. It works great with AI too!
		</span>
	</span>
	<span class="go">Get Kairos</span>
</a>

<style>
	.kairos {
		--b: 3px;
		--field: #3a33a3;
		display: flex;
		align-items: center;
		gap: var(--s-4);
		margin: var(--b) var(--b) var(--s-5);
		padding: var(--s-4) var(--s-5);
		color: #fff;
		text-decoration: none;
		background: var(--field);
		box-shadow:
			0 calc(-1 * var(--b)) 0 0 var(--field),
			0 var(--b) 0 0 var(--field),
			calc(-1 * var(--b)) 0 0 0 var(--field),
			var(--b) 0 0 0 var(--field);
	}
	.kairos:focus-visible {
		outline: 3px solid var(--text);
		outline-offset: 6px;
	}
	svg {
		flex: none;
		width: 36px;
		height: 36px;
	}
	.words {
		flex: 1;
		min-width: 0;
	}
	b {
		display: block;
		font: 700 var(--fs-3) / 1.2 var(--font-display);
	}
	.words span {
		display: block;
		margin-top: 2px;
		font-size: var(--fs-1);
		line-height: 1.4;
		color: #dedcf7;
	}
	.go {
		--btn: #fff;
		flex: none;
		margin: var(--b);
		padding: var(--s-2) var(--s-4);
		font-weight: 600;
		color: #1d1633;
		background: var(--btn);
		box-shadow:
			0 calc(-1 * var(--b)) 0 0 var(--btn),
			0 var(--b) 0 0 var(--btn),
			calc(-1 * var(--b)) 0 0 0 var(--btn),
			var(--b) 0 0 0 var(--btn);
		transition: transform 0.15s;
	}
	.kairos:hover .go {
		transform: translateY(-2px);
	}

	@media (max-width: 560px) {
		.kairos {
			flex-wrap: wrap;
		}
		.words {
			flex-basis: calc(100% - 36px - var(--s-4));
		}
	}
</style>
