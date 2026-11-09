'use client'

import { LifeBuoy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AgentRunDock } from '@/components/vision/AgentRunDock'
import { openSupportErrorReport } from '@/components/vision/ReportGenerationErrorDialog'
import {
  videoRunProgressPct,
  type VideoQueueRunReport,
} from '@/lib/video/videoQueueRunReport'

/**
 * A Video Agent batch, reported from outside the Director's Console.
 *
 * The console owns the queue but not the run: closing it used to leave the
 * worker loop rendering with nothing on screen and no way to stop it.
 */
export interface VideoAgentRunState extends VideoQueueRunReport {
  visible: boolean
}

export function VideoAgentRunDock({
  run,
  onClose,
  onCancel,
}: {
  run: VideoAgentRunState
  onClose: () => void
  onCancel?: () => void
}) {
  const pct = videoRunProgressPct(run)

  const tone = !run.finished
    ? 'running'
    : run.cancelled
      ? 'warning'
      : run.failed > 0
        ? 'warning'
        : 'success'

  const subtitle = !run.finished
    ? run.rateLimitCountdown > 0
      ? `${run.sceneLabel} — rate limited, resuming in ${run.rateLimitCountdown}s`
      : `${run.sceneLabel} — you can keep editing`
    : run.cancelled
      ? `Cancelled after ${run.completed} of ${run.total}`
      : run.failed > 0
        ? `${run.failed} shot${run.failed === 1 ? '' : 's'} failed — retake from the console`
        : `${run.sceneLabel} video ready`

  return (
    <AgentRunDock
      title="Video Agent"
      subtitle={subtitle}
      tone={tone}
      items={run.items}
      meta={
        <>
          {run.completed}/{run.total} shots
          {run.failed > 0 ? ` · ${run.failed} failed` : ''}
          {' · '}
          {pct}%
        </>
      }
      progressPct={Math.max(run.finished ? 0 : 4, pct)}
      onClose={run.finished ? onClose : undefined}
      footer={
        !run.finished && onCancel ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-7 text-[11px]"
          >
            Cancel
          </Button>
        ) : run.finished && run.failed > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const failedItems = run.items.filter((i) => i.status === 'error')
              const combinedDiag = failedItems
                .map((i) => `${i.label}: ${i.error || 'Failed'}`)
                .join('\n\n')
              openSupportErrorReport({
                mediaType: 'clip',
                rawError: failedItems[0]?.error,
                technicalDetails: combinedDiag,
                context: {
                  sceneId: run.sceneId,
                  shotLabel: `${run.sceneLabel} (${run.failed} failed clip${run.failed === 1 ? '' : 's'})`,
                },
              })
            }}
            className="h-7 text-[11px] border-cyan-500/40 text-cyan-200 hover:bg-cyan-950/40"
          >
            <LifeBuoy className="h-3 w-3 mr-1" />
            Report to Support
          </Button>
        ) : undefined
      }
    />
  )
}

export default VideoAgentRunDock
