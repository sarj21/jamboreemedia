import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import shows from '$lib/shows.json';
import { findShowBySlug, isAcceptingBookings, type Show } from '$lib/show';

export const load: PageLoad = ({ params }) => {
	const show = findShowBySlug(shows as Show[], params.date);
	if (!show || !isAcceptingBookings(show)) {
		// Only reachable right after a valid submit, so a stale link is a 404.
		error(404, 'Show not found');
	}

	return {
		date: show.date,
		city: show.city
	};
};