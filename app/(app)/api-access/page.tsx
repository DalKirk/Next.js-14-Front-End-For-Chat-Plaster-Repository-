'use client';

import Link from 'next/link';
import { Code2, ImageIcon, Video, Box, MessageSquare, Zap } from 'lucide-react';

const endpoints = [
  { icon: ImageIcon, name: 'Image Generation', description: 'Generate images from text prompts using AI models.' },
  { icon: Video, name: 'Video Generation', description: 'Create short video clips from text or image inputs.' },
  { icon: Box, name: '3D Model Generation', description: 'Convert images into 3D models and assets.' },
  { icon: MessageSquare, name: 'AI Chat', description: 'Conversational AI for text generation and assistance.' },
  { icon: Zap, name: 'Image Analysis', description: 'Analyze and describe images using computer vision.' },
];

export default function ApiAccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-[rgba(230,247,255,0.92)]">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.3)]">
              <Code2 className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Starcyeed API
          </h1>
          <p className="text-cyan-300/80 text-lg max-w-2xl mx-auto">
            Integrate AI-powered image, video, and 3D generation into your own applications.
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="glass-card p-8 rounded-xl text-center mb-10" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-wider mb-4" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
            COMING SOON
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">API Access for Developers</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xl mx-auto">
            We&apos;re building a developer API so you can bring Starcyeed&apos;s AI tools into your own projects.
            Pricing and documentation will be available here once the API launches.
          </p>
        </div>

        {/* Planned Endpoints */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-white mb-5">Planned Endpoints</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {endpoints.map((ep) => (
              <div key={ep.name} className="glass-card p-5 rounded-xl flex items-start gap-4" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <ep.icon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{ep.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{ep.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interest CTA */}
        <div className="glass-card p-8 rounded-xl text-center" style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
          <h3 className="text-lg font-semibold text-white mb-2">Interested in API access?</h3>
          <p className="text-sm text-slate-400 mb-5">
            Reach out and we&apos;ll notify you when the API is available.
          </p>
          <a
            href="mailto:starcyeed@gmail.com?subject=API%20Access%20Interest"
            className="inline-block px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}
          >
            Contact Us
          </a>
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
