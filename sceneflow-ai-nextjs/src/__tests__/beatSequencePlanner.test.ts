import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateText = vi.fn()

vi.mock('@/lib/vertexai/gemini', () => ({
  generateText: (...args: unknown[]) => generateText(...args),
  generateTextCacheAware: (...args: unknown[]) => generateText(...args),
}))

import {
  buildFallbackBeatPlans,
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
  ensureSceneMusicFromDirection,
  inferBeatRole,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  getBeatPlanCacheKey,
  planBeatSequence,
  type BeatSequencePlanRequest,
} from '@/lib/intelligence/beat-sequence-planner'
import {
  PROJECT_LOOKBOOK_VERSION,
  type ProjectLookbook,
} from '@/lib/intelligence/project-lookbook-fallback'
import { isTitleOrCinematicScene } from '@/lib/script/sceneClassification'
import { buildSceneImageCacheKey } from '@/lib/intelligence/scene-image-intelligence'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { mintBeatId } from '@/lib/script/beatMigration'

const lookbook: ProjectLookbook = {
  version: PROJECT_LOOKBOOK_VERSION,
  fingerprint: 'aaaa1111',
  masterStyle: 'Sun-bleached desert realism, live-action photoreal',
  colorPalette: 'Bone white and rust',
  lightingGrammar: 'Hard overhead sun, short shadows',
  lensAndFormat: 'Spherical 35mm, 1.85:1',
  textureAndGrade: 'Fine grain, lifted blacks',
  negativeStyleTerms: ['illustration', 'anime'],
  sceneLooks: [{ sceneIndex: 1, lookNote: 'Dust haze softens the key' }],
  generatedAt: '2026-01-01T00:00:00.000Z',
}

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
      // A title card has no staged action to carry the set, so the facets are
      // labelled once rather than restated by the frozen moment as well.
      expect(plan.prompt.match(/Dense, luminous, increasingly chaotic/g)).toHaveLength(1)
    }

    const titleBeat = result.find((p) => p.beatRole === 'title_reveal')
    expect(titleBeat?.prompt).toMatch(/Centered bold typography/i)
    expect(titleBeat?.prompt).toMatch(/Cool blues\/purples transitioning to warm amber/i)
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

function buildPlanRequest(
  overrides: Partial<BeatSequencePlanRequest> = {}
): BeatSequencePlanRequest {
  return {
    scene: {
      heading: 'EXT. SALT FLAT - DAY',
      action: 'Mara walks toward the wreck.',
    },
    beats: [
      {
        beatId: 'b0',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Mara walks toward the wreck.',
      },
      {
        beatId: 'b1',
        sequenceIndex: 1,
        kind: 'action',
        actionDescription: 'Mara kneels at the hull.',
      },
    ],
    sceneNumber: 2,
    totalScenes: 3,
    ...overrides,
  }
}

describe('buildPlannerSystemPrompt', () => {
  const system = buildPlannerSystemPrompt()

  it('asks for varied coverage under a locked look', () => {
    expect(system).toMatch(/COVERAGE VARIES, THE LOOK DOES NOT/)
    expect(system).toMatch(/subject, shot scale, or camera angle/i)
    expect(system).toMatch(/stay locked to the PROJECT LOOKBOOK/i)
    expect(system).toMatch(/Two beats sharing a look is correct/i)
  })

  it('asks for screen direction and carried state across consecutive beats', () => {
    expect(system).toMatch(/screen direction and eyelines consistent/i)
    expect(system).toMatch(/Carry visible state forward/i)
    expect(system).toMatch(/a door opened stays open/i)
  })

  it('makes the planner derive lighting and lens from the lookbook, not invent them', () => {
    expect(system).toMatch(/Derive both from the PROJECT LOOKBOOK/i)
    expect(system).toMatch(/never a new look/i)
    expect(system).toMatch(/Leave a field empty rather than contradict the lookbook/i)
  })

  it('requests the continuity fields in the output schema', () => {
    expect(system).toContain('"lighting"')
    expect(system).toContain('"lensMm"')
    expect(system).toContain('"screenDirection"')
    expect(system).toContain('"continuityNote"')
  })
})

