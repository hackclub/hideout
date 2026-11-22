import { config } from '../config.js';

export async function sendToUnified(
	fields: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
	const res = await fetch(
		`https://api.airtable.com/v0/${config.unified.baseId}/${config.unified.tableId}`,
		{
			method: 'PATCH',
			headers: {
				authorization: `Bearer ${config.unified.token}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				performUpsert: { fieldsToMergeOn: ['hideout_ship_id'] },
				records: [{ fields }]
			})
		}
	);
	if (!res.ok) return { ok: false, error: `Airtable ${res.status}: ${await res.text()}` };
	return { ok: true };
}
