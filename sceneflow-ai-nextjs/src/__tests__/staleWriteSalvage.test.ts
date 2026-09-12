import { describe, it, expect } from 'vitest'
import { salvageStaleWriteMedia } from '@/lib/storyboard/staleWriteSalvage'

const FRESH_FRAME = 'https://blob.example.com/frames/1779527999999.jpeg'
const STALE_FRAME = 'https://blob.example.com/frames/1779527000000.jpeg'

function scene(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sc_1',
    sceneNumber: 1,
    action: 'The lab hums.',
    ...overrides,
  }
}

function beat(overrides: Record<string, unknown> = {}) {
  return {
    beatId: 'bt_1',
    kind: 'action',
    actionDescription: 'A scientist lifts the sample.',
    ...overrides,
  }
}

describe('salvaging media from a rejected stale write', () => {
  it('adopts a frame the newer script has no copy of', () => {
    const newer = [scene({ beats: [beat()] })]
    const stale = [scene({ beats: [beat({ storyboardImageUrl: STALE_FRAME })] })]

    const result = salvageStaleWriteMedia(newer, stale)

    expect(result.salvaged).toBe(1)
    expect((result.scenes[0] as any).beats[0].storyboardImageUrl).toBe(STALE_FRAME)
    expect(result.fields).toEqual(['scene[sc_1].beat[bt_1].storyboardImageUrl'])
  })

  it('never overwrites a frame the newer script already has', () => {
    const newer = [scene({ beats: [beat({ storyboardImageUrl: FRESH_FRAME })] })]
    const stale = [scene({ beats: [beat({ storyboardImageUrl: STALE_FRAME })] })]

    const result = salvageStaleWriteMedia(newer, stale)

    expect(result.salvaged).toBe(0)
    expect((result.scenes[0] as any).beats[0].storyboardImageUrl).toBe(FRESH_FRAME)
  })

  it('leaves the newer text alone even when the stale side disagrees', () => {
    const newer = [
      scene({
        action: 'The lab hums, newly rewritten.',
        beats: [beat({ storyboardImagePrompt: 'Freshly composed prompt' })],
      }),
    ]
    const stale = [
      scene({
        action: 'The lab hums.',
        beats: [
          beat({
            storyboardImagePrompt: 'Old prompt',
            storyboardImageUrl: STALE_FRAME,
          }),
        ],
      }),
    ]

    const result = salvageStaleWriteMedia(newer, stale)

    const merged = result.scenes[0] as any
    expect(merged.action).toBe('The lab hums, newly rewritten.')
    expect(merged.beats[0].storyboardImagePrompt).toBe('Freshly composed prompt')
    expect(merged.beats[0].storyboardImageUrl).toBe(STALE_FRAME)
  })

  it('does not resurrect a scene the newer script no longer has', () => {
    const newer = [scene()]
    const stale = [scene(), scene({ id: 'sc_2', sceneNumber: 2, imageUrl: STALE_FRAME })]

    const result = salvageStaleWriteMedia(newer, stale)

    expect(result.scenes).toHaveLength(1)
    expect((result.scenes[0] as any).id).toBe('sc_1')
  })

  it('does not resurrect a beat the newer script no longer has', () => {
    const newer = [scene({ beats: [beat()] })]
    const stale = [
      scene({
        beats: [beat(), beat({ beatId: 'bt_2', storyboardImageUrl: STALE_FRAME })],
      }),
    ]

    const result = salvageStaleWriteMedia(newer, stale)

    expect((result.scenes[0] as any).beats).toHaveLength(1)
    expect(result.salvaged).toBe(0)
  })

  it('matches beats by id rather than position, so a reorder still salvages', () => {
    const newer = [scene({ beats: [beat({ beatId: 'bt_2' }), beat({ beatId: 'bt_1' })] })]
    const stale = [
      scene({
        beats: [
          beat({ beatId: 'bt_1', storyboardImageUrl: STALE_FRAME }),
          beat({ beatId: 'bt_2' }),
        ],
      }),
    ]

    const result = salvageStaleWriteMedia(newer, stale)

    const beats = (result.scenes[0] as any).beats
    expect(beats[0].beatId).toBe('bt_2')
    expect(beats[0].storyboardImageUrl).toBeUndefined()
    expect(beats[1].beatId).toBe('bt_1')
    expect(beats[1].storyboardImageUrl).toBe(STALE_FRAME)
  })

  it('salvages scene-level frames and audio', () => {
    const newer = [scene()]
    const stale = [
      scene({
        imageUrl: STALE_FRAME,
        narrationAudioUrl: 'https://blob.example.com/audio/narration.mp3',
        musicUrl: 'https://blob.example.com/audio/music.mp3',
      }),
    ]

    const result = salvageStaleWriteMedia(newer, stale)

    const merged = result.scenes[0] as any
    expect(merged.imageUrl).toBe(STALE_FRAME)
    expect(merged.narrationAudioUrl).toBe('https://blob.example.com/audio/narration.mp3')
    expect(merged.musicUrl).toBe('https://blob.example.com/audio/music.mp3')
    expect(result.salvaged).toBe(3)
  })

  it('salvages a dialogue line frame matched by lineId', () => {
    const newer = [scene({ dialogue: [{ lineId: 'ln_1', character: 'DR. CHEN', line: 'Ready.' }] })]
    const stale = [
      scene({
        dialogue: [
          {
            lineId: 'ln_1',
            character: 'DR. CHEN',
            line: 'Ready.',
            storyboardImageUrl: STALE_FRAME,
          },
        ],
      }),
    ]

    const result = salvageStaleWriteMedia(newer, stale)

    expect((result.scenes[0] as any).dialogue[0].storyboardImageUrl).toBe(STALE_FRAME)
  })

  it('ignores placeholder and empty media values', () => {
    const newer = [scene({ beats: [beat()] })]
    const stale = [
      scene({
        imageUrl: '   ',
        beats: [beat({ storyboardImageUrl: 'deferred' })],
      }),
    ]

    const result = salvageStaleWriteMedia(newer, stale)

    expect(result.salvaged).toBe(0)
    expect(result.scenes[0]).toBe(newer[0])
  })

  it('returns the newer scenes by identity when there is nothing to salvage', () => {
    const newer = [scene({ beats: [beat({ storyboardImageUrl: FRESH_FRAME })] })]
    const stale = [scene({ beats: [beat()] })]

    const result = salvageStaleWriteMedia(newer, stale)

    expect(result.scenes).toBe(newer)
    expect(result.salvaged).toBe(0)
  })

  it('handles a missing or empty side without throwing', () => {
    expect(salvageStaleWriteMedia(undefined, undefined).salvaged).toBe(0)
    expect(salvageStaleWriteMedia([scene()], []).salvaged).toBe(0)
    expect(salvageStaleWriteMedia([], [scene({ imageUrl: STALE_FRAME })]).scenes).toEqual([])
  })

  it('matches id-less scenes and beats by position', () => {
    const newer = [{ sceneNumber: 1, beats: [{ kind: 'action', actionDescription: 'A' }] }]
    const stale = [
      {
        sceneNumber: 1,
        beats: [{ kind: 'action', actionDescription: 'A', storyboardImageUrl: STALE_FRAME }],
      },
    ]

    const result = salvageStaleWriteMedia(newer, stale)

    expect((result.scenes[0] as any).beats[0].storyboardImageUrl).toBe(STALE_FRAME)
  })
})
