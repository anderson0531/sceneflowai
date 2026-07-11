import { describe, it, expect } from 'vitest'
import {
  extractVertexTtsSupportCode,
  parseVertexTtsPolicyViolation,
} from '@/lib/tts/googleTtsPolicy'

const SAMPLE_BODY = JSON.stringify({
  error: {
    code: 400,
    message:
      'Cloud Text-to-Speech could not generate audio because the input text or prompt violates Vertex AI\'s usage guidelines. If you think this was an error, send feedback. Support codes: 54702341',
    status: 'INVALID_ARGUMENT',
  },
})

describe('googleTtsPolicy', () => {
  it('extracts support code', () => {
    expect(extractVertexTtsSupportCode('Support codes: 54702341')).toBe('54702341')
  })

  it('parses Vertex usage-guidelines 400 into guidance payload', () => {
    const v = parseVertexTtsPolicyViolation(400, SAMPLE_BODY, 'dialogue')
    expect(v).not.toBeNull()
    expect(v?.supportCode).toBe('54702341')
    expect(v?.userMessage).toMatch(/blocked/i)
    expect(v?.action).toBe('enhance_dialogue_direct')
    expect(v?.tips.length).toBeGreaterThan(2)
    expect(v?.tips.some((t) => /Direct/i.test(t))).toBe(true)
  })

  it('returns null for unrelated 400 bodies', () => {
    expect(parseVertexTtsPolicyViolation(400, '{"error":{"message":"bad request"}}', 'dialogue')).toBeNull()
  })
})
