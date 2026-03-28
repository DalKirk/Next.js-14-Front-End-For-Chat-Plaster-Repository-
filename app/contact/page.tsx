'use client';

import Link from 'next/link';
import { Mail, Shield, HelpCircle } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-[rgba(230,247,255,0.92)]">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Contact Us
          </h1>
          <p className="text-cyan-300/80 text-lg">
            We&apos;re here to help. Reach out using any of the channels below.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {/* General Inquiries */}
          <div className="glass-card p-6 rounded-2xl text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-white">General Inquiries</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Questions about the platform, features, or your account.
            </p>
            <a
              href="mailto:starcyeed@gmail.com"
              className="inline-block text-cyan-400 hover:text-cyan-300 underline text-sm font-medium transition-colors"
            >
              starcyeed@gmail.com
            </a>
          </div>

          {/* DMCA */}
          <div className="glass-card p-6 rounded-2xl text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-white">DMCA &amp; Copyright</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Copyright takedown notices and counter-notifications.
            </p>
            <a
              href="mailto:dmca@starcyeed.com"
              className="inline-block text-cyan-400 hover:text-cyan-300 underline text-sm font-medium transition-colors"
            >
              dmca@starcyeed.com
            </a>
          </div>

          {/* Privacy */}
          <div className="glass-card p-6 rounded-2xl text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-white">Privacy &amp; Data</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Data rights requests, GDPR/CCPA inquiries, or privacy concerns.
            </p>
            <a
              href="mailto:starcyeed@gmail.com"
              className="inline-block text-cyan-400 hover:text-cyan-300 underline text-sm font-medium transition-colors"
            >
              starcyeed@gmail.com
            </a>
          </div>
        </div>

        {/* Additional Info */}
        <div className="glass-card p-8 md:p-12 space-y-6">
          <h2 className="text-2xl font-bold text-cyan-400">Before You Reach Out</h2>
          <ul className="space-y-3 text-slate-300 text-sm leading-relaxed">
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 mt-0.5">•</span>
              <span>
                <strong className="text-white">DMCA requests</strong> — Please include the copyrighted work,
                the infringing URL, and your contact details. See our{' '}
                <Link href="/terms" className="text-cyan-400 hover:text-cyan-300 underline">Terms of Service</Link>
                {' '}(Section 9) for full requirements.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 mt-0.5">•</span>
              <span>
                <strong className="text-white">Privacy/data requests</strong> — Include your username or account
                email so we can locate your records. See our{' '}
                <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">Privacy Policy</Link>
                {' '}for details on your rights.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 mt-0.5">•</span>
              <span>
                <strong className="text-white">Report abuse</strong> — If you encounter illegal content or behavior on
                the platform, email us immediately. Include screenshots or URLs where possible.
              </span>
            </li>
          </ul>
          <p className="text-xs text-slate-500 pt-4" style={{ borderTop: '1px solid rgba(6,182,212,0.1)' }}>
            We aim to respond to all inquiries within 48 hours. DMCA and abuse reports are prioritized.
          </p>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-105"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
