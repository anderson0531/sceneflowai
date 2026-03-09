'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

/**
 * Error boundary for the Vision workflow page.
 * Catches unhandled client-side exceptions (AbortError, CustomFetchError, etc.)
 * and renders a recovery UI instead of crashing the entire application.
 */
export default function VisionWorkflowError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error for debugging — include digest for server-side correlation
    console.error('[VisionWorkflowError] Caught error:', {
      message: error.message,
      name: error.name,
      digest: error.digest,
      stack: error.stack?.substring(0, 500),
    })
  }, [error])

  // Determine if this is a transient network error vs a real bug
  const isNetworkError =
    error.name === 'AbortError' ||
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('Unexpected Error') ||
    error.message?.includes('NetworkError') ||
    error.message?.includes('Load failed') ||
    error.name === 'TypeError' && error.message?.includes('fetch')

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center shadow-xl">
        {/* Icon */}
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
          isNetworkError 
            ? 'bg-amber-500/10 border border-amber-500/30' 
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {isNetworkError ? (
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          ) : (
            <Bug className="w-8 h-8 text-red-400" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-100 mb-2">
          {isNetworkError ? 'Connection Issue' : 'Something Went Wrong'}
        </h2>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          {isNetworkError
            ? 'A network request failed. This is usually temporary — your work has been saved. Try refreshing to reconnect.'
            : 'An unexpected error occurred in the Vision workflow. Your project data is safe in the database.'}
        </p>

        {/* Error details (collapsed) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
              Error details
            </summary>
            <pre className="mt-2 text-xs text-gray-500 bg-gray-800 p-3 rounded-lg overflow-auto max-h-32 border border-gray-700">
              {error.name}: {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Full Reload
          </button>
          <a
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-gray-400 hover:text-gray-200 rounded-lg font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
