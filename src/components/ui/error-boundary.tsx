'use client';

import { Component, ReactNode } from 'react';
import { Button } from './button';
import { Card } from './card';
import { Alert } from './alert';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6">
            <Alert variant="error" className="mb-6">
              <p className="font-semibold text-lg mb-2">Something went wrong</p>
              <p className="text-sm">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Reload Page
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="secondary"
                className="w-full"
              >
                Go Back
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({
  title = 'Error',
  message,
  onRetry,
  className = '',
}: ErrorMessageProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <Alert variant="error" className="mb-4">
        <p className="font-semibold">{title}</p>
        <p className="text-sm mt-1">{message}</p>
      </Alert>
      
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" className="w-full">
          Try Again
        </Button>
      )}
    </Card>
  );
}
