<script lang="ts">
	import '../app.css';

	import { beforeNavigate } from '$app/navigation';
	import { updated } from '$app/state';

	let { children } = $props();

	// If a new deploy landed while this tab was open, a client-side navigation
	// would fetch chunks that no longer exist. Force a full page load instead.
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) {
			location.href = to.url.href;
		}
	});
</script>

{@render children()}