import { describe, it, expect } from 'vitest'
import { resolveBeatElementSelection, resolveBeatVideoReferences, shouldReplaceClientVideoReferences } from '@/lib/vision/resolveBeatVideoReferences'
import { bindingFromCaption, formatNextImageCaption } from '@/lib/vision/referenceImageBinding'
import { buildOmniVideoReferencePrompt } from '@/lib/gemini/buildOmniVideoReferencePrompt'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { LocationReference } from '@/types/visionReferences'

const characters = [
  {
    id: 'c1',
    name: 'Elara Vance',
    referenceImage: 'https://blob.example/elara.jpg',
    wardrobes: [
      {
        id: 'w1',
        name: 'Casual',
        description: 'Dark slate cardigan over charcoal trousers',
        fullBodyUrl: 'https://blob.example/elara-wardrobe.jpg',
        combinedCharacterRefUrl: 'https://blob.example/elara-pip.jpg',
        isDefault: true,
      },
    ],
  },
]

const locations: LocationReference[] = [
  {
    id: 'loc-kitchen',
    location: 'KITCHEN',
    imageUrl: 'https://blob.example/kitchen.jpg',
  },
]

const objects = [
  {
    id: 'prop-mug',
    name: 'Coffee Mug',
    imageUrl: 'https://blob.example/mug.jpg',
    importance: 'important' as const,
    category: 'prop' as const,
  },
]

