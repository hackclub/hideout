export const INVITER_ACORNS = 10;
export const FRIEND_ACORNS = 5;
export const INVITE_COOKIE_DAYS = 30;

export function inviteUrl(appUrl: string, code: string) {
	return `${appUrl}/?ref=${code}`;
}

export function firstName(u: { firstName: string | null; name: string }) {
	return u.firstName?.trim() || u.name.trim().split(/\s+/)[0];
}
