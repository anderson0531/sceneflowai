'use client'

import React, { Suspense, use, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ScreeningRoomV2 } from '@/components/vision/ScreeningRoomV2'
import { readFinalCutSelection } from '@/hooks/final-cut/useFinalCutSelection'
import { Loader, AlertCircle } from 'lucide-react'
import { PipelineDemoChrome } from '@/components/landing/PipelineDemoChrome'

function parsePlaybackMode(value: string | null): 'animatic' | 'video' | 'auto' {
  if (value === 'animatic' || value === 'video' || value === 'auto') return value
  if (value === 'stream') return 'video'
  return 'auto'
}

export default function SharedScreeningRoomPage({ params }: { params: Promise<{ shareToken: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
          <Loader className="w-12 h-12 animate-spin" />
        </div>
      }
    >
      <SharedScreeningRoomPageInner params={params} />
    </Suspense>
  )
}

function SharedScreeningRoomPageInner({ params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = use(params)
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectData, setProjectData] = useState<any>(null)
  const [showSharedHint, setShowSharedHint] = useState(false)

  const initialLanguage = searchParams.get('lang') || undefined
  const playbackMode = parsePlaybackMode(searchParams.get('playback'))

  useEffect(() => {
    async function loadSharedProject() {
      try {
        const response = await fetch(`/api/vision/shared-project/${shareToken}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load shared project')
        }

        setProjectData(data.project)
      } catch (err: any) {
        console.error('[Shared Screening Room] Error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadSharedProject()
  }, [shareToken])

  const finalCutSelection = useMemo(
    () => (projectData ? readFinalCutSelection(projectData.metadata) : null),
    [projectData]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-xl">Loading Screening Room...</p>
          <p className="text-sm text-gray-400 mt-2">Powered by Sceneflow</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white max-w-md px-4">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-4">Link Not Found</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            This link may have expired or been disabled by the project owner.
          </p>
          <div className="mt-6 text-xs text-gray-600">
            Powered by <span className="font-semibold text-gray-400">Sceneflow</span>
          </div>
        </div>
      </div>
    )
  }

  if (!projectData) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="relative z-[60]">
        <PipelineDemoChrome tokenOrSlug={shareToken} />
      </div>

      {showSharedHint ? (
        <div className="absolute top-16 left-1/2 z-[70] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-white/15 bg-black/80 px-4 py-3 text-sm text-white">
          <p>This is a shared Screening Room. Close this browser tab to leave.</p>
          <button
            type="button"
            onClick={() => setShowSharedHint(false)}
            className="mt-2 text-xs text-cyan-300 hover:text-cyan-200"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <ScreeningRoomV2
        script={projectData.script}
        characters={projectData.characters || []}
        sceneProductionState={projectData.sceneProductionState}
        finalCutSelection={finalCutSelection}
        initialLanguage={initialLanguage}
        playbackMode={playbackMode}
        enableAudienceFeedback={false}
        backButtonLabel="Shared view"
        onClose={() => setShowSharedHint(true)}
      />
    </div>
  )
}
