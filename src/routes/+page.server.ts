import type { PageServerLoad } from './$types';
import { listActiveShows } from '$lib/shows-db';
import { listPublicShows } from '$lib/show';

export const load: PageServerLoad = async () => {
	// Only live, non-archived shows are advertised here. Every show is still
	// bookable at /booked/<slug>, live or not.
	return {
		shows: listPublicShows(await listActiveShows())
	};
};
