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

export const metadata = {
  title: 'Starcyeed',
  description: 'Digital Innovation Platform',
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