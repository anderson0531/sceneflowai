import { describe, expect, it } from 'vitest'
import {
  IDENTITY_TRAITS_RETRY_WORD_CAP,
  IDENTITY_TRAITS_WORD_CAP,
  buildIdentityEscalationBlock,
  buildIdentityTraitsClause,
} from '@/lib/imagen/identityTraitsClause'
import {
  formatStillReferencesLegend,
  stillRefsFromAttachedImages,
} from '@/lib/imagen/structuredStillPrompt'

const GIDEON_VISION =
  'A man in his early 50s with warm medium-brown skin, tightly curled salt-and-pepper hair ' +
  'cropped close, and a short grizzled beard. He wears a charcoal wool overcoat.'

/** Enough traits to overrun the legend cap, so the retry cap has something to recover. */
const VERBOSE_VISION =
  'A man in his early 50s with warm golden sun-weathered medium-brown skin, thick tightly ' +
  'coiled salt-and-pepper shoulder length natural black hair, and a thick neatly trimmed ' +
  'salt-and-pepper beard.'

describe('buildIdentityTraitsClause', () => {
  it('reads skin, hair, facial hair, and age from a vision description', () => {
    expect(buildIdentityTraitsClause({ visionDescription: GIDEON_VISION })).toBe(
      'warm medium-brown skin, tightly curled salt-and-pepper hair, short grizzled beard, early 50s'
    )
  })

  it('prefers the vision description over the authored appearance text', () => {
    const clause = buildIdentityTraitsClause({
      visionDescription: 'deep brown skin, short black hair',
      appearanceDescription: 'pale skin, long blonde hair',
    })

    expect(clause).toBe('deep brown skin, short black hair')
  })

  it('falls back to the appearance description when no vision pass exists', () => {
    expect(
      buildIdentityTraitsClause({ appearanceDescription: 'olive skin and thick dark hair, mid 30s' })
    ).toBe('olive skin, thick dark hair, mid 30s')
  })

  it('never emits an ethnicity casting label', () => {
    const clause = buildIdentityTraitsClause({
      visionDescription:
        'Ethnicity: neutral American. A woman with fair skin and long red hair, late 20s.',
    })

    expect(clause).toBe('fair skin, long red hair, late 20s')
    expect(clause).not.toMatch(/neutral|american/i)
  })

  it('leads with the heritage the vision pass observed in the portrait', () => {
    // Without this the clause reads as "warm light-tan complexion, straight
    // shoulder-length black hair, late 40s", which a Caucasian woman satisfies —
    // so a frame that ignored the reference had nothing contradicting it.
    expect(
      buildIdentityTraitsClause({
        visionDescription:
          'An East Asian woman in her mid-to-late 40s with a lean build and a warm ' +
          'light-tan complexion. She has straight, shoulder-length black hair with a center part.',
      })
    ).toBe('East Asian, warm light-tan complexion, straight shoulder-length black hair, late 40s')
  })

  it('reads heritage stated as descent rather than as an adjective', () => {
    expect(
      buildIdentityTraitsClause({
        visionDescription:
          'A lean man in his late 50s of mixed Afro-descendant heritage, featuring warm ' +
          'medium-brown skin. He has tightly curled, salt-and-pepper hair with a matching ' +
          'short, neatly trimmed beard.',
      })
    ).toBe(
      'mixed Afro-descendant heritage, warm medium-brown skin, ' +
        'tightly curled salt-and-pepper hair, short neatly trimmed beard, late 50s'
    )
  })

  it('does not read hair colour as heritage', () => {
    const clause = buildIdentityTraitsClause({
      visionDescription: 'A woman with olive skin and long black hair, mid 30s.',
    })

    expect(clause).toBe('olive skin, long black hair, mid 30s')
    expect(clause).not.toMatch(/^black,/)
  })

  it('takes heritage from the vision pass only, never the authored appearance text', () => {
    expect(
      buildIdentityTraitsClause({
        appearanceDescription: 'A Caucasian woman with fair skin and long red hair, late 20s.',
      })
    ).toBe('fair skin, long red hair, late 20s')
  })

  it('drops possessives and connectives that precede a trait noun', () => {
    expect(buildIdentityTraitsClause({ visionDescription: 'His weathered tan skin is lined.' })).toBe(
      'weathered tan skin'
    )
  })

  it('caps the clause so the legend stays one readable line', () => {
    expect(buildIdentityTraitsClause({ visionDescription: GIDEON_VISION, wordCap: 6 })).toBe(
      'warm medium-brown skin, short grizzled beard'
    )
  })

  it('keeps a short trait the cap would otherwise spend on a longer one', () => {
    expect(buildIdentityTraitsClause({ visionDescription: GIDEON_VISION, wordCap: 5 })).toBe(
      'warm medium-brown skin, early 50s'
    )
  })

  it('uses structured hair fields when the prose has no hair phrase', () => {
    expect(
      buildIdentityTraitsClause({
        visionDescription: 'deep brown skin, high cheekbones',
        hairStyle: 'braided',
        hairColor: 'black',
      })
    ).toBe('deep brown skin, black braided hair')
  })

  it('reports a bald head rather than searching for hair', () => {
    expect(
      buildIdentityTraitsClause({ visionDescription: 'bald, dark brown skin, clean-shaven, late 40s' })
    ).toBe('dark brown skin, bald head, clean-shaven, late 40s')
  })

  it('returns nothing when there is no description and no hair field', () => {
    expect(buildIdentityTraitsClause({ visionDescription: '' })).toBeUndefined()
    expect(buildIdentityTraitsClause({ appearanceDescription: 'He is tall and moves quickly.' })).toBeUndefined()
  })
})

