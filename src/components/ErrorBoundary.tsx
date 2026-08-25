"use client";

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
 console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
        })
      })
    }

    localStorage.clear()
    sessionStorage.clear()

    window.location.reload()
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: undefined })
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.error?.message?.includes('Maximum update depth') ||
        this.state.error?.message?.includes('infinite loop')) {
        setTimeout(() => {
          this.setState({ hasError: false, error: undefined })
        }, 100)
        return this.props.children
      }

      if (this.props.fallback) {
        return this.props.fallback
      }

      if (process.env.NODE_ENV === 'production') {
        setTimeout(() => {
          this.setState({ hasError: false, error: undefined })
        }, 1000)
        return this.props.children
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>

            <p className="text-gray-600 mb-6">
              The app encountered an error. This might be due to cache issues.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Clear Cache & Reload
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Go to Home
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export { ErrorBoundary }