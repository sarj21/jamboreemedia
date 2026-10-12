export type Show = {
	/** Human readable, e.g. "December 2, 2026". */
	date: string;
	/** ISO key, e.g. "2026-12-02". The identity of the show. */
	showDate?: string;
	city: string;
	cityColor: string;
	/** Optional: a show being booked but not yet on sale may omit this. */
	ticketUrl?: string;
	/** Venue name, e.g. "The Annoyance Theatre". */
	venue: string;
	/** Doors time, e.g. "8:00pm". Call/stage/done times derive from this. */
	time: string;
	/**
	 * Whether to advertise this show on the home page. Booking always works
	 * regardless. Omitted means live, so existing entries keep showing.
	 */
	live?: boolean;
	/**
	 * Whether this show is currently taking per-show applications. Drives which
	 * shows appear at /apply. Omitted means not accepting.
	 */
	acceptingApplications?: boolean;
	/** Per-show notes for applicants, e.g. parking or accessibility notes. */
	bookingNotes?: string;
};

export type ListedShow = Show & {
	isNext: boolean;
};

/**
 * A row of the `shows` table.
 *
 * `show_date` is the primary key and the identity of the show, so re-adding a
 * date that was archived brings that show's appearances and bookings back.
 */
export type ShowRow = {
	show_date: string;
	city: string;
	city_color: string;
	venue: string;
	time: string;
	ticket_url: string | null;
	live: boolean;
	accepting_applications: boolean;
	booking_notes: string | null;
	archived: boolean;
};

/**
 * Parse "yyyy-mm-dd" as a local calendar date.
 *
 * `Date.parse('2026-10-15')` treats the string as UTC midnight, which is the
 * previous day in every timezone behind UTC. That silently shifted show dates,
 * their slugs, and the show_date sent to the database, so ISO dates are always
 * decomposed by hand.
 */
