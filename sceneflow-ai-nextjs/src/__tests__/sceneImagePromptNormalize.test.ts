import { describe, expect, it } from 'vitest'
import { unwrapSceneImageAiPrompt } from '@/lib/intelligence/scene-image-intelligence'

describe('unwrapSceneImageAiPrompt', () => {
  it('extracts inner prompt from clean JSON', () => {
    const wrapped = JSON.stringify({
      prompt: '[GLOBAL STYLE ANCHOR]\nMaster Style: Photorealistic',
      reasoning: 'test',
    })
    const unwrapped = unwrapSceneImageAiPrompt(wrapped)
    expect(unwrapped).toBe('[GLOBAL STYLE ANCHOR]\nMaster Style: Photorealistic')
  })

  it('recovers prompt from truncated JSON with escaped newlines', () => {
    const truncated =
      '{ "prompt": "[GLOBAL STYLE ANCHOR]\\nMaster Style: Photorealistic cinematic still\\n\\n[SCENE COMPOSITION & BEAT]\\nAction/Framing: Medium shot. person [1] clutches a file.", "reasoning": "trunc'
    const unwrapped = unwrapSceneImageAiPrompt(truncated)
    expect(unwrapped).toContain('[GLOBAL STYLE ANCHOR]')
    expect(unwrapped).toContain('\nMaster Style: Photorealistic cinematic still')
    expect(unwrapped).toContain('person [1] clutches a file.')
    expect(unwrapped).not.toMatch(/^\s*\{/)
  })

  it('returns empty when prompt cannot be recovered', () => {
    expect(unwrapSceneImageAiPrompt('{ "reasoning": "no prompt field" }')).toBe('')
    expect(unwrapSceneImageAiPrompt('')).toBe('')
  })

  it('passes through already-clean structured prompts', () => {
    const clean = '[GLOBAL STYLE ANCHOR]\nMaster Style: Cinematic'
    expect(unwrapSceneImageAiPrompt(clean)).toBe(clean)
  })
})
