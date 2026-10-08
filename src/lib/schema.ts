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
