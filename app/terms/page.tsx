'use client';

import type { Metadata } from 'next';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function TermsContent() {
  const searchParams = useSearchParams();
  const fromSignup = searchParams.get('from') === 'signup';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-[rgba(230,247,255,0.92)]">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            STARCYEED Terms of Service
          </h1>
          <p className="text-cyan-300/80 text-lg">
            Effective Date: January 1, 2026
          </p>
        </div>

        {/* Content */}
        <div className="glass-card p-8 md:p-12 space-y-8">
          <div className="text-[rgba(230,247,255,0.92)] space-y-6">
            <p className="text-lg">
              Welcome to STARCYEED! By creating an account or using our platform, you agree to comply
              with and be bound by the following Terms of Service. Please read them carefully.
            </p>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using STARCYEED, you confirm that you have read, understood, and agree to
                these Terms of Service. If you do not agree, you must not use the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Eligibility</h2>
              <p>
                You must be at least 18 years old or the age of majority in your jurisdiction to create an account
                and use STARCYEED.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. User Responsibilities</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You are solely responsible for all content you create, share, or distribute on STARCYEED.</li>
                <li>You agree not to engage in illegal, harmful, or abusive behavior on or off the platform
                    related to your use of STARCYEED.</li>
                <li>You must maintain the confidentiality of your account credentials.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Content Ownership and License</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You retain ownership of the content you post.</li>
                <li>By posting content, you grant STARCYEED a non-exclusive, worldwide, royalty-free
                    license to use, display, and distribute your content for platform functionality.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Prohibited Conduct</h2>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Post unlawful, defamatory, obscene, or infringing content.</li>
                <li>Harass, threaten, or harm other users.</li>
                <li>Use STARCYEED for commercial solicitation or spam.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. Indemnification</h2>
              <p className="mb-2">
                You agree to indemnify, defend, and hold harmless STARCYEED, its affiliates, officers,
                employees, and agents from any claims, damages, liabilities, costs, and expenses (including
                legal fees) arising from:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your use of STARCYEED.</li>
                <li>Your violation of these Terms or applicable laws.</li>
                <li>Any interaction or dispute between you and other users, on or off the platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. Disclaimer of Warranties</h2>
              <p>
                STARCYEED is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or
                implied, including fitness for a particular purpose or non-infringement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. Limitation of Liability</h2>
              <p>
                STARCYEED shall not be liable for any direct, indirect, incidental, consequential, or punitive
                damages arising from your use of the platform or any content exchanged therein.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">9. Privacy</h2>
              <p>
                Your use of STARCYEED is also governed by our Privacy Policy. Please review it to understand
                how we collect and use your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">10. Termination</h2>
              <p>
                STARCYEED reserves the right to suspend or terminate your account at any time for violation of
                these Terms or for any reason deemed necessary.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">11. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the United States of America. Any disputes shall be
                resolved in the courts of United States of America.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">12. Changes to Terms</h2>
              <p>
                STARCYEED may update these Terms at any time. Continued use of the platform after changes
                constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">13. Acceptance</h2>
              <p>
                By checking the box and creating an account, you confirm that you have read, understood, and
                agree to these Terms of Service.
              </p>
            </section>
          </div>

          {/* Back Button */}
          <div className="pt-8 border-t border-cyan-500/20">
            {fromSignup ? (
              <button
                onClick={() => window.history.back()}
                className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-105"
              >
                Back to Sign Up
              </button>
            ) : (
              <a
                href="/"
                className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-105"
              >
                Back to Home
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black flex items-center justify-center">
        <div className="text-cyan-300">Loading...</div>
      </div>
    }>
      <TermsContent />
    </Suspense>
  );
}
