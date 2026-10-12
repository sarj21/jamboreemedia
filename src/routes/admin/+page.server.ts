import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getSupabase } from '$lib/supabase';
import { sessionCookie } from '$lib/admin';
import { listActiveShows, listAllShows } from '$lib/shows-db';
import { findShowBySlug, showKey, showSlug, type Show } from '$lib/show';
import type { Booking } from '$lib/rows';
import {
	normalizeHandle,
	STATUSES,
	toStatus,
	toTier,
	type Appearance,
	type Person,
	type PersonWithAppearance,
	type Status
} from '$lib/people';

const PAGE_SIZE = 25;

/** Admin tabs are named after what they read: bookings | people. */
type Tab = 'bookings' | 'people';

function isTab(value: string | null): value is Tab {
	return value === 'bookings' || value === 'people';
}

/** Sub-filter on the per-show list. Defaults to the working list. */
type Scope = 'applied' | 'considering' | 'booked' | 'not_considering' | 'all';

const SCOPES: readonly Scope[] = ['applied', 'considering', 'booked', 'not_considering', 'all'];

function isScope(value: string | null): value is Scope {
	return value !== null && (SCOPES as readonly string[]).includes(value);
}

/** PostgREST reports an unknown relation/column as PGRST205 / 42703. */
function isMissingColumn(error: { code?: string } | null): boolean {
	return error?.code === 'PGRST205' || error?.code === '42703';
}

const PERSON_COLUMNS =
	'id,name,instagram,pronouns,disciplines,notes,added_manually,added_by,created_at';
const APPEARANCE_COLUMNS =
	'id,person_id,show_date,status,tier,busy,dropped,should_rebook,reached_out_by,outcome_notes,from_application,created_at';

const empty = {
	bookings: [] as Booking[],
	people: [] as PersonWithAppearance[],
	loadError: null as string | null,
	tableMissing: false,
	page: 1,
	total: 0,
	counts: { all: 0, applied: 0, considering: 0, booked: 0, not_considering: 0 },
	scope: 'applied' as Scope,
	pageSize: PAGE_SIZE,
	bookedTotal: 0,
	consideringTotal: 0
};

/**
 * Resolve which show a request refers to.
 *
 * Form actions post to `?/action`, which drops the query string, so the slug is
 * carried in a hidden field. The query string is only a fallback.
 */
async function resolveShow(
	url: URL,
	form: FormData | null,
	preloaded?: Show[]
): Promise<{ slug: string; show: Show | undefined }> {
	const allShows = preloaded ?? (await listAllShows());
	const posted = form?.get('show');
	const slug =
		typeof posted === 'string' && posted
			? posted
			: (url.searchParams.get('show') ?? showSlug(allShows[0].date));
	return { slug, show: findShowBySlug(allShows, slug) };
}

function clampPage(raw: string | null): number {
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : 1;
}

/** An appearance id from the form, validated as a positive integer. */
function appearanceIdFrom(form: FormData): number {
	return Number(form.get('appearance'));
}

/** What the admin page renders, before the show list is added. */
type AdminPageData = typeof empty & {
	tab: Tab;
	selected: string;
	scope: Scope;
	counts: Record<'all' | Status, number>;
};

export const load: PageServerLoad = async ({ url }) => {
	// Fetched once and handed to both the resolver and the page, so the show
	// tabs and the move targets are rendered from the same read.
	const allShows = await listAllShows();
	const result = await loadAdmin(url, allShows);
	return { ...result, showList: allShows };
};

