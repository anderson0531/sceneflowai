import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import {
  expressSceneRunStatus,
  expressSceneRunningPhaseLabel,
  summarizeExpressProjectRun,
} from '@/lib/sceneGeneration/expressProjectRunProgress'
import {
  audioRunLanes,
  audioRunLaneStatus,
  audioRunProgress,
  type AudioRunItem,
} from '@/lib/audio/audioAgentRunReport'
import { videoRunProgressPct } from '@/lib/video/videoQueueRunReport'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

const PAGE = 'src/app/dashboard/workflow/vision/[projectId]/page.tsx'
const SCRIPT_PANEL = 'src/components/vision/ScriptPanel.tsx'

/**
 * Slice a handler out of a source file so an assertion about one batch cannot
 * be satisfied by an unrelated part of a 16k-line page.
 */
function readHandler(relativePath: string, declaration: string): string {
  const source = readSource(relativePath)
  const start = source.indexOf(declaration)
  expect(start, `${declaration} not found in ${relativePath}`).toBeGreaterThan(-1)
  const after = source.slice(start)
  // Handlers in these files are separated by a top-level `const` at 2 spaces.
  const end = after.slice(1).search(/\n {2}const \w/)
  return end === -1 ? after : after.slice(0, end + 1)
}

describe('agent batch runs report into the dock, not the blocking overlay', () => {
  it('keeps the page usable while the Audio Agent generates a scene', () => {
    const panel = readSource(SCRIPT_PANEL)

    // The Audio Agent, the music bed, the cue scoring pass and the per-line
    // voice buttons all used to raise AnimatedProcessingOverlay, which sets
    // document.body overflow hidden for as long as the providers take.
    expect(panel).not.toContain('useOverlayStore')
    expect(panel).not.toContain('overlayStore')
  })

  it('reports the Audio Agent batch upward instead of only toasting at the end', () => {
    const handler = readHandler(SCRIPT_PANEL, 'const handleExpressAudioConfirm = useCallback(')

    expect(handler).toContain('onAudioRunReport')
    expect(handler).toContain("addItem('narration'")
    expect(handler).toContain('addItem(`dialogue-${i}`')
    expect(handler).toContain("addItem('music'")
    expect(handler).toContain('addItem(`sfx-${beatId}`')
  })

  it('reports the project-wide Run All Agents run outside the gallery button', () => {
    const handler = readHandler(PAGE, 'const handleExpressGenerate = useCallback(')

    expect(handler).not.toContain('overlayStore')
    expect(handler).toContain('setExpressProjectRun')
    expect(handler).toContain('finishProjectRun')
  })

  it('reports the scene-direction batch instead of locking the script behind it', () => {
    const handler = readHandler(PAGE, 'const handleUpdateAllDirections = async () => {')

    expect(handler).not.toContain('overlayStore')
    expect(handler).toContain('setDirectionRun')
  })

  it('reports the project animatic poll rather than leaving it to a lost toast', () => {
    const handler = readHandler(PAGE, 'const handleGenProjectVideo = useCallback(')

    expect(handler).not.toContain('overlayStore')
    expect(handler).toContain('setAnimaticRun')
  })

  it('stacks every dock in one column instead of hand-placing offsets', () => {
    const page = readSource(PAGE)

    expect(page).toContain('<AgentDockStack>')
    // Docks used to be kept apart by passing these down from the page, which
    // only held while exactly the two docks the author had in mind were open.
    expect(page).not.toContain("'bottom-44'")
    expect(page).not.toContain("'bottom-80'")
  })

  it('cancels the video queue through a ref the worker loop can actually read', () => {
    const hook = readSource('src/hooks/useVideoQueue.ts')

    // Reading cancelRequested from state meant the running worker closed over
    // the value from before Cancel was pressed, so the batch never stopped.
    expect(hook).not.toContain('const [cancelRequested, setCancelRequested]')
    expect(hook).toContain('cancelRequestedRef.current')
  })

  it('surfaces a failed voice line, which processWithConcurrency swallows', () => {
    const handler = readHandler(SCRIPT_PANEL, 'const handleExpressAudioConfirm = useCallback(')

    expect(handler).toContain("result.status === 'rejected'")
  })
})

