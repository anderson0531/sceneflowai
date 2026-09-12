import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@/lib/intelligence/project-lookbook', () => ({
  ensureProjectLookbook: vi.fn(async () => undefined),
  summarizeScenesForLookbook: vi.fn(() => []),
}))

vi.mock('@/lib/intelligence/beat-sequence-planner', () => ({
  planBeatSequence: vi.fn(),
  applyBeatKeyframePlansToScene: vi.fn((scene: Record<string, unknown>) => scene),
  ensureSceneMusicFromDirection: vi.fn((scene: Record<string, unknown>) => scene),
  isTitleOrCinematicScene: () => false,
}))

vi.mock('@/lib/sceneGeneration/generateDirection', () => ({
  generateSceneDirection: vi.fn(),
}))

vi.mock('@/lib/sceneGeneration/generateAudio', () => ({
  generateSceneAudio: vi.fn(),
  applyAudioAssetsToScene: vi.fn(),
}))

vi.mock('@/lib/sceneGeneration/generateImage', () => ({
  generateSceneImage: vi.fn(),
}))

import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  resolveExpressBeatReferences,
  buildExpressBeatRefPayload,
  resolveBeatCharacterPolicy,
} from '@/lib/sceneGeneration/expressOrchestrator'
import { parseStillPromptSource } from '@/lib/imagen/structuredStillPrompt'

const alice = {
  id: 'char-alice',
  name: 'ALICE',
  referenceImage: 'https://example.com/alice.png',
  wardrobes: [
    {
      id: 'wardrobe-alley',
      name: 'Alley',
      description: 'Leather jacket',
      isDefault: true,
      sceneNumbers: [1],
      fullBodyUrl: 'https://example.com/alice-wardrobe.png',
    },
  ],
}

const locationRef = {
  id: 'loc-alley',
  location: 'ALLEY',
  locationDisplay: 'Rainy Alley',
  imageUrl: 'https://example.com/alley.png',
  sceneNumbers: [1],
  sourceSceneIndex: 0,
  sourceSceneHeading: 'EXT. RAINY ALLEY - NIGHT',
  pinnedAt: '2026-01-01T00:00:00.000Z',
}

const lanternProp = {
  id: 'prop-lantern',
  name: 'lantern',
  description: 'Brass lantern',
  imageUrl: 'https://example.com/lantern.png',
}

function buildProject(overrides?: {
  beat?: Partial<SceneBeat>
  scene?: Record<string, unknown>
}) {
  const beat: SceneBeat = {
    beatId: 'bt_action',
    kind: 'action',
    actionDescription: 'ALICE lifts the lantern in the alley.',
    sequenceIndex: 0,
    ...overrides?.beat,
  }

  const scene = {
    heading: 'INT. ALLEY - NIGHT',
    action: 'Rain in the alley.',
    beats: [beat],
    ...overrides?.scene,
  }

  return {
    metadata: {
      title: 'Test Film',
      visionPhase: {
        characters: [alice],
        references: {
          locationReferences: [locationRef],
          objectReferences: [lanternProp],
        },
        script: { script: { scenes: [scene] } },
      },
    },
    title: 'Test Film',
  }
}

