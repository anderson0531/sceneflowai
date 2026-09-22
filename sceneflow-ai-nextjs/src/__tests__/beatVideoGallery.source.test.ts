import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

const GALLERY = 'src/components/vision/scene-production/BeatVideoGallery.tsx'
const CONSOLE = 'src/components/vision/scene-production/DirectorConsoleImpl.tsx'

describe('Video tab inline clip preview', () => {
  it('plays the selected complete clip in the preview pane instead of onPlay', () => {
    const gallery = readSource(GALLERY)
    expect(gallery).toContain('<video')
    expect(gallery).toContain('previewVideoUrl')
    expect(gallery).toContain('togglePreviewPlayback')
    expect(gallery).toContain('Clip preview')
    expect(gallery).toContain("aria-label={isPreviewPlaying ? 'Pause clip preview' : 'Play clip preview'}")
    expect(gallery).not.toContain('onPlay(previewSegment)')
    expect(gallery).not.toContain('onClick={() => onPlay(')
  })

  it('keeps sequential Play Beats on the SceneVideoPlayer modal', () => {
    const consoleSrc = readSource(CONSOLE)
    expect(consoleSrc).toContain('Play Beats ({statusCounts.rendered})')
    expect(consoleSrc).toContain('setIsScenePlayerOpen(true)')
    expect(consoleSrc).toContain('<SceneVideoPlayer')
  })
})
