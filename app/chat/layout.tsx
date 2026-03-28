import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat Rooms',
  description: 'Browse and join live video chat rooms on Starcyeed.',
  alternates: {
    canonical: '/chat',
  },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
