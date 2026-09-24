import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), 'utf8')
}

describe('shared scene beat stage', () => {
  const panel = readSource('src/components/vision/ScriptPanel.tsx')
  const direction = readSource('src/components/vision/scene-production/SceneDirectionWorkbench.tsx')
  const audio = readSource('src/components/vision/scene-production/SceneAudioWorkbench.tsx')

  it('labels the beats tab Audio and keeps the beats tab id', () => {
    expect(panel).toContain('Audio')
    expect(panel).toContain('value="beats"')
    expect(panel).not.toMatch(/>\s*Beats\s*</)
  })

  it('starts the still viewer and scene description closed', () => {
    const viewer = readSource('src/components/vision/scene-production/BeatStillClipViewer.tsx')
    expect(viewer).toContain('useState(false)')
    expect(viewer).toContain('Show still')
    expect(viewer).toContain('Hide')
    expect(viewer).toContain('max-w-md')
    expect(viewer).toContain('object-contain')
    expect(viewer).toContain("aria-label={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}")
    expect(direction).toContain('BeatStillClipViewer')
    expect(direction).toContain('useState(false)')
    expect(direction).toContain('Show scene description')
    expect(audio).toContain('BeatStillClipViewer')
  })

  it('mounts beat direction on Direction and not on Audio', () => {
    expect(direction).toContain('BeatDirectionEditor')
    expect(direction).toContain('layout="board"')
    expect(audio).not.toContain('BeatDirectionEditor')
    expect(panel).toContain('SceneDirectionWorkbench')
    expect(panel).toContain('SceneAudioWorkbench')
    expect(panel).toContain('selectedBeatId')
  })
})