describe('resolveExpressBeatReferences', () => {
  it('auto-resolves characters, wardrobe, location, and props for a fresh beat', () => {
    const project = buildProject()
    const scene = project.metadata.visionPhase.script.script.scenes[0]
    const beat = scene.beats[0] as SceneBeat

    const refs = resolveExpressBeatReferences({
      beat,
      scene,
      sceneIndex: 0,
      beatIdx: 0,
      sceneNumber: 1,
      project,
    })

    expect(refs).not.toBeNull()
    expect(refs!.api.characterSelectionExplicit).toBe(true)
    expect(refs!.api.skipObjectAutoDetection).toBe(true)
    expect(refs!.api.selectedCharacters).toContain('char-alice')
    expect(refs!.api.locationReferences).toHaveLength(1)
    expect(refs!.api.locationReferences[0].id).toBe('loc-alley')
    expect(refs!.api.objectReferences.some((o) => o.id === 'prop-lantern')).toBe(true)
    expect(refs!.api.characterWardrobes).toEqual([
      { characterId: 'char-alice', wardrobeId: 'wardrobe-alley' },
    ])
    expect(refs!.selection.characterIds).toContain('char-alice')
  })

  it('prefers saved beat.referenceSelection over auto-resolve', () => {
    const project = buildProject({
      beat: {
        referenceSelection: {
          characterIds: ['char-alice'],
          locationRefId: 'loc-alley',
          objectRefIds: [],
          characterWardrobes: [{ characterId: 'char-alice', wardrobeId: 'wardrobe-alley' }],
          resolvedAt: '2026-07-13T00:00:00.000Z',
          source: 'user',
        },
      },
    })
    const scene = project.metadata.visionPhase.script.script.scenes[0]
    const beat = scene.beats[0] as SceneBeat

    const refs = resolveExpressBeatReferences({
      beat,
      scene,
      sceneIndex: 0,
      beatIdx: 0,
      sceneNumber: 1,
      project,
    })

    expect(refs!.api.objectReferences).toHaveLength(0)
    expect(refs!.api.selectedCharacters).toEqual(['char-alice'])
    expect(refs!.fromSavedSelection).toBe(true)
  })

  it('does not lock Express auto-resolved selection as user-explicit', () => {
    const project = buildProject({
      beat: {
        referenceSelection: {
          characterIds: ['char-alice'],
          locationRefId: 'loc-alley',
          objectRefIds: [],
          resolvedAt: '2026-07-13T00:00:00.000Z',
          source: 'auto',
        },
      },
    })
    const scene = project.metadata.visionPhase.script.script.scenes[0]
    const beat = scene.beats[0] as SceneBeat

    const refs = resolveExpressBeatReferences({
      beat,
      scene,
      sceneIndex: 0,
      beatIdx: 0,
      sceneNumber: 1,
      project,
    })

    expect(refs!.fromSavedSelection).toBe(false)
    expect(refs!.selection.source).toBe('auto')
    expect(refs!.api.objectReferences.some((o) => o.id === 'prop-lantern')).toBe(true)
  })

  it('unions prompt-named cast into auto-resolved refs', () => {
    const bob = {
      id: 'char-bob',
      name: 'BOB',
      referenceImage: 'https://example.com/bob.png',
    }
    const project = buildProject()
    project.metadata.visionPhase.characters = [alice, bob]
    const scene = project.metadata.visionPhase.script.script.scenes[0]
    const beat = scene.beats[0] as SceneBeat

    const refs = resolveExpressBeatReferences({
      beat,
      scene,
      sceneIndex: 0,
      beatIdx: 0,
      sceneNumber: 1,
      project,
      promptText: 'Dutch Angle: BOB reclaims the lantern.',
    })

    expect(refs!.selection.characterIds).toEqual(
      expect.arrayContaining(['char-alice', 'char-bob'])
    )
  })

  it('takes only the parsed action text from a style-anchored beat prompt', () => {
    const bob = {
      id: 'char-bob',
      name: 'BOB',
      referenceImage: 'https://example.com/bob.png',
      wardrobes: [],
    }
    const project = buildProject()
    project.metadata.visionPhase.characters = [alice, bob]
    const scene = project.metadata.visionPhase.script.script.scenes[0]
    const beat = scene.beats[0] as SceneBeat

    const beatPrompt = [
      '[GLOBAL STYLE ANCHOR]',
      'Master Style: BOB Fosse-era stage realism, live-action photoreal',
      '',
      '[SCENE COMPOSITION & BEAT]',
      'Action/Framing: ALICE lifts the lantern in the alley.',
    ].join('\n')

    const args = {
      beat,
      scene,
      sceneIndex: 0,
      beatIdx: 0,
      sceneNumber: 1,
      project,
    }

    const fromWholePrompt = resolveExpressBeatReferences({ ...args, promptText: beatPrompt })
    const fromActionOnly = resolveExpressBeatReferences({
      ...args,
      promptText: parseStillPromptSource(beatPrompt).actionFraming,
    })

    expect(fromWholePrompt!.selection.characterIds).toContain('char-bob')
    expect(fromActionOnly!.selection.characterIds).not.toContain('char-bob')
    expect(fromActionOnly!.selection.characterIds).toContain('char-alice')
  })
})

