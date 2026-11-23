import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db, schema } from './db/index.js';
import { balance } from './game/season.js';
import { targetStamp } from '../game/labels.js';

export async function unreadCount(userId: number) {
	const [row] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(schema.notifications)
		.where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
	return row.n;
}

export async function wallet(userId: number) {
	return { acorns: Math.floor(await balance(userId)) };
}

export async function incomingFixes(shipIds: number[]) {
	if (!shipIds.length) return [];
	return db
		.select({
			bug: schema.bugs,
			raccoon: { name: schema.users.name, githubLogin: schema.users.githubLogin },
			project: { name: schema.projects.name }
		})
		.from(schema.bugs)
		.innerJoin(schema.users, eq(schema.users.id, schema.bugs.raccoonId))
		.innerJoin(schema.ships, eq(schema.ships.id, schema.bugs.shipId))
		.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
		.where(inArray(schema.bugs.shipId, shipIds))
		.orderBy(desc(schema.bugs.createdAt));
}

export async function myTargets(userId: number, roundId: number) {
	const rows = await db
		.select({
			a: schema.assignments,
			ship: {
				id: schema.ships.id,
				repoUrl: schema.ships.repoUrl,
				demoUrl: schema.ships.demoUrl,
				commitSha: schema.ships.commitSha,
				screenshots: schema.ships.screenshots,
				runSteps: schema.ships.runSteps,
				tier: schema.ships.tier
			},
			project: schema.projects,
			owner: { name: schema.users.name }
		})
		.from(schema.assignments)
		.innerJoin(schema.ships, eq(schema.ships.id, schema.assignments.shipId))
		.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
		.innerJoin(schema.users, eq(schema.users.id, schema.ships.userId))
		.where(and(eq(schema.assignments.raccoonId, userId), eq(schema.assignments.roundId, roundId)))
		.orderBy(schema.assignments.id);
	const ids = rows.map((r) => r.a.id);
	const fixes = ids.length
		? await db
				.select()
				.from(schema.bugs)
				.where(inArray(schema.bugs.assignmentId, ids))
				.orderBy(desc(schema.bugs.createdAt))
		: [];
	return rows.map((r) => ({ ...r, fixes: fixes.filter((f) => f.assignmentId === r.a.id) }));
}

export async function targetCards(userId: number, roundId: number) {
	return (await myTargets(userId, roundId)).map((t) => ({
		id: t.a.id,
		name: t.project.name,
		owner: t.owner.name,
		description: t.project.description,
		screenshot: t.ship.screenshots[0] ?? null,
		status: targetStamp(t.a.status, t.fixes)
	}));
}
