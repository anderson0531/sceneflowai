/**
 * The shape an Audio Agent batch reports upward.
 *
 * The run spans three lanes that finish at different times — TTS, music and
 * Veo SFX — so a single percentage hides which one is still working. Lanes get
 * their own status, and every generated item gets a row.
 */

export type AudioRunItemStatus = 'pending' | 'running' | 'done' | 'error'

export type AudioRunLane = 'tts' | 'music' | 'sfx'

export interface AudioRunItem {
  key: string
  label: string
  lane: AudioRunLane
  status: AudioRunItemStatus
  error?: string
}

export interface AudioAgentRunReport {
  sceneIndex: number
  sceneLabel: string
  /** Rows for every item the run was asked to produce, in run order. */
  items: AudioRunItem[]
  finished: boolean
  /** Set when the whole run threw rather than an individual item failing. */
  runError?: string
}

export type AudioAgentRunReporter = (report: AudioAgentRunReport) => void

export const AUDIO_RUN_LANE_LABELS: Record<AudioRunLane, string> = {
  tts: 'voice',
  music: 'music',
  sfx: 'sfx',
}

const LANE_ORDER: AudioRunLane[] = ['tts', 'music', 'sfx']

export interface AudioRunLaneSummary {
  lane: AudioRunLane
  label: string
  status: AudioRunItemStatus
}

/**
 * A lane's status, rolled up from its items.
 *
 * An error outranks a running item: the other lanes carry on past a failure,
 * and a lane that goes back to looking busy buries the thing to retry.
 */
export function audioRunLaneStatus(
  items: AudioRunItem[],
  lane: AudioRunLane
): AudioRunItemStatus | undefined {
  const laneItems = items.filter((item) => item.lane === lane)
  if (laneItems.length === 0) return undefined
  if (laneItems.some((item) => item.status === 'error')) return 'error'
  if (laneItems.every((item) => item.status === 'done')) return 'done'
  if (laneItems.some((item) => item.status === 'running')) return 'running'
  return 'pending'
}

/** Only the lanes this run actually has work in. */
export function audioRunLanes(items: AudioRunItem[]): AudioRunLaneSummary[] {
  const summaries: AudioRunLaneSummary[] = []
  for (const lane of LANE_ORDER) {
    const status = audioRunLaneStatus(items, lane)
    if (status) {
      summaries.push({ lane, label: AUDIO_RUN_LANE_LABELS[lane], status })
    }
  }
  return summaries
}

export interface AudioRunProgress {
  done: number
  failed: number
  total: number
  pct: number
}

export function audioRunProgress(items: AudioRunItem[]): AudioRunProgress {
  const done = items.filter((item) => item.status === 'done').length
  const failed = items.filter((item) => item.status === 'error').length
  const total = items.length
  return {
    done,
    failed,
    total,
    pct: total === 0 ? 0 : Math.round(((done + failed) / total) * 100),
  }
}
