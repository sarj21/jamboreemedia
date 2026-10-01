<script lang="ts">
	import type { PageProps } from './$types';
	import { showSlug } from '$lib/show';
	import shows from '$lib/shows.json';
	import type { Show } from '$lib/show';

	type Booking = {
		id: number;
		show_date: string;
		name: string;
		pronouns: string | null;
		payment_handle: string;
		wants_to_defend: boolean;
		claim_description: string | null;
		created_at: string;
	};

	let { data }: PageProps = $props();

	const bookings = $derived(data.bookings as Booking[]);
	const loadError = $derived(data.loadError as string | null);
	const selected = $derived(data.selected as string);

	const showMeta = $derived(
		(shows as Show[]).map((s) => ({
			slug: showSlug(s.date),
			label: s.city,
			date: s.date,
			color: s.cityColor
		}))
	);

	const defenders = $derived(bookings.filter((b) => b.wants_to_defend));
	const total = $derived(bookings.length);
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
					submissions
				</h1>
				<p class="mt-2 mb-0 text-sm text-white/70">
					{total}
					{total === 1 ? 'person' : 'people'} &middot; {defenders.length}
					{defenders.length === 1 ? 'defender' : 'defenders'}
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
					href="/admin?show={show.slug}"
					aria-current={selected === show.slug ? 'true' : undefined}
					style={`--city-color: ${show.color}`}
					class="show-tab {selected === show.slug ? 'show-tab-active' : ''}"
				>
					<span class="show-tab-dot" aria-hidden="true"></span>
					<span class="show-tab-date">{show.date}</span>
					<span class="show-tab-city">{show.label}</span>
				</a>
			{/each}
		</nav>
	</header>

	<section class="mx-auto mt-8 w-full max-w-[900px]">
		{#if loadError}
			<p
				class="m-0 border-2 border-[var(--red)] bg-[var(--red)]/20 px-4 py-3 text-sm font-semibold"
			>
				{loadError}
			</p>
		{:else if bookings.length === 0}
			<p class="m-0 border-l-4 border-[var(--yellow)] bg-white/5 px-4 py-6 text-sm text-white/70">
				No responses yet.
			</p>
		{:else}
			<ul class="m-0 flex list-none flex-col gap-3 p-0">
				{#each bookings as b (b.id)}
					<li class="border-2 border-white/10 bg-white/5 p-4">
						<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
							<span class="text-xl font-extrabold tracking-[-0.02em] uppercase">{b.name}</span>
							{#if b.pronouns}
								<span class="text-sm text-white/60">({b.pronouns})</span>
							{/if}
						</div>

						<div class="mt-1 text-sm text-white/60">
							{b.payment_handle}
						</div>

						{#if b.wants_to_defend}
							<div
								class="mt-3 border-l-4 border-[var(--yellow)] bg-black/20 p-3 text-sm leading-relaxed whitespace-pre-wrap"
							>
								<span
									class="mb-1 block text-[10px] font-extrabold tracking-[2px] text-[var(--yellow)] uppercase"
									>Claims</span
								>
								{b.claim_description || '—'}
							</div>
						{:else}
							<div class="mt-3 text-xs font-bold tracking-[2px] text-white/35 uppercase">
								Not defending
							</div>
						{/if}
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
</style>
