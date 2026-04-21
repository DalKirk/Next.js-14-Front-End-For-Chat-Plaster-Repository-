'use client';

import { useSearchParams } from 'next/navigation';

export function BackButton() {
  const searchParams = useSearchParams();
  const fromSignup = searchParams.get('from') === 'signup';

  if (fromSignup) {
    return (
      <button
        onClick={() => window.history.back()}
        className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-105"
      >
        Back to Sign Up
      </button>
    );
  }

  return (
    <a
      href="/"
      className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-105"
    >
      Back to Home
    </a>
  );
}
