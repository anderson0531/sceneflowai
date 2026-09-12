'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import type { ExpressPhaseStatus } from '@/components/vision/SceneGallery'
import { AgentRunDock, type AgentRunPhase } from '@/components/vision/AgentRunDock'
import {
  countCompletedFrames,
  estimateRemainingSec,
  EXPRESS_IMAGE_ETA_CONCURRENCY_DEFAULT,
  failedExpressFrameKeys,
  formatEta,
  hasFrameErrors,
  type ExpressBeatFrameItem,
} from '@/lib/storyboard/expressBeatFrameProgress'

/**
 * `references` leads because just-in-time reference generation runs ahead of
 * everything else, and one auto-chained run should read as one operation
 * rather than two the user has to connect for themselves.
 */
export type ExpressOverlayPhase =
  | 'references'
  | 'direction'
  | 'audio'
  | 'image-plan'
  | 'image'
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
}

const PHASE_LABELS: Record<ExpressOverlayPhase, string> = {
  references: 'References',
  direction: 'Direction',
  audio: 'Audio',
  'image-plan': 'Image plan',
  image: 'Beat frames',
}

const PHASE_ORDER: ExpressOverlayPhase[] = [
  'references',
  'direction',
  'audio',
  'image-plan',
  'image',
]

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
    for (const phase of PHASE_ORDER) {
      if (phases[phase] === 'running') return phase
    }
    for (const phase of PHASE_ORDER) {
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
    // The frame ETA only models the frame phases; references run ahead of them
    // and quote their own estimate before the run starts.
    currentPhase: currentPhase === 'references' ? null : currentPhase,
    imagePhaseStarted,
    concurrency: EXPRESS_IMAGE_ETA_CONCURRENCY_DEFAULT,
  })

  const progressPct =
    totalFrames > 0 ? Math.round((completedFrames / totalFrames) * 100) : 0

  const showClose = finished && (frameErrors || !!preflightError)

  const dockPhases = useMemo(
    (): AgentRunPhase[] =>
      PHASE_ORDER.map((phase) => ({
        key: phase,
        label: PHASE_LABELS[phase],
        status: phases[phase],
      })),
    [phases]
  )

  if (!visible) return null

  const tone = !finished
    ? 'running'
    : preflightError
      ? 'error'
      : frameErrors
        ? 'warning'
        : 'success'

  const subtitle = !finished
    ? currentPhase === 'references'
      ? `Scene ${sceneNumber} — drawing the missing references first`
      : `Scene ${sceneNumber} — you can keep editing`
    : preflightError
      ? preflightError
      : frameErrors
        ? 'Some frames failed — retry to fill the gaps'
        : 'Frames ready'

  return (
    <AgentRunDock
      title="Frame Agent"
      subtitle={subtitle}
      tone={tone}
      phases={dockPhases}
      items={totalFrames > 0 ? items : undefined}
      meta={
        totalFrames > 0 ? (
          <>
            {completedFrames}/{totalFrames} frames
            {' · '}
            {elapsedSec}s
            {' · '}
            {formatEta(etaSec)}
          </>
        ) : (
          <>Preparing scene… {elapsedSec}s</>
        )
      }
      progressPct={
        totalFrames > 0 ? Math.max(finished ? 0 : 4, progressPct) : undefined
      }
      onClose={showClose ? onClose : undefined}
      closeLabel={t('close')}
      footer={
        showClose ? (
          <>
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
          </>
        ) : undefined
      }
    />
  )
}

export default ExpressBeatFrameProgressOverlay
