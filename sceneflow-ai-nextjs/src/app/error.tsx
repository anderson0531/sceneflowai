'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import {
  attemptOneTimeChunkRecoveryReload,
  isStaleChunkOrModuleError,
} from '@/components/providers/GlobalErrorGuard'

export default function AppError({
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
    console.error('[AppError]', {
      name: error?.name,
      message: error?.message,
      digest: error?.digest,
    })
  }, [error])

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center bg-gray-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-white">Refreshing SceneFlow Studio</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          A new studio update just deployed while this page was opening. Reload once to continue with the latest version.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            title="Reload SceneFlow Studio"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.reload()
              else reset()
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow transition-opacity hover:opacity-95 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            <span>Reload Page</span>
          </button>
        </div>
      </div>
    </div>
  )
}
