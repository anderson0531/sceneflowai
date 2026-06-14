'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ExpressPhaseStatus } from '@/components/vision/SceneGallery'
import {
  countCompletedFrames,
  estimateRemainingSec,
  formatEta,
  hasFrameErrors,
  type ExpressBeatFrameItem,
} from '@/lib/storyboard/expressBeatFrameProgress'

export type ExpressOverlayPhase = 'direction' | 'audio' | 'image-plan' | 'image'
export type ExpressOverlayPhaseMap = Record<ExpressOverlayPhase, ExpressPhaseStatus>

export interface ExpressBeatFrameProgressOverlayProps {
  visible: boolean
  sceneNumber: number
  items: ExpressBeatFrameItem[]
  phases: ExpressOverlayPhaseMap
  startedAt: number | null
  finished?: boolean
  preflightError?: string
  onClose: () => void
}

const PHASE_LABELS: Record<ExpressOverlayPhase, string> = {
  direction: 'Direction',
  audio: 'Audio',
  'image-plan': 'Image plan',
  image: 'Beat frames',
}

function PhasePill({
  label,
  status,
}: {
  label: string
  status: ExpressPhaseStatus
}) {
  const cls = (() => {
    switch (status) {
      case 'running':
        return 'bg-indigo-500/30 text-indigo-200 border-indigo-400/40'
      case 'done':
        return 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
      case 'error':
        return 'bg-rose-500/30 text-rose-200 border-rose-400/40'
      default:
        return 'bg-gray-700/40 text-gray-300 border-gray-500/40'
    }
  })()

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
        cls
      )}
    >
      {status === 'running' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {status === 'done' && <Check className="w-2.5 h-2.5" />}
      {status === 'error' && <X className="w-2.5 h-2.5" />}
      {label}
    </span>
  )
}

function FrameStatusRow({ item }: { item: ExpressBeatFrameItem }) {
  const cls = (() => {
    switch (item.status) {
      case 'running':
        return 'border-amber-400/50 bg-amber-500/10 text-amber-100'
      case 'done':
        return 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
      case 'error':
        return 'border-rose-400/50 bg-rose-500/10 text-rose-100'
      default:
        return 'border-gray-600/50 bg-gray-800/40 text-gray-300'
    }
  })()

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
        item.status === 'running' && 'animate-pulse',
        cls
      )}
      title={item.error}
    >
      <span className="shrink-0">
        {item.status === 'running' && (
          <Loader2 className="w-4 h-4 animate-spin text-amber-300" aria-hidden />
        )}
        {item.status === 'done' && (
          <Check className="w-4 h-4 text-emerald-300" aria-hidden />
        )}
        {item.status === 'error' && <X className="w-4 h-4 text-rose-300" aria-hidden />}
        {item.status === 'pending' && (
          <span className="inline-block w-4 h-4 rounded-full border border-gray-500" aria-hidden />
        )}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.status === 'error' && item.error && (
        <span className="text-[10px] text-rose-200/80 truncate max-w-[160px]">{item.error}</span>
      )}
    </div>
  )
}

export function ExpressBeatFrameProgressOverlay({
  visible,
  sceneNumber,
  items,
  phases,
  startedAt,
  finished = false,
  preflightError,
  onClose,
}: ExpressBeatFrameProgressOverlayProps) {
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    if (!visible) {
      setElapsedSec(0)
      return
    }
    const tick = () => {
      if (startedAt) {
        setElapsedSec(Math.floor((Date.now() - startedAt) / 1000))
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [visible, startedAt])

  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  const completedFrames = useMemo(() => countCompletedFrames(items), [items])
  const totalFrames = items.length
  const frameErrors = useMemo(() => hasFrameErrors(items), [items])

  const currentPhase = useMemo((): ExpressOverlayPhase | null => {
    const order: ExpressOverlayPhase[] = ['direction', 'audio', 'image-plan', 'image']
    for (const phase of order) {
      if (phases[phase] === 'running') return phase
    }
    for (const phase of order) {
      if (phases[phase] === 'pending') return phase
    }
    return null
  }, [phases])

  const imagePhaseStarted =
    phases.image === 'running' || phases.image === 'done' || phases.image === 'error'

  const etaSec = estimateRemainingSec({
    elapsedSec,
    completedFrames,
    totalFrames,
    currentPhase: currentPhase === 'image-plan' ? 'image-plan' : currentPhase,
    imagePhaseStarted,
  })

  const progressPct =
    totalFrames > 0 ? Math.round((completedFrames / totalFrames) * 100) : 0

  const showClose = finished && (frameErrors || !!preflightError)

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="express-beat-frame-progress-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-950/95 shadow-2xl">
        <div className="border-b border-gray-800 px-5 py-4">
          <div className="flex items-center gap-2">
            {!finished && <Loader2 className="w-5 h-5 animate-spin text-amber-300" />}
            <h2
              id="express-beat-frame-progress-title"
              className="text-base font-semibold text-gray-100"
            >
              Express Scene {sceneNumber}
            </h2>
          </div>
          {preflightError && (
            <p className="mt-2 text-sm text-rose-300">{preflightError}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(Object.keys(PHASE_LABELS) as ExpressOverlayPhase[]).map((phase) => (
              <PhasePill key={phase} label={PHASE_LABELS[phase]} status={phases[phase]} />
            ))}
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="text-sm text-gray-300" aria-live="polite">
            {totalFrames > 0 ? (
              <>
                {completedFrames}/{totalFrames} frames complete
                {' · '}
                {elapsedSec}s elapsed
                {' · '}
                {formatEta(etaSec)}
              </>
            ) : (
              <>
                Preparing scene… {elapsedSec}s elapsed
              </>
            )}
          </div>

          {totalFrames > 0 && (
            <div className="h-2 w-full rounded bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 transition-[width] duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {totalFrames > 0 && (
            <div className="max-h-[min(50vh,320px)] overflow-y-auto space-y-1.5 pr-1">
              {items.map((item) => (
                <FrameStatusRow key={item.key} item={item} />
              ))}
            </div>
          )}
        </div>

        {showClose && (
          <div className="border-t border-gray-800 px-5 py-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpressBeatFrameProgressOverlay
