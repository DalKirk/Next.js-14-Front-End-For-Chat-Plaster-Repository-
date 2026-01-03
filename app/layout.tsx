import { Inter, Orbitron } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import SparkleBackground from '@/components/SparkleBackground';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const inter = Inter({ subsets: ['latin'] });
const orbitron = Orbitron({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-orbitron'
});

// Optional X/Twitter handle (set via NEXT_PUBLIC_TWITTER_HANDLE, e.g., "starcyeed")
const twitterHandle = process.env.NEXT_PUBLIC_TWITTER_HANDLE?.replace(/^@/, '');

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Starcyeed Video Chat',
    template: '%s | Starcyeed',
  },
  description: 'Realtime video chat with rooms, profiles, and avatar support.',
  openGraph: {
    type: 'website',
    siteName: 'Starcyeed',
    title: 'Starcyeed Video Chat',
    description: 'Realtime video chat with rooms, profiles, and avatar support.',
    url: '/',
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'Starcyeed' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starcyeed Video Chat',
    description: 'Realtime video chat with rooms, profiles, and avatar support.',
    images: ['/og-image.png'],
    site: twitterHandle ? `@${twitterHandle}` : undefined,
    creator: twitterHandle ? `@${twitterHandle}` : undefined,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon-simple.svg?v=simple-20241231', type: 'image/svg+xml' },
      { url: '/favicon-simple.ico?v=simple-20241231', sizes: 'any' },
      { url: '/favicon-simple-16.png?v=simple-20241231', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-simple-32.png?v=simple-20241231', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-simple-48.png?v=simple-20241231', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/favicon-simple.ico?v=simple-20241231',
    apple: [
      { url: '/favicon-simple-48.png?v=simple-20241231', sizes: '48x48', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,  // Prevent zoom on mobile
  userScalable: false,  // Disable user scaling to prevent keyboard zoom
  themeColor: '#1e1b4b',
  viewportFit: 'cover',  // Use safe area for notches
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
                <link rel="canonical" href={(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')} />
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      '@context': 'https://schema.org',
                      '@type': 'WebSite',
                      url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                      name: 'Starcyeed Video Chat',
                      potentialAction: {
                        '@type': 'SearchAction',
                        target: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/search?q={query}`,
                        'query-input': 'required name=query',
                      },
                    }),
                  }}
                />
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      '@context': 'https://schema.org',
                      '@type': 'Organization',
                      name: 'Starcyeed',
                      url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                      logo: '/og-image.png',
                    }),
                  }}
                />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#1e1b4b" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon-optimized.svg?v=2" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=2" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png?v=2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2" />
        <link rel="manifest" href="/site.webmanifest?v=2" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Bitcount+Prop+Double+Ink:wght@100..900&family=Bungee&display=swap" rel="stylesheet" />
      </head>
      <body 
        className={`${inter.className} ${orbitron.variable}`}
        style={{
          backgroundColor: 'transparent',
          backdropFilter: 'none'
        }}
      >
        <Providers>
          <div 
            className="min-h-screen relative"
            style={{
              background: 'transparent'
            }}
          >
            {/* Global sparkle backdrop behind all pages */}
            <SparkleBackground />
            <ErrorBoundary>
              <div className="relative z-10">
                {children}
              </div>
            </ErrorBoundary>
          </div>
        </Providers>
      </body>
    </html>
  );
}