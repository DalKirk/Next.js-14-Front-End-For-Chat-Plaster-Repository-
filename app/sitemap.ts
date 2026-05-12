import type { MetadataRoute } from 'next';

// Canonical origin — always HTTPS, no www, no trailing slash.
// This must match the URL Google sees as the final destination.
const CANONICAL = 'https://starcyeed.com';

export default function sitemap(): MetadataRoute.Sitemap {
	const now = new Date().toISOString();

	// Treat as production on any real deployment (Vercel, Railway, etc.)
	// Only skip full sitemap when running locally.
	const isLocal =
		(process.env.NEXT_PUBLIC_SITE_URL || '').includes('localhost') ||
		process.env.NODE_ENV !== 'production';

	if (isLocal) {
		return [{ url: CANONICAL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 }];
	}

	const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
		{ path: '/', priority: 1.0, changeFrequency: 'weekly' },
		{ path: '/chat', priority: 0.9, changeFrequency: 'daily' },
		{ path: '/games', priority: 0.8, changeFrequency: 'daily' },
		{ path: '/marketplace', priority: 0.7, changeFrequency: 'weekly' },
		{ path: '/workspace', priority: 0.6, changeFrequency: 'weekly' },
		{ path: '/terms', priority: 0.3, changeFrequency: 'monthly' },
		{ path: '/privacy', priority: 0.3, changeFrequency: 'monthly' },
		{ path: '/contact', priority: 0.3, changeFrequency: 'monthly' },
		{ path: '/api-access', priority: 0.5, changeFrequency: 'monthly' },
	];

	return pages.map((p) => ({
		url: `${CANONICAL}${p.path}`,
		lastModified: now,
		changeFrequency: p.changeFrequency,
		priority: p.priority,
	}));
}