async function loadAdmin(url: URL, allShows: Show[]): Promise<AdminPageData> {
	const { slug, show } = await resolveShow(url, null, allShows);

	const tabParam = url.searchParams.get('tab');
	const tab: Tab = isTab(tabParam) ? tabParam : 'people';

	// An unknown slug matches nothing rather than erroring.
	const showDate = show ? showKey(show) : '1970-01-01';

	if (tab === 'bookings') {
		const { data, error } = await getSupabase()
			.from('bookings')
			.select(
				'id,show_date,name,pronouns,payment_handle,wants_to_defend,claim_description,created_at'
			)
			.eq('show_date', showDate)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('bookings select failed:', error);
			return { ...empty, tab, selected: slug, loadError: error.message };
		}

		const bookings = (data ?? []) as Booking[];
		return {
			...empty,
			tab,
			selected: slug,
			bookings,
			// The header reads total for the bookings count; this tab isn't paginated.
			total: bookings.length
		};
	}

	// People: paginated, filtered to one status, newest first.
	const requestedPage = clampPage(url.searchParams.get('page'));

	const scopeParam = url.searchParams.get('scope');
	const scope: Scope = isScope(scopeParam) ? scopeParam : 'applied';

	// Counts for the tab labels, so they reflect the whole show rather than the
	// rows on this page.
	const countFor = async (status: Status | 'all') => {
		let query = getSupabase()
			.from('appearances')
			.select('id', { count: 'exact', head: true })
			.eq('show_date', showDate);
		if (status !== 'all') query = query.eq('status', status);
		const { count } = await query;
		return count ?? 0;
	};

	const [allCount, appliedCount, consideringCount, bookedCount, passedCount] = await Promise.all([
		countFor('all'),
		countFor('applied'),
		countFor('considering'),
		countFor('booked'),
		countFor('not_considering')
	]);

	// Appearances are the paginated unit; people are joined in behind them.
	let appearanceQuery = getSupabase()
		.from('appearances')
		.select(`${APPEARANCE_COLUMNS}, person:people!inner(${PERSON_COLUMNS})`, {
			count: 'exact'
		})
		.eq('show_date', showDate)
		// Most committed first, then newest: who needs a decision surfaces at
		// the top of the default tab.
		.order('status', { ascending: true })
		.order('created_at', { ascending: false })
		.range((requestedPage - 1) * PAGE_SIZE, requestedPage * PAGE_SIZE - 1);

	if (scope !== 'all') appearanceQuery = appearanceQuery.eq('status', scope);

	const { data, error, count } = await appearanceQuery;

	if (error) {
		if (!isMissingColumn(error)) console.error('appearances select failed:', error);
		return {
			...empty,
			tab,
			selected: slug,
			scope,
			loadError: isMissingColumn(error) ? null : error.message,
			tableMissing: isMissingColumn(error)
		};
	}

	const total = count ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(requestedPage, pageCount);

	const rows = (data ?? []) as unknown as (Appearance & {
		person: Person | Person[] | null;
	})[];

	/** Flatten PostgREST's to-one join, which arrives as object or array. */
	const flatten = (row: (typeof rows)[number]): PersonWithAppearance | null => {
		const joined = Array.isArray(row.person) ? row.person[0] : row.person;
		if (!joined) return null;
		// Drop the join key so the remaining fields are the appearance itself.
		const appearance = { ...row } as Record<string, unknown>;
		delete appearance.person;
		return { ...(joined as Person), appearance: appearance as Appearance };
	};

	if (page !== requestedPage) {
		// Past the end (stale link, or rows deleted): fall back to the last page.
		const last = await appearanceQuery.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
		const lastRows = (last.data ?? []) as unknown as (Appearance & {
			person: Person | Person[] | null;
		})[];
		return {
			...empty,
			tab,
			selected: slug,
			scope,
			counts: {
				all: allCount,
				applied: appliedCount,
				considering: consideringCount,
				booked: bookedCount,
				not_considering: passedCount
			},
			people: lastRows.map(flatten).filter((p): p is PersonWithAppearance => p !== null),
			total,
			page
		};
	}

	return {
		...empty,
		tab,
		selected: slug,
		scope,
		counts: {
			all: allCount,
			applied: appliedCount,
			considering: consideringCount,
			booked: bookedCount,
			not_considering: passedCount
		},
		people: rows.map(flatten).filter((p): p is PersonWithAppearance => p !== null),
		total,
		page
	};
}

/**
 * Apply a patch to one appearance, scoped by show as well as id so a stale tab
 * can't edit another show's row. Returns a failure to pass to `fail()`, or null.
 */
async function patchAppearance(
	action: string,
	show: Show,
	appearanceId: number,
	patch: Record<string, unknown>
): Promise<{ status: number; actionError: string } | null> {
	if (!Number.isInteger(appearanceId) || appearanceId <= 0) {
		return { status: 400, actionError: 'Invalid appearance id' };
	}

	const { data, error } = await getSupabase()
		.from('appearances')
		.update(patch)
		.eq('id', appearanceId)
		.eq('show_date', showKey(show))
		.select('id');

	if (error) {
		console.error(`appearances ${action} update failed:`, error);
		return { status: 500, actionError: error.message };
	}

	// PostgREST reports success even when the filters matched nothing.
	if (!data || data.length === 0) {
		console.error(`${action}: no appearance id=${appearanceId} for show ${show.date}`);
		return { status: 404, actionError: 'That row no longer exists. Reload to refresh the list.' };
	}

	return null;
}

