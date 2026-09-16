import { describe, expect, it } from 'vitest'
import { assembleStructuredStillPrompt, parseStillPromptSource } from '@/lib/imagen/structuredStillPrompt'
import {
  applyCastPerformanceToPrompt,
  castMemberHasBodyClause,
  enrichActionFramingWithCastPerformance,
  formatExclusionParagraph,
  parseNamedCastEmotions,
  recoverLeakedActionFromExclusions,
} from '@/lib/scene/castPerformanceFraming'
import { PHYSICS_HALLUCINATION_NEGATIVE_PROMPT } from '@/lib/character/sceneCharacterHeadshot'
import { BEAT_FRAME_ANTI_POSE_NEGATIVE_PROMPT } from '@/lib/character/characterReferenceAssembly'

const TUNNEL_ACTION =
  "Two-Shot, low angle. The frozen spanner is wedged beside Piper Hayes's shoulder, blocking Piper Hayes's path. Body position: Gideon Croft has thrown himself onto the frozen concrete, fingers locked around the spanner. Gaze: Down at Piper Hayes. Cast in frame: Piper Hayes, Gideon Croft — and no other people."

describe('castMemberHasBodyClause', () => {
  it('does not treat a possessive landmark as a body', () => {
    expect(castMemberHasBodyClause(TUNNEL_ACTION, 'Piper Hayes')).toBe(false)
    expect(castMemberHasBodyClause(TUNNEL_ACTION, 'Gideon Croft')).toBe(true)
  })

  it('sees a tokenized body and ignores a possessive token landmark', () => {
    const tokenized =
      "Two-Shot, low angle. The frozen spanner is wedged beside person [1]'s shoulder, blocking person [1]'s path. Body position: person [2] has thrown himself onto the frozen concrete."
    expect(castMemberHasBodyClause(tokenized, 'Piper Hayes', 'person [1]')).toBe(false)
    expect(castMemberHasBodyClause(tokenized, 'Gideon Croft', 'person [2]')).toBe(true)
  })
})

describe('enrichActionFramingWithCastPerformance', () => {
  it('grounds the unblocked person, labels gaze, and expands both faces', () => {
    const framing = enrichActionFramingWithCastPerformance({
      actionFraming: TUNNEL_ACTION,
      castNames: ['Piper Hayes', 'Gideon Croft'],
      speakerName: 'Gideon Croft',
      defaultEmotion: 'terrified, horrified',
    })

    expect(framing).toMatch(
      /Two-Shot, low angle:\s*both Piper Hayes and Gideon Croft fully in frame/i
    )
    expect(framing).toMatch(
      /Piper Hayes stands on the set floor with full weight through both feet and a matching contact shadow/
    )
    expect(framing).toContain('Gaze (Gideon Croft): Down at Piper Hayes')
    expect(framing).toMatch(/Facial expression \(Piper Hayes\):/)
    expect(framing).toMatch(/Facial expression \(Gideon Croft\):/)
    expect(framing).toMatch(/eyes wide/)
    expect(framing).toMatch(/mouth open/)
    expect(framing).not.toMatch(/Directed emotion:/)
  })

  it('does not drop the non-speaker face when the beat emotion is shared', () => {
    const framing = enrichActionFramingWithCastPerformance({
      actionFraming:
        'Two-Shot. Body position: Gideon Croft braces on the spanner. Cast in frame: Piper Hayes, Gideon Croft — and no other people.',
      castNames: ['Piper Hayes', 'Gideon Croft'],
      defaultEmotion: 'quiet dread',
    })

    expect(framing).toMatch(/Facial expression \(Piper Hayes\):/)
    expect(framing).toMatch(/Facial expression \(Gideon Croft\):/)
    expect(framing).toMatch(/quiet dread/)
    expect(framing).toMatch(/Piper Hayes stands on the set floor/)
  })

  it('is idempotent after names are bound to person tokens', () => {
    const first = enrichActionFramingWithCastPerformance({
      actionFraming: TUNNEL_ACTION,
      castNames: ['Piper Hayes', 'Gideon Croft'],
      speakerName: 'Gideon Croft',
      defaultEmotion: 'terrified, horrified',
    })
    const tokenized = first
      .replace(/Piper Hayes/g, 'person [1]')
      .replace(/Gideon Croft/g, 'person [2]')
    const second = enrichActionFramingWithCastPerformance({
      actionFraming: tokenized,
      castNames: ['Piper Hayes', 'Gideon Croft'],
      tokensByName: { 'Piper Hayes': 'person [1]', 'Gideon Croft': 'person [2]' },
      speakerName: 'Gideon Croft',
      defaultEmotion: 'terrified, horrified',
    })

    expect(second.match(/stands on the set floor/g)).toHaveLength(1)
    expect(second.match(/Facial expression \(person \[1\]\)/g)).toHaveLength(1)
    expect(second.match(/Facial expression \(person \[2\]\)/g)).toHaveLength(1)
  })
})

