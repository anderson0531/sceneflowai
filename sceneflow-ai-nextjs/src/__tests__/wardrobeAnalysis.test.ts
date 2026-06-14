import { describe, expect, it } from 'vitest'
import {
  formatSceneForWardrobeAnalysis,
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
