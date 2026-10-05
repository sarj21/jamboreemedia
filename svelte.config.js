import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		version: {
			// Poll for new deploys so already-open tabs pick them up instead of
			// running against a route manifest whose chunks no longer exist.
			// This unit is milliseconds.
			pollInterval: 60_000
		}
	}
};

export default config;