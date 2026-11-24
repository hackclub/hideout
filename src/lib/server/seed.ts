import { db, schema } from './db/index.js';
import { DEFAULT_SEASON_CONFIG } from './db/schema.js';
import { roundDates } from '../game/phase.js';

const ITEMS: (typeof schema.items.$inferInsert)[] = [
	{
		name: 'Hardware grant',
		blurb: 'A stackable grant for boards, sensors and parts for your next build.',
		category: 'grant',
		price: 20,
		imageUrl: '/shop/raspberry-pi-5.webp',
		logos: ['arduino', 'raspberrypi', 'adafruit', 'sparkfun'],
		sort: 1
	},
	{
		name: 'Chrome Web Store fee',
		blurb: 'Covers the one-time fee to publish your extension on the Chrome Web Store.',
		category: 'grant',
		price: 20,
		logos: ['googlechrome'],
		sort: 2
	},
	{
		name: 'Free domain',
		blurb: 'A grant to buy a domain for your project.',
		category: 'grant',
		price: 40,
		logos: ['namecheap', 'porkbun', 'cloudflare'],
		sort: 3
	},
	{
		name: 'Hosting credits',
		blurb: 'Credits at the hosting provider you like, to keep your project online.',
		category: 'grant',
		price: 40,
		imageUrl: '/shop/hosting-credits.webp',
		logos: ['cloudflare', 'digitalocean', 'hetzner'],
		sort: 4
	},
	{
		name: 'AI credits',
		blurb: 'API credits for the AI provider your project uses.',
		category: 'grant',
		price: 40,
		logos: ['anthropic', 'googlegemini', 'mistralai', 'deepseek'],
		sort: 5
	},
	{
		name: '3D printing credits',
		blurb: 'Credits toward getting your parts 3D printed.',
		category: 'grant',
		price: 40,
		imageUrl: '/shop/bambu-a1-mini.webp',
		logos: ['bambulab', 'creality'],
		sort: 6
	},
	{
		name: 'Steam/GOG gift card',
		blurb: 'A gift card for games on Steam or GOG.',
		category: 'grant',
		price: 40,
		logos: ['steam', 'gogdotcom'],
		sort: 7
	},
	{
		name: 'Google Play developer fee',
		blurb: 'Covers the one-time fee to publish your app on Google Play.',
		category: 'grant',
		price: 100,
		logos: ['googleplay'],
		sort: 8
	},
	{
		name: 'Laptop grant',
		blurb: 'A stackable grant toward a new laptop.',
		category: 'grant',
		price: 200,
		imageUrl: '/shop/laptop-grant.webp',
		logos: ['apple', 'framework', 'lenovo', 'hp'],
		sort: 9
	},
	{
		name: 'PC grant',
		blurb: 'A stackable grant toward parts for a desktop PC.',
		category: 'grant',
		price: 200,
		imageUrl: '/shop/pc-grant.webp',
		logos: ['nvidia', 'amd', 'intel', 'corsair'],
		sort: 10
	},
	{
		name: 'Tablet grant',
		blurb: 'A stackable grant toward a tablet for drawing, notes or testing your apps.',
		category: 'grant',
		price: 200,
		imageUrl: '/shop/tablet-grant.webp',
		logos: ['apple', 'samsung', 'wacom'],
		sort: 11
	},
	{
		name: 'Raspberry Pi Zero 2 W',
		blurb: 'A tiny, cheap Linux computer for your next side project.',
		category: 'physical',
		price: 60,
		imageUrl: '/shop/pi-zero-2-w.webp',
		sort: 12
	},
	{
		name: 'Raspberry Pi 5 4GB',
		blurb: 'Fast enough to host a bunch of your projects at home.',
		category: 'physical',
		price: 440,
		imageUrl: '/shop/raspberry-pi-5.webp',
		sort: 13
	},
	{
		name: 'Raspberry Pi 5 8GB',
		blurb: 'The Raspberry Pi 5 with twice the memory, for heavier projects.',
		category: 'physical',
		price: 720,
		imageUrl: '/shop/raspberry-pi-5.webp',
		sort: 14
	},
	{
		name: 'AirTag',
		blurb: 'A tracker that helps you find your keys or bag with your phone.',
		category: 'physical',
		price: 116,
		imageUrl: '/shop/airtag.webp',
		sort: 15
	},
	{
		name: 'AirTag 4-pack',
		blurb: 'Four AirTags for your keys, bag, bike and anything else you tend to lose.',
		category: 'physical',
		price: 396,
		imageUrl: '/shop/airtag-4-pack.webp',
		sort: 16
	},
	{
		name: 'Apple Pencil (USB-C)',
		blurb: 'A pencil for drawing and taking notes on iPad that charges over USB-C.',
		category: 'physical',
		price: 316,
		imageUrl: '/shop/apple-pencil-usb-c.webp',
		sort: 17
	},
	{
		name: 'Apple Pencil Pro',
		blurb: "Apple's best pencil for iPad, with squeeze and haptic feedback.",
		category: 'physical',
		price: 516,
		imageUrl: '/shop/apple-pencil-pro.webp',
		sort: 18
	},
	{
		name: 'AirPods Pro 3',
		blurb: 'Noise-cancelling earbuds for when you need to focus.',
		category: 'physical',
		price: 996,
		imageUrl: '/shop/airpods-pro-3.webp',
		sort: 19
	},
	{
		name: 'iPad mini (A20 Pro, 128GB)',
		blurb: 'A small iPad that fits in a jacket pocket, good for notes, reading and testing apps.',
		category: 'physical',
		price: 2796,
		imageUrl: '/shop/ipad-mini.webp',
		sort: 20
	},
	{
		name: 'MacBook Neo 256GB',
		blurb: 'A light MacBook for coding wherever you are, with 256GB of storage.',
		category: 'physical',
		price: 2796,
		imageUrl: '/shop/macbook-neo-256.webp',
		sort: 21
	},
	{
		name: 'MacBook Neo 512GB + Touch ID',
		blurb: 'The MacBook Neo with 512GB of storage and Touch ID.',
		category: 'physical',
		price: 3196,
		imageUrl: '/shop/macbook-neo-512.webp',
		sort: 22
	},
	{
		name: '11" iPad Air (M4)',
		blurb: 'An 11-inch iPad Air with the M4 chip for drawing, notes and apps.',
		category: 'physical',
		price: 2996,
		imageUrl: '/shop/ipad-air-11.webp',
		sort: 23
	},
	{
		name: 'MacBook Air 13" M5',
		blurb: 'A 13-inch MacBook Air with the M5 chip that handles nearly anything you build.',
		category: 'physical',
		price: 5196,
		imageUrl: '/shop/macbook-air-13.webp',
		sort: 24
	},
	{
		name: 'MacBook Air 15" M5',
		blurb: 'The MacBook Air with the M5 chip and a bigger 15-inch screen.',
		category: 'physical',
		price: 5996,
		imageUrl: '/shop/macbook-air-15.webp',
		sort: 25
	}
];

export async function seedIfEmpty() {
	await db.transaction(async (tx) => {
		const [existing] = await tx.select({ id: schema.seasons.id }).from(schema.seasons).limit(1);
		if (existing) return;
		const start = new Date('2026-11-24T00:00:00-05:00');
		const [season] = await tx
			.insert(schema.seasons)
			.values({ name: 'Season 1', startsAt: start, config: DEFAULT_SEASON_CONFIG })
			.returning();
		for (let n = 1; n <= 4; n++) {
			await tx
				.insert(schema.rounds)
				.values({ seasonId: season.id, number: n, ...roundDates(start, n) });
		}
		await tx.insert(schema.items).values(ITEMS);
		console.log('Seeded Season 1 and the shop.');
	});
}
