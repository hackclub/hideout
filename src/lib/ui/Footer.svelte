<script lang="ts">
	import { site } from '#lib/content/copy.js';
</script>

<footer class="footer">
	<div class="inner">
		<div class="credit">
			<p>
				<b>Hideout</b> is a <a href="https://hackclub.com">Hack Club</a> program for teens 13 to 18.
			</p>
			<p class="small">Made by {site.madeBy} &amp; Sponsored by {site.sponsoredBy}</p>
		</div>
		<nav aria-label="Footer">
			<a href="/rules">How it works</a>
			<a href="/leaderboard">Leaderboard</a>
			<a href="https://forms.hackclub.com/bounty">Fulfillment bounty</a>
			<a href="https://hackclub.com/conduct/">Code of conduct</a>
			<a href="https://hackclub.com/privacy-and-terms#hack-club-privacy-notice">Privacy</a>
			<a href="https://hackclub.com/privacy-and-terms#hack-club-standard-terms-and-conditions">
				Terms
			</a>
		</nav>
	</div>
</footer>

<style>
	.footer {
		position: relative;
		margin-top: calc(var(--s-4) * -1);
		padding: var(--s-7) var(--s-5) var(--s-6);
		background: var(--grain), #93432a;
		color: #fff3ec;
		clip-path: polygon(
			0 12px,
			5% 3px,
			11% 14px,
			19% 1px,
			27% 11px,
			34% 4px,
			42% 15px,
			51% 2px,
			58% 12px,
			66% 0,
			74% 13px,
			82% 4px,
			89% 14px,
			95% 2px,
			100% 9px,
			100% 100%,
			0 100%
		);
	}
	.inner {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--s-4) var(--s-6);
	}
	p {
		margin: 0;
	}
	b {
		font: 700 var(--fs-3) / 1 var(--font-display);
	}
	.small {
		margin-top: var(--s-2);
		font-size: var(--fs-1);
		color: #f8dccf;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2) var(--s-5);
	}
	a {
		color: #f8dccf;
		text-decoration: none;
	}
	a:hover {
		color: #fff3ec;
		text-decoration: underline;
	}

	@media (max-width: 760px) {
		.footer {
			padding: var(--s-7) var(--s-4) var(--footer-bottom, var(--s-6));
		}
		.inner {
			flex-direction: column;
		}
	}
</style>
