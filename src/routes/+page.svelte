<script lang="ts">
	import type { PageProps } from './$types';
	import { metaTags } from '$lib/seo';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Jamboree Media</title>
	{#each metaTags( { title: 'Jamboree Media', description: 'A live comedy show keeping free speech alive.' } ) as { attr, key, content }}
		<meta {...{ [attr]: key, content }} />
	{/each}
</svelte:head>

<main class="page flex h-dvh w-full flex-col overflow-hidden px-[35px] py-[25px] text-white">
	<header class="relative z-[2] w-full">
		<h1
			class="brand-title m-0 w-full max-w-full overflow-hidden text-[clamp(42px,9.2vw,148px)] leading-[0.85] font-normal tracking-[-0.045em] whitespace-nowrap uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
		>
			Jamboree Media
		</h1>

		<nav class="social-nav mt-7 flex items-center gap-5" aria-label="Social media">
			<a
				href="https://instagram.com/jamboree.media"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Instagram"
				class="social-link"
			>
				<img src="/img/instagram.png" alt="" />
			</a>

			<a
				href="https://youtube.com/@jamboreemedia"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="YouTube"
				class="social-link"
			>
				<img src="/img/youtube.png" alt="" />
			</a>

			<a
				href="https://tiktok.com/@jamboree.media"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="TikTok"
				class="social-link"
			>
				<img src="/img/tiktok.png" alt="" />
			</a>
		</nav>
	</header>

	<section
		class="relative z-[3] mt-[clamp(28px,4vh,48px)] ml-auto flex w-full max-w-[850px] flex-col gap-[clamp(20px,3vh,40px)]"
	>
		{#each data.shows as show (show.date + show.ticketUrl)}
			<div>
				<div class="mb-3 flex flex-wrap items-center gap-2">
					{#if show.isNext}
						<span class="show-tag show-next">Next Show</span>
					{/if}

					<span class="show-tag" style={`--city-color: ${show.cityColor}`}>
						{show.city}
					</span>
				</div>

				<h2
					class="m-0 w-full text-[clamp(36px,5.5vw,84px)] leading-[0.9] font-extrabold tracking-[-0.04em] uppercase"
				>
					{show.date}
				</h2>

				<a
					href={show.ticketUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="group relative mt-[14px] flex w-full items-center justify-between overflow-hidden bg-[var(--yellow)] px-6 py-[13px] ..."
				>
					<span
						class="absolute inset-0 translate-y-full bg-[var(--red)] transition-transform duration-250 group-hover:translate-y-0"
					></span>

					<span
						class="relative z-[1] text-[clamp(32px,5vw,68px)] leading-[0.8] font-extrabold tracking-[-0.04em] uppercase"
					>
						Get Tickets
					</span>

					<span
						class="relative z-[1] text-[clamp(32px,5vw,64px)] leading-none font-extrabold transition-transform duration-250 group-hover:translate-x-[15px]"
					>
						→
					</span>
				</a>
			</div>
		{/each}
	</section>

	<footer class="mt-auto flex w-full justify-end pt-[30px] text-right text-[15px]">
		<div>
			<span class="mb-1 block text-[10px] font-extrabold tracking-[2px] text-white/70 uppercase">
				Contact
			</span>

			<a
				href="mailto:steven@jamboree.media"
				class="font-semibold text-white no-underline hover:text-[var(--yellow)]"
			>
				steven@jamboree.media
			</a>
		</div>
	</footer>
</main>

<style>
	.social-link {
		display: flex;
		width: 64px;
		height: 64px;
		align-items: center;
		justify-content: center;
		filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.75));
		transition:
			transform 200ms ease,
			opacity 200ms ease;
	}

	.social-link img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.social-link:hover {
		transform: translateY(-4px) scale(1.08);
		opacity: 0.8;
	}

	.show-tag {
		display: inline-flex;
		align-items: center;
		height: 30px;
		padding: 0 10px;
		background: var(--city-color, var(--red));
		color: var(--black);
		font-size: 13px;
		line-height: 1;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
		box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.2);
	}

	.show-next {
		background: var(--red);
		color: var(--white);
	}

	@media (max-width: 700px) {
		main {
			padding: 20px 20px env(safe-area-inset-bottom);
		}

		header h1 {
			font-size: clamp(28px, 11.5vw, 64px);
			white-space: normal;
		}

		.social-nav {
			margin-top: 22px;
			gap: 12px;
		}

		.social-link {
			width: 58px;
			height: 58px;
		}

		.show-tag {
			height: 28px;
			padding: 0 9px;
			font-size: 12px;
		}

		section {
			max-width: none;
			margin-top: 40px;
			margin-left: 0;
			gap: 2rem;
		}

		section h2 {
			font-size: clamp(28px, 9vw, 52px);
			letter-spacing: -0.03em;
		}

		footer {
			margin-top: 2rem;
			padding-top: 10px;
		}
	}

	@media (max-width: 450px) {
		main {
			padding: 14px 14px env(safe-area-inset-bottom);
		}

		header h1 {
			font-size: clamp(24px, 10.5vw, 48px);
		}

		.social-nav {
			margin-top: 18px;
			gap: 10px;
		}

		.social-link {
			width: 50px;
			height: 50px;
		}
	}
</style>