describe('buildPlannerUserPrompt', () => {
  it('states the look before anything it has to compose inside', () => {
    const user = buildPlannerUserPrompt(buildPlanRequest({ lookbook }))

    expect(user).toContain('PROJECT LOOKBOOK')
    expect(user).toContain('Sun-bleached desert realism')
    expect(user).toContain('Hard overhead sun, short shadows')
    expect(user).toContain('Spherical 35mm, 1.85:1')
    expect(user).toContain('Never render as:')
    expect(user.indexOf('PROJECT LOOKBOOK')).toBeLessThan(user.indexOf('SCENE ACTION:'))
  })

  it("uses the scene's sanctioned departure from the master look", () => {
    const user = buildPlannerUserPrompt(buildPlanRequest({ lookbook }))
    expect(user).toContain('Dust haze softens the key')
  })

  it('shows the whole story spine and marks the current scene', () => {
    const user = buildPlannerUserPrompt(
      buildPlanRequest({
        storySpine: [
          { sceneIndex: 0, heading: 'INT. GARAGE - DAWN', oneLine: 'Mara packs the truck.' },
          { sceneIndex: 1, heading: 'EXT. SALT FLAT - DAY', oneLine: 'Mara finds the wreck.' },
          { sceneIndex: 2, heading: 'INT. MOTEL - NIGHT', oneLine: 'Mara burns the map.' },
        ],
      })
    )

    expect(user).toContain('STORY SPINE')
    expect(user).toContain('Mara packs the truck.')
    expect(user).toContain('Mara burns the map.')
    expect(user).toContain('> 2. EXT. SALT FLAT - DAY')
    expect(user).toContain('  1. INT. GARAGE - DAWN')
  })

  it('hands the planner the beat the previous scene ended on', () => {
    const user = buildPlannerUserPrompt(
      buildPlanRequest({
        previousSceneLastBeat: {
          shotType: 'Tight Close-Up',
          frozenMoment: 'Mara pockets the key.',
          screenDirection: 'Mara frame-left, facing right',
        },
      })
    )

    expect(user).toContain('PREVIOUS SCENE ENDED ON')
    expect(user).toContain('Tight Close-Up — Mara pockets the key. — Mara frame-left, facing right')
  })

  it('passes through the logline and the director’s visual style', () => {
    const user = buildPlannerUserPrompt(
      buildPlanRequest({
        filmContext: {
          title: 'Salt',
          logline: 'A mechanic drives into the desert to bury what she found.',
          visualStyle: 'Handheld, available light, no coverage safety net',
        },
      })
    )

    expect(user).toContain('A mechanic drives into the desert')
    expect(user).toContain("Director's visual style: Handheld, available light")
  })

  it('omits the lookbook block entirely when there is no project look', () => {
    const user = buildPlannerUserPrompt(buildPlanRequest())
    expect(user).not.toContain('PROJECT LOOKBOOK')
  })
})

describe('getBeatPlanCacheKey', () => {
  it('is stable for identical requests', () => {
    expect(getBeatPlanCacheKey(buildPlanRequest({ lookbook }))).toBe(
      getBeatPlanCacheKey(buildPlanRequest({ lookbook }))
    )
  })

  it('changes when the project look changes', () => {
    const before = getBeatPlanCacheKey(buildPlanRequest({ lookbook }))
    const after = getBeatPlanCacheKey(
      buildPlanRequest({ lookbook: { ...lookbook, fingerprint: 'bbbb2222' } })
    )
    expect(before).not.toBe(after)
  })

  it('changes when the surrounding story or the previous scene changes', () => {
    const bare = getBeatPlanCacheKey(buildPlanRequest())
    const spined = getBeatPlanCacheKey(
      buildPlanRequest({
        storySpine: [{ sceneIndex: 0, heading: 'INT. GARAGE - DAWN', oneLine: 'Mara packs.' }],
      })
    )
    const anchored = getBeatPlanCacheKey(
      buildPlanRequest({ previousSceneLastBeat: { frozenMoment: 'Mara pockets the key.' } })
    )

    expect(new Set([bare, spined, anchored]).size).toBe(3)
  })
})

