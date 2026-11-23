import { and, asc, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, schema } from '../db/index.js';
import { config } from '../config.js';
import { now } from '../clock.js';
import { sendToUnified } from '../services/unified.js';
import { unifiedFields, unifiedFixFields } from '../../game/unified.js';
import { LIVE_FIX } from '../../game/score.js';

const reviewer = alias(schema.users, 'reviewer');

export async function flushUnified(limit = 20) {
	const queued = await db
		.select()
		.from(schema.unifiedOutbox)
		.where(eq(schema.unifiedOutbox.state, 'queued'))
		.orderBy(asc(schema.unifiedOutbox.id))
		.limit(limit);
	for (const o of queued) {
		const fields = o.assignmentId
			? await fixFields(o.assignmentId)
			: o.shipId
				? await shipFields(o.shipId)
				: null;
		const result = fields
			? await sendToUnified(fields)
			: { ok: false as const, error: 'The ship or target for this row is gone.' };
		await db
			.update(schema.unifiedOutbox)
			.set(
				result.ok
					? { state: 'sent', sentAt: now(), error: null }
					: { state: 'error', error: result.error }
			)
			.where(eq(schema.unifiedOutbox.id, o.id));
	}
}

async function shipFields(shipId: number) {
	const [row] = await db
		.select({
			ship: schema.ships,
			user: schema.users,
			project: schema.projects,
			round: schema.rounds,
			season: schema.seasons,
			reviewer: { name: reviewer.name }
		})
		.from(schema.ships)
		.innerJoin(schema.users, eq(schema.users.id, schema.ships.userId))
		.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.ships.roundId))
		.innerJoin(schema.seasons, eq(schema.seasons.id, schema.rounds.seasonId))
		.leftJoin(reviewer, eq(reviewer.id, schema.ships.reviewerId))
		.where(eq(schema.ships.id, shipId));
	if (!row) return null;
	return unifiedFields({ appUrl: config.appUrl, ...row });
}

async function fixFields(assignmentId: number) {
	const [row] = await db
		.select({
			a: schema.assignments,
			ship: schema.ships,
			project: { name: schema.projects.name },
			user: schema.users,
			round: schema.rounds,
			season: schema.seasons,
			reviewer: { name: reviewer.name }
		})
		.from(schema.assignments)
		.innerJoin(schema.ships, eq(schema.ships.id, schema.assignments.shipId))
		.innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
		.innerJoin(schema.users, eq(schema.users.id, schema.assignments.raccoonId))
		.innerJoin(schema.rounds, eq(schema.rounds.id, schema.assignments.roundId))
		.innerJoin(schema.seasons, eq(schema.seasons.id, schema.rounds.seasonId))
		.leftJoin(reviewer, eq(reviewer.id, schema.assignments.hoursReviewerId))
		.where(eq(schema.assignments.id, assignmentId));
	if (!row?.a.forkUrl || !row.a.forkDemoUrl) return null;
	const { a, ship } = row;
	const prs = await db
		.select({ url: schema.bugs.prUrl, title: schema.bugs.prTitle, status: schema.bugs.status })
		.from(schema.bugs)
		.where(and(eq(schema.bugs.assignmentId, a.id), inArray(schema.bugs.status, [...LIVE_FIX])))
		.orderBy(asc(schema.bugs.createdAt));
	return unifiedFixFields({
		appUrl: config.appUrl,
		fix: {
			assignmentId: a.id,
			forkUrl: a.forkUrl!,
			demoUrl: a.forkDemoUrl!,
			screenshotUrl: a.forkScreenshotUrl,
			hackatimeProject: a.hackatimeProject ?? '',
			claimedHours: a.claimedHours ?? 0,
			approvedHours: a.approvedHours ?? 0,
			reviewNote: a.hoursNote,
			reviewedAt: a.hoursReviewedAt
		},
		target: {
			shipId: ship.id,
			name: row.project.name,
			repoUrl: ship.repoUrl,
			commitSha: ship.commitSha
		},
		prs,
		user: row.user,
		season: row.season,
		round: row.round,
		reviewer: row.reviewer
	});
}
