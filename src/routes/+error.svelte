<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} — Jamboree Media</title>
</svelte:head>

<main
	class="page flex min-h-dvh w-full flex-col items-center justify-center px-[35px] py-[25px] text-white"
	style="background: #07213a;"
>
	<div class="flex max-w-[520px] flex-col items-center gap-6 text-center">
		<span
			class="show-tag"
			style={`--city-color: ${page.status === 404 ? 'var(--red)' : 'var(--yellow)'}`}
		>
			Error {page.status}
		</span>

		<h1
			class="brand-title m-0 text-[clamp(36px,7vw,72px)] leading-[0.85] font-normal tracking-[-0.045em] uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
		>
			{page.status === 404 ? 'Not Found' : 'Something Broke'}
		</h1>

		<p class="m-0 text-lg text-white/80">
			{#if page.status === 404}
				We couldn't find that page.
			{:else}
				{page.error?.message || 'Something went wrong on our end.'} Try reloading — if you were on
				an older tab, a refresh will pick up the latest version.
			{/if}
		</p>

		<a
			href="/"
			class="group relative flex items-center justify-between overflow-hidden bg-[var(--yellow)] px-8 py-4 text-[clamp(20px,3vw,28px)] leading-[0.8] font-extrabold tracking-[-0.04em] text-black uppercase"
		>
			<span
				class="absolute inset-0 translate-y-full bg-[var(--red)] transition-transform duration-250 group-hover:translate-y-0"
			></span>
			<span class="relative z-[1] leading-[0.8]">Home</span>
			<span
				class="relative z-[1] flex translate-y-[-0.08em] items-center leading-none transition-transform duration-250 group-hover:translate-x-[10px]"
				>&rarr;</span
			>
		</a>
	</div>
</main>

<style>
	.show-tag {
		display: inline-flex;
		align-items: center;
		height: 30px;
		padding: 0 12px;
		background: var(--city-color, var(--red));
		color: var(--black);
		font-size: 13px;
		line-height: 1;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
	}
</style>