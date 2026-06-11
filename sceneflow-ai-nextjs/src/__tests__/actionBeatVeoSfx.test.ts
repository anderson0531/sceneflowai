import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildVeoActionBeatSfxPrompt,
  buildVeoSfxPrompt,
  distillActionBeatAudioCue,
} from '@/lib/sfx/veoSfx'
import {
  extractOperationId,
  isTransientVertexError,
  withVeoSfxRetries,
} from '@/lib/sfx/veoSfxRetry'
import {
  resolveBeatSfxSlot,
  upsertBeatSfxCueOnScene,
} from '@/lib/script/deriveSfxFromSceneContent'

const elaraCoffeeAction =
  'WIDE SHOT: Elara pushes back from her desk, knocking over her coffee mug. The mug rolls across the pristine floor, spilling a dark stain. Her posture is rigid, eyes wide, staring blankly at the now-darkened screens. The vastness of her apartment now feels isolating, overwhelming. The coffee stain is stark against the minimalist floor.'

describe('distillActionBeatAudioCue', () => {
  it('strips shot prefix and emotional clauses from Elara coffee-mug action', () => {
    const cue = distillActionBeatAudioCue(elaraCoffeeAction)
    expect(cue.toLowerCase()).toMatch(/mug|coffee|roll|spill|floor|desk/)
    expect(cue).not.toMatch(/WIDE SHOT/i)
    expect(cue).not.toMatch(/feels isolating|overwhelming|staring blankly/i)
  })

  it('normalizes dark stain phrasing for audio context', () => {
    const cue = distillActionBeatAudioCue(elaraCoffeeAction)
    expect(cue.toLowerCase()).not.toContain('dark stain')
    expect(cue.toLowerCase()).toMatch(/liquid|coffee|spreading|spilling/)
  })

  it('prefers inline SFX lines over distilled action prose', () => {
    const action = `${elaraCoffeeAction}\nSFX: ceramic mug clattering on hardwood`
    const cue = distillActionBeatAudioCue(action)
    expect(cue).toContain('ceramic mug clattering on hardwood')
    expect(cue).not.toMatch(/WIDE SHOT/i)
  })
})

describe('buildVeoActionBeatSfxPrompt', () => {
  const action =
    'MEDIUM SHOT: Elara stands, stretching gracefully. Her movements are captured by several discreet wall-mounted cameras.'

  it('uses black-frame ambient template instead of full action description', () => {
    const { prompt } = buildVeoActionBeatSfxPrompt(action)
    expect(prompt.toLowerCase()).toContain('solid black frame')
    expect(prompt).not.toContain('MEDIUM SHOT: Elara stands')
    expect(prompt.toLowerCase()).toContain('continuous ambient sound design only')
  })

  it('includes distilled audio cue in the prompt', () => {
    const { prompt } = buildVeoActionBeatSfxPrompt(elaraCoffeeAction)
    expect(prompt.toLowerCase()).toContain('solid black frame')
    expect(prompt.toLowerCase()).toMatch(/mug|coffee|roll|spill/)
    expect(prompt).not.toContain('feels isolating')
  })

  it('reuses speech/music negative prompt', () => {
    const ambient = buildVeoSfxPrompt('rain')
    const actionBeat = buildVeoActionBeatSfxPrompt(action)
    expect(actionBeat.negativePrompt).toBe(ambient.negativePrompt)
  })

  it('sanitizes known trigger words in the audio cue', () => {
    const { prompt } = buildVeoActionBeatSfxPrompt(
      'CLOSE SHOT: A bloody knife falls to the tile floor with a clang.'
    )
    expect(prompt.toLowerCase()).not.toContain('bloody')
    expect(prompt.toLowerCase()).toMatch(/stained|crimson|marked|knife|floor|clang/)
  })
})

describe('resolveBeatSfxSlot', () => {
  const beat = {
    beatId: 'bt_elara',
    kind: 'action' as const,
    actionDescription:
      'MEDIUM SHOT: Elara stands, stretching gracefully in a meticulously designed stage apartment.',
  }

  it('finds existing cue by sourceBeatId', () => {
    const scene = {
      sfx: [
        { description: 'camera whir', sourceBeatId: 'bt_other', sfxId: 'sfx_a' },
        { description: 'stage ambience', sourceBeatId: 'bt_elara', sfxId: 'sfx_b' },
      ],
    }
    const slot = resolveBeatSfxSlot(scene, beat)
    expect(slot.sfxIndex).toBe(1)
    expect(slot.sfxId).toBe('sfx_b')
    expect(slot.created).toBe(false)
  })

  it('appends a new cue when beat has no slot', () => {
    const scene = { sfx: [] as unknown[] }
    const slot = resolveBeatSfxSlot(scene, beat)
    expect(slot.sfxIndex).toBe(0)
    expect(slot.created).toBe(true)
    expect(slot.sourceBeatId).toBe('bt_elara')
    expect(slot.description).toContain('Elara stands')
  })

  it('upsertBeatSfxCueOnScene mutates scene.sfx when created', () => {
    const scene: Record<string, unknown> = { sfx: [] }
    const slot = upsertBeatSfxCueOnScene(scene, beat)
    expect(slot.created).toBe(true)
    expect(Array.isArray(scene.sfx)).toBe(true)
    expect((scene.sfx as unknown[]).length).toBe(1)
    expect((scene.sfx as Array<{ sourceBeatId?: string }>)[0].sourceBeatId).toBe('bt_elara')
  })
})

describe('veoSfxRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('detects high load errors as transient', () => {
    expect(
      isTransientVertexError(
        'The service is currently experiencing high load and cannot process your request. Operation ID: 97c042c4-ba76-4c04-9383-40ecd1cfbd68.'
      )
    ).toBe(true)
    expect(isTransientVertexError('Content was filtered by safety policies')).toBe(false)
  })

  it('extracts operation id from error message', () => {
    expect(
      extractOperationId(
        'high load Operation ID: 97c042c4-ba76-4c04-9383-40ecd1cfbd68'
      )
    ).toBe('97c042c4-ba76-4c04-9383-40ecd1cfbd68')
  })

  it('retries transient failures then succeeds', async () => {
    let calls = 0
    const promise = withVeoSfxRetries(async () => {
      calls++
      if (calls < 2) {
        throw new Error('high load — try again later')
      }
      return 'ok'
    })

    await vi.advanceTimersByTimeAsync(5_000)
    await expect(promise).resolves.toBe('ok')
    expect(calls).toBe(2)
    vi.useRealTimers()
  })
})
