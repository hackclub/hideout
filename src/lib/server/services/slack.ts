import { config } from '../config.js';

export async function sendDm(slackId: string, text: string): Promise<'sent' | 'failed'> {
	const res = await fetch('https://slack.com/api/chat.postMessage', {
		method: 'POST',
		headers: {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Bearer ${config.slack.botToken}`
		},
		body: JSON.stringify({ channel: slackId, text, unfurl_links: false })
	});
	const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
	if (!body.ok) {
		console.error('[slack] send failed', body.error);
		return 'failed';
	}
	return 'sent';
}
