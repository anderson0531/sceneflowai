import { describe, it, expect } from 'vitest'
import {
  buildIdentityPromptToken,
  filterCharactersForPromptRefs,
  optimizePromptForImagen,
  sanitizePromptForIdentityRefs,
  stripReferenceImageMappingBlock,
} from '@/lib/imagen/promptOptimizer'
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
})
