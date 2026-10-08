<script lang="ts">
	import type { PageProps } from './$types';
	import type { Application, Booking } from '$lib/rows';
	import { showSlug, isLive } from '$lib/show';
	import shows from '$lib/shows.json';
	import type { Show } from '$lib/show';

	import { enhance } from '$app/forms';

	type AddResult = {
		addErrors?: Record<string, string>;
		actionError?: string;
		added?: boolean;
		// Echoed back so a failed add keeps what was typed.
		name?: string;
		instagram?: string;
	};

	let { data, form }: PageProps = $props();

	let adding = $state(false);

	const addErrors = $derived((form as AddResult | null)?.addErrors ?? null);
	const actionError = $derived((form as AddResult | null)?.actionError ?? null);

	const bookings = $derived(data.bookings as Booking[]);
	const applications = $derived(data.applications as Application[]);
	const loadError = $derived(data.loadError as string | null);
	const tableMissing = $derived(data.tableMissing as boolean);
	const selected = $derived(data.selected as string);
	const tab = $derived(data.tab as 'bookings' | 'applications');

	const showMeta = $derived(
		(shows as Show[]).map((s) => ({
			slug: showSlug(s.date),
			label: s.city,
			date: s.date,
			color: s.cityColor,
			// Not advertised on the home page yet, but still bookable.
			live: isLive(s)
		}))
	);

	const defenders = $derived(bookings.filter((b) => b.wants_to_defend));

	const kept = $derived(applications.filter((a) => a.keep));
	const rest = $derived(applications.filter((a) => !a.keep));

	const page = $derived(data.page as number);
	const total = $derived(data.total as number);
	const pageSize = $derived(data.pageSize as number);
	const pageCount = $derived(Math.max(1, Math.ceil(total / pageSize)));
	const rangeStart = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	const rangeEnd = $derived(Math.min(page * pageSize, total));

	/** Short absolute timestamp, e.g. "Oct 15, 7:42 PM". */
	function submittedAt(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '';
		const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		return `${day}, ${time}`;
	}

	function pageUrl(next: number): string {
		return `/admin?show=${selected}&tab=applications&page=${next}`;
	}

</script>

<svelte:head>
	<title>Bookings - Jamboree Media</title>
</svelte:head>

