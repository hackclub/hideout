import { error } from '@sveltejs/kit';
import { readImage } from '#lib/server/services/storage.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const image = await readImage(params.name);
	if (!image) error(404, 'Not found');
	return new Response(new Uint8Array(image.bytes), {
		headers: {
			'content-type': image.type,
			'cache-control': 'public, max-age=31536000, immutable',
			'x-content-type-options': 'nosniff'
		}
	});
};
