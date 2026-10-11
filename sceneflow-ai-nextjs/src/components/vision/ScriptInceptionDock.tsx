'use client'

import { Button } from '@/components/ui/Button'
import { AgentRunDock, type AgentRunItemStatus } from '@/components/vision/AgentRunDock'

export interface ScriptInceptionRunState {
  visible: boolean
  finished: boolean
  cancelled: boolean
  phase: 'scene-direction' | 'shot-direction' | 'done'
  done: number
  total: number
  failed: number
}

function phaseStatus(
  run: ScriptInceptionRunState,
  phase: 'scene-direction' | 'shot-direction'
): AgentRunItemStatus {
  const order = ['scene-direction', 'shot-direction'] as const
  const current = run.phase === 'done' ? order.length : order.indexOf(run.phase)
  const index = order.indexOf(phase)
  if (index < current) return 'done'
  if (index > current) return 'pending'
  if (!run.finished) return 'running'
  return run.cancelled ? 'error' : 'done'
}

/**
 * Scene direction, then shot direction, after a new script is saved.
 * The page stays usable; Cancel stops the next scene.
 */
export function ScriptInceptionDock({
  run,
  onClose,
  onCancel,
}: {
  run: ScriptInceptionRunState
  onClose: () => void
  onCancel?: () => void
}) {
  const total = run.total
  const pct = total === 0 ? 0 : Math.round((run.done / total) * 100)
  const tone = !run.finished
    ? 'running'
    : run.cancelled
      ? 'warning'
      : run.failed > 0
        ? 'warning'
        : 'success'
  const phaseLabel = run.phase === 'shot-direction' ? 'Shot direction' : 'Scene direction'
  const subtitle = !run.finished
    ? `${phaseLabel} ${run.done}/${run.total} — you can keep editing`
    : run.cancelled
      ? `Stopped during ${phaseLabel.toLowerCase()}`
      : run.failed > 0
        ? `${run.failed} scene${run.failed === 1 ? '' : 's'} need another pass`
        : 'Scene direction and shot direction are ready'

  return (
    <AgentRunDock
      title="Script inception"
      subtitle={subtitle}
      tone={tone}
      phases={[
        { key: 'scene-direction', label: 'Scene direction', status: phaseStatus(run, 'scene-direction') },
        { key: 'shot-direction', label: 'Shot direction', status: phaseStatus(run, 'shot-direction') },
      ]}
      meta={
        <>
          {run.done}/{run.total}
          {run.failed > 0 ? ` · ${run.failed} failed` : ''}
          {' · '}
          {pct}%
        </>
      }
      progressPct={Math.max(run.finished ? 0 : 4, pct)}
      onClose={run.finished ? onClose : undefined}
      footer={
        !run.finished && onCancel ? (
          <Button variant="outline" size="sm" onClick={onCancel} className="h-7 text-[11px]">
            Cancel
          </Button>
        ) : undefined
      }
    />
  )
}
