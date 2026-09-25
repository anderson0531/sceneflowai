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
    expect(viewer).toContain('BEAT_STAGE_STILL_PREVIEW_CLASS')
    const preview = readSource('src/components/vision/scene-production/beatStageStillPreview.ts')
    expect(preview).toContain('w-[70%]')
    const frame = readSource('src/components/vision/SceneImageFrame.tsx')
    expect(frame).toContain('BEAT_STAGE_STILL_PREVIEW_CLASS')
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

  it('keeps the direction board free of direction inputs', () => {
    const editor = readSource('src/components/vision/BeatDirectionEditor.tsx')
    expect(editor).toContain('Direct Beat')
    expect(editor).toContain('No direction yet. Use Direct Beat to describe the shot.')
    expect(editor).toContain('Beat description')
    expect(editor).toContain('text-amber-400/80')
    expect(editor).not.toContain('<input')
    expect(editor).not.toContain('<select')
    expect(editor).not.toContain('<textarea')
    const dialog = readSource('src/components/vision/BeatDirectorDialog.tsx')
    expect(dialog).toContain('<input')
    expect(dialog).toContain('<select')
    expect(dialog).toContain('DictationTextarea')
    expect(dialog).toContain('cameraMovement')
  })
})
