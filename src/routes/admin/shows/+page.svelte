<script lang="ts">
	import type { PageProps } from './$types';
	import type { ShowRow } from '$lib/show';
	import { formatShowDate } from '$lib/show';
	import { enhance } from '$app/forms';

	type Result = {
		actionError?: string;
		fieldErrors?: Record<string, string>;
		draft?: Record<string, unknown>;
		saved?: boolean;
	};

	let { data, form }: PageProps = $props();

	const shows = $derived(data.shows as ShowRow[]);
	const counts = $derived(data.counts as Record<string, { appearances: number; bookings: number }>);

	const actionError = $derived((form as Result | null)?.actionError ?? null);
	const fieldErrors = $derived((form as Result | null)?.fieldErrors ?? {});

	/** Which show is open in the editor, or null for "new show". */
	let editing = $state<string | null>(null);
	let confirmingDelete = $state<string | null>(null);

	const active = $derived(shows.filter((s) => !s.archived));
	const archived = $derived(shows.filter((s) => s.archived));

	function beginNew() {
		editing = 'new';
		confirmingDelete = null;
	}
	function beginEdit(date: string) {
		editing = date;
		confirmingDelete = null;
	}

	function label(show: ShowRow): string {
		return `${show.city} · ${show.venue}`;
	}

	/** Friendly for reading; the ISO date stays in the edit field and URLs. */
	function readable(show_date: string): string {
		return formatShowDate(show_date);
	}
</script>

<svelte:head>
	<title>Shows - Jamboree Media</title>
</svelte:head>

