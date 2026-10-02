/**
 * Social/SEO meta tags.
 *
 * Open Graph tags must use `property=`, not `name=`. Slack, Facebook and iMessage
 * ignore `name="og:*"`, so the tag shape has to vary by prefix.
 */
export type Meta = {
	title: string;
	description: string;
	image?: string;
	imageWidth?: string;
	imageHeight?: string;
	type?: 'website' | 'article';
	url?: string;
};

const SITE_URL = 'https://jamboree.media';

/** Existing site art. The show photo is the strongest available share image. */
const DEFAULT_IMAGE = {
	path: '/img/background.png',
	width: '2160',
	height: '1597'
};

export function absoluteUrl(path: string): string {
	return path.startsWith('http') ? path : `${SITE_URL}${path}`;
}

export function metaTags({
	title,
	description,
	image = DEFAULT_IMAGE.path,
	imageWidth = DEFAULT_IMAGE.width,
	imageHeight = DEFAULT_IMAGE.height,
	type = 'website',
	url
}: Meta) {
	const imageUrl = absoluteUrl(image);

	const tags: Record<string, string> = {
		description: description,

		'og:site_name': 'Jamboree Media',
		'og:type': type,
		'og:title': title,
		'og:description': description,
		'og:url': url ? absoluteUrl(url) : SITE_URL,
		'og:image': imageUrl,
		'og:image:width': imageWidth,
		'og:image:height': imageHeight,
		// Without this, some clients render the dark photo as invisible-on-dark.
		'og:image:alt': 'The Jamboree comedy show circle',

		'twitter:card': 'summary_large_image',
		'twitter:title': title,
		'twitter:description': description,
		'twitter:image': imageUrl
	};

	return Object.entries(tags).map(([key, content]) => ({
		// `property` for Open Graph, `name` for everything else.
		attr: key.startsWith('og:') ? 'property' : 'name',
		key,
		content
	}));
}
