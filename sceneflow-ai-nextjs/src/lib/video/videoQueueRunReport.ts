/**
 * What a Video Agent batch reports to whoever is watching it.
 *
 * The queue loop lives in `useVideoQueue`, which is mounted by the Director's
 * Console. Closing the console unmounts the hook, and every `setState` the loop
 * still makes after that goes nowhere — so the render kept going while the user
 * had no way to see it or stop it. The loop now reports through this shape to an
 * owner that outlives the console.
 */

export type VideoRunItemStatus = 'pending' | 'running' | 'done' | 'error'

export interface VideoRunItem {
  key: string
  label: string
  status: VideoRunItemStatus
  error?: string
}

export interface VideoQueueRunReport {
  sceneId: string
  /** "Scene 4" — the console knows the number, the dock only prints it. */
  sceneLabel: string
  total: number
  completed: number
  failed: number
  finished: boolean
  cancelled: boolean
  /** Seconds left on a rate-limit pause, when one is in effect. */
  rateLimitCountdown: number
  items: VideoRunItem[]
}

export type VideoQueueRunReporter = (report: VideoQueueRunReport) => void

export function videoRunProgressPct(report: VideoQueueRunReport): number {
  if (report.total === 0) return 0
  return Math.round(((report.completed + report.failed) / report.total) * 100)
}
