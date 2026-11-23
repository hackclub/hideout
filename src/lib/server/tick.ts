import { and, eq, isNull, lt, lte, notExists, sql } from 'drizzle-orm';
import { db, schema } from './db/index.js';
import { now } from './clock.js';
import { flushSlack, notify } from './notify.js';
import { gameState } from './game/season.js';
import { autoAcceptExpired, remindBuilders, syncMerges } from './game/bugs.js';
import { generateAssignments } from './game/rounds.js';
import { flushUnified } from './game/unified.js';

let running = false;
let lastMergeSync = 0;

export async function tick() {
	if (running) return;
	running = true;
	try {
		await step('assign', async () => {
			const due = await db
				.select()
				.from(schema.rounds)
				.where(
					and(
						isNull(schema.rounds.assignedAt),
						lte(schema.rounds.breakStartsAt, now()),
						eq(schema.rounds.status, 'open')
					)
				);
			for (const round of due) {
				await generateAssignments(round.id, null).catch((e) => console.error('[tick] assign', e));
			}
		});
		await step('remind shippers', remindShippers);
		await step('auto accept', autoAcceptExpired);
		await step('remind builders', remindBuilders);
		if (Date.now() - lastMergeSync >= 10 * 60e3) {
			lastMergeSync = Date.now();
			await step('sync merges', syncMerges);
		}
		await step('unified', flushUnified);
		await step('slack', flushSlack);
		await step('sessions', () =>
			db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()))
		);
	} finally {
		running = false;
	}
}

async function step(name: string, fn: () => Promise<unknown>) {
	try {
		await fn();
	} catch (e) {
		console.error(`[tick] ${name} failed`, e);
	}
}

async function remindShippers() {
	const { round } = await gameState();
	if (!round || round.phase !== 'build') return;
	const left = round.breakStartsAt.getTime() - now().getTime();
	if (left > 24 * 36e5) return;
	const key = `ship.reminder.${round.id}.`;
	const rows = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.leftJoin(
			schema.ships,
			and(eq(schema.ships.userId, schema.users.id), eq(schema.ships.roundId, round.id))
		)
		.where(
			and(
				eq(schema.users.banned, false),
				eq(schema.users.verification, 'verified'),
				isNull(schema.ships.id),
				notExists(
					db
						.select({ one: sql`1` })
						.from(schema.notifications)
						.where(
							eq(schema.notifications.dedupeKey, sql`${key}::text || ${schema.users.id}::text`)
						)
				)
			)
		);
	for (const { id } of rows) {
		await notify(id, {
			kind: 'ship.reminder',
			title: 'Build week ends in less than a day',
			body: "You haven't shipped a project this round yet.",
			link: '/projects',
			dedupeKey: `${key}${id}`
		});
	}
}

let timer: ReturnType<typeof setInterval> | null = null;
let first: ReturnType<typeof setTimeout> | null = null;

export function startTicker() {
	if (timer || process.env.TICKER === 'off') return;
	timer = setInterval(tick, 60e3);
	first = setTimeout(tick, 2e3);
}

export function stopTicker() {
	if (timer) clearInterval(timer);
	if (first) clearTimeout(first);
	timer = first = null;
}
