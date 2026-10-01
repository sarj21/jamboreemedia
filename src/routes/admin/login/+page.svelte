<script lang="ts">
	let { form }: { form: { incorrect?: boolean } | null } = $props();
</script>

<svelte:head>
	<title>Admin Login - Jamboree Media</title>
</svelte:head>

<main
	class="page flex min-h-dvh w-full flex-col items-center justify-center px-[20px] py-[25px] text-white"
	style="background: #07213a;"
>
	<div class="flex w-full max-w-[380px] flex-col gap-6">
		<h1
			class="brand-title m-0 text-center text-[clamp(32px,8vw,56px)] leading-[0.85] font-normal tracking-[-0.045em] uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
		>
			Private
		</h1>

		<form method="POST" class="flex flex-col gap-4">
			<label for="password" class="text-sm font-extrabold tracking-[2px] text-white/90 uppercase">
				Password
			</label>
			<input
				type="password"
				id="password"
				name="password"
				autocomplete="current-password"
				required
				class="w-full border-2 border-white/20 bg-black/30 px-4 py-3 text-lg text-white transition-colors outline-none focus:border-[var(--yellow)]"
			/>

			{#if form?.incorrect}
				<p class="m-0 text-sm font-semibold text-[var(--red)]">Incorrect password</p>
			{/if}

			<button
				type="submit"
				class="group relative mt-1 flex items-center justify-between overflow-hidden bg-[var(--yellow)] px-6 py-3 text-xl leading-[0.8] font-extrabold tracking-[-0.04em] text-black uppercase transition-transform active:scale-[0.98]"
			>
				<span
					class="absolute inset-0 translate-y-full bg-[var(--red)] transition-transform duration-250 group-hover:translate-y-0"
				></span>
				<span class="relative z-[1] leading-[0.8]">Enter</span>
				<span
					class="relative z-[1] flex translate-y-[-0.08em] items-center leading-none transition-transform duration-250 group-hover:translate-x-[10px]"
					>&rarr;</span
				>
			</button>
		</form>

		<a href="/" class="text-center text-sm font-semibold text-white/60 hover:text-[var(--yellow)]">
			Back to site
		</a>
	</div>
</main>
