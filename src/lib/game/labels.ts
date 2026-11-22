type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'plain';

export const shipStamp: Record<string, { text: string; tone: Tone }> = {
	pending: { text: 'Waiting for review', tone: 'info' },
	approved: { text: 'Approved', tone: 'ok' },
	changes: { text: 'Needs changes', tone: 'warn' },
	rejected: { text: 'Not accepted', tone: 'bad' },
	withdrawn: { text: 'Withdrawn', tone: 'plain' }
};

export const bugStamp: Record<string, { text: string; tone: Tone }> = {
	waiting: { text: 'Waiting on builder', tone: 'info' },
	accepted: { text: 'Accepted', tone: 'ok' },
	disputed: { text: 'Disputed', tone: 'warn' },
	merged: { text: 'Merged', tone: 'ok' },
	invalid: { text: 'Not a bug', tone: 'bad' },
	duplicate: { text: 'Duplicate', tone: 'plain' },
	withdrawn: { text: 'Withdrawn', tone: 'plain' }
};

export const orderStamp: Record<string, { text: string; tone: Tone }> = {
	pending: { text: 'Pending', tone: 'info' },
	approved: { text: 'Approved', tone: 'ok' },
	fulfilled: { text: 'Sent', tone: 'ok' },
	rejected: { text: 'Rejected', tone: 'bad' },
	cancelled: { text: 'Cancelled', tone: 'plain' }
};

export function targetStamp(
	status: string,
	fixes: { status: string }[]
): { text: string; tone: Tone } {
	if (status === 'void') return { text: 'Closed', tone: 'bad' };
	const merged = fixes.filter((f) => f.status === 'merged').length;
	if (merged) return { text: `${merged} ${merged === 1 ? 'fix' : 'fixes'} merged`, tone: 'ok' };
	if (fixes.some((f) => ['waiting', 'accepted', 'disputed'].includes(f.status)))
		return { text: 'Fix sent', tone: 'info' };
	return { text: 'No fixes yet', tone: 'plain' };
}

export const sevTone: Record<string, Tone> = { minor: 'plain', major: 'warn', critical: 'bad' };

export function acorns(n: number) {
	return Math.floor(n).toLocaleString();
}

export function when(d: Date | string) {
	return new Date(d).toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

export function day(d: Date | string) {
	return new Date(d).toLocaleDateString(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
}
