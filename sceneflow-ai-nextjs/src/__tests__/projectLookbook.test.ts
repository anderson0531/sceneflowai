import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateText = vi.fn()

vi.mock('@/lib/vertexai/gemini', () => ({
  generateText: (...args: unknown[]) => generateText(...args),
}))

import {
  buildFallbackProjectLookbook,
  buildLookbookUserPrompt,
  fingerprintLookbookSource,
  formatLookbookForPlannerPrompt,
  formatLookbookStyleAnchor,
  getSceneLookNote,
  summarizeScenesForLookbook,
  PROJECT_LOOKBOOK_VERSION,
  type ProjectLookbook,
  type ProjectLookbookRequest,
} from '@/lib/intelligence/project-lookbook-fallback'
import {
  deriveProjectLookbook,
  ensureProjectLookbook,
  __clearProjectLookbookCacheForTests,
} from '@/lib/intelligence/project-lookbook'
import { parseStillPromptSource, assembleStructuredStillPrompt } from '@/lib/imagen/structuredStillPrompt'
import { composeBeatStillPrompt } from '@/lib/intelligence/beat-sequence-planner-fallback'

const scenes: Array<Record<string, unknown>> = [
  {
    heading: 'INT. DINER - NIGHT',
    action: 'Mara slides into the booth. She does not take off her coat.',
    sceneDirection: {
      lighting: {
        overallMood: 'Low-key, single-source',
        colorTemperature: 'Warm sodium practicals against cool window spill',
        timeOfDay: 'Night',
      },
      scene: { location: 'Roadside diner', atmosphere: 'Stale coffee and rain' },
      camera: { shots: ['Wide Shot', 'Medium Close-Up'], lensChoice: 'Standard (40mm)' },
    },
  },
  {
    heading: 'EXT. PARKING LOT - NIGHT',
    action: 'The truck idles. Mara watches the door she just came through.',
    sceneDirection: {
      lighting: {
        overallMood: 'Low-key, single-source',
        colorTemperature: 'Sodium vapour orange',
        timeOfDay: 'Night',
      },
      scene: { location: 'Cracked asphalt lot', atmosphere: 'Rain haze' },
      camera: { shots: ['Wide Shot'], lensChoice: 'Standard (40mm)' },
    },
  },
]

function buildRequest(overrides: Partial<ProjectLookbookRequest> = {}): ProjectLookbookRequest {
  return {
    scenes: summarizeScenesForLookbook(scenes),
    filmContext: {
      title: 'Nightshift',
      genre: ['neo-noir'],
      tone: 'bleak',
      logline: 'A waitress covers for the wrong brother.',
    },
    artStyle: 'photorealistic',
    projectId: 'proj_1',
    ...overrides,
  }
}

function buildProject(metadataOverrides: Record<string, unknown> = {}) {
  return {
    id: 'proj_1',
    metadata: {
      title: 'Nightshift',
      visionPhase: {
        artStyle: 'photorealistic',
        treatment: { genre: 'neo-noir', tone: 'bleak', visualStyle: 'grainy 16mm naturalism' },
        script: { scenes },
        ...metadataOverrides,
      },
    },
  }
}

const lookbook: ProjectLookbook = {
  version: PROJECT_LOOKBOOK_VERSION,
  fingerprint: 'abcd1234',
  masterStyle: 'grainy 16mm-inspired neo-noir naturalism',
  colorPalette: 'sodium orange highlights, cyan shadow tint, low saturation',
  lightingGrammar: 'single motivated practical key, hard falloff, no fill',
  lensAndFormat: '40mm spherical, shallow-to-medium depth of field, 16:9',
  textureAndGrade: 'fine grain, crushed blacks, gentle highlight rolloff',
  negativeStyleTerms: ['illustration', 'cartoon'],
  sceneLooks: [{ sceneIndex: 1, lookNote: 'rain haze lifts contrast a stop' }],
  generatedAt: '2026-01-01T00:00:00.000Z',
  usedAI: true,
}

beforeEach(() => {
  generateText.mockReset()
  __clearProjectLookbookCacheForTests()
})

