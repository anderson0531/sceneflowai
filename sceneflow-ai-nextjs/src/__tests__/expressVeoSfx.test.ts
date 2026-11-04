import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import { resolveSfxDuration } from '@/lib/elevenlabs/sfxDuration'
import {
  beatHasSfxAudio,
  listSelectableActionBeats,
  resolveExpressVeoSfxItems,
} from '@/lib/sfx/resolveExpressVeoSfxItems'
import { estimateExpressVeoSfxCredits } from '@/lib/sfx/clientExpressVeoSfx'
import { runExpressVeoSfx } from '@/lib/sfx/expressVeoSfxOrchestrator'

vi.mock('@/services/CreditService', () => ({
  CreditService: {
    ensureCredits: vi.fn().mockResolvedValue(true),
    charge: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/credits/costTracking', () => ({
  trackCost: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/sfx/veoSfx', () => ({
  generateVeoSfxAudio: vi.fn().mockResolvedValue({
    url: 'https://example.com/sfx.mp3',
    gcsPath: 'gs://bucket/sfx.mp3',
    clipDurationSeconds: 8,
    byteLength: 1200,
    promptMode: 'actionBeat',
  }),
}))

vi.mock('@/lib/sfx/persistSceneSfxAudio', () => ({
  persistSceneSfxAudioAtomic: vi.fn().mockResolvedValue({ sfxIndex: 0 }),
}))

describe('resolveExpressVeoSfxItems', () => {
  const scene = {
    beats: [
      {
        beatId: 'bt_action_1',
        kind: 'action',
        actionDescription: 'Keyboard clacking in a quiet room.',
        beatDirection: { audioCue: 'Keyboard clacking' },
      },
      {
        beatId: 'bt_dialogue_1',
        kind: 'dialogue',
        character: 'Alex',
        line: 'Hello.',
      },
    ],
    sfx: [],
    sfxAudio: [],
  } as Record<string, unknown>

  it('returns action beat items for valid beatIds', () => {
    const result = resolveExpressVeoSfxItems(scene, ['bt_action_1'])
    expect(result.items).toHaveLength(1)
    expect(result.items[0].beatId).toBe('bt_action_1')
    expect(result.items[0].promptMode).toBe('actionBeat')
    expect(result.errors).toHaveLength(0)
  })

  it('skips beats that already have audio unless regenerate is true', () => {
    const withAudio = {
      ...scene,
      sfx: [{ description: 'Keyboard clacking', sourceBeatId: 'bt_action_1', sfxId: 'sfx_1' }],
      sfxAudio: ['https://example.com/existing.mp3'],
    }
    const skipped = resolveExpressVeoSfxItems(withAudio, ['bt_action_1'])
    expect(skipped.items).toHaveLength(0)
    expect(skipped.skipped[0]?.reason).toBe('already has audio')

    const regenerated = resolveExpressVeoSfxItems(withAudio, ['bt_action_1'], { regenerate: true })
    expect(regenerated.items).toHaveLength(1)
  })

  it('skips shots the score carries', () => {
    const quiet = {
      beats: [
        { beatId: 'bt_quiet', kind: 'action', actionDescription: 'She watches the alley.' },
      ],
      sfx: [],
      sfxAudio: [],
    } as Record<string, unknown>
    const result = resolveExpressVeoSfxItems(quiet, ['bt_quiet'])
    expect(result.items).toHaveLength(0)
    expect(result.skipped[0]?.reason).toBe('score carries this shot')
  })

  it('lists selectable action beats and detects existing audio', () => {
    const beats = listSelectableActionBeats(scene)
    expect(beats).toHaveLength(1)
    expect(beatHasSfxAudio(scene, { beatId: 'bt_action_1', kind: 'action' })).toBe(false)
  })

  it('assigns distinct sfxIndex values for batch of new beats', () => {
    const multiBeatScene = {
      beats: [
        { beatId: 'bt_a', kind: 'action', actionDescription: 'Wind through trees.', beatDirection: { audioCue: 'Wind through trees' } },
        { beatId: 'bt_b', kind: 'action', actionDescription: 'Footsteps on gravel.', beatDirection: { audioCue: 'Footsteps on gravel' } },
        { beatId: 'bt_c', kind: 'action', actionDescription: 'Door creaking open.', beatDirection: { audioCue: 'Door creaks' } },
      ],
      sfx: [],
      sfxAudio: [],
    } as Record<string, unknown>

    const result = resolveExpressVeoSfxItems(multiBeatScene, ['bt_a', 'bt_b', 'bt_c'])
    expect(result.items).toHaveLength(3)
    const indices = result.items.map((item) => item.sfxIndex)
    expect(new Set(indices).size).toBe(3)
    expect(indices).toEqual([0, 1, 2])
  })
})

describe('express Veo SFX credits', () => {
  it('estimates 75 credits per selected beat (Veo Lite)', () => {
    expect(estimateExpressVeoSfxCredits(3)).toBe(VIDEO_CREDITS.VEO_LITE * 3)
  })
})

describe('runExpressVeoSfx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('emits start and complete with concurrent item processing', async () => {
    const events: string[] = []
    const project = {
      metadata: {
        visionPhase: {
          script: {
            scenes: [
              {
                beats: [
                  {
                    beatId: 'bt_a',
                    kind: 'action',
                    actionDescription: 'Wind through trees.',
                    beatDirection: { audioCue: 'Wind through trees' },
                  },
                  {
                    beatId: 'bt_b',
                    kind: 'action',
                    actionDescription: 'Footsteps on gravel.',
                    beatDirection: { audioCue: 'Footsteps on gravel' },
                  },
                ],
                sfx: [],
                sfxAudio: [],
              },
            ],
          },
        },
      },
    }

    const result = await runExpressVeoSfx(
      project,
      {
        projectId: 'proj-1',
        sceneIndex: 0,
        beatIds: ['bt_a', 'bt_b'],
        clipDurationSeconds: 8,
        regenerate: false,
        userId: 'user-1',
      },
      (event) => {
        events.push(event.type)
      }
    )

    expect(result.success).toBe(2)
    expect(result.failed).toBe(0)
    expect(events).toContain('start')
    expect(events.filter((type) => type === 'item-done')).toHaveLength(2)
    expect(events).toContain('complete')
  })
})

