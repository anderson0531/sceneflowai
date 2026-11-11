import { describe, expect, it } from 'vitest'
import {
  applyArtStyleToProjectMetadata,
  buildArtStyleSpecFromValue,
  inferArtStyleMedium,
  isPhotorealisticArtStyle,
  normalizeArtStyleSpec,
  optimizeArtStyleDirectionFallback,
  recommendArtStyleFallback,
  resolveProjectArtStyleSpec,
  resolveSeriesArtStyleSpec,
  serializeArtStyleValue,
} from '@/lib/artStyle/globalArtStyle'
import {
  buildArtStylePromptBlock,
  normalizeVariantFoundation,
} from '@/lib/treatment/blueprintFoundation'
import {
  describeArtStyleAnchor,
  getArtStyleNegativeTerms,
  getArtStyleVideoPromptSuffix,
  resolveProjectArtStyle,
} from '@/lib/vision/artStyle'
import {
  CHARACTER_IDENTITY_REFERENCE_ANCHOR,
  buildCharacterIdentityReferencePrompt,
  buildFullBodyWardrobePrompt,
} from '@/lib/character/characterReferencePrompts'
import { resolveCastIdentityGenerationPrompt } from '@/lib/intelligence/reference-still-director-fallback'
import {
  buildLocationBasePrompt,
  buildLocationVersionPrompt,
} from '@/lib/vision/locationReferencePrompts'
import { withObjectReferenceInstruction } from '@/lib/vision/objectReferencePrompts'
import { buildObjectReferencePrompt } from '@/lib/vision/referenceExpressPrompts'
import {
  DEFAULT_STILL_QUALITY_EXCLUSIONS,
  DEFAULT_STYLIZED_STILL_QUALITY_EXCLUSIONS,
  STILL_PURPOSE_LINE,
  STYLIZED_STILL_PURPOSE_LINE,
  assembleStructuredStillPrompt,
} from '@/lib/imagen/structuredStillPrompt'
import { buildSceneImageNegativePrompt } from '@/lib/imagen/sceneImageNegativePrompt'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import type { SceneBeat } from '@/lib/script/segmentTypes'

