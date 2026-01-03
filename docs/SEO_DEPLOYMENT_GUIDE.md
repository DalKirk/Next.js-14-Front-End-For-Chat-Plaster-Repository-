# Production SEO & Crawling Setup

This project uses Next.js App Router metadata, robots, and sitemap to produce SEO- and X/Twitter-friendly pages.

## Required environment

Set your public site URL so canonical, robots, and sitemap point to the right domain.

- Env var: `NEXT_PUBLIC_SITE_URL`
- Example: `https://your-domain.com`
- Where used:
  - Global metadataBase (canonical and absolute OG URLs)
  - `robots.txt` Host & Sitemap
  - `sitemap.xml` URLs

## Steps

1. Add your domain to `.env.local` locally or to your hosting env (e.g., Vercel):

```
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

2. Build + start:

```
npm run build
npm run start
```

3. Verify endpoints:
- Robots: `/robots.txt` — should show Host/Sitemap pointing to your domain and disallow `/login`, `/signup`, `/profile`.
- Sitemap: `/sitemap.xml` — includes only public pages: `/`, `/chat`.

4. Page indexing policy:
- Public: Home, Chat — indexable.
- Auth/Profile: Login, Signup, Profile — `noindex` via page metadata and disallowed in robots.

## Social preview (X/Twitter)
- Global `openGraph` and `twitter` metadata are present; X still reads the legacy twitter:* meta tags.
- Optionally add your handle for attribution:
  - Set env var `NEXT_PUBLIC_TWITTER_HANDLE` (e.g., `starcyeed`). We auto-populate `twitter.site` and `twitter.creator`.
  - You can also include the `@` sign; we normalize it.

## Notes
- The header logo image is no longer preloaded to avoid console warnings; keep it above-the-fold if you want `priority` back.
- Avoid indexing `localhost`; only set `NEXT_PUBLIC_SITE_URL` to your production domain when deploying.
