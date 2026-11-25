import type { Cookies } from '@sveltejs/kit';
import { and, eq, ne, sql } from 'drizzle-orm';
import { db, schema, type Tx } from './db/index.js';
import { config } from './config.js';
import { notify } from './notify.js';
import { FRIEND_ACORNS, INVITE_COOKIE_DAYS, INVITER_ACORNS } from '../game/invites.js';

export const INVITE_COOKIE = 'hideout_ref';

export async function inviterByCode(code: string) {
	if (!/^[a-z0-9]{1,32}$/.test(code)) return null;
	const [u] = await db
		.select({
			id: schema.users.id,
			name: schema.users.name,
			firstName: schema.users.firstName,
			banned: schema.users.banned
		})
		.from(schema.users)
		.where(eq(schema.users.inviteCode, code));
	return u && !u.banned ? u : null;
}

export async function rememberInvite(cookies: Cookies, url: URL) {
	const code = url.searchParams.get('ref');
	if (!code || !(await inviterByCode(code))) return;
	cookies.set(INVITE_COOKIE, code, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production' && config.appUrl.startsWith('https'),
		maxAge: INVITE_COOKIE_DAYS * 86400
	});
}

export async function inviteCounts(userId: number) {
	const [{ joined }] = await db
		.select({ joined: sql<number>`count(*)::int` })
		.from(schema.users)
		.where(eq(schema.users.invitedBy, userId));
	const [{ shipped }] = await db
		.select({ shipped: sql<number>`count(*)::int` })
		.from(schema.ledger)
		.where(
			and(
				eq(schema.ledger.userId, userId),
				eq(schema.ledger.reason, 'referral'),
				eq(schema.ledger.refType, 'inviter')
			)
		);
	return { joined, shipped };
}

export async function notifyJoined(inviterId: number, friendId: number) {
	await notify(inviterId, {
		kind: 'invite.joined',
		title: 'Someone joined Hideout with your invite link',
		body: `You get ${INVITER_ACORNS} acorns when they ship their first project.`,
		link: '/settings',
		dedupeKey: `invite.joined.${friendId}`
	});
}

export async function payReferral(tx: Tx, ship: { id: number; userId: number }, actorId: number) {
	const [friend] = await tx
		.select({ invitedBy: schema.users.invitedBy, banned: schema.users.banned })
		.from(schema.users)
		.where(eq(schema.users.id, ship.userId));
	if (!friend?.invitedBy || friend.banned) return 0;
	const [inviter] = await tx
		.select({ banned: schema.users.banned })
		.from(schema.users)
		.where(eq(schema.users.id, friend.invitedBy));
	if (!inviter || inviter.banned) return 0;
	const [earlier] = await tx
		.select({ id: schema.ships.id })
		.from(schema.ships)
		.where(
			and(
				eq(schema.ships.userId, ship.userId),
				eq(schema.ships.status, 'approved'),
				ne(schema.ships.id, ship.id)
			)
		)
		.limit(1);
	if (earlier) return 0;

	const [paid] = await tx
		.insert(schema.ledger)
		.values({
			userId: friend.invitedBy,
			amount: INVITER_ACORNS,
			reason: 'referral',
			refType: 'inviter',
			refId: ship.userId,
			actorId
		})
		.onConflictDoNothing()
		.returning({ id: schema.ledger.id });
	if (!paid) return 0;
	await tx
		.insert(schema.ledger)
		.values({
			userId: ship.userId,
			amount: FRIEND_ACORNS,
			reason: 'referral',
			refType: 'invitee',
			refId: ship.userId,
			actorId
		})
		.onConflictDoNothing();
	await notify(
		friend.invitedBy,
		{
			kind: 'invite.shipped',
			title: 'A friend you invited shipped',
			body: `+${INVITER_ACORNS} acorns.`,
			link: '/shop',
			dedupeKey: `invite.shipped.${ship.userId}`
		},
		tx
	);
	return FRIEND_ACORNS;
}
