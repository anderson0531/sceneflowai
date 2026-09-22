import { readFileSync } from 'fs'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canOptimizePlayerStill,
  playerStageSizes,
  resetPlayerStillWarnings,
  selectPlayerPreloadUrls,
  warnUnoptimizedPlayerStill,
  PLAYER_FULLSCREEN_STAGE_SIZES,
  PLAYER_GALLERY_STAGE_SIZES,
  PLAYER_SCREENING_STAGE_SIZES,
  PLAYER_SHARE_STAGE_SIZES,
  PLAYER_THUMBNAIL_HEIGHT,
  PLAYER_THUMBNAIL_WIDTH,
} from '@/lib/storyboard/playerStillSource'

const root = process.cwd()

function readSource(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

describe('canOptimizePlayerStill', () => {
  it('accepts the hosts next.config lists for remote images', () => {
    expect(
      canOptimizePlayerStill('https://abc123.public.blob.vercel-storage.com/scene/still.jpeg')
    ).toBe(true)
    expect(canOptimizePlayerStill('https://storage.googleapis.com/bucket/still.png')).toBe(true)
    expect(canOptimizePlayerStill('https://lh3.googleusercontent.com/still')).toBe(true)
  })

  it('rejects sources the optimizer would serve broken', () => {
    // Legacy projects stored stills inline; the optimizer cannot touch these.
    expect(canOptimizePlayerStill('data:image/png;base64,iVBORw0KGgo=')).toBe(false)
    expect(canOptimizePlayerStill('blob:https://sceneflowai.studio/9f0c')).toBe(false)
    expect(canOptimizePlayerStill('https://cdn.example.com/still.jpg')).toBe(false)
    expect(canOptimizePlayerStill('/scene/still.jpg')).toBe(false)
    expect(canOptimizePlayerStill('')).toBe(false)
    expect(canOptimizePlayerStill(undefined)).toBe(false)
  })
})

describe('playerStageSizes', () => {
  it('matches the box each player actually draws', () => {
    expect(
      playerStageSizes({ isFullscreen: true, screeningLayout: true, sharedOrEmbed: true })
    ).toBe(PLAYER_FULLSCREEN_STAGE_SIZES)
    expect(
      playerStageSizes({ isFullscreen: false, screeningLayout: true, sharedOrEmbed: false })
    ).toBe(PLAYER_SCREENING_STAGE_SIZES)
    expect(
      playerStageSizes({ isFullscreen: false, screeningLayout: false, sharedOrEmbed: true })
    ).toBe(PLAYER_SHARE_STAGE_SIZES)
    expect(
      playerStageSizes({ isFullscreen: false, screeningLayout: false, sharedOrEmbed: false })
    ).toBe(PLAYER_GALLERY_STAGE_SIZES)
  })
})

describe('selectPlayerPreloadUrls', () => {
  it('takes the first three distinct stills from the playhead', () => {
    expect(
      selectPlayerPreloadUrls([
        'https://cdn/a.jpg',
        ' https://cdn/a.jpg ',
        'https://cdn/b.jpg',
        undefined,
        'https://cdn/c.jpg',
        'https://cdn/d.jpg',
      ])
    ).toEqual(['https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg'])
  })
})

describe('warnUnoptimizedPlayerStill', () => {
  afterEach(() => {
    resetPlayerStillWarnings()
    vi.restoreAllMocks()
  })

  it('warns once per kind rather than once per frame', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warnUnoptimizedPlayerStill('data:image/png;base64,iVBORw0KGgo=')
    warnUnoptimizedPlayerStill('data:image/png;base64,other')
    expect(warn).toHaveBeenCalledTimes(1)

    warnUnoptimizedPlayerStill('https://cdn.example.com/still.jpg')
    expect(warn).toHaveBeenCalledTimes(2)
  })
})

