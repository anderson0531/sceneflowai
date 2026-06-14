import { describe, expect, it } from 'vitest'
import {
  distillAppearanceNotesFromText,
  formatSceneForWardrobeAnalysis,
  resolveBeatActionText,
  sceneIncludesCharacter,
} from '@/lib/character/wardrobeAnalysis'

describe('formatSceneForWardrobeAnalysis', () => {
  it('includes beat actionDescription with character appearance details', () => {
    const formatted = formatSceneForWardrobeAnalysis(
      {
        sceneNumber: 4,
        heading: 'INT. INTERROGATION ROOM - NIGHT',
        beats: [
          {
            kind: 'action',
            actionDescription:
              "CLOSE UP: Elara's hands, now visibly trembling, are clasped tightly on the cold table surface. Her eyes are bloodshot, a faint bruise forming on her temple. The sharp focus captures every detail of her distress.",
          },
        ],
      },
      'Elara'
    )

    expect(formatted).toContain('Scene 4')
    expect(formatted).toContain('[Beat]')
    expect(formatted).toMatch(/bloodshot/i)
    expect(formatted).toMatch(/bruise/i)
  })

  it('includes dialogue beats for the named character', () => {
    const formatted = formatSceneForWardrobeAnalysis(
      {
        sceneNumber: 2,
        beats: [
          {
            kind: 'dialogue',
            character: 'Elara',
            line: 'I told you everything I know.',
          },
        ],
      },
      'Elara'
    )

    expect(formatted).toContain('[Beat] Elara: I told you everything I know.')
  })

  it('includes beat description field when actionDescription is absent', () => {
    const formatted = formatSceneForWardrobeAnalysis(
      {
        sceneNumber: 4,
        beats: [
          {
            kind: 'action',
            description:
              "CLOSE UP: Elara's eyes are bloodshot, a faint bruise forming on her temple.",
          },
        ],
      },
      'Elara'
    )

    expect(formatted).toMatch(/bruise/i)
    expect(formatted).toMatch(/bloodshot/i)
  })

  it('includes possessive character name in beat text', () => {
    const formatted = formatSceneForWardrobeAnalysis(
      {
        sceneNumber: 4,
        beats: [
          {
            kind: 'action',
            actionDescription:
              "CLOSE UP: Elara's hands trembling on the table, bloodshot eyes.",
          },
        ],
      },
      'Elara'
    )

    expect(formatted).toContain("Elara's hands")
  })

  it('includes both beats and segments when both are present', () => {
    const formatted = formatSceneForWardrobeAnalysis(
      {
        sceneNumber: 3,
        beats: [
          {
            kind: 'dialogue',
            character: 'Elara',
            line: 'Hello.',
          },
        ],
        segments: [
          {
            segmentDirection: {
              action: 'Elara sits with a bruise visible on her temple.',
            },
          },
        ],
      },
      'Elara'
    )

    expect(formatted).toContain('Beats:')
    expect(formatted).toContain('[Beat] Elara: Hello.')
    expect(formatted).toContain('Segments:')
    expect(formatted).toMatch(/bruise/i)
  })
})

describe('resolveBeatActionText', () => {
  it('falls back to description then action', () => {
    expect(
      resolveBeatActionText({ description: 'Close-up bruise on temple' })
    ).toBe('Close-up bruise on temple')
    expect(resolveBeatActionText({ action: 'Wide shot' })).toBe('Wide shot')
    expect(
      resolveBeatActionText({
        actionDescription: 'Primary',
        description: 'Secondary',
      })
    ).toBe('Primary')
  })
})

describe('distillAppearanceNotesFromText', () => {
  it('extracts bruise and bloodshot eyes from beat text', () => {
    const notes = distillAppearanceNotesFromText(
      "Her eyes are bloodshot, a faint bruise forming on her temple."
    )
    expect(notes).toMatch(/bloodshot/i)
    expect(notes).toMatch(/bruise/i)
  })
})

describe('sceneIncludesCharacter', () => {
  it('detects character in beat text even when absent from scene summary', () => {
    expect(
      sceneIncludesCharacter(
        {
          sceneNumber: 4,
          action: 'The room is silent.',
          beats: [
            {
              actionDescription:
                'CLOSE UP: Elara bloodshot eyes, faint bruise forming on her temple.',
            },
          ],
        },
        'Elara'
      )
    ).toBe(true)
  })
})
