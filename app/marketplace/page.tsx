'use client';

import Image from 'next/image';
import { Roboto_Slab } from 'next/font/google';

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

export default function MarketplacePage() {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white p-4 xs:p-6 sm:p-8 ${robotoSlab.className}`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-12 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="relative w-32 h-32 xs:w-36 xs:h-36 sm:w-48 sm:h-48">
              <Image
                src="/StarCyeedLOGOTransparent.png"
                alt="StarCyeed Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          
          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent px-2">
            Welcome to Starcyeed Marketplace
          </h1>
          <a
            href="/"
            className="inline-block px-4 py-2 xs:px-6 xs:py-3 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
          >
            ← Back to Home
          </a>
        </div>

        {/* Product Card */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-4 xs:p-6 sm:p-8 rounded-2xl border border-gray-700 shadow-2xl">
          {/* Product Image */}
          <div className="relative w-full aspect-video mb-6 sm:mb-8 rounded-xl overflow-hidden border-2 border-yellow-500/30">
            <Image
              src="/wasteland-icons-gumroad.png"
              alt="Wasteland Icon Pack"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Product Info */}
          <div className="text-center">
            <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-yellow-400 px-2">
              Post-Apocalyptic Icon Pack
            </h2>
            <p className="text-sm xs:text-base sm:text-lg text-gray-300 mb-4 sm:mb-6 px-2">
              20 survival-themed icons in SVG + PNG formats (140 files total)
            </p>
            
            {/* Gumroad Button */}
            <a
              href="https://starcyeed.gumroad.com/l/qltex"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 xs:px-8 xs:py-3 sm:px-12 sm:py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-base xs:text-lg sm:text-xl font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-orange-500/50"
            >
              🛒 View on Gumroad
            </a>
            
            <p className="mt-3 sm:mt-4 text-xs xs:text-sm text-gray-400 px-2">
              Instant digital download • Commercial license included
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 sm:mt-12 text-center text-gray-400 px-2">
          <p className="text-sm xs:text-base">© 2025 StarCyeed Productions</p>
          <p className="mt-2 text-xs xs:text-sm">All icons designed for commercial and personal use</p>
        </div>
      </div>
    </div>
  );
}