describe('resolveBeatCharacterPolicy', () => {
  const titleSceneArgs = { sceneExcludesCharacters: true, project: buildProject(), beatIdx: 0, sceneNumber: 1 }

  it('leaves an ordinary scene alone', () => {
    const policy = resolveBeatCharacterPolicy({
      ...titleSceneArgs,
      sceneExcludesCharacters: false,
      beat: { beatId: 'bt', kind: 'action', sequenceIndex: 0, actionDescription: 'Title cards animate.' },
    })

    expect(policy.excludeCharacters).toBe(false)
    expect(policy.restrictToCharacterIds).toBeNull()
  })

  it('keeps a title card reference-free when the beat names nobody', () => {
    const policy = resolveBeatCharacterPolicy({
      ...titleSceneArgs,
      beat: { beatId: 'bt', kind: 'action', sequenceIndex: 0, actionDescription: 'Title cards animate.' },
    })

    expect(policy.excludeCharacters).toBe(true)
    expect(policy.restrictToCharacterIds).toBeNull()
  })

  it('attaches references when a title-scene beat names cast', () => {
    const policy = resolveBeatCharacterPolicy({
      ...titleSceneArgs,
      beat: {
        beatId: 'bt',
        kind: 'action',
        sequenceIndex: 0,
        actionDescription: 'ALICE stands centered in the void.',
      },
    })

    expect(policy.excludeCharacters).toBe(false)
    expect(policy.restrictToCharacterIds).toContain('char-alice')
  })

  it('reads the beat plan prompt as well as the beat text', () => {
    const policy = resolveBeatCharacterPolicy({
      ...titleSceneArgs,
      beat: { beatId: 'bt', kind: 'action', sequenceIndex: 0, actionDescription: 'The void holds.' },
      promptText: 'Medium shot: ALICE stands centered.',
    })

    expect(policy.excludeCharacters).toBe(false)
    expect(policy.restrictToCharacterIds).toContain('char-alice')
  })
})

describe('buildExpressBeatRefPayload', () => {
  it('omits characters and wardrobes when excludeCharacters is true', () => {
    const project = buildProject()
    const scene = project.metadata.visionPhase.script.script.scenes[0]
    const beat = scene.beats[0] as SceneBeat

    const refs = resolveExpressBeatReferences({
      beat,
      scene,
      sceneIndex: 0,
      beatIdx: 0,
      sceneNumber: 1,
      project,
    })!

    const payload = buildExpressBeatRefPayload(refs.api, {
      excludeCharacters: true,
      restrictToCharacterIds: null,
    })

    expect(payload.excludeCharacters).toBe(true)
    expect(payload.selectedCharacters).toBeUndefined()
    expect(payload.characterWardrobes).toBeUndefined()
    expect(payload.locationReferences).toHaveLength(1)
    expect(payload.skipObjectAutoDetection).toBe(true)
    expect(payload.characterSelectionExplicit).toBe(true)
  })

  it('does not lock generate-image to an empty explicit cast on talent beats', () => {
    const payload = buildExpressBeatRefPayload(
      {
        selectedCharacters: [],
        locationReferences: [locationRef],
        objectReferences: [],
        characterWardrobes: [],
        characterSelectionExplicit: true,
        skipObjectAutoDetection: true,
      },
      { excludeCharacters: false, restrictToCharacterIds: null }
    )

    expect(payload.excludeCharacters).toBeUndefined()
    expect(payload.characterSelectionExplicit).toBeUndefined()
    expect(payload.selectedCharacters).toBeUndefined()
    expect(payload.skipObjectAutoDetection).toBe(true)
    expect(payload.locationReferences).toHaveLength(1)
  })

  it('keeps only the cast a title-scene beat actually names', () => {
    const payload = buildExpressBeatRefPayload(
      {
        selectedCharacters: ['char-alice', 'char-bob'],
        locationReferences: [locationRef],
        objectReferences: [],
        characterWardrobes: [
          { characterId: 'char-alice', wardrobeId: 'wardrobe-alley' },
          { characterId: 'char-bob', wardrobeId: 'wardrobe-bob' },
        ],
        characterSelectionExplicit: true,
        skipObjectAutoDetection: true,
      },
      { excludeCharacters: false, restrictToCharacterIds: ['char-alice', 'ALICE'] }
    )

    expect(payload.selectedCharacters).toEqual(['char-alice'])
    expect(payload.characterWardrobes).toEqual([
      { characterId: 'char-alice', wardrobeId: 'wardrobe-alley' },
    ])
    expect(payload.characterSelectionExplicit).toBe(true)
  })
})

