import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BackButton } from './BackButton';

export const metadata: Metadata = {
  title: 'Terms of Service | Starcyeed',
  description: 'Read the complete Terms of Service for Starcyeed. Learn about our policies, content guidelines, AI-generated content rules, and legal terms.',
  openGraph: {
    title: 'Terms of Service | Starcyeed',
    description: 'Read the complete Terms of Service for Starcyeed',
    type: 'website',
  },
};

function TermsContent() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-[rgba(230,247,255,0.92)]">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            STARCYEED Terms of Service
          </h1>
          <p className="text-cyan-300/80 text-lg">
            Effective Date: March 27, 2026
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
                <li>Use AI tools to generate child sexual abuse material (CSAM) or any depiction of minors in sexual or exploitative contexts. This is strictly prohibited and will result in immediate account termination and reporting to law enforcement.</li>
                <li>Use AI tools to generate content that infringes on the intellectual property rights of third parties, including but not limited to copyrighted characters, likenesses of real persons without consent, or trademarked material.</li>
                <li>Attempt to bypass the age verification gate or misrepresent your age.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. AI-Generated Content</h2>
              <p className="mb-2">
                STARCYEED provides AI-powered tools for image generation, video generation, 3D model creation,
                image analysis, and conversational AI. By using these tools, you acknowledge and agree to the following:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>User responsibility:</strong> You are solely responsible for all content you generate using our AI tools, including any prompts you submit and the resulting outputs. STARCYEED does not pre-screen or approve AI-generated outputs.</li>
                <li><strong>Mature content:</strong> AI tools on STARCYEED may produce explicit, mature, or NSFW (Not Safe For Work) content. Access to these tools requires age verification confirming you are 18 years of age or older.</li>
                <li><strong>No guarantee of accuracy:</strong> AI-generated content may be inaccurate, incomplete, biased, or offensive. STARCYEED makes no representations or warranties regarding the accuracy, reliability, or appropriateness of any AI-generated output.</li>
                <li><strong>No ownership by STARCYEED:</strong> STARCYEED does not claim ownership of content you generate using AI tools. However, you acknowledge that AI-generated content may not be eligible for copyright protection under applicable law.</li>
                <li><strong>Third-party AI providers:</strong> AI functionality is powered by third-party services including Anthropic (Claude) and Replicate. Your use of AI tools is also subject to the terms and policies of these providers. Prompts and inputs may be processed by these third parties.</li>
                <li><strong>Content retention:</strong> AI prompts and generated outputs may be retained for up to 90 days for safety monitoring, abuse prevention, and platform improvement. See our Privacy Policy for details.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. AI Content &mdash; Indemnification and Liability</h2>
              <p className="mb-2">
                You understand and agree that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>STARCYEED acts as a platform providing access to AI tools and is not the creator or publisher of AI-generated content produced by users.</li>
                <li>You shall indemnify and hold harmless STARCYEED from any claims, damages, or legal actions arising from content you generate, share, or distribute using our AI tools.</li>
                <li>STARCYEED is not liable for any harm, offense, legal consequences, or damages resulting from AI-generated content, including but not limited to defamation, intellectual property infringement, or emotional distress.</li>
                <li>You will not use AI-generated content for any purpose that is unlawful, harmful, or violates the rights of any third party.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. AI Content Safety and Moderation</h2>
              <p className="mb-2">
                STARCYEED implements safety measures for AI-generated content:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Age verification is required before accessing AI generation tools.</li>
                <li>We reserve the right to implement content filters, safety classifiers, or moderation systems at any time.</li>
                <li>We may review, remove, or restrict access to AI-generated content that violates these Terms, applicable law, or our content policies.</li>
                <li>We may report illegal content or activity to law enforcement authorities without notice to you.</li>
                <li>Repeated violations of content policies will result in suspension or permanent termination of your access to AI tools and/or your account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">9. DMCA and Copyright Takedown Procedures</h2>
              <p className="mb-2">
                STARCYEED respects the intellectual property rights of others and complies with the Digital Millennium Copyright Act (DMCA).
              </p>
              <p className="mb-2 font-semibold text-white">Filing a DMCA Takedown Notice:</p>
              <p className="mb-2">
                If you believe that content on STARCYEED &mdash; including AI-generated content &mdash; infringes your copyright, you may submit a DMCA takedown notice to our designated agent. Your notice must include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Identification of the copyrighted work you claim has been infringed.</li>
                <li>Identification of the infringing material and its location on STARCYEED (e.g., URL or description).</li>
                <li>Your contact information (name, address, phone number, email).</li>
                <li>A statement that you have a good faith belief that the use is not authorized by the copyright owner, its agent, or the law.</li>
                <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on behalf of the owner.</li>
                <li>Your physical or electronic signature.</li>
              </ul>
              <p className="mb-2 font-semibold text-white">Counter-Notification:</p>
              <p className="mb-2">
                If you believe your content was removed in error, you may file a counter-notification including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Identification of the removed material and its former location.</li>
                <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake or misidentification.</li>
                <li>Your name, address, phone number, and consent to jurisdiction of federal court in your district.</li>
                <li>Your physical or electronic signature.</li>
              </ul>
              <p className="mb-2 font-semibold text-white">Repeat Infringers:</p>
              <p>
                STARCYEED will terminate the accounts of users who are determined to be repeat copyright infringers in appropriate circumstances.
              </p>
              <p className="mt-3">
                DMCA notices and counter-notifications should be sent to: <strong className="text-cyan-300">dmca@starcyeed.com</strong>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">10. Platform Status and Safe Harbor (Section 230)</h2>
              <p className="mb-2">
                STARCYEED operates as an interactive computer service platform under Section 230 of the Communications Decency Act (47 U.S.C. &sect; 230). You acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>STARCYEED is a provider of interactive computer services and is not the information content provider of user-generated or user-prompted AI-generated content.</li>
                <li>Content created, uploaded, or generated by users through our platform &mdash; including through AI tools &mdash; is the sole responsibility of the user who created or prompted it.</li>
                <li>STARCYEED&apos;s provision of AI tools does not make STARCYEED the creator or publisher of the resulting content. Users provide the creative direction through their prompts and inputs.</li>
                <li>Any good faith efforts by STARCYEED to moderate, filter, or restrict content shall not be construed as STARCYEED assuming the role of publisher or speaker of that content.</li>
                <li>STARCYEED shall not be treated as the publisher or speaker of any information provided by another information content provider, to the fullest extent permitted by law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">11. Indemnification</h2>
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
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">12. Disclaimer of Warranties</h2>
              <p>
                STARCYEED is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or
                implied, including fitness for a particular purpose or non-infringement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">13. Limitation of Liability</h2>
              <p>
                STARCYEED shall not be liable for any direct, indirect, incidental, consequential, or punitive
                damages arising from your use of the platform or any content exchanged therein.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">14. Privacy</h2>
              <p>
                Your use of STARCYEED is also governed by our Privacy Policy. Please review it to understand
                how we collect and use your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">15. Termination</h2>
              <p>
                STARCYEED reserves the right to suspend or terminate your account at any time for violation of
                these Terms or for any reason deemed necessary.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">16. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the United States of America. Any disputes shall be
                resolved in the courts of United States of America.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">17. Changes to Terms</h2>
              <p>
                STARCYEED may update these Terms at any time. Continued use of the platform after changes
                constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">18. Acceptance</h2>
              <p>
                By checking the box and creating an account, you confirm that you have read, understood, and
                agree to these Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">19. Contact</h2>
              <p>
                If you have any questions about these Terms of Service, DMCA requests, or any other inquiries,
                please contact us at:
              </p>
              <p className="mt-3">
                <strong className="text-cyan-300">Email:</strong>{' '}
                <a href="mailto:starcyeed@gmail.com" className="text-cyan-400 hover:text-cyan-300 underline">starcyeed@gmail.com</a>
              </p>
            </section>
          </div>

          {/* Back Button */}
          <div className="pt-8 border-t border-cyan-500/20">
            <Suspense
              fallback={
                <a
                  href="/"
                  className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-105"
                >
                  Back to Home
                </a>
              }
            >
              <BackButton />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TermsPage() {
  return <TermsContent />;
}
