export const TZ = 'America/New_York';

const wall = new Intl.DateTimeFormat('en-CA', {
	timeZone: TZ,
	hourCycle: 'h23',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit'
});

export function etInput(d: Date | string | null | undefined) {
	if (!d) return '';
	const p = Object.fromEntries(wall.formatToParts(new Date(d)).map((x) => [x.type, x.value]));
	return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function etDay(d: Date | string) {
	return etInput(d).slice(0, 10);
}

export function parseEt(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return new Date(NaN);
	const naive = new Date(`${value.slice(0, 16)}:00Z`).getTime();
	if (Number.isNaN(naive)) return new Date(NaN);
	let t = naive;
	for (let i = 0; i < 2; i++) t = naive - (new Date(`${etInput(new Date(t))}:00Z`).getTime() - t);
	return new Date(t);
}
