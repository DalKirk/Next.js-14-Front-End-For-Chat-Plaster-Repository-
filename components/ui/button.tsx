import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gradient-to-r from-[#FF9900] to-yellow-400 text-black font-semibold hover:from-[#FFB84D] hover:to-yellow-400 focus:ring-[#FF9900] shadow-[0_0_20px_rgba(255,153,0,0.4)] hover:shadow-[0_0_25px_rgba(255,153,0,0.6)]',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 focus:ring-red-500',
    ghost: 'text-white hover:bg-white/10 focus:ring-white/20',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 focus:ring-white/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}