describe('summarizeScenesForLookbook', () => {
  it('reduces scenes to heading, one line, and direction cues', () => {
    const summaries = summarizeScenesForLookbook(scenes)
    expect(summaries).toHaveLength(2)
    expect(summaries[0]).toMatchObject({
      sceneIndex: 0,
      heading: 'INT. DINER - NIGHT',
      lightingMood: 'Low-key, single-source',
      timeOfDay: 'Night',
      lensChoice: 'Standard (40mm)',
    })
    expect(summaries[0].oneLine).toBe(
      'Mara slides into the booth. She does not take off her coat.'
    )
  })

  it('keeps taking sentences past screenplay abbreviations', () => {
    const [summary] = summarizeScenesForLookbook([
      { heading: 'INT. LOBBY - DAY', action: 'Mr. Grady waits. He checks the clock again.' },
    ])
    expect(summary.oneLine).toBe('Mr. Grady waits. He checks the clock again.')
  })

  it('tolerates object headings and missing direction', () => {
    const summaries = summarizeScenesForLookbook([
      { heading: { text: 'INT. VOID - DAY' } },
      null,
    ])
    expect(summaries[0].heading).toBe('INT. VOID - DAY')
    expect(summaries[0].oneLine).toBe('INT. VOID - DAY')
    expect(summaries[1].heading).toBe('')
    expect(summaries[1].lightingMood).toBeUndefined()
  })
})

describe('fingerprintLookbookSource', () => {
  it('is stable across calls with the same inputs', () => {
    expect(fingerprintLookbookSource(buildRequest())).toBe(
      fingerprintLookbookSource(buildRequest())
    )
  })

  it('changes when the director edits the visual style', () => {
    const before = fingerprintLookbookSource(buildRequest())
    const after = fingerprintLookbookSource(
      buildRequest({
        filmContext: { ...buildRequest().filmContext, visualStyle: 'hard flash, high key' },
      })
    )
    expect(after).not.toBe(before)
  })

  it('changes when a scene is added or its direction changes', () => {
    const before = fingerprintLookbookSource(buildRequest())
    const withExtraScene = fingerprintLookbookSource(
      buildRequest({
        scenes: summarizeScenesForLookbook([...scenes, { heading: 'INT. MOTEL - DAWN' }]),
      })
    )
    expect(withExtraScene).not.toBe(before)

    const relit = structuredClone(scenes) as Array<{
      sceneDirection: { lighting: { overallMood: string } }
    }>
    relit[0].sceneDirection.lighting.overallMood = 'High-key, flat'
    expect(
      fingerprintLookbookSource(buildRequest({ scenes: summarizeScenesForLookbook(relit) }))
    ).not.toBe(before)
  })

  it('ignores whitespace and case differences', () => {
    const spaced = summarizeScenesForLookbook(scenes).map((scene) => ({
      ...scene,
      heading: `  ${scene.heading.toLowerCase()}  `,
    }))
    expect(fingerprintLookbookSource(buildRequest({ scenes: spaced }))).toBe(
      fingerprintLookbookSource(buildRequest())
    )
  })
})

