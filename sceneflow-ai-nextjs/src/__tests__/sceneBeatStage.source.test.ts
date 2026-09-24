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

  it('mounts beat direction on Direction and not on Audio', () => {
    expect(direction).toContain('BeatDirectionEditor')
    expect(direction).toContain('layout="board"')
    expect(audio).not.toContain('BeatDirectionEditor')
    expect(panel).toContain('SceneDirectionWorkbench')
    expect(panel).toContain('SceneAudioWorkbench')
    expect(panel).toContain('selectedBeatId')
  })
})
