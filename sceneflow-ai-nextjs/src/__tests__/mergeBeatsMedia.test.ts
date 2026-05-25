import { describe, it, expect } from 'vitest'
import { mergeScenePreservingMedia } from '@/lib/storyboard/mergeSceneMedia'

describe('mergeScenePreservingMedia beats', () => {
  it('preserves beat storyboardImageUrl when incoming beat omits it', () => {
    const canonical = {
      beats: [
        {
          beatId: 'bt_1',
          kind: 'dialogue',
          storyboardImageUrl: 'https://example.com/saved.jpg',
        },
      ],
    }
    const incoming = {
      beats: [{ beatId: 'bt_1', kind: 'dialogue', line: 'Updated line' }],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.beats[0].storyboardImageUrl).toBe('https://example.com/saved.jpg')
    expect(merged.beats[0].line).toBe('Updated line')
  })
})
