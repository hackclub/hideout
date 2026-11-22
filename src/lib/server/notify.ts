import { eq } from 'drizzle-orm';
import { db, schema, type Tx } from './db/index.js';
import { config } from './config.js';
import { sendDm } from './services/slack.js';
import { now } from './clock.js';

export type Notice = {
	kind: string;
	title: string;
	body?: string;
	link?: string;
	dedupeKey?: string;
};

export async function notify(userId: number, notice: Notice, tx?: Tx) {
	await (tx ?? db)
		.insert(schema.notifications)
		.values({ userId, ...notice, body: notice.body ?? '', createdAt: now() })
		.onConflictDoNothing();
}

export async function flushSlack(limit = 50) {
	const queued = await db
		.select({ n: schema.notifications, slackId: schema.users.slackId })
		.from(schema.notifications)
		.innerJoin(schema.users, eq(schema.users.id, schema.notifications.userId))
		.where(eq(schema.notifications.slackState, 'queued'))
		.limit(limit);
	for (const { n, slackId } of queued) {
		let state = 'skipped';
		if (slackId) state = await sendDm(slackId, slackMessage(n, config.appUrl));
		await db
			.update(schema.notifications)
			.set({ slackState: state })
			.where(eq(schema.notifications.id, n.id));
	}
	return queued.length;
}

export function slackEscape(text: string) {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function slackMessage(
	n: { title: string; body: string; link: string | null },
	appUrl: string
) {
	const link = n.link ? `\n<${appUrl}${n.link}|Open in Hideout>` : '';
	return `*${slackEscape(n.title)}*${n.body ? `\n${slackEscape(n.body)}` : ''}${link}`;
}
