import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { findShow } from '$lib/shows-db';

export const load: PageServerLoad = async ({ params }) => {
	const show = await findShow(params.date);
	if (!show) {
		error(404, 'Show not found');
	}

	return {
		date: show.date,
		slug: params.date
	};
};