describe('expressProjectRunProgress', () => {
  it('lets a failed phase outrank a running one so the retry stays visible', () => {
    expect(
      expressSceneRunStatus({ direction: 'done', audio: 'error', image: 'running' })
    ).toBe('error')
  })

  it('reports a scene done only when every phase landed', () => {
    expect(expressSceneRunStatus({ direction: 'done', audio: 'done', image: 'done' })).toBe(
      'done'
    )
    expect(expressSceneRunStatus({ direction: 'done', audio: 'done', image: 'pending' })).toBe(
      'pending'
    )
  })

  it('treats an unseen scene as pending rather than crashing the rollup', () => {
    expect(expressSceneRunStatus(undefined)).toBe('pending')
    expect(expressSceneRunningPhaseLabel(undefined)).toBeUndefined()
  })

  it('names the phase a running scene is working through', () => {
    expect(
      expressSceneRunningPhaseLabel({ direction: 'done', audio: 'done', image: 'running' })
    ).toBe('frames')
  })

  it('counts errors as progress so a part-failed run cannot stall at 60%', () => {
    const summary = summarizeExpressProjectRun(
      {
        0: { direction: 'done', audio: 'done', image: 'done' },
        1: { direction: 'done', audio: 'error', image: 'error', error: 'quota' },
      },
      2
    )

    expect(summary.scenesComplete).toBe(1)
    expect(summary.completedPhases).toBe(6)
    expect(summary.pct).toBe(100)
    expect(summary.rows[1].status).toBe('error')
    expect(summary.rows[1].error).toBe('quota')
  })

  it('rows every scene the run was asked for, even ones it never reached', () => {
    const summary = summarizeExpressProjectRun({}, 3)

    expect(summary.rows.map((row) => row.label)).toEqual(['Scene 1', 'Scene 2', 'Scene 3'])
    expect(summary.pct).toBe(0)
  })
})

describe('audioAgentRunReport', () => {
  const items: AudioRunItem[] = [
    { key: 'narration', label: 'Narration', lane: 'tts', status: 'done' },
    { key: 'dialogue-0', label: '1. ANA', lane: 'tts', status: 'error', error: 'no voice' },
    { key: 'music', label: 'Music bed', lane: 'music', status: 'running' },
  ]

  it('lists only the lanes the run has work in', () => {
    expect(audioRunLanes(items).map((lane) => lane.lane)).toEqual(['tts', 'music'])
  })

  it('keeps a lane on error once one of its items failed', () => {
    expect(audioRunLaneStatus(items, 'tts')).toBe('error')
    expect(audioRunLaneStatus(items, 'music')).toBe('running')
    expect(audioRunLaneStatus(items, 'sfx')).toBeUndefined()
  })

  it('counts a failure as settled so the bar tracks work left, not work won', () => {
    const progress = audioRunProgress(items)

    expect(progress).toEqual({ done: 1, failed: 1, total: 3, pct: 67 })
  })

  it('reports zero rather than NaN for a run with nothing to do', () => {
    expect(audioRunProgress([])).toEqual({ done: 0, failed: 0, total: 0, pct: 0 })
  })
})

describe('videoQueueRunReport', () => {
  const base = {
    sceneId: 'scene-1',
    sceneLabel: 'Scene 1',
    finished: false,
    cancelled: false,
    rateLimitCountdown: 0,
    items: [],
  }

  it('counts failures toward progress so a part-failed batch reads as settled', () => {
    expect(videoRunProgressPct({ ...base, total: 4, completed: 2, failed: 2 })).toBe(100)
  })

  it('reports zero rather than NaN before the queue has any segments', () => {
    expect(videoRunProgressPct({ ...base, total: 0, completed: 0, failed: 0 })).toBe(0)
  })
})
