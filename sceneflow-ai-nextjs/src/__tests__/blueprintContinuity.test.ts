import { describe, expect, it } from 'vitest'
import {
  buildVisionPhaseContinuityFromVariant,
  extractFallbackPropsFromSceneDescriptions,
  resolveBlueprintContinuity,
} from '@/lib/blueprint/blueprintContinuity'
import { bindTreatmentToLibrary } from '@/lib/series/bindLibraryAssets'
import { lockedLibraryFromBible } from '@/lib/series/continuityContext'
import { repairTreatment } from '@/lib/treatment/validate'
import {
  applyTreatmentVariantTranslations,
  buildTreatmentVariantDisplayFields,
} from '@/i18n/content/buildBlueprintDisplayFields'
import { classifyField } from '@/i18n/content/fieldRegistry'

describe('Blueprint Continuity (Cast, Locations, Props)', () => {
  it('resolves standalone Blueprint Continuity with Cast, Locations, and Props', () => {
    const variant = {
      id: 'var-standalone',
      character_descriptions: [
        {
          name: 'Elena Vance',
          role: 'protagonist',
          description: 'An investigative archivist uncovering a lost signal.',
          externalGoal: 'Decode the relay tape',
          internalNeed: 'Trust her own memory',
          fatalFlaw: 'Obsessive isolation',
        },
      ],
      scene_descriptions: [
        {
          name: 'Subterranean Vault',
          type: 'INT',
          location: 'Concrete archive beneath the old observatory',
          atmosphere: 'Humid, flickering sodium lamps, dust motes',
          furniture_props: 'Reel-to-reel console, steel filing cabinets, brass key',
        },
      ],
      prop_descriptions: [
        {
          name: 'Reel-to-Reel Console',
          category: 'technology',
          description: 'Brushed-steel analog tape deck with amber VU meters.',
          significance: 'Plays the only surviving recording of the anomaly.',
          importance: 'critical',
        },
      ],
    }

    const resolved = resolveBlueprintContinuity(variant, null)
    expect(resolved.isSeriesShared).toBe(false)
    expect(resolved.counts).toEqual({
      cast: 1,
      locations: 1,
      props: 1,
      total: 3,
    })
    expect(resolved.cast[0].name).toBe('Elena Vance')
    expect(resolved.cast[0].variantIndex).toBe(0)
    expect(resolved.locations[0].name).toBe('Subterranean Vault')
    expect(resolved.locations[0].type).toBe('INT')
    expect(resolved.props[0].name).toBe('Reel-to-Reel Console')
    expect(resolved.props[0].category).toBe('technology')
  })

  it('extracts fallback props from scene_descriptions.furniture_props when prop_descriptions is absent', () => {
    const fallbackProps = extractFallbackPropsFromSceneDescriptions([
      {
        name: 'Harbor Office',
        furniture_props: 'Brass sextant, Weathered ledger; Harbour map',
      },
    ])
    expect(fallbackProps.map((p) => p.name)).toEqual([
      'Brass sextant',
      'Weathered ledger',
      'Harbour map',
    ])
  })

  it('merges shared Series Continuity library with episode Blueprint variant', () => {
    const variant = {
      id: 'var-ep2',
      character_descriptions: [
        {
          name: 'Elena Vance',
          role: 'protagonist',
          description: 'Now leading the expedition.',
          libraryCharacterId: 'char-elena',
        },
        {
          name: 'Dr. Kaelen',
          role: 'supporting',
          description: 'Local seismologist introduced in Episode 2.',
          isNew: true,
        },
      ],
      scene_descriptions: [
        {
          name: 'Subterranean Vault',
          type: 'INT',
          location: 'Flooded lower level of the archive',
          libraryLocationId: 'loc-vault',
        },
      ],
      prop_descriptions: [],
    }

    const sharedSource = {
      seriesId: 'series-123',
      seriesTitle: 'Signal Horizon',
      bibleCharacters: [
        {
          id: 'char-elena',
          name: 'Elena Vance',
          role: 'protagonist',
          description: 'Lead archivist.',
          referenceImage: 'https://example.com/elena.png',
        },
        {
          id: 'char-marcus',
          name: 'Commander Marcus',
          role: 'antagonist',
          description: 'Director of the containment bureau.',
          referenceImage: 'https://example.com/marcus.png',
        },
      ],
      bibleLocations: [
        {
          id: 'loc-vault',
          name: 'Subterranean Vault',
          description: 'Concrete archive beneath the observatory.',
          referenceImage: 'https://example.com/vault.png',
        },
        {
          id: 'loc-tower',
          name: 'Relay Tower',
          description: 'Wind-swept ridge antenna array.',
        },
      ],
      bibleProps: [
        {
          id: 'prop-tape',
          name: 'Cipher Tape #7',
          category: 'object',
          description: 'Magnetic reel sealed in a lead canister.',
          significance: 'Contains the coordinates.',
          importance: 'critical',
          referenceImage: 'https://example.com/tape.png',
        },
      ],
    }

    const resolved = resolveBlueprintContinuity(variant, sharedSource)
    expect(resolved.isSeriesShared).toBe(true)
    expect(resolved.seriesId).toBe('series-123')
    expect(resolved.seriesTitle).toBe('Signal Horizon')

    // Cast: Elena (merged with series image), Dr. Kaelen (new episode char), Commander Marcus (shared from series bible)
    expect(resolved.cast).toHaveLength(3)
    const elena = resolved.cast.find((c) => c.name === 'Elena Vance')!
    expect(elena.isSharedFromSeries).toBe(true)
    expect(elena.referenceImage).toBe('https://example.com/elena.png')

    const kaelen = resolved.cast.find((c) => c.name === 'Dr. Kaelen')!
    expect(kaelen.isSharedFromSeries).toBeFalsy()
    expect(kaelen.isNew).toBe(true)

    const marcus = resolved.cast.find((c) => c.name === 'Commander Marcus')!
    expect(marcus.isSharedFromSeries).toBe(true)
    expect(marcus.referenceImage).toBe('https://example.com/marcus.png')

    // Locations: Subterranean Vault (merged) + Relay Tower (shared from series bible)
    expect(resolved.locations).toHaveLength(2)
    expect(resolved.locations[0].referenceImage).toBe('https://example.com/vault.png')
    expect(resolved.locations[0].isSharedFromSeries).toBe(true)
    expect(resolved.locations[1].name).toBe('Relay Tower')

    // Props: Cipher Tape #7 from Series Bible
    expect(resolved.props).toHaveLength(1)
    expect(resolved.props[0].name).toBe('Cipher Tape #7')
    expect(resolved.props[0].isSharedFromSeries).toBe(true)
  })

  it('builds Production Stage visionPhase continuity (characters, locationReferences, objectReferences) from variant', () => {
    const variant = {
      character_descriptions: [
        {
          name: 'Elena Vance',
          role: 'protagonist',
          description: 'Investigative archivist',
          referenceImage: 'https://example.com/elena.png',
          libraryCharacterId: 'char-elena',
        },
      ],
      scene_descriptions: [
        {
          name: 'Subterranean Vault',
          type: 'INT',
          location: 'Concrete archive beneath the old observatory',
          atmosphere: 'Humid, flickering sodium lamps',
          libraryLocationId: 'loc-vault',
        },
      ],
      prop_descriptions: [
        {
          name: 'Cipher Tape #7',
          category: 'object',
          description: 'Magnetic reel sealed in a lead canister',
          significance: 'Contains the coordinates',
          importance: 'critical',
          libraryPropId: 'prop-tape',
        },
      ],
    }

    const visionContinuity = buildVisionPhaseContinuityFromVariant(variant, null)
    expect(visionContinuity.characters).toHaveLength(1)
    expect(visionContinuity.characters[0].name).toBe('Elena Vance')
    expect(visionContinuity.characters[0].libraryAssetId).toBe('char-elena')

    expect(visionContinuity.references.locationReferences).toHaveLength(1)
    expect(visionContinuity.references.locationReferences[0].location).toBe(
      'Subterranean Vault'
    )
    expect(visionContinuity.references.locationReferences[0].libraryAssetId).toBe(
      'loc-vault'
    )

    expect(visionContinuity.references.objectReferences).toHaveLength(1)
    expect(visionContinuity.references.objectReferences[0].name).toBe('Cipher Tape #7')
    expect(visionContinuity.references.objectReferences[0].libraryAssetId).toBe(
      'prop-tape'
    )
  })

  it('binds Series Bible characters, locations, and props in bindTreatmentToLibrary', () => {
    const locked = lockedLibraryFromBible({
      characters: [
        {
          id: 'char-1',
          name: 'Elena Vance',
          role: 'protagonist',
          description: 'Archivist',
          referenceImage: 'https://example.com/elena.png',
        },
      ],
      locations: [
        {
          id: 'loc-1',
          name: 'Subterranean Vault',
          description: 'Concrete archive',
          referenceImage: 'https://example.com/vault.png',
        },
      ],
      props: [
        {
          id: 'prop-1',
          name: 'Cipher Tape #7',
          category: 'object',
          description: 'Magnetic reel',
          significance: 'Key evidence',
          importance: 'critical',
          referenceImage: 'https://example.com/tape.png',
        },
      ],
    })

    const bound = bindTreatmentToLibrary(
      {
        character_descriptions: [{ name: 'Elena Vance', description: 'Ep 1 description' }],
        scene_descriptions: [{ name: 'Subterranean Vault', type: 'INT' }],
        prop_descriptions: [{ name: 'Cipher Tape #7' }],
      },
      locked
    )

    expect(bound.character_descriptions[0].libraryCharacterId).toBe('char-1')
    expect(bound.character_descriptions[0].referenceImage).toBe(
      'https://example.com/elena.png'
    )
    expect(bound.scene_descriptions[0].libraryLocationId).toBe('loc-1')
    expect(bound.scene_descriptions[0].referenceImage).toBe(
      'https://example.com/vault.png'
    )
    expect(bound.prop_descriptions[0].libraryPropId).toBe('prop-1')
    expect(bound.prop_descriptions[0].referenceImage).toBe(
      'https://example.com/tape.png'
    )
  })

  it('preserves scene_descriptions and prop_descriptions in repairTreatment', () => {
    const raw = {
      title: 'Signal Horizon',
      logline: 'An archivist decodes a vanished station signal.',
      synopsis: 'Full synopsis text.',
      setting: 'Remote coastal observatory',
      protagonist: 'Elena Vance',
      antagonist: 'Commander Marcus',
      tone: 'Suspenseful',
      visual_style: 'Anamorphic noir',
      themes: ['Memory', 'Truth'],
      character_descriptions: [
        { name: 'Elena Vance', role: 'protagonist', description: 'Lead archivist' },
      ],
      scene_descriptions: [
        {
          name: 'Subterranean Vault',
          type: 'INT',
          location: 'Concrete archive',
          atmosphere: 'Cold fluorescent hum',
          furniture_props: 'Tape console',
        },
      ],
      prop_descriptions: [
        {
          name: 'Cipher Tape #7',
          category: 'object',
          description: 'Magnetic reel',
          significance: 'Holds the signal',
          importance: 'critical',
        },
      ],
      beats: [{ title: 'Opening', minutes: 2, synopsis: 'Elena finds the tape.' }],
    }

    const repaired = repairTreatment(raw)
    expect(repaired.scene_descriptions).toHaveLength(1)
    expect(repaired.scene_descriptions?.[0].name).toBe('Subterranean Vault')
    expect(repaired.prop_descriptions).toHaveLength(1)
    expect(repaired.prop_descriptions?.[0].name).toBe('Cipher Tape #7')
  })

  it('registers scene_descriptions and prop_descriptions display fields for i18n content MT', () => {
    expect(classifyField('treatmentVariants[v1].scene_descriptions[0].name')).toBe('opaque')
    expect(classifyField('treatmentVariants[v1].scene_descriptions[0].location')).toBe(
      'display'
    )
    expect(classifyField('treatmentVariants[v1].scene_descriptions[0].atmosphere')).toBe(
      'display'
    )
    expect(classifyField('treatmentVariants[v1].prop_descriptions[0].name')).toBe('opaque')
    expect(classifyField('treatmentVariants[v1].prop_descriptions[0].description')).toBe(
      'display'
    )
    expect(classifyField('treatmentVariants[v1].prop_descriptions[0].significance')).toBe(
      'display'
    )

    const variant = {
      id: 'v1',
      title: 'Signal Horizon',
      scene_descriptions: [
        {
          name: 'Vault',
          location: 'Underground room',
          atmosphere: 'Dark and humid',
          furniture_props: 'Steel desk',
        },
      ],
      prop_descriptions: [
        {
          name: 'Cipher Tape',
          description: 'Silver reel',
          significance: 'Unlocks the vault',
        },
      ],
    }

    const fields = buildTreatmentVariantDisplayFields(variant)
    expect(fields['treatmentVariants[v1].scene_descriptions[0].location']).toBe(
      'Underground room'
    )
    expect(fields['treatmentVariants[v1].prop_descriptions[0].description']).toBe(
      'Silver reel'
    )

    const localized = applyTreatmentVariantTranslations(variant, (path) =>
      path.endsWith('.location') ? 'Sala subterránea' : ''
    )
    expect(localized?.scene_descriptions[0].location).toBe('Sala subterránea')
  })
})
