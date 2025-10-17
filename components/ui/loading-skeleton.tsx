import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({ className = '', lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-white/10 rounded mb-2 last:mb-0"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex mb-4 justify-start">
      <div className="max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl p-4 backdrop-blur-sm border border-white/20 bg-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-white/20 rounded w-20 animate-pulse" />
          <div className="h-3 bg-white/10 rounded w-12 animate-pulse" />
        </div>
        <LoadingSkeleton lines={2} />
      </div>
    </div>
  );
}