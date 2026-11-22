import type { SubmitFunction } from '$app/forms';

export const keep: SubmitFunction =
	() =>
	async ({ update }) =>
		update({ reset: false });
