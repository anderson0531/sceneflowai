import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assembleStructuredStillPrompt,
  STILL_SECTION_REFERENCES,
  STILL_SECTION_STILL,
  STILL_SECTION_STYLE,
  STILL_SECTION_EXCLUSIONS,
  stillRefsFromAttachedImages,
  bindLibraryNamesToTokens,
} from '@/lib/imagen/structuredStillPrompt'
import {
  applySceneImageAiResultToPrompt,
} from '@/lib/scene/sceneImageAiPromptApply'
import {
  extractSceneStateFromAppearanceNotes,
  buildSceneAppearanceContinuityPromptSection,
} from '@/lib/scene/performanceCues'
import { compileBeatVideoPrompt } from '@/lib/scene/beatVideoPromptCompiler'
import {
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { SceneBeat } from '@/lib/script/segmentTypes'

describe('assembleStructuredStillPrompt', () => {
  it('binds a library prop name to prop [N] and lists it in [REFERENCES]', () => {
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured:
        'A medium-shot captures person [1] interposing Arthur Pendelton\'s 1893 Journal between person [2] and the cage.',
      refs: [
        { kind: 'person', token: 'person [1]', name: 'Vesper Vale', roleLabel: 'identity' },
        { kind: 'person', token: 'person [2]', name: 'Gideon Croft', roleLabel: 'identity' },
        {
          kind: 'prop',
          token: 'prop [3]',
          name: "Arthur Pendelton's 1893 Journal",
          roleLabel: 'library prop',
        },
      ],
      photorealisticAnchor: 'live-action film still, photographed on real camera',
      includeCandid: true,
    })

    expect(prompt).toContain(STILL_SECTION_REFERENCES)
    expect(prompt).toContain("prop [3] = Arthur Pendelton's 1893 Journal — library prop")
    expect(prompt).toContain('person [1] = Vesper Vale — identity')
    expect(prompt).toContain('interposing prop [3] between person [2]')
    expect(prompt).not.toContain("interposing Arthur Pendelton's 1893 Journal")
    expect(prompt).toContain(STILL_SECTION_STILL)
    expect(prompt).toMatch(/\n\[STILL\]\n/)
    expect(prompt).toContain('Not a video start frame')
    expect(prompt).not.toMatch(/Subjects caught mid-action[^\n]*\[GLOBAL STYLE ANCHOR\]/)
    expect(prompt).not.toMatch(/title beats\)\.\s*live-action/)
    expect(prompt).toContain(STILL_SECTION_STYLE)
    expect(prompt).toContain(STILL_SECTION_EXCLUSIONS)
  })

  it('does not glue candid prefix onto structured intelligence headers', () => {
    const mashed = assembleStructuredStillPrompt({
      actionOrStructured: `[GLOBAL STYLE ANCHOR]
Master Style: photorealistic cinematic film still
Lighting & Camera: Low-Key night

[SCENE COMPOSITION & BEAT]
Action/Framing: person [1] holds the journal.

[EXCLUSIONS & BOUNDARIES]
Strictly Avoid: Mannequin geometry.`,
      refs: [
        { kind: 'person', token: 'person [1]', name: 'Vesper Vale', roleLabel: 'identity' },
      ],
      includeCandid: true,
    })

    expect(mashed).toContain('\n[STILL]\n')
    expect(mashed.indexOf('[STILL]')).toBeLessThan(mashed.indexOf('Action/Framing:'))
    expect(mashed).not.toMatch(/performing the following moment in-scene[^\n]*\[GLOBAL STYLE ANCHOR\]/)
    expect(mashed).toContain('Master Style: photorealistic cinematic film still')
  })

  it('stillRefsFromAttachedImages uses send indices for props and locations', () => {
    const refs = stillRefsFromAttachedImages({
      selected: [
        {
          sendIndex: 1,
          characterName: 'Vesper Vale',
          refRole: 'identity',
        },
        {
          sendIndex: 3,
          propName: "Arthur Pendelton's 1893 Journal",
        },
        {
          sendIndex: 4,
          locationName: 'Faraday cage workshop',
          role: 'location',
        },
      ],
      characterReferences: [
        { name: 'Vesper Vale', promptToken: 'person [1]', subjectOrdinal: 1 },
      ],
    })

    expect(refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ token: 'person [1]', name: 'Vesper Vale' }),
        expect.objectContaining({
          token: 'prop [3]',
          name: "Arthur Pendelton's 1893 Journal",
        }),
        expect.objectContaining({
          token: 'location [4]',
          name: 'Faraday cage workshop',
        }),
      ])
    )
  })
})

