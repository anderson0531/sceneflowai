'use client'

import { AgentRunDock, type AgentRunPhase } from '@/components/vision/AgentRunDock'
import {
  audioRunLanes,
  audioRunProgress,
  type AudioAgentRunReport,
} from '@/lib/audio/audioAgentRunReport'

/**
 * An Audio Agent batch, reported without taking the page away from the user.
 *
 * This run used to raise the full-screen processing overlay, which locks the
 * body scroll for as long as ElevenLabs, Lyria and Veo take — so a scene with
 * a dozen lines meant a minute of not being able to read the script it was
 * generating from.
 */
export interface AudioAgentRunState extends AudioAgentRunReport {
  visible: boolean
}

export function AudioAgentRunDock({
  run,
  onClose,
}: {
  run: AudioAgentRunState
  onClose: () => void
}) {
  const progress = audioRunProgress(run.items)

  const tone = !run.finished
    ? 'running'
    : run.runError
      ? 'error'
      : progress.failed > 0
        ? 'warning'
        : 'success'

  const subtitle = !run.finished
    ? `${run.sceneLabel} — you can keep editing`
    : run.runError
      ? run.runError
      : progress.failed > 0
        ? `${progress.failed} of ${progress.total} failed — retry from the track`
        : `${run.sceneLabel} audio ready`

  const phases: AgentRunPhase[] = audioRunLanes(run.items).map((lane) => ({
    key: lane.lane,
    label: lane.label,
    status: lane.status,
  }))

  return (
    <AgentRunDock
      title="Audio Agent"
      subtitle={subtitle}
      tone={tone}
      phases={phases}
      items={run.items}
      meta={
        <>
          {progress.done}/{progress.total} tracks
          {progress.failed > 0 ? ` · ${progress.failed} failed` : ''}
          {' · '}
          {progress.pct}%
        </>
      }
      progressPct={Math.max(run.finished ? 0 : 4, progress.pct)}
      onClose={run.finished ? onClose : undefined}
    />
  )
}

export default AudioAgentRunDock
