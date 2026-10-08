<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { applicationSchema } from '$lib/schema';
	import { metaTags } from '$lib/seo';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Read the error off the action result so it survives a no-JS submit,
	// where onResult never fires. applyAction keeps this in sync when hydrated.
	const { form: formData, enhance, errors, constraints } = superForm(data.form, {
		validators: zod4Client(applicationSchema)
	});
</script>

<svelte:head>
	<title>Apply — {data.city} — Jamboree Media</title>
	{#each metaTags( { title: `Apply to perform \u2014 Jamboree (${data.city})`, description: `Interested in performing on Jamboree in ${data.city} on ${data.date}? Send us your name and Instagram and we'll be in touch.` } ) as { attr, key, content }}
		<meta {...{ [attr]: key, content }} />
	{/each}
</svelte:head>

<main
	class="page flex min-h-dvh w-full flex-col px-[35px] py-[25px] text-white"
	style="background: #07213a;"
>
	<header class="relative z-[2] w-full">
		<a
			href="/apply"
			class="mb-6 inline-flex items-center gap-2 text-sm font-bold tracking-[2px] text-white/70 uppercase transition-colors hover:text-[var(--yellow)]"
		>
			<span aria-hidden="true">&larr;</span> All shows
		</a>
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<span class="show-tag" style={`--city-color: ${data.cityColor}`}>{data.city}</span>
		</div>
		<h1
			class="brand-title m-0 w-full max-w-full overflow-hidden text-[clamp(30px,6vw,64px)] leading-[0.85] font-normal tracking-[-0.045em] uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
		>
			Apply
		</h1>
		<p class="mt-3 mb-0 text-lg font-bold text-white/90">{data.venue}</p>
		<p class="mt-1 mb-0 text-sm text-white/70">
			{data.date} &middot; Doors {data.doors} &middot; Show {data.stage}
		</p>
	</header>

	<section class="relative z-[3] mx-auto mt-[clamp(24px,4vh,48px)] flex w-full max-w-[600px] flex-col gap-[clamp(20px,3vh,36px)]">
		{#if data.notes}
			<div class="border-l-4 border-[var(--yellow)] bg-white/5 p-5">
				<p class="m-0 text-sm leading-relaxed text-white/70">{data.notes}</p>
			</div>
		{/if}

		<form method="POST" use:enhance class="flex flex-col gap-[clamp(20px,3vh,36px)]">
			<div class="flex flex-col gap-2">
				<label for="name" class="text-sm font-extrabold tracking-[2px] text-white/90 uppercase">
					Name
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$formData.name}
					{...$constraints.name}
					placeholder="Your name"
					required
					autocomplete="name"
					class="w-full border-2 border-white/20 bg-black/30 px-4 py-3 text-lg text-white placeholder-white/40 transition-colors outline-none focus:border-[var(--yellow)]"
				/>
				{#if $errors.name}
					<p class="m-0 text-sm font-semibold text-[var(--red)]">{$errors.name}</p>
				{/if}
			</div>

			<div class="flex flex-col gap-2">
				<label for="instagram" class="text-sm font-extrabold tracking-[2px] text-white/90 uppercase">
					Instagram
				</label>
				<input
					type="text"
					id="instagram"
					name="instagram"
					bind:value={$formData.instagram}
					{...$constraints.instagram}
					placeholder="@yourhandle"
					required
					autocomplete="off"
					class="w-full border-2 border-white/20 bg-black/30 px-4 py-3 text-lg text-white placeholder-white/40 transition-colors outline-none focus:border-[var(--yellow)]"
				/>
				{#if $errors.instagram}
					<p class="m-0 text-sm font-semibold text-[var(--red)]">{$errors.instagram}</p>
				{/if}
			</div>

			<!-- Disciplines (optional) -->
			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-2">
					<label
						for="disciplines"
						class="text-sm font-extrabold tracking-[2px] text-white/90 uppercase"
					>
						Disciplines
					</label>
					<span class="optional-tag">Optional</span>
				</div>
				<input
					type="text"
					id="disciplines"
					name="disciplines"
					bind:value={$formData.disciplines}
					{...$constraints.disciplines}
					placeholder="What do you do? standup, sketch, clown, improv, other?"
					class="w-full border-2 border-white/20 bg-black/30 px-4 py-3 text-lg text-white placeholder-white/40 transition-colors outline-none focus:border-[var(--yellow)]"
				/>
			</div>

			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-2">
					<label
						for="notes"
						class="text-sm font-extrabold tracking-[2px] text-white/90 uppercase"
					>
						Anything else we should know?
					</label>
					<span class="optional-tag">Optional</span>
				</div>
				<textarea
					id="notes"
					name="notes"
					bind:value={$formData.notes}
					{...$constraints.notes}
					placeholder="Links, sets you've done, anything that helps us get a sense of you. Totally optional."
					rows="5"
					class="w-full resize-y border-2 border-white/20 bg-black/30 px-4 py-3 text-lg text-white placeholder-white/40 transition-colors outline-none focus:border-[var(--yellow)]"
				></textarea>
			</div>

			{#if form?.submitError}
				<p class="m-0 border-2 border-[var(--red)] bg-[var(--red)]/20 px-4 py-3 text-sm font-semibold">
					{form?.submitError}
				</p>
			{/if}

			<button
				type="submit"
				class="group relative mt-2 flex items-center justify-between overflow-hidden bg-[var(--yellow)] px-8 py-4 text-[clamp(20px,3vw,28px)] leading-[0.8] font-extrabold tracking-[-0.04em] text-black uppercase transition-transform active:scale-[0.98]"
			>
				<span
					class="absolute inset-0 translate-y-full bg-[var(--red)] transition-transform duration-250 group-hover:translate-y-0"
				></span>
				<span class="relative z-[1] leading-[0.8]">Send</span>
				<span
					class="relative z-[1] flex translate-y-[-0.08em] items-center leading-none transition-transform duration-250 group-hover:translate-x-[10px]"
					>&rarr;</span
				>
			</button>
		</form>
	</section>
</main>

<style>
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
	}

	@media (max-width: 700px) {
		main {
			padding: 20px 20px env(safe-area-inset-bottom);
		}

		header h1 {
			font-size: clamp(26px, 8vw, 48px);
			white-space: normal;
		}
	}

	@media (max-width: 450px) {
		main {
			padding: 14px 14px env(safe-area-inset-bottom);
		}

		header h1 {
			font-size: clamp(22px, 7vw, 38px);
		}
	}
</style>