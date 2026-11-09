'use client'

import { LifeBuoy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AgentRunDock, type AgentRunItemStatus } from '@/components/vision/AgentRunDock'
import { evaluateGenerationError } from '@/lib/errors/generationErrorIntelligence'
import { openSupportErrorReport } from '@/components/vision/ReportGenerationErrorDialog'

/**
 * Single-frame Direct (prompt builder) run, reported without locking the page.
 *
 * Direct used to raise AnimatedProcessingOverlay for the whole fetch, so the
 * gallery under the prompt dialog could not be read or edited until the image
 * landed. The generate-image call is still tab-local; this card only reports it.
 */
export interface DirectFrameRunState {
  visible: boolean
  sceneNumber: number
  label: string
  generatingKey: string
  status: AgentRunItemStatus
  error?: string
  finished: boolean
  startedAt: number
}

export function DirectFrameRunDock({
  run,
  onClose,
}: {
  run: DirectFrameRunState
  onClose: () => void
}) {
  const tone = !run.finished ? 'running' : run.status === 'error' ? 'error' : 'success'

  const evaluated =
    run.finished && run.status === 'error'
      ? evaluateGenerationError({
          mediaType: 'still',
          rawError: run.error || 'Direct generation failed',
        })
      : null

  const subtitle = !run.finished
    ? `Scene ${run.sceneNumber} — you can keep editing`
    : run.status === 'error'
      ? evaluated?.shortSummary || 'Still generation failed — rerun or report to Support'
      : `Scene ${run.sceneNumber} — frame ready`

  return (
    <AgentRunDock
      title="Direct"
      subtitle={subtitle}
      tone={tone}
      items={[
        {
          key: run.generatingKey,
          label: run.label,
          status: run.status,
          error: run.error,
        },
      ]}
      progressPct={run.finished ? 100 : 8}
      onClose={run.finished ? onClose : undefined}
      footer={
        evaluated?.canReportToSupport ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px] border-cyan-500/40 text-cyan-200 hover:bg-cyan-950/40"
            onClick={() =>
              openSupportErrorReport({
                mediaType: 'still',
                rawError: run.error,
                technicalDetails: run.error,
                title: evaluated.title,
                explanation: evaluated.explanation,
                recommendedAction: evaluated.primaryCta.label,
                context: {
                  sceneNumber: run.sceneNumber,
                  shotLabel: run.label,
                },
              })
            }
          >
            <LifeBuoy className="h-3 w-3 mr-1" />
            Report to Support
          </Button>
        ) : undefined
      }
    />
  )
}

export default DirectFrameRunDock
