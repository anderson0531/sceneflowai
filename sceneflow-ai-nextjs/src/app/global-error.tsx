'use client'

import { useEffect } from 'react'
import {
  attemptOneTimeChunkRecoveryReload,
  isStaleChunkOrModuleError,
} from '@/components/providers/GlobalErrorGuard'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (isStaleChunkOrModuleError(error)) {
      if (attemptOneTimeChunkRecoveryReload()) return
    }
    console.error('[GlobalError]', {
      name: error?.name,
      message: error?.message,
      digest: error?.digest,
    })
  }, [error])

  const isChunkUpdate = isStaleChunkOrModuleError(error)

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <h1 className="text-lg font-semibold text-white">
            {isChunkUpdate ? 'SceneFlow Studio Updated' : 'Unexpected Studio Error'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            {isChunkUpdate
              ? 'A newer version of SceneFlow Studio is ready. Click below to reload cleanly.'
              : 'An unexpected error occurred while loading SceneFlow Studio. Reload the page or contact support if this continues.'}
          </p>
          {error?.digest && (
            <p className="mt-3 text-xs font-mono text-slate-500">ref: {error.digest}</p>
          )}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              title="Reload SceneFlow Studio"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.reload()
                else reset()
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 cursor-pointer"
            >
              Reload Page
            </button>
          </div>
          <div className="mt-5 flex items-center justify-center gap-4 text-xs text-slate-400">
            <a href="/dashboard/help" className="text-cyan-400 hover:underline">
              Studio Academy
            </a>
            <span className="text-slate-700">•</span>
            <a
              href={`mailto:support@sceneflowai.studio?subject=${encodeURIComponent(
                `SceneFlow Error${error?.digest ? ` (${error.digest})` : ''}`
              )}`}
              className="text-slate-300 hover:underline"
            >
              Contact Support
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
