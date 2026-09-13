'use client'

import { AgentRunDock, type AgentRunItemStatus } from '@/components/vision/AgentRunDock'

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

  const subtitle = !run.finished
    ? `Scene ${run.sceneNumber} — you can keep editing`
    : run.status === 'error'
      ? run.error || 'Direct generation failed'
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
    />
  )
}

export default DirectFrameRunDock