describe('Express beat generate-image flags', () => {
  it('skips Gemini intelligence and likeness on beat frames', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/sceneGeneration/expressOrchestrator.ts'),
      'utf8'
    )
    expect(src).toContain('useAIPrompt: false')
    expect(src).not.toMatch(/customPrompt: beatPlan\.prompt, useAIPrompt: true/)
    expect(src).toContain('skipLikenessValidation: true')
    expect(src).toContain('referenceCatalog: buildExpressReferenceCatalog(project)')
  })

  it('sends the start frame no prompt wording, so the route composes from direction', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/sceneGeneration/expressOrchestrator.ts'),
      'utf8'
    )
    // Sending the planner's prose put the beat on the route's custom-prompt
    // branch, which forwards it untouched and never reads beatDirection.
    expect(src).not.toContain('customPrompt: beatPlan.prompt')
  })
})

describe('the route composes a beat frame from its direction', () => {
  const routeSrc = readFileSync(
    join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'),
    'utf8'
  )

  it('reaches the composer without being asked for intelligence', () => {
    // The composer used to live inside `else if (useAIPrompt && ...)`, which
    // Express — the caller that generates every beat frame — never satisfies.
    const composed = routeSrc.indexOf('const persistedBeatPrompt = beatForPromptCompose')
    const intelligenceBranch = routeSrc.indexOf('} else if (runsSceneIntelligence) {')
    expect(composed).toBeGreaterThan(-1)
    expect(intelligenceBranch).toBeGreaterThan(composed)
    expect(routeSrc).toContain('} else if (persistedBeatPrompt) {')
  })

  it('still lets a genuine user prompt win', () => {
    const customBranch = routeSrc.indexOf('if (usingCustomPrompt) {')
    const beatBranch = routeSrc.indexOf('} else if (persistedBeatPrompt) {')
    expect(customBranch).toBeGreaterThan(-1)
    expect(beatBranch).toBeGreaterThan(customBranch)
  })
})

describe('frameType is decided by the beat, not by the button', () => {
  it('quick regen has no payload of its own to get wrong', () => {
    // It used to build a Direct body here, which is how it ended up pinned to
    // the pro tier and skipping the beat planner. It now starts a scoped
    // Express run instead, so there is one payload for every beat frame.
    const src = readFileSync(join(process.cwd(), 'src/lib/vision/preVisDirectGenerate.ts'), 'utf8')
    expect(src).not.toContain('buildBeatRegenDirectImagePayload')
    expect(src).not.toContain("frameType: 'beat'")

    const page = readFileSync(
      join(process.cwd(), 'src/app/dashboard/workflow/vision/[projectId]/page.tsx'),
      'utf8'
    )
    for (const handler of [
      'const handleGenerateBeatFrameImage',
      'const handleGenerateBeatEndFrameImage',
    ]) {
      const start = page.indexOf(handler)
      expect(start, handler).toBeGreaterThan(-1)
      const body = page.slice(start, page.indexOf('\n  const ', start + handler.length))
      expect(body, handler).toContain('handleExpressSceneGenerate')
      expect(body, handler).toContain("scope: 'selected'")
      expect(body, handler).not.toContain('/api/scene/generate-image')
    }
  })

  it('the Direct dialog routes any beat-backed slot the same way', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/dashboard/workflow/vision/[projectId]/page.tsx'),
      'utf8'
    )

    // The old gate let only action and narration slots become beat frames, so a
    // dialogue beat opened from this dialog skipped the structured still and the
    // [REFERENCES] legend that the very same beat got from quick regen.
    expect(src).not.toMatch(
      /slot\.beatId && \(slot\.kind === 'action' \|\| slot\.kind === 'narration'\)/
    )

    const beatBranch = src.indexOf('if (slot.beatId) {')
    expect(beatBranch).toBeGreaterThan(-1)

    // Still first in the chain: a beat-backed slot with a dialogueIndex must not
    // fall through to the dialogue branch.
    const dialogueBranch = src.indexOf("payload.frameType = 'dialogue'")
    expect(dialogueBranch).toBeGreaterThan(beatBranch)
    expect(src.slice(beatBranch, dialogueBranch)).toContain("payload.frameType = 'beat'")
  })
})
