import { describe, it, expect } from 'vitest'
import { deriveBeatsFromSceneContent } from '@/lib/script/beatMigration'
import {
  applyDerivedSfxToScene,
  assignSfxToBeats,
  deriveSfxFromSceneContent,
  extractInlineSfxFromActionText,
  extractSfxDescriptionsFromAudioText,
  readBeatSfxAudio,
  resolveBeatSfxSlot,
} from '@/lib/script/deriveSfxFromSceneContent'

const marcusDirection = {
  sceneDescription:
    'Marcus Thorne works late into the night in his dimly lit office, obsessively reviewing security footage.',
  camera: {
    shots: [
      'Wide Establishing Shot',
      'Over-the-Shoulder Insert',
      'Extreme Close-Up',
      'Dutch Angle Close-Up',
    ],
  },
  talent: {
    keyActions: ['Clicks mouse rapidly', 'Leans closer to screen', 'Recoils in dread'],
  },
  audio: {
    priorities: 'Mouse clicks and computer fan hum',
  },
}

describe('extractSfxDescriptionsFromAudioText', () => {
  it('extracts tactile keyboard clacking from dialogue-over phrasing', () => {
    const cues = extractSfxDescriptionsFromAudioText(
      'Capture clean dialogue over the tactile keyboard clacking'
    )
    expect(cues).toEqual(['tactile keyboard clacking'])
  })

  it('splits compound audio priorities into multiple cues', () => {
    const cues = extractSfxDescriptionsFromAudioText('Mouse clicks and computer fan hum')
    expect(cues).toContain('Mouse clicks')
    expect(cues).toContain('computer fan hum')
  })

  it('filters production-only instructions', () => {
    const cues = extractSfxDescriptionsFromAudioText(
      'Silence on set; capture clean dialogue'
    )
    expect(cues).toHaveLength(0)
  })
})

describe('extractInlineSfxFromActionText', () => {
  it('parses SFX lines from action text', () => {
    const cues = extractInlineSfxFromActionText(
      'SOUND of footsteps approaching.\n\nSFX: Footsteps on hardwood\n\nMusic: Suspenseful strings'
    )
    expect(cues).toEqual(['Footsteps on hardwood'])
  })
})

describe('deriveSfxFromSceneContent', () => {
  it('derives and assigns SFX for action-only Marcus scene', () => {
    const scene = {
      duration: 30,
      visualDescription: 'Moody office glow.',
      sceneDirection: marcusDirection,
    }
    const beats = deriveBeatsFromSceneContent(scene)
    const cues = deriveSfxFromSceneContent(scene, beats)

    expect(cues.length).toBeGreaterThanOrEqual(2)
    const descriptions = cues.map((c) => c.description.toLowerCase())
    expect(descriptions.some((d) => d.includes('mouse click'))).toBe(true)
    expect(descriptions.some((d) => d.includes('fan hum'))).toBe(true)

    const clickCue = cues.find((c) => c.description.toLowerCase().includes('click'))
    expect(clickCue?.sourceBeatId).toBeTruthy()
    const clickBeat = beats.find((b) => b.beatId === clickCue?.sourceBeatId)
    expect(clickBeat?.actionDescription?.toLowerCase()).toMatch(/click|mouse|insert/)
  })

  it('is idempotent when applied twice', () => {
    const scene = {
      duration: 30,
      sceneDirection: marcusDirection,
    }
    const beats = deriveBeatsFromSceneContent(scene)
    const once = applyDerivedSfxToScene(scene, beats)
    const twice = applyDerivedSfxToScene(once, beats)
    expect((twice.sfx as unknown[]).length).toBe((once.sfx as unknown[]).length)
  })

  it('remaps sfxAudio by sfxId after derive merge', () => {
    const scene = {
      duration: 30,
      sceneDirection: marcusDirection,
      sfx: [
        { description: 'Mouse clicks', sourceBeatId: 'bt_a', sfxId: 'sfx_a', legacyIndex: 0 },
        {
          description: 'Reserved beat slot',
          sourceBeatId: 'bt_b',
          sfxId: 'sfx_b',
          legacyIndex: 1,
        },
      ],
      sfxAudio: ['https://example.com/a.mp3', 'https://example.com/b.mp3'],
      beats: [
        {
          beatId: 'bt_a',
          kind: 'action' as const,
          sequenceIndex: 0,
          actionDescription: 'Clicks mouse rapidly',
        },
        {
          beatId: 'bt_b',
          kind: 'action' as const,
          sequenceIndex: 1,
          actionDescription: 'Leans closer to screen',
        },
      ],
    }
    const beats = deriveBeatsFromSceneContent(scene)
    const updated = applyDerivedSfxToScene(scene, beats)
    const slotB = resolveBeatSfxSlot(updated, {
      beatId: 'bt_b',
      kind: 'action',
      actionDescription: 'Leans closer to screen',
    })
    expect(readBeatSfxAudio(updated, slotB)).toBe('https://example.com/b.mp3')
    expect((updated.sfxAudio as string[]).includes('https://example.com/a.mp3')).toBe(true)
  })
})

describe('assignSfxToBeats', () => {
  it('anchors dialogue-adjacent cues to spoken beats', () => {
    const beats = [
      {
        beatId: 'bt_action',
        sequenceIndex: 0,
        kind: 'action' as const,
        actionDescription: 'Typing at desk',
      },
      {
        beatId: 'bt_dialogue',
        sequenceIndex: 1,
        kind: 'dialogue' as const,
        character: 'Alex',
        line: 'We need to ship this.',
        lineId: 'ln_1',
      },
    ]
    const cues = assignSfxToBeats(
      ['keyboard clacking under dialogue'],
      beats,
      { sceneDirection: { audio: { priorities: 'keyboard clacking under dialogue' } } }
    )
    expect(cues[0].sourceLineId).toBe('ln_1')
    expect(cues[0].sourceBeatId).toBe('bt_dialogue')
  })
})
