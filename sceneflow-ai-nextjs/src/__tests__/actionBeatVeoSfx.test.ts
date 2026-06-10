import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildVeoActionBeatSfxPrompt,
  buildVeoSfxPrompt,
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

describe('buildVeoActionBeatSfxPrompt', () => {
  const action =
    'MEDIUM SHOT: Elara stands, stretching gracefully. Her movements are captured by several discreet wall-mounted cameras.'

  it('includes the full action description', () => {
    const { prompt } = buildVeoActionBeatSfxPrompt(action)
    expect(prompt).toContain('MEDIUM SHOT: Elara stands')
  })

  it('adds audio guardrails and does not use black-frame ambient template', () => {
    const { prompt } = buildVeoActionBeatSfxPrompt(action)
    expect(prompt.toLowerCase()).toContain('native ambient sound')
    expect(prompt.toLowerCase()).toContain('no spoken dialogue')
    expect(prompt.toLowerCase()).not.toContain('solid black frame')
  })

  it('reuses speech/music negative prompt', () => {
    const ambient = buildVeoSfxPrompt('rain')
    const actionBeat = buildVeoActionBeatSfxPrompt(action)
    expect(actionBeat.negativePrompt).toBe(ambient.negativePrompt)
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
