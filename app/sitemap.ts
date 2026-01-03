import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
	const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
	const now = new Date().toISOString();
	const isProd = process.env.VERCEL_ENV === 'production';
	const pages = isProd ? ['/', '/chat'] : ['/'];

	return pages.map((p) => ({
		url: `${base}${p}`,
		lastModified: now,
		changeFrequency: 'weekly',
		priority: p === '/' ? 1.0 : 0.8,
	}));
}
