import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildEnhanceIdentityReferencePrompt,
  sanitizeSelfieEnhanceOptions,
} from '@/lib/character/characterReferencePrompts'
import {
  getImprovementsSummary,
  parseImageDataUrl,
} from '@/lib/character/enhanceIdentityImage'

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
      skinComplexionMode: 'studio_makeup_retouch',
      groomHairAndBeard: true,
      fixRedEye: true,
      harmonizeSymmetry: 'invalid',
    })

    expect(sanitized).toEqual({
      framingPreset: 'upper_torso',
      backdropMode: 'soft_blur_original',
      fixLensDistortion: true,
      removeGlassesGlare: false,
      expressionMode: 'keep_natural',
      collarMode: 'neutral_crewneck',
      skinComplexionMode: 'studio_makeup_retouch',
      groomHairAndBeard: true,
      fixRedEye: true,
    })

    expect(
      sanitizeSelfieEnhanceOptions({
        skinComplexionMode: 'invalid_skin_mode',
        harmonizeSymmetry: false,
      })
    ).toEqual({
      harmonizeSymmetry: false,
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

  it('applies camera-ready grooming, studio makeup retouch, red-eye removal, and facial symmetry while locking base identity', () => {
    const prompt = buildEnhanceIdentityReferencePrompt({
      characterName: 'Brian',
      appearanceDescription: 'Man in his late 50s with salt-and-pepper beard.',
      identitySource: 'photo',
      selfieOptions: {
        framingPreset: 'casting_headshot',
        backdropMode: 'neutral_gray',
        lightingMode: 'studio_key_fill',
        fixLensDistortion: true,
        fixEyeContact: true,
        removeGlassesGlare: true,
        skinComplexionMode: 'studio_makeup_retouch',
        groomHairAndBeard: true,
        fixRedEye: true,
        harmonizeSymmetry: true,
      },
    })

    // Red-eye & bloodshot sclera removal with iris color lock
    expect(prompt).toContain('eliminate flash red-eye')
    expect(prompt).toContain('tired bloodshot sclera redness')
    expect(prompt).toContain('preserving exact iris color')

    // Hair, beard & brow grooming without inventing/shaving facial hair or changing hairline
    expect(prompt).toContain('Grooming (Hair, Beard & Brows):')
    expect(prompt).toContain('tame bedhead, cowlicks, frizz, and stray flyaways')
    expect(prompt).toContain('never add facial hair to a clean-shaven face')
    expect(prompt).toContain('never alter natural hairline geometry')

    // Studio makeup & complexion retouch with real skin pores & permanent marks preserved
    expect(prompt).toContain('Studio Makeup & Complexion Retouch:')
    expect(prompt).toContain('even, rested complexion concealer')
    expect(prompt).toContain('retaining real photographic skin pores')
    expect(prompt).toContain('permanent marks (moles, freckles, scars)')
    expect(prompt).toContain('zero plastic airbrushing')

    // Subtle facial symmetry & posture balance without altering bone structure
    expect(prompt).toContain('Symmetry & Posture Balance:')
    expect(prompt).toContain('relax uneven eye squint')
    expect(prompt).toContain('cranial and facial bone structure')

    // Explicit Base Identity Lock preventing generic model morphing or de-aging
    expect(prompt).toContain('Base Identity Lock:')
    expect(prompt).toContain('do NOT morph features toward a generic beauty/fashion model')
  })

  it('supports natural no-makeup camera-ready complexion polish and reports applied grooming improvements', () => {
    const prompt = buildEnhanceIdentityReferencePrompt({
      characterName: 'Maya',
      appearanceDescription: 'Woman in her 30s.',
      identitySource: 'photo',
      selfieOptions: {
        skinComplexionMode: 'camera_ready_polish',
        groomHairAndBeard: true,
        fixRedEye: true,
        harmonizeSymmetry: false,
      },
    })

    expect(prompt).toContain('Complexion & Grooming Polish:')
    expect(prompt).toContain('clear temporary blemishes, acne, razor bumps')
    expect(prompt).not.toContain('Symmetry & Posture Balance:')

    const bullets = getImprovementsSummary(
      {
        hasFace: true,
        faceCount: 1,
        isAlreadyOptimized: false,
        optimizationScore: 62,
        issues: [],
        suggestions: [],
        demographicAnchor: 'woman in her 30s',
        physicalTraits: [],
      },
      {
        framingPreset: 'casting_headshot',
        backdropMode: 'neutral_gray',
        lightingMode: 'studio_key_fill',
        fixLensDistortion: true,
        fixEyeContact: true,
        fixRedEye: true,
        groomHairAndBeard: true,
        skinComplexionMode: 'studio_makeup_retouch',
        harmonizeSymmetry: true,
      }
    )

    expect(bullets).toEqual(
      expect.arrayContaining([
        'Removed red-eye and cleared tired/bloodshot eye redness',
        'Groomed hair, flyaways, brows & facial hair while retaining natural style',
        'Applied camera-ready studio makeup & complexion retouch (pores preserved)',
        'Balanced webcam squint, posture cant & subtle facial symmetry',
      ])
    )
  })

  it('exposes Groom & Beautify preset and granular grooming/correction controls in CharacterSelfieStudioDialog', () => {
    const dialogSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/vision/CharacterSelfieStudioDialog.tsx'),
      'utf8'
    )
    expect(dialogSource).toContain("key: 'groom_and_beautify'")
    expect(dialogSource).toContain('Groom & Beautify')
    expect(dialogSource).toContain("updateOption('skinComplexionMode'")
    expect(dialogSource).toContain("updateOption('groomHairAndBeard'")
    expect(dialogSource).toContain("updateOption('fixRedEye'")
    expect(dialogSource).toContain("updateOption('harmonizeSymmetry'")
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
