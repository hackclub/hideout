import { eq } from 'drizzle-orm';
import { db, schema } from './db/index.js';
import { config } from './config.js';
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
};

export async function upsertUser(p: Profile) {
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
				lastSeenAt: new Date(),
				...(isAdmin ? { role: 'admin' as const } : {})
			})
			.where(eq(schema.users.id, existing.id))
			.returning();
		return u;
	}
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
			role: isAdmin ? 'admin' : 'user',
			lastSeenAt: new Date()
		})
		.returning();
	return u;
}

export function isEligible(user: { verification: string }) {
	return user.verification === 'verified';
}

export function isStaff(user: { role: string } | null) {
	return user?.role === 'reviewer' || user?.role === 'admin';
}
