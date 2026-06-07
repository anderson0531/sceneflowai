import { describe, it, expect } from 'vitest'
import { autoFixScript, runScriptQA } from '@/lib/script/qualityAssurance'

describe('qualityAssurance beats', () => {
  const characters = [{ name: 'Sarah', id: 'char-1' }]

  it('errors when main content scene lacks beats[]', () => {
    const scenes = [
      {
        sceneNumber: 1,
        heading: 'INT. TITLE SEQUENCE - DAY',
        cinematicType: 'title',
        duration: 20,
        beats: [{ kind: 'action', actionDescription: 'Title' }],
      },
      {
        sceneNumber: 2,
        heading: 'INT. LAB - DAY',
        action: 'Scene action',
        duration: 60,
        dialogue: [{ character: 'Sarah', line: '[calm] Hello.' }],
      },
      {
        sceneNumber: 3,
        heading: 'INT. CREDITS - DAY',
        cinematicType: 'outro',
        duration: 25,
        beats: [{ kind: 'action', actionDescription: 'Credits' }],
      },
    ]

    const result = runScriptQA(scenes as any, characters)
    const beatErrors = result.issues.filter(
      (i) => i.message.includes('missing beats[]')
    )
    expect(beatErrors.length).toBe(1)
    expect(beatErrors[0].sceneIndex).toBe(1)
  })

  it('warns on 3+ consecutive spoken beats', () => {
    const scenes = [
      {
        sceneNumber: 1,
        heading: 'INT. LAB - DAY',
        duration: 75,
        beats: [
          { kind: 'dialogue', character: 'Sarah', line: '[calm] One.' },
          { kind: 'dialogue', character: 'Sarah', line: '[calm] Two.' },
          { kind: 'narration', character: 'NARRATOR', line: '[calm] Three.' },
        ],
        dialogue: [
          { character: 'Sarah', line: '[calm] One.' },
          { character: 'Sarah', line: '[calm] Two.' },
          { character: 'NARRATOR', line: '[calm] Three.', kind: 'narration' },
        ],
      },
    ]

    const result = runScriptQA(scenes as any, characters)
    const consecutiveWarnings = result.issues.filter((i) =>
      i.message.includes('consecutive spoken beats')
    )
    expect(consecutiveWarnings.length).toBe(1)
  })

  it('autoFixScript hydrates missing beats from scene content', () => {
    const scenes = [
      {
        sceneNumber: 1,
        heading: 'INT. OFFICE - NIGHT',
        duration: 30,
        visualDescription: 'Dim office, monitor glow.',
        sceneDirection: {
          sceneDescription: 'Marcus reviews footage late at night.',
          camera: { shots: ['Wide Shot', 'Close-Up', 'Insert', 'Dutch Angle'] },
        },
        beats: [],
      },
    ]

    const qa = runScriptQA(scenes as any, characters)
    const { scenes: fixed, fixedCount } = autoFixScript(scenes as any, characters, qa)
    expect(fixedCount).toBeGreaterThan(0)
    expect((fixed[0] as any).beats?.length).toBeGreaterThan(0)
  })

  it('skips 45s duration warning for bookend scenes', () => {
    const scenes = [
      {
        sceneNumber: 1,
        heading: 'INT. TITLE SEQUENCE - DAY',
        cinematicType: 'title',
        duration: 15,
        beats: [{ kind: 'action', actionDescription: 'Title' }],
      },
    ]

    const result = runScriptQA(scenes as any, characters)
    const durationWarnings = result.issues.filter((i) =>
      i.message.includes('below the 45s minimum')
    )
    expect(durationWarnings.length).toBe(0)
  })
})
