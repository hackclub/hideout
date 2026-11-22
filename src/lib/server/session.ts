import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from './db/index.js';
import { randomToken, sha256 } from './crypto.js';
import { config } from './config.js';

export const SESSION_COOKIE = 'hideout_session';
const DAYS = 30;

export type SessionUser = typeof schema.users.$inferSelect;

export async function createSession(cookies: Cookies, userId: number) {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + DAYS * 864e5);
	await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt });
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production' && config.appUrl.startsWith('https'),
		expires: expiresAt
	});
}

export async function readSession(cookies: Cookies): Promise<SessionUser | null> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	const rows = await db
		.select({ user: schema.users, expiresAt: schema.sessions.expiresAt })
		.from(schema.sessions)
		.innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
		.where(eq(schema.sessions.id, sha256(token)));
	const row = rows[0];
	if (!row || row.expiresAt.getTime() < Date.now()) return null;
	return row.user;
}

export async function endSession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
