"use client";

import React, { Component, ReactNode } from "react";
import { LuTriangleAlert, LuRefreshCw, LuHouse } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
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
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <LuTriangleAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-center">
                An unexpected error occurred while running the bacteria
                simulation. This might be a temporary issue.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack && (
                      <>
                        \n\nComponent Stack:
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </details>
              )}

              <div className="flex flex-col space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <LuRefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="w-full"
                >
                  <LuHouse className="w-4 h-4 mr-2" />
                  Go to Homepage
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If this problem persists, please try refreshing the page or
                  check your network connection.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper for easier use
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <LuTriangleAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-center">
            An unexpected error occurred in the simulation.
          </p>

          {process.env.NODE_ENV === "development" && (
            <details className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Error Details (Development)
              </summary>
              <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto">
                {error.toString()}
              </pre>
            </details>
          )}

          <Button onClick={resetError} className="w-full">
            <LuRefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
