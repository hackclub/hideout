import { config } from '../config.js';
import type { Address } from '../db/schema.js';

export const HCA_SCOPES = 'openid profile email slack_id verification_status address birthdate';

export type HcaProfile = {
	sub: string;
	email: string;
	name: string;
	firstName: string | null;
	lastName: string | null;
	slackId: string | null;
	address: Address | null;
	birthday: string | null;
	verification: string;
	eligible: boolean;
};

export function authorizeUrl(state: string, redirectUri: string) {
	const url = new URL(`${config.hca.issuer}/oauth/authorize`);
	url.searchParams.set('client_id', config.hca.clientId);
	url.searchParams.set('redirect_uri', redirectUri);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', HCA_SCOPES);
	url.searchParams.set('state', state);
	return url.toString();
}

export async function exchangeCode(code: string, redirectUri: string): Promise<HcaProfile> {
	const tokenRes = await fetch(`${config.hca.issuer}/oauth/token`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			client_id: config.hca.clientId,
			client_secret: config.hca.clientSecret
		})
	});
	if (!tokenRes.ok) throw new Error(`HCA token exchange failed: ${tokenRes.status}`);
	const { access_token } = (await tokenRes.json()) as { access_token: string };

	const infoRes = await fetch(`${config.hca.issuer}/oauth/userinfo`, {
		headers: { authorization: `Bearer ${access_token}` }
	});
	if (!infoRes.ok) throw new Error(`HCA userinfo failed: ${infoRes.status}`);
	const info = (await infoRes.json()) as Record<string, unknown>;

	const name = String(info.name ?? info.nickname ?? 'Hack Clubber');
	return {
		sub: String(info.sub),
		email: String(info.email ?? ''),
		name,
		firstName: info.given_name ? String(info.given_name) : null,
		lastName: info.family_name ? String(info.family_name) : null,
		slackId: info.slack_id ? String(info.slack_id) : null,
		address: hcaAddress(info.address, name),
		birthday: hcaBirthday(info.birthdate),
		...eligibility(info)
	};
}

const regions = new Intl.DisplayNames(['en'], { type: 'region' });

export function hcaAddress(raw: unknown, name: string): Address | null {
	if (!raw || typeof raw !== 'object') return null;
	const a = raw as Record<string, unknown>;
	const s = (k: string) => (typeof a[k] === 'string' ? (a[k] as string).trim() : '');
	const [line1, ...rest] = s('street_address')
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean);
	const code = s('country').toUpperCase();
	let country = code;
	if (/^[A-Z]{2}$/.test(code)) {
		try {
			country = regions.of(code) ?? code;
		} catch {}
	}
	const address: Address = {
		name,
		line1: line1 ?? '',
		line2: rest.join(', ') || undefined,
		city: s('locality'),
		state: s('region') || undefined,
		postcode: s('postal_code'),
		country
	};
	return address.line1 && address.city && address.postcode && address.country ? address : null;
}

export function hcaBirthday(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const day = raw.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
	const d = new Date(`${day}T00:00:00Z`);
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day ? day : null;
}

export function eligibility(info: Record<string, unknown>) {
	const status = String(info.verification_status ?? 'unknown');
	const eligible = status === 'verified' && info.ysws_eligible === true;
	return {
		eligible,
		verification: eligible ? 'verified' : status === 'verified' ? 'verified_but_ineligible' : status
	};
}
