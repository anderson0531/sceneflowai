import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

const CONSOLE = 'src/components/vision/scene-production/DirectorConsoleImpl.tsx'
const GALLERY = 'src/components/vision/scene-production/BeatVideoGallery.tsx'
const PANEL = 'src/components/vision/ScriptPanel.tsx'

describe('clip and still controls stay on separate paths', () => {
  it('toasts when Generate Clip cannot find the segment and still calls the video dialog', () => {
    const source = readSource(CONSOLE)
    const start = source.indexOf('onGenerateClip={(segment)')
    const end = source.indexOf('generatingStillBeatId', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const handler = source.slice(start, end)
    expect(handler).toContain('handleGenerateFromDialog')
    expect(handler).toContain('This clip is not in the video queue.')
    expect(handler).not.toContain('onRegenerateBeatStill')
    expect(handler).not.toContain('handleGenerateBeatFrameImage')
  })

  it('keeps still regen on the beat-frame handler', () => {
    const consoleSrc = readSource(CONSOLE)
    const panel = readSource(PANEL)
    expect(consoleSrc).toContain('onRegenerateStill={')
    expect(consoleSrc).toContain('onRegenerateBeatStill(beatId)')
    expect(panel).toContain('onGenerateBeatFrame(sceneIdx, beatId)')
  })

  it('labels the video card clip and start frame as different actions', () => {
    const gallery = readSource(GALLERY)
    expect(gallery).toContain('Generate video')
    expect(gallery).toContain('Regenerate video')
    expect(gallery).toContain('Start frame')
    expect(gallery).toContain('Generate start frame')
    expect(gallery).toContain('Regenerate start frame')
  })
})