export function parseISODate(iso: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
	if (!m) return null;
	const [, y, mo, d] = m;
	const date = new Date(Number(y), Number(mo) - 1, Number(d));
	return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The ISO key for a show, which is what the database is keyed on.
 *
 * Always prefer this over re-deriving a date from the display string, which
 * loses a day to the timezone problem above.
 */
export function showKey(show: Show): string {
	return show.showDate ?? toISODate(show.date);
}

/** "2026-12-02" -> "December 2, 2026", the form shown to people. */
export function formatShowDate(iso: string): string {
	const date = parseISODate(iso);
	if (!date) {
		const timestamp = Date.parse(iso);
		if (Number.isNaN(timestamp)) return iso;
		return new Date(timestamp).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}
	return date.toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
}

/**
 * Map a database row onto the shape the rest of the site uses.
 *
 * The public helpers below work on the human-readable `date` string, so the row
 * is converted here rather than changing every call site. `showDate` carries the
 * ISO key through for admin edits and comparisons.
 */
export function rowToShow(row: ShowRow): Show {
	return {
		date: formatShowDate(row.show_date),
		showDate: row.show_date,
		city: row.city,
		cityColor: row.city_color,
		venue: row.venue,
		time: row.time,
		ticketUrl: row.ticket_url ?? undefined,
		live: row.live,
		acceptingApplications: row.accepting_applications,
		bookingNotes: row.booking_notes ?? undefined
	};
}

/**
 * Timestamp for a show date, for sorting and past/future checks.
 *
 * Handles both the ISO key and the display string. Unparseable dates sort last
 * rather than first, so a typo cannot make a show look imminent.
 */
export function parseShowDate(date: string): number {
	const iso = parseISODate(date);
	if (iso) return iso.getTime();

	const timestamp = Date.parse(date);
	return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

/** A show is live unless explicitly marked otherwise. */
export function isLive(show: Show): boolean {
	return show.live !== false;
}

/** Whether a show is currently open for applications. Opt-in. */
export function isAcceptingApplications(show: Show): boolean {
	return show.acceptingApplications === true;
}

/** Upcoming shows currently taking applications, soonest first. */
export function listAcceptingShows(shows: Show[], now = new Date()): ListedShow[] {
	const startOfToday = new Date(now);
	startOfToday.setHours(0, 0, 0, 0);
	return listShows(
		shows.filter(
			(s) => isAcceptingApplications(s) && parseShowDate(s.date) >= startOfToday.getTime()
		),
		now
	);
}

/**
 * Shows to advertise on the home page: live ones only, and never past.
 * Booking stays available for every show, live or not.
 */
export function listPublicShows(shows: Show[], now = new Date()): ListedShow[] {
	const startOfToday = new Date(now);
	startOfToday.setHours(0, 0, 0, 0);
	return listShows(
		shows.filter((s) => isLive(s) && parseShowDate(s.date) >= startOfToday.getTime()),
		now
	);
}

export function listShows(shows: Show[], now = new Date()): ListedShow[] {
	const sorted = [...shows].sort((a, b) => parseShowDate(a.date) - parseShowDate(b.date));
	const startOfToday = new Date(now);
	startOfToday.setHours(0, 0, 0, 0);

	const nextIndex = sorted.findIndex((show) => parseShowDate(show.date) >= startOfToday.getTime());

	return sorted.map((show, index) => ({
		...show,
		isNext: nextIndex !== -1 && index === nextIndex
	}));
}

const MONTH_ABBR = [
	'jan',
	'feb',
	'mar',
	'apr',
	'may',
	'jun',
	'jul',
	'aug',
	'sep',
	'oct',
	'nov',
	'dec'
];

const MONTHS_LONG = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/** Short URL slug for a show date, e.g. "2026-11-21" -> "nov-21". */
export function showSlug(date: string): string {
	const d = parseISODate(date);
	if (!d) {
		// A display string like "November 21, 2026" still parses, but only as
		// local time, so the day is not shifted.
		const timestamp = Date.parse(date);
		if (Number.isNaN(timestamp)) {
			return date.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		}
		const parsed = new Date(timestamp);
		return `${MONTH_ABBR[parsed.getMonth()]}-${parsed.getDate()}`;
	}
	return `${MONTH_ABBR[d.getMonth()]}-${d.getDate()}`;
}

export function findShowBySlug(shows: Show[], slug: string): Show | undefined {
	const normalized = slug.toLowerCase();
	// Keyed on the ISO date so a slug can never resolve to the wrong show.
	return shows.find((s) => showSlug(showKey(s)) === normalized);
}

/** ISO date (yyyy-mm-dd) for storing in a Postgres date column. */
export function toISODate(date: string): string {
	// Already ISO: return it untouched rather than round-tripping it.
	const iso = parseISODate(date);
	if (iso)
		return `${iso.getFullYear()}-${String(iso.getMonth() + 1).padStart(2, '0')}-${String(iso.getDate()).padStart(2, '0')}`;

	const timestamp = Date.parse(date);
	if (Number.isNaN(timestamp)) return date;
	const d = new Date(timestamp);
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${month}-${day}`;
}

/** Parse a time like "8:00pm" or "8pm" into minutes since midnight. */
export function parseDoorsTime(time: string): number | null {
	const m = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
	if (!m) return null;
	let h = parseInt(m[1], 10);
	const mins = m[2] ? parseInt(m[2], 10) : 0;
	const pm = m[3].toLowerCase() === 'pm';
	if (h === 12) h = pm ? 12 : 0;
	else if (pm) h += 12;
	if (h > 23 || mins > 59) return null;
	return h * 60 + mins;
}

/** Format minutes since midnight as e.g. "7:40pm". */
export function formatTime(totalMinutes: number): string {
	const norm = ((totalMinutes % 1440) + 1440) % 1440;
	const h = Math.floor(norm / 60);
	const m = norm % 60;
	const suffix = h >= 12 ? 'pm' : 'am';
	let h12 = h % 12;
	if (h12 === 0) h12 = 12;
	return `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

function ordinal(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Due date for the booking form: 2 days before the show, e.g. "November 19th". */
export function dueByDate(date: string): string {
	const timestamp = Date.parse(date);
	if (Number.isNaN(timestamp)) return '';
	const d = new Date(timestamp);
	d.setDate(d.getDate() - 2);
	return `${MONTHS_LONG[d.getMonth()]} ${ordinal(d.getDate())}`;
}

export type ShowLogistics = {
	/** Doors time (the show's listed time). */
	doors: string;
	/** Call time: 20 minutes before doors. */
	call: string;
	/** Stage/show time: 15 minutes after doors. */
	stage: string;
	/** Estimated end: 60 minutes after stage. */
	done: string;
	/** Form due date: 2 days before the show. */
	dueBy: string;
};

/** Compute all displayed times from a show's date + doors time. */
export function showLogistics(show: Show): ShowLogistics {
	const doorsMin = parseDoorsTime(show.time);
	return {
		doors: show.time,
		call: doorsMin === null ? '' : formatTime(doorsMin - 20),
		stage: doorsMin === null ? '' : formatTime(doorsMin + 15),
		done: doorsMin === null ? '' : formatTime(doorsMin + 75),
		dueBy: dueByDate(show.date)
	};
}
