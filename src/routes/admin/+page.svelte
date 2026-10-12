<script lang="ts">
	import type { PageProps } from './$types';
	import type { Booking } from '$lib/rows';
	import type { PersonWithAppearance, Status } from '$lib/people';
	import { STATUS_LABEL, STATUS_SHORT_LABEL, TIER_LABEL, instagramUrl } from '$lib/people';
	import { showSlug, isLive } from '$lib/show';
	import type { Show } from '$lib/show';

	import { enhance } from '$app/forms';

	type AddResult = {
		addError?: string;
		actionError?: string;
		editError?: string;
		field?: string;
		added?: boolean;
		name?: string;
		instagram?: string;
	};

	let { data, form }: PageProps = $props();

	let adding = $state(false);
	let editing = $state<number | null>(null);
	let transferring = $state<number | null>(null);

	const addErrors = $derived((form as AddResult | null)?.addError ?? null);
	const actionError = $derived((form as AddResult | null)?.actionError ?? null);
	const editError = $derived((form as AddResult | null)?.editError ?? null);

	const bookings = $derived(data.bookings as Booking[]);
	const people = $derived(data.people as PersonWithAppearance[]);
	const loadError = $derived(data.loadError as string | null);
	const tableMissing = $derived(data.tableMissing as boolean);
	const selected = $derived(data.selected as string);
	const tab = $derived(data.tab as 'bookings' | 'people');
	const scope = $derived(data.scope as 'applied' | 'considering' | 'booked' | 'all');
	const counts = $derived(data.counts as Record<'all' | Status, number>);
	const page = $derived(data.page as number);
	const total = $derived(data.total as number);
	const pageSize = $derived(data.pageSize as number);
	const pageCount = $derived(Math.max(1, Math.ceil(total / pageSize)));
	const rangeStart = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	const rangeEnd = $derived(Math.min(page * pageSize, total));

	const defenders = $derived(bookings.filter((b) => b.wants_to_defend));
	// Shows come from the database so they can be added without a deploy.
	const showList = $derived(data.showList as Show[]);
	const allShows = $derived(showList.filter((s) => showSlug(s.showDate ?? s.date) !== selected));

	const selectedShow = $derived(showList.find((s) => showSlug(s.showDate ?? s.date) === selected));

	const showMeta = $derived(
		showList.map((s) => ({
			slug: showSlug(s.showDate ?? s.date),
			label: s.city,
			date: s.date,
			color: s.cityColor,
			live: isLive(s)
		}))
	);

	const pageNumbers = $derived.by(() => {
		if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
		const nums: (number | '…')[] = [1];
		const start = Math.max(2, page - 1);
		const end = Math.min(pageCount - 1, page + 1);
		if (start > 2) nums.push('…');
		for (let n = start; n <= end; n++) nums.push(n);
		if (end < pageCount - 1) nums.push('…');
		nums.push(pageCount);
		return nums;
	});

	/** Short absolute timestamp, e.g. "Oct 15, 7:42 PM". */
	function submittedAt(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '';
		const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		return `${day}, ${time}`;
	}

	function pageUrl(next: number): string {
		return `/admin?show=${selected}&tab=people&scope=${scope}&page=${next}`;
	}

	function scopeUrl(nextScope: string): string {
		return `/admin?show=${selected}&tab=people&scope=${nextScope}&page=1`;
	}

	/** Close any open drawer before another opens, so they never stack. */
	function toggleEdit(id: number) {
		editing = editing === id ? null : id;
		transferring = null;
	}
	function toggleTransfer(id: number) {
		transferring = transferring === id ? null : id;
		editing = null;
	}
</script>

<svelte:head>
	<title>Admin - Jamboree Media</title>
</svelte:head>

