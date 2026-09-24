import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), 'utf8')
}

describe('on-demand status filters', () => {
  const bar = readSource('src/components/vision/StatusFilterBar.tsx')

  it('keeps the options in a popover and aligns each count', () => {
    expect(bar).toContain('Popover')
    expect(bar).toContain('>Filters<')
    expect(bar).toContain('Clear filters')
    expect(bar).toContain('h-7 w-full')
    expect(bar).toContain('w-8 shrink-0 text-center tabular-nums')
    expect(bar).toContain('chip.tooltip')
    expect(bar).toContain('TooltipContent')
  })

  it('explains every Beats, Pre-Vis, and Video option', () => {
    const beats = readSource('src/components/vision/scene-production/SceneAudioWorkbench.tsx')
    const frames = readSource('src/components/vision/SceneStoryboardFrameViewer.tsx')
    const video = readSource('src/components/vision/scene-production/BeatVideoGallery.tsx')

    for (const source of [beats, frames, video]) {
      expect(source).toContain('StatusFilterBar')
      expect(source).toContain('activeSummary')
      expect(source).toContain('tooltip:')
    }

    expect(beats).toContain('Beats whose prompt changed after the last render.')
    expect(beats).toContain('Lines spoken by this character.')
    expect(frames).toContain('Frames with no image yet.')
    expect(frames).toContain('Frames still using a stand-in image.')
    expect(video).toContain('Clips that finished rendering.')
    expect(video).toContain('Clips whose pre-vis frame is a draft.')
  })
})
