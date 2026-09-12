/**
 * Turn the per-scene phase map that `/api/vision/express` streams into the rows
 * and counts a project-wide run reports.
 *
 * Kept out of the component so the rollup is testable without rendering, and so
 * the scene gallery button and the dock cannot drift apart on what "complete"
 * means.
 */

export type ExpressRunPhaseStatus = 'pending' | 'running' | 'done' | 'error'

export interface ExpressRunScenePhases {
  direction: ExpressRunPhaseStatus
  audio: ExpressRunPhaseStatus
  image: ExpressRunPhaseStatus
  error?: string
  rateLimited?: boolean
}

export type ExpressRunStatusMap = Record<number, ExpressRunScenePhases>

export interface ExpressProjectRunRow {
  key: string
  label: string
  status: ExpressRunPhaseStatus
  error?: string
}

export interface ExpressProjectRunSummary {
  rows: ExpressProjectRunRow[]
  scenesComplete: number
  sceneCount: number
  completedPhases: number
  totalPhases: number
  pct: number
}

const RUN_PHASES = ['direction', 'audio', 'image'] as const

/** Label for the phase a scene is currently working through. */
const PHASE_LABELS: Record<(typeof RUN_PHASES)[number], string> = {
  direction: 'direction',
  audio: 'audio',
  image: 'frames',
}

/**
 * A scene's single status.
 *
 * A failed phase wins over a running one: the run continues past it, and a row
 * that goes back to looking busy hides the thing the user needs to retry.
 */
export function expressSceneRunStatus(
  phases: ExpressRunScenePhases | undefined
): ExpressRunPhaseStatus {
  if (!phases) return 'pending'
  if (RUN_PHASES.some((phase) => phases[phase] === 'error')) return 'error'
  if (RUN_PHASES.every((phase) => phases[phase] === 'done')) return 'done'
  if (RUN_PHASES.some((phase) => phases[phase] === 'running')) return 'running'
  return 'pending'
}

/** Which phase to name on a running scene's row. */
export function expressSceneRunningPhaseLabel(
  phases: ExpressRunScenePhases | undefined
): string | undefined {
  if (!phases) return undefined
  const running = RUN_PHASES.find((phase) => phases[phase] === 'running')
  return running ? PHASE_LABELS[running] : undefined
}

export function summarizeExpressProjectRun(
  statusMap: ExpressRunStatusMap,
  sceneCount: number
): ExpressProjectRunSummary {
  const rows: ExpressProjectRunRow[] = []
  let scenesComplete = 0
  let completedPhases = 0

  for (let index = 0; index < sceneCount; index++) {
    const phases = statusMap[index]
    const status = expressSceneRunStatus(phases)
    if (status === 'done') scenesComplete++
    if (phases) {
      completedPhases += RUN_PHASES.filter(
        (phase) => phases[phase] === 'done' || phases[phase] === 'error'
      ).length
    }

    const runningPhase = expressSceneRunningPhaseLabel(phases)
    rows.push({
      key: `scene-${index}`,
      label: runningPhase
        ? `Scene ${index + 1} — ${runningPhase}`
        : `Scene ${index + 1}`,
      status,
      ...(status === 'error' && phases?.error ? { error: phases.error } : {}),
    })
  }

  const totalPhases = sceneCount * RUN_PHASES.length
  return {
    rows,
    scenesComplete,
    sceneCount,
    completedPhases,
    totalPhases,
    pct: totalPhases === 0 ? 0 : Math.round((completedPhases / totalPhases) * 100),
  }
}
