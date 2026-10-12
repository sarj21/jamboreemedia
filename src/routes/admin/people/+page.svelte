<script lang="ts">
	import type { PageProps } from './$types';
	import { STATUS_LABEL, instagramUrl, isPastShow, type AppearanceWithShow } from '$lib/people';

	let { data }: PageProps = $props();

	const people = $derived(data.people as (typeof data.people)[number][]);
	const pageCount = $derived(data.pageCount as number);
	const page = $derived(data.page as number);
	const total = $derived(data.total as number);
	const q = $derived((data.q as string) ?? '');
	const loadError = $derived(data.loadError as string | null);

	/** Most recent first, so the current show leads. */
	function sortAppearances(list: AppearanceWithShow[]): AppearanceWithShow[] {
		return [...list].sort((a, b) => b.show_date.localeCompare(a.show_date));
	}

	function linkFor(next: number): string {
		return q
			? `/admin/people?q=${encodeURIComponent(q)}&page=${next}`
			: `/admin/people?page=${next}`;
	}
</script>

<svelte:head>
	<title>People - Jamboree Media</title>
</svelte:head>

<main class="min-h-dvh w-full bg-[#07213a] px-[20px] py-[25px] text-white">
	<header class="mx-auto flex w-full max-w-[900px] flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1
					class="brand-title m-0 text-[clamp(32px,7vw,72px)] leading-[0.85] font-normal tracking-[-0.045em] uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
				>
					People
				</h1>
				<p class="mt-2 mb-0 text-sm text-white/70">
					{total}
					{total === 1 ? 'person' : 'people'}
					{#if q}
						matching &ldquo;{q}&rdquo;
					{/if}
				</p>
			</div>

			<nav class="flex flex-wrap gap-2">
				<a href="/admin" class="page-btn">Per show</a>
				<a href="/admin/people" class="page-btn page-btn-active">All people</a>
				<a href="/admin/shows" class="page-btn">Shows</a>
			</nav>
		</div>

		<!-- Search -->
		<form method="GET" action="/admin/people" class="flex flex-wrap gap-2">
			<input
				type="search"
				name="q"
				value={q}
				placeholder="Search name or Instagram"
				aria-label="Search people"
				class="min-w-0 flex-1 border-2 border-white/20 bg-black/30 px-3 py-2 text-base text-white placeholder-white/40 outline-none focus:border-[var(--yellow)]"
			/>
			<button
				type="submit"
				class="bg-[var(--yellow)] px-4 py-2 text-xs font-extrabold tracking-[2px] text-black uppercase transition-opacity hover:opacity-85"
			>
				Search
			</button>
			{#if q}
				<a href="/admin/people" class="page-btn">Clear</a>
			{/if}
		</form>
	</header>

	<section class="mx-auto mt-8 w-full max-w-[900px]">
		{#if loadError}
			<p
				class="m-0 border-2 border-[var(--red)] bg-[var(--red)]/20 px-4 py-3 text-sm font-semibold"
			>
				{loadError}
			</p>
		{:else if people.length === 0}
			<p class="m-0 border-l-4 border-[var(--yellow)] bg-white/5 px-4 py-6 text-sm text-white/70">
				{q ? `Nobody matches "${q}".` : 'No people yet.'}
			</p>
		{:else}
			<ul class="m-0 flex list-none flex-col gap-3 p-0">
				{#each people as person (person.id)}
					<li class="border-2 border-white/10 bg-white/5 p-3">
						<!-- items-center so the tag lines up with the name; see the note in the
							per-show list. -->
						<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
							<span class="text-lg font-extrabold tracking-[-0.02em] uppercase">
								{person.name}
							</span>
							{#if person.pronouns}
								<span class="text-xs text-white/50">({person.pronouns})</span>
							{/if}
							{#if person.added_manually}
								<span class="manual-tag" title="Added by {person.added_by ?? 'us'}">
									Added by {person.added_by ?? 'us'}
								</span>
							{/if}
						</div>

						{#if person.instagram}
							<a
								href={instagramUrl(person.instagram)}
								target="_blank"
								rel="noopener noreferrer"
								class="mt-1 inline-block text-sm text-white/60 underline decoration-white/25 underline-offset-2 transition-colors hover:text-[var(--yellow)]"
							>
								@{person.instagram}
							</a>
						{/if}

						{#if person.disciplines}
							<div class="mt-0.5 text-xs text-white/40">{person.disciplines}</div>
						{/if}

						{#if person.appearances.length > 0}
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each sortAppearances(person.appearances) as a (a.id)}
									<span
										class="show-chip status-{a.status}"
										class:chip-past={isPastShow(a.show_date)}
										title="{a.show_date}
										{a.city ?? ''} {a.venue ?? ''}"
									>
										<span class="chip-date">{a.show_date}</span>
										{#if a.city}<span class="chip-city">{a.city}</span>{/if}
										<span class="chip-status">{STATUS_LABEL[a.status]}</span>
										{#if a.tier}<span class="chip-tier">{a.tier}</span>{/if}
										{#if a.busy}<span class="chip-flag chip-busy">Busy</span>{/if}
										{#if a.dropped}<span class="chip-flag chip-dropped">Dropped</span>{/if}
										{#if a.should_rebook}<span class="chip-flag chip-back">Rebook</span>{/if}
									</span>
								{/each}
							</div>
						{:else}
							<div class="mt-2 text-xs text-white/35">Not on any show yet.</div>
						{/if}

						{#if person.notes}
							<details class="mt-2">
								<summary
									class="cursor-pointer text-[11px] font-extrabold tracking-[2px] text-white/45 uppercase"
								>
									Notes
								</summary>
								<div
									class="mt-2 border-l-4 border-[var(--yellow)] bg-black/20 p-3 text-sm leading-relaxed whitespace-pre-wrap"
								>
									{person.notes}
								</div>
							</details>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if pageCount > 1}
		<nav class="mx-auto mt-4 flex w-full max-w-[900px] items-center justify-between gap-2">
			{#if page > 1}
				<a href={linkFor(page - 1)} class="page-btn">&larr; Prev</a>
			{:else}
				<span class="page-btn opacity-30">&larr; Prev</span>
			{/if}
			<span class="text-xs text-white/60">Page {page} of {pageCount}</span>
			{#if page < pageCount}
				<a href={linkFor(page + 1)} class="page-btn">Next &rarr;</a>
			{:else}
				<span class="page-btn opacity-30">Next &rarr;</span>
			{/if}
		</nav>
	{/if}
</main>

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

	/*
	 * One chip per show this person has been involved in.
	 *
	 * The parts wrap rather than being kept on one line: a chip like
	 * "2026-12-02 New York Considering big Dropped" is wider than a 320px
	 * viewport once the row padding is taken off, and `nowrap` made it spill
	 * out of the page.
	 */
	.show-chip {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		padding: 3px 7px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 1px;
		text-transform: uppercase;
		overflow-wrap: anywhere;
	}

	.status-applied {
		border-color: rgba(255, 255, 255, 0.22);
		color: rgba(255, 255, 255, 0.55);
	}

	/* A decided no, shown muted so it reads as closed rather than pending. */
	.status-not_considering {
		border-color: rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.3);
	}

	.status-considering {
		border-color: var(--yellow);
		color: var(--yellow);
	}

	.status-booked {
		border-color: #7dc36e;
		color: #7dc36e;
	}

	/* Past shows read as history rather than something still to action. */
	.chip-past {
		opacity: 0.55;
	}

	.chip-date {
		color: rgba(255, 255, 255, 0.75);
	}

	.chip-city {
		color: rgba(255, 255, 255, 0.45);
	}

	.chip-status {
		opacity: 0.9;
	}

	.chip-tier {
		padding: 1px 4px;
		background: rgba(255, 255, 255, 0.14);
	}

	.chip-flag {
		padding: 1px 4px;
	}

	.chip-dropped {
		background: var(--red);
		color: var(--white);
	}

	.chip-back {
		background: #7dc36e;
		color: var(--black);
	}

	.chip-busy {
		background: var(--yellow);
		color: var(--black);
	}

	.manual-tag {
		display: inline-flex;
		align-items: center;
		padding: 2px 6px;
		border: 1px solid rgba(255, 255, 255, 0.25);
		color: rgba(255, 255, 255, 0.5);
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	/* Phone tap targets: buttons grow to the 44px minimum. */
	@media (max-width: 700px) {
		.page-btn {
			height: 44px;
		}
	}
</style>