describe('planBeatSequence', () => {
  beforeEach(() => {
    generateText.mockReset()
  })

  function respondWith(beats: Array<Record<string, unknown>>) {
    generateText.mockResolvedValue({ text: JSON.stringify({ reasoning: 'arc', beats }) })
  }

  it('wraps the model’s action text in the lookbook anchor', async () => {
    respondWith([
      {
        beatIndex: 0,
        shotType: 'Wide Shot',
        frozenMoment: 'Mara mid-stride on the salt.',
        prompt: 'Wide shot: Mara mid-stride, facing frame-right, wreck small on the horizon.',
        lighting: 'Sun raking from camera left',
        lensMm: '35mm',
      },
      {
        beatIndex: 1,
        shotType: 'Medium Close-Up',
        frozenMoment: 'Mara kneeling at the hull.',
        prompt: 'Medium close-up: Mara kneeling, still facing frame-right, palm on the hull.',
        lensMm: '35mm',
      },
    ])

    const result = await planBeatSequence(
      buildPlanRequest({ lookbook, projectId: 'anchor-project' })
    )

    expect(result.usedAI).toBe(true)
    expect(generateText).toHaveBeenCalledTimes(1)
    for (const plan of result.plans) {
      expect(plan.prompt.startsWith('[GLOBAL STYLE ANCHOR]')).toBe(true)
      expect(plan.prompt).toContain('Sun-bleached desert realism')
      expect(plan.prompt).toContain('Spherical 35mm, 1.85:1')
    }
    expect(result.plans[0].prompt).toContain('Sun raking from camera left')
    expect(result.plans[0].prompt).toContain(
      'Action/Framing: Wide shot: Mara mid-stride, facing frame-right'
    )
    expect(result.plans[0].lighting).toBe('Sun raking from camera left')
    expect(result.plans[0].lensMm).toBe('35mm')
  })

  it('keeps beats that hold a moment but change the camera setup', async () => {
    respondWith([
      {
        beatIndex: 0,
        shotType: 'Wide Shot',
        frozenMoment: 'Mara kneeling at the hull.',
        prompt: 'Wide shot: Mara kneeling at the hull, facing frame-right.',
      },
      {
        beatIndex: 1,
        shotType: 'Extreme Close-Up',
        frozenMoment: 'Mara kneeling at the hull.',
        prompt: 'Extreme close-up: Mara’s palm flat against the hull plating.',
      },
    ])

    const result = await planBeatSequence(buildPlanRequest({ projectId: 'coverage-project' }))

    expect(result.usedAI).toBe(true)
    expect(result.plans).toHaveLength(2)
  })

  it('falls back when every beat is the same setup on the same moment', async () => {
    respondWith([
      {
        beatIndex: 0,
        shotType: 'Wide Shot',
        frozenMoment: 'Mara kneeling at the hull.',
        prompt: 'Wide shot: Mara kneeling at the hull, facing frame-right.',
      },
      {
        beatIndex: 1,
        shotType: 'Wide Shot',
        frozenMoment: 'Mara kneeling at the hull.',
        prompt: 'Wide shot: Mara kneeling at the hull, facing frame-right.',
      },
    ])

    const result = await planBeatSequence(buildPlanRequest({ projectId: 'degenerate-project' }))

    expect(result.usedAI).toBe(false)
    expect(result.plans).toHaveLength(2)
  })

  it('leaves prompts unanchored when the project has no look', async () => {
    respondWith([
      {
        beatIndex: 0,
        shotType: 'Wide Shot',
        frozenMoment: 'Mara mid-stride on the salt.',
        prompt: 'Wide shot: Mara mid-stride, facing frame-right.',
      },
      {
        beatIndex: 1,
        shotType: 'Medium Close-Up',
        frozenMoment: 'Mara kneeling at the hull.',
        prompt: 'Medium close-up: Mara kneeling, palm on the hull.',
      },
    ])

    const result = await planBeatSequence(buildPlanRequest({ projectId: 'no-look-project' }))

    expect(result.usedAI).toBe(true)
    expect(result.plans[0].prompt).not.toContain('[GLOBAL STYLE ANCHOR]')
  })
})