<main class="min-h-dvh w-full bg-[#07213a] px-[20px] py-[25px] text-white">
	<header class="mx-auto flex w-full max-w-[900px] flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1
					class="brand-title m-0 text-[clamp(32px,7vw,72px)] leading-[0.85] font-normal tracking-[-0.045em] uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
				>
					{tab === 'people' ? 'Booking' : 'Bookings'}
				</h1>
				<p class="mt-2 mb-0 text-sm text-white/70">
					{#if tab === 'people'}
						{total}
						{total === 1 ? 'person' : 'people'} in this list &middot; {counts.booked}
						{counts.booked === 1 ? 'booked' : 'booked'} overall
					{:else}
						{total}
						{total === 1 ? 'person' : 'people'} &middot; {defenders.length}
						{defenders.length === 1 ? 'defender' : 'defenders'}
					{/if}
				</p>
			</div>

			<div class="flex flex-wrap gap-2">
				<a href="/admin" class="page-btn">Per show</a>
				<a href="/admin/people" class="page-btn">All people</a>
				<a href="/admin/shows" class="page-btn">Shows</a>
				<form method="POST" action="?/logout">
					<button
						type="submit"
						class="page-btn hover:!border-[var(--red)] hover:!text-[var(--red)]"
					>
						Sign out{#if data.username}&nbsp;<span class="opacity-60">{data.username}</span>{/if}
					</button>
				</form>
			</div>
		</div>

		<nav class="flex flex-wrap gap-2" aria-label="Filter by show">
			{#each showMeta as show (show.slug)}
				<a
					href="/admin?show={show.slug}&tab={tab}&scope={scope}"
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
				href="/admin?show={selected}&tab=people&scope={scope}"
				aria-current={tab === 'people' ? 'true' : undefined}
				class="view-tab {tab === 'people' ? 'view-tab-active' : ''}"
			>
				People
			</a>
			<a
				href="/admin?show={selected}&tab=bookings"
				aria-current={tab === 'bookings' ? 'true' : undefined}
				class="view-tab {tab === 'bookings' ? 'view-tab-active' : ''}"
			>
				Bookings
			</a>
		</nav>

		{#if tab === 'people'}
			<nav class="flex flex-wrap gap-2" aria-label="Filter by status">
				{#each [['applied', 'Applied'], ['considering', 'Considering'], ['booked', 'Booked'], ['not_considering', 'Passed'], ['all', 'All']] as const as [key, label] (key)}
					<a
						href={scopeUrl(key)}
						aria-current={scope === key ? 'true' : undefined}
						class="view-tab status-tab-{key} {scope === key ? 'view-tab-active' : ''}"
					>
						{label} <span class="tab-count">{counts[key]}</span>
					</a>
				{/each}
			</nav>
		{/if}
	</header>

	{#snippet pagination(top: boolean)}
		{#if pageCount > 1}
			<nav
				class="flex flex-wrap items-center justify-between gap-2 {top ? 'mb-3' : 'mt-4'}"
				aria-label={top ? 'Pagination, top' : 'Pagination, bottom'}
			>
				{#if page > 1}
					<a href={pageUrl(page - 1)} class="page-btn">&larr; Prev</a>
				{:else}
					<span class="page-btn opacity-30">&larr; Prev</span>
				{/if}

				<div class="flex flex-wrap items-center gap-1">
					{#each pageNumbers as n, i (i)}
						{#if n === '…'}
							<span class="px-1 text-xs text-white/40">&hellip;</span>
						{:else}
							<a
								href={pageUrl(n)}
								aria-current={n === page ? 'page' : undefined}
								aria-label="Page {n}"
								class="page-num {n === page ? 'page-num-active' : ''}"
							>
								{n}
							</a>
						{/if}
					{/each}
				</div>

				<span class="order-last w-full text-xs text-white/60 sm:order-none sm:w-auto">
					{rangeStart}&ndash;{rangeEnd} of {total}
				</span>

				{#if page < pageCount}
					<a href={pageUrl(page + 1)} class="page-btn">Next &rarr;</a>
				{:else}
					<span class="page-btn opacity-30">Next &rarr;</span>
				{/if}
			</nav>
		{/if}
	{/snippet}

	<!-- One toggle for an independent boolean flag on an appearance. -->
	{#snippet flagButton(
		appearanceId: number,
		field: string,
		on: boolean,
		label: string,
		onClass: string
	)}
		<form method="POST" action="?/flag" use:enhance class="flex">
			<input type="hidden" name="appearance" value={appearanceId} />
			<input type="hidden" name="show" value={selected} />
			<input type="hidden" name="field" value={field} />
			<input type="hidden" name="value" value={String(!on)} />
			<button
				type="submit"
				aria-pressed={on}
				aria-label="{on ? 'Undo' : 'Mark'} {label} for this person"
				title={label}
				class="tri tri-labelled {on ? onClass : ''}"
			>
				{label}
			</button>
		</form>
	{/snippet}

	<section class="mx-auto mt-8 w-full max-w-[900px]">
		{#if loadError}
			<p
				class="m-0 border-2 border-[var(--red)] bg-[var(--red)]/20 px-4 py-3 text-sm font-semibold"
			>
				{loadError}
			</p>
		{:else if tableMissing}
			<div class="border-l-4 border-[var(--yellow)] bg-white/5 p-5">
				<p class="m-0 text-sm font-bold text-[var(--yellow)]">People tables are missing.</p>
				<p class="m-0 mt-2 text-sm leading-relaxed text-white/70">
					Run this in the Supabase SQL Editor:
				</p>
				<ul class="mt-2 mb-0 list-disc pl-5 text-sm leading-relaxed text-white/70">
					<li><code class="text-white">supabase/migrations/steps/01_people.sql</code></li>
					<li><code class="text-white">supabase/migrations/steps/02_appearances.sql</code></li>
					<li><code class="text-white">supabase/migrations/steps/07_people.sql</code></li>
					<li><code class="text-white">supabase/migrations/steps/08_appearances.sql</code></li>
				</ul>
			</div>
		{:else if tab === 'people'}
			{@render pagination(true)}
			<div class="flex flex-col gap-6">
				{#if actionError}
					<p
						class="m-0 border-2 border-[var(--red)] bg-[var(--red)]/20 px-4 py-3 text-sm font-semibold"
					>
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
									await update({ reset: result.type === 'success' });
									if (result.type === 'success') adding = false;
								};
							}}
							class="flex flex-col gap-3"
						>
							<h2 class="m-0 text-xs font-extrabold tracking-[2px] text-white/70 uppercase">
								Add someone
							</h2>

							<div class="grid gap-3 sm:grid-cols-2">
								<div class="flex flex-col gap-1">
									<label
										for="add-name"
										class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase"
									>
										Name
									</label>
									<input
										type="text"
										id="add-name"
										name="name"
										value={(form as AddResult | null)?.name ?? ''}
										placeholder="Name"
										class="field"
									/>
									{#if addErrors}
										<p class="m-0 text-xs font-semibold text-[var(--red)]">{addErrors}</p>
									{/if}
								</div>

								<div class="flex flex-col gap-1">
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
										class="field"
									/>
									<p class="m-0 text-[11px] text-white/35">
										If they already exist this adds them to the show instead.
									</p>
								</div>

								<div class="flex flex-col gap-1">
									<label
										for="add-pronouns"
										class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase"
									>
										Pronouns
									</label>
									<input
										type="text"
										id="add-pronouns"
										name="pronouns"
										placeholder="they/them"
										class="field"
									/>
								</div>

								<div class="flex flex-col gap-1">
									<label
										for="added-by"
										class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase"
									>
										Added by
									</label>
									<input
										type="text"
										id="added-by"
										name="added_by"
										placeholder="Who contacted them"
										class="field"
									/>
								</div>
							</div>

							<div class="flex flex-col gap-1">
								<label
									for="add-disciplines"
									class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase"
								>
									Disciplines
								</label>
								<input
									type="text"
									id="add-disciplines"
									name="disciplines"
									placeholder="Stand up, improv"
									class="field"
								/>
							</div>

							<div class="flex flex-col gap-1">
								<label
									for="add-notes"
									class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase"
								>
									Notes
								</label>
								<textarea id="add-notes" name="notes" rows="2" class="field"></textarea>
							</div>

							<label class="flex items-center gap-2 text-sm text-white/80">
								<input type="checkbox" name="on_this_show" value="true" checked class="h-4 w-4" />
								Put them on {selectedShow?.city ?? 'this show'}
							</label>

							{#if selectedShow}
								<div class="grid gap-3 sm:grid-cols-2">
									<div class="flex flex-col gap-1">
										<label
											for="add-status"
											class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase"
										>
											Status
										</label>
										<div class="select-wrap">
											<select id="add-status" name="status" class="field select">
												{#each Object.entries(STATUS_LABEL) as [value, label] (value)}
													<option {value}>{label}</option>
												{/each}
											</select>
										</div>
									</div>
									<div class="flex flex-col gap-1">
										<label
											for="add-tier"
											class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase"
										>
											Tier
										</label>
										<div class="select-wrap">
											<select id="add-tier" name="tier" class="field select">
												<option value="">Not set</option>
												{#each Object.entries(TIER_LABEL) as [value, label] (value)}
													<option {value}>{label}</option>
												{/each}
											</select>
										</div>
									</div>
								</div>

								<div class="flex flex-col gap-1">
									<label
										for="add-reached"
										class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase"
									>
										Reached out by
									</label>
									<input
										type="text"
										id="add-reached"
										name="reached_out_by"
										placeholder="Who spoke to them"
										class="field"
									/>
								</div>
							{/if}

							<input type="hidden" name="show" value={selected} />

							<div class="flex gap-2">
								<button
									type="submit"
									class="bg-[var(--yellow)] px-4 py-2 text-xs font-extrabold tracking-[2px] text-black uppercase transition-opacity hover:opacity-85"
								>
									Add
								</button>
								<button type="button" onclick={() => (adding = false)} class="page-btn">
									Cancel
								</button>
							</div>
						</form>
					{:else}
						<button
							type="button"
							onclick={() => (adding = true)}
							class="add-toggle flex w-full items-center justify-between py-2 text-left"
						>
							<span class="text-xs font-extrabold tracking-[2px] text-white/70 uppercase">
								Add someone manually
							</span>
							<span class="text-lg font-bold text-[var(--yellow)]" aria-hidden="true">+</span>
						</button>
					{/if}
				</div>

				{#if people.length === 0}
					<p
						class="m-0 border-l-4 border-[var(--yellow)] bg-white/5 px-4 py-6 text-sm text-white/70"
					>
						{#if scope === 'booked'}
							Nobody booked on this show yet.
						{:else if scope === 'considering'}
							Nobody being considered.
						{:else}
							Nobody in this list.
						{/if}
					</p>
				{:else}
					<ul class="m-0 flex list-none flex-col gap-3 p-0">
						{#each people as p (p.appearance.id)}
							<li
								class="border-2 px-3 py-2 {p.appearance.dropped
									? 'border-[var(--red)] bg-[var(--red)]/10'
									: p.appearance.status === 'booked'
										? 'border-[#7dc36e] bg-[#7dc36e]/10'
										: p.appearance.status === 'considering'
											? 'border-[var(--yellow)] bg-white/10'
											: 'border-white/10 bg-white/5'}"
							>
								<!--
									Three separate groups: status, tier, then flags. They are
									boxed rather than just spaced so the boundaries survive
									wrapping onto a second line on a phone.
								-->
								<div class="flex flex-wrap items-center gap-2">
									<div class="control-group">
										<!--
										The four statuses, labelled rather than initialed: "A"
										and "B" side by side are ambiguous about which is which.
										Short labels so the group fits a phone; the full name
										stays in the aria-label and tooltip.
									-->
										<form method="POST" action="?/status" use:enhance class="flex gap-1">
											<input type="hidden" name="appearance" value={p.appearance.id} />
											<input type="hidden" name="show" value={selected} />
											{#each Object.entries(STATUS_LABEL) as [value, label] (value)}
												<button
													type="submit"
													name="status"
													{value}
													aria-pressed={p.appearance.status === value}
													aria-label="{label} for {p.name}"
													title={label}
													class="tri tri-labelled {p.appearance.status === value
														? `tri-on tri-${value}`
														: ''}"
												>
													{STATUS_SHORT_LABEL[value as Status]}
												</button>
											{/each}
										</form>
									</div>

									<div class="control-group">
										<form method="POST" action="?/tier" use:enhance class="flex gap-1">
											<input type="hidden" name="appearance" value={p.appearance.id} />
											<input type="hidden" name="show" value={selected} />
											<button
												type="submit"
												name="tier"
												value="big"
												aria-pressed={p.appearance.tier === 'big'}
												aria-label="Big name for {p.name}"
												class="tri tri-labelled {p.appearance.tier === 'big'
													? 'tri-on tri-big'
													: ''}">👑 Big</button
											>
											<button
												type="submit"
												name="tier"
												value="small"
												aria-pressed={p.appearance.tier === 'small'}
												aria-label="Small name for {p.name}"
												class="tri tri-labelled {p.appearance.tier === 'small'
													? 'tri-on tri-small'
													: ''}">🐭 Small</button
											>
										</form>
									</div>

									<!--
										All three flags are always available. Dropping is not
										only a post-show thing: someone booked for a show can
										drop out a week beforehand, and hiding the button until
										the date had passed would make that unrecordable.
									-->
									<div class="control-group">
										{@render flagButton(
											p.appearance.id,
											'busy',
											p.appearance.busy,
											'Busy',
											'tri-busy'
										)}
										{@render flagButton(
											p.appearance.id,
											'dropped',
											p.appearance.dropped,
											'Dropped',
											'tri-dropped'
										)}
										{@render flagButton(
											p.appearance.id,
											'should_rebook',
											p.appearance.should_rebook,
											'Rebook',
											'tri-back'
										)}
									</div>

									<div class="ml-auto flex shrink-0 gap-1">
										<button
											type="button"
											onclick={() => toggleEdit(p.appearance.id)}
											aria-expanded={editing === p.appearance.id}
											class="tri tri-labelled"
											class:tri-on={editing === p.appearance.id}>✎ Edit</button
										>
										<button
											type="button"
											onclick={() => toggleTransfer(p.appearance.id)}
											aria-expanded={transferring === p.appearance.id}
											class="tri tri-labelled"
											class:tri-on={transferring === p.appearance.id}>⇄ Move</button
										>
									</div>
								</div>

								<!-- Identity: full width on mobile so names never squeeze. -->
								<div class="mt-2 min-w-0">
									<!--
									items-center, not items-baseline: the tags are inline-flex
									boxes, and a flex box baselines from its content rather than
									its edge, so a 9px tag sat visibly high against an 18px
									name.
								-->
									<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
										<span class="text-lg font-extrabold tracking-[-0.02em] uppercase">
											{p.name}
										</span>
										{#if p.pronouns}
											<span class="text-xs text-white/50">({p.pronouns})</span>
										{/if}
										{#if p.appearance.busy}
											<span class="state-tag tag-busy">Busy</span>
										{/if}
										{#if p.appearance.dropped}
											<span class="state-tag tag-dropped">Dropped</span>
										{/if}
										{#if p.appearance.should_rebook}
											<span class="state-tag tag-back">Rebook</span>
										{/if}
										{#if p.added_manually}
											<span class="state-tag tag-manual">Added by {p.added_by ?? 'us'}</span>
										{/if}
										{#if !p.appearance.from_application}
											<span class="state-tag tag-manual">Added by hand</span>
										{/if}
									</div>

									{#if p.instagram}
										<a
											href={instagramUrl(p.instagram)}
											target="_blank"
											rel="noopener noreferrer"
											class="mt-0.5 inline-block text-sm text-white/60 underline decoration-white/25 underline-offset-2 transition-colors hover:text-[var(--yellow)]"
										>
											@{p.instagram}
										</a>
									{/if}

									<div class="mt-0.5 text-[11px] text-white/35">
										{#if p.appearance.reached_out_by}
											Reached out by {p.appearance.reached_out_by} &middot;
										{/if}
										{submittedAt(p.appearance.created_at)}
									</div>

									{#if p.disciplines}
										<div class="mt-0.5 text-xs text-white/40">{p.disciplines}</div>
									{/if}

									{#if p.notes}
										<details class="mt-2">
											<summary
												class="cursor-pointer text-[11px] font-extrabold tracking-[2px] text-white/45 uppercase"
											>
												Notes
											</summary>
											<div
												class="mt-2 border-l-4 border-[var(--yellow)] bg-black/20 p-3 text-sm leading-relaxed whitespace-pre-wrap"
											>
												{p.notes}
											</div>
										</details>
									{/if}

									{#if p.appearance.outcome_notes}
										<div
											class="mt-2 border-l-4 border-[var(--red)] bg-black/20 p-3 text-sm leading-relaxed whitespace-pre-wrap"
										>
											<span
												class="mb-1 block text-[10px] font-extrabold tracking-[2px] text-[var(--red)] uppercase"
											>
												Outcome
											</span>
											{p.appearance.outcome_notes}
										</div>
									{/if}
								</div>

								<!-- Edit drawer: every field on the person and this appearance. -->
								{#if editing === p.appearance.id}
									<form
										method="POST"
										action="?/edit"
										use:enhance={() => {
											return async ({ result, update }) => {
												await update({ reset: false });
												if (result.type === 'success') editing = null;
											};
										}}
										class="mt-3 flex flex-col gap-3 border-t-2 border-white/10 pt-3"
									>
										<h3
											class="m-0 text-[11px] font-extrabold tracking-[2px] text-white/60 uppercase"
										>
											Edit {p.name}
										</h3>

										{#if editError}
											<p
												class="m-0 border-2 border-[var(--red)] bg-[var(--red)]/20 px-3 py-2 text-sm font-semibold"
											>
												{editError}
											</p>
										{/if}

										<div class="grid gap-3 sm:grid-cols-2">
											<div class="flex flex-col gap-1">
												<label for="e-name-{p.appearance.id}" class="lbl">Name</label>
												<input
													type="text"
													id="e-name-{p.appearance.id}"
													name="name"
													value={p.name}
													class="field"
												/>
											</div>
											<div class="flex flex-col gap-1">
												<label for="e-ig-{p.appearance.id}" class="lbl">Instagram</label>
												<input
													type="text"
													id="e-ig-{p.appearance.id}"
													name="instagram"
													value={p.instagram ?? ''}
													placeholder="@handle"
													class="field"
												/>
											</div>
											<div class="flex flex-col gap-1">
												<label for="e-pr-{p.appearance.id}" class="lbl">Pronouns</label>
												<input
													type="text"
													id="e-pr-{p.appearance.id}"
													name="pronouns"
													value={p.pronouns ?? ''}
													class="field"
												/>
											</div>
											<div class="flex flex-col gap-1">
												<label for="e-disc-{p.appearance.id}" class="lbl">Disciplines</label>
												<input
													type="text"
													id="e-disc-{p.appearance.id}"
													name="disciplines"
													value={p.disciplines ?? ''}
													class="field"
												/>
											</div>
											<div class="flex flex-col gap-1">
												<label for="e-status-{p.appearance.id}" class="lbl">Status</label>
												<div class="select-wrap">
													<select
														id="e-status-{p.appearance.id}"
														name="status"
														class="field select"
													>
														{#each Object.entries(STATUS_LABEL) as [value, label] (value)}
															<option {value} selected={p.appearance.status === value}
																>{label}</option
															>
														{/each}
													</select>
												</div>
											</div>
											<div class="flex flex-col gap-1">
												<label for="e-tier-{p.appearance.id}" class="lbl">Tier</label>
												<div class="select-wrap">
													<select id="e-tier-{p.appearance.id}" name="tier" class="field select">
														<option value="" selected={p.appearance.tier === null}>Not set</option>
														{#each Object.entries(TIER_LABEL) as [value, label] (value)}
															<option {value} selected={p.appearance.tier === value}>{label}</option
															>
														{/each}
													</select>
												</div>
											</div>
											<div class="flex flex-col gap-1">
												<label for="e-reached-{p.appearance.id}" class="lbl">Reached out by</label>
												<input
													type="text"
													id="e-reached-{p.appearance.id}"
													name="reached_out_by"
													value={p.appearance.reached_out_by ?? ''}
													class="field"
												/>
											</div>
											<div class="flex flex-col gap-1">
												<label for="e-addedby-{p.appearance.id}" class="lbl">Added by</label>
												<input
													type="text"
													id="e-addedby-{p.appearance.id}"
													name="added_by"
													value={p.added_by ?? ''}
													class="field"
												/>
											</div>
										</div>

										<div class="flex flex-col gap-1">
											<label for="e-notes-{p.appearance.id}" class="lbl">Notes</label>
											<textarea id="e-notes-{p.appearance.id}" name="notes" rows="3" class="field"
												>{p.notes ?? ''}</textarea
											>
										</div>

										<div class="flex flex-col gap-1">
											<label for="e-outcome-{p.appearance.id}" class="lbl">Outcome notes</label>
											<textarea
												id="e-outcome-{p.appearance.id}"
												name="outcome_notes"
												rows="2"
												class="field">{p.appearance.outcome_notes ?? ''}</textarea
											>
										</div>

										<div class="flex flex-wrap gap-4">
											<label class="flex items-center gap-2 text-sm text-white/80">
												<input
													type="checkbox"
													name="dropped"
													value="true"
													checked={p.appearance.dropped}
													class="h-4 w-4"
												/>
												Dropped out
											</label>
											<label class="flex items-center gap-2 text-sm text-white/80">
												<input
													type="checkbox"
													name="should_rebook"
													value="true"
													checked={p.appearance.should_rebook}
													class="h-4 w-4"
												/>
												Should rebook
											</label>
											<label class="flex items-center gap-2 text-sm text-white/80">
												<input
													type="checkbox"
													name="busy"
													value="true"
													checked={p.appearance.busy}
													class="h-4 w-4"
												/>
												Busy that date
											</label>
											<label class="flex items-center gap-2 text-sm text-white/80">
												<input
													type="checkbox"
													name="added_manually"
													value="true"
													checked={p.added_manually}
													class="h-4 w-4"
												/>
												Added manually
											</label>
										</div>

										<input type="hidden" name="person" value={p.id} />
										<input type="hidden" name="appearance" value={p.appearance.id} />
										<input type="hidden" name="show" value={selected} />

										<div class="flex gap-2">
											<button
												type="submit"
												class="bg-[var(--yellow)] px-4 py-2 text-xs font-extrabold tracking-[2px] text-black uppercase transition-opacity hover:opacity-85"
											>
												Save
											</button>
											<button type="button" onclick={() => (editing = null)} class="page-btn"
												>Cancel</button
											>
										</div>
									</form>
								{/if}

								<!-- Move / copy to another show -->
								{#if transferring === p.appearance.id}
									<div class="mt-3 flex flex-col gap-2 border-t-2 border-white/10 pt-3">
										<h3
											class="m-0 text-[11px] font-extrabold tracking-[2px] text-white/60 uppercase"
										>
											Move {p.name} to another show
										</h3>

										{#if allShows.length === 0}
											<p class="m-0 text-sm text-white/50">
												There is no other show to move them to yet.
											</p>
										{:else}
											{#each allShows as target (showSlug(target.date))}
												<div class="flex flex-wrap items-center gap-2">
													<span class="text-sm text-white/75">
														{target.date} &middot; {target.city}
													</span>
													<form method="POST" action="?/transfer" use:enhance class="shrink-0">
														<input type="hidden" name="appearance" value={p.appearance.id} />
														<input type="hidden" name="show" value={selected} />
														<input type="hidden" name="target" value={showSlug(target.date)} />
														<input type="hidden" name="mode" value="move" />
														<button type="submit" class="tri tri-labelled">⇄ Move</button>
													</form>
													<form method="POST" action="?/transfer" use:enhance class="shrink-0">
														<input type="hidden" name="appearance" value={p.appearance.id} />
														<input type="hidden" name="show" value={selected} />
														<input type="hidden" name="target" value={showSlug(target.date)} />
														<input type="hidden" name="mode" value="copy" />
														<button type="submit" class="tri tri-labelled">⧉ Copy</button>
													</form>
												</div>
											{/each}
										{/if}

										<button
											type="button"
											onclick={() => (transferring = null)}
											class="page-btn self-start"
										>
											Cancel
										</button>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			{@render pagination(false)}
		{:else if bookings.length === 0}
			<p class="m-0 border-l-4 border-[var(--yellow)] bg-white/5 px-4 py-6 text-sm text-white/70">
				No responses yet.
			</p>
		{:else}
			<ul class="m-0 flex list-none flex-col gap-1.5 p-0">
				{#each bookings as b (b.id)}
					<li class="border-2 border-white/10 bg-white/5 px-3 py-2">
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
								<div
									class="mt-1 border-l-2 border-[var(--yellow)] pl-2 text-[13px] leading-snug whitespace-pre-wrap text-white/80"
								>
									{b.claim_description || '—'}
								</div>
							{:else}
								<div class="mt-1 text-[10px] font-bold tracking-[2px] text-white/25 uppercase">
									Not defending
								</div>
							{/if}
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

	.tri-on {
		color: var(--black);
		border-color: transparent;
	}

	/* Status colours, shared by the tri buttons and the tab counts. */
	.tri-applied {
		background: rgba(255, 255, 255, 0.7);
	}

	.tri-considering {
		background: var(--yellow);
	}

	/* A decided no: muted, so it recedes rather than competing with the funnel. */
	.tri-not_considering {
		background: rgba(255, 255, 255, 0.4);
	}

	.tri-booked {
		background: #7dc36e;
	}

	.tri-big {
		background: var(--yellow);
	}

	.tri-small {
		background: rgba(255, 255, 255, 0.75);
	}

	.tri-dropped {
		background: var(--red);
		color: var(--white);
	}

	.tri-back {
		background: #7dc36e;
	}

	.tri-busy {
		background: var(--yellow);
	}

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

	.page-num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 30px;
		height: 30px;
		padding: 0 6px;
		border: 2px solid rgba(255, 255, 255, 0.18);
		color: rgba(255, 255, 255, 0.7);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 1px;
		text-decoration: none;
	}

	.page-num:hover {
		border-color: rgba(255, 255, 255, 0.5);
		color: #fff;
	}

	.page-num-active {
		border-color: var(--yellow);
		background: var(--yellow);
		color: var(--black);
	}

	.tab-count {
		margin-left: 6px;
		padding: 2px 5px;
		background: rgba(255, 255, 255, 0.12);
		font-size: 10px;
		letter-spacing: 0;
		opacity: 0.85;
	}

	.view-tab-active .tab-count {
		background: var(--black);
		color: var(--yellow);
		opacity: 1;
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

	.state-tag {
		display: inline-flex;
		align-items: center;
		padding: 2px 6px;
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	.tag-dropped {
		background: var(--red);
		color: var(--white);
	}

	.tag-back {
		background: #7dc36e;
		color: var(--black);
	}

	.tag-manual {
		border: 1px solid rgba(255, 255, 255, 0.25);
		color: rgba(255, 255, 255, 0.5);
	}

	.tag-busy {
		background: var(--yellow);
		color: var(--black);
	}

	/*
	 * A set of related controls: status, tier, flags. Boxing them rather than
	 * only spacing them apart means the boundaries still read when the row wraps
	 * onto a second line on a phone.
	 */
	.control-group {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 6px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.2);
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

	/*
	 * Dropdowns: the native arrow is removed and replaced with our own so the
	 * control reads as a dropdown on every platform, including iOS where the
	 * native arrow is faint. The wrapper's arrow is pointer-events:none so taps
	 * still land on the select, and padding-right keeps text clear of it.
	 */
	.select-wrap {
		position: relative;
		display: block;
		width: 100%;
	}

	.select {
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
		padding-right: 34px;
	}

	.select-wrap::after {
		content: '';
		position: absolute;
		top: 50%;
		right: 14px;
		width: 0;
		height: 0;
		border-top: 6px solid rgba(255, 255, 255, 0.7);
		border-right: 5px solid transparent;
		border-left: 5px solid transparent;
		transform: translateY(-30%);
		pointer-events: none;
	}

	/* Tint the arrow while its select has focus. */
	.select-wrap:focus-within::after {
		border-top-color: var(--yellow);
	}

	.lbl {
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.7);
	}

	/*
	 * Phone tap targets.
	 *
	 * On a desktop these stay compact, which matters when scanning a long list.
	 * On a phone the same controls are finger-operated, so every button and tab
	 * grows to the 44px accessibility minimum. The controls are also wrapped in
	 * their own row by the row layout, so the extra height costs no width.
	 */
	@media (max-width: 700px) {
		.page-btn,
		.view-tab,
		.page-num,
		.show-tab {
			height: 44px;
		}

		.tri-labelled {
			height: 44px;
			padding: 0 10px;
			font-size: 11px;
		}

		.page-num {
			min-width: 44px;
		}

		/* The full-width "Add someone manually" toggle. */
		.add-toggle {
			min-height: 44px;
		}
	}
</style>