describe('the player decodes stills at the size it draws them', () => {
  const player = readSource('src/components/vision/AudioGalleryPlayer.tsx')

  it('draws both scene strips through a sized thumbnail', () => {
    expect(player).toContain("import NextImage from 'next/image'")
    expect(player).toContain('const SceneStrip = React.memo')
    expect(player).toContain('const sceneStripEntries = useMemo')
    expect(player).toContain('size="screening"')
    expect(player).toContain('size="gallery"')
    expect(player).toContain('<SceneStripThumbnail url={entry.thumbUrl}')
    expect(player).not.toContain('<img src={thumbUrl}')
    expect(player).not.toMatch(/<img\s+src=\{thumbUrl\}/)

    const thumbnail = player.slice(
      player.indexOf('function SceneStripThumbnail'),
      player.indexOf('function resolveSceneVideoUrl')
    )
    expect(thumbnail).toContain('width={PLAYER_THUMBNAIL_WIDTH}')
    expect(thumbnail).toContain('height={PLAYER_THUMBNAIL_HEIGHT}')
    // A thumbnail decode has to stay far below a full still's megabytes.
    expect(PLAYER_THUMBNAIL_WIDTH * PLAYER_THUMBNAIL_HEIGHT * 4).toBeLessThan(64 * 1024)
  })

  it('sizes the stage still to the box it draws instead of the stored resolution', () => {
    const stage = player.slice(
      player.indexOf('const renderSceneImage ='),
      player.indexOf('/** Public share / landing embed')
    )
    expect(stage).toContain('<NextImage')
    expect(stage).toContain('fill')
    expect(stage).toContain('sizes={stageSizes}')
    expect(stage).not.toContain('sizes="100vw"')
    // Lazy loading the on-screen stage would cost a frame at every beat.
    expect(stage).toContain('loading="eager"')
  })

  it('keeps the crossfade remount, the Ken Burns transform and the fit', () => {
    const stage = player.slice(
      player.indexOf('const renderSceneImage ='),
      player.indexOf('/** Public share / landing embed')
    )
    expect(stage).toContain('key={layerKey}')
    expect(stage).toContain('transform: isPrevious ? undefined : imageTransformCss')
    expect(stage).toContain('galleryCrossfadeOut ${crossfadeDurationMs}ms')
    expect(stage).toContain('galleryCrossfadeIn ${crossfadeDurationMs}ms')
    expect(stage).toContain('className={fitClass}')
  })

  it('renders a still the optimizer cannot resize as a plain img', () => {
    const stage = player.slice(
      player.indexOf('const renderSceneImage ='),
      player.indexOf('/** Public share / landing embed')
    )
    expect(stage).toContain('if (!canOptimizePlayerStill(url)) {')
    expect(stage).toContain('warnUnoptimizedPlayerStill(url)')
    expect(stage).toMatch(/<img\n\s+key=\{layerKey\}/)
  })

  it('stops interpolating a transform the Ken Burns loop already rewrites', () => {
    expect(player).not.toContain('transform 0.1s linear')
    expect(player).toContain("transition: isPrevious || isPlaying ? undefined : 'transform 0.2s ease-out'")
  })
})

describe('playback releases its audio when the page goes away', () => {
  const timeline = readSource('src/hooks/useTimelinePlayback.ts')

  it('cancels the download of a released element', () => {
    expect(timeline).toContain('function releaseAudioElement')
    expect(timeline).toMatch(/audio\.src = ''\n {2}\/\/[^\n]*\n {2}audio\.load\(\)/)
    // Stale clips and unmount both go through the release path.
    expect(timeline).toContain('releaseAudioElement(audio)')
    expect(timeline).toContain('dropAudioElement')
    expect(timeline).toContain('releaseAllAudio()')
    expect(timeline).toContain('selectLiveAudioClips')
  })

  it('stops a hidden page and a page that is unloading', () => {
    expect(timeline).toContain("window.addEventListener('pagehide', stopForHiddenPage)")
    expect(timeline).toContain("document.addEventListener('visibilitychange', handleVisibilityChange)")
    expect(timeline).toContain('if (document.hidden) {')

    const teardown = timeline.slice(
      timeline.indexOf('const stopForHiddenPage = () => {'),
      timeline.indexOf('const restoreAudioElements = () => {')
    )
    expect(teardown).toContain('cancelAnimationFrame(animationRef.current)')
    expect(teardown).toContain('releaseAllAudio()')
    expect(teardown).toContain('setIsPlaying(false)')
  })

  it('invalidates in-flight play() promises so audio cannot restart', () => {
    const release = timeline.slice(
      timeline.indexOf('const dropAudioElement = useCallback'),
      timeline.indexOf('const reconcileLiveAudio')
    )
    expect(release).toContain('playGenerationRef.current.set(key,')
  })

  it('rebuilds the elements for a viewer who comes back, without resuming', () => {
    const listeners = timeline.slice(
      timeline.indexOf('const restoreAudioElements = () => {'),
      timeline.indexOf('const handleVisibilityChange = () => {')
    )
    expect(listeners).toContain('reconcileLiveAudio(currentTimeRef.current)')
    expect(timeline).toContain("window.addEventListener('pageshow', restoreAudioElements)")
    expect(timeline).not.toMatch(/document\.hidden[\s\S]{0,200}play\(\)/)
  })

  it('stops the timeline before the player hands control back', () => {
    const player = readSource('src/components/vision/AudioGalleryPlayer.tsx')
    const close = player.slice(
      player.indexOf('const handleClose = useCallback'),
      player.indexOf('const displayImageUrl =')
    )
    expect(close).toContain('pause()')
    expect(close).toContain('reset()')
    expect(close).toContain('onClose?.()')
    expect(player).toContain('onClick={handleClose}')
  })
})
