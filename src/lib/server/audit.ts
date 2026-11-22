import { db, schema, type Tx } from './db/index.js';
import { now } from './clock.js';

export async function logAudit(
	actorId: number | null,
	action: string,
	target?: { type: string; id: number },
	data?: Record<string, unknown>,
	tx?: Tx
) {
	await (tx ?? db).insert(schema.audit).values({
		actorId,
		action,
		targetType: target?.type,
		targetId: target?.id,
		data,
		createdAt: now()
	});
}
