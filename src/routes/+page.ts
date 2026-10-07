import shows from '$lib/shows.json';
import { listPublicShows, type Show } from '$lib/show';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	return {
		// Only live shows are advertised here. Every show is still bookable at
		// /booked/<slug>, live or not.
		shows: listPublicShows(shows as Show[])
	};
};