import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { bookingSchema } from '$lib/schema';
import { getSupabase } from '$lib/supabase';
import shows from '$lib/shows.json';
import { findShowBySlug, showLogistics, toISODate, type Show } from '$lib/show';

export const load: PageServerLoad = async ({ params }) => {
  const show = findShowBySlug(shows as Show[], params.date);
  if (!show) {
    error(404, 'Show not found');
  }

  const logistics = showLogistics(show);
  const form = await superValidate(zod4(bookingSchema));
  return {
    form,
    date: show.date,
    slug: params.date,
    city: show.city,
    cityColor: show.cityColor,
    venue: show.venue,
    doorsTime: logistics.doors,
    callTime: logistics.call,
    stageTime: logistics.stage,
    doneByTime: logistics.done,
    dueBy: logistics.dueBy
  };
};

export const actions: Actions = {
  default: async (event) => {
    const show = findShowBySlug(shows as Show[], event.params.date);
    if (!show) {
      error(404, 'Show not found');
    }

    const form = await superValidate(event, zod4(bookingSchema));

    if (!form.valid) {
      return { form, success: false, submitError: null };
    }

    const { name, pronouns, paymentHandle, disciplines, wantsToDefend, claimDescription } = form.data;

    const { error: insertError } = await getSupabase()
		.from('bookings')
		.insert({
      show_date: toISODate(show.date),
      name,
      pronouns,
      payment_handle: paymentHandle,
      disciplines: disciplines?.trim() ? disciplines : null,
      wants_to_defend: wantsToDefend,
      claim_description: wantsToDefend ? claimDescription : null
    });

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return { form, success: false, submitError: insertError.message };
    }

    redirect(303, `/booked/${event.params.date}/success`);
  }
};