describe('Global Art Style Pipeline (Series → Blueprint → Production)', () => {
  describe('1. ArtStyleSpec normalization, intelligence fallbacks & metadata persistence', () => {
    it('preserves custom/AI-directed art style specs without coercing to photorealistic', () => {
      const customPrompt =
        'Hand-painted gouache fairytale illustration, visible cold-press watercolor paper grain, warm amber lantern light'
      const spec = buildArtStyleSpecFromValue(`Gouache Fairytale: ${customPrompt}`)
      expect(spec.presetId).toBe('custom')
      expect(spec.medium).toBe('painterly')
      expect(isPhotorealisticArtStyle(serializeArtStyleValue(spec))).toBe(false)
      expect(spec.characterRefDirective).toMatch(/Gouache Fairytale/i)
      expect(spec.negativeTerms.join(' ')).toMatch(/photorealistic/i)
    })

    it('keeps unmodified presets serialized as canonical preset IDs for legacy compatibility', () => {
      const ghibliSpec = buildArtStyleSpecFromValue('ghibli')
      expect(ghibliSpec.presetId).toBe('ghibli')
      expect(ghibliSpec.medium).toBe('2d-animation')
      expect(serializeArtStyleValue(ghibliSpec)).toBe('ghibli')

      const photoSpec = buildArtStyleSpecFromValue('photorealistic')
      expect(photoSpec.presetId).toBe('photorealistic')
      expect(photoSpec.medium).toBe('live-action')
      expect(serializeArtStyleValue(photoSpec)).toBe('photorealistic')
    })

    it('recommends storyline-aware primary + contrasting alternatives and optimizes user direction', () => {
      const rec = recommendArtStyleFallback({
        title: 'Lanterns Over Kyoto',
        storyline: 'A young clockmaker discovers spirits living inside paper lanterns across rainy bridges.',
        genre: ['Fantasy', 'Adventure'],
        tone: 'whimsical nostalgic wonder',
        isSeries: true,
      })
      expect(rec.recommended.title).toBeTruthy()
      expect(rec.recommended.stylePrompt).toBeTruthy()
      expect(rec.alternatives.length).toBeGreaterThanOrEqual(2)

      const optimized = optimizeArtStyleDirectionFallback(
        'Spider-Verse comic halftone ink lines with neon cyan and magenta rim lighting, animated on twos',
        { title: 'Neon Courier', genre: 'Sci-Fi Action' },
        rec.recommended
      )
      expect(optimized.medium).toBe('graphic-illustration')
      expect(optimized.userDirection).toContain('Spider-Verse')
      expect(optimized.stylePrompt).toContain('Spider-Verse')
      expect(optimized.videoMotionDirective).not.toMatch(/frozen still/i)
    })

    it('applyArtStyleToProjectMetadata stamps all layers and invalidates cached visionPhase.lookbook', () => {
      const customSpec = normalizeArtStyleSpec({
        title: 'Cel-Shaded Neo-Tokyo',
        medium: '2d-animation',
        stylePrompt: '90s cel-shaded anime aesthetic, hand-inked linework, atmospheric neon rain',
        confirmed: true,
      })
      const serialized = serializeArtStyleValue(customSpec)
      const prevMetadata = {
        visionPhase: {
          artStyle: 'photorealistic',
          lookbook: { masterStyle: 'stale live-action lookbook' },
          scenes: [{ sceneNumber: 1 }],
        },
        filmTreatmentVariant: {
          id: 'v1',
          art_style: 'photorealistic',
        },
      }

      const next = applyArtStyleToProjectMetadata(prevMetadata, serialized, customSpec)
      const nextVision = next.visionPhase as Record<string, unknown>
      const nextVariant = next.filmTreatmentVariant as Record<string, unknown>

      expect(next.artStyle).toBe(serialized)
      expect(nextVision.artStyle).toBe(serialized)
      expect(nextVision.lookbook).toBeNull()
      expect(nextVision.scenes).toEqual([{ sceneNumber: 1 }])
      expect(nextVariant.art_style).toBe(serialized)
    })
  })

  describe('2. Precedence & Series Consistency Lock Rule', () => {
    it('fixes the filmTreatmentVariant split-brain where default photorealistic shadowed visionPhase/metadata artStyle', () => {
      const metadata = {
        artStyle: 'ghibli',
        visionPhase: {
          artStyle: 'ghibli',
        },
        filmTreatmentVariant: {
          id: 'default',
          art_style: 'photorealistic',
        },
      }
      expect(resolveProjectArtStyle(metadata)).toBe('ghibli')
      expect(resolveProjectArtStyleSpec(metadata).medium).toBe('2d-animation')
    })

    it('enforces Series Consistency Lock across episode Blueprint and Production metadata', () => {
      const seriesSpec = normalizeArtStyleSpec({
        title: 'Arcane Painterly 3D',
        medium: 'painterly',
        stylePrompt: 'Hand-painted Arcane-style 3D brushstrokes, dramatic chiaroscuro rim light',
        confirmed: true,
        source: 'series',
        lockedBySeriesId: 'series-99',
        lockedBySeriesTitle: 'Iron & Ash',
      })
      const episodeMetadata = {
        seriesId: 'series-99',
        artStyle: 'photorealistic', // local accidental drift
        visionPhase: {
          artStyle: 'photorealistic',
        },
        seriesBibleRef: {
          seriesId: 'series-99',
          seriesTitle: 'Iron & Ash',
          aesthetic: {
            cinematography: seriesSpec.stylePrompt,
            artStyle: serializeArtStyleValue(seriesSpec),
            artStyleSpec: seriesSpec,
            artStyleLocked: true,
          },
        },
      }

      const resolvedSpec = resolveProjectArtStyleSpec(episodeMetadata)
      expect(resolvedSpec.title).toBe('Arcane Painterly 3D')
      expect(resolvedSpec.lockedBySeriesId).toBe('series-99')
      expect(resolveProjectArtStyle(episodeMetadata)).toContain('Hand-painted Arcane-style 3D')
    })

    it('resolves Series ArtStyleSpec from production_bible aesthetic and Blueprint normalizeVariantFoundation preserves custom styles', () => {
      const series = {
        id: 'ser-1',
        title: 'Clockwork Harbor',
        production_bible: {
          aesthetic: {
            artStyle: 'watercolor',
            artStyleLocked: true,
          },
        },
      }
      const resolvedSeries = resolveSeriesArtStyleSpec(series)
      expect(resolvedSeries.presetId).toBe('watercolor')
      expect(resolvedSeries.lockedBySeriesId).toBe('ser-1')

      const variantFoundation = normalizeVariantFoundation({
        art_style: 'Stop-Motion Felt Diorama: tactile wool felt miniature puppetry, shallow tilt-shift depth',
      })
      expect(variantFoundation.art_style).toContain('Stop-Motion Felt Diorama')

      const block = buildArtStylePromptBlock(variantFoundation.art_style, variantFoundation.art_style_spec)
      expect(block).toContain('LOCKED ART STYLE — ')
      expect(block).toContain('Stop-Motion Felt Diorama')
    })
  })

  describe('3. Continuity Reference Prompts (Cast, Wardrobe, Locations, Props)', () => {
    it('keeps photorealistic Continuity Reference prompts byte-compatible while making stylized mediums native', () => {
      const liveCast = buildCharacterIdentityReferencePrompt({
        characterName: 'Maya',
        appearanceDescription: '28, East Asian woman, short bob haircut',
        artStyle: 'photorealistic',
      })
      expect(liveCast).toContain(CHARACTER_IDENTITY_REFERENCE_ANCHOR)

      const ghibliCast = buildCharacterIdentityReferencePrompt({
        characterName: 'Maya',
        appearanceDescription: '28, East Asian woman, short bob haircut',
        artStyle: 'ghibli',
      })
      expect(ghibliCast).not.toContain(CHARACTER_IDENTITY_REFERENCE_ANCHOR)
      expect(ghibliCast).toMatch(/Studio Ghibli/i)
      expect(ghibliCast).toMatch(/NO live-action human photography/i)

      // Stored live-action imagePrompt is invalidated when Global Art Style switches to ghibli
      const resolvedCast = resolveCastIdentityGenerationPrompt(
        {
          name: 'Maya',
          appearanceDescription: '28, East Asian woman, short bob haircut',
          imagePrompt: liveCast,
        },
        'ghibli'
      )
      expect(resolvedCast.rawMode).toBe(false)
      expect(resolvedCast.prompt).toMatch(/Studio Ghibli/i)

      const pixarWardrobe = buildFullBodyWardrobePrompt({
        characterName: 'Maya',
        appearanceDescription: '28, East Asian woman, short bob haircut',
        wardrobeDescription: 'Cobaltflight jacket, cargo trousers, worn leather boots',
        artStyle: 'pixar',
      })
      expect(pixarWardrobe).toMatch(/Pixar/i)
      expect(pixarWardrobe).not.toMatch(/Photorealistic full-body reference photograph/i)

      const watercolorLoc = buildLocationBasePrompt(
        'FLOATING LANTERN MARKET',
        'EXT.',
        'NIGHT',
        'Wooden canal piers strung with glowing paper lanterns',
        { artStyle: 'watercolor' }
      )
      expect(watercolorLoc).toMatch(/Watercolor/i)
      expect(watercolorLoc).not.toContain('One photograph capturing')

      const watercolorVer = buildLocationVersionPrompt({
        locationName: 'FLOATING LANTERN MARKET',
        stateNotes: 'After the storm; lanterns extinguished and puddles reflecting moonlight',
        intExt: 'EXT.',
        timeOfDay: 'NIGHT',
        artStyle: 'watercolor',
      })
      expect(watercolorVer).toMatch(/Watercolor/i)

      const ghibliProp = buildObjectReferencePrompt(
        {
          id: 'prop-1',
          type: 'object',
          name: 'Brass Astrolabe',
          description: '6-inch engraved brass astrolabe, handheld',
        },
        'ghibli'
      )
      expect(ghibliProp).toMatch(/Studio Ghibli/i)
      expect(withObjectReferenceInstruction('6-inch brass key', 'photorealistic')).not.toMatch(/Studio Ghibli/i)
    })
  })

  describe('4. Stills, Structured Prompt Assembler & Negative Prompts', () => {
    it('eliminates 35mm live-action & anti-cartoon contradictions for stylized Global Art Styles and stays idempotent', () => {
      const liveStill = assembleStructuredStillPrompt({
        subjectAction: 'Maya holds the glowing lantern on the rain-slick bridge.',
        settingLighting: 'Canal bridge at night, warm amber lantern glow.',
        cameraComposition: 'Medium shot, eye-level.',
        style: describeArtStyleAnchor('photorealistic'),
        artStyle: 'photorealistic',
      })
      expect(liveStill).toContain(STILL_PURPOSE_LINE)
      expect(liveStill).toContain(DEFAULT_STILL_QUALITY_EXCLUSIONS.replace(/\.$/, ''))

      const ghibliStill = assembleStructuredStillPrompt({
        subjectAction: 'Maya holds the glowing lantern on the rain-slick bridge.',
        settingLighting: 'Canal bridge at night, warm amber lantern glow.',
        cameraComposition: 'Medium shot, eye-level.',
        style: describeArtStyleAnchor('ghibli'),
        artStyle: 'ghibli',
      })
      expect(ghibliStill).toContain(STYLIZED_STILL_PURPOSE_LINE)
      expect(ghibliStill).toContain(DEFAULT_STYLIZED_STILL_QUALITY_EXCLUSIONS.replace(/\.$/, ''))
      expect(ghibliStill).not.toContain('35mm live-action')
      expect(ghibliStill).not.toContain('cartoon, anime')

      // Replay idempotency
      const replayed = assembleStructuredStillPrompt({
        subjectAction: ghibliStill,
        artStyle: 'ghibli',
      })
      expect(replayed).toBe(ghibliStill)

      const ghibliNeg = buildSceneImageNegativePrompt({
        artStyle: 'ghibli',
        extraTerms: getArtStyleNegativeTerms('ghibli'),
      })
      expect(ghibliNeg).not.toContain('cartoon style')
      expect(ghibliNeg).toMatch(/photorealistic/i)

      // Even without extraTerms, stylized artStyle injects medium negative exclusions automatically
      const autoGhibliNeg = buildSceneImageNegativePrompt({ artStyle: 'ghibli' })
      expect(autoGhibliNeg).not.toContain('cartoon style')
      expect(autoGhibliNeg).toMatch(/photorealistic/i)

      const autoPixarNeg = buildSceneImageNegativePrompt({ artStyle: 'pixar' })
      expect(autoPixarNeg).not.toContain('3D render')
      expect(autoPixarNeg).not.toContain('cartoon style')
      expect(autoPixarNeg).toMatch(/photorealistic|live-action/i)
    })
  })

  describe('5. Video Clip Compiler Style Persistence', () => {
    it('appends Global Art Style video motion directive even when beatDirection.videoPrompt is pre-stored', () => {
      const beat: SceneBeat = {
        beatId: 'beat-1',
        beatType: 'action',
        actionDescription: 'Maya runs across the arched bridge.',
        beatDirection: {
          shotType: 'Wide Tracking Shot',
          cameraAngle: 'Low angle',
          cameraMovement: 'Smooth dolly tracking right',
          subjectAction: 'Maya sprints across the wet wooden bridge.',
          lightingMood: 'Warm lantern light through mist',
          frozenMoment: 'Maya mid-stride on the bridge.',
          videoPrompt:
            'Wide tracking shot following Maya sprinting across the wet wooden bridge at night, lantern reflections rippling.',
        },
      }

      const compiled = compileBeatVideoPromptFromDirection(beat, undefined, {
        artStyleId: 'ghibli',
      })
      const expectedSuffix = getArtStyleVideoPromptSuffix('ghibli')
      expect(expectedSuffix).toBeTruthy()
      expect(compiled.prompt).toContain(expectedSuffix)
      expect(compiled.negativePrompt).toMatch(/photorealistic/i)
    })
  })
})
