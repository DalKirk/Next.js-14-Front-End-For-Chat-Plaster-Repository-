import ImageAnalyzer from '../../components/ImageAnalyzer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ImageAnalysisPage() {
  return (
    <div className="relative">
      <Link 
        href="/"
        className="fixed top-3 left-3 md:top-6 md:left-6 z-50 flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 text-sm md:text-base bg-zinc-900 border border-zinc-800 text-white rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-[#ff9900] hover:shadow-[0_0_20px_rgba(255,153,0,0.3)] transition-all"
      >
        <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
        <span className="hidden sm:inline">Back to Home</span>
        <span className="sm:hidden">Back</span>
      </Link>
      <ImageAnalyzer />
    </div>
  );
}
