import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { config } from './config.js';

export function randomToken(bytes = 32) {
	return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string) {
	return createHash('sha256').update(value).digest('hex');
}

function key() {
	return createHash('sha256').update(config.encryptionKey).digest();
}

export function encrypt(plain: string) {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key(), iv);
	const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
	return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(sealed: string) {
	const [iv, tag, data] = sealed.split('.').map((s) => Buffer.from(s, 'base64url'));
	const decipher = createDecipheriv('aes-256-gcm', key(), iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
