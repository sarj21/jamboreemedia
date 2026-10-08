<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import type { ActionData, PageData } from './$types';
	import { bookingSchema } from '$lib/schema';
	import { metaTags } from '$lib/seo';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Read the error off the action result so it survives a no-JS submit,
	// where onResult never fires. applyAction keeps this in sync when hydrated.
	const { form: formData, enhance, errors, constraints } = superForm(data.form, {
		validators: zod4Client(bookingSchema)
	});
</script>

<svelte:head>
	<title>Book a spot — Jamboree Media</title>
	{#each metaTags({
		title: `Book your spot — Jamboree (${data.date})`,
		description: `Sign up for the Jamboree comedy show on ${data.date} in ${data.city}. Submit your details and an optional hot take to defend, then join the circle and attack everyone else's claims.`
	}) as { attr, key, content }}
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
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<span class="show-tag" style={`--city-color: ${data.cityColor}`}>
				{data.city}
			</span>
		</div>
		<h1
			class="brand-title m-0 w-full max-w-full overflow-hidden text-[clamp(24px,4.6vw,68px)] leading-[0.85] font-normal tracking-[-0.045em] whitespace-nowrap uppercase text-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
		>
			Booking for {data.date}
		</h1>
		<p class="mt-3 text-lg font-bold text-white/90">
			@ {data.venue}
		</p>
	</header>

	<section
		class="relative z-[3] mx-auto mt-[clamp(24px,4vh,48px)] flex w-full max-w-[600px] flex-col gap-[clamp(20px,3vh,36px)]"
	>
		<!-- Rules callout -->
		<div class="border-l-4 border-[var(--yellow)] bg-white/5 p-5">
			<p class="m-0 mb-4 text-base font-bold text-[var(--yellow)]">
				Thank you for participating! Fill this out by <span class="underline">{data.dueBy}</span> at the
				latest.
			</p>

			<h2 class="m-0 mb-1 text-xs font-extrabold tracking-[2px] text-white/90 uppercase">
				Premise / Rules
			</h2>
			<p class="m-0 mb-3 text-sm leading-relaxed text-white/70">
				A direct rip off of Jubilee: Surrounded's format. Watch a Jubilee video or old Jamboree
				clips if you haven't seen one before. I recommend Charlie Kirk's episode from the real
				Jubilee heavily.
			</p>
			<p class="m-0 text-sm leading-relaxed text-white/70">
				7 people from the circle will be the "defenders" (the Charlie Kirk seat) who have a hot
				take, phrased as a claim, that everyone else in the circle is able to "attack". Attackers
				will take turns running to the middle, first person to the seat gets to debate. The audience
				and remaining circle have red flags. If half of the flags go up, the attacker goes back to
				the circle and we go again. Rinse and repeat for 7 minutes!
			</p>

			<h2 class="m-0 mt-4 mb-1 text-xs font-extrabold tracking-[2px] text-white/90 uppercase">
				Logistics
			</h2>
			<ul class="m-0 list-none p-0 text-sm leading-relaxed text-white/70">
				<li>
					<strong class="text-white/90">Call time:</strong>
					{data.callTime}. Try not to be late, I need to go through the rules and prep everyone!
				</li>
				<li><strong class="text-white/90">Door:</strong> {data.doorsTime}</li>
				<li><strong class="text-white/90">Show time:</strong> {data.stageTime}</li>
				<li>
					<strong class="text-white/90">Done by:</strong>
					{data.doneByTime}. After the show we do confessionals, so budget ~15 minutes for those if
					you can/want to be in those (especially defenders!).
				</li>
			</ul>
		</div>

		<form method="POST" use:enhance class="flex flex-col gap-[clamp(20px,3vh,36px)]">
			<!-- Name field -->
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
					class="w-full border-2 border-white/20 bg-black/30 px-4 py-3 text-lg text-white placeholder-white/40 transition-colors outline-none focus:border-[var(--yellow)]"
				/>
				{#if $errors.name}
					<p class="m-0 text-sm font-semibold text-[var(--red)]">{$errors.name}</p>
				{/if}
			</div>

			<!-- Pronouns field -->
			<div class="flex flex-col gap-2">
				<label for="pronouns" class="text-sm font-extrabold tracking-[2px] text-white/90 uppercase">
					Pronouns
				</label>
				<input
					type="text"
					id="pronouns"
					name="pronouns"
					bind:value={$formData.pronouns}
					{...$constraints.pronouns}
					placeholder="they/them"
					required
					class="w-full border-2 border-white/20 bg-black/30 px-4 py-3 text-lg text-white placeholder-white/40 transition-colors outline-none focus:border-[var(--yellow)]"
				/>
			</div>

			<!-- Payment handle field -->
			<div class="flex flex-col gap-2">
				<label
					for="paymentHandle"
					class="text-sm font-extrabold tracking-[2px] text-white/90 uppercase"
				>
					Venmo / CashApp / Zelle
				</label>
				<input
					type="text"
					id="paymentHandle"
					name="paymentHandle"
					bind:value={$formData.paymentHandle}
					{...$constraints.paymentHandle}
					placeholder="@your-handle"
					required
					class="w-full border-2 border-white/20 bg-black/30 px-4 py-3 text-lg text-white placeholder-white/40 transition-colors outline-none focus:border-[var(--yellow)]"
				/>
				{#if $errors.paymentHandle}
					<p class="m-0 text-sm font-semibold text-[var(--red)]">{$errors.paymentHandle}</p>
				{/if}
			</div>

			<!-- Defend a claim radio buttons -->
			<div class="flex flex-col gap-3">
				<span class="text-sm font-extrabold tracking-[2px] text-white/90 uppercase">
					Do you want to defend a claim?
				</span>
				<div class="flex flex-col gap-2">
					<label class="radio-label flex cursor-pointer items-center gap-3">
						<input
							type="radio"
							name="wantsToDefend"
							value={false}
							bind:group={$formData.wantsToDefend}
							class="radio-input"
						/>
						<span>No</span>
					</label>
					<p class="m-0 ml-8 text-sm text-white/60">If you don't want to defend that's fine!</p>
					<label class="radio-label flex cursor-pointer items-center gap-3">
						<input
							type="radio"
							name="wantsToDefend"
							value={true}
							bind:group={$formData.wantsToDefend}
							class="radio-input"
						/>
						<span>Yes</span>
					</label>
					<p class="m-0 ml-8 text-sm text-white/60">
						If you defend a claim, you still get to be in the rest of the show in the circle
						attacking!
					</p>
				</div>
			</div>

			<!-- Conditional claim description -->
			{#if $formData.wantsToDefend}
				<div class="flex flex-col gap-2">
					<label
						for="claimDescription"
						class="text-sm font-extrabold tracking-[2px] text-white/90 uppercase"
					>
						What is your claim?
					</label>
					<div
						class="border-2 border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-white/70"
					>
						<p class="m-0 mb-3">
							You only need to give one hot take but you can give multiple if you want! One of these
							(that I will pick) is going to be your "claim" so phrase it as a statement or belief,
							e.g. "my claim is: ____".
						</p>
						<p class="m-0 mb-3 font-bold text-white/90">Some tips for takes:</p>
						<ul class="m-0 mb-3 list-disc pl-5">
							<li>
								You should pick something really inflammatory, of course, even if you don't believe
								it. The point here is winning an argument and getting a clip.
							</li>
							<li>
								You should be willing to defend any of these statements for about seven (7) minutes
								so pick something that has a lot of avenues of debate and you can get into the weeds
								on. E.g. something simple like "Chick-fil-A is bad" doesn't give you a lot of room
								to argue.
							</li>
							<li>
								Remember you are arguing with mostly comics so takes like "everyone is kind of gay"
								are great but comics will probably mostly agree so really go out there with it.
							</li>
						</ul>
						<p class="m-0 mb-3 font-bold text-white/90">
							Examples of previous takes that worked well:
						</p>
						<ul class="m-0 mb-3 list-disc pl-5">
							<li>The bus should be free and everyone should have to take turns driving it</li>
							<li>There are no good movies before 1995</li>
							<li>I already lived through today and traveled back here from tomorrow</li>
							<li>2 + 2 = 5</li>
						</ul>
						<p class="m-0">
							Again only one (1) take is required, and not every person will be defending, but the
							more you submit the better! Feel free to submit again later if you think of more as
							well.
						</p>
					</div>
					<textarea
						id="claimDescription"
						name="claimDescription"
						bind:value={$formData.claimDescription}
						placeholder="My claim is: ____"
						rows="5"
						required
						class="w-full resize-y border-2 border-white/20 bg-black/30 px-4 py-3 text-lg text-white placeholder-white/40 transition-colors outline-none focus:border-[var(--yellow)]"
					></textarea>
					{#if $errors.claimDescription}
						<p class="m-0 text-sm font-semibold text-[var(--red)]">{$errors.claimDescription}</p>
					{/if}
				</div>
			{/if}

			<!-- Submit error -->
			{#if form?.submitError}
				<p
					class="m-0 border-2 border-[var(--red)] bg-[var(--red)]/20 px-4 py-3 text-sm font-semibold text-white"
				>
					{form?.submitError}
				</p>
			{/if}

			<!-- Submit button -->
			<button
				type="submit"
				class="group relative mt-2 flex items-center justify-between overflow-hidden bg-[var(--yellow)] px-8 py-4 text-[clamp(20px,3vw,28px)] leading-[0.8] font-extrabold tracking-[-0.04em] text-black uppercase transition-transform active:scale-[0.98]"
			>
				<span
					class="absolute inset-0 translate-y-full bg-[var(--red)] transition-transform duration-250 group-hover:translate-y-0"
				></span>
				<span class="relative z-[1] leading-[0.8]">Submit</span>
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
		box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.2);
	}

	.radio-input {
		appearance: none;
		-webkit-appearance: none;
		width: 22px;
		height: 22px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-radius: 50%;
		background: transparent;
		cursor: pointer;
		position: relative;
		flex-shrink: 0;
		transition:
			border-color 200ms ease,
			background 200ms ease;
	}

	.radio-input::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 10px;
		height: 10px;
		background: var(--yellow);
		border-radius: 50%;
		transform: translate(-50%, -50%) scale(0);
		transition: transform 200ms ease;
	}

	.radio-input:checked {
		border-color: var(--yellow);
	}

	.radio-input:checked::after {
		transform: translate(-50%, -50%) scale(1);
	}

	.radio-input:focus-visible {
		outline: 2px solid var(--yellow);
		outline-offset: 2px;
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
