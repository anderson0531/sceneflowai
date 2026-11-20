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

  const isChunkUpdate = isStaleChunkOrModuleError(error)

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center bg-gray-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-white">
          {isChunkUpdate ? 'Refreshing SceneFlow Studio' : 'Something Went Wrong'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          {isChunkUpdate
            ? 'A new studio update just deployed while this page was opening. Reload once to continue with the latest version.'
            : 'An unexpected error interrupted this page. Your saved projects are safe—reload or open Studio Academy / Support if this persists.'}
        </p>
        {error?.digest && (
          <p className="mt-3 text-xs font-mono text-slate-500">ref: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
        <div className="mt-5 flex items-center justify-center gap-4 text-xs text-slate-400">
          <a href="/dashboard/help" className="text-cyan-400 hover:underline">
            Studio Academy &amp; Help
          </a>
          <span className="text-slate-700">•</span>
          <a
            href={`mailto:support@sceneflowai.studio?subject=${encodeURIComponent(
              `SceneFlow Studio Error${error?.digest ? ` (${error.digest})` : ''}`
            )}`}
            className="text-slate-300 hover:text-white hover:underline"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
