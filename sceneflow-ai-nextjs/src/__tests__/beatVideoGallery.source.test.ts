import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

const GALLERY = 'src/components/vision/scene-production/BeatVideoGallery.tsx'
const FRAMES = 'src/components/vision/SceneStoryboardFrameViewer.tsx'
const CONSOLE = 'src/components/vision/scene-production/DirectorConsoleImpl.tsx'

function expectScrollableBeatPanel(source: string, label: string) {
  const stage = readSource('src/components/vision/scene-production/SceneBeatStage.tsx')
  expect(source).toContain('SceneBeatStage')
  expect(source).toContain(`railLabel="${label}"`)
  expect(stage).toContain('aria-label={railLabel}')
  expect(stage).toContain('max-h-[40vh]')
  expect(stage).toContain('lg:max-h-[min(72vh,40rem)]')
  expect(stage).toContain('overflow-y-auto')
  expect(stage).toContain('grid grid-cols-2 content-start gap-2')
  expect(source).toContain('sticky top-2')
  expect(source).not.toContain('absolute left-0 top-0 bottom-0')
  expect(source).not.toContain('ml-[calc(30%+0.75rem)]')
}

describe('Video tab inline clip preview', () => {
  it('plays the selected complete clip in the preview pane instead of onPlay', () => {
    const gallery = readSource(GALLERY)
    expect(gallery).toContain('<video')
    expect(gallery).toContain('previewVideoUrl')
    expect(gallery).toContain('listPlayableTakes')
    expect(gallery).toContain('onRestoreTake')
    expect(gallery).toContain('Restore version')
    expect(gallery).toContain('togglePreviewPlayback')
    expect(gallery).toContain('Clip preview')
    expect(gallery).not.toContain('previewComplete &&')
    expect(gallery).toContain("aria-label={isPreviewPlaying ? 'Pause clip preview' : 'Play clip preview'}")
    expect(gallery).not.toContain("from 'lucide-react''")
    expect(gallery).toContain("from 'lucide-react'")
  })

  it('scrolls beat cards in a panel beside a sticky preview', () => {
    expectScrollableBeatPanel(readSource(GALLERY), 'Beat clips')
    expectScrollableBeatPanel(readSource(FRAMES), 'Beat frames')
  })

  it('opens Screening Room Video for the scene instead of SceneVideoPlayer', () => {
    const consoleSrc = readSource(CONSOLE)
    const frames = readSource(FRAMES)
    expect(consoleSrc).toContain('Play Scene')
    expect(consoleSrc).toContain('onPlayScene')
    expect(consoleSrc).not.toContain('<SceneVideoPlayer')
    expect(consoleSrc).not.toContain('Play Beats')
    expect(frames).toContain('Play Pre-Vis')
    expect(frames).toContain('onPlayPreVis')
  })
})
