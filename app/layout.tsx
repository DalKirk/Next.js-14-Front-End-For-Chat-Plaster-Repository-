import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const inter = Inter({ subsets: ['latin'] });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e1b4b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#1e1b4b" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bitcount+Prop+Double+Ink:wght@100..900&family=Bungee&display=swap" rel="stylesheet" />
      </head>
      <body 
        className={inter.className}
        style={{
          backgroundColor: 'oklch(25.7% 0.09 281.288)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <Providers>
          <div 
            className="min-h-screen"
            style={{
              background: `linear-gradient(135deg, 
                oklch(25.7% 0.09 281.288) 0%, 
                oklch(22% 0.110 286) 25%, 
                oklch(29% 0.115 276) 50%, 
                oklch(24% 0.095 291) 75%, 
                oklch(25.7% 0.09 281.288) 100%)`,
              backgroundSize: '200% 200%',
              animation: 'gradientShift 15s ease infinite'
            }}
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </Providers>
      </body>
    </html>
  );
}