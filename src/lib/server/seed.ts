import { db, schema } from './db/index.js';
import { DEFAULT_SEASON_CONFIG } from './db/schema.js';
import { roundDates } from '../game/phase.js';

const ITEMS: (typeof schema.items.$inferInsert)[] = [
	{
		name: 'Sticker pile',
		blurb: 'A handful of Hack Club stickers for your laptop.',
		category: 'physical',
		price: 20,
		imageUrl: '/shop/sticker-pile.webp',
		sort: 1
	},
	{
		name: 'Free domain',
		blurb: 'An $11 grant to buy a domain for your project.',
		category: 'digital',
		price: 44,
		maxPerUser: 2,
		imageUrl: '/shop/free-domain.webp',
		sort: 2
	},
	{
		name: 'Cloud hosting credits',
		blurb: '$10 of credits at your favorite hosting provider.',
		category: 'digital',
		price: 40,
		imageUrl: '/shop/cloud-hosting-credits.webp',
		sort: 3
	},
	{
		name: 'PICO-8 licence',
		blurb: 'The fantasy console that makes tiny games feel huge.',
		category: 'digital',
		price: 60,
		imageUrl: '/shop/pico-8-licence.webp',
		sort: 4
	},
	{
		name: 'Raspberry Pi Zero 2 W',
		blurb: 'A tiny, cheap Linux computer for your next side project.',
		category: 'physical',
		price: 60,
		stock: 20,
		imageUrl: '/shop/pi-zero-2-w.webp',
		sort: 5
	},
	{
		name: '$25 peripherals grant',
		blurb: 'A $25 HCB card grant for a mouse, cables or whatever your desk is missing.',
		category: 'grant',
		price: 100,
		imageUrl: '/shop/peripherals-grant.webp',
		sort: 6
	},
	{
		name: 'Pinecil',
		blurb: 'A pocket soldering iron for when your project needs some hardware.',
		category: 'physical',
		price: 105,
		stock: 15,
		imageUrl: '/shop/pinecil.webp',
		sort: 7
	},
	{
		name: '$50 monitor grant',
		blurb: 'A $50 HCB card grant toward a second screen.',
		category: 'grant',
		price: 200,
		imageUrl: '/shop/monitor-grant.webp',
		sort: 8
	},
	{
		name: 'YubiKey 5C NFC',
		blurb: 'A hardware security key for GitHub and everything else.',
		category: 'physical',
		price: 230,
		stock: 10,
		imageUrl: '/shop/yubikey-5c-nfc.webp',
		sort: 9
	},
	{
		name: 'AULA F75 keyboard',
		blurb: 'A compact 75% hot-swap mechanical keyboard with RGB.',
		category: 'physical',
		price: 240,
		stock: 10,
		imageUrl: '/shop/aula-f75.webp',
		sort: 10
	},
	{
		name: 'Raspberry Pi 5',
		blurb: 'Fast enough to host a bunch of your projects at home.',
		category: 'physical',
		price: 320,
		stock: 10,
		imageUrl: '/shop/raspberry-pi-5.webp',
		sort: 11
	},
	{
		name: 'Bambu Lab A1 mini',
		blurb: 'A 3D printer for turning your designs into real things.',
		category: 'physical',
		price: 800,
		stock: 3,
		maxPerUser: 1,
		imageUrl: '/shop/bambu-a1-mini.webp',
		sort: 12
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
