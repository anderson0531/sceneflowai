'use client'

import { useEffect, useMemo, useState } from 'react'
import { AgentRunDock } from '@/components/vision/AgentRunDock'
import {
  summarizeExpressProjectRun,
  type ExpressRunStatusMap,
} from '@/lib/sceneGeneration/expressProjectRunProgress'

/**
 * The project-wide Run All Agents run, reported where the user can see it.
 *
 * Progress used to live only on the button that started it, inside the Pre-Vis
 * Studio panel — so a 26-scene run became invisible the moment you opened a
 * scene card. Same stream, same state, reported from the dock stack instead.
 */
export interface ExpressProjectRunState {
  visible: boolean
  startedAt: number | null
  sceneCount: number
  finished: boolean
  /** Set when the run could not start, or the stream itself failed. */
  runError?: string
  successScenes?: number
  failedScenes?: number
  rateLimitedFailures?: number
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  return `${mins}m ${seconds % 60}s`
}

export function ExpressProjectRunDock({
  run,
  status,
  onClose,
}: {
  run: ExpressProjectRunState
  /**
   * The same per-scene phase map the Scene Gallery reads. Passed in rather than
   * copied into `run` so the dock and the gallery can never disagree.
   */
  status: ExpressRunStatusMap
  onClose: () => void
}) {
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    if (!run.visible || run.finished || !run.startedAt) return
    const startedAt = run.startedAt
    const tick = () => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [run.visible, run.finished, run.startedAt])

  const summary = useMemo(
    () => summarizeExpressProjectRun(status, run.sceneCount),
    [status, run.sceneCount]
  )

  const failed = run.failedScenes ?? 0
  const tone = !run.finished
    ? 'running'
    : run.runError
      ? 'error'
      : failed > 0 || (run.rateLimitedFailures ?? 0) > 0
        ? 'warning'
        : 'success'

  const subtitle = !run.finished
    ? 'All scenes — you can keep editing'
    : run.runError
      ? run.runError
      : failed > 0
        ? `${failed} scene${failed === 1 ? '' : 's'} finished with errors`
        : run.rateLimitedFailures
          ? `${run.rateLimitedFailures} item${run.rateLimitedFailures === 1 ? '' : 's'} rate limited — re-run with Only missing frames`
          : 'All scenes complete'

  return (
    <AgentRunDock
      title="Run All Agents"
      subtitle={subtitle}
      tone={tone}
      items={summary.rows}
      meta={
        <>
          {summary.scenesComplete}/{summary.sceneCount} scenes
          {' · '}
          {summary.pct}%
          {run.startedAt ? ` · ${formatElapsed(elapsedSec)}` : ''}
        </>
      }
      progressPct={Math.max(run.finished ? 0 : 4, summary.pct)}
      onClose={run.finished ? onClose : undefined}
    />
  )
}

export default ExpressProjectRunDock
