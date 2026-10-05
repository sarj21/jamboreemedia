import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

let client: SupabaseClient | null = null;

/**
 * Built lazily rather than at module scope.
 *
 * A module-level throw can poison a warm serverless instance, so one bad init
 * turns every subsequent request routed to it into a 500. Deferring means the
 * error surfaces where we can handle it.
 */
export function getSupabase(): SupabaseClient {
	if (client) return client;

	const url = env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !serviceRoleKey) {
		throw new Error(
			'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
		);
	}

	client = createClient(url, serviceRoleKey);
	return client;
}