describe('applySceneImageAiResultToPrompt', () => {
  it('does not prefix candid constraint onto structured intelligence prompts', () => {
    const result = applySceneImageAiResultToPrompt({
      aiResult: {
        usedAI: true,
        prompt: `[GLOBAL STYLE ANCHOR]
Master Style: photorealistic

[SCENE COMPOSITION & BEAT]
Action/Framing: person [1] grabs the file.`,
        reasoning: 'test',
      },
      characterReferences: [
        {
          name: 'Elara Vance',
          promptToken: 'person [1]',
          identityReferenceId: 1,
        },
      ],
      fullSceneContext: 'Elara grabs the file.',
      autoDetectObjects: false,
      autoDetectLocations: false,
      projectObjectRefs: [],
      projectLocationRefs: [],
      detectedObjectReferences: [],
      matchedLocationReference: null,
    })

    expect(result.optimizedPrompt).toContain('[GLOBAL STYLE ANCHOR]')
    expect(result.optimizedPrompt).not.toMatch(
      /Subjects caught mid-action[^\n]*\[GLOBAL STYLE ANCHOR\]/
    )
    expect(result.optimizedPrompt).not.toContain('performing the following moment in-scene')
  })
})

describe('planner still vs video split', () => {
  it('planner system prompt is an animatic still, not an F2V start frame', () => {
    const system = buildPlannerSystemPrompt()
    expect(system).toMatch(/animatic/i)
    expect(system).not.toMatch(/F2V \(frame-to-video\) START frames/i)
    expect(system).toContain('Action/Framing ONLY')
  })

  it('planner user prompt includes the reference catalog', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'bt_0',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Vesper lifts the journal.',
      },
    ]
    const user = buildPlannerUserPrompt({
      scene: { heading: 'INT. LAB - NIGHT', action: 'Vesper lifts the journal.' },
      beats,
      sceneNumber: 2,
      referenceCatalog: {
        characterNames: ['Vesper Vale', 'Gideon Croft'],
        propNames: ["Arthur Pendelton's 1893 Journal"],
        locationNames: ['Faraday cage workshop'],
      },
    })
    expect(user).toContain("Arthur Pendelton's 1893 Journal")
    expect(user).toContain('Vesper Vale')
    expect(user).toContain('Faraday cage workshop')
    expect(user).toContain('REFERENCE LIBRARY')
    expect(user).toContain('not video motion')
  })

  it('video compiler stays motion-of-beat and does not use still sections', () => {
    const video = compileBeatVideoPrompt({
      beatId: 'bt_1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Sarah slams the door and runs down the hallway.',
    })
    expect(video.prompt.toLowerCase()).toContain('motion')
    expect(video.prompt).not.toContain('[STILL]')
    expect(video.prompt).not.toContain('[GLOBAL STYLE ANCHOR]')
    expect(video.prompt).not.toContain('[REFERENCES]')
  })

  it('beat-sequence planner source no longer treats stills as F2V start frames', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/intelligence/beat-sequence-planner-fallback.ts'),
      'utf8'
    )
    expect(src).not.toContain('F2V (frame-to-video) START frames')
    expect(src).not.toContain('Single frozen F2V start frame')
  })
})

describe('scene appearance continuity staging filter', () => {
  it('keeps a short injury mark and drops action-staging after as', () => {
    const scoped = extractSceneStateFromAppearanceNotes(
      'clutching a bullet wound in his shoulder as Vesper pulls him toward a narrow iron gate'
    )
    expect(scoped.toLowerCase()).toContain('wound')
    expect(scoped.toLowerCase()).not.toContain('iron gate')
    expect(scoped.toLowerCase()).not.toContain('vesper')
  })

  it('does not copy the same action sentence onto every character', () => {
    const leaked =
      'clutching a bullet wound in his shoulder as Vesper pulls him toward a narrow iron gate'
    const section = buildSceneAppearanceContinuityPromptSection([
      { name: 'Piper Hayes', continuity: leaked },
      { name: 'Professor Gideon Croft', continuity: leaked },
    ])
    expect(section).toBe('')
  })

  it('does not copy identical short injury notes onto multiple characters', () => {
    const wound = 'clutching a bullet wound in his shoulder'
    const section = buildSceneAppearanceContinuityPromptSection([
      { name: 'Piper Hayes', continuity: wound },
      { name: 'Professor Gideon Croft', continuity: wound },
    ])
    expect(section).toBe('')
  })
})

describe('bindLibraryNamesToTokens', () => {
  it('rewrites library prop names to prop tokens before intelligence', () => {
    const text = bindLibraryNamesToTokens(
      'Piper grips Arthur Pendelton\'s 1893 Journal between herself and Gideon.',
      [{ name: "Arthur Pendelton's 1893 Journal", promptToken: 'prop [1]' }]
    )
    expect(text).toContain('prop [1]')
    expect(text).not.toContain("Arthur Pendelton's 1893 Journal")
  })
})
