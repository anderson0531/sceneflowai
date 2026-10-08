import { describe, expect, it } from 'vitest'
import { runPromoAgent, type PromoAgentShotInput } from '@/lib/publish/runPromoAgent'

const shots: PromoAgentShotInput[] = [
  {
    key: 'a',
    sceneId: 'scene-0',
    beatId: 'a',
    sceneIndex: 0,
    label: 'Existing',
    durationSec: 5,
    frameUrl: 'https://example.com/a.png',
    hasClip: true,
    segmentId: 'seg-a',
  },
  {
    key: 'b',
    sceneId: 'scene-0',
    beatId: 'b',
    sceneIndex: 0,
    label: 'Still only',
    durationSec: 5,
    frameUrl: 'https://example.com/b.png',
    hasClip: false,
  },
  {
    key: 'c',
    sceneId: 'scene-1',
    beatId: 'c',
    sceneIndex: 1,
    label: 'No media',
    durationSec: 6,
    hasClip: false,
    segmentId: 'seg-c',
  },
]

describe('runPromoAgent', () => {
  it('skips finished clips, derives a missing segment, then narrates and scores', async () => {
    const calls: string[] = []
    const result = await runPromoAgent(shots, {
      upsertScene: async () => {
        calls.push('upsert')
      },
      ensureSegment: async (shot) => {
        calls.push(`ensure:${shot.beatId}`)
        return `seg-${shot.beatId}`
      },
      generateClip: async (shot, method, segmentId) => {
        calls.push(`clip:${shot.beatId}:${method}:${segmentId}`)
      },
      generateNarration: async () => {
        calls.push('narration')
      },
      generateMusic: async () => {
        calls.push('music')
      },
      onStatus: () => {},
    })

    expect(result.failed).toBe(0)
    expect(calls[0]).toBe('upsert')
    expect(calls.filter((call) => call.startsWith('ensure:'))).toEqual(['ensure:b'])
    expect(calls).toContain('clip:b:I2V:seg-b')
    expect(calls).toContain('clip:c:T2V:seg-c')
    expect(calls.some((call) => call.includes(':a:'))).toBe(false)
    expect(calls.at(-2)).toBe('narration')
    expect(calls.at(-1)).toBe('music')
  })

  it('still generates narration and music when a clip fails', async () => {
    const calls: string[] = []
    const result = await runPromoAgent(shots, {
      upsertScene: async () => {
        calls.push('upsert')
      },
      ensureSegment: async (shot) => `seg-${shot.beatId}`,
      generateClip: async (shot) => {
        if (shot.beatId === 'b') throw new Error('clip failed')
      },
      generateNarration: async () => {
        calls.push('narration')
      },
      generateMusic: async () => {
        calls.push('music')
      },
      onStatus: () => {},
    })

    expect(result.failed).toBe(1)
    expect(calls).toContain('narration')
    expect(calls).toContain('music')
  })

  it('stops before narration when the promo scene cannot be saved', async () => {
    const calls: string[] = []
    await expect(
      runPromoAgent(shots, {
        upsertScene: async () => {
          throw new Error('save failed')
        },
        ensureSegment: async () => 'seg',
        generateClip: async () => {
          calls.push('clip')
        },
        generateNarration: async () => {
          calls.push('narration')
        },
        generateMusic: async () => {
          calls.push('music')
        },
        onStatus: () => {},
      })
    ).rejects.toThrow('save failed')
    expect(calls).toEqual([])
  })
})
