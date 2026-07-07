import { describe, expect, it } from 'vitest'
import { buildVideoErrorGuidance } from '@/lib/generation/videoErrorGuidance'

describe('buildVideoErrorGuidance', () => {
  it('returns null when error is empty', () => {
    expect(buildVideoErrorGuidance(undefined)).toBeNull()
    expect(buildVideoErrorGuidance('')).toBeNull()
    expect(buildVideoErrorGuidance('   ')).toBeNull()
  })

  it('maps content policy errors to Multiplatform CTA', () => {
    const msg = buildVideoErrorGuidance('The prompt is blocked due to prohibited contents')
    expect(msg).toContain('content policy')
    expect(msg).toContain('Multiplatform')
  })

  it('maps mix of references to content policy CTA', () => {
    const msg = buildVideoErrorGuidance(
      'Reference to video does not support this mix of references.'
    )
    expect(msg).toContain('content policy')
  })

  it('maps quota errors to retry CTA', () => {
    const msg = buildVideoErrorGuidance('Quota exceeded for base model: veo-3.1')
    expect(msg).toContain('busy')
    expect(msg).toContain('Multiplatform')
  })

  it('maps generic errors to refine prompt CTA', () => {
    const msg = buildVideoErrorGuidance('Cannot read properties of undefined')
    expect(msg).toContain('Generation failed')
    expect(msg).toContain('Prompt Direction')
  })
})
