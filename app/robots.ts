import type { MetadataRoute } from 'next';

const CANONICAL = 'https://starcyeed.com';

export default function robots(): MetadataRoute.Robots {
	const isLocal =
		(process.env.NEXT_PUBLIC_SITE_URL || '').includes('localhost') ||
		process.env.NODE_ENV !== 'production';

	if (isLocal) {
		// Block all crawlers in local/dev — never expose localhost to search engines
		return { rules: [{ userAgent: '*', disallow: ['/'] }] };
	}

	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: ['/login', '/signup', '/profile', '/workspace'],
			},
		],
		sitemap: `${CANONICAL}/sitemap.xml`,
		host: CANONICAL,
	};
}
