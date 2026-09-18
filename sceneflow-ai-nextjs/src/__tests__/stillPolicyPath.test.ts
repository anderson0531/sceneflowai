import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  escalateImagePromptForRetry,
  generateImageWithVertexKlingFallback,
} from '@/lib/generation/vertexImageWithKlingFallback'
import { generateVertexImage } from '@/lib/vertexai/vertexImageClient'
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig'

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
  it('generate-image exhausts Vertex, 422s IMAGE_CONTENT_POLICY, and only calls Kling on Creative', () => {
    const src = readSource('src/app/api/scene/generate-image/route.ts')
    expect(src).toContain('if (isCreativeStillGeneration(stillGenerationMode))')
    expect(src).toContain('generateKlingOmniStill')
    expect(src).toContain('shouldRejectIgnoredIdentityStill')
    expect(src).toContain('stillGenerationMode,')
    expect(src).toContain('Policy-recovered frame ignored identity references')
    expect(src).toContain('IMAGE_CONTENT_POLICY_CODE')
    expect(src).toContain('IMAGE_CONTENT_POLICY_USER_MESSAGE')
    expect(src).toContain('IMAGE_SAFETY_CODE')
    expect(src).toContain('IMAGE_SAFETY_USER_MESSAGE')
    expect(src).toContain("generationProvider === 'kling' ? 'kling_image_generate'")
    expect(src).toContain("provider: generationProvider")
    expect(src).toContain("stillPolicyMode: stillGenerationMode ?? 'auto'")
    expect(src).toContain('resolveVertexStillPolicyAttempts')
    expect(src).toContain('failFastOnRateLimit: !!skipLikenessValidation')
    expect(src).not.toContain("modelTier: stillPolicyMode === 'safety' ? 'designer' : effectiveImageTier")
    expect(src).not.toMatch(/from ['"]@\/lib\/fal['"]/)
    expect(src).not.toContain('HiveModerationService')
    expect(src).not.toContain('klingSafetyGuard')

    const creativeBlockStart = src.indexOf('if (isCreativeStillGeneration(stillGenerationMode))')
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

  it('Director rewrite is Safety-only; Frames toolbar owns Standard | Creative', () => {
    const director = readSource('src/components/vision/scene-production/DirectorDialog.tsx')
    expect(director).not.toContain('StillPolicyModeControl')
    expect(director).toContain("tp('retryStill')")
    expect(director).toContain('No reference image available')
    expect(director).toContain("t('takeStandard')")
    expect(director).toContain("t('takeCreative')")

    const frame = readSource('src/components/vision/scene-production/FramePromptDialog.tsx')
    expect(frame).not.toContain('stillPolicyMode')
    expect(frame).not.toContain('StillPolicyModeControl')

    const preVis = readSource('src/components/vision/PreVisFramePromptDialog.tsx')
    expect(preVis).not.toContain('stillPolicyMode')
    expect(preVis).not.toContain('StillPolicyModeControl')

    const beatDirector = readSource('src/components/vision/BeatStillDirectorDialog.tsx')
    expect(beatDirector).not.toContain('StillPolicyModeControl')
    expect(beatDirector).toContain("t('safetyOption')")
    expect(beatDirector).toContain('policyCompliance: safety')
    expect(beatDirector).toContain('scoreBeatDirectionFidelity')
  })

  it('board overlay uses policy vs declined-references copy, not Generation failed', () => {
    const frame = readSource('src/components/vision/SceneImageFrame.tsx')
    expect(frame).toContain('Refs declined')
    expect(frame).toContain('Policy blocked')
    expect(frame).toContain('References were declined')
    expect(frame).toContain('Open Director to rewrite for Safety, or switch Frames to Creative')
    expect(frame).toContain('Open Director to rewrite the prompt, or switch Frames to Creative')
    expect(frame).toMatch(/from ['"]@\/components\/vision\/DeferredImageSkeleton['"]/)
    expect(frame).toContain('isDisplayableImageUrl')
    expect(frame).toContain('isDeferredImageUrl')
    expect(frame).toContain('DeferredImageSkeleton')
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
          `No image in Vertex Gemini Image response — blocked by safety (model=${GEMINI_IMAGE_MODELS.flash}, finishReason=IMAGE_SAFETY)`
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

  it('Safety retry escalates from base prompt at level 2 on beat frames', async () => {
    const base =
      "person [2] plants the spanner beside person [1]'s shoulder to block her path."
    const level1 = escalateImagePromptForRetry(base, 1, { skipProductionStillFraming: true })

    vi.mocked(generateVertexImage)
      .mockRejectedValueOnce(
        new Error(
          'No image in Vertex Gemini Image response — blocked by safety (model=gemini-3-pro-image, finishReason=STOP)'
        )
      )
      .mockResolvedValueOnce({
        imageBase64: 'abc',
        mimeType: 'image/png',
        provider: 'vertex',
        modelId: 'gemini-3-pro-image',
      })

    const result = await generateImageWithVertexKlingFallback({
      prompt: level1,
      policyBasePrompt: base,
      policyEscalationOffset: 1,
      policyMaxAttempts: 2,
      skipProductionStillFraming: true,
    })

    expect(result.vertexAttempts).toBe(2)
    expect(generateVertexImage).toHaveBeenCalledTimes(2)
    expect(level1).toMatch(/embedded in cracked brick beside person \[1\]'s open hand/i)
    const first = vi.mocked(generateVertexImage).mock.calls[0]?.[0]
    const second = vi.mocked(generateVertexImage).mock.calls[1]?.[0]
    expect(first?.prompt).toMatch(/embedded in cracked brick beside person \[1\]'s open hand/i)
    expect(second?.prompt).toMatch(/embedded in cracked brick beside person \[1\]'s open hand/i)
    expect(second?.prompt).toContain('spanner')
  })
})
