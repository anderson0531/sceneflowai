import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildBeatDirectedEmotionPromptSection,
  extractSceneStateFromAppearanceNotes,
  formatDirectedEmotionLine,
  inferEmotionFromActionProse,
  resolveBeatDirectedEmotion,
  resolveDirectedEmotionForCharacter,
} from '@/lib/scene/performanceCues'

describe('resolveDirectedEmotionForCharacter', () => {
  it('prefers beat line bracket cues over wardrobe appearanceNotes', () => {
    const emotion = resolveDirectedEmotionForCharacter({
      characterName: 'Elara',
      beatSpeaker: 'Elara',
      beatLine: '[angry] You knew this would happen.',
      beatAction: 'She stares at the screen, exhausted.',
      appearanceNotes: 'Bloodshot eyes, visible exhaustion and distress',
    })
    expect(emotion).toMatch(/angry/i)
  })

  it('uses beat action cues for action beats without dialogue', () => {
    const emotion = resolveDirectedEmotionForCharacter({
      characterName: 'Marcus',
      beatAction: '[fearful] Marcus backs away from the doorway, terrified.',
    })
    expect(emotion).toMatch(/fearful|terrified/i)
  })

  it('infers emotion from action prose when no bracket cue exists', () => {
    const emotion = resolveDirectedEmotionForCharacter({
      characterName: 'Elara',
      beatAction: 'Elara is crying, tears streaming down her face.',
    })
    expect(emotion).toMatch(/crying|tearful/i)
  })

  it('falls back to wardrobe appearanceNotes when beat has no emotion', () => {
    const emotion = resolveDirectedEmotionForCharacter({
      characterName: 'Elara',
      beatAction: 'Elara sits at the desk reviewing documents.',
      appearanceNotes: 'Bloodshot eyes, faint bruise forming on left temple, visible distress',
    })
    expect(emotion).toMatch(/distress|bloodshot/i)
  })

  it('does not apply dialogue line emotion to non-speaking characters', () => {
    const emotion = resolveDirectedEmotionForCharacter({
      characterName: 'Marcus',
      beatSpeaker: 'Elara',
      beatLine: '[angry] You knew this would happen.',
      beatAction: 'Marcus watches silently.',
      appearanceNotes: 'Visible exhaustion and distress',
    })
    expect(emotion).not.toMatch(/angry/i)
    expect(emotion).toMatch(/distress|exhaustion/i)
  })

  it('extractSceneStateFromAppearanceNotes drops base identity traits', () => {
    const scoped = extractSceneStateFromAppearanceNotes(
      'Bloodshot eyes, pale skin, a faint bruise forming on her temple, dark brown wavy hair, visible exhaustion and distress'
    )
    expect(scoped).toMatch(/bloodshot/i)
    expect(scoped).toMatch(/bruise/i)
    expect(scoped).toMatch(/distress|exhaustion/i)
    expect(scoped).not.toMatch(/pale skin/i)
    expect(scoped).not.toMatch(/dark brown wavy hair/i)
  })
})

describe('beat directed emotion prompt helpers', () => {
  it('buildBeatDirectedEmotionPromptSection formats per-character lines', () => {
    const section = buildBeatDirectedEmotionPromptSection([
      { name: 'Elara', emotion: 'angry, intense expression' },
      { name: 'Marcus', emotion: 'fearful, anxious expression' },
    ])
    expect(section).toBe(
      'Directed emotion: Elara: angry, intense expression; Marcus: fearful, anxious expression.'
    )
  })

  it('formatDirectedEmotionLine produces Facial expression guidance', () => {
    expect(formatDirectedEmotionLine('scared, frightened expression')).toBe(
      'Facial expression: scared, frightened expression.'
    )
  })

  it('resolveBeatDirectedEmotion reads action before appearance-only context', () => {
    expect(
      resolveBeatDirectedEmotion({
        beatLine: '[sad] I cannot believe it.',
        beatAction: 'She slams the folder shut.',
      })
    ).toMatch(/sad/i)
  })
})

describe('inferEmotionFromActionProse', () => {
  it('detects crying and terrified keywords in action text', () => {
    expect(inferEmotionFromActionProse('She is crying uncontrollably')).toMatch(/crying/i)
    expect(inferEmotionFromActionProse('He looks terrified at the explosion')).toMatch(/terrified/i)
  })
})

describe('generate-image expression negative regression guard', () => {
  it('does not block beat emotions when identity reference smiles', () => {
    const routePath = join(
      process.cwd(),
      'src/app/api/scene/generate-image/route.ts'
    )
    const source = readFileSync(routePath, 'utf8')
    expect(source).not.toMatch(/includes\('smile'\)/)
    expect(source).not.toMatch(
      /characterSpecificNegatives\.push\('frowning', 'sad expression', 'angry expression'\)/
    )
  })
})

describe('generate-image beat frame acting and wardrobe regression guard', () => {
  it('uses cinematic in-scene wrapper instead of reference-match phrasing', () => {
    const routePath = join(
      process.cwd(),
      'src/app/api/scene/generate-image/route.ts'
    )
    const source = readFileSync(routePath, 'utf8')
    expect(source).toMatch(/performing the following moment in-scene \(candid, not posed\)/)
    expect(source).not.toMatch(
      /Create an image about \$\{subjectIntroductions\} to match the description:/
    )
  })

  it('adds anti-posing negatives for beat frames', () => {
    const routePath = join(
      process.cwd(),
      'src/app/api/scene/generate-image/route.ts'
    )
    const assemblyPath = join(
      process.cwd(),
      'src/lib/character/characterReferenceAssembly.ts'
    )
    const routeSource = readFileSync(routePath, 'utf8')
    const assemblySource = readFileSync(assemblyPath, 'utf8')
    expect(routeSource).toMatch(/BEAT_FRAME_ANTI_POSE_NEGATIVE_PROMPT/)
    expect(routeSource).toMatch(/buildWardrobeBindingSummary/)
    expect(routeSource).toMatch(/subjectBindingSummary/)
    expect(routeSource).toMatch(/SCENE PROMPT:/)
    expect(assemblySource).toMatch(/posing for camera/)
  })

  it('does not pass JSON-wrapped prompts through the AI optimized path', () => {
    const intelligencePath = join(
      process.cwd(),
      'src/lib/intelligence/scene-image-intelligence.ts'
    )
    const source = readFileSync(intelligencePath, 'utf8')
    expect(source).toMatch(/unwrapSceneImageAiPrompt/)
    expect(source).toMatch(/looksLikeJsonPrompt/)
  })
})
