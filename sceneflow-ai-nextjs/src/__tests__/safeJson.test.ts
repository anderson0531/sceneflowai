import { describe, expect, it } from 'vitest'
import { safeParseJsonFromText } from '@/lib/safeJson'

describe('safeParseJsonFromText', () => {
  it('parses clean JSON', () => {
    expect(safeParseJsonFromText('{"a": 1}')).toEqual({ a: 1 })
  })

  it('parses fenced JSON', () => {
    expect(safeParseJsonFromText('```json\n{"a": 1}\n```')).toEqual({ a: 1 })
  })

  it('recovers a response truncated mid-string without hanging', () => {
    const truncated = '{"logline": "A detective hunts a ghost", "synopsis": "Act one begins'
    const parsed = safeParseJsonFromText(truncated) as Record<string, unknown>
    expect(parsed.logline).toBe('A detective hunts a ghost')
  })

  it('recovers a response truncated inside a nested array', () => {
    const truncated =
      '{"title": "Pilot", "beats": [{"title": "Open", "synopsis": "Rain"}, {"title": "Turn'
    const parsed = safeParseJsonFromText(truncated) as {
      title: string
      beats: { title: string }[]
    }
    expect(parsed.title).toBe('Pilot')
    expect(parsed.beats[0].title).toBe('Open')
  })

  it('recovers a response truncated on a dangling key', () => {
    const parsed = safeParseJsonFromText('{"a": 1, "b":') as Record<string, unknown>
    expect(parsed.a).toBe(1)
  })

  it('recovers a response truncated on a trailing comma', () => {
    const parsed = safeParseJsonFromText('{"a": 1,') as Record<string, unknown>
    expect(parsed.a).toBe(1)
  })

  it('handles braces inside string values', () => {
    const parsed = safeParseJsonFromText('{"note": "use {curly} braces", "n": 2') as Record<
      string,
      unknown
    >
    expect(parsed.note).toBe('use {curly} braces')
    expect(parsed.n).toBe(2)
  })

  it('completes quickly on a large truncated payload', () => {
    const big = `{"synopsis": "${'word '.repeat(20_000)}`
    const started = Date.now()
    const parsed = safeParseJsonFromText(big) as Record<string, unknown>
    expect(typeof parsed.synopsis).toBe('string')
    expect(Date.now() - started).toBeLessThan(2000)
  })

  it('throws on unsalvageable input', () => {
    expect(() => safeParseJsonFromText('not json at all')).toThrow()
  })
})