async function runPatch(
	action: string,
	show: Show,
	appearanceId: number,
	patch: Record<string, unknown>
): Promise<{ actionOk: true } | ReturnType<typeof fail>> {
	const failure = await patchAppearance(action, show, appearanceId, patch);
	return failure ? fail(failure.status, failure) : { actionOk: true };
}

export const actions: Actions = {
	logout: async ({ cookies }) => {
		cookies.delete(sessionCookie.name, { path: '/' });
		redirect(303, '/admin/login');
	},

	/** Move someone to a status on this show. */
	status: async ({ request, url }) => {
		const form = await request.formData();
		const { show } = await resolveShow(url, form);
		if (!show) error(404, 'Show not found');

		const raw = String(form.get('status') ?? '');
		if (!STATUSES.includes(raw as Status)) {
			return fail(400, { actionError: 'Invalid status' });
		}

		return runPatch('status', show, appearanceIdFrom(form), { status: raw });
	},

	/** Flag a big/small name, or clear the tier. */
	tier: async ({ request, url }) => {
		const form = await request.formData();
		const { show } = await resolveShow(url, form);
		if (!show) error(404, 'Show not found');

		return runPatch('tier', show, appearanceIdFrom(form), { tier: toTier(form.get('tier')) });
	},

	/** Toggle an independent post-show flag: dropped out / would come back. */
	flag: async ({ request, url }) => {
		const form = await request.formData();
		const { show } = await resolveShow(url, form);
		if (!show) error(404, 'Show not found');

		const field = form.get('field');
		if (field !== 'dropped' && field !== 'busy' && field !== 'should_rebook') {
			return fail(400, { actionError: 'Invalid field' });
		}

		const value = form.get('value') === 'true';
		return runPatch('flag', show, appearanceIdFrom(form), { [field]: value });
	},

	/** Edit every field on the person and their appearance for this show. */
	edit: async ({ request, url }) => {
		const form = await request.formData();
		const { show } = await resolveShow(url, form);
		if (!show) error(404, 'Show not found');

		const personId = Number(form.get('person'));
		if (!Number.isInteger(personId) || personId <= 0) {
			return fail(400, { actionError: 'Invalid person id' });
		}

		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { editError: 'Name is required', field: 'name' });

		const trimmed = (v: FormDataEntryValue | null) => {
			const s = String(v ?? '').trim();
			return s === '' ? null : s;
		};

		const { error: personError } = await getSupabase()
			.from('people')
			.update({
				name,
				instagram: normalizeHandle(form.get('instagram')),
				pronouns: trimmed(form.get('pronouns')),
				disciplines: trimmed(form.get('disciplines')),
				notes: trimmed(form.get('notes')),
				added_manually: form.get('added_manually') === 'true',
				added_by: trimmed(form.get('added_by')),
				updated_at: new Date().toISOString()
			})
			.eq('id', personId);

		if (personError) {
			console.error('people update failed:', personError);
			return fail(500, { actionError: personError.message });
		}

		const appearanceId = appearanceIdFrom(form);
		if (Number.isInteger(appearanceId) && appearanceId > 0) {
			const failure = await patchAppearance('edit', show, appearanceId, {
				status: toStatus(form.get('status')),
				tier: toTier(form.get('tier')),
				reached_out_by: trimmed(form.get('reached_out_by')),
				outcome_notes: trimmed(form.get('outcome_notes')),
				dropped: form.get('dropped') === 'true',
				busy: form.get('busy') === 'true',
				should_rebook: form.get('should_rebook') === 'true',
				updated_at: new Date().toISOString()
			});
			if (failure) return fail(failure.status, failure);
		}

		return { actionOk: true };
	},

	/**
	 * Move this appearance to another show, or copy it there and leave this one
	 * alone. `mode` is 'move' or 'copy'.
	 */
	transfer: async ({ request, url }) => {
		const form = await request.formData();
		const { show } = await resolveShow(url, form);
		if (!show) error(404, 'Show not found');

		const targetSlug = String(form.get('target') ?? '');
		// Archived shows are hidden everywhere else, so they are not valid
		// destinations either.
		const target = findShowBySlug(await listActiveShows(), targetSlug);
		if (!target) return fail(400, { actionError: 'Pick a show to move to' });
		if (target.showDate === show.showDate) {
			return fail(400, { actionError: 'That is the show they are already on' });
		}

		const mode = form.get('mode') === 'copy' ? 'copy' : 'move';
		const appearanceId = appearanceIdFrom(form);
		if (!Number.isInteger(appearanceId) || appearanceId <= 0) {
			return fail(400, { actionError: 'Invalid appearance id' });
		}

		const targetDate = target.showDate ?? showKey(target);

		// Read first so a copy carries the same state onto the new show.
		const { data: rows, error: readError } = await getSupabase()
			.from('appearances')
			.select(APPEARANCE_COLUMNS)
			.eq('id', appearanceId)
			.eq('show_date', showKey(show));

		if (readError) {
			console.error('appearance read failed:', readError);
			return fail(500, { actionError: readError.message });
		}
		const source = (rows ?? [])[0] as Appearance | undefined;
		if (!source) return fail(404, { actionError: 'That row no longer exists.' });

		if (mode === 'copy') {
			const { error: copyError } = await getSupabase().from('appearances').insert({
				person_id: source.person_id,
				show_date: targetDate,
				status: source.status,
				tier: source.tier,
				dropped: source.dropped,
				busy: source.busy,
				should_rebook: source.should_rebook,
				reached_out_by: source.reached_out_by,
				outcome_notes: source.outcome_notes,
				from_application: source.from_application
			});

			if (copyError) {
				// The unique (person_id, show_date) index makes a second copy fail.
				console.error('appearance copy failed:', copyError);
				return fail(400, { actionError: `They are already on ${target.city}.` });
			}
		} else {
			// Move: re-point this appearance at the other show. On conflict means
			// they are already listed there, so this would create a duplicate.
			const { error: moveError } = await getSupabase()
				.from('appearances')
				.update({ show_date: targetDate, updated_at: new Date().toISOString() })
				.eq('id', appearanceId);

			if (moveError) {
				if (moveError.code === '23505') {
					return fail(400, { actionError: `They are already on ${target.city}.` });
				}
				console.error('appearance move failed:', moveError);
				return fail(500, { actionError: moveError.message });
			}
		}

		return { actionOk: true, movedTo: targetSlug, mode };
	},

	/** Add someone by hand, optionally already on this show. */
	add: async ({ request, url }) => {
		const form = await request.formData();
		const { show } = await resolveShow(url, form);
		if (!show) error(404, 'Show not found');

		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { addError: 'Name is required', field: 'name' });

		const instagram = normalizeHandle(form.get('instagram'));
		const trimmed = (v: FormDataEntryValue | null) => {
			const s = String(v ?? '').trim();
			return s === '' ? null : s;
		};

		// Reuse the person if this handle already exists, so adding someone twice
		// enriches the existing record instead of creating a second one.
		let personId: number;
		if (instagram) {
			const { data: existing } = await getSupabase()
				.from('people')
				.select('id')
				.eq('instagram', instagram)
				.maybeSingle();

			if (existing) {
				personId = existing.id as number;
			}
		}

		if (!personId!) {
			const { data: created, error: insertError } = await getSupabase()
				.from('people')
				.insert({
					name,
					instagram,
					pronouns: trimmed(form.get('pronouns')),
					disciplines: trimmed(form.get('disciplines')),
					notes: trimmed(form.get('notes')),
					added_manually: true,
					added_by: trimmed(form.get('added_by'))
				})
				.select('id')
				.single();

			if (insertError) {
				console.error('people insert failed:', insertError);
				return fail(500, { actionError: insertError.message });
			}
			personId = created.id as number;
		}

		const onThisShow = form.get('on_this_show') === 'true';
		if (onThisShow) {
			const status = toStatus(form.get('status'));
			const { error: appearanceError } = await getSupabase()
				.from('appearances')
				.insert({
					person_id: personId,
					show_date: showKey(show),
					status,
					tier: toTier(form.get('tier')),
					reached_out_by: trimmed(form.get('reached_out_by')),
					outcome_notes: trimmed(form.get('outcome_notes')),
					from_application: false
				});

			if (appearanceError) {
				console.error('appearances insert failed:', appearanceError);
				return fail(400, { actionError: `They are already on ${show.city}.` });
			}
		}

		return { added: true };
	}
};
