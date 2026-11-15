import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildEnhanceIdentityReferencePrompt,
  sanitizeSelfieEnhanceOptions,
} from '@/lib/character/characterReferencePrompts'
import { parseImageDataUrl } from '@/lib/character/enhanceIdentityImage'

describe('Selfie Studio AI framing & enhancement prompts', () => {
  it('sanitizes untrusted selfieOptions payloads safely', () => {
    expect(sanitizeSelfieEnhanceOptions(null)).toBeUndefined()
    expect(sanitizeSelfieEnhanceOptions('bad')).toBeUndefined()

    const sanitized = sanitizeSelfieEnhanceOptions({
      framingPreset: 'upper_torso',
      backdropMode: 'soft_blur_original',
      lightingMode: 'invalid_mode',
      fixLensDistortion: true,
      fixEyeContact: 'yes',
      removeGlassesGlare: false,
      expressionMode: 'keep_natural',
      collarMode: 'neutral_crewneck',
    })

    expect(sanitized).toEqual({
      framingPreset: 'upper_torso',
      backdropMode: 'soft_blur_original',
      fixLensDistortion: true,
      removeGlassesGlare: false,
      expressionMode: 'keep_natural',
      collarMode: 'neutral_crewneck',
    })
  })

  it('parses valid inline data URLs and rejects invalid payloads', () => {
    const valid = parseImageDataUrl('data:image/jpeg;base64, /9j/4AAQSkZJRg== ')
    expect(valid).toEqual({
      mimeType: 'image/jpeg',
      base64: '/9j/4AAQSkZJRg==',
    })

    expect(parseImageDataUrl('https://example.com/photo.jpg')).toBeNull()
    expect(parseImageDataUrl('data:text/plain;base64,SGVsbG8=')).toBeNull()
    expect(parseImageDataUrl('')).toBeNull()
  })

  it('preserves standard enhance prompt behavior when selfieOptions is omitted', () => {
    const prompt = buildEnhanceIdentityReferencePrompt({
      characterName: 'Elena',
      appearanceDescription: 'Latina woman in her mid-30s with wavy dark hair.',
      identitySource: 'photo',
    })

    expect(prompt).toContain('Refine this portrait into a professional casting headshot.')
    expect(prompt).toContain('Background: plain neutral gray studio backdrop')
  })

  it('builds non-conflicting selfie directives for custom framing, bokeh backdrop, and collar cleanup', () => {
    const prompt = buildEnhanceIdentityReferencePrompt({
      characterName: 'Marcus',
      appearanceDescription: 'Man in his 40s.',
      wardrobeDescription: 'Loud neon hoodie',
      identitySource: 'photo',
      selfieOptions: {
        framingPreset: 'upper_torso',
        backdropMode: 'soft_blur_original',
        lightingMode: 'natural_daylight',
        fixLensDistortion: true,
        fixEyeContact: true,
        removeGlassesGlare: true,
        expressionMode: 'keep_natural',
        collarMode: 'neutral_crewneck',
      },
    })

    expect(prompt).toContain('medium close-up portrait from mid-chest/upper torso')
    expect(prompt).not.toContain('head-and-shoulders only')
    expect(prompt).toContain('shallow depth-of-field portrait bokeh')
    expect(prompt).not.toContain('plain neutral gray studio backdrop')
    expect(prompt).toContain('85mm prime portrait lens look')
    expect(prompt).toContain('align iris/pupil gaze directly into the camera lens')
    expect(prompt).toContain('removing screen glare and specular reflections')
    expect(prompt).toContain('dark charcoal crewneck tee')
    expect(prompt).not.toContain('Loud neon hoodie')
  })

  it('adapts a live human selfie into a non-photorealistic Global Art Style while locking likeness', () => {
    const prompt = buildEnhanceIdentityReferencePrompt({
      characterName: 'Kenji',
      appearanceDescription: 'Japanese man in his late 20s.',
      identitySource: 'photo',
      artStyle: 'anime',
      selfieOptions: {
        framingPreset: 'casting_headshot',
        backdropMode: 'neutral_gray',
        lightingMode: 'studio_key_fill',
        fixLensDistortion: true,
      },
    })

    expect(prompt).toContain('Transform this captured portrait into a clean character reference portrait')
    expect(prompt).toContain('Maintain unmistakable facial likeness to the person in the captured photo')
    expect(prompt).not.toContain('photorealistic human photography only')
  })

  it('wires Selfie Studio into Continuity Library character cards and forwards onApplyEnhancedReference', () => {
    const sidebarSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/vision/VisionReferencesSidebar.tsx'),
      'utf8'
    )
    expect(sidebarSource).toContain(
      'onApplyEnhancedReference={props.onApplyEnhancedReference}'
    )

    const librarySource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/vision/CharacterLibrary.tsx'),
      'utf8'
    )
    expect(librarySource).toContain('<CharacterSelfieStudioDialog')
    expect(librarySource).toContain('setSelfieStudioTarget("identity")')
    expect(librarySource).toContain('setSelfieStudioTarget("likeness_primary")')
    expect(librarySource).toContain('setSelfieStudioTarget("likeness_secondary")')
  })
})
