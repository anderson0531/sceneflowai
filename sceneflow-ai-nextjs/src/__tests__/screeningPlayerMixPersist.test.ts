import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { computeFadeOutDuckMultiplier } from '@/lib/storyboard/animaticSceneFade'

const root = process.cwd()

function readSource(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

/** Body of a top-level `const <name> = useCallback(` declaration. */
function readCallbackBody(src: string, name: string, endMarker: string): string {
  const start = src.indexOf(`const ${name} = useCallback(`)
  expect(start, `${name} is not a useCallback`).toBeGreaterThan(-1)
  const end = src.indexOf(endMarker, start)
  expect(end, `${name} does not end with ${endMarker}`).toBeGreaterThan(start)
  return src.slice(start, end)
}

describe('computeFadeOutDuckMultiplier', () => {
  it('holds level until the fade window opens', () => {
    expect(computeFadeOutDuckMultiplier(0, 6, 1)).toBe(1)
    expect(computeFadeOutDuckMultiplier(5, 6, 1)).toBe(1)
  })

  it('ducks in step with the picture going to black', () => {
    expect(computeFadeOutDuckMultiplier(5.5, 6, 1)).toBeCloseTo(0.625)
    expect(computeFadeOutDuckMultiplier(6, 6, 1)).toBeCloseTo(0.25)
  })

  it('stays at level for a frame that cuts away', () => {
    expect(computeFadeOutDuckMultiplier(6, 6, 0)).toBe(1)
  })
})

describe('screening mix persists once per gesture', () => {
  const player = readSource('src/components/vision/AudioGalleryPlayer.tsx')

  it('saves on slider commit rather than on every dragged value', () => {
    // Three sliders (Dialogue, Music, SFX), each committing on release.
    expect(player.match(/onValueCommit=\{commitSceneMix\}/g)).toHaveLength(3)
    expect(player).not.toContain('SCENE_MIX_PERSIST_MS')
    expect(player).not.toContain('setTimeout(() => {\n        persistTimerRef')
  })

  it('does not re-seed the sliders from the value it just saved', () => {
    expect(player).toContain('localMixEditedRef')
    const hydrate = player.slice(player.indexOf('lastHydratedMixKeyRef.current !== key'))
    expect(hydrate.slice(0, hydrate.indexOf('}, ['))).toContain('localMixEditedRef.current')
  })
})

describe('applySceneProductionUpdate runs no side effects inside a setState updater', () => {
  const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
  const body = readCallbackBody(page, 'applySceneProductionUpdate', '[persistSceneProduction]')

  it('reads the current production state from a ref instead of an updater', () => {
    expect(body).toContain('sceneProductionStateRef.current')
    expect(body).toContain('setSceneProductionState(nextState)')
    expect(body).not.toMatch(/setSceneProductionState\(\s*\(prev/)
  })

  it('sets scenes and saves at the top level of the callback', () => {
    // Six spaces is the callback body; a nested updater would indent further.
    expect(body).toContain('\n      setScenes((prevScenes) => {')
    expect(body).toContain('\n      void persistSceneProduction(nextState, sceneId)')
    expect(body).not.toMatch(/\n {8,}void persistSceneProduction\(/)
    expect(body).not.toMatch(/\n {8,}setScenes\(/)
  })

  it('skips the save when the updater returns the value it was given', () => {
    expect(body).toContain('nextSceneData === prev[sceneId]')
  })
})

describe('playback loop keeps per-frame audio work out of React state', () => {
  const storyboard = readSource('src/hooks/useStoryboardPlayback.ts')
  const timeline = readSource('src/hooks/useTimelinePlayback.ts')

  it('applies the fade-to-black duck in the animation loop', () => {
    expect(storyboard).toContain('trackDuck: musicAndSfxDuck')
    expect(timeline).toContain('trackDuck?: (elapsed: number) => number')
    expect(timeline).toContain('trackDuckRef.current?.(elapsed) ?? 1')
  })

  it('writes track volumes only when a level changes', () => {
    const volumeEffect = storyboard.slice(
      storyboard.indexOf("setTrackVolume('voiceover', effectiveDialogueVolume)")
    )
    const deps = volumeEffect.slice(volumeEffect.indexOf('}, ['), volumeEffect.indexOf('])'))
    expect(deps).not.toContain('currentTime')
    expect(deps).not.toContain('visualFrames')
  })

  it('probes clip durations without leaving elements buffering whole files', () => {
    expect(storyboard).toContain('getAudioDuration(url)')
    expect(storyboard).not.toContain('new Audio(')
  })
})

describe('players reuse audio elements across timeline changes', () => {
  const fullscreen = readSource('src/components/vision/FullscreenPlayer.tsx')

  it('releases only the clips that left the timeline', () => {
    const preload = fullscreen.slice(
      fullscreen.indexOf('// Preload audio elements'),
      fullscreen.indexOf('}, [allAudioClips])')
    )
    expect(preload).toContain('liveKeys.has(key)')
    expect(preload).toContain('audioRefs.current.delete(key)')
    expect(preload).not.toContain('audioRefs.current.clear()')
  })

  it('cancels the download of a released element', () => {
    expect(fullscreen).toContain('function releaseAudioElement')
    expect(fullscreen).toMatch(/audio\.src = ''\n {2}\/\/[^\n]*\n {2}audio\.load\(\)/)
  })
})
