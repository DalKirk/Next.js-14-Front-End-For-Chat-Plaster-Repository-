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
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 focus:ring-primary-500 shadow-lg shadow-primary-500/30',
    secondary: 'bg-surface text-text-primary hover:bg-surface-light focus:ring-primary-400 border border-primary-400/30',
    danger: 'bg-gradient-to-r from-status-error to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-status-error',
    ghost: 'text-text-primary hover:bg-surface-hover focus:ring-primary-400/30',
    glass: 'bg-surface/50 backdrop-blur-md border border-primary-400/30 text-text-primary hover:bg-surface-light hover:border-primary-500/40 focus:ring-primary-400/40',
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