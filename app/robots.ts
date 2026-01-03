import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
	const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
	const isProd = process.env.VERCEL_ENV === 'production';
	return {
		rules: [
			isProd
				? {
						userAgent: '*',
						allow: '/',
						disallow: ['/login', '/signup', '/profile'],
					}
				: { userAgent: '*', allow: [], disallow: ['/'] },
		],
		sitemap: isProd ? `${base}/sitemap.xml` : undefined,
		host: isProd ? base : undefined,
	};
}
