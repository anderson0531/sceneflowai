import { describe, it, expect } from 'vitest'
import {
  stripScreenplayDeliveryAnnotations,
  extractSamePersonAgeStage,
  formatAgeVariantCharacterName,
  isCollectiveOrGroupCharacterName,
  splitCompoundIndividualNames,
  detectMultiAgeStagesOnCharacter,
  buildAgeVariantCharacter,
  enforceSamePersonAgeStageConsistency,
  sanitizeBlueprintCharactersAndBeats,
} from '@/lib/character/ageStageContinuity'
import { toCanonicalName, generateAliases } from '@/lib/character/canonical'
import {
  normalizeCharacterName,
  extractCharactersFromScenes,
} from '@/lib/character/detection'
import { enforceEnsembleFamilyConsistency } from '@/lib/character/characterFamily'
import { inferLocaleDefaultEthnicityHint } from '@/lib/character/characterIntelligence'
import { resolveBlueprintContinuity } from '@/lib/blueprint/blueprintContinuity'
import { mergeRevisionIntoVariant } from '@/lib/treatment/blueprintRevisionDiff'
import { sceneIncludesCharacter } from '@/lib/character/wardrobeAnalysis'

describe('Multi-Age Character Continuity & Individual-Only Cast Enforcement', () => {
  it('strips screenplay delivery tags like (V.O.) and (CONT\'D) while preserving (Age NN) and era qualifiers', () => {
    expect(stripScreenplayDeliveryAnnotations('JOHN MILLER (AGE 16) (V.O.)')).toBe(
      'JOHN MILLER (AGE 16)'
    )
    expect(stripScreenplayDeliveryAnnotations("John Miller (Age 62) (CONT'D)")).toBe(
      'John Miller (Age 62)'
    )
    expect(stripScreenplayDeliveryAnnotations('Elena Lin (1978) (O.S.)')).toBe(
      'Elena Lin (1978)'
    )

    expect(toCanonicalName('JOHN MILLER (AGE 16) (V.O.)')).toBe('John Miller (Age 16)')
    expect(toCanonicalName('JOHN MILLER (AGE 32)')).toBe('John Miller (Age 32)')
    expect(toCanonicalName('JOHN MILLER (AGE 62)')).toBe('John Miller (Age 62)')

    expect(normalizeCharacterName('John Miller (Age 16)')).not.toBe(
      normalizeCharacterName('John Miller (Age 62)')
    )
  })

  it('generates age-qualified aliases without bare first/full-name collisions across life stages', () => {
    const aliases16 = generateAliases('John Miller (Age 16)')
    const aliases62 = generateAliases('John Miller (Age 62)')

    expect(aliases16).toContain('John Miller (Age 16)')
    expect(aliases16).toContain('John (Age 16)')
    expect(aliases16).not.toContain('John')
    expect(aliases16).not.toContain('John Miller')

    const overlap = aliases16.filter((a) => aliases62.includes(a))
    expect(overlap).toEqual([])
  })

  it('rejects collective/plural group character names and splits compound individual pairs', () => {
    expect(isCollectiveOrGroupCharacterName("John's Friends")).toBe(true)
    expect(isCollectiveOrGroupCharacterName('The Brothers')).toBe(true)
    expect(isCollectiveOrGroupCharacterName('Neighbors')).toBe(true)
    expect(isCollectiveOrGroupCharacterName('Factory Workers')).toBe(true)
    expect(isCollectiveOrGroupCharacterName('Wedding Guests')).toBe(true)

    expect(isCollectiveOrGroupCharacterName('John Miller')).toBe(false)
    expect(isCollectiveOrGroupCharacterName('John Miller (Age 16)')).toBe(false)
    expect(isCollectiveOrGroupCharacterName('Dr. Aris Kael')).toBe(false)
    expect(isCollectiveOrGroupCharacterName('Narrator')).toBe(false)

    expect(splitCompoundIndividualNames('Arthur & Elena Lin')).toEqual([
      'Arthur Lin',
      'Elena Lin',
    ])
    expect(splitCompoundIndividualNames('Friends and Neighbors')).toEqual([])

    const extracted = extractCharactersFromScenes([
      {
        characters: ['John Miller (Age 16)', "John's Friends", 'The Neighbors'],
        dialogue: [
          { character: 'JOHN MILLER (AGE 16) (V.O.)', line: 'That summer changed everything.' },
          { character: 'NEIGHBORS', line: 'Hurry!' },
        ],
      },
    ])
    expect(extracted.map((c) => c.name)).toEqual(['John Miller (Age 16)'])
  })

  it('detects multi-decade age spans without splitting narrow single-era casting bands', () => {
    expect(
      detectMultiAgeStagesOnCharacter({
        name: 'John Miller',
        age: '16, 32, 62',
      })
    ).toEqual([16, 32, 62])

    expect(
      detectMultiAgeStagesOnCharacter({
        name: 'John Miller',
        age: '16-62',
        description: 'Seen at age 16 in high school, age 32 opening the shop, and age 62 retiring.',
      })
    ).toEqual([16, 32, 62])

    // Narrow single-era casting range should NOT be split
    expect(
      detectMultiAgeStagesOnCharacter({
        name: 'Elara Vance',
        age: '32-36',
        description: 'Forensic archivist in her mid-30s.',
      })
    ).toEqual([])
  })

  it('builds dedicated age-variant character cards with longitudinal genetics, youth hair adaptation, and fresh portrait slots', () => {
    const elderJohn = {
      id: 'char-john-62',
      name: 'John Miller (Age 62)',
      role: 'protagonist',
      gender: 'male',
      age: '62',
      ethnicity: 'Irish-American',
      eyeColor: 'hazel',
      hairColor: 'silver-white',
      description: '62-year-old master craftsman.',
      appearanceDescription: '62-year-old Irish-American man with silver hair and hazel eyes.',
      referenceImage: 'https://example.com/john-62.jpg',
      imageApproved: true,
      wardrobes: [{ id: 'w-1', name: 'Workshop Apron', description: 'Canvas apron' }],
    }

    const teenJohn = buildAgeVariantCharacter(elderJohn, {
      targetAge: 16,
      eraLabel: '1978 High School',
      defaultWardrobeOverride: '1978 faded denim jacket and flannel shirt',
    })

    expect(teenJohn.name).toBe('John Miller (Age 16)')
    expect(teenJohn.age).toBe('16')
    expect(teenJohn.ethnicity).toBe('Irish-American')
    expect(teenJohn.eyeColor).toBe('hazel')
    expect(teenJohn.samePersonGroupId).toBe('person-john-miller')
    expect(teenJohn.hairColor).toBe('warm auburn-brown')
    expect(teenJohn.appearanceDescription.toLowerCase()).not.toContain('silver hair')
    expect(teenJohn.appearanceDescription).toContain('Longitudinal identity lock:')
    expect(teenJohn.defaultWardrobe).toBe('1978 faded denim jacket and flannel shirt')
    // Must clear portrait & wardrobe refs so Production generates a true 16-year-old base portrait
    expect(teenJohn.referenceImage).toBeNull()
    expect(teenJohn.wardrobes).toEqual([])
  })

  it('sanitizes Blueprint characters and highlights era-matched individual characters per beat', () => {
    const sanitized = sanitizeBlueprintCharactersAndBeats({
      characters: [
        {
          name: 'John Miller',
          role: 'protagonist',
          age: '16, 32, 62',
          ethnicity: 'European-American',
          eyeColor: 'blue',
          description: 'Protagonist across three decades of his life.',
        },
        {
          name: 'Arthur & Elena Lin',
          role: 'supporting',
          age: '58',
          description: 'Mentors next door.',
        },
        {
          name: 'The Townspeople',
          role: 'supporting',
          description: 'Crowd of locals.',
        },
      ],
      beats: [
        {
          title: '1. Hometown Summer',
          eraOrAge: '1978 • Age 16',
          synopsis: 'John at age 16 repairs bicycles in the garage.',
          characters: ['John Miller', 'The Townspeople'],
        },
        {
          title: '2. First Storefront',
          eraOrAge: '1994 • Age 32',
          synopsis: 'John at age 32 opens the shop beside Arthur & Elena Lin.',
          characters: ['John Miller', 'Arthur & Elena Lin'],
        },
        {
          title: '3. Retirement Toast',
          eraOrAge: '2024 • Age 62',
          synopsis: 'At age 62, John reflects on five decades of craft.',
          characters: ['John Miller'],
        },
      ],
    })

    expect(sanitized.characters.map((c) => c.name)).toEqual([
      'John Miller (Age 16)',
      'John Miller (Age 32)',
      'John Miller (Age 62)',
      'Arthur Lin',
      'Elena Lin',
    ])

    expect(sanitized.beats[0].characters).toEqual(['John Miller (Age 16)'])
    expect(sanitized.beats[1].characters).toEqual([
      'John Miller (Age 32)',
      'Arthur Lin',
      'Elena Lin',
    ])
    expect(sanitized.beats[2].characters).toEqual(['John Miller (Age 62)'])
  })

  it('preserves explicit (Age NN) flashback life stages during family consistency enforcement', () => {
    const cast = enforceEnsembleFamilyConsistency([
      {
        name: 'John Miller (Age 16)',
        role: 'protagonist',
        age: '16',
        ethnicity: 'Irish-American',
        description: 'John as a teenager in 1978; father of Sarah Miller.',
      },
      {
        name: 'John Miller (Age 62)',
        role: 'protagonist',
        age: '62',
        ethnicity: 'Irish-American',
        description: 'John in 2024; father of Sarah Miller.',
      },
      {
        name: 'Sarah Miller (Age 28)',
        role: 'supporting',
        age: '28',
        description: 'Daughter of John Miller.',
      },
    ])

    const john16 = cast.find((c) => c.name === 'John Miller (Age 16)')!
    const john62 = cast.find((c) => c.name === 'John Miller (Age 62)')!
    const sarah28 = cast.find((c) => c.name === 'Sarah Miller (Age 28)')!

    // Flashback John (Age 16) must NOT have his age overwritten by parent-of Sarah (Age 28)!
    expect(john16.age).toBe('16')
    expect(john62.age).toBe('62')
    expect(john16.samePersonGroupId).toBe('person-john-miller')
    expect(john62.samePersonGroupId).toBe('person-john-miller')
    expect(sarah28.ethnicity).toBe('Irish-American')

    // Helper sanity check on formatting
    expect(formatAgeVariantCharacterName('John Miller (Age 62)', 32)).toBe('John Miller (Age 32)')
    expect(extractSamePersonAgeStage('John Miller (Age 32)').numericAge).toBe(32)
    expect(enforceSamePersonAgeStageConsistency([john16, john62])).toHaveLength(2)
  })

  it('prevents pronoun cross-bleed between (Age 16) and (Age 62) variants in wardrobe scene matching', () => {
    const presentDayScene = {
      sceneNumber: 3,
      heading: 'INT. WORKSHOP — PRESENT DAY',
      action: 'John Miller (Age 62) hangs up his leather apron.',
      beats: [
        {
          beatId: 'b-3-1',
          actionDescription: 'He smiles warmly and locks the front door.',
        },
      ],
    }

    expect(sceneIncludesCharacter(presentDayScene, 'John Miller (Age 62)')).toBe(true)
    expect(sceneIncludesCharacter(presentDayScene, 'John Miller (Age 16)')).toBe(false)
  })

  it('never stamps Southeast Asian (Thai) onto an African American Pittsburgh character in multi-country memoirs and self-heals polluted badges', () => {
    // Multi-country setting (Pittsburgh + Bangkok) or Thai target audience must NOT return a blanket cast ethnicity
    expect(
      inferLocaleDefaultEthnicityHint({
        setting: 'Late-1970s Pittsburgh, Pennsylvania to 2020s Bangkok, Thailand',
        targetAudience: 'Family and viewers in Thailand and the United States',
      })
    ).toBeUndefined()

    expect(
      inferLocaleDefaultEthnicityHint({
        setting: 'Late-1970s Pittsburgh, Pennsylvania',
        targetAudience: 'Thai & international family audience',
        culturalSignals: { cultures: ['Thai'], locales: ['th'] },
      })
    ).toBeUndefined()

    // Even when a saved Blueprint variant already had polluted "Southeast Asian (Thai)" badge + longitudinal lock,
    // resolveBlueprintContinuity self-heals from the character's explicit biographical prose ("African American")!
    const pollutedVariant = {
      setting: 'Late-1970s Pittsburgh, Pennsylvania to Contemporary Bangkok, Thailand',
      target_audience: 'Multi-generational family in Thailand and the US',
      character_descriptions: [
        {
          name: 'Brian Eric Anderson Sr. (Age 17)',
          role: 'protagonist',
          age: '17',
          ethnicity: 'Southeast Asian (Thai)',
          eyeColor: 'Deep-brown',
          description:
            'A lean, hyper-vigilant African American high school math prodigy and point guard in late-1970s Pittsburgh, driven by an acute terror of industrial and racial obsolescence.',
          appearance:
            'Longitudinal identity lock: exact same individual human being as Brian Eric Anderson Sr. across life stages — identical Southeast Asian (Thai) heritage, Deep-brown eyes, and underlying facial bone structure, depicted strictly at biological age 17.',
        },
        {
          name: 'Brian Eric Anderson Sr. (Age 55)',
          role: 'protagonist',
          age: '55',
          ethnicity: '',
          eyeColor: 'Deep-brown',
          description: 'Executive chapter of Brian Eric Anderson Sr. in Bangkok.',
        },
      ],
    }

    const continuity = resolveBlueprintContinuity(pollutedVariant, null)
    const brian17 = continuity.cast.find((c) => c.name === 'Brian Eric Anderson Sr. (Age 17)')!
    const brian55 = continuity.cast.find((c) => c.name === 'Brian Eric Anderson Sr. (Age 55)')!

    expect(brian17.ethnicity).toBe('African American')
    expect(brian55.ethnicity).toBe('African American')
    expect(brian17.appearance).toContain('identical African American heritage')
    expect(brian17.appearance).not.toContain('Southeast Asian (Thai)')
  })

  it('prevents positional index ethnicity cross-contamination when Guided Revise splits a character into (Age NN) variants', () => {
    const originalVariant = {
      character_descriptions: [
        {
          name: 'Brian Eric Anderson Sr.',
          role: 'protagonist',
          ethnicity: 'African American',
          eyeColor: 'Deep-brown',
          description: 'African American protagonist.',
        },
        {
          name: 'Maliwan Srisai',
          role: 'supporting',
          ethnicity: 'Southeast Asian (Thai)',
          eyeColor: 'Dark brown',
          description: 'Thai architect in Bangkok.',
        },
      ],
    }

    const patchFromRewriter = {
      character_descriptions: [
        {
          name: 'Brian Eric Anderson Sr. (Age 17)',
          role: 'protagonist',
          age: '17',
          description: 'African American high school point guard in 1970s Pittsburgh.',
        },
        {
          name: 'Brian Eric Anderson Sr. (Age 35)',
          role: 'protagonist',
          age: '35',
          description: 'Rising technology leader.',
        },
        {
          name: 'Maliwan Srisai',
          role: 'supporting',
          age: '34',
          description: 'Thai architect in Bangkok.',
        },
      ],
    }

    const merged = mergeRevisionIntoVariant(originalVariant, patchFromRewriter)
    const chars = merged.character_descriptions as Array<Record<string, unknown>>

    // Index 1 ("Brian Eric Anderson Sr. (Age 35)") MUST inherit "African American" from Brian,
    // NOT "Southeast Asian (Thai)" from originalVariant.character_descriptions[1]!
    expect(chars[0]!.ethnicity).toBe('African American')
    expect(chars[1]!.ethnicity).toBe('African American')
    expect(chars[2]!.ethnicity).toBe('Southeast Asian (Thai)')
  })
})
