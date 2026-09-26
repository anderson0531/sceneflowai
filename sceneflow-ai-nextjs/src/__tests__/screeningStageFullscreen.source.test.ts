import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('Screening Room stage fullscreen', () => {
  const player = readSource('src/components/vision/AudioGalleryPlayer.tsx')

  it('fullscreens the view stage and keeps the scene title out of that element', () => {
    expect(player).toContain(
      'const target = screeningLayout ? screeningStageRef.current : containerRef.current'
    )
    expect(player).toContain('setScreeningStageFullscreen(current === screeningStageRef.current)')
    expect(player).toContain('setIsFullscreen(!screeningLayout && !!current)')
    expect(player).toContain('h-screen max-h-none max-w-none w-screen')
    expect(player).toContain('fillScreen={screeningStageFullscreen}')
    expect(player).toContain('aria-label="Exit fullscreen"')
    expect(player).toContain('group-hover:opacity-100')

    const stageStart = player.indexOf('ref={screeningStageRef}')
    const stage = player.slice(stageStart, player.indexOf('min-w-[260px]', stageStart))
    expect(stage).toContain('screeningStageFullscreen')
    expect(stage).not.toContain('PreVisSceneInfoPanel')
    expect(stage).not.toContain('variant="fullscreen"')

    // Gallery / share fullscreen still shows the title under the picture.
    expect(player).toContain('variant="fullscreen"')
  })

  it('lets Rough Cut fill the stage and hides its always-on chrome', () => {
    const preview = readSource('src/components/vision/scene-production/ScenePreviewPlayer.tsx')
    const beats = readSource('src/components/vision/scene-production/ScreeningBeatPreview.tsx')
    expect(beats).toContain('fillScreen={fillScreen}')
    expect(preview).toContain('fillScreen?: boolean')
    expect(preview).toContain('opacity-0 hover:opacity-100')
    const badges = preview.slice(
      preview.indexOf('{!fillScreen && ('),
      preview.indexOf('{/* Text Overlays')
    )
    expect(badges).toContain('Seg {activeSegmentIndex + 1}')
    const bar = preview.slice(
      preview.lastIndexOf('{!fillScreen && ('),
      preview.indexOf('Hidden Audio Elements')
    )
    expect(bar).toContain('Enter Fullscreen')
    expect(bar).not.toContain('opacity-0 hover:opacity-100')
  })
})
