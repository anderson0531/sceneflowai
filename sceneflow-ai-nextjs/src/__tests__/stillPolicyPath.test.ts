import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { generateImageWithVertexKlingFallback } from '@/lib/generation/vertexImageWithKlingFallback'
import { generateVertexImage } from '@/lib/vertexai/vertexImageClient'

vi.mock('@/lib/vertexai/vertexImageClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/vertexai/vertexImageClient')>(
    '@/lib/vertexai/vertexImageClient'
  )
  return {
    ...actual,
    generateVertexImage: vi.fn(),
  }
})

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('Google exhaust then fail — no auto-Kling, no Fal, no Hive', () => {
  it('generate-image exhausts Vertex, 422s IMAGE_SAFETY, and only calls Kling on Creative', () => {
    const src = readSource('src/app/api/scene/generate-image/route.ts')
    expect(src).toContain("if (stillPolicyMode === 'creative')")
    expect(src).toContain('generateKlingOmniStill')
    expect(src).toContain('shouldRejectIgnoredIdentityStill')
    expect(src).toContain('IMAGE_SAFETY_CODE')
    expect(src).toContain('IMAGE_SAFETY_USER_MESSAGE')
    expect(src).toContain("generationProvider === 'kling' ? 'kling_image_generate'")
    expect(src).toContain("provider: generationProvider")
    expect(src).toContain("stillPolicyMode: stillPolicyMode ?? 'auto'")
    expect(src).toContain('resolveVertexStillPolicyAttempts')
    expect(src).not.toMatch(/from ['"]@\/lib\/fal['"]/)
    expect(src).not.toContain('HiveModerationService')
    expect(src).not.toContain('klingSafetyGuard')

    const creativeBlockStart = src.indexOf("if (stillPolicyMode === 'creative')")
    const creativeBlock = src.slice(creativeBlockStart, src.indexOf('} else {', creativeBlockStart))
    expect(creativeBlock).toContain('prompt: geminiPrompt')
    expect(creativeBlock).not.toContain('escalateImagePromptForRetry')
  })

  it('Creative still helper never imports Fal or Hive', () => {
    const src = readSource('src/lib/kling/generateKlingOmniStill.ts')
    expect(src).not.toMatch(/from ['"]@\/lib\/fal['"]/)
    expect(src).not.toMatch(/from ['"]@\/services\/HiveModerationService['"]/)
    expect(src).not.toMatch(/from ['"]@\/lib\/moderation\/klingSafetyGuard['"]/)
    expect(src).toContain("wasPolicyFallback: true")
  })

  it('Vertex wrapper stays on designer after policy refusal and never calls Kling', () => {
    const src = readSource('src/lib/generation/vertexImageWithKlingFallback.ts')
    expect(src).toContain("modelTier: 'designer'")
    expect(src).toContain('wasPolicyFallback: false')
    expect(src).not.toContain('generateKlingOmniStill')
    expect(src).not.toMatch(/from ['"]@\/lib\/fal['"]/)
  })

  it('Director and Pre-Vis dialogs expose Safety | Creative copy', () => {
    const control = readSource('src/components/vision/StillPolicyModeControl.tsx')
    expect(control).toContain("onChange('safety')")
    expect(control).toContain("onChange('creative')")
    expect(control).toContain("t('safetyHint')")
    expect(control).toContain("t('creativeHint')")

    const director = readSource('src/components/vision/scene-production/DirectorDialog.tsx')
    expect(director).toContain('StillPolicyModeControl')
    expect(director).toContain("tp('retryStill')")
    expect(director).toContain('No reference image available')
    expect(director.split('StillPolicyModeControl').length - 1).toBeGreaterThanOrEqual(2)

    const frame = readSource('src/components/vision/scene-production/FramePromptDialog.tsx')
    expect(frame).toContain('stillPolicyMode')

    const preVis = readSource('src/components/vision/PreVisFramePromptDialog.tsx')
    expect(preVis).toContain('stillPolicyMode')

    const beatDirector = readSource('src/components/vision/BeatStillDirectorDialog.tsx')
    expect(beatDirector).toContain('StillPolicyModeControl')
  })

  it('board overlay uses the declined-references copy, not Generation failed', () => {
    const frame = readSource('src/components/vision/SceneImageFrame.tsx')
    expect(frame).toContain('Refs declined')
    expect(frame).toContain('References were declined')
    expect(frame).toContain('Open Director to retry as Safety or Creative')
  })
})

describe('generateImageWithVertexKlingFallback designer retry', () => {
  beforeEach(() => {
    vi.mocked(generateVertexImage).mockReset()
  })

  it('rewrites and retries on designer after IMAGE_SAFETY, then throws without keeping a frame', async () => {
    vi.mocked(generateVertexImage)
      .mockRejectedValueOnce(
        new Error(
          'No image in Vertex Gemini Image response — blocked by safety (model=gemini-2.5-flash-image, finishReason=IMAGE_SAFETY)'
        )
      )
      .mockRejectedValueOnce(
        new Error(
          'No image in Vertex Gemini Image response — blocked by safety (model=gemini-3-pro-image, finishReason=IMAGE_SAFETY)'
        )
      )

    await expect(
      generateImageWithVertexKlingFallback({
        prompt: 'person [1] sits trapped against the wall with a steel spanner',
        policyMaxAttempts: 2,
        skipProductionStillFraming: true,
      })
    ).rejects.toThrow(/content policy|IMAGE_SAFETY|blocked by safety/i)

    expect(generateVertexImage).toHaveBeenCalledTimes(2)
    const second = vi.mocked(generateVertexImage).mock.calls[1]?.[0]
    expect(second?.modelTier).toBe('designer')
    expect(second?.prompt).not.toMatch(/trapped against/i)
    expect(second?.prompt.toLowerCase()).not.toContain('generatekling')
  })
})
