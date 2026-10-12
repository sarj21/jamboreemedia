/**
 * Types for the people/appearances model.
 *
 * A person exists once, forever. Their involvement in any given show is an
 * appearance, which carries the per-show state (status, tier, who we reached
 * out to). See supabase/migrations/people_appearances.sql.
 */

/**
 * Where someone stands on one show: the funnel, exactly one value.
 *
 * `not_considering` is a decided no, deliberately distinct from `applied`,
 * which means nobody has looked yet.
 */
export const STATUSES = ['applied', 'considering', 'booked', 'not_considering'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
	applied: 'Applied',
	considering: 'Considering',
	booked: 'Booked',
	not_considering: 'Not considering'
};

/**
 * Short labels for the four status buttons on a row.
 *
 * The full labels ("Not considering") do not fit four-across on a phone: the
 * group measured 415px, wider than any phone viewport. These keep the buttons
 * legible while the aria-label and title still carry the full meaning.
 */
export const STATUS_SHORT_LABEL: Record<Status, string> = {
	applied: 'New',
	considering: 'Maybe',
	booked: 'Booked',
	not_considering: 'Passed'
};

/** Ordered least to most committed, which is also how we sort. */
export const STATUS_RANK: Record<Status, number> = {
	not_considering: -1,
	applied: 0,
	considering: 1,
	booked: 2
};

export const TIERS = ['big', 'small'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABEL: Record<Tier, string> = {
	big: 'Big name',
	small: 'Small name'
};

export type Person = {
	id: number;
	name: string;
	/** Stored without the leading @. */
	instagram: string | null;
	pronouns: string | null;
	disciplines: string | null;
	notes: string | null;
	/** True when we added them rather than them applying. */
	added_manually: boolean;
	/** Which of us added them. */
	added_by: string | null;
	created_at: string;
	updated_at: string;
};

export type Appearance = {
	id: number;
	person_id: number;
	/** yyyy-mm-dd */
	show_date: string;
	status: Status;
	/** Null until triaged. */
	tier: Tier | null;
	/** Not free on this date. Transient: clear it when the show is over. */
	busy: boolean;
	/** Was booked, then could not do it. Independent of status. */
	dropped: boolean;
	/** Post-show: we want to book them again. */
	should_rebook: boolean;
	reached_out_by: string | null;
	outcome_notes: string | null;
	from_application: boolean;
	created_at: string;
	updated_at: string;
};

/** A person together with how they stand on one show. */
export type PersonWithAppearance = Person & {
	appearance: Appearance;
};

/**
 * A person's involvement in one show, decorated with the show's details from
 * shows.json so the index can label history without a second lookup.
 */
export type AppearanceWithShow = Appearance & {
	city: string | null;
	venue: string | null;
};

/** A person with every show they have been involved in, for the index page. */
export type PersonHistory = Person & {
	appearances: AppearanceWithShow[];
};

export function isStatus(value: unknown): value is Status {
	return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

export function isTier(value: unknown): value is Tier {
	return typeof value === 'string' && (TIERS as readonly string[]).includes(value);
}

/**
 * Parse a Status from form input, falling back when absent or unrecognised so a
 * tampered or stale form cannot write a value the column check would reject.
 */
export function toStatus(value: FormDataEntryValue | null, fallback: Status = 'applied'): Status {
	return isStatus(value) ? value : fallback;
}

export function toTier(value: FormDataEntryValue | null): Tier | null {
	return isTier(value) ? value : null;
}

/** Strip a leading @ and surrounding space, matching how we store handles. */
export function normalizeHandle(
	raw: FormDataEntryValue | string | null | undefined
): string | null {
	const trimmed = String(raw ?? '')
		.trim()
		.replace(/^@+/, '')
		.trim();
	return trimmed === '' ? null : trimmed;
}

export function instagramUrl(
	handle: FormDataEntryValue | string | null | undefined
): string | null {
	const clean = normalizeHandle(handle);
	return clean ? `https://instagram.com/${clean}` : null;
}

/** A show is past once its date is behind `now`, for post-show bookkeeping. */
export function isPastShow(showDate: string, now = new Date()): boolean {
	// Compare calendar days, not timestamps: a show is past from the moment it
	// ends, and parsing as UTC would shift the day in some timezones.
	const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	return showDate.slice(0, 10) < today;
}
