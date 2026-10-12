import { z } from 'zod';

export const bookingSchema = z
	.object({
		name: z.string().min(1, 'Name is required'),
		pronouns: z.string().min(1, 'Pronouns are required'),
		paymentHandle: z.string().min(1, 'Payment handle is required'),
		// Radios POST as "true"/"false" strings, but Svelte bind:group keeps booleans client-side.
		wantsToDefend: z
			.union([z.boolean(), z.enum(['true', 'false'])])
			.transform((v) => v === true || v === 'true'),
		claimDescription: z.string().optional()
	})
	.superRefine((data, ctx) => {
		if (data.wantsToDefend && !data.claimDescription?.trim()) {
			ctx.addIssue({
				code: 'custom',
				message: 'Claim description is required when defending a claim',
				path: ['claimDescription']
			});
		}
	});

export type BookingSchema = z.infer<typeof bookingSchema>;

export const applicationSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	instagram: z.string().min(1, 'Instagram handle is required'),
	disciplines: z.string().optional(),
	notes: z.string().optional()
});

export type ApplicationSchema = z.infer<typeof applicationSchema>;

/**
 * The /apply form that is not tied to any one show.
 *
 * Only a name is required. Every other field is optional, including Instagram,
 * because people apply with wildly varying amounts of information and we would
 * rather store a sparse row than lose the application entirely.
 *
 * Handles and emails are trimmed but not format-checked: a handle we cannot
 * parse is still worth keeping, and rejecting a real address over a missing @ in
 * a nickname loses the applicant.
 */
export const generalApplicationSchema = z.object({
	name: z.string().trim().min(1, 'Name is required'),
	basedIn: z.string().trim().max(200).optional(),
	freeDates: z.string().trim().max(1000).optional(),
	instagram: z.string().trim().max(200).optional(),
	email: z.string().trim().max(320).optional(),
	tiktok: z.string().trim().max(200).optional(),
	twitter: z.string().trim().max(200).optional(),
	bestContact: z.string().trim().max(500).optional(),
	notes: z.string().trim().max(5000).optional()
});

export type GeneralApplicationSchema = z.infer<typeof generalApplicationSchema>;

/** Trimmed value, or null when the field was left blank. */
export function optionalField(value: string | undefined): string | null {
	const trimmed = (value ?? '').trim();
	return trimmed === '' ? null : trimmed;
}
