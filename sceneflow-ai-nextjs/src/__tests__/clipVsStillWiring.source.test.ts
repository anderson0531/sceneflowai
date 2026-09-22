import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

const CONSOLE = 'src/components/vision/scene-production/DirectorConsoleImpl.tsx'
const GALLERY = 'src/components/vision/scene-production/BeatVideoGallery.tsx'
const PANEL = 'src/components/vision/ScriptPanel.tsx'
const FRAME = 'src/components/vision/SceneImageFrame.tsx'

describe('clip and still controls stay on separate paths', () => {
  it('toasts when Generate Clip cannot find the segment and still calls the video dialog', () => {
    const source = readSource(CONSOLE)
    const start = source.indexOf('onGenerateClip={(segment)')
    const end = source.indexOf('generatingClipId', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const handler = source.slice(start, end)
    expect(handler).toContain('handleGenerateFromDialog')
    expect(handler).toContain('This clip is not in the video queue.')
    expect(handler).not.toContain('onRegenerateBeatStill')
    expect(handler).not.toContain('handleGenerateBeatFrameImage')
  })

  it('wires the video overlay to clip generate, the video dialog, and video edit', () => {
    const consoleSrc = readSource(CONSOLE)
    const gallery = readSource(GALLERY)
    const panel = readSource(PANEL)
    expect(consoleSrc).toContain('onDirectVideo={(segment) => handleRequestTake(segment, false)}')
    expect(consoleSrc).toContain('onDirection={(segment) => handleRequestTake(segment, true)}')
    expect(consoleSrc).toContain('onEditClip={(segment) => setEditingVideoSegment(segment)}')
    expect(consoleSrc).not.toContain('onRegenerateBeatStill')
    expect(consoleSrc).not.toContain('onDirectBeatStill')
    expect(gallery).toContain('directTitle="Direct Video"')
    expect(gallery).toContain('directorTitle="Direction"')
    expect(gallery).toContain('uploadAccept="video/*"')
    expect(gallery).toContain('onGenerateClip?.(previewSegment)')
    expect(gallery).not.toContain('onRegenerateStill')
    expect(gallery).not.toContain('onUploadStill')
    const workflowStart = panel.indexOf('<DirectorWorkflow')
    const workflowEnd = panel.indexOf('scene={{', workflowStart)
    const workflow = panel.slice(workflowStart, workflowEnd)
    expect(workflow).not.toContain('onGenerateBeatFrame')
    expect(workflow).not.toContain('onDirectFrame')
    expect(workflow).not.toContain('onUploadBeatFrame')
  })

  it('labels the video card clip and start frame as different actions', () => {
    const gallery = readSource(GALLERY)
    expect(gallery).toContain('Generate video')
    expect(gallery).toContain('Regenerate video')
    expect(gallery).toContain('Start frame')
    expect(gallery).toContain('Direct Video')
    expect(gallery).toContain('Direction')
    expect(gallery).not.toContain('Generate start frame')
    expect(gallery).not.toContain('Regenerate start frame')
  })

  it('keeps Pre-Vis overlay defaults on Direct Frame and Director', () => {
    const frame = readSource(FRAME)
    expect(frame).toContain("title={generateBlockedReason || directTitle || 'Direct Frame'}")
    expect(frame).toContain("title={generateBlockedReason || directorTitle || 'Director'}")
    expect(frame).toContain("uploadAccept = 'image/*'")
  })
})
