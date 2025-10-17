'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from './button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-white/70 mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
                className="w-full"
              >
                Refresh Page
              </Button>
              <Button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                variant="secondary"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-white/70 cursor-pointer">Error Details</summary>
                <pre className="text-xs text-red-300 mt-2 p-2 bg-black/20 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}