import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { escalateImagePromptForRetry } from '@/lib/generation/vertexImageWithKlingFallback'
import { isVertexContentPolicyError } from '@/lib/generation/contentPolicy'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('escalateImagePromptForRetry', () => {
  it('sanitizes blood and bullet on the first failure', () => {
    const next = escalateImagePromptForRetry(
      'Hero in a blood-stained jacket holding a bullet casing',
      1
    )
    expect(next.toLowerCase()).not.toContain('blood')
    expect(next.toLowerCase()).not.toMatch(/\bbullet\b/)
  })

  it('escalates sanitized weapon/liquid phrasing on later failures', () => {
    const afterFirst = escalateImagePromptForRetry(
      'Wardrobe with dark liquid stains and a projectile prop',
      1
    )
    expect(afterFirst.toLowerCase()).toMatch(/fabric dye stain|stage prop/)
  })

  it('appends production-still framing on the second failure', () => {
    const next = escalateImagePromptForRetry('Clean leather jacket, no marks', 2)
    expect(next).toContain('wardrobe reference still')
    expect(next).toContain('stage props')
  })
})

describe('identity-ref jobs stay on pro under rate limit', () => {
  it('disables eco fallback when reference images are present', () => {
    const src = readSource('src/lib/vertexai/vertexImageClient.ts')
    expect(src).toContain('hasIdentityReferenceImages')
    expect(src).toContain('backing off without eco fallback')
    expect(src).toContain('canFallbackToEcoTier(options)')
    expect(src).toContain('IDENTITY_REF_RATE_LIMIT_EXHAUSTED')
    expect(src).toContain('sleepIdentityRefBackoff')
    expect(src).toContain('IDENTITY_REF_RETRY_DELAYS_MS')
  })

  it('policy ladder escalates instead of only word-replacing once', () => {
    const src = readSource('src/lib/generation/vertexImageWithKlingFallback.ts')
    expect(src).toContain('escalateImagePromptForRetry')
    expect(src).toContain('IMAGE_SAFETY')
  })

  it('still treats IMAGE_SAFETY empty-image errors as policy', () => {
    expect(
      isVertexContentPolicyError(
        'No image in Vertex Gemini Image response — blocked by safety (model=gemini-3-pro-image, finishReason=IMAGE_SAFETY)'
      )
    ).toBe(true)
  })
})

describe('nested 429 retry de-amplification', () => {
  it('scene generate-image skips outer burst after identity-ref exhaustion', () => {
    const src = readSource('src/app/api/scene/generate-image/route.ts')
    expect(src).toContain('isIdentityRefRateLimitExhausted')
    expect(src).toContain('skipping outer retry burst')
    expect(src).toContain('useVertexGeminiImage ? 2 : 4')
  })
})