describe('identity traits in the [REFERENCES] legend', () => {
  it('states the traits once, on the person line', () => {
    const refs = stillRefsFromAttachedImages({
      selected: [
        { sendIndex: 1, characterName: 'Gideon Croft', refRole: 'identity' },
        { sendIndex: 2, characterName: 'Gideon Croft', refRole: 'wardrobe' },
      ],
      characterReferences: [
        {
          name: 'Gideon Croft',
          promptToken: 'person [1]',
          subjectOrdinal: 1,
          visionDescription: GIDEON_VISION,
        },
      ],
    })

    expect(formatStillReferencesLegend(refs)).toContain(
      'person [1] = Gideon Croft — identity: warm medium-brown skin, ' +
        'tightly curled salt-and-pepper hair, short grizzled beard, early 50s'
    )
  })

  it('leaves prop and location lines untouched', () => {
    const legend = formatStillReferencesLegend([
      { kind: 'prop', token: 'prop [2]', name: 'Brass Sextant', roleLabel: 'library prop' },
      { kind: 'location', token: 'location [3]', name: 'Harbor Office', roleLabel: 'library location' },
    ])

    expect(legend).toContain('prop [2] = Brass Sextant — library prop')
    expect(legend).toContain('location [3] = Harbor Office — library location')
    expect(legend).not.toContain(':')
  })

  it('omits the clause when a character has no usable description', () => {
    const refs = stillRefsFromAttachedImages({
      selected: [{ sendIndex: 1, characterName: 'Piper Hayes', refRole: 'identity' }],
      characterReferences: [{ name: 'Piper Hayes', promptToken: 'person [1]', subjectOrdinal: 1 }],
    })

    expect(formatStillReferencesLegend(refs)).toContain('person [1] = Piper Hayes — identity')
    expect(formatStillReferencesLegend(refs)).not.toContain('identity:')
  })
})

describe('buildIdentityEscalationBlock', () => {
  it('restates traits the legend cap had to drop', () => {
    const legendClause = buildIdentityTraitsClause({ visionDescription: VERBOSE_VISION })
    const block = buildIdentityEscalationBlock([
      { name: 'Gideon Croft', promptToken: 'person [1]', visionDescription: VERBOSE_VISION },
    ])

    expect(legendClause).not.toContain('beard')
    expect(block).toContain('thick neatly trimmed salt-and-pepper beard')
    expect(IDENTITY_TRAITS_RETRY_WORD_CAP).toBeGreaterThan(IDENTITY_TRAITS_WORD_CAP)
  })

  it('names the subject and the four properties the validator rejects frames over', () => {
    const block = buildIdentityEscalationBlock([
      { name: 'Gideon Croft', promptToken: 'person [1]', visionDescription: GIDEON_VISION },
    ])

    expect(block).toBe(
      'IDENTITY RETRY LOCK — the previous attempt rendered a different person.\n' +
        'person [1] (Gideon Croft) must read as: warm medium-brown skin, ' +
        'tightly curled salt-and-pepper hair, short grizzled beard, early 50s.\n' +
        'Ethnicity, skin tone, hair texture, and apparent age come from the identity ' +
        'reference image. Do not substitute a different one.'
    )
  })

  it('locks every subject in the frame on one line each', () => {
    const block = buildIdentityEscalationBlock([
      { name: 'Gideon Croft', promptToken: 'person [1]', visionDescription: GIDEON_VISION },
      {
        name: 'Piper Hayes',
        promptToken: 'person [2]',
        visionDescription: 'fair freckled skin, long auburn hair, late 20s',
      },
    ])

    expect(block).toContain('person [1] (Gideon Croft) must read as:')
    expect(block).toContain(
      'person [2] (Piper Hayes) must read as: fair freckled skin, long auburn hair, late 20s.'
    )
  })

  it('states a token once even when the cast list repeats it', () => {
    const gideon = {
      name: 'Gideon Croft',
      promptToken: 'person [1]',
      visionDescription: GIDEON_VISION,
    }
    const block = buildIdentityEscalationBlock([gideon, gideon])

    expect(block.match(/person \[1\]/g)).toHaveLength(1)
  })

  it('stays silent rather than shouting an empty lock', () => {
    expect(buildIdentityEscalationBlock([])).toBe('')

    // No token to bind the traits to, so the sentence would name nobody.
    expect(buildIdentityEscalationBlock([{ name: 'Gideon', visionDescription: GIDEON_VISION }])).toBe('')

    // A description with no observable traits: the reference image is all there is,
    // and an escalation that repeats nothing gives the retry no new information.
    expect(
      buildIdentityEscalationBlock([
        { name: 'Piper Hayes', promptToken: 'person [1]', visionDescription: 'She moves quickly.' },
      ])
    ).toBe('')
  })
})
