import shows from '$lib/show.json';
import { listShows, type Show } from '$lib/show';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	return {
		shows: listShows(shows as Show[])
	};
};
