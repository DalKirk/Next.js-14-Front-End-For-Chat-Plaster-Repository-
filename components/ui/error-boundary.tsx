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
    console.error('🚨 ErrorBoundary - Error occurred:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('🚨 Component stack:', errorInfo.componentStack);
    console.error('🚨 Error stack:', error.stack);
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
              {this.state.error && (
                <Button
                  onClick={() => {
                    const errorText = `Error: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack}`;
                    navigator.clipboard.writeText(errorText);
                    alert('Error details copied to clipboard!');
                  }}
                  variant="glass"
                  className="w-full"
                >
                  📋 Copy Error Details
                </Button>
              )}
            </div>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-white/70 cursor-pointer hover:text-white">
                  🔍 Error Details (Click to expand)
                </summary>
                <pre className="text-xs text-red-300 mt-2 p-2 bg-black/20 rounded overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
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