import { describe, it, expect } from 'vitest'
import {
  buildIdentityPromptToken,
  filterCharactersForPromptRefs,
  optimizePromptForImagen,
  sanitizePromptForIdentityRefs,
  stripReferenceImageMappingBlock,
} from '@/lib/imagen/promptOptimizer'
import {
  isStructuredStillPrompt,
  parseStillPromptSource,
} from '@/lib/imagen/structuredStillPrompt'
import { stripPromptMetaInstructions } from '@/lib/scene/performanceCues'

describe('promptOptimizer reference-first binding', () => {
  it('buildIdentityPromptToken returns person [N] token', () => {
    expect(buildIdentityPromptToken(1)).toBe('person [1]')
    expect(buildIdentityPromptToken(2)).toBe('person [2]')
  })

  it('dual-ref optimize path uses person [N] without demographic text', () => {
    const prompt = optimizePromptForImagen({
      sceneAction: 'Maria sits at her desk reviewing data on a monitor.',
      visualDescription: 'Maria sits at her desk reviewing data on a monitor.',
      artStyle: 'photorealistic',
      characterReferences: [
        {
          referenceId: 1,
          name: 'Maria',
          description: 'Hispanic woman in her late 20s',
          identityReferenceId: 1,
          wardrobeReferenceId: 2,
          hasDualReferences: true,
          promptToken: 'person [1]',
          linkingDescription: 'person [1]',
          appearanceDescription: 'Hispanic woman in her late 20s with dark hair',
        },
      ],
    })

    expect(prompt).toContain('Create an image about person [1]')
    expect(prompt).toContain('person [1]')
    expect(prompt).toContain('wardrobe reference [2]')
    expect(prompt.toLowerCase()).not.toContain('hispanic')
    expect(prompt.toLowerCase()).not.toContain('late 20s')
  })

  it('sanitizePromptForIdentityRefs replaces character names with person tokens', () => {
    const sanitized = sanitizePromptForIdentityRefs(
      'Cinematic medium close-up of Maria, a young woman with calm expression.',
      [{ name: 'Maria', promptToken: 'person [1]', identityReferenceId: 1 }]
    )
    expect(sanitized).toContain('person [1]')
    expect(sanitized).not.toContain('Maria')
  })

  it('sanitizePromptForIdentityRefs preserves newlines in structured prompts', () => {
    const structured = `[GLOBAL STYLE ANCHOR]
Master Style: Photorealistic

[SCENE COMPOSITION & BEAT]
Action/Framing: person [1] clutches a file.`
    const sanitized = sanitizePromptForIdentityRefs(structured, [
      { name: 'Elara Vance', promptToken: 'person [1]', identityReferenceId: 1 },
    ])
    expect(sanitized).toContain('\n[SCENE COMPOSITION & BEAT]')
    expect(sanitized).not.toMatch(/\nMaster Style:[^\n]*\[SCENE/)
  })

  it('filterCharactersForPromptRefs keeps only characters referenced in prompt body', () => {
    const refs = [
      { name: 'Elara Vance', promptToken: 'person [1]', identityReferenceId: 1 },
      { name: 'Marcus Thorne', promptToken: 'person [2]', identityReferenceId: 2 },
      { name: 'Dr. Benjamin Reed', promptToken: 'person [3]', identityReferenceId: 3 },
    ]
    const body =
      'Cinematic medium shot of person [1] standing frozen, looking down at a coffee table.'

    const filtered = filterCharactersForPromptRefs(refs, body)
    expect(filtered.map((r) => r.name)).toEqual(['Elara Vance'])
  })

  it('filterCharactersForPromptRefs falls back to full set when filter would drop everyone', () => {
    const refs = [
      { name: 'Elara Vance', promptToken: 'person [1]', identityReferenceId: 1 },
      { name: 'Marcus Thorne', promptToken: 'person [2]', identityReferenceId: 2 },
    ]
    const filtered = filterCharactersForPromptRefs(
      refs,
      'Wide establishing shot of an empty apartment with no people tokens.'
    )
    expect(filtered).toEqual(refs)
  })

  it('filterCharactersForPromptRefs matches selectedCharacterNames from AI intelligence', () => {
    const refs = [
      { name: 'Elara Vance', promptToken: 'person [1]', identityReferenceId: 1 },
      { name: 'Marcus Thorne', promptToken: 'person [2]', identityReferenceId: 2 },
    ]
    const filtered = filterCharactersForPromptRefs(
      refs,
      'Cinematic medium shot with no person tokens in body.',
      ['Elara Vance']
    )
    expect(filtered.map((r) => r.name)).toEqual(['Elara Vance'])
  })

  it('filterCharactersForPromptRefs does not fuzzy-match partial selected names', () => {
    const refs = [
      { name: 'Dr. Arthur Pendelton', promptToken: 'person [3]', identityReferenceId: 3 },
      { name: 'Piper Hayes', promptToken: 'person [1]', identityReferenceId: 1 },
    ]
    const filtered = filterCharactersForPromptRefs(
      refs,
      'Medium shot of person [1] holding prop [2].',
      ['Arthur']
    )
    expect(filtered.map((r) => r.name)).toEqual(['Piper Hayes'])
  })

  it('filterCharactersForPromptRefs takes an empty cast at face value for beat frames', () => {
    const refs = [
      { name: 'Piper Hayes', promptToken: 'person [1]', identityReferenceId: 1 },
      { name: 'Professor Gideon Croft', promptToken: 'person [2]', identityReferenceId: 2 },
    ]
    const filtered = filterCharactersForPromptRefs(
      refs,
      'Insert shot of a brass pneumatic hatch collar. No people in frame.',
      undefined,
      { allowEmpty: true }
    )
    expect(filtered).toEqual([])
  })

  it('sanitizePromptForIdentityRefs preserves possessive prop names when protected', () => {
    const journal = "Arthur Pendelton's 1893 Journal"
    const sanitized = sanitizePromptForIdentityRefs(
      `person [1] grips ${journal} while person [2] watches.`,
      [{ name: 'Dr. Arthur Pendelton', promptToken: 'person [3]', identityReferenceId: 3 }],
      { protectPhrases: [journal] }
    )
    expect(sanitized).toContain(journal)
    expect(sanitized).not.toContain('person [3] grips person [3]')
  })

  it('includes hair lock in Subject & Wardrobe when injury beat and hairAnchor is set', () => {
    const prompt = optimizePromptForImagen({
      sceneAction:
        'Close-up of person [1] with bloodshot eyes and a faint bruise on her left temple.',
      visualDescription:
        'Close-up of person [1] with bloodshot eyes and a faint bruise on her left temple.',
      artStyle: 'photorealistic',
      characterReferences: [
        {
          referenceId: 1,
          name: 'Elara',
          description: 'Woman in her early 30s',
          identityReferenceId: 1,
          promptToken: 'person [1]',
          linkingDescription: 'person [1]',
          defaultWardrobe: 'black compression top and leggings',
          hairAnchor: 'dark auburn swept back ponytail hair matching identity reference',
        },
      ],
    })

    expect(prompt).toContain('Subject & Wardrobe:')
    expect(prompt).toContain('hair: dark auburn swept back ponytail hair matching identity reference')
    expect(prompt).toContain('match identity reference exactly')
  })

  it('omits hair lock text when identity ref exists without explicit hairAnchor', () => {
    const prompt = optimizePromptForImagen({
      sceneAction: 'Medium shot. person [1] walks through her living room scanning every detail.',
      visualDescription: 'Medium shot. person [1] walks through her living room scanning every detail.',
      artStyle: 'photorealistic',
      characterReferences: [
        {
          referenceId: 1,
          name: 'Elara',
          description: 'Woman in her early 30s',
          identityReferenceId: 1,
          hasDualReferences: true,
          promptToken: 'person [1]',
          linkingDescription: 'person [1]',
          defaultWardrobe: 'casual outfit',
          hairStyle: 'dark brown wavy',
          hairColor: 'dark brown',
        },
      ],
    })

    expect(prompt).not.toContain('matching identity reference')
    expect(prompt).not.toContain('hair: dark brown')
  })

  it('adds composition lock for temple bruise beats', () => {
    const prompt = optimizePromptForImagen({
      sceneAction:
        'person [1] face close-up with a purplish bruise forming on her left temple.',
      visualDescription:
        'person [1] face close-up with a purplish bruise forming on her left temple.',
      artStyle: 'photorealistic',
      characterReferences: [
        {
          referenceId: 1,
          name: 'Elara',
          description: 'Woman in her early 30s',
          identityReferenceId: 1,
          promptToken: 'person [1]',
          linkingDescription: 'person [1]',
          defaultWardrobe: 'black compression top',
          hairStyle: 'loose waves',
          hairColor: 'dark brown',
        },
      ],
    })

    expect(prompt).toContain('do not pull hair back')
    expect(prompt).toContain('without changing hair placement')
  })

  it('sanitizePromptForIdentityRefs preserves names inside parentheses', () => {
    const sanitized = sanitizePromptForIdentityRefs(
      'WARDROBE REFERENCE (Ref Image [2]): Apply clothing ONLY to person [1] (Maria).',
      [{ name: 'Maria', promptToken: 'person [1]', identityReferenceId: 1 }]
    )
    expect(sanitized).toContain('person [1] (Maria)')
    expect(sanitized).not.toContain('person [1] (person [1])')
  })

  it('stripReferenceImageMappingBlock removes AI mapping section', () => {
    const input = `[GLOBAL STYLE ANCHOR]
Master Style: photorealistic

[SCENE COMPOSITION & BEAT]
Action/Framing: person [1] grabs person [2].

[REFERENCE IMAGE MAPPING]
- SUBJECT REFERENCE (Ref Image [1]): Identity only.

[EXCLUSIONS & BOUNDARIES]
Strictly Avoid: cartoon style.`

    const output = stripReferenceImageMappingBlock(input)
    expect(output).not.toContain('[REFERENCE IMAGE MAPPING]')
    expect(output).not.toContain('SUBJECT REFERENCE')
    expect(output).toContain('[EXCLUSIONS & BOUNDARIES]')
    expect(output).toContain('person [1] grabs person [2]')
  })

  it('stripPromptMetaInstructions removes generator-directed meta text', () => {
    const input =
      "ALICE pulls BOB toward a fissure. I'm not sure how to balance two reference images. Consider using combo references (e.g., 1,2). Use your expertise to optimize the prompt."
    const output = stripPromptMetaInstructions(input)
    expect(output).toContain('ALICE pulls BOB toward a fissure')
    expect(output).not.toMatch(/not sure how to/i)
    expect(output).not.toMatch(/combo references/i)
    expect(output).not.toMatch(/use your expertise/i)
  })

  it('does not leave a dangling Focus on person [N]: after quote stripping', () => {
    const prompt = optimizePromptForImagen({
      sceneAction: 'Dutch Angle: Gideon reclaims his academic authority. Focus on person [1]: "Stand down."',
      visualDescription:
        'Dutch Angle: Gideon reclaims his academic authority. Focus on person [1]: "Stand down."',
      artStyle: 'photorealistic',
      characterReferences: [
        {
          referenceId: 1,
          name: 'Gideon',
          description: 'Man in his 40s',
          identityReferenceId: 1,
          promptToken: 'person [1]',
          linkingDescription: 'person [1]',
        },
      ],
    })

    expect(prompt).not.toMatch(/Focus on person \[1\]:\s*$/m)
    expect(prompt).not.toMatch(/Focus on person \[1\]:\s*\./)
    expect(prompt).toContain('Focus on person [1]')
    expect(prompt).toContain('person [1]')
  })
})

describe('the optimizer only casts people the composition places', () => {
  const CAST = [
    {
      referenceId: 1,
      name: 'Piper Hayes',
      description: 'Woman in her 30s',
      identityReferenceId: 1,
      promptToken: 'person [1]',
      linkingDescription: 'person [1]',
      defaultWardrobe: 'oil-stained coveralls',
    },
    {
      referenceId: 2,
      name: 'Professor Gideon Croft',
      description: 'Man in his early 50s',
      identityReferenceId: 2,
      promptToken: 'person [2]',
      linkingDescription: 'person [2]',
      defaultWardrobe: 'tweed waistcoat',
    },
  ]

  function optimize(action: string): string {
    return optimizePromptForImagen({
      sceneAction: action,
      visualDescription: action,
      artStyle: 'photorealistic',
      characterReferences: CAST,
    })
  }

  it('says nothing about people for a frame that holds only an object', () => {
    const prompt = optimize(
      'Insert shot of a brass pneumatic hatch collar flanked by three rusted locking dogs, grease caked on the rim.'
    )

    expect(prompt).not.toMatch(/^Create an image about/)
    expect(prompt).not.toContain('person [1]')
    expect(prompt).not.toContain('person [2]')
    expect(prompt).not.toContain('Piper')
    expect(prompt).not.toContain('Gideon')
    expect(prompt).not.toContain('coveralls')
    expect(prompt).toContain('brass pneumatic hatch collar')
  })

  it('introduces only the character the composition names', () => {
    const prompt = optimize('Medium shot: person [1] swings the iron spanner at the locking dogs.')

    expect(prompt).toMatch(/^Create an image about person \[1\] to match the description/)
    expect(prompt).not.toContain('person [2]')
    expect(prompt).toContain('coveralls')
    expect(prompt).not.toContain('tweed waistcoat')
  })

  it('matches a written name as well as a bound token', () => {
    const prompt = optimize('Two-Shot: Piper Hayes braces against the bulkhead, Gideon behind her.')

    expect(prompt).toContain('person [1]')
    expect(prompt).toContain('person [2]')
    expect(prompt).toMatch(/^Create an image about person \[1\] and person \[2\]/)
  })
})

describe('what optimizing an already-sectioned prompt costs', () => {
  const SECTIONED = [
    '[GLOBAL STYLE ANCHOR]',
    'Master Style: photoreal anamorphic, tungsten practicals',
    '',
    '[SCENE COMPOSITION & BEAT]',
    'Action/Framing: extreme close-up on person [1] as he folds the telegram. Dolly in on his hands.',
    'Lighting: single window shaft, 40mm for compression.',
  ].join('\n')

  function flatten(): string {
    return optimizePromptForImagen({
      sceneAction: SECTIONED,
      visualDescription: SECTIONED,
      artStyle: 'photorealistic',
      characterReferences: [
        {
          referenceId: 1,
          name: 'Gideon Croft',
          description: 'Man in his early 50s',
          identityReferenceId: 1,
          promptToken: 'person [1]',
          linkingDescription: 'person [1]',
        },
      ],
    })
  }

  it('deletes the shot language the beat planner wrote', () => {
    const flattened = flatten()

    expect(SECTIONED).toContain('extreme close-up')
    expect(flattened).not.toContain('extreme close-up')
    expect(flattened).not.toContain('Dolly in')
    expect(flattened).not.toContain('40mm')
  })

  it('collapses the sections into one line of prose', () => {
    const flattened = flatten()

    expect(flattened.split('\n')).toHaveLength(1)
    expect(flattened).toMatch(/^Create an image about/)
    // The headers survive only as litter mid-sentence, which is worse than
    // losing them: the model reads them as content.
    expect(flattened).toContain('description: Cinematic frame')
  })

  it('leaves an Action/Framing that reparses into the wrong thing', () => {
    const flattened = flatten()

    expect(parseStillPromptSource(SECTIONED).actionFraming).toContain(
      'extreme close-up on person [1] as he folds the telegram. Dolly in on his hands.'
    )

    // Reparsing the flattened line finds a header and an Action/Framing, so this
    // damage is not detectable after the fact — but the action it recovers has
    // lost the shot language and swallowed the style suffix and the negative
    // tail, because there are no line breaks left to end the field at. The route
    // therefore has to decide whether to optimize before it optimizes.
    const reparsed = parseStillPromptSource(flattened).actionFraming ?? ''
    expect(reparsed).not.toContain('extreme close-up')
    expect(reparsed).toContain('8K, sharp focus')
    expect(reparsed).toContain('no watermarks')
    expect(isStructuredStillPrompt(flattened)).toBe(true)
  })
})
