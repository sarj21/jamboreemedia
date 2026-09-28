export type Show = {
	date: string;
	city: string;
	cityColor: string;
	ticketUrl: string;
};

export type ListedShow = Show & {
	isNext: boolean;
};

export function parseShowDate(date: string): number {
	const timestamp = Date.parse(date);
	return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
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
