import { describe, expect, it } from 'vitest'
import {
  redactVeoPredictLongRunningBody,
  summarizePromptForPolicyHeuristics,
  summarizeNegativePromptForPolicyHeuristics,
  collectPolicyHeuristicHits,
} from '@/lib/gemini/veoRequestDiagnostics'

describe('veoRequestDiagnostics', () => {
  it('redacts nested bytesBase64Encoded and preserves prompt', () => {
    const body = {
      instances: [
        {
          prompt: 'Hello',
          image: { bytesBase64Encoded: 'AAAABBBB', mimeType: 'image/png' },
          lastFrame: { bytesBase64Encoded: 'CCCCDDDD', mimeType: 'image/png' },
        },
      ],
      parameters: { aspectRatio: '16:9' },
    }
    const out = redactVeoPredictLongRunningBody(body) as typeof body
    expect(out.instances[0].prompt).toBe('Hello')
    expect(out.instances[0].image.bytesBase64Encoded).toMatch(/^<redacted len=\d+ sha256=[a-f0-9]{16}>$/)
    expect(out.instances[0].lastFrame.bytesBase64Encoded).toMatch(/^<redacted len=\d+ sha256=[a-f0-9]{16}>$/)
    expect(out.parameters.aspectRatio).toBe('16:9')
  })

  it('flags peace-related wording in heuristics', () => {
    const lines = summarizePromptForPolicyHeuristics('He said peace talks continue.')
    expect(lines.some((l) => l.includes('"peace"'))).toBe(true)
  })

  it('flags stuttering in negative prompts', () => {
    const hits = collectPolicyHeuristicHits('jittery, stuttering, blur')
    expect(hits.some((l) => l.includes('stuttering'))).toBe(true)
    const neg = summarizeNegativePromptForPolicyHeuristics('stuttering motion')
    expect(neg?.some((l) => l.includes('stuttering'))).toBe(true)
  })
})
