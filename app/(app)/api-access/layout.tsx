import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API',
  description: 'Starcyeed API — access AI image generation, video generation, 3D modeling, and more through our developer API.',
  alternates: {
    canonical: '/api-access',
  },
};

export default function ApiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
