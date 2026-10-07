import type { PageLoad } from './$types';
import shows from '$lib/shows.json';
import { listAcceptingShows, showLogistics, showSlug, type Show } from '$lib/show';

export const load: PageLoad = () => {
	return {
		shows: listAcceptingShows(shows as Show[]).map((show) => ({
			slug: showSlug(show.date),
			date: show.date,
			city: show.city,
			cityColor: show.cityColor,
			venue: show.venue,
			notes: show.bookingNotes ?? '',
			...showLogistics(show)
		}))
	};
};