<main class="min-h-dvh w-full bg-[#07213a] px-[20px] py-[25px] text-white">
	<header class="mx-auto flex w-full max-w-[900px] flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1
					class="brand-title m-0 text-[clamp(32px,7vw,72px)] leading-[0.85] font-normal tracking-[-0.045em] uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
				>
					Shows
				</h1>
				<p class="mt-2 mb-0 text-sm text-white/70">
					{active.length}
					{active.length === 1 ? 'show' : 'shows'} live
					{#if archived.length > 0}
						&middot; {archived.length} deleted
					{/if}
				</p>
			</div>

			<nav class="flex flex-wrap gap-2">
				<a href="/admin" class="page-btn">People</a>
				<a href="/admin/people" class="page-btn">All people</a>
				<a href="/admin/shows" class="page-btn page-btn-active">Shows</a>
				<form method="POST" action="?/logout">
					<button
						type="submit"
						class="page-btn hover:!border-[var(--red)] hover:!text-[var(--red)]"
					>
						Sign out{#if data.username}&nbsp;<span class="opacity-60">{data.username}</span>{/if}
					</button>
				</form>
			</nav>
		</div>
	</header>

	<section class="mx-auto mt-8 flex w-full max-w-[900px] flex-col gap-6">
		{#if actionError}
			<p
				class="m-0 border-2 border-[var(--red)] bg-[var(--red)]/20 px-4 py-3 text-sm font-semibold"
			>
				{actionError}
			</p>
		{/if}

		<!-- Add a new show -->
		<div class="border-2 border-dashed border-white/20 p-4">
			{#if editing === 'new'}
				<form method="POST" action="?/save" use:enhance class="flex flex-col gap-3">
					<h2 class="m-0 text-xs font-extrabold tracking-[2px] text-white/70 uppercase">
						New show
					</h2>
					{@render showFields(null)}
					<div class="flex gap-2">
						<button
							type="submit"
							class="bg-[var(--yellow)] px-4 py-2 text-xs font-extrabold tracking-[2px] text-black uppercase hover:opacity-85"
						>
							Create show
						</button>
						<button type="button" onclick={() => (editing = null)} class="page-btn">Cancel</button>
					</div>
				</form>
			{:else}
				<button
					type="button"
					onclick={beginNew}
					class="add-toggle flex w-full items-center justify-between py-2 text-left"
				>
					<span class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase">
						Add a show
					</span>
					<span class="text-lg font-bold text-[var(--yellow)]" aria-hidden="true">+</span>
				</button>
			{/if}
		</div>

		<!-- Current shows -->
		{#if active.length === 0}
			<p class="m-0 border-l-4 border-[var(--yellow)] bg-white/5 px-4 py-6 text-sm text-white/70">
				No shows yet. Add one above.
			</p>
		{:else}
			<ul class="m-0 flex list-none flex-col gap-3 p-0">
				{#each active as show (show.show_date)}
					<li class="border-2 border-white/10 bg-white/5 p-3">
						{#if editing === show.show_date}
							<form method="POST" action="?/save" use:enhance class="flex flex-col gap-3">
								<input type="hidden" name="showDate" value={show.show_date} />
								<h2 class="m-0 text-xs font-extrabold tracking-[2px] text-white/70 uppercase">
									Edit {show.show_date}
								</h2>
								{@render showFields(show)}
								<div class="flex gap-2">
									<button
										type="submit"
										class="bg-[var(--yellow)] px-4 py-2 text-xs font-extrabold tracking-[2px] text-black uppercase hover:opacity-85"
									>
										Save
									</button>
									<button type="button" onclick={() => (editing = null)} class="page-btn">
										Cancel
									</button>
								</div>
							</form>
						{:else}
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<span class="show-tag" style={`--city-color: ${show.city_color}`}>
											{show.city}
										</span>
										{#if !show.live}
											<span class="state-tag tag-manual">Not live</span>
										{/if}
										{#if show.accepting_applications}
											<span class="state-tag tag-back">Taking applications</span>
										{/if}
									</div>
									<div class="mt-1 text-lg font-extrabold tracking-[-0.02em] uppercase">
										{readable(show.show_date)}
									</div>
									<div class="text-sm text-white/60">{label(show)} &middot; doors {show.time}</div>
									<div class="mt-0.5 text-[11px] text-white/35">
										{counts[show.show_date]?.appearances ?? 0} people &middot;
										{counts[show.show_date]?.bookings ?? 0} bookings
									</div>
								</div>

								<div class="flex shrink-0 gap-1">
									<button
										type="button"
										onclick={() => beginEdit(show.show_date)}
										class="tri tri-labelled">✎ Edit</button
									>
									<button
										type="button"
										onclick={() => (confirmingDelete = show.show_date)}
										class="tri tri-labelled">🗑 Delete</button
									>
								</div>
							</div>

							{#if confirmingDelete === show.show_date}
								<div
									class="mt-3 flex flex-col gap-3 border-l-4 border-[var(--yellow)] bg-black/20 p-3"
								>
									<p class="m-0 text-sm leading-relaxed text-white/80">
										Delete <strong>{readable(show.show_date)}</strong>? It disappears from the site.
										Its
										{counts[show.show_date]?.appearances ?? 0} people and
										{counts[show.show_date]?.bookings ?? 0} bookings are kept — add the same date again
										later and they come back.
									</p>
									<div class="flex flex-wrap gap-2">
										<form method="POST" action="?/archive" use:enhance>
											<input type="hidden" name="showDate" value={show.show_date} />
											<button
												type="submit"
												class="bg-[var(--red)] px-4 py-2 text-xs font-extrabold tracking-[2px] text-white uppercase hover:opacity-85"
											>
												Delete it
											</button>
										</form>
										<button
											type="button"
											onclick={() => (confirmingDelete = null)}
											class="page-btn"
										>
											Keep it
										</button>
									</div>
								</div>
							{/if}
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Deleted shows, restorable -->
		{#if archived.length > 0}
			<div class="mt-4 flex flex-col gap-3 border-t-2 border-white/10 pt-6">
				<h2 class="m-0 text-xs font-extrabold tracking-[2px] text-white/50 uppercase">
					Deleted shows
				</h2>
				<p class="m-0 text-sm leading-relaxed text-white/50">
					Hidden from the site. Their people and bookings are untouched, and re-adding the same date
					brings everything back.
				</p>
				<ul class="m-0 flex list-none flex-col gap-2 p-0">
					{#each archived as show (show.show_date)}
						<li
							class="flex flex-wrap items-center justify-between gap-3 border-2 border-white/10 bg-white/5 p-3 opacity-70"
						>
							<div>
								<div class="text-sm font-extrabold tracking-[-0.02em] uppercase">
									{readable(show.show_date)}
								</div>
								<div class="text-xs text-white/50">
									{label(show)} &middot; {counts[show.show_date]?.appearances ?? 0} people kept
								</div>
							</div>
							<div class="flex shrink-0 gap-1">
								<button
									type="button"
									onclick={() => beginEdit(show.show_date)}
									class="tri tri-labelled">✎ Edit</button
								>
								<form method="POST" action="?/restore" use:enhance class="shrink-0">
									<input type="hidden" name="showDate" value={show.show_date} />
									<button type="submit" class="tri tri-labelled">↩ Restore</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
</main>

{#snippet showFields(show: ShowRow | null)}
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="flex flex-col gap-1">
			<label for="showDate" class="lbl">Date</label>
			<input
				type="date"
				id="showDate"
				name="showDate"
				value={show?.show_date ?? ''}
				required
				class="field"
			/>
			{#if fieldErrors.showDate}
				<p class="m-0 text-xs font-semibold text-[var(--red)]">{fieldErrors.showDate}</p>
			{/if}
		</div>

		<div class="flex flex-col gap-1">
			<label for="city" class="lbl">City</label>
			<input type="text" id="city" name="city" value={show?.city ?? ''} required class="field" />
			{#if fieldErrors.city}
				<p class="m-0 text-xs font-semibold text-[var(--red)]">{fieldErrors.city}</p>
			{/if}
		</div>

		<div class="flex flex-col gap-1">
			<label for="venue" class="lbl">Venue</label>
			<input type="text" id="venue" name="venue" value={show?.venue ?? ''} required class="field" />
			{#if fieldErrors.venue}
				<p class="m-0 text-xs font-semibold text-[var(--red)]">{fieldErrors.venue}</p>
			{/if}
		</div>

		<div class="flex flex-col gap-1">
			<label for="time" class="lbl">Doors time</label>
			<input
				type="text"
				id="time"
				name="time"
				value={show?.time ?? ''}
				placeholder="8:00pm"
				required
				class="field"
			/>
			{#if fieldErrors.time}
				<p class="m-0 text-xs font-semibold text-[var(--red)]">{fieldErrors.time}</p>
			{/if}
		</div>

		<div class="flex flex-col gap-1">
			<label for="cityColor" class="lbl">Colour</label>
			<input
				type="text"
				id="cityColor"
				name="cityColor"
				value={show?.city_color ?? '#5FB8B2'}
				placeholder="#5FB8B2"
				class="field"
			/>
			{#if fieldErrors.cityColor}
				<p class="m-0 text-xs font-semibold text-[var(--red)]">{fieldErrors.cityColor}</p>
			{/if}
		</div>

		<div class="flex flex-col gap-1">
			<label for="ticketUrl" class="lbl">Ticket link</label>
			<input
				type="url"
				id="ticketUrl"
				name="ticketUrl"
				value={show?.ticket_url ?? ''}
				placeholder="Leave empty for 'coming soon'"
				class="field"
			/>
		</div>
	</div>

	<div class="flex flex-col gap-1">
		<label for="bookingNotes" class="lbl">Applicant notes</label>
		<textarea
			id="bookingNotes"
			name="bookingNotes"
			rows="2"
			placeholder="Parking, accessibility, anything applicants should know"
			class="field resize-y">{show?.booking_notes ?? ''}</textarea
		>
	</div>

	<div class="flex flex-wrap gap-4">
		<label class="flex items-center gap-2 text-sm text-white/80">
			<input
				type="checkbox"
				name="live"
				value="true"
				checked={show?.live ?? true}
				class="h-4 w-4"
			/>
			Show on the home page
		</label>
		<label class="flex items-center gap-2 text-sm text-white/80">
			<input
				type="checkbox"
				name="acceptingApplications"
				value="true"
				checked={show?.accepting_applications ?? false}
				class="h-4 w-4"
			/>
			Accepting applications
		</label>
	</div>
{/snippet}

<style>
	.page-btn {
		display: inline-flex;
		align-items: center;
		height: 32px;
		padding: 0 12px;
		border: 2px solid rgba(255, 255, 255, 0.18);
		color: rgba(255, 255, 255, 0.7);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
		text-decoration: none;
	}

	.page-btn:hover {
		border-color: var(--yellow);
		color: var(--yellow);
	}

	.page-btn-active {
		border-color: var(--yellow);
		color: var(--yellow);
	}

	.tri {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.35);
		background: transparent;
		line-height: 1;
		transition:
			border-color 120ms ease,
			color 120ms ease,
			background 120ms ease;
	}

	.tri-labelled {
		height: 24px;
		padding: 0 7px;
		gap: 4px;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 1px;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.tri:hover {
		border-color: rgba(255, 255, 255, 0.5);
		color: rgba(255, 255, 255, 0.8);
	}

	.show-tag {
		display: inline-flex;
		align-items: center;
		height: 24px;
		padding: 0 8px;
		background: var(--city-color, var(--red));
		color: var(--black);
		font-size: 11px;
		line-height: 1;
		font-weight: 800;
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	.state-tag {
		display: inline-flex;
		align-items: center;
		padding: 2px 6px;
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	.tag-manual {
		border: 1px solid rgba(255, 255, 255, 0.25);
		color: rgba(255, 255, 255, 0.5);
	}

	.tag-back {
		background: #7dc36e;
		color: var(--black);
	}

	.field {
		width: 100%;
		border: 2px solid rgba(255, 255, 255, 0.2);
		background: rgba(0, 0, 0, 0.3);
		padding: 8px 10px;
		color: #fff;
		font-size: 15px;
		outline: none;
	}

	.field:focus {
		border-color: var(--yellow);
	}

	.lbl {
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.7);
	}

	/* Phone tap targets. */
	@media (max-width: 700px) {
		.page-btn {
			height: 44px;
		}

		.tri-labelled {
			height: 44px;
			padding: 0 10px;
			font-size: 11px;
		}

		.add-toggle {
			min-height: 44px;
		}

		.field {
			/* 16px stops iOS Safari zooming in when a field is focused. */
			font-size: 16px;
			padding: 12px;
		}
	}
</style>
