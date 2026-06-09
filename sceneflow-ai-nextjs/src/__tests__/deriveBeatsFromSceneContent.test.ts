import { describe, it, expect } from 'vitest'
import {
  computeTargetBeatCount,
  deriveActionBeatsFromDirection,
  deriveBeatsFromSceneContent,
  ensureSceneBeats,
} from '@/lib/script/beatMigration'

const marcusDirection = {
  sceneDescription:
    'Marcus Thorne works late into the night in his dimly lit office, obsessively reviewing security footage. A growing sense of dread washes over him as he discovers something unsettling.',
  camera: {
    shots: [
      'Wide Establishing Shot',
      'Over-the-Shoulder Insert',
      'Extreme Close-Up',
      'Dutch Angle Close-Up',
    ],
    angle: 'Low Angle on Marcus',
    movement: 'Slow push-in intercut with rapid inserts',
  },
  lighting: {
    overallMood: 'Low-Key, Tech-Noir',
    timeOfDay: 'Night',
    colorTemperature: 'Cool screens, warm desk lamp',
  },
  scene: {
    location: "Marcus Thorne's private office",
    atmosphere: 'Cluttered & Chaotic, heavy with isolation',
    keyProps: ['Case files', 'Computer monitors', 'Cold coffee cup'],
  },
  talent: {
    blocking: 'Marcus cycles through footage at his desk',
    keyActions: ['Clicks mouse rapidly', 'Leans closer to screen', 'Recoils in dread'],
    emotionalBeat: 'Focused investigation escalating into severe anxiety',
  },
  audio: {
    priorities: 'Mouse clicks and computer fan hum',
  },
}

describe('deriveBeatsFromSceneContent', () => {
  it('computes 4 beats for a 30s scene', () => {
    expect(computeTargetBeatCount({ duration: 30 })).toBe(4)
  })

  it('derives 4 action beats from camera shots for 30s action-only scene', () => {
    const scene = {
      duration: 30,
      visualDescription:
        'Dark, moody lighting, glow of computer screens illuminating Marcus face.',
      sceneDirection: marcusDirection,
      beats: [],
    }

    const beats = deriveBeatsFromSceneContent(scene)
    expect(beats).toHaveLength(4)
    expect(beats.every((b) => b.kind === 'action')).toBe(true)
    expect(beats[0].actionDescription).toContain('Wide Establishing Shot')
    expect(beats[3].actionDescription).toContain('Dutch Angle Close-Up')
  })

  it('creates at least one beat from visualDescription only', () => {
    const beats = deriveBeatsFromSceneContent({
      visualDescription: 'Rain-soaked street at night, neon reflections.',
    })
    expect(beats.length).toBeGreaterThanOrEqual(1)
    expect(beats[0].kind).toBe('action')
    expect(beats[0].actionDescription).toContain('Rain-soaked street')
  })

  it('ensureSceneBeats hydrates rich sceneDirection with empty beats array', () => {
    const updated = ensureSceneBeats({
      duration: 30,
      visualDescription: 'Moody office glow.',
      sceneDirection: marcusDirection,
      beats: [],
    })

    const beats = (updated as { beats: Array<{ kind: string }> }).beats
    expect(beats.length).toBe(4)
  })

  it('falls back when beats array has invalid entries', () => {
    const updated = ensureSceneBeats({
      duration: 30,
      visualDescription: 'Moody office glow.',
      sceneDirection: marcusDirection,
      beats: [{ invalid: true }],
    })

    const beats = (updated as { beats: Array<{ kind: string }> }).beats
    expect(beats.length).toBe(4)
    expect(beats.every((b) => b.kind === 'action')).toBe(true)
  })

  it('preserves spoken beats and appends action beats to reach duration target', () => {
    const beats = deriveBeatsFromSceneContent({
      duration: 32,
      dialogue: [
        { character: 'Sarah', line: '[calm] We need to leave.' },
        { character: 'Marcus', line: '[anxious] Not yet.' },
      ],
      sceneDirection: marcusDirection,
    })

    const spoken = beats.filter((b) => b.kind === 'dialogue')
    const action = beats.filter((b) => b.kind === 'action')
    expect(spoken).toHaveLength(2)
    expect(beats.length).toBeGreaterThanOrEqual(4)
    expect(action.length).toBeGreaterThan(0)
  })

  it('deriveActionBeatsFromDirection maps shots to beat descriptions', () => {
    const beats = deriveActionBeatsFromDirection(
      { duration: 30, sceneDirection: marcusDirection },
      4
    )
    expect(beats[1].actionDescription).toContain('Over-the-Shoulder Insert')
    expect(beats[1].actionDescription).toContain('Clicks mouse rapidly')
  })

  it('deriveActionBeatsFromDirection uses sequential sentences when enough for each beat', () => {
    const beats = deriveActionBeatsFromDirection(
      {
        duration: 40,
        sceneDirection: {
          sceneDescription:
            'Data points swirl in darkness. Biometric markers emerge. Neural pathways ignite. Chaos overwhelms the frame. A title card appears.',
          camera: {
            shots: ['Wide', 'ECU', 'Tracking', 'Wide', 'Static'],
          },
        },
      },
      5
    )
    expect(beats).toHaveLength(5)
    expect(beats[0].actionDescription).toContain('Data points swirl')
    expect(beats[1].actionDescription).toContain('Biometric markers')
    expect(beats[2].actionDescription).toContain('Neural pathways')
    expect(beats[0].actionDescription).not.toBe(beats[1].actionDescription)
  })
})
