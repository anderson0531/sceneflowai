import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildBeatDirectedEmotionPromptSection,
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
