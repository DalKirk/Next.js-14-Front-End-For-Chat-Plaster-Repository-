import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white/80 mb-2">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20',
          'rounded-lg text-white placeholder-white/60',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
          'transition-all duration-200',
          error && 'border-red-500/50 focus:ring-red-500/50',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}