import { eq } from 'drizzle-orm';
import { db, schema } from './db/index.js';
import { config } from './config.js';
import { inviterByCode, notifyJoined } from './invites.js';
import { joinChannels } from './services/slack.js';
import type { Address } from './db/schema.js';

export type Profile = {
	hcaId: string;
	email: string;
	name: string;
	firstName: string | null;
	lastName: string | null;
	slackId: string | null;
	verification: string;
	avatarUrl?: string | null;
	address?: Address | null;
	birthday?: string | null;
};

export async function upsertUser(p: Profile, inviteCode?: string) {
	const isAdmin =
		(p.slackId && config.adminSlackIds.includes(p.slackId)) || config.adminEmails.includes(p.email);
	const [existing] = await db.select().from(schema.users).where(eq(schema.users.hcaId, p.hcaId));
	if (existing) {
		const [u] = await db
			.update(schema.users)
			.set({
				email: p.email,
				name: p.name,
				firstName: p.firstName,
				lastName: p.lastName,
				slackId: p.slackId,
				verification: p.verification,
				avatarUrl: p.avatarUrl ?? existing.avatarUrl,
				address: p.address ?? existing.address,
				birthday: p.birthday ?? existing.birthday,
				lastSeenAt: new Date(),
				...(isAdmin ? { role: 'admin' as const } : {})
			})
			.where(eq(schema.users.id, existing.id))
			.returning();
		return u;
	}
	const inviter = inviteCode ? await inviterByCode(inviteCode) : null;
	const [u] = await db
		.insert(schema.users)
		.values({
			hcaId: p.hcaId,
			email: p.email,
			name: p.name,
			firstName: p.firstName,
			lastName: p.lastName,
			slackId: p.slackId,
			verification: p.verification,
			avatarUrl: p.avatarUrl ?? null,
			address: p.address ?? null,
			birthday: p.birthday ?? null,
			role: isAdmin ? 'admin' : 'user',
			invitedBy: inviter?.id ?? null,
			lastSeenAt: new Date()
		})
		.returning();
	if (u.slackId) joinChannels(u.slackId).catch((e) => console.error('[slack] invite failed', e));
	if (inviter) await notifyJoined(inviter.id, u.id);
	return u;
}

export function isEligible(user: { verification: string }) {
	return user.verification === 'verified';
}

export function isStaff(user: { role: string } | null) {
	return user?.role === 'reviewer' || user?.role === 'admin';
}
