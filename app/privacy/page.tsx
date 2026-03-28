'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function PrivacyContent() {
  const searchParams = useSearchParams();
  const fromSignup = searchParams.get('from') === 'signup';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-[rgba(230,247,255,0.92)]">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            STARCYEED Privacy Policy
          </h1>
          <p className="text-cyan-300/80 text-lg">
            Effective Date: January 1, 2026
          </p>
        </div>

        {/* Content */}
        <div className="glass-card p-8 md:p-12 space-y-8">
          <div className="text-[rgba(230,247,255,0.92)] space-y-6">
            <p className="text-lg">
              STARCYEED (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy. This Privacy Policy explains
              what information we collect, how we use it, and your rights regarding your data.
            </p>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Information We Collect</h2>
              <h3 className="text-lg font-semibold text-white mb-2">Account Information</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Username, email address, and password (hashed, never stored in plaintext).</li>
                <li>Profile information you provide, such as avatars and bio text.</li>
              </ul>
              <h3 className="text-lg font-semibold text-white mb-2">Usage Data</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Pages visited, features used, and interaction patterns.</li>
                <li>Device type, browser, IP address, and approximate location.</li>
                <li>Chat messages and room participation data.</li>
              </ul>
              <h3 className="text-lg font-semibold text-white mb-2">AI-Generated Content</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Text prompts you submit to our AI image, video, and text generation tools.</li>
                <li>The generated outputs (images, videos, 3D models, text).</li>
                <li>We may retain prompts and outputs for abuse prevention and service improvement.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>To provide, maintain, and improve STARCYEED&apos;s features and services.</li>
                <li>To authenticate your identity and secure your account.</li>
                <li>To process AI generation requests and deliver outputs.</li>
                <li>To moderate content and enforce our Terms of Service.</li>
                <li>To communicate service updates or respond to support requests.</li>
                <li>To detect and prevent fraud, abuse, or violations of our policies.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. AI-Generated Content &amp; Adult Material</h2>
              <p className="mb-3">
                STARCYEED provides AI-powered tools for generating images, videos, and other media.
                You should be aware of the following:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">AI outputs may include explicit or adult content.</strong>{' '}
                  The AI generation models available on this platform are capable of producing content
                  that may be sexually explicit, graphic, or otherwise intended for mature audiences.
                </li>
                <li>
                  <strong className="text-white">You must be 18 or older</strong> to use STARCYEED and its
                  AI generation features. By using these tools, you confirm you are of legal age in your
                  jurisdiction.
                </li>
                <li>
                  <strong className="text-white">You are solely responsible</strong> for the prompts you submit
                  and the content you generate, download, share, or distribute.
                </li>
                <li>
                  <strong className="text-white">Prohibited content:</strong> You may not use AI tools to generate
                  content depicting minors in any sexual or exploitative context, non-consensual scenarios
                  involving real people, or any content that violates applicable law. Violations will result
                  in immediate account termination and may be reported to law enforcement.
                </li>
                <li>
                  We reserve the right to monitor, review, and remove AI-generated content that violates
                  our policies.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Data Sharing &amp; Third Parties</h2>
              <p className="mb-3">We do not sell your personal data. We may share information with:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">AI service providers</strong> (e.g., Anthropic, Replicate) to
                  process your generation requests. Your prompts are sent to these providers to generate
                  outputs. Refer to their privacy policies for how they handle data.
                </li>
                <li>
                  <strong className="text-white">Hosting and infrastructure providers</strong> (e.g., Vercel,
                  Railway, BunnyCDN) that store and deliver platform content.
                </li>
                <li>
                  <strong className="text-white">Law enforcement</strong> if required by law or to protect the
                  safety of users or the public.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Data Storage &amp; Security</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Passwords are hashed using bcrypt and never stored in plaintext.</li>
                <li>Data is transmitted over HTTPS/TLS encryption.</li>
                <li>We use industry-standard security measures, but no system is 100% secure. Use
                    STARCYEED at your own risk.</li>
                <li>Uploaded files and AI-generated content are stored on encrypted cloud infrastructure.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. Data Retention</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Account data is retained as long as your account is active.</li>
                <li>If you delete your account, we will remove your personal data within 30 days,
                    except where retention is required by law.</li>
                <li>AI generation prompts and outputs may be retained for up to 90 days for abuse
                    prevention purposes, after which they are deleted.</li>
                <li>Anonymized, aggregated data may be retained indefinitely for analytics.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. Your Rights</h2>
              <p className="mb-3">Depending on your jurisdiction, you may have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Access</strong> the personal data we hold about you.</li>
                <li><strong className="text-white">Correct</strong> inaccurate or incomplete data.</li>
                <li><strong className="text-white">Delete</strong> your account and associated data.</li>
                <li><strong className="text-white">Export</strong> your data in a portable format.</li>
                <li><strong className="text-white">Withdraw consent</strong> for data processing where consent
                    is the legal basis.</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, contact us at the email listed below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. Cookies &amp; Local Storage</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>We use browser localStorage to store your authentication token, user preferences,
                    and session data.</li>
                <li>We do not use third-party tracking cookies.</li>
                <li>Essential cookies may be used for platform functionality.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">9. Children&apos;s Privacy</h2>
              <p>
                STARCYEED is not intended for anyone under the age of 18. We do not knowingly collect
                personal information from minors. If we become aware that a user is under 18, we will
                terminate their account and delete associated data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy at any time. Changes will be posted on this page with
                an updated effective date. Continued use of STARCYEED after changes constitutes
                acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">11. Contact</h2>
              <p>
                If you have questions about this Privacy Policy or wish to exercise your data rights,
                please contact us through the platform or at the contact information provided on our website.
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

export default function PrivacyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PrivacyContent />
    </Suspense>
  );
}
