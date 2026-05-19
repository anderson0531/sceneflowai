import { describe, expect, it } from 'vitest'
import {
  narrowPromptForFtvFrameLock,
  neutralizeFtvGuidePrompt,
  stripFtvSegmentBeatLines,
  extractSpeaksQuotedPerformCue,
  normalizeVeoSuspiciousPunctuation,
} from '@/lib/vision/ftvPromptNormalize'

describe('ftvPromptNormalize', () => {
  it('removes Segment beat lines', () => {
    const raw = `Motion here.\n\nSegment beat 9\n\nMore motion.`
    expect(stripFtvSegmentBeatLines(raw)).not.toMatch(/segment beat/i)
  })

  it('drops delimiter sections that open with Character', () => {
    const raw = `Keep this motion.\n\n---\n\nCharacter\n\nSarah wears silk blouse at mahogany desk.\n\n---\n\nKeep this too.`
    const out = narrowPromptForFtvFrameLock(raw)
    expect(out).toContain('Keep this motion')
    expect(out).toContain('Keep this too')
    expect(out.toLowerCase()).not.toContain('mahogany')
    expect(out.toLowerCase()).not.toContain('silk blouse')
  })

  it('extracts only Name speaks, "..." from blocking + dialogue prose', () => {
    const raw = `Sarah physically closes the distance, leaning sharply into her broadcast microphone. She taps her pen once sharply against the table, her eyes glinting with assertive skepticism. Sarah speaks, "Pacified? Or.. managed? Because from where we sit, 'overnight' doesn't happen without a very deliberate hand."`
    expect(extractSpeaksQuotedPerformCue(raw)).toBe(
      `Sarah speaks, "Pacified? Or. managed? Because from where we sit, 'overnight' doesn't happen without a very deliberate hand."`
    )
  })

  it('normalizeVeoSuspiciousPunctuation reduces ellipsis-style pauses for Veo input', () => {
    expect(normalizeVeoSuspiciousPunctuation('Wait… really')).toBe('Wait. really')
    expect(normalizeVeoSuspiciousPunctuation('A... B')).toBe('A. B')
    expect(normalizeVeoSuspiciousPunctuation('Or.. managed')).toBe('Or. managed')
  })

  it('neutralizes named speaker boilerplate in guide', () => {
    const g = `SARAH CHEN speaks the following line: 'Hello there.'`
    expect(neutralizeFtvGuidePrompt(g)).toMatch(/deliver with natural lip sync/i)
    expect(neutralizeFtvGuidePrompt(g).toUpperCase()).not.toContain('SARAH CHEN SPEAKS')
  })
})
