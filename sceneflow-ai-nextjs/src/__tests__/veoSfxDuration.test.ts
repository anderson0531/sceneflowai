import { describe, it, expect } from 'vitest'
import { buildVeoSfxPrompt } from '@/lib/sfx/veoSfx'
import {
  resolveAutoVeoSfxDuration,
  resolveVeoSfxClipDuration,
  resolveVeoSfxDuration,
  resolveVeoSfxTargetSeconds,
  veoSfxCoversFullBeat,
} from '@/lib/sfx/veoSfxDuration'

describe('veoSfxDuration', () => {
  it('snaps 5s target to 4s clip', () => {
    expect(resolveVeoSfxClipDuration(5)).toBe(4)
  })

  it('snaps 10s segment auto to 8s clip (cap)', () => {
    expect(resolveVeoSfxDuration({ segmentDurationSeconds: 10, override: 'auto' })).toBe(8)
  })

  it('snaps 6s segment to 6s clip', () => {
    expect(resolveVeoSfxDuration({ segmentDurationSeconds: 6, override: 'auto' })).toBe(6)
  })

  it('maps short preset to 4s', () => {
    expect(resolveVeoSfxDuration({ override: 'short' })).toBe(4)
  })

  it('maps medium preset to 8s', () => {
    expect(resolveVeoSfxDuration({ override: 'medium' })).toBe(8)
  })

  it('maps long preset to 8s (Veo max)', () => {
    expect(resolveVeoSfxDuration({ override: 'long' })).toBe(8)
  })

  it('resolveAutoVeoSfxDuration uses segment when provided', () => {
    expect(resolveAutoVeoSfxDuration(7)).toBe(6)
  })

  it('resolveVeoSfxTargetSeconds preserves raw beat length for hints', () => {
    expect(resolveVeoSfxTargetSeconds({ segmentDurationSeconds: 12, override: 'auto' })).toBe(12)
  })

  it('veoSfxCoversFullBeat is false when beat exceeds 8s', () => {
    expect(veoSfxCoversFullBeat(12, 'auto')).toBe(false)
  })

  it('veoSfxCoversFullBeat is true when beat is within 8s', () => {
    expect(veoSfxCoversFullBeat(6, 'auto')).toBe(true)
  })
})

describe('buildVeoSfxPrompt', () => {
  it('includes the cue description', () => {
    const { prompt } = buildVeoSfxPrompt('rain on tin roof')
    expect(prompt).toContain('rain on tin roof')
  })

  it('forbids dialogue and music in prompt and negative prompt', () => {
    const { prompt, negativePrompt } = buildVeoSfxPrompt('office HVAC hum')
    expect(prompt.toLowerCase()).toContain('no dialogue')
    expect(prompt.toLowerCase()).toContain('no music')
    expect(negativePrompt).toContain('dialogue')
    expect(negativePrompt).toContain('music')
    expect(negativePrompt).toContain('speech')
  })

  it('uses minimal visual anchor for ambient mode', () => {
    const { prompt } = buildVeoSfxPrompt('wind through trees')
    expect(prompt.toLowerCase()).toContain('black')
  })
})