<main class="min-h-dvh w-full bg-[#07213a] px-[20px] py-[25px] text-white">
	<header class="mx-auto flex w-full max-w-[900px] flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1
					class="brand-title m-0 text-[clamp(32px,7vw,72px)] leading-[0.85] font-normal tracking-[-0.045em] uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
				>
					{tab === 'applications' ? 'Applications' : 'Bookings'}
				</h1>
				<p class="mt-2 mb-0 text-sm text-white/70">
					{#if tab === 'applications'}
						{applications.length}
						{applications.length === 1 ? 'person' : 'people'} applied
					{:else}
						{total}
						{total === 1 ? 'person' : 'people'} &middot; {defenders.length}
						{defenders.length === 1 ? 'defender' : 'defenders'}
					{/if}
				</p>
			</div>

			<form method="POST" action="?/logout">
				<button
					type="submit"
					class="border-2 border-white/25 px-4 py-2 text-xs font-extrabold tracking-[2px] text-white/80 uppercase transition-colors hover:border-[var(--red)] hover:text-[var(--red)]"
				>
					Sign out
				</button>
			</form>
		</div>

		<nav class="flex flex-wrap gap-2" aria-label="Filter by show">
			{#each showMeta as show (show.slug)}
				<a
					href="/admin?show={show.slug}&tab={tab}"
					aria-current={selected === show.slug ? 'true' : undefined}
					style={`--city-color: ${show.color}`}
					class="show-tab {selected === show.slug ? 'show-tab-active' : ''}"
				>
					<span class="show-tab-dot" aria-hidden="true"></span>
					<span class="show-tab-date">{show.date}</span>
					<span class="show-tab-city">{show.label}</span>
					{#if !show.live}
						<span class="show-tab-flag">Not live</span>
					{/if}
				</a>
			{/each}
		</nav>

		<nav class="flex flex-wrap gap-2" aria-label="View">
			<a
				href="/admin?show={selected}&tab=applications"
				aria-current={tab === 'applications' ? 'true' : undefined}
				class="view-tab {tab === 'applications' ? 'view-tab-active' : ''}"
			>
				Applications
			</a>
			<a
				href="/admin?show={selected}&tab=bookings"
				aria-current={tab === 'bookings' ? 'true' : undefined}
				class="view-tab {tab === 'bookings' ? 'view-tab-active' : ''}"
			>
				Bookings
			</a>
		</nav>
	</header>

	{#snippet row(a: Application, isKept: boolean)}
		<li
			class="flex flex-wrap items-start gap-x-3 gap-y-2 border-2 px-3 py-2 sm:flex-nowrap {isKept
				? 'border-[var(--yellow)] bg-white/10'
				: 'border-white/10 bg-white/5'}"
		>
			<!-- The show slug is posted in the body: ?/keep drops the query string. -->
			<form method="POST" action="?/keep" use:enhance class="mt-0.5 shrink-0">
				<input type="hidden" name="id" value={a.id} />
				<input type="hidden" name="keep" value={String(!isKept)} />
				<input type="hidden" name="show" value={selected} />
				<button
					type="submit"
					aria-pressed={isKept}
					aria-label={isKept ? `Unmark ${a.name} as keeping` : `Keep ${a.name}`}
					title={isKept ? 'Keeping — click to remove' : 'Click to keep and pin to top'}
					class="flex h-6 w-6 items-center justify-center border-2 text-xs font-extrabold transition-colors {isKept
						? 'border-[var(--yellow)] bg-[var(--yellow)] text-black'
						: 'border-white/30 text-transparent hover:border-[var(--yellow)]'}"
				>
					&#10003;
				</button>
			</form>

			<!-- Triage: yes / no / maybe -->
			<form method="POST" action="?/status" use:enhance class="flex shrink-0 gap-1">
				<input type="hidden" name="id" value={a.id} />
				<input type="hidden" name="show" value={selected} />
				{#each [{ v: 'yes', t: 'Y' }, { v: 'no', t: 'N' }, { v: 'maybe', t: '?' }] as opt (opt.v)}
					<button
						type="submit"
						name="status"
						value={opt.v}
						aria-pressed={a.status === opt.v}
						aria-label={opt.v === 'maybe' ? 'Maybe' : opt.v === 'yes' ? 'Yes' : 'No'}
						class="tri h-6 w-6 text-[11px] font-extrabold uppercase {a.status === opt.v
							? opt.v === 'yes'
								? 'tri-on tri-yes'
								: opt.v === 'no'
									? 'tri-on tri-no'
									: 'tri-on tri-maybe'
							: ''}"
					>
						{opt.t}
					</button>
				{/each}
			</form>

			<!-- Triage: big / small name -->
			<div class="flex shrink-0 items-center gap-2">
				<form method="POST" action="?/tier" use:enhance class="flex gap-1">
					<input type="hidden" name="id" value={a.id} />
					<input type="hidden" name="show" value={selected} />
					<button
						type="submit"
						name="tier"
						value="big"
						aria-pressed={a.tier === 'big'}
						aria-label="Big name"
						class="tri tri-labelled {a.tier === 'big' ? 'tri-on tri-big' : ''}">👑 Big</button
					>
					<button
						type="submit"
						name="tier"
						value="small"
						aria-pressed={a.tier === 'small'}
						aria-label="Small name"
						class="tri tri-labelled {a.tier === 'small' ? 'tri-on tri-small' : ''}">🐭 Small</button
					>
				</form>
			</div>

			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span class="text-xl font-extrabold tracking-[-0.02em] uppercase">{a.name}</span>
				</div>
				<div class="mt-1 text-sm">
					<a
						href="https://instagram.com/{a.instagram.replace(/^@/, '')}"
						target="_blank"
						rel="noopener noreferrer"
						class="text-white/60 underline decoration-white/25 underline-offset-2 transition-colors hover:text-[var(--yellow)]"
					>
						{a.instagram}
					</a>
				</div>

				{#if a.disciplines}
					<div class="mt-0.5 text-xs text-white/40">{a.disciplines}</div>

				<div class="mt-0.5 text-[11px] text-white/35">{submittedAt(a.created_at)}</div>
				{/if}
				{#if a.notes}
					<div
						class="mt-3 border-l-4 border-[var(--yellow)] bg-black/20 p-3 text-sm leading-relaxed whitespace-pre-wrap"
					>
						<span
							class="mb-1 block text-[10px] font-extrabold tracking-[2px] text-[var(--yellow)] uppercase"
							>Notes</span
						>
						{a.notes}
					</div>
				{/if}
			</div>
		</li>
	{/snippet}

	<section class="mx-auto mt-8 w-full max-w-[900px]">
		{#if loadError}
			<p class="m-0 border-2 border-[var(--red)] bg-[var(--red)]/20 px-4 py-3 text-sm font-semibold">
				{loadError}
			</p>
		{:else if tableMissing}
			<div class="border-l-4 border-[var(--yellow)] bg-white/5 p-5">
				<p class="m-0 text-sm font-bold text-[var(--yellow)]">Applications table needs updating.</p>
				<p class="m-0 mt-2 text-sm leading-relaxed text-white/70">
					Run these in the Supabase SQL Editor, in order:
				</p>
				<ul class="mt-2 mb-0 list-disc pl-5 text-sm leading-relaxed text-white/70">
					<li><code class="text-white">supabase/migrations/create_applications_table.sql</code></li>
					<li><code class="text-white">supabase/migrations/applications_keep_and_manual.sql</code></li>
					<li><code class="text-white">supabase/migrations/applications_disciplines.sql</code></li>
				</ul>
			</div>
		{:else if tab === 'applications'}
			<div class="flex flex-col gap-6">
				{#if actionError}
					<p class="m-0 border-2 border-[var(--red)] bg-[var(--red)]/20 px-4 py-3 text-sm font-semibold">
						{actionError}
					</p>
				{/if}

				<!-- Add someone by hand -->
				<div class="border-2 border-dashed border-white/20 p-4">
					{#if adding}
						<form
							method="POST"
							action="?/add"
							use:enhance={() => {
								return async ({ result, update }) => {
									// Keep what was typed on failure so it can be corrected.
									await update({ reset: result.type === 'success' });
									if (result.type === 'success') adding = false;
								};
							}}
							class="flex flex-col gap-3"
						>
							<div class="flex flex-col gap-3 sm:flex-row">
								<div class="flex flex-1 flex-col gap-1">
									<label for="add-name" class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase">
										Name
									</label>
									<input
										type="text"
										id="add-name"
										name="name"
										value={(form as AddResult | null)?.name ?? ''}
										placeholder="Name"
										class="border-2 border-white/20 bg-black/30 px-3 py-2 text-base text-white placeholder-white/40 outline-none focus:border-[var(--yellow)]"
									/>
									{#if addErrors?.name}
										<p class="m-0 text-xs font-semibold text-[var(--red)]">{addErrors.name}</p>
									{/if}
								</div>

								<div class="flex flex-1 flex-col gap-1">
									<label
										for="add-instagram"
										class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase"
									>
										Instagram
									</label>
									<input
										type="text"
										id="add-instagram"
										name="instagram"
										value={(form as AddResult | null)?.instagram ?? ''}
										placeholder="@handle"
										class="border-2 border-white/20 bg-black/30 px-3 py-2 text-base text-white placeholder-white/40 outline-none focus:border-[var(--yellow)]"
									/>
									{#if addErrors?.instagram}
										<p class="m-0 text-xs font-semibold text-[var(--red)]">{addErrors.instagram}</p>
									{/if}
								</div>
							</div>

							<input type="hidden" name="show" value={selected} />

							<div class="flex gap-2">
								<button
									type="submit"
									class="bg-[var(--yellow)] px-4 py-2 text-xs font-extrabold tracking-[2px] text-black uppercase transition-opacity hover:opacity-85"
								>
									Add
								</button>
								<button
									type="button"
									onclick={() => (adding = false)}
									class="border-2 border-white/25 px-4 py-2 text-xs font-extrabold tracking-[2px] text-white/70 uppercase transition-colors hover:border-white/50 hover:text-white"
								>
									Cancel
								</button>
							</div>
						</form>
					{:else}
						<button
							type="button"
							onclick={() => (adding = true)}
							class="flex w-full items-center justify-between text-left"
						>
							<span class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase">
								Add someone manually
							</span>
							<span class="text-lg font-bold text-[var(--yellow)]" aria-hidden="true">+</span>
						</button>
					{/if}
				</div>

				{#if applications.length === 0}
					<p class="m-0 border-l-4 border-[var(--yellow)] bg-white/5 px-4 py-6 text-sm text-white/70">
						No applications yet.
					</p>
				{:else}
					{#if kept.length > 0}
						<p class="m-0 text-xs font-extrabold tracking-[2px] text-[var(--yellow)] uppercase">
							Keeping ({kept.length})
						</p>
					{/if}

					<ul class="m-0 flex list-none flex-col gap-3 p-0">
						{#each kept as a (a.id)}
							{@render row(a, true)}
						{/each}
					</ul>

					{#if rest.length > 0}
						<p
							class="m-0 mt-2 text-xs font-extrabold tracking-[2px] text-white/40 uppercase"
						>
							Others ({rest.length})
						</p>
						<ul class="m-0 flex list-none flex-col gap-3 p-0">
							{#each rest as a (a.id)}
								{@render row(a, false)}
							{/each}
						</ul>
					{/if}
				{/if}
			</div>

			<!-- Pagination -->
			{#if pageCount > 1}
				<nav class="mt-3 flex items-center justify-between gap-3" aria-label="Pagination">
					{#if page > 1}
						<a href={pageUrl(page - 1)} class="page-btn">&larr; Prev</a>
					{:else}
						<span class="page-btn opacity-30">&larr; Prev</span>
					{/if}

					<span class="text-xs text-white/60">{rangeStart}&ndash;{rangeEnd} of {total}</span>

					{#if page < pageCount}
						<a href={pageUrl(page + 1)} class="page-btn">Next &rarr;</a>
					{:else}
						<span class="page-btn opacity-30">Next &rarr;</span>
					{/if}
				</nav>
			{/if}
		{:else if bookings.length === 0}
			<p class="m-0 border-l-4 border-[var(--yellow)] bg-white/5 px-4 py-6 text-sm text-white/70">
				No responses yet.
			</p>
		{:else}
			<ul class="m-0 flex list-none flex-col gap-1.5 p-0">
				{#each bookings as b (b.id)}
					<li class="border-2 border-white/10 bg-white/5 px-3 py-2">
						<div class="flex flex-wrap items-start gap-x-3 gap-y-2 sm:flex-nowrap">
											<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
									<span class="text-[15px] leading-tight font-extrabold tracking-[-0.02em] uppercase">
										{b.name}
									</span>
									{#if b.pronouns}
										<span class="text-xs text-white/50">({b.pronouns})</span>
									{/if}
									<span class="text-xs text-white/50">{b.payment_handle}</span>
								</div>

								<div class="mt-0.5 text-[11px] text-white/35">
									{submittedAt(b.created_at)}
								</div>

								{#if b.wants_to_defend}
									<div class="mt-1 border-l-2 border-[var(--yellow)] pl-2 text-[13px] leading-snug whitespace-pre-wrap text-white/80">
										{b.claim_description || '—'}
									</div>
								{:else}
									<div class="mt-1 text-[10px] font-bold tracking-[2px] text-white/25 uppercase">
										Not defending
									</div>
								{/if}
							</div>
						</div>
					</li>
				{/each}
			</ul>

		{/if}
	</section>
</main>

<style>
	.show-tab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 34px;
		padding: 0 12px;
		border: 2px solid rgba(255, 255, 255, 0.18);
		color: rgba(255, 255, 255, 0.55);
		text-decoration: none;
		transition:
			border-color 150ms ease,
			color 150ms ease;
	}

	.show-tab:hover {
		border-color: rgba(255, 255, 255, 0.45);
		color: rgba(255, 255, 255, 0.8);
	}

	.show-tab-active {
		border-color: var(--city-color, var(--yellow));
		color: var(--white);
	}

	.show-tab-dot {
		width: 10px;
		height: 10px;
		flex-shrink: 0;
		background: var(--city-color, var(--red));
	}

	.show-tab-date {
		font-size: 12px;
		line-height: 1;
		font-weight: 800;
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	.show-tab-city {
		font-size: 11px;
		line-height: 1;
		font-weight: 700;
		letter-spacing: 1px;
		text-transform: uppercase;
		opacity: 0.6;
	}

	.show-tab-flag {
		padding: 2px 6px;
		background: rgba(255, 255, 255, 0.12);
		color: inherit;
		font-size: 9px;
		line-height: 1;
		font-weight: 800;
		letter-spacing: 1px;
		text-transform: uppercase;
		opacity: 0.7;
	}

	/* Triage buttons: small square toggles on each row */
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

	/* Wider variant carrying a text label so Big/Small read without a tooltip. */
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

	.tri-on {
		color: var(--black);
		border-color: transparent;
	}

	.tri-yes {
		background: #7dc36e;
	}

	.tri-no {
		background: var(--red);
	}

	.tri-maybe {
		background: var(--yellow);
	}

	.tri-big {
		background: var(--yellow);
	}

	.tri-small {
		background: rgba(255, 255, 255, 0.75);
	}

	.page-btn {
		display: inline-flex;
		align-items: center;
		height: 30px;
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

	.view-tab {
		display: inline-flex;
		align-items: center;
		height: 32px;
		padding: 0 14px;
		border: 2px solid rgba(255, 255, 255, 0.18);
		color: rgba(255, 255, 255, 0.55);
		font-size: 12px;
		line-height: 1;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
		text-decoration: none;
		transition:
			border-color 150ms ease,
			color 150ms ease;
	}

	.view-tab:hover {
		border-color: rgba(255, 255, 255, 0.45);
		color: rgba(255, 255, 255, 0.8);
	}

	.view-tab-active {
		border-color: var(--yellow);
		color: var(--yellow);
	}
</style>