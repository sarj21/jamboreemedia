<script lang="ts">
	let { data }: { data: { date: string; city: string } } = $props();
</script>

<svelte:head>
	<title>Application received — Jamboree Media</title>
</svelte:head>

<main
	class="page flex min-h-dvh w-full flex-col items-center justify-center px-[35px] py-[25px] text-white"
	style="background: #07213a;"
>
	<div class="flex max-w-[600px] flex-col items-center gap-6 text-center">
		<h1
			class="brand-title m-0 text-[clamp(36px,7vw,96px)] leading-[0.85] font-normal tracking-[-0.045em] whitespace-nowrap uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
		>
			Sent!
		</h1>

		<p class="m-0 text-xl text-white/80">
			Your application for <strong class="text-[var(--yellow)]">{data.city}</strong> is in. We'll reach out
			on Instagram if there's a spot.
		</p>

		<a
			href="/apply"
			class="text-sm font-bold tracking-[2px] text-white/70 uppercase transition-colors hover:text-[var(--yellow)]"
		>
			Apply to another show
		</a>
	</div>
</main>

<style>
	@media (max-width: 700px) {
		main {
			padding: 20px 20px env(safe-area-inset-bottom);
		}

		h1 {
			font-size: clamp(28px, 9vw, 56px);
			white-space: normal;
		}
	}

	@media (max-width: 450px) {
		main {
			padding: 14px 14px env(safe-area-inset-bottom);
		}

		h1 {
			font-size: clamp(24px, 8vw, 44px);
		}
	}
</style>