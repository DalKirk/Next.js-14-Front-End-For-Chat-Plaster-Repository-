import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feed',
  description: 'See the latest posts and updates from the Starcyeed community.',
  alternates: {
    canonical: '/feed',
  },
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