describe('buildFallbackProjectLookbook', () => {
  it('derives one look from the modal direction values with no LLM', () => {
    const fallback = buildFallbackProjectLookbook(buildRequest())

    expect(generateText).not.toHaveBeenCalled()
    expect(fallback.usedAI).toBe(false)
    expect(fallback.version).toBe(PROJECT_LOOKBOOK_VERSION)
    expect(fallback.fingerprint).toBe(fingerprintLookbookSource(buildRequest()))
    // "Low-key, single-source" is the modal lighting across both scenes.
    expect(fallback.lightingGrammar).toContain('Low-key, single-source')
    expect(fallback.lensAndFormat).toContain('Standard (40mm)')
    expect(fallback.textureAndGrade).toContain('grain')
    expect(fallback.negativeStyleTerms).toContain('cartoon')
  })

  it("prefers the director's visual style as the master style", () => {
    const fallback = buildFallbackProjectLookbook(
      buildRequest({
        filmContext: { ...buildRequest().filmContext, visualStyle: 'grainy 16mm naturalism' },
      })
    )
    expect(fallback.masterStyle).toBe('grainy 16mm naturalism')
  })

  it('falls back to genre and tone when no visual style is authored', () => {
    const fallback = buildFallbackProjectLookbook(buildRequest())
    expect(fallback.masterStyle).toContain('neo-noir')
    expect(fallback.masterStyle).toContain('bleak')
  })

  it('drops photoreal negative terms for a stylized art style', () => {
    const fallback = buildFallbackProjectLookbook(buildRequest({ artStyle: 'anime-90s' }))
    expect(fallback.negativeStyleTerms).toEqual([])
    expect(fallback.textureAndGrade).toContain('anime-90s')
  })

  it('still produces a usable look when no scene has direction', () => {
    const fallback = buildFallbackProjectLookbook(
      buildRequest({ scenes: summarizeScenesForLookbook([{ heading: 'INT. ROOM - DAY' }]) })
    )
    expect(fallback.colorPalette).toBeTruthy()
    expect(fallback.lightingGrammar).toBeTruthy()
    expect(fallback.lensAndFormat).toBeTruthy()
  })
})

describe('buildLookbookUserPrompt', () => {
  it('lists every scene so the look must serve the whole film', () => {
    const prompt = buildLookbookUserPrompt(buildRequest())
    expect(prompt).toContain('SCENES (2 total')
    expect(prompt).toContain('INT. DINER - NIGHT')
    expect(prompt).toContain('EXT. PARKING LOT - NIGHT')
    expect(prompt).toContain('Logline: A waitress covers for the wrong brother.')
  })

  it('marks the authored visual style as authoritative', () => {
    const prompt = buildLookbookUserPrompt(
      buildRequest({
        filmContext: { ...buildRequest().filmContext, visualStyle: 'grainy 16mm naturalism' },
      })
    )
    expect(prompt).toMatch(/visual style \(authoritative[^)]*\): grainy 16mm naturalism/i)
  })
})

describe('formatLookbookStyleAnchor', () => {
  it('emits a GLOBAL STYLE ANCHOR that parseStillPromptSource lifts into STYLE', () => {
    const anchor = formatLookbookStyleAnchor(lookbook)
    expect(anchor.startsWith('[GLOBAL STYLE ANCHOR]')).toBe(true)

    const still = assembleStructuredStillPrompt({
      actionOrStructured: `${anchor}\n\n[SCENE COMPOSITION & BEAT]\nAction/Framing: Wide shot of person [1] in the booth.`,
      refs: [{ kind: 'person', token: 'person [1]', name: 'Mara', roleLabel: 'identity' }],
    })

    expect(still).toContain('[STYLE]')
    const style = still.split('[STYLE]')[1].split('[EXCLUSIONS]')[0]
    expect(style).toContain('grainy 16mm-inspired neo-noir naturalism')
    expect(style).toContain('single motivated practical key')
    expect(style).toContain('sodium orange highlights')
    expect(still).toContain('Action/Framing: Wide shot of person [1] in the booth.')
  })

  it('folds in per-beat lighting and lens without replacing the film grammar', () => {
    const anchor = formatLookbookStyleAnchor(lookbook, {
      beatLighting: 'key raked across the table edge',
      beatLens: '85mm',
    })
    expect(anchor).toContain('single motivated practical key')
    expect(anchor).toContain('key raked across the table edge')
    expect(anchor).toContain('40mm spherical')
    expect(anchor).toContain('85mm')
  })

  it("includes the scene's sanctioned departure from the master look", () => {
    const anchor = formatLookbookStyleAnchor(lookbook, {
      sceneLookNote: getSceneLookNote(lookbook, 1),
    })
    expect(anchor).toContain('Scene look: rain haze lifts contrast a stop')
  })

  it('appends the code-owned realism anchor only when the master style lacks one', () => {
    const withoutPhotoreal = formatLookbookStyleAnchor(lookbook, {
      artStyleAnchor: 'live-action film still, photographed on real camera',
    })
    expect(withoutPhotoreal).toContain('photographed on real camera')

    const alreadyPhotoreal = formatLookbookStyleAnchor(
      { ...lookbook, masterStyle: 'live-action photoreal neo-noir' },
      { artStyleAnchor: 'live-action film still, photographed on real camera' }
    )
    expect(alreadyPhotoreal).not.toContain('photographed on real camera')
  })
})

