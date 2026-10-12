/**
 * Row shapes returned by the admin load function.
 *
 * Only bookings remain here. Applications moved to the people/appearances
 * tables (see src/lib/people.ts), which are shaped differently.
 */

export type Booking = {
	id: number;
	show_date: string;
	name: string;
	pronouns: string | null;
	payment_handle: string;
	wants_to_defend: boolean;
	claim_description: string | null;
	created_at: string;
};
