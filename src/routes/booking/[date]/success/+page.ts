import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import shows from '$lib/shows.json';
import { findShowBySlug, type Show } from '$lib/show';

export const load: PageLoad = ({ params }) => {
  const show = findShowBySlug(shows as Show[], params.date);
  if (!show) {
    error(404, 'Show not found');
  }

  return {
    date: show.date,
    slug: params.date
  };
};
