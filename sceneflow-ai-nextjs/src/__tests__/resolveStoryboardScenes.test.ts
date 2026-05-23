import { describe, it, expect } from 'vitest'
import { resolveStoryboardScenes } from '@/lib/storyboard/resolveStoryboardScenes'

describe('resolveStoryboardScenes', () => {
  it('merges imageUrl from legacy visionPhase.scenes into script.script.scenes', () => {
    const script = {
      script: {
        scenes: [
          { id: 's1', imageUrl: 'https://example.com/s1.png', dialogue: [] },
          { id: 's2', dialogue: [] },
        ],
      },
    }
    const visionPhaseScenes = [
      { id: 's1', imageUrl: 'https://example.com/s1.png', dialogue: [] },
      { id: 's2', imageUrl: 'https://example.com/s2.png', dialogue: [] },
    ]

    const resolved = resolveStoryboardScenes({ script, visionPhaseScenes })
    expect(resolved).toHaveLength(2)
    expect(resolved[0].imageUrl).toBe('https://example.com/s1.png')
    expect(resolved[1].imageUrl).toBe('https://example.com/s2.png')
  })

  it('uses pre-merged scenes array from shared API when provided', () => {
    const scenes = [{ id: 's1', imageUrl: 'https://example.com/shared.png', dialogue: [] }]
    const resolved = resolveStoryboardScenes({
      script: { script: { scenes: [] } },
      scenes,
    })
    expect(resolved).toEqual(scenes)
  })
})
