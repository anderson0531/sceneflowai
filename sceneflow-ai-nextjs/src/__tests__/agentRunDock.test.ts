import { readFileSync } from 'fs'
import path from 'path'
import { beforeEach, describe, it, expect } from 'vitest'
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
import {
  failAgentRun,
  finishAgentRun,
  runWithAgentDock,
  startAgentRun,
  useAgentRunStore,
} from '@/store/useAgentRunStore'

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

  it('reports Direct prompt-builder frames into the dock instead of freezing the gallery', () => {
    const handler = readHandler(PAGE, 'const handleDirectFrameGenerate = async (options: PreVisDirectGenerationOptions) => {')
    const page = readSource(PAGE)
    const dock = readSource('src/components/vision/DirectFrameRunDock.tsx')

    expect(handler).not.toContain('overlayStore')
    expect(handler).toContain('setDirectFrameRun')
    expect(handler).toContain('finishDirectFrameRun')
    expect(handler).toContain('setPreVisDirectDialog(null)')
    expect(page).toContain('<DirectFrameRunDock')
    expect(dock).toContain('title="Direct"')
    expect(dock).toContain('you can keep editing')
  })

  it('keeps beat Regen and Frame Agent on the Express dock, not the freeze overlay', () => {
    const regen = readHandler(PAGE, 'const handleGenerateBeatFrameImage = async (')
    const agent = readHandler(PAGE, 'const handleExpressSceneGenerate = useCallback(')

    expect(regen).not.toContain('overlayStore')
    expect(regen).toContain('handleExpressSceneGenerate')
    expect(agent).not.toContain('overlayStore')
    expect(agent).toContain('setExpressBeatFrameOverlay')
  })

  it('lets the Frame Agent dock cancel the Express SSE run without a reload', () => {
    const overlay = readSource('src/components/vision/ExpressBeatFrameProgressOverlay.tsx')
    const agent = readHandler(PAGE, 'const handleExpressSceneGenerate = useCallback(')
    const page = readSource(PAGE)

    expect(overlay).toContain('onCancel')
    expect(overlay).toContain("t('cancel')")
    expect(agent).toContain('AbortController')
    expect(agent).toContain('signal: abortController.signal')
    expect(agent).toContain("err?.name === 'AbortError'")
    expect(agent).toContain('cancelled: true')
    expect(page).toContain('expressAbortRef.current?.abort()')
    expect(page).toContain('onCancel={')
    expect(page).toContain("error: 'Cancelled'")
    expect(readSource('src/app/api/vision/express/route.ts')).toContain('signal: req.signal')
    expect(readSource('src/lib/sceneGeneration/expressOrchestrator.ts')).toContain(
      '{ signal: ctx.signal }'
    )
  })

  it('reports gallery stills into the Frame dock instead of freezing the studio', () => {
    const scene = readHandler(PAGE, 'const handleGenerateSceneImage = async (')
    const dialogue = readHandler(PAGE, 'const handleGenerateDialogueFrameImage = async (')
    const custom = readHandler(PAGE, 'const handleGenerateCustomFrame = async (')
    const page = readSource(PAGE)

    for (const handler of [scene, dialogue, custom]) {
      expect(handler).not.toContain('overlayStore')
      expect(handler).not.toContain('execute(')
      expect(handler).toContain('startAgentRun')
      expect(handler).toContain("title: 'Frame'")
    }
    expect(page).toContain('<AgentRunStoreDocks')
    expect(page).not.toContain('Generating Scene Images')
  })

  it('reports batch scene stills into the dock instead of a full-screen modal', () => {
    const handler = readHandler(PAGE, 'const handleGenerateAllImages = async () => {')

    expect(handler).not.toContain('overlayStore')
    expect(handler).not.toContain('execute(')
    expect(handler).not.toContain('fixed inset-0')
    expect(handler).toContain('startAgentRun')
    expect(handler).toContain("title: 'Scene images'")
  })

  it('reports location and scene-reference stills into a library dock', () => {
    const location = readHandler(PAGE, 'const handleGenerateLocationImage = async (')
    const locationPrompt = readHandler(PAGE, 'const handleGenerateLocationImageWithPrompt = async (')
    const locationVersion = readHandler(PAGE, 'const handleGenerateLocationVersion = async (')
    const sceneRef = readHandler(PAGE, 'const handleGenerateSceneReferenceImage = async (')

    for (const handler of [location, locationPrompt, locationVersion]) {
      expect(handler).not.toContain('overlayStore')
      expect(handler).not.toContain('execute(')
      expect(handler).toContain('startAgentRun')
      expect(handler).toContain("title: 'Location'")
    }
    expect(sceneRef).not.toContain('overlayStore')
    expect(sceneRef).not.toContain('execute(')
    expect(sceneRef).toContain('startAgentRun')
    expect(sceneRef).toContain("title: 'Scene reference'")
  })

  it('routes leftover scene-audio regen through the Audio Agent dock', () => {
    const handler = readHandler(PAGE, 'const handleUpdateSceneAudio = async (sceneIndex: number) => {')

    expect(handler).not.toContain('overlayStore')
    expect(handler).not.toContain('execute(')
    expect(handler).toContain('handleAudioRunReport')
  })

  it('applies scene edits with a toast instead of a freeze overlay', () => {
    const handler = readHandler(PAGE, 'const handleApplySceneChanges = async (')

    expect(handler).not.toContain('overlayStore')
    expect(handler).not.toContain('execute(')
    expect(handler).toContain('toast.success')
  })

  it('still freezes the studio for first-entry script generation', () => {
    const handler = readHandler(PAGE, 'const initiateGeneration = async (proj: Project) => {')
    const generateScript = readHandler(PAGE, 'const generateScript = async (proj: Project)')

    expect(handler).toContain('execute(')
    expect(handler).toContain("operationType: 'script-generation'")
    expect(generateScript).toContain('overlayStore.setProgress')
  })
})

