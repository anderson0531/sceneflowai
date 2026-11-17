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

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <h1 className="text-lg font-semibold text-white">SceneFlow Studio Updated</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            A newer version of SceneFlow Studio is ready. Click below to reload cleanly.
          </p>
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
        </div>
      </body>
    </html>
  )
}
