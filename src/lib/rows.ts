/** Row shapes returned by the admin load function. */

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

export type Application = {
	id: number;
	show_date: string;
	name: string;
	instagram: string;
	disciplines: string | null;
	notes: string | null;
	/** Marked in admin as someone to keep; these pin to the top of the list. */
	keep: boolean;
	/** Triage set in admin: yes / no / maybe. */
	status: 'yes' | 'no' | 'maybe' | null;
	/** Triage set in admin: big name / small name. */
	tier: 'big' | 'small' | null;
	created_at: string;
};