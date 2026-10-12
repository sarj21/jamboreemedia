import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { findShow } from '$lib/shows-db';
import { isAcceptingApplications } from '$lib/show';

export const load: PageServerLoad = async ({ params }) => {
	const show = await findShow(params.date);
	if (!show || !isAcceptingApplications(show)) {
		// Only reachable right after a valid submit, so a stale link is a 404.
		error(404, 'Show not found');
	}

	return {
		date: show.date,
		city: show.city
	};
};
