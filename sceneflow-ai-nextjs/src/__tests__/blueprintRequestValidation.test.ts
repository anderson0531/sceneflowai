import { describe, expect, it } from 'vitest'
import {
  MAX_INTENT_CHARS,
  hasBlockingIssue,
  validateRevisionRequest,
  type RequestIssueCode,
} from '@/lib/treatment/blueprintRequestValidation'
import { parseRequestedRuntimeMinutes } from '@/lib/treatment/duration'

function codes(
  input: Parameters<typeof validateRevisionRequest>[0]
): RequestIssueCode[] {
  return validateRevisionRequest(input).map((i) => i.code)
}

function request(overrides: Partial<Parameters<typeof validateRevisionRequest>[0]> = {}) {
  return {
    intentText: 'Tighten the second act so the midpoint lands harder.',
    focusScope: 'all' as const,
    ...overrides,
  }
}

describe('parseRequestedRuntimeMinutes', () => {
  it('reads minutes', () => {
    expect(parseRequestedRuntimeMinutes('increase the duration to 40 mins')).toBe(40)
    expect(parseRequestedRuntimeMinutes('make it 40 minutes')).toBe(40)
    expect(parseRequestedRuntimeMinutes('make it 40m')).toBe(40)
  })

  it('reads hours', () => {
    expect(parseRequestedRuntimeMinutes('make it 2 hours')).toBe(120)
    expect(parseRequestedRuntimeMinutes('make it 1.5 hr')).toBe(90)
  })

  it('reads seconds', () => {
    expect(parseRequestedRuntimeMinutes('cut it to 90 seconds')).toBe(1.5)
  })

  it('averages a range', () => {
    expect(parseRequestedRuntimeMinutes('somewhere in the 30-40 minute area')).toBe(35)
  })

  it('returns null when no runtime is named', () => {
    expect(parseRequestedRuntimeMinutes('make the villain scarier')).toBeNull()
    expect(parseRequestedRuntimeMinutes('add 8 characters')).toBeNull()
    expect(parseRequestedRuntimeMinutes('')).toBeNull()
    expect(parseRequestedRuntimeMinutes(null)).toBeNull()
  })

  it('does not clamp, so callers can detect out-of-range requests', () => {
    expect(parseRequestedRuntimeMinutes('make it 600 minutes')).toBe(600)
    expect(parseRequestedRuntimeMinutes('make it 10 seconds')).toBeCloseTo(1 / 6)
  })

  it('ignores numbers followed by non-duration words', () => {
    expect(parseRequestedRuntimeMinutes('use 3 acts')).toBeNull()
    expect(parseRequestedRuntimeMinutes('40 meters of rope')).toBeNull()
    expect(parseRequestedRuntimeMinutes('cut to 12 scenes')).toBeNull()
  })
})

describe('runtime validation', () => {
  it('accepts 40 minutes with no issues — it is well inside the beat budget', () => {
    expect(codes(request({ intentText: 'Increase the duration to 40 minutes' }))).toEqual([])
  })

  it('warns that 180 minutes yields coarse beats but does not block', () => {
    const issues = validateRevisionRequest(
      request({ intentText: 'Increase the duration to 180 minutes' })
    )
    expect(issues.map((i) => i.code)).toContain('runtime_coarse_beats')
    expect(hasBlockingIssue(issues)).toBe(false)
  })

  it('blocks a runtime above the supported maximum', () => {
    const issues = validateRevisionRequest(
      request({ intentText: 'Increase the duration to 240 minutes' })
    )
    expect(issues.map((i) => i.code)).toContain('runtime_unsupported')
    expect(hasBlockingIssue(issues)).toBe(true)
  })

  it('blocks a runtime below the supported minimum', () => {
    const issues = validateRevisionRequest(
      request({ intentText: 'Cut the whole thing down to 30 seconds' })
    )
    expect(issues.map((i) => i.code)).toContain('runtime_unsupported')
    expect(hasBlockingIssue(issues)).toBe(true)
  })

  it('does not also warn about pacing when the runtime is already rejected', () => {
    expect(codes(request({ intentText: 'Make it 600 minutes' }))).toEqual([
      'runtime_unsupported',
    ])
  })
})

describe('existing beat sheet validation', () => {
  const beats = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ title: `Beat ${i + 1}`, synopsis: 'x', minutes: 2 }))

  it('warns when the stored blueprint already exceeds the revision cap', () => {
    const issues = validateRevisionRequest(request({ variant: { beats: beats(30) } }))
    const issue = issues.find((i) => i.code === 'existing_beats_over_cap')
    expect(issue).toBeTruthy()
    expect(issue?.message).toContain('30 beats')
    expect(issue?.severity).toBe('warning')
  })

  it('stays quiet at or below the cap', () => {
    expect(codes(request({ variant: { beats: beats(24) } }))).toEqual([])
    expect(codes(request({ variant: { beats: beats(4) } }))).toEqual([])
    expect(codes(request({ variant: {} }))).toEqual([])
  })
})

describe('instruction text validation', () => {
  it('warns when the direction exceeds what is sent to the model', () => {
    const issues = validateRevisionRequest(
      request({ intentText: 'a'.repeat(MAX_INTENT_CHARS + 50) })
    )
    const issue = issues.find((i) => i.code === 'instruction_too_long')
    expect(issue).toBeTruthy()
    expect(issue?.message).toContain('50')
  })

  it('warns on a direction too short to act on', () => {
    expect(codes(request({ intentText: 'better' }))).toContain('instruction_too_vague')
    expect(codes(request({ intentText: 'make it good' }))).toContain('instruction_too_vague')
  })

  it('does not call it vague when recommendations supply the direction', () => {
    expect(
      codes(request({ intentText: 'fix', hasSelectedRecommendations: true }))
    ).not.toContain('instruction_too_vague')
  })

  it('does not flag an empty direction as vague', () => {
    expect(codes(request({ intentText: '' }))).toEqual([])
  })
})

describe('unsupportable specifics', () => {
  it('blocks an unsupported aspect ratio', () => {
    const issues = validateRevisionRequest(
      request({ intentText: 'Reframe the whole thing for 21:9 please' })
    )
    expect(issues.map((i) => i.code)).toContain('aspect_ratio_unsupported')
    expect(hasBlockingIssue(issues)).toBe(true)
  })

  it('accepts supported aspect ratios', () => {
    for (const ratio of ['16:9', '9:16', '1:1', '4:3']) {
      expect(codes(request({ intentText: `Reframe this for ${ratio} delivery` }))).toEqual([])
    }
  })

  it('warns when more characters are requested than a revision keeps', () => {
    expect(codes(request({ intentText: 'Add 12 new characters to the cast' }))).toContain(
      'character_count_over_cap'
    )
  })

  it('stays quiet at the character cap', () => {
    expect(codes(request({ intentText: 'Give me 8 characters total' }))).not.toContain(
      'character_count_over_cap'
    )
  })
})

describe('scope mismatch', () => {
  it('warns when the direction targets a section outside a narrow focus', () => {
    const issues = validateRevisionRequest({
      intentText: 'Add more beats and fix the pacing',
      focusScope: 'core',
    })
    expect(issues.map((i) => i.code)).toContain('scope_mismatch')
  })

  it('stays quiet under full blueprint balance', () => {
    expect(
      codes({ intentText: 'Add more beats and fix the pacing', focusScope: 'all' })
    ).not.toContain('scope_mismatch')
  })

  it('stays quiet when the direction matches the focus', () => {
    expect(
      codes({ intentText: 'Rework the beats so the midpoint lands harder', focusScope: 'beats' })
    ).not.toContain('scope_mismatch')
  })
})