describe('Veo 3.1 Lite SFX route and duration alignment', () => {
  it('routes /api/tts/elevenlabs/sound-effects through generateVeoSfxAudio instead of ElevenLabs API', () => {
    const routeSource = readFileSync(
      path.join(process.cwd(), 'src/app/api/tts/elevenlabs/sound-effects/route.ts'),
      'utf8'
    )
    expect(routeSource).toContain('generateVeoSfxAudio')
    expect(routeSource).not.toContain('generateElevenLabsSfx')
    expect(routeSource).toContain('VIDEO_CREDITS.VEO_LITE')
    expect(routeSource).toContain('maxDuration = 300')
  })

  it('snaps legacy resolveSfxDuration presets to Veo 3.1 Lite clip lengths (4s / 6s / 8s, default 8s)', () => {
    expect(resolveSfxDuration()).toBe(8)
    expect(resolveSfxDuration({ override: 'short' })).toBe(4)
    expect(resolveSfxDuration({ override: 'medium' })).toBe(8)
    expect(resolveSfxDuration({ override: 'long' })).toBe(8)
    expect(resolveSfxDuration({ segmentDurationSeconds: 3, override: 'auto' })).toBe(4)
    expect(resolveSfxDuration({ segmentDurationSeconds: 6, override: 'auto' })).toBe(6)
    expect(resolveSfxDuration({ segmentDurationSeconds: 8, override: 'auto' })).toBe(8)
  })
})
