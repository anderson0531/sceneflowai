'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ExpressPhaseStatus } from '@/components/vision/SceneGallery'
import {
  countCompletedFrames,
  estimateRemainingSec,
  EXPRESS_IMAGE_ETA_CONCURRENCY_DEFAULT,
  failedExpressFrameKeys,
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
  onRetryFailed?: (failedKeys: string[]) => void
  onDirectFailed?: (failedKeys: string[]) => void
  onAutoFailed?: (failedKeys: string[]) => void
  /** Override the anchor so concurrent docks do not sit on top of each other. */
  className?: string
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
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border',
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
        'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]',
        item.status === 'running' && 'animate-pulse',
        cls
      )}
      title={item.error}
    >
      <span className="shrink-0">
        {item.status === 'running' && (
          <Loader2 className="w-3 h-3 animate-spin text-amber-300" aria-hidden />
        )}
        {item.status === 'done' && (
          <Check className="w-3 h-3 text-emerald-300" aria-hidden />
        )}
        {item.status === 'error' && <X className="w-3 h-3 text-rose-300" aria-hidden />}
        {item.status === 'pending' && (
          <span className="inline-block w-3 h-3 rounded-full border border-gray-500" aria-hidden />
        )}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.status === 'error' && item.error && (
        <span className="text-[10px] text-rose-200/80 truncate max-w-[100px]">{item.error}</span>
      )}
    </div>
  )
}

/**
 * Corner progress card for scene-frame Express.
 *
 * Used to be a full-screen modal that locked the page. The SSE run still
 * happens in the open tab; this card only reports it so the user can keep
 * editing. Closing the tab still stops the stream.
 */
export function ExpressBeatFrameProgressOverlay({
  visible,
  sceneNumber,
  items,
  phases,
  startedAt,
  finished = false,
  preflightError,
  onClose,
  onRetryFailed,
  onDirectFailed,
  onAutoFailed,
  className,
}: ExpressBeatFrameProgressOverlayProps) {
  const t = useTranslations('production.expressScene')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [imagePhaseStartedAt, setImagePhaseStartedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!visible) {
      setElapsedSec(0)
      setImagePhaseStartedAt(null)
      return
    }
    const tick = () => {
      const now = Date.now()
      setNowMs(now)
      if (startedAt) {
        setElapsedSec(Math.floor((now - startedAt) / 1000))
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [visible, startedAt])

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

  useEffect(() => {
    if (!visible) return
    if (imagePhaseStarted && imagePhaseStartedAt == null) {
      setImagePhaseStartedAt(Date.now())
    }
  }, [visible, imagePhaseStarted, imagePhaseStartedAt])

  const imageElapsedSec =
    imagePhaseStartedAt != null
      ? Math.max(0, Math.floor((nowMs - imagePhaseStartedAt) / 1000))
      : 0

  const etaSec = estimateRemainingSec({
    elapsedSec: imageElapsedSec,
    completedFrames,
    totalFrames,
    currentPhase: currentPhase === 'image-plan' ? 'image-plan' : currentPhase,
    imagePhaseStarted,
    concurrency: EXPRESS_IMAGE_ETA_CONCURRENCY_DEFAULT,
  })

  const progressPct =
    totalFrames > 0 ? Math.round((completedFrames / totalFrames) * 100) : 0

  const showClose = finished && (frameErrors || !!preflightError)

  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[80] w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur',
        className
      )}
      role="status"
      aria-live="polite"
      aria-labelledby="express-beat-frame-progress-title"
    >
      <div className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0">
            {!finished ? (
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
            ) : frameErrors || preflightError ? (
              <X className="h-4 w-4 text-amber-400" />
            ) : (
              <Check className="h-4 w-4 text-emerald-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              id="express-beat-frame-progress-title"
              className="truncate text-xs font-semibold text-white"
            >
              Express Scene {sceneNumber}
            </p>
            {!finished ? (
              <p className="mt-0.5 text-[11px] text-slate-400">
                Generating frames — you can keep editing
              </p>
            ) : preflightError ? (
              <p className="mt-0.5 text-[11px] text-rose-300">{preflightError}</p>
            ) : frameErrors ? (
              <p className="mt-0.5 text-[11px] text-amber-300/90">
                Some frames failed — retry to fill the gaps
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-slate-400">Frames ready</p>
            )}
          </div>
          {showClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              className="shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(Object.keys(PHASE_LABELS) as ExpressOverlayPhase[]).map((phase) => (
            <PhasePill key={phase} label={PHASE_LABELS[phase]} status={phases[phase]} />
          ))}
        </div>
      </div>

      <div className="px-3 py-2 space-y-2">
        <div className="text-[11px] text-slate-400">
          {totalFrames > 0 ? (
            <>
              {completedFrames}/{totalFrames} frames
              {' · '}
              {elapsedSec}s
              {' · '}
              {formatEta(etaSec)}
            </>
          ) : (
            <>Preparing scene… {elapsedSec}s</>
          )}
        </div>

        {totalFrames > 0 && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-[width] duration-500"
              style={{ width: `${Math.max(finished ? 0 : 4, progressPct)}%` }}
            />
          </div>
        )}

        {totalFrames > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1 pr-0.5">
            {items.map((item) => (
              <FrameStatusRow key={item.key} item={item} />
            ))}
          </div>
        )}
      </div>

      {showClose && (
        <div className="border-t border-slate-800 px-3 py-2 flex flex-wrap justify-end gap-1.5">
          {frameErrors && onRetryFailed && (
            <Button
              size="sm"
              onClick={() => onRetryFailed(failedExpressFrameKeys(items))}
              className="h-7 text-[11px]"
            >
              {t('retryFailed')}
            </Button>
          )}
          {frameErrors && onDirectFailed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDirectFailed(failedExpressFrameKeys(items))}
              className="h-7 text-[11px]"
            >
              {t('direct')}
            </Button>
          )}
          {frameErrors && onAutoFailed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAutoFailed(failedExpressFrameKeys(items))}
              className="h-7 text-[11px]"
            >
              {t('auto')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} className="h-7 text-[11px]">
            {t('close')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ExpressBeatFrameProgressOverlay
