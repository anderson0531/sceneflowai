'use client'

import React, { Suspense, use, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ScreeningRoomV2 } from '@/components/vision/ScreeningRoomV2'
import { ScreeningRoomLoadingState } from '@/components/screening-room/ScreeningRoomLoadingState'
import { readFinalCutSelection } from '@/hooks/final-cut/useFinalCutSelection'
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import {
  formatPortalCopy,
  resolveClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'
import { PipelinePlaceholderStage } from '@/components/landing/PipelinePlaceholderStage'
import { TrailerPlayer } from '@/components/landing/TrailerPlayer'
import {
  getPipelineTrailerMp4Src,
  getPipelineTrailerSrc,
  isPipelinePlaceholderToken,
  type ScreeningCut,
} from '@/config/landing/productionPipelineDemo'

function parsePlaybackMode(value: string | null): 'animatic' | 'video' | 'auto' {
  if (value === 'animatic' || value === 'video' || value === 'auto') return value
  if (value === 'stream') return 'video'
  return 'auto'
}

function parseScreeningCut(value: string | null): ScreeningCut | null {
  if (
    value === 'previs' ||
    value === 'rough' ||
    value === 'scenes' ||
    value === 'trailer' ||
    value === 'final'
  ) {
    return value
  }
  return null
}

function playbackForCut(
  cut: ScreeningCut | null,
  playbackParam: string | null
): 'animatic' | 'video' | 'auto' {
  if (cut === 'previs') return 'animatic'
  if (cut === 'rough' || cut === 'scenes' || cut === 'final') return 'video'
  return parsePlaybackMode(playbackParam)
}

export default function SharedScreeningRoomPage({ params }: { params: Promise<{ shareToken: string }> }) {
  return (
    <Suspense fallback={<ScreeningRoomLoadingState />}>
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
  const [clientNote, setClientNote] = useState('')
  const [showRevisionBox, setShowRevisionBox] = useState(false)
  const [submittingSignoff, setSubmittingSignoff] = useState(false)
  const [signoffStatus, setSignoffStatus] = useState<string | null>(null)

  const initialLanguage = searchParams.get('lang') || undefined
  const activeCut = parseScreeningCut(searchParams.get('cut'))
  const playbackMode = playbackForCut(activeCut, searchParams.get('playback'))
  const placeholder = isPipelinePlaceholderToken(shareToken)
  const trailerSrc = activeCut === 'trailer' ? getPipelineTrailerSrc(shareToken) : null
  const trailerMp4Src = activeCut === 'trailer' ? getPipelineTrailerMp4Src(shareToken) : null
  const hasTrailer = Boolean(trailerSrc || trailerMp4Src)

  useEffect(() => {
    if (placeholder || hasTrailer) {
      setLoading(false)
      return
    }

    async function loadSharedProject() {
      try {
        const response = await fetch(`/api/vision/shared-project/${shareToken}`, {
          cache: 'no-store',
        })
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
  }, [shareToken, placeholder, hasTrailer])

  const finalCutSelection = useMemo(
    () => (projectData ? readFinalCutSelection(projectData.metadata) : null),
    [projectData]
  )

  if (placeholder && !hasTrailer) {
    return <PipelinePlaceholderStage tokenOrSlug={shareToken} activeCut={activeCut} />
  }

  if (hasTrailer) {
    return (
      <div className="min-h-screen bg-black">
        <div className="flex min-h-[70vh] items-center justify-center p-4">
          <TrailerPlayer
            webmSrc={trailerSrc}
            mp4Src={trailerMp4Src}
            label="Trailer"
            className="max-h-[80vh] max-w-5xl"
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return <ScreeningRoomLoadingState />
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

  const clientPortal = projectData?.clientPortal as
    | {
        clientMode?: boolean
        brandProfile?: { brandName: string; primaryColor?: string }
        watermarkPreview?: boolean
        maxFeedbackRounds?: number
        roundsUsed?: number
        approvalStatus?: string
      }
    | undefined
  const portalLocale = resolveClientPortalLocale(initialLanguage)
  const effectiveApproval = signoffStatus || clientPortal?.approvalStatus
  const canRequestScreeningRevision =
    (clientPortal?.roundsUsed ?? 0) < (clientPortal?.maxFeedbackRounds ?? 2) &&
    effectiveApproval !== 'approved'

  const submitScreeningDecision = async (decision: 'approved' | 'revision_requested') => {
    setSubmittingSignoff(true)
    try {
      const res = await fetch(
        `/api/share/screening-room/${encodeURIComponent(shareToken)}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision,
            notes: decision === 'revision_requested' ? clientNote : undefined,
          }),
        }
      )
      const data = await res.json()
      if (data.success) {
        setSignoffStatus(data.approvalStatus)
        setShowRevisionBox(false)
      }
    } finally {
      setSubmittingSignoff(false)
    }
  }

  return (
    <div className="min-h-screen bg-black relative">
      {clientPortal?.watermarkPreview && effectiveApproval !== 'approved' && (
        <div className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center select-none">
          <div className="rotate-[-20deg] rounded-2xl border border-white/15 bg-black/35 px-8 py-4 text-xl sm:text-3xl font-bold uppercase tracking-widest text-white/35">
            {formatPortalCopy(portalLocale, 'watermarkPreviewNotice', {
              brand: clientPortal.brandProfile?.brandName || 'Studio',
            })}
          </div>
        </div>
      )}

      {showSharedHint ? (
        <div className="absolute top-4 left-1/2 z-[70] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-white/15 bg-black/80 px-4 py-3 text-sm text-white">
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
        backButtonLabel={
          clientPortal?.brandProfile?.brandName
            ? formatPortalCopy(portalLocale, 'producedBy', {
                brand: clientPortal.brandProfile.brandName,
              })
            : 'Shared view'
        }
        onClose={() => setShowSharedHint(true)}
      />

      {clientPortal?.clientMode && (
        <div className="fixed bottom-0 inset-x-0 z-[65] border-t border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3 text-white">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-slate-300 flex items-center gap-3">
              <span className="font-semibold text-white">
                {formatPortalCopy(portalLocale, 'producedBy', {
                  brand: clientPortal.brandProfile?.brandName || 'Studio',
                })}
              </span>
              <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2.5 py-0.5 text-xs text-purple-200">
                {formatPortalCopy(portalLocale, 'roundBadge', {
                  used: clientPortal.roundsUsed ?? 0,
                  max: clientPortal.maxFeedbackRounds ?? 2,
                })}
              </span>
            </div>

            {effectiveApproval === 'approved' ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                {formatPortalCopy(portalLocale, 'approveFinalVideo')} ✓
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {showRevisionBox && canRequestScreeningRevision && (
                  <input
                    type="text"
                    value={clientNote}
                    onChange={(e) => setClientNote(e.target.value)}
                    placeholder="Chapter / timestamp notes..."
                    className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white w-56"
                  />
                )}
                {canRequestScreeningRevision && (
                  <button
                    type="button"
                    disabled={submittingSignoff}
                    onClick={() => {
                      if (!showRevisionBox) {
                        setShowRevisionBox(true)
                      } else if (clientNote.trim()) {
                        void submitScreeningDecision('revision_requested')
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {formatPortalCopy(portalLocale, 'requestVideoRevision')}
                  </button>
                )}
                <button
                  type="button"
                  disabled={submittingSignoff}
                  onClick={() => void submitScreeningDecision('approved')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {formatPortalCopy(portalLocale, 'approveFinalVideo')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
