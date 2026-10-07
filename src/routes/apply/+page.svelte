<script lang="ts">
	import type { PageProps } from './$types';
	import { metaTags } from '$lib/seo';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Apply — Jamboree Media</title>
	{#each metaTags( { title: 'Apply to perform \u2014 Jamboree Media', description: 'Interested in performing on Jamboree? Sign up and we will reach out on Instagram when a spot opens up for your city.' } ) as { attr, key, content }}
		<meta {...{ [attr]: key, content }} />
	{/each}
</svelte:head>

<main
	class="page flex min-h-dvh w-full flex-col px-[35px] py-[25px] text-white"
	style="background: #07213a;"
>
	<header class="relative z-[2] w-full">
		<a
			href="/"
			class="mb-6 inline-flex items-center gap-2 text-sm font-bold tracking-[2px] text-white/70 uppercase transition-colors hover:text-[var(--yellow)]"
		>
			<span aria-hidden="true">&larr;</span> Back to shows
		</a>
		<h1
			class="brand-title m-0 w-full max-w-full overflow-hidden text-[clamp(36px,7vw,80px)] leading-[0.85] font-normal tracking-[-0.045em] whitespace-nowrap uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
		>
			Apply
		</h1>
		<p class="mt-4 mb-0 max-w-[600px] text-lg leading-relaxed text-white/80">
			Interested in being in the show? Sign up below and we'll reach out on Instagram if there's a
			good fit!
		</p>
	</header>

	<section
		class="relative z-[3] mx-auto mt-[clamp(24px,4vh,48px)] flex w-full max-w-[700px] flex-col gap-4"
	>
		{#if data.shows.length === 0}
			<div class="border-l-4 border-[var(--yellow)] bg-white/5 p-5">
				<p class="m-0 text-lg font-bold text-[var(--yellow)]">No shows are open right now.</p>
				<p class="m-0 mt-2 text-sm leading-relaxed text-white/70">
					Check back soon! We'll post new dates here as they're confirmed.
				</p>
			</div>
		{:else}
			{#each data.shows as show (show.slug)}
				<a
					href="/apply/{show.slug}"
					class="group flex flex-col gap-3 border-2 border-white/10 bg-white/5 p-5 no-underline transition-colors hover:border-white/30"
				>
					<div class="flex flex-wrap items-center gap-2">
						<span class="show-tag" style={`--city-color: ${show.cityColor}`}>{show.city}</span>
						<span class="text-sm text-white/70">{show.date}</span>
					</div>

					<div
						class="text-2xl leading-[0.9] font-extrabold tracking-[-0.04em] text-white uppercase"
					>
						{show.venue}
					</div>

					<div class="text-sm leading-relaxed text-white/70">
						Doors {show.doors} &middot; Show {show.stage} &middot; Call time {show.call}
					</div>

					{#if show.notes}
						<div class="text-sm leading-relaxed text-white/60">{show.notes}</div>
					{/if}

					<div
						class="mt-1 text-sm font-extrabold tracking-[2px] text-[var(--yellow)] uppercase transition-transform duration-250 group-hover:translate-x-[8px]"
					>
						Apply <span aria-hidden="true">&rarr;</span>
					</div>
				</a>
			{/each}
		{/if}
	</section>
</main>

<style>
	.show-tag {
		display: inline-flex;
		align-items: center;
		height: 28px;
		padding: 0 10px;
		background: var(--city-color, var(--red));
		color: var(--black);
		font-size: 12px;
		line-height: 1;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
	}

	@media (max-width: 700px) {
		main {
			padding: 20px 20px env(safe-area-inset-bottom);
		}

		header h1 {
			font-size: clamp(28px, 9vw, 56px);
			white-space: normal;
		}
	}

	@media (max-width: 450px) {
		main {
			padding: 14px 14px env(safe-area-inset-bottom);
		}

		header h1 {
			font-size: clamp(24px, 8vw, 44px);
		}
	}
</style>
