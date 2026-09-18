import { describe, expect, it } from 'vitest'
import {
  applyInterleavedPairCaptionsToNamedImages,
  buildInterleavedReferencePairCaptions,
  formatInterleavedReferencePair,
} from '@/lib/imagen/interleavedReferencePair'
import { isIdentityReferencePartName } from '@/lib/vertexai/identityReferencePartName'
import { PROP_SCALE_FURNITURE } from '@/lib/imagen/propScaleClause'

const PIPER_VISION =
  'An East Asian woman in her mid-to-late 40s with a lean build and a warm ' +
  'light-tan complexion. She has straight, shoulder-length black hair with a center part.'

describe('formatInterleavedReferencePair', () => {
  it('emits [REFERENCE: ROLE - token] then the descriptor', () => {
    expect(
      formatInterleavedReferencePair({
        role: 'IDENTITY',
        token: 'person [1]',
        descriptor: 'Facial reference for Piper Hayes: East Asian, warm light-tan complexion',
      })
    ).toBe(
      '[REFERENCE: IDENTITY - person [1]] Facial reference for Piper Hayes: East Asian, warm light-tan complexion'
    )
  })
})

describe('buildInterleavedReferencePairCaptions', () => {
  it('shares person [1] across identity and wardrobe; prop/location stay [1] not send-index', () => {
    const captions = buildInterleavedReferencePairCaptions(
      [
        {
          imageUrl: 'https://example.com/piper-id.jpg',
          name: 'Reference image 1 — IDENTITY of person [1] (Piper Hayes)',
          role: 'identity',
          refRole: 'identity',
          characterName: 'Piper Hayes',
          subjectOrdinal: 1,
        },
        {
          imageUrl: 'https://example.com/piper-wardrobe.jpg',
          name: 'Reference image 2 — WARDROBE of person [1] (Piper Hayes) — full-body outfit',
          role: 'wardrobe',
          refRole: 'wardrobe',
          characterName: 'Piper Hayes',
          subjectOrdinal: 1,
        },
        {
          imageUrl: 'https://example.com/workbench.jpg',
          name: `Reference image 3 — PROP prop [3] (Zinc workbench): ${PROP_SCALE_FURNITURE}`,
          role: 'prop-critical',
          propName: 'Zinc workbench',
          promptToken: 'prop [1]',
          propDescription: PROP_SCALE_FURNITURE,
        },
        {
          imageUrl: 'https://example.com/vault.jpg',
          name: 'Reference image 4 — LOCATION location [4] (FREIGHT TUNNEL VAULT) — environment plate — match architecture, palette, and lighting; not a second wide subject',
          role: 'location',
          locationName: 'FREIGHT TUNNEL VAULT',
          promptToken: 'location [1]',
        },
      ],
      [
        {
          name: 'Piper Hayes',
          promptToken: 'person [1]',
          subjectOrdinal: 1,
          visionDescription: PIPER_VISION,
          wardrobeDescription: 'Subterranean Arrival charcoal wool overcoat over a dark knit, leather boots',
        },
      ]
    )

    expect(captions[0].name).toMatch(
      /^\[REFERENCE: IDENTITY - person \[1\]\] Facial reference for Piper Hayes:/
    )
    expect(captions[0].name).toMatch(/East Asian/)
    expect(captions[1].name).toMatch(
      /^\[REFERENCE: WARDROBE - person \[1\]\] Outfit reference:/
    )
    expect(captions[1].name).toMatch(/Subterranean Arrival/)
    expect(captions[2].name).toMatch(/^\[REFERENCE: PROP - prop \[1\]\] Object reference:/)
    expect(captions[3].name).toMatch(
      /^\[REFERENCE: LOCATION - location \[1\]\] Environment reference:/
    )

    const joined = captions.map((caption) => caption.name).join('\n')
    expect(joined).not.toMatch(/prop \[3\]/)
    expect(joined).not.toMatch(/location \[4\]/)
    expect(joined).not.toMatch(/furniture \/ set-piece/)
    expect(joined).not.toMatch(/not a second wide subject/)
    expect(joined).not.toMatch(/do not enlarge/)

    expect(isIdentityReferencePartName(captions[0].name)).toBe(true)
    expect(isIdentityReferencePartName(captions[1].name)).toBe(false)
    expect(isIdentityReferencePartName(captions[2].name)).toBe(false)
    expect(isIdentityReferencePartName(captions[3].name)).toBe(false)
  })

  it('does not face-crop a combined character plate', () => {
    const [caption] = buildInterleavedReferencePairCaptions(
      [
        {
          imageUrl: 'https://example.com/piper-diptych.jpg',
          name: 'Character reference: Char_Piper_Hayes — face and full-body wardrobe',
          role: 'identity',
          refRole: 'wardrobe-diptych',
          characterName: 'Piper Hayes',
          subjectOrdinal: 1,
        },
      ],
      [{ name: 'Piper Hayes', promptToken: 'person [1]', subjectOrdinal: 1 }]
    )

    expect(caption.name).toMatch(/^\[REFERENCE: CHARACTER - person \[1\]\]/)
    expect(isIdentityReferencePartName(caption.name)).toBe(false)
  })
})

describe('applyInterleavedPairCaptionsToNamedImages', () => {
  it('recaptions Char_ identity/wardrobe/prop/location labels with role-stable tokens', () => {
    const captions = applyInterleavedPairCaptionsToNamedImages(
      [
        {
          imageUrl: 'https://example.com/id.jpg',
          name: 'Identity reference: Char_Piper_Hayes',
        },
        {
          imageUrl: 'https://example.com/wardrobe.jpg',
          name: 'Wardrobe reference: Char_Piper_Hayes (full-body outfit)',
        },
        {
          imageUrl: 'https://example.com/prop.jpg',
          name: 'Prop: Zinc workbench',
        },
        {
          imageUrl: 'https://example.com/loc.jpg',
          name: 'Location reference 4: FREIGHT TUNNEL VAULT (extreme-wide establishing shot)',
        },
      ],
      {
        characters: [
          {
            name: 'Piper Hayes',
            visionDescription: PIPER_VISION,
            wardrobe: 'Subterranean Arrival charcoal wool overcoat',
          },
        ],
        objects: [{ name: 'Zinc workbench', description: PROP_SCALE_FURNITURE }],
        locations: [{ name: 'FREIGHT TUNNEL VAULT' }],
      }
    )

    expect(captions[0].name).toContain('[REFERENCE: IDENTITY - person [1]]')
    expect(captions[1].name).toContain('[REFERENCE: WARDROBE - person [1]]')
    expect(captions[2].name).toContain('[REFERENCE: PROP - prop [1]]')
    expect(captions[3].name).toContain('[REFERENCE: LOCATION - location [1]]')
    expect(captions[2].name).not.toMatch(/furniture \/ set-piece/)
    expect(captions[3].name).not.toMatch(/extreme-wide establishing/)
  })
})
