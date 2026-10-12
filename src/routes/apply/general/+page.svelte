<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import type { PageProps } from './$types';
	import { generalApplicationSchema } from '$lib/schema';
	import { metaTags } from '$lib/seo';

	let { data, form }: PageProps = $props();

	const {
		form: formData,
		enhance,
		errors,
		constraints
	} = superForm(data.form, {
		validators: zod4Client(generalApplicationSchema)
	});
</script>

<svelte:head>
	<title>Apply — Jamboree Media</title>
	{#each metaTags( { title: 'Apply to perform — Jamboree Media', description: 'Interested in performing on Jamboree? Tell us where you are based and when you are free, and we will reach out.' } ) as { attr, key, content }}
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
			<span aria-hidden="true">&larr;</span> Back to dates
		</a>
		<h1
			class="brand-title m-0 w-full max-w-full overflow-hidden text-[clamp(32px,6vw,68px)] leading-[0.85] font-normal tracking-[-0.045em] whitespace-nowrap uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
		>
			General
		</h1>
		<p class="mt-4 mb-0 max-w-[600px] text-lg leading-relaxed text-white/80">
			No dates open right now? Fill this in instead and we'll reach out when we have one that fits.
		</p>
	</header>

	<section
		class="relative z-[3] mx-auto mt-[clamp(24px,4vh,48px)] flex w-full max-w-[700px] flex-col gap-5"
	>
		<form method="POST" use:enhance class="flex flex-col gap-5">
			<!-- Only a name is required; everything else helps us place them. -->
			<div class="flex flex-col gap-2">
				<label for="name" class="lbl">Name</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$formData.name}
					{...$constraints.name}
					placeholder="Your name"
					required
					autocomplete="name"
					class="field"
				/>
				{#if $errors.name}
					<p class="err">{$errors.name}</p>
				{/if}
			</div>

			<div class="flex flex-col gap-2">
				<label for="basedIn" class="lbl">Where are you based?</label>
				<input
					type="text"
					id="basedIn"
					name="basedIn"
					bind:value={$formData.basedIn}
					{...$constraints.basedIn}
					placeholder="Brooklyn, NY"
					class="field"
				/>
				<p class="hint">Helps us know which cities we can put you on.</p>
			</div>

			<div class="flex flex-col gap-2">
				<label for="freeDates" class="lbl"
					>When are you free? <span class="optional">optional</span></label
				>
				<textarea
					id="freeDates"
					name="freeDates"
					bind:value={$formData.freeDates}
					{...$constraints.freeDates}
					rows="3"
					placeholder="Weeknights after 7pm, or any Saturday in December"
					class="field resize-y"></textarea>
				<p class="hint">
					If you have a tight schedule, what dates are you free. This will help me choose dates for
					new shows.
				</p>
			</div>

			<div class="grid gap-5 sm:grid-cols-2">
				<div class="flex flex-col gap-2">
					<label for="instagram" class="lbl">Instagram <span class="optional">optional</span></label
					>
					<input
						type="text"
						id="instagram"
						name="instagram"
						bind:value={$formData.instagram}
						{...$constraints.instagram}
						placeholder="@handle"
						autocapitalize="none"
						spellcheck="false"
						class="field"
					/>
				</div>

				<div class="flex flex-col gap-2">
					<label for="email" class="lbl">Email <span class="optional">optional</span></label>
					<input
						type="email"
						id="email"
						name="email"
						bind:value={$formData.email}
						{...$constraints.email}
						placeholder="you@example.com"
						autocomplete="email"
						class="field"
					/>
				</div>

				<div class="flex flex-col gap-2">
					<label for="tiktok" class="lbl">TikTok <span class="optional">optional</span></label>
					<input
						type="text"
						id="tiktok"
						name="tiktok"
						bind:value={$formData.tiktok}
						{...$constraints.tiktok}
						placeholder="@handle"
						autocapitalize="none"
						spellcheck="false"
						class="field"
					/>
				</div>

				<div class="flex flex-col gap-2">
					<label for="twitter" class="lbl">Twitter <span class="optional">optional</span></label>
					<input
						type="text"
						id="twitter"
						name="twitter"
						bind:value={$formData.twitter}
						{...$constraints.twitter}
						placeholder="@handle"
						autocapitalize="none"
						spellcheck="false"
						class="field"
					/>
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<label for="bestContact" class="lbl">
					Best way to reach you <span class="optional">optional</span>
				</label>
				<input
					type="text"
					id="bestContact"
					name="bestContact"
					bind:value={$formData.bestContact}
					{...$constraints.bestContact}
					placeholder="Text me on Signal, I'm bad at email"
					class="field"
				/>
				<p class="hint">Whatever is most reliable for you and quickest for us.</p>
			</div>

			<div class="flex flex-col gap-2">
				<label for="notes" class="lbl">Notes <span class="optional">optional</span></label>
				<textarea
					id="notes"
					name="notes"
					bind:value={$formData.notes}
					{...$constraints.notes}
					rows="4"
					placeholder="Set links, credits, anything that helps"
					class="field resize-y"></textarea>
			</div>

			{#if form?.submitError}
				<p class="err">{form.submitError}</p>
			{/if}

			<button
				type="submit"
				class="group relative flex items-center justify-between overflow-hidden bg-[var(--yellow)] px-6 py-4 text-[clamp(20px,3vw,28px)] leading-[0.8] font-extrabold tracking-[-0.04em] text-black uppercase active:scale-[0.98]"
			>
				<span
					class="absolute inset-0 translate-y-full bg-[var(--red)] transition-transform duration-250 group-hover:translate-y-0"
				></span>
				<span class="relative z-[1] leading-[0.8]">Send it</span>
				<span
					class="relative z-[1] flex translate-y-[-0.08em] items-center leading-none transition-transform duration-250 group-hover:translate-x-[10px]"
					>&rarr;</span
				>
			</button>
		</form>
	</section>
</main>

<style>
	.lbl {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.9);
	}

	.optional {
		color: rgba(255, 255, 255, 0.4);
		font-weight: 700;
	}

	.hint {
		margin: 0;
		font-size: 12px;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.55);
	}

	.err {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--red);
	}

	.field {
		width: 100%;
		border: 2px solid rgba(255, 255, 255, 0.2);
		background: rgba(0, 0, 0, 0.3);
		padding: 12px 14px;
		color: #fff;
		font-size: 1.05rem;
		outline: none;
		transition: border-color 150ms ease;
	}

	.field::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.field:focus {
		border-color: var(--yellow);
	}

	@media (max-width: 700px) {
		main {
			padding: 20px 20px env(safe-area-inset-bottom);
		}

		header h1 {
			font-size: clamp(28px, 9vw, 56px);
			white-space: normal;
		}

		.field {
			/* 16px avoids iOS Safari zooming when a field is focused. */
			font-size: 16px;
			padding: 14px;
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
