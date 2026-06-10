import { describe, it, expect } from 'vitest'
import {
  buildFallbackBeatPlans,
  ensureSceneMusicFromDirection,
  inferBeatRole,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import { isTitleOrCinematicScene } from '@/lib/script/sceneClassification'
import { buildSceneImageCacheKey } from '@/lib/intelligence/scene-image-intelligence'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { mintBeatId } from '@/lib/script/beatMigration'

const auraDirection = {
  sceneDescription:
    'Abstract data points coalesce into biometric markers. A neural network of personal information accelerates. Sensory overload builds before a stark white title card appears, then dissolves into warm light.',
  camera: {
    shots: [
      'Wide Shot',
      'Extreme Close-Up',
      'Tracking Shot',
      'Wide Shot',
      'Static Title Card',
    ],
    angle: 'Eye-Level (Virtual Camera perspective)',
    movement: 'Static initially, rapid forward glide through Z-axis',
  },
  scene: {
    location: 'Virtual Digital Space / Inside a Data Network',
    atmosphere: 'Dense, luminous, increasingly chaotic',
    keyProps: [
      'Glowing digital fingerprints',
      'Holographic retinal scans',
      'Facial recognition grids',
    ],
  },
  lighting: {
    overallMood: 'Ethereal, high-contrast, hyper-real',
    colorTemperature: 'Cool blues/purples transitioning to warm amber/white',
  },
  audio: {
    priorities: 'Rich layered sound design, digital synthesis, ethereal building score',
  },
}

function buildTitleBeats(): SceneBeat[] {
  return [
    {
      beatId: mintBeatId(),
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Wide opening: abstract data points in digital void.',
    },
    {
      beatId: mintBeatId(),
      sequenceIndex: 1,
      kind: 'action',
      actionDescription: 'ECU: biometric markers forming from data streams.',
    },
    {
      beatId: mintBeatId(),
      sequenceIndex: 2,
      kind: 'action',
      actionDescription: 'Tracking through glowing neural network tunnel.',
    },
    {
      beatId: mintBeatId(),
      sequenceIndex: 3,
      kind: 'action',
      actionDescription: 'Chaotic sensory overload — dense luminous information.',
    },
    {
      beatId: mintBeatId(),
      sequenceIndex: 4,
      kind: 'action',
      actionDescription: 'Title card reveal: bold centered typography displaying "AURA\'S ECHO".',
    },
  ]
}

describe('beat sequence planner', () => {
  it('fallback produces distinct frozen moments for title sequence beats', () => {
    const scene = {
      heading: 'INT. TITLE SEQUENCE - DAY',
      action: 'Cinematic title sequence establishing data and identity themes.',
      visualDescription: 'High-fidelity digital graphics, hyper-real texture.',
      sceneDirection: auraDirection,
      duration: 40,
    }
    const beats = buildTitleBeats()
    const result = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 1,
      totalScenes: 10,
      filmContext: { title: "AURA'S ECHO", genre: ['sci-fi'], tone: 'ethereal' },
      artStyle: 'photorealistic',
      forceFallback: true,
    })

    expect(result).toHaveLength(5)
    const moments = result.map((p) => p.frozenMoment.toLowerCase())
    expect(new Set(moments).size).toBe(5)

    const titleBeat = result.find((p) => p.beatRole === 'title_reveal')
    expect(titleBeat).toBeDefined()
    expect(titleBeat?.allowTypography).toBe(true)
    expect(titleBeat?.prompt).toContain("AURA'S ECHO")

    const nonTitle = result.filter((p) => !p.allowTypography)
    expect(nonTitle.length).toBeGreaterThanOrEqual(4)
  })

  it('includes direction atmosphere and props on every title beat prompt', () => {
    const scene = {
      heading: 'INT. TITLE SEQUENCE - DAY',
      action: 'Cinematic title sequence establishing data and identity themes.',
      sceneDirection: auraDirection,
      duration: 40,
    }
    const beats = buildTitleBeats()
    const result = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 1,
      totalScenes: 10,
      filmContext: { title: "AURA'S ECHO" },
      forceFallback: true,
    })

    for (const plan of result) {
      expect(plan.prompt).toMatch(/Dense, luminous|luminous, increasingly chaotic/i)
      expect(plan.prompt).toMatch(/digital fingerprints|retinal scans|recognition grids/i)
      expect(plan.prompt).toMatch(/Abstract digital composition, no people/i)
    }

    const titleBeat = result.find((p) => p.beatRole === 'title_reveal')
    expect(titleBeat?.prompt).toMatch(/Centered bold typography/i)
    expect(titleBeat?.prompt).toMatch(/Deep blues, electric purples/i)
  })

  it('maps camera shots 1:1 when shots match beat count', () => {
    const scene = {
      heading: 'INT. OFFICE - NIGHT',
      sceneDirection: auraDirection,
      duration: 40,
    }
    const beats = buildTitleBeats()
    const plans = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 2,
      forceFallback: true,
    })

    expect(plans[0].shotType).toBe('Wide Shot')
    expect(plans[1].shotType).toBe('Extreme Close-Up')
    expect(plans[2].shotType).toContain('Tracking')
  })

  it('infers title_reveal from action description', () => {
    const beat: SceneBeat = {
      beatId: 'b1',
      sequenceIndex: 4,
      kind: 'action',
      actionDescription: 'Title card reveal: bold centered typography displaying "AURA\'S ECHO".',
    }
    expect(inferBeatRole(beat, 4, 5, 'title', "AURA'S ECHO")).toBe('title_reveal')
  })

  it('ensures scene music from direction audio for title scenes', () => {
    const scene = {
      heading: 'TITLE SEQUENCE - DAY',
      sceneDirection: auraDirection,
    }
    const updated = ensureSceneMusicFromDirection(scene)
    const description =
      typeof updated.music === 'string'
        ? updated.music
        : (updated.music as { description?: string })?.description
    expect(description).toBeTruthy()
    expect(description).toMatch(/score|sound|digital|ethereal/i)
  })

  it('detects title cinematic scenes', () => {
    expect(isTitleOrCinematicScene({ heading: 'INT. TITLE SEQUENCE - DAY' })).toBe(true)
    expect(isTitleOrCinematicScene({ heading: 'INT. KITCHEN - DAY' })).toBe(false)
  })

  it('cache keys differ by beatIndex for same scene', () => {
    const base = {
      sceneHeading: 'INT. TITLE SEQUENCE - DAY',
      sceneAction: 'Title sequence action',
      sceneNumber: 1,
      sceneType: 'title' as const,
      characters: [],
      props: [],
      referenceImageCount: 0,
      beatKind: 'action' as const,
      totalBeats: 5,
      beatAction: 'Wide opening shot',
    }
    const key0 = buildSceneImageCacheKey({ ...base, beatIndex: 0 })
    const key1 = buildSceneImageCacheKey({ ...base, beatIndex: 1, beatAction: 'ECU biometrics' })
    expect(key0).not.toBe(key1)
  })
})
