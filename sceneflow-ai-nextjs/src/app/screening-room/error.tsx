'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function ScreeningRoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ScreeningRoomError]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center px-6">
      <div className="max-w-lg w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-white">Screening room error</h1>
        <p className="mt-2 text-sm text-zinc-400">
          We couldn't load the screening room. You can retry, or head back to the dashboard.
        </p>
        {error?.digest ? (
          <p className="mt-3 text-xs font-mono text-zinc-500">ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-400"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