describe('resolveBeatVideoReferences', () => {
  it('defaults to the scene-assigned PiP reference (character face + wardrobe) with consistent wardrobe description', () => {
    const beat: SceneBeat = {
      beatId: 'beat-1',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: 'Elara Vance',
      line: 'This coffee is perfect.',
      lineId: 'line-1',
    }
    const scene = {
      heading: 'INT. KITCHEN - DAY',
      action: 'Elara sips from her coffee mug.',
      beats: [beat],
    }

    const resolved = resolveBeatVideoReferences({
      scene,
      beat,
      projectCharacters: characters,
      locationReferences: locations,
      objectReferences: objects,
    })

    expect(resolved.urlList).toContain('https://blob.example/elara-pip.jpg')
    expect(resolved.urlList).not.toContain('https://blob.example/elara.jpg')
    expect(resolved.urlList).not.toContain('https://blob.example/elara-wardrobe.jpg')
    const charRef = resolved.labeledRefs.find((r) => r.characterName === 'Elara Vance')
    expect(charRef?.refRole).toBe('wardrobe-diptych')
    expect(charRef?.name.startsWith('The next image is the identity and wardrobe of person [1].')).toBe(true)
    expect(charRef?.wardrobeDescription).toBe('Dark slate cardigan over charcoal trousers')
    expect(resolved.labeledRefs.some((r) => /Char_/.test(r.name))).toBe(false)
    expect(resolved.labeledRefs.some((r) => r.role === 'location')).toBe(true)

    const omniPrompt = buildOmniVideoReferencePrompt({
      scenePrompt: 'Elara Vance sips from her coffee mug.',
      refs: resolved.refs,
    })
    expect(omniPrompt).toContain(
      'person [1] (Elara Vance) is the person in the identity and wardrobe image of person [1]. Clothes of person [1]: Dark slate cardigan over charcoal trousers.'
    )

    const elements = resolveBeatElementSelection({
      scene,
      beat,
      projectCharacters: characters,
      locationReferences: locations,
      objectReferences: objects,
    })
    expect(elements.characterIds.length).toBeGreaterThan(0)
    expect(elements.locationRefId).toBe('loc-kitchen')
  })

  it('locks portrait-verified facial hair/traits, strips wardrobe plot parentheticals, and omits full-body scale/boots on Medium Close-Up shots', () => {
    const mcuBeat: SceneBeat = {
      beatId: 'bt_3f0e54b8-977',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: 'Gideon Croft',
      line: 'The current bleeds out.',
      beatDirection: {
        shotType: 'Medium Close-Up',
        castInFrame: ['Gideon Croft'],
      },
    }
    const gideonChars = [
      {
        id: 'char-gideon',
        name: 'Gideon Croft',
        height: '6-foot-7 tall',
        referenceImage: 'https://blob.example/gideon-id.png',
        visionDescription:
          'A man in his early 50s with warm medium-brown skin, tightly curled salt-and-pepper hair, and a short sculpted beard.',
        wardrobes: [
          {
            id: 'w-vault',
            name: 'Vault Archivist',
            description:
              'A dust-covered, rugged dark charcoal/slate canvas archivist smock and utilitarian work trousers over thermal underlayers, outfitted with a thick webbed canvas utility belt (which he removes in Scene 9 to tourniquet Piper). Heavy reinforced work boots.',
            isDefault: true,
          },
        ],
      },
    ]

    const resolved = resolveBeatVideoReferences({
      scene: { heading: 'INT. FREIGHT TUNNEL VAULT - NIGHT', beats: [mcuBeat] },
      beat: mcuBeat,
      projectCharacters: gideonChars,
      locationReferences: [
        {
          id: 'loc-vault',
          location: 'FREIGHT TUNNEL VAULT',
          imageUrl: 'https://blob.example/vault.png',
          description: 'Damp subterranean stone vault with 10-foot ceiling and 7-foot iron door.',
        },
      ],
      objectReferences: [],
    })

    const gideonRef = resolved.labeledRefs.find((r) => r.characterName === 'Gideon Croft')
    expect(gideonRef?.name).toContain('facial hair')
    expect(gideonRef?.name).toContain('short sculpted beard')
    expect(gideonRef?.name).not.toContain('6-foot-7 tall')
    expect(gideonRef?.wardrobeDescription).not.toContain('Scene 9')
    expect(gideonRef?.wardrobeDescription).not.toContain('Piper')
    expect(gideonRef?.wardrobeDescription).not.toContain('work trousers')
    expect(gideonRef?.wardrobeDescription).not.toContain('work boots')
    expect(gideonRef?.wardrobeDescription).toContain('archivist smock')

    const locRef = resolved.labeledRefs.find((r) => r.role === 'location')
    expect(locRef?.name).toBe('The next image is location [1].')

    const omniPrompt = buildOmniVideoReferencePrompt({
      scenePrompt: 'Gideon Croft leans forward.',
      refs: resolved.refs,
    })
    expect(omniPrompt).toContain('preserve exact portrait features:')
    expect(omniPrompt).toContain('short sculpted beard')
    expect(omniPrompt).not.toContain('Piper')
    expect(omniPrompt).not.toContain('work boots')
  })

  it('respects max reference cap', () => {
    const manyChars = Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`,
      name: `Character ${i}`,
      referenceImage: `https://blob.example/c${i}.jpg`,
    }))
    const beat: SceneBeat = {
      beatId: 'beat-2',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Character 0 and Character 1 talk while Character 2 enters.',
    }
    const scene = {
      heading: 'INT. KITCHEN - DAY',
      beats: [beat],
    }

    const resolved = resolveBeatVideoReferences({
      scene,
      beat,
      projectCharacters: manyChars,
      locationReferences: locations,
      objectReferences: objects,
    })

    expect(resolved.refs.length).toBeLessThanOrEqual(8)
  })

  it('uses the single-slot composite card only when includeWardrobeDiptych is explicitly opted in', () => {
    const beat: SceneBeat = {
      beatId: 'beat-sheet',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara Vance watches the engine.',
    }
    const resolved = resolveBeatVideoReferences({
      scene: { heading: 'INT. KITCHEN - DAY', beats: [beat] },
      beat,
      projectCharacters: [
        {
          ...characters[0],
          height: '5-foot-8 tall',
          wardrobes: [
            {
              id: 'w-sheet',
              name: 'Sheet',
              combinedCharacterRefUrl: 'https://blob.example/elara-sheet.jpg',
              isDefault: true,
            },
          ],
        },
      ],
      locationReferences: locations,
      objectReferences: objects,
      includeWardrobeDiptych: true,
    })

    expect(resolved.urlList).toContain('https://blob.example/elara-sheet.jpg')
    expect(resolved.urlList).not.toContain('https://blob.example/elara.jpg')
    const compositeRef = resolved.labeledRefs.find((r) => r.url === 'https://blob.example/elara-sheet.jpg')
    expect(compositeRef?.name).toContain('The next image is the identity and wardrobe of person [1].')
    expect(compositeRef?.name).toContain('face close-up')
    expect(compositeRef?.name).toContain('5-foot-8 tall')
    expect(compositeRef?.name).toContain('do not render the character-card layout or headshot overlay')
  })

  it('sends the user reference selection instead of whoever the prose names', () => {
    const beat: SceneBeat = {
      beatId: 'beat-user-ref',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: 'Elara Vance',
      line: 'This coffee is perfect.',
      referenceSelection: {
        characterIds: ['c2'],
        objectRefIds: [],
        locationRefId: null,
        source: 'user',
        resolvedAt: '2026-09-23T00:00:00.000Z',
      },
    }
    const resolved = resolveBeatVideoReferences({
      scene: { heading: 'INT. KITCHEN - DAY', beats: [beat] },
      beat,
      projectCharacters: [
        ...characters,
        {
          id: 'c2',
          name: 'Marcus Hale',
          referenceImage: 'https://blob.example/marcus.jpg',
        },
      ],
      locationReferences: locations,
      objectReferences: objects,
    })

    expect(resolved.urlList).toContain('https://blob.example/marcus.jpg')
    expect(resolved.urlList).not.toContain('https://blob.example/elara.jpg')
    expect(
      shouldReplaceClientVideoReferences(beat, [
        {
          url: 'https://blob.example/elara-wardrobe.jpg',
          type: 'character',
          name: 'Elara wardrobe',
        },
      ])
    ).toBe(true)
    expect(
      shouldReplaceClientVideoReferences(
        { ...beat, referenceSelection: undefined },
        [
          {
            url: 'https://blob.example/elara.jpg',
            type: 'character',
            name: 'Elara Vance',
          },
        ]
      )
    ).toBe(false)
  })

  it('falls back to a beat opening frame image as location [1] when no library location image is drawn yet', () => {
    const beat: SceneBeat = {
      beatId: 'beat-env-start',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'A luminous electrical wave surges across the shoreline.',
      storyboardStartImageUrl: 'https://blob.example/dark-chicago-start.jpg',
      beatDirection: {
        shotType: 'Wide Shot',
        castInFrame: [],
        startFrame:
          'Jagged slabs of blue-gray shelf ice span the lower foreground in dark shadow while the Englewood rail corridors sit in total blackout with every window and streetlamp dark and unlit.',
      },
    }
    const resolved = resolveBeatVideoReferences({
      scene: { heading: 'EXT. CHICAGO COASTLINE - NIGHT', beats: [beat] },
      beat,
      projectCharacters: [],
      locationReferences: [
        {
          id: 'loc-chicago',
          location: 'CHICAGO COASTLINE',
          imageUrl: '',
        },
      ],
      objectReferences: [],
    })

    expect(resolved.urlList).toEqual(['https://blob.example/dark-chicago-start.jpg'])
    expect(resolved.labeledRefs).toHaveLength(1)
    expect(resolved.labeledRefs[0].role).toBe('location')
    expect(resolved.labeledRefs[0].promptToken).toBe('location [1]')
  })

  it('replaces stale client video references when beatDirection castInFrame or keyProps are missing from clientRefs', () => {
    const optimizedBeat: SceneBeat = {
      beatId: 'beat-opt',
      sequenceIndex: 1,
      kind: 'dialogue',
      character: 'Gideon Croft',
      line: 'Look at the coil.',
      beatDirection: {
        generatedBy: 'director',
        shotType: 'Medium Shot',
        frozenMoment: 'Gideon Croft and Piper Hayes inspect the Brass Coil.',
        blocking: 'Gideon Croft and Piper Hayes stand beside the workbench.',
        castInFrame: ['Gideon Croft', 'Piper Hayes'],
        keyProps: ['Brass Coil'],
      },
    }

    // Stale clientRefs that only contain location [1] from before Shot Direction Optimization
    expect(
      shouldReplaceClientVideoReferences(optimizedBeat, [
        {
          url: 'https://blob.example/vault.jpg',
          type: 'scene',
          role: 'location',
          locationName: 'FREIGHT TUNNEL VAULT',
          name: 'The next image is the setting for location [1].',
        },
      ])
    ).toBe(true)

    // Complete clientRefs that include both characters and the key prop
    expect(
      shouldReplaceClientVideoReferences(optimizedBeat, [
        {
          url: 'https://blob.example/gideon.jpg',
          type: 'character',
          role: 'character-identity',
          characterName: 'Gideon Croft',
          name: 'The next image is the identity of person [1].',
        },
        {
          url: 'https://blob.example/piper.jpg',
          type: 'character',
          role: 'character-identity',
          characterName: 'Piper Hayes',
          name: 'The next image is the identity of person [2].',
        },
        {
          url: 'https://blob.example/coil.jpg',
          type: 'object',
          role: 'prop',
          propName: 'Brass Coil',
          name: 'The next image is object [1] (Brass Coil).',
        },
      ])
    ).toBe(false)
  })

  it('replaces legacy unlabeled PiP/wardrobe captions or missing dialogue speaker refs', () => {
    const beat: SceneBeat = {
      beatId: 'beat-stale-pip',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: 'Gideon Croft',
      line: 'She grounded through the water table.',
    }
    expect(
      shouldReplaceClientVideoReferences(beat, [
        {
          url: 'https://blob.example/gideon-pip.jpg',
          type: 'character',
          name: 'The next image is the identity and wardrobe of person [1].',
        },
      ])
    ).toBe(true)
    expect(
      shouldReplaceClientVideoReferences(beat, [
        {
          url: 'https://blob.example/vault.jpg',
          type: 'style',
          role: 'location',
          locationName: 'VAULT',
          name: 'The next image is location [1].',
        },
      ])
    ).toBe(true)
    expect(
      shouldReplaceClientVideoReferences(beat, [
        {
          url: 'https://blob.example/gideon-pip.jpg',
          type: 'character',
          role: 'wardrobe',
          refRole: 'wardrobe-diptych',
          characterName: 'Gideon Croft',
          name: 'The next image is the identity and wardrobe of person [1].',
        },
      ])
    ).toBe(false)
  })

  it('preserves opted-in combination-image inset instructions and outfit descriptions through bindingFromCaption and formatNextImageCaption', () => {
    const beat: SceneBeat = {
      beatId: 'beat-pip',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara Vance enters the kitchen.',
    }
    const resolved = resolveBeatVideoReferences({
      scene: { heading: 'INT. KITCHEN - DAY', beats: [beat] },
      beat,
      projectCharacters: [
        {
          id: 'c1',
          name: 'Elara Vance',
          referenceImage: 'https://blob.example/elara-headshot.jpg',
          visionDescription: 'Woman in her 30s with auburn hair and freckles.',
          wardrobes: [
            {
              id: 'w-pip',
              name: 'Subterranean Arrival',
              description: 'Charcoal wool trench coat over slate turtleneck',
              accessories: 'Brass lantern',
              fullBodyUrl: 'https://blob.example/elara-full.jpg',
              combinedCharacterRefUrl: 'https://blob.example/elara-combined-pip.jpg',
            },
          ],
        },
      ],
      locationReferences: locations,
      objectReferences: [],
    })

    const charRef = resolved.labeledRefs.find((r) => r.type === 'character')
    expect(charRef?.url).toBe('https://blob.example/elara-combined-pip.jpg')
    expect(charRef?.refRole).toBe('wardrobe-diptych')
    expect(charRef?.name).toContain('Extract exact facial identity from the face close-up')
    expect(charRef?.name).toContain('Charcoal wool trench coat')
    expect(charRef?.identityTraits).toContain('auburn hair')

    const parsedBinding = bindingFromCaption(charRef!.name)
    expect(parsedBinding?.role).toBe('character')
    expect(parsedBinding?.token).toBe('person [1]')
    const reemittedCaption = formatNextImageCaption(parsedBinding!)
    expect(reemittedCaption).toContain('Extract exact facial identity from the face close-up')
    expect(reemittedCaption).toContain('Charcoal wool trench coat')
  })

  it('sanitizes gore/injury wardrobe terms on default PiP character + wardrobe reference before Omni REF submission', () => {
    const beat: SceneBeat = {
      beatId: 'beat-seawall',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Piper Hayes braces on the granite rocks.',
    }
    const resolved = resolveBeatVideoReferences({
      scene: { heading: 'EXT. LAKE MICHIGAN SEAWALL - NIGHT', beats: [beat] },
      beat,
      projectCharacters: [
        {
          id: 'c-piper',
          name: 'Piper Hayes',
          referenceImage: 'https://blob.example/piper-headshot.jpg',
          wardrobes: [
            {
              id: 'w-parka',
              name: 'Parka',
              description:
                'Thoroughly waterlogged, freezing canvas parka with sheared left collar and bloodied gauze dressing, soaked dark wool',
              combinedCharacterRefUrl: 'https://blob.example/piper-diptych.jpg',
              isDefault: true,
            },
          ],
        },
      ],
      locationReferences: locations,
      objectReferences: [],
    })

    const charRef = resolved.labeledRefs.find((r) => r.type === 'character')
    expect(charRef?.url).toBe('https://blob.example/piper-diptych.jpg')
    expect(charRef?.refRole).toBe('wardrobe-diptych')
    expect(charRef?.name).toContain('The next image is the identity and wardrobe of person [1].')
    expect(charRef?.wardrobeDescription).not.toContain('bloodied')
    expect(charRef?.wardrobeDescription).not.toContain('gauze dressing')
    expect(charRef?.wardrobeDescription).toContain('dark cloth wrap')

    const omniPrompt = buildOmniVideoReferencePrompt({
      scenePrompt: 'Piper Hayes braces on the granite rocks.',
      refs: resolved.refs,
    })
    expect(omniPrompt).toContain('Clothes of person [1]:')
    expect(omniPrompt).toContain('dark cloth wrap')
    expect(omniPrompt).not.toContain('bloodied')
  })

  it('caps Omni video references at 8 and orders survivors strictly as character -> wardrobe -> location -> props', () => {
    const beat: SceneBeat = {
      beatId: 'beat-cap-order',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription:
        'Gideon Croft and Piper Hayes examine Prop1, Prop2, Prop3, Prop4, and Prop5 in the vault.',
      referenceSelection: {
        characterIds: ['c-gideon', 'c-piper'],
        locationRefId: 'loc-vault',
        objectRefIds: ['p-other-1', 'p-crit', 'p-other-2', 'p-imp', 'p-other-3'],
        source: 'user',
        resolvedAt: '2026-11-10T00:00:00.000Z',
      },
    }
    const resolved = resolveBeatVideoReferences({
      scene: { heading: 'INT. VAULT - NIGHT', beats: [beat] },
      beat,
      includeWardrobeReferenceImages: true,
      projectCharacters: [
        {
          id: 'c-gideon',
          name: 'Gideon Croft',
          referenceImage: 'https://blob.example/gideon-id.jpg',
          wardrobes: [{ id: 'wg', name: 'Coat', fullBodyUrl: 'https://blob.example/gideon-wardrobe.jpg' }],
        },
        {
          id: 'c-piper',
          name: 'Piper Hayes',
          referenceImage: 'https://blob.example/piper-id.jpg',
          wardrobes: [{ id: 'wp', name: 'Parka', fullBodyUrl: 'https://blob.example/piper-wardrobe.jpg' }],
        },
      ],
      locationReferences: [
        { id: 'loc-vault', location: 'VAULT', imageUrl: 'https://blob.example/vault.jpg' },
      ],
      objectReferences: [
        { id: 'p-other-1', name: 'Chalk', imageUrl: 'https://blob.example/p-other-1.jpg', importance: 'secondary', category: 'prop' },
        { id: 'p-crit', name: 'Resonance Core', imageUrl: 'https://blob.example/p-crit.jpg', importance: 'critical', category: 'prop' },
        { id: 'p-other-2', name: 'Rag', imageUrl: 'https://blob.example/p-other-2.jpg', importance: 'secondary', category: 'prop' },
        { id: 'p-imp', name: 'Brass Spanner', imageUrl: 'https://blob.example/p-imp.jpg', importance: 'important', category: 'prop' },
        { id: 'p-other-3', name: 'Bucket', imageUrl: 'https://blob.example/p-other-3.jpg', importance: 'secondary', category: 'prop' },
      ],
    })

    // 2 characters + 2 wardrobes + 1 location + 5 props = 10 -> capped at 8, dropping 2 lowest props
    expect(resolved.labeledRefs).toHaveLength(8)
    expect(resolved.labeledRefs.map((r) => r.url)).toEqual([
      'https://blob.example/gideon-id.jpg',
      'https://blob.example/piper-id.jpg',
      'https://blob.example/gideon-wardrobe.jpg',
      'https://blob.example/piper-wardrobe.jpg',
      'https://blob.example/vault.jpg',
      'https://blob.example/p-crit.jpg',
      'https://blob.example/p-imp.jpg',
      'https://blob.example/p-other-1.jpg',
    ])
    expect(resolved.warnings.some((w) => w.includes('Dropped 2 reference(s) (cap=8)'))).toBe(true)
  })
})
