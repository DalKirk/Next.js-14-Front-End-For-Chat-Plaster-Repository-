import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-6 mb-6">
          <div className="h-8 bg-white/10 rounded w-64 animate-pulse mb-4" />
          <div className="h-4 bg-white/10 rounded w-96 animate-pulse mb-6" />

          {/* Connection status skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="h-4 bg-white/10 rounded w-24 animate-pulse mb-2" />
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
                <div className="h-4 bg-white/10 rounded w-16 animate-pulse" />
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="h-4 bg-white/10 rounded w-28 animate-pulse mb-2" />
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
                <div className="h-4 bg-white/10 rounded w-20 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Messages skeleton */}
          <div className="bg-white/5 rounded-lg p-4">
            <div className="h-5 bg-white/10 rounded w-32 animate-pulse mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl p-4 backdrop-blur-sm border border-white/20 bg-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 bg-white/20 rounded w-20 animate-pulse" />
                      <div className="h-3 bg-white/10 rounded w-12 animate-pulse" />
                    </div>
                    <LoadingSkeleton lines={2} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}