describe('nested Production Studio agents report into the dock, not a freeze overlay', () => {
  const MIXER = 'src/components/vision/scene-production/SceneProductionMixer.tsx'
  const MANAGER = 'src/components/vision/scene-production/SceneProductionManager.tsx'
  const SCRIPT_REVIEW = 'src/components/vision/ScriptReviewModal.tsx'
  const KEYFRAMES = 'src/components/vision/scene-production/SegmentFrameTimeline.tsx'

  it('rewrites the script from ScriptReviewModal without locking the page', () => {
    const source = readSource(SCRIPT_REVIEW)

    expect(source).not.toContain('useProcessWithOverlay')
    expect(source).not.toContain('overlayStore')
    expect(source).toContain('runWithAgentDock')
    expect(source).toContain("title: 'Script Agent'")
  })

  it('reports cinematic keyframes into the Frame Agent dock', () => {
    const source = readSource(KEYFRAMES)

    expect(source).not.toContain('useProcessWithOverlay')
    expect(source).not.toContain('overlayStore')
    expect(source).toContain('runWithAgentDock')
    expect(source).toContain('startAgentRun')
    expect(source).toContain("title: 'Frame Agent'")
  })

  it('reports mixer cloud and headless renders into a Scene render dock', () => {
    const cloud = readHandler(MIXER, 'const handleRender = useCallback(async () => {')
    const headless = readHandler(MIXER, 'const handleHeadlessRender = useCallback(async () => {')

    for (const handler of [cloud, headless]) {
      expect(handler).not.toContain('overlayStore.show')
      expect(handler).toContain('startAgentRun')
      expect(handler).toContain("title: 'Scene render'")
      expect(handler).toContain('keepTabOpen: true')
    }
  })

  it('still freezes the tab for browser-local mixer encode', () => {
    const handler = readHandler(MIXER, 'const handleLocalRender = useCallback(async () => {')

    expect(handler).toContain('overlayStore.show')
    expect(handler).toContain("'video-generation'")
    expect(handler).not.toContain('startAgentRun')
  })

  it('freezes only the first beat build and docks regenerate', () => {
    const manager = readSource(MANAGER)
    const initialize = readHandler(MANAGER, 'const handleInitialize = async () => {')
    const bypass = readHandler(MANAGER, 'const handleBypass = async () => {')

    expect(manager).toContain('GeneratingOverlay')
    expect(manager).toContain('freezeFirstBeats')
    expect(initialize).toContain('startAgentRun')
    expect(initialize).toContain('setFreezeFirstBeats(true)')
    expect(bypass).not.toContain('setFreezeFirstBeats')
    expect(bypass).not.toContain('startAgentRun')
  })

  it('casts, enhances portraits, and generates objects without GeneratingOverlay', () => {
    const objects = readSource('src/components/vision/ObjectSuggestionPanel.tsx')
    const cast = readSource('src/components/vision/AddCharacterModal.tsx')
    const library = readSource('src/components/vision/CharacterLibrary.tsx')
    const dialogueCard = readSource('src/components/vision/scene-production/SegmentDialogueCard.tsx')

    expect(objects).not.toContain('GeneratingOverlay')
    expect(objects).toContain('startAgentRun')
    expect(cast).not.toContain('useOverlayStore')
    expect(cast).toContain('startAgentRun')
    expect(library).not.toContain('useOverlayStore')
    expect(library).toContain('startAgentRun')
    expect(dialogueCard).not.toContain('overlayStore')
  })
})

describe('useAgentRunStore', () => {
  beforeEach(() => {
    useAgentRunStore.setState({ runs: [] })
  })

  it('starts a run as running and finishes it as success', () => {
    startAgentRun({ id: 'frame-1', title: 'Frame', itemLabel: 'Scene 1' })

    const started = useAgentRunStore.getState().runs[0]
    expect(started?.finished).toBe(false)
    expect(started?.tone).toBe('running')

    finishAgentRun('frame-1')
    const finished = useAgentRunStore.getState().runs[0]
    expect(finished?.finished).toBe(true)
    expect(finished?.tone).toBe('success')
    expect(finished?.progressPct).toBe(100)
  })

  it('marks the dock failed when runWithAgentDock rejects', async () => {
    await expect(
      runWithAgentDock(
        { id: 'script-optimize', title: 'Script Agent', itemLabel: 'Scene 1' },
        async () => {
          throw new Error('rewrite failed')
        }
      )
    ).rejects.toThrow('rewrite failed')

    const run = useAgentRunStore.getState().runs[0]
    expect(run?.finished).toBe(true)
    expect(run?.tone).toBe('error')
    expect(run?.subtitle).toBe('rewrite failed')
  })

  it('keeps an item error when finishing a mixed run', () => {
    startAgentRun({
      id: 'batch',
      title: 'Object Agent',
      items: [
        { key: 'a', label: 'Watch', status: 'done' },
        { key: 'b', label: 'Key', status: 'error', error: 'quota' },
      ],
    })
    finishAgentRun('batch')

    const run = useAgentRunStore.getState().runs[0]
    expect(run?.tone).toBe('warning')
    expect(run?.items.find((item) => item.key === 'b')?.status).toBe('error')
  })

  it('failAgentRun settles every running row', () => {
    startAgentRun({
      id: 'cast',
      title: 'Cast',
      items: [{ key: 'primary', label: 'Ana', status: 'running' }],
    })
    failAgentRun('cast', 'network')

    const run = useAgentRunStore.getState().runs[0]
    expect(run?.items[0]?.status).toBe('error')
    expect(run?.finished).toBe(true)
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
