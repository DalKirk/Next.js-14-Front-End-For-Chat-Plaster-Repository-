import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
	const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
	const now = new Date().toISOString();
	const isProd = process.env.VERCEL_ENV === 'production';

	if (!isProd) {
		return [{ url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 }];
	}

	const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
		{ path: '/', priority: 1.0, changeFrequency: 'weekly' },
		{ path: '/chat', priority: 0.9, changeFrequency: 'daily' },
		{ path: '/feed', priority: 0.8, changeFrequency: 'daily' },
		{ path: '/marketplace', priority: 0.7, changeFrequency: 'weekly' },
		{ path: '/terms', priority: 0.3, changeFrequency: 'monthly' },
	];

	return pages.map((p) => ({
		url: `${base}${p.path}`,
		lastModified: now,
		changeFrequency: p.changeFrequency,
		priority: p.priority,
	}));
}