describe('parseNamedCastEmotions', () => {
  it('splits per-name cues and keeps an unlabeled string as shared', () => {
    expect(
      parseNamedCastEmotions(
        'Piper: terrified, eyes wide; Gideon: quiet dread, mouth closed',
        ['Piper Hayes', 'Gideon Croft']
      )
    ).toEqual({
      byName: {
        'Piper Hayes': 'terrified, eyes wide',
        'Gideon Croft': 'quiet dread, mouth closed',
      },
      shared: '',
    })
    expect(parseNamedCastEmotions('terrified, horrified', ['Piper Hayes', 'Gideon Croft'])).toEqual({
      byName: {},
      shared: 'terrified, horrified',
    })
  })
})

describe('exclusions repair', () => {
  it('pulls Directed emotion out of a mashed exclusions blob', () => {
    const recovered = recoverLeakedActionFromExclusions(
      'Strictly Avoid: Mannequin geometry.\nDirected emotion: Piper Hayes: terrified, horrified; Gideon Croft: terrified, horrified.\ntext overlay, floating objects, posing for camera'
    )
    expect(recovered.leakedAction).toMatch(/Directed emotion:/)
    expect(recovered.exclusions).not.toMatch(/Directed emotion/)
    expect(recovered.exclusions).toMatch(/floating objects/)
    expect(formatExclusionParagraph(recovered.exclusions)).toMatch(
      /^Strictly Avoid: Mannequin geometry\.\nStrictly Avoid: text overlay/
    )
  })
})

describe('insert/ECU cast grounding', () => {
  it('does not stand a body on the floor for a limb insert', () => {
    const framing = enrichActionFramingWithCastPerformance({
      actionFraming:
        'Insert Shot. Gideon Croft\'s right hand turns the manifold. Cast in frame: Gideon Croft — and no other people.',
      castNames: ['Gideon Croft'],
      shotType: 'Insert Shot',
    })
    expect(framing).not.toMatch(/stands on the set floor/)
    expect(framing).not.toMatch(/fully in frame/)
  })
})

describe('applyCastPerformanceToPrompt', () => {
  it('rewrites only the Action/Framing line of a sectioned still', () => {
    const prompt = `[STILL]
Action/Framing: ${TUNNEL_ACTION}
[EXCLUSIONS]
Strictly Avoid: Mannequin geometry.`
    const next = applyCastPerformanceToPrompt(prompt, {
      castNames: ['Piper Hayes', 'Gideon Croft'],
      defaultEmotion: 'terrified, horrified',
      speakerName: 'Gideon Croft',
    })
    expect(next).toMatch(/Action\/Framing: Two-Shot, low angle: both Piper Hayes and Gideon Croft fully in frame/)
    expect(next).toContain('[EXCLUSIONS]')
    expect(next).not.toMatch(/Directed emotion:/)
  })
})

describe('assembleStructuredStillPrompt leaked emotion', () => {
  it('moves Directed emotion out of [EXCLUSIONS] and keeps physics/anti-pose as Strictly Avoid', () => {
    const stored = `[STILL]
Action/Framing: ${TUNNEL_ACTION}

[EXCLUSIONS]
Strictly Avoid: Mannequin geometry, plastic skin.

Directed emotion: Piper Hayes: terrified, horrified; Gideon Croft: terrified, horrified.`

    const assembled = assembleStructuredStillPrompt({
      actionOrStructured: stored,
      refs: [
        { kind: 'person', token: 'person [1]', name: 'Piper Hayes', roleLabel: 'identity' },
        { kind: 'person', token: 'person [2]', name: 'Gideon Croft', roleLabel: 'identity' },
      ],
      includeCandid: true,
      exclusions: [
        'text overlay, captions, subtitles',
        PHYSICS_HALLUCINATION_NEGATIVE_PROMPT,
        BEAT_FRAME_ANTI_POSE_NEGATIVE_PROMPT,
      ].join(', '),
    })

    const parsed = parseStillPromptSource(assembled)
    expect(parsed.actionFraming).toMatch(/Facial expression \(person \[1\]\)/)
    expect(parsed.actionFraming).toMatch(/Facial expression \(person \[2\]\)/)
    expect(parsed.actionFraming).not.toMatch(/Directed emotion:/)
    expect(parsed.exclusions).not.toMatch(/Directed emotion|Facial expression|terrified/)
    expect(parsed.exclusions).toMatch(/Strictly Avoid:/)
    expect(parsed.exclusions).toMatch(/floating objects/)
    expect(parsed.exclusions).toMatch(/posing for camera/)
    expect(parsed.exclusions).toMatch(/text overlay/)
    const afterExclusions = assembled.split('[EXCLUSIONS]')[1] ?? ''
    expect(afterExclusions.trim().startsWith('Strictly Avoid:')).toBe(true)
    expect(afterExclusions).not.toMatch(/\n(?!Strictly Avoid:)[a-z][^:\n]+, [a-z]/)
  })
})
