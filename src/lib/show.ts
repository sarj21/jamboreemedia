export type Show = {
	date: string;
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
	 * Whether this show is currently taking interest/applications. Drives which
	 * shows appear at /booking/apply. Omitted means not accepting.
	 */
	acceptingBookings?: boolean;
	/** Per-show notes for applicants, e.g. parking or accessibility notes. */
	bookingNotes?: string;
};

export type ListedShow = Show & {
	isNext: boolean;
};

export function parseShowDate(date: string): number {
	const timestamp = Date.parse(date);
	return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

/** A show is live unless explicitly marked otherwise. */
export function isLive(show: Show): boolean {
	return show.live !== false;
}

/** Whether a show is currently open for applications. Opt-in. */
export function isAcceptingBookings(show: Show): boolean {
	return show.acceptingBookings === true;
}

/** Upcoming shows currently taking applications, soonest first. */
export function listAcceptingShows(shows: Show[], now = new Date()): ListedShow[] {
	const startOfToday = new Date(now);
	startOfToday.setHours(0, 0, 0, 0);
	return listShows(
		shows.filter((s) => isAcceptingBookings(s) && parseShowDate(s.date) >= startOfToday.getTime()),
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

/** Short URL slug for a show date, e.g. "November 21, 2026" -> "nov-21". */
export function showSlug(date: string): string {
	const timestamp = Date.parse(date);
	if (Number.isNaN(timestamp)) {
		return date.toLowerCase().replace(/[^a-z0-9]+/g, '-');
	}
	const d = new Date(timestamp);
	return `${MONTH_ABBR[d.getMonth()]}-${d.getDate()}`;
}

export function findShowBySlug(shows: Show[], slug: string): Show | undefined {
	const normalized = slug.toLowerCase();
	return shows.find((s) => showSlug(s.date) === normalized);
}

/** ISO date (yyyy-mm-dd) for storing in a Postgres date column. */
export function toISODate(date: string): string {
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
