import { Inter, Orbitron } from 'next/font/google';
import '../globals.css';
import { Providers } from '../providers';
import Starfield from '@/components/Starfield';
import CanvasTrail from '@/components/CanvasTrail';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const inter = Inter({ subsets: ['latin'] });
const orbitron = Orbitron({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-orbitron'
});

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
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
          {/* Performant CSS starfield + canvas particle trail */}
          <Starfield />
          <CanvasTrail />
          <ErrorBoundary>
            <div className="relative z-10">
              {children}
            </div>
          </ErrorBoundary>
        </div>
      </Providers>
    </div>
  );
}
