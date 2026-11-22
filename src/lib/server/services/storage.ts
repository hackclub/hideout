import { randomBytes } from 'node:crypto';
import { AwsClient } from 'aws4fetch';
import { config } from '../config.js';

export type ImageType = 'image/png' | 'image/jpeg' | 'image/webp';

const EXT: Record<ImageType, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp'
};

const NAME = /^[0-9a-f]{32}\.(png|jpg|webp)$/;

const s3 = new AwsClient({
	accessKeyId: config.s3.accessKeyId,
	secretAccessKey: config.s3.secretAccessKey,
	region: config.s3.region,
	service: 's3'
});

const objectUrl = (name: string) => `${config.s3.endpoint}/${config.s3.bucket}/uploads/${name}`;

export function imageType(bytes: Uint8Array): ImageType | null {
	const has = (sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b);
	if (has([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
	if (has([0xff, 0xd8, 0xff])) return 'image/jpeg';
	if (has([0x52, 0x49, 0x46, 0x46]) && has([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
	return null;
}

export async function saveImage(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
	const type = imageType(bytes);
	if (!type) throw new Error('saveImage only takes png, jpeg or webp');
	const name = `${randomBytes(16).toString('hex')}.${EXT[type]}`;
	const res = await s3.fetch(objectUrl(name), {
		method: 'PUT',
		body: bytes,
		headers: { 'content-type': type }
	});
	if (!res.ok) throw new Error(`S3 upload failed (${res.status}): ${await res.text()}`);
	return `/uploads/${name}`;
}

export async function readImage(name: string) {
	if (!NAME.test(name)) return null;
	const res = await s3.fetch(objectUrl(name));
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`S3 read failed (${res.status})`);
	const bytes = new Uint8Array(await res.arrayBuffer());
	const type = imageType(bytes);
	return type ? { bytes, type } : null;
}