describe('formatLookbookForPlannerPrompt', () => {
  it('presents the look as authoritative and lists suppressed styles', () => {
    const block = formatLookbookForPlannerPrompt(lookbook, 'rain haze lifts contrast a stop')
    expect(block).toMatch(/PROJECT LOOKBOOK \(authoritative/)
    expect(block).toContain('Master Style: grainy 16mm-inspired neo-noir naturalism')
    expect(block).toContain("This scene's departure: rain haze lifts contrast a stop")
    expect(block).toContain('Never render as: illustration, cartoon')
  })
})

describe('composeBeatStillPrompt', () => {
  it('leaves the action text alone when there is no lookbook', () => {
    expect(
      composeBeatStillPrompt({ actionFraming: 'Wide shot of the booth.', sceneIndex: 0 })
    ).toBe('Wide shot of the booth.')
  })

  it('wraps action in the style anchor and picks up the scene look note', () => {
    const prompt = composeBeatStillPrompt({
      actionFraming: 'Wide shot of the lot.',
      lookbook,
      sceneIndex: 1,
      lighting: 'sodium wash from frame left',
    })
    expect(prompt).toContain('[GLOBAL STYLE ANCHOR]')
    expect(prompt).toContain('Scene look: rain haze lifts contrast a stop')
    expect(prompt).toContain('sodium wash from frame left')
    expect(prompt).toContain('[SCENE COMPOSITION & BEAT]\nAction/Framing: Wide shot of the lot.')
  })

  it('keeps style prose out of the action text a caller parses back out', () => {
    const prompt = composeBeatStillPrompt({
      actionFraming: 'Wide shot of the lot.',
      lookbook,
      sceneIndex: 0,
    })
    expect(parseStillPromptSource(prompt).actionFraming).toBe('Wide shot of the lot.')
  })
})

describe('deriveProjectLookbook', () => {
  it('uses the AI look and stamps the source fingerprint', async () => {
    generateText.mockResolvedValue({
      text: JSON.stringify({
        masterStyle: 'handheld sodium-lit neo-noir',
        colorPalette: 'orange and cyan, desaturated mids',
        lightingGrammar: 'one practical key, no fill, hard falloff',
        lensAndFormat: '40mm, medium depth of field',
        textureAndGrade: 'heavy grain, crushed blacks',
        negativeStyleTerms: ['anime'],
        sceneLooks: [{ sceneIndex: 1, lookNote: 'rain haze' }],
      }),
    })

    const request = buildRequest()
    const result = await deriveProjectLookbook(request)

    expect(result.usedAI).toBe(true)
    expect(result.masterStyle).toBe('handheld sodium-lit neo-noir')
    expect(result.fingerprint).toBe(fingerprintLookbookSource(request))
    expect(result.sceneLooks).toEqual([{ sceneIndex: 1, lookNote: 'rain haze' }])
  })

  it('strips markdown fences around the JSON', async () => {
    generateText.mockResolvedValue({
      text: '```json\n{"masterStyle":"sodium-lit neo-noir","colorPalette":"orange, cyan","lightingGrammar":"one key, no fill"}\n```',
    })
    const result = await deriveProjectLookbook(buildRequest())
    expect(result.masterStyle).toBe('sodium-lit neo-noir')
  })

  it('backfills lens and grade from the deterministic look when the model omits them', async () => {
    generateText.mockResolvedValue({
      text: JSON.stringify({
        masterStyle: 'sodium-lit neo-noir naturalism',
        colorPalette: 'orange, cyan',
        lightingGrammar: 'one key, no fill',
      }),
    })
    const result = await deriveProjectLookbook(buildRequest())
    expect(result.lensAndFormat).toContain('Standard (40mm)')
    expect(result.textureAndGrade).toContain('grain')
    expect(result.negativeStyleTerms).toContain('cartoon')
  })

  it('drops scene looks that point outside the script', async () => {
    generateText.mockResolvedValue({
      text: JSON.stringify({
        masterStyle: 'sodium-lit neo-noir naturalism',
        colorPalette: 'orange, cyan',
        lightingGrammar: 'one key, no fill',
        sceneLooks: [
          { sceneIndex: 0, lookNote: 'valid' },
          { sceneIndex: 99, lookNote: 'out of range' },
          { sceneIndex: 1, lookNote: '   ' },
        ],
      }),
    })
    const result = await deriveProjectLookbook(buildRequest())
    expect(result.sceneLooks).toEqual([{ sceneIndex: 0, lookNote: 'valid' }])
  })

  it('falls back deterministically on an incomplete look', async () => {
    generateText.mockResolvedValue({ text: JSON.stringify({ masterStyle: 'noir' }) })
    const result = await deriveProjectLookbook(buildRequest())
    expect(result.usedAI).toBe(false)
    expect(result.masterStyle).toContain('neo-noir')
  })

  it('falls back deterministically when Gemini throws', async () => {
    generateText.mockRejectedValue(new Error('RESOURCE_EXHAUSTED'))
    const result = await deriveProjectLookbook(buildRequest())
    expect(result.usedAI).toBe(false)
    expect(result.lightingGrammar).toContain('Low-key, single-source')
  })
})

describe('ensureProjectLookbook', () => {
  function mockAiLook(masterStyle: string) {
    generateText.mockResolvedValue({
      text: JSON.stringify({
        masterStyle,
        colorPalette: 'orange, cyan',
        lightingGrammar: 'one key, no fill',
      }),
    })
  }

  it('derives once and reuses the module cache for the same inputs', async () => {
    mockAiLook('sodium-lit neo-noir naturalism')

    const first = await ensureProjectLookbook(buildProject())
    const second = await ensureProjectLookbook(buildProject())

    expect(generateText).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('reuses a persisted look without calling Gemini at all', async () => {
    mockAiLook('sodium-lit neo-noir naturalism')
    const derived = await ensureProjectLookbook(buildProject())
    expect(derived).toBeDefined()

    __clearProjectLookbookCacheForTests()
    generateText.mockReset()

    const project = buildProject({ lookbook: derived })
    const reused = await ensureProjectLookbook(project)

    expect(generateText).not.toHaveBeenCalled()
    expect(reused).toEqual(derived)
  })

  it('re-derives when the script changes under a persisted look', async () => {
    mockAiLook('sodium-lit neo-noir naturalism')
    const stale = await ensureProjectLookbook(buildProject())
    __clearProjectLookbookCacheForTests()
    generateText.mockClear()

    mockAiLook('flat high-key naturalism')
    const project = buildProject({ lookbook: stale })
    project.metadata.visionPhase.script = {
      scenes: [...scenes, { heading: 'INT. MOTEL - DAWN', action: 'Mara does not sleep.' }],
    }

    const refreshed = await ensureProjectLookbook(project)
    expect(generateText).toHaveBeenCalledTimes(1)
    expect(refreshed?.masterStyle).toBe('flat high-key naturalism')
    expect(refreshed?.fingerprint).not.toBe(stale?.fingerprint)
  })

  it('ignores a persisted look written by an older version', async () => {
    mockAiLook('sodium-lit neo-noir naturalism')
    const project = buildProject({
      lookbook: { ...lookbook, version: PROJECT_LOOKBOOK_VERSION - 1 },
    })
    const result = await ensureProjectLookbook(project)
    expect(generateText).toHaveBeenCalledTimes(1)
    expect(result?.version).toBe(PROJECT_LOOKBOOK_VERSION)
  })

  it('returns undefined when the project has no scenes to derive a look from', async () => {
    const project = buildProject()
    project.metadata.visionPhase.script = { scenes: [] }
    expect(await ensureProjectLookbook(project)).toBeUndefined()
    expect(generateText).not.toHaveBeenCalled()
  })
})
