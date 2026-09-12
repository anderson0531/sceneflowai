import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assembleStructuredStillPrompt,
  STILL_SECTION_REFERENCES,
  STILL_SECTION_TASK,
  STILL_SECTION_STILL,
  STILL_SECTION_STYLE,
  STILL_SECTION_EXCLUSIONS,
  STILL_PURPOSE_LINE,
  STILL_TASK_LINES,
  stillRefsFromAttachedImages,
  bindLibraryNamesToTokens,
  replaceLibraryNamesWithTokens,
  actionFramingFromStoredPrompt,
  isStructuredStillPrompt,
  promptReferencesLibraryItem,
  resolveLibraryItemPromptMatch,
  dropDuplicateHeadNounMatches,
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
  composeBeatStillPrompt,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import { PROJECT_LOOKBOOK_VERSION } from '@/lib/intelligence/project-lookbook-fallback'
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
    expect(prompt).not.toMatch(/Subjects absorbed in the action[^\n]*\[GLOBAL STYLE ANCHOR\]/)
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
      /Subjects absorbed in the action[^\n]*\[GLOBAL STYLE ANCHOR\]/
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

  it('gives a lookbook-anchored beat prompt a [STYLE] section beyond the realism anchor', () => {
    const beatPrompt = composeBeatStillPrompt({
      actionFraming: 'Medium shot: person [1] sets the journal on the bench.',
      sceneIndex: 0,
      lookbook: {
        version: PROJECT_LOOKBOOK_VERSION,
        fingerprint: 'cccc3333',
        masterStyle: 'Rain-slick neo-noir, live-action photoreal',
        colorPalette: 'Sodium orange against slate blue',
        lightingGrammar: 'Single hard key from a practical, deep falloff',
        lensAndFormat: 'Anamorphic 40mm, 2.39:1',
        textureAndGrade: '35mm grain, crushed blacks',
        negativeStyleTerms: ['illustration'],
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    })

    const prompt = assembleStructuredStillPrompt({
      actionOrStructured: beatPrompt,
      refs: [{ kind: 'person', token: 'person [1]', name: 'Vesper Vale', roleLabel: 'identity' }],
      photorealisticAnchor: 'live-action film still, photographed on real camera',
      includeCandid: true,
    })

    const style = prompt.split(STILL_SECTION_STYLE)[1]?.split('\n[')[0] ?? ''
    expect(style).toContain('Rain-slick neo-noir')
    expect(style).toContain('Single hard key from a practical')
    expect(style).toContain('Anamorphic 40mm')
    expect(style).toContain('Sodium orange against slate blue')
    // The action stays in [STILL]; the look never leaks back into it.
    const still = prompt.split(STILL_SECTION_STILL)[1]?.split(STILL_SECTION_STYLE)[0] ?? ''
    expect(still).toContain('sets the journal on the bench')
    expect(still).not.toContain('Anamorphic 40mm')
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
    expect(video.prompt).not.toContain('[TASK]')
    expect(video.prompt).not.toContain('[GLOBAL STYLE ANCHOR]')
    expect(video.prompt).not.toContain('[REFERENCES]')
    // The still's single-instant rule is the one thing motion must not inherit.
    expect(video.prompt).not.toContain('single instant')
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

  it('binds a first-name alias when only one cast member owns it', () => {
    const text = replaceLibraryNamesWithTokens(
      'Piper turns as Gideon lifts the spanner.',
      [
        { kind: 'person', token: 'person [1]', name: 'Piper Hayes', roleLabel: 'identity' },
        {
          kind: 'person',
          token: 'person [2]',
          name: 'Professor Gideon Croft',
          roleLabel: 'identity',
        },
      ]
    )
    expect(text).toBe('person [1] turns as person [2] lifts the spanner.')
  })

  it('leaves a first name alone when two cast members share it', () => {
    const text = replaceLibraryNamesWithTokens('Gideon watches Gideon.', [
      { kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' },
      { kind: 'person', token: 'person [2]', name: 'Gideon Hayes', roleLabel: 'identity' },
    ])
    expect(text).toBe('Gideon watches Gideon.')
  })
})

describe('every [REFERENCES] token reaches the instruction body', () => {
  // The reported prompt: one cylinder in the beat, three cylinder props and a
  // location in the legend, and not one of those tokens in the action text.
  const cylinderRefs = [
    { kind: 'person' as const, token: 'person [1]', name: 'Piper Hayes', roleLabel: 'identity' },
    {
      kind: 'location' as const,
      token: 'location [3]',
      name: 'FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS',
      roleLabel: 'library location',
    },
    { kind: 'prop' as const, token: 'prop [4]', name: 'Brass cylinder', roleLabel: 'library prop' },
    {
      kind: 'prop' as const,
      token: 'prop [5]',
      name: 'Machined brass cylinder',
      roleLabel: 'library prop',
    },
    {
      kind: 'prop' as const,
      token: 'prop [6]',
      name: 'Olive-drab aluminum cylinder',
      roleLabel: 'library prop',
    },
  ]

  it('binds a prop the frame names its own way, on a modifier only it owns', () => {
    const text = replaceLibraryNamesWithTokens(
      'person [1] shields the Olive-drab dispatch cylinder against her chest.',
      cylinderRefs
    )

    expect(text).toBe('person [1] shields the prop [6] against her chest.')
  })

  it('leaves a modifier two props share unbound rather than guessing', () => {
    const text = replaceLibraryNamesWithTokens(
      'person [1] shields the brass dispatch cylinder against her chest.',
      cylinderRefs
    )

    expect(text).toContain('brass dispatch cylinder')
    expect(text).not.toContain('prop [4]')
    expect(text).not.toContain('prop [5]')
  })

  it('states the refs the action never uses, so the legend instructs something', () => {
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured:
        'Wide shot. person [1] sprawled across the damp flagstone floor, shielding prop [6].',
      refs: cylinderRefs,
      includeCandid: true,
    })

    const still = prompt.split(STILL_SECTION_STILL)[1]?.split(STILL_SECTION_STYLE)[0] ?? prompt
    expect(still).toContain('Also in frame: location [3], prop [4], prop [5]')
    expect(still).toMatch(/match each to its reference image\./)
    // prop [6] is already placed by the action, so it is not restated.
    expect(still).not.toMatch(/Also in frame:[^\n]*prop \[6\]/)
  })

  it('says nothing extra when the action already places every ref', () => {
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured: 'person [1] raises prop [7] inside location [3].',
      refs: [
        { kind: 'person', token: 'person [1]', name: 'Piper Hayes', roleLabel: 'identity' },
        { kind: 'prop', token: 'prop [7]', name: 'Iron Rail Spanner', roleLabel: 'library prop' },
        { kind: 'location', token: 'location [3]', name: 'Tunnel Vault', roleLabel: 'library location' },
      ],
    })

    expect(prompt).not.toContain('Also in frame:')
  })

  it('does not read its own in-frame line back as beat action', () => {
    const assembleWith = (source: string) =>
      assembleStructuredStillPrompt({
        actionOrStructured: source,
        refs: cylinderRefs,
        includeCandid: true,
      })

    const first = assembleWith('person [1] sprawled across the flagstone floor.')
    expect(first).toContain('Also in frame:')
    expect(assembleWith(first)).toBe(first)
    expect(first.match(/Also in frame:/g)).toHaveLength(1)
    expect(actionFramingFromStoredPrompt(first)).toBe(
      'person [1] sprawled across the flagstone floor.'
    )
  })
})

describe('dropDuplicateHeadNounMatches', () => {
  const cylinders = [
    { name: 'Brass cylinder' },
    { name: 'Machined brass cylinder' },
    { name: 'Olive-drab aluminum cylinder' },
  ]
  const headNoun = { matched: true as const, basis: 'head-noun' as const, matchedTerm: 'cylinder' }

  it('keeps the one label the frame names most closely', () => {
    const { kept, dropped } = dropDuplicateHeadNounMatches(
      'person [1] shields the olive-drab dispatch cylinder.',
      cylinders.map((item) => ({ item, match: headNoun }))
    )

    expect(kept).toEqual([{ name: 'Olive-drab aluminum cylinder' }])
    expect(dropped.map((entry) => entry.item.name)).toEqual([
      'Brass cylinder',
      'Machined brass cylinder',
    ])
  })

  it('keeps exactly one design when the prose cannot tell them apart', () => {
    const { kept } = dropDuplicateHeadNounMatches(
      'person [1] shields the cylinder.',
      cylinders.map((item) => ({ item, match: headNoun }))
    )

    expect(kept).toEqual([{ name: 'Brass cylinder' }])
  })

  it('never thins props the frame named in full', () => {
    const byName = { matched: true as const, basis: 'name' as const }
    const { kept, dropped } = dropDuplicateHeadNounMatches(
      'person [1] sets the Brass cylinder beside the Machined brass cylinder.',
      [
        { item: cylinders[0], match: byName },
        { item: cylinders[1], match: byName },
      ]
    )

    expect(kept).toHaveLength(2)
    expect(dropped).toHaveLength(0)
  })
})

describe('still prompt round-trips without consuming itself', () => {
  const refs = [
    { kind: 'person' as const, token: 'person [1]', name: 'Piper Hayes', roleLabel: 'identity' },
    {
      kind: 'prop' as const,
      token: 'prop [7]',
      name: 'Thirty-Inch Iron Rail Spanner',
      roleLabel: 'library prop',
    },
  ]

  const assemble = (source: string) =>
    assembleStructuredStillPrompt({
      actionOrStructured: source,
      refs,
      photorealisticAnchor: 'live-action film still, photographed on real camera',
      includeCandid: true,
    })

  it('is stable when an assembled still is re-assembled three times', () => {
    const first = assemble('Medium shot: person [1] raises prop [7] toward the hatch collar.')
    const second = assemble(first)
    const third = assemble(second)

    expect(second).toBe(first)
    expect(third).toBe(first)
    expect(first.match(/Action\/Framing:/g)).toHaveLength(1)
    expect(first.match(/Not a video start frame/g)).toHaveLength(1)
    expect(first.match(/Subjects absorbed in the action/g)).toHaveLength(1)
    expect(first.match(/Produce one photograph of a single instant/g)).toHaveLength(1)
  })

  it('keeps [TASK] ahead of the beat text it governs', () => {
    const prompt = assemble('person [1] raises prop [7] toward the hatch collar.')

    expect(prompt).toContain(STILL_SECTION_TASK)
    expect(prompt.indexOf(STILL_SECTION_REFERENCES)).toBeLessThan(
      prompt.indexOf(STILL_SECTION_TASK)
    )
    expect(prompt.indexOf(STILL_SECTION_TASK)).toBeLessThan(prompt.indexOf(STILL_SECTION_STILL))
    for (const line of STILL_TASK_LINES) {
      expect(prompt).toContain(line)
    }
  })

  it('reads a stored prompt written with the old candid wording back as action', () => {
    const stored = `[REFERENCES]
person [1] = Piper Hayes — identity

[STILL]
${STILL_PURPOSE_LINE}
Subjects caught mid-action, unaware of the camera — no posing, no lens eye-contact, no headshot or turnaround framing.
Action/Framing: person [1] raises prop [7] toward the hatch collar.`

    expect(actionFramingFromStoredPrompt(stored)).toBe(
      'person [1] raises prop [7] toward the hatch collar.'
    )
    expect(assemble(stored)).not.toContain('caught mid-action')
  })

  it('recovers the beat action from an assembled still', () => {
    expect(actionFramingFromStoredPrompt(assemble('person [1] raises prop [7].'))).toBe(
      'person [1] raises prop [7].'
    )
  })

  it('repairs a prompt that already swallowed its own boilerplate', () => {
    // Reported prompt: one Action/Framing wrapper per regeneration, each
    // wrapping the purpose and candid lines this module re-emits.
    const corrupted = `[REFERENCES]
person [1] = Piper Hayes — identity
prop [7] = Thirty-Inch Iron Rail Spanner — library prop

[STILL]
${STILL_PURPOSE_LINE}
Subjects caught mid-action, unaware of the camera — no posing, no lens eye-contact, no headshot or turnaround framing.
Action/Framing: ${STILL_PURPOSE_LINE} Subjects caught mid-action, unaware of the camera — no posing, no lens eye-contact, no headshot or turnaround framing. Action/Framing: ${STILL_PURPOSE_LINE} Subjects caught mid-action, unaware of the camera — no posing, no lens eye-contact, no headshot or turnaround framing. Action/Framing: Brass pneumatic hatch collar flanked by three rusted locking dogs. Facial expression: Violent paranoia shifting to desperate realization.

[STYLE]
live-action film still, photographed on real camera`

    const recovered = actionFramingFromStoredPrompt(corrupted)
    expect(recovered).toBe(
      'Brass pneumatic hatch collar flanked by three rusted locking dogs. Facial expression: Violent paranoia shifting to desperate realization.'
    )

    const repaired = assemble(corrupted)
    expect(repaired.match(/Action\/Framing:/g)).toHaveLength(1)
    expect(repaired.match(/Not a video start frame/g)).toHaveLength(1)
    expect(repaired).toContain('Facial expression: Violent paranoia')
    expect(assemble(repaired)).toBe(repaired)
  })
})

describe('promptReferencesLibraryItem', () => {
  const prompt = 'Action/Framing: person [1] sets prop [7] on the bench.'

  it('accepts a prop bound to a token the prompt uses', () => {
    expect(
      promptReferencesLibraryItem(prompt, {
        name: 'Thirty-Inch Iron Rail Spanner',
        promptToken: 'prop [7]',
      })
    ).toBe(true)
  })

  it('accepts a prop the prompt still names in full', () => {
    expect(
      promptReferencesLibraryItem('Piper sets the Violet Ink Drafting Vellum down.', {
        name: 'Violet Ink Drafting Vellum',
        promptToken: 'prop [6]',
      })
    ).toBe(true)
  })

  it('rejects a prop the prompt never places', () => {
    expect(
      promptReferencesLibraryItem(prompt, {
        name: 'Violet Ink Drafting Vellum',
        promptToken: 'prop [6]',
      })
    ).toBe(false)
  })

  it('keeps a prop the frame names the way a script would', () => {
    const match = resolveLibraryItemPromptMatch('Piper swings the spanner at the dogs.', {
      name: 'Thirty-Inch Iron Rail Spanner',
      promptToken: 'prop [7]',
    })

    expect(match).toEqual({ matched: true, basis: 'head-noun', matchedTerm: 'spanner' })
  })

  it('still rejects a prop the frame only shares decoration with', () => {
    expect(
      resolveLibraryItemPromptMatch('Piper braces against the iron rail.', {
        name: 'Thirty-Inch Iron Rail Spanner',
        promptToken: 'prop [7]',
      })
    ).toEqual({ matched: false, basis: 'none' })
  })

  it('reports the basis a token or full label matched on', () => {
    expect(
      resolveLibraryItemPromptMatch(prompt, {
        name: 'Thirty-Inch Iron Rail Spanner',
        promptToken: 'prop [7]',
      }).basis
    ).toBe('token')
    expect(
      resolveLibraryItemPromptMatch('Piper sets the Violet Ink Drafting Vellum down.', {
        name: 'Violet Ink Drafting Vellum',
      }).basis
    ).toBe('name')
  })

  it('the beat frame route drops unnamed prop refs before it builds the image list', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'),
      'utf8'
    )
    const dropsUnnamed = src.indexOf('resolveLibraryItemPromptMatch(optimizedPrompt')
    const buildsImages = src.indexOf('const objectImageReferences =')
    expect(dropsUnnamed).toBeGreaterThan(-1)
    expect(buildsImages).toBeGreaterThan(dropsUnnamed)
    // The basis is logged, so a kept or dropped reference can be explained
    // from a production log without re-deriving the match.
    expect(src).toMatch(/frame names it by \$\{match\.basis\}/)
  })
})

describe('isStructuredStillPrompt', () => {
  it('recognizes a lookbook-composed beat prompt', () => {
    const composed = composeBeatStillPrompt({
      actionFraming: 'Medium shot: Gideon Croft at the zinc workbench, palm on the drum.',
      lookbook: {
        version: PROJECT_LOOKBOOK_VERSION,
        fingerprint: 'deadbeef',
        masterStyle: 'Rain-slick neo-noir, live-action photoreal',
        colorPalette: 'Sodium orange against slate blue',
        lightingGrammar: 'Single hard key from a practical, deep falloff',
        lensAndFormat: 'Anamorphic 40mm, 2.39:1',
        textureAndGrade: '35mm grain, crushed blacks',
        negativeStyleTerms: ['illustration'],
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
      sceneIndex: 0,
    })

    expect(isStructuredStillPrompt(composed)).toBe(true)
  })

  it('recognizes an already-assembled still, so a regeneration is not re-flattened', () => {
    const assembled = assembleStructuredStillPrompt({
      actionOrStructured: 'Medium shot: person [1] lifts the lantern.',
      refs: [{ kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' }],
    })

    expect(isStructuredStillPrompt(assembled)).toBe(true)
  })

  it('treats plain scene prose as unstructured, so the optimizer still shapes it', () => {
    expect(
      isStructuredStillPrompt('Gideon leans over the seismograph as the needle jumps.')
    ).toBe(false)
    expect(isStructuredStillPrompt('')).toBe(false)
  })

  it('rejects a style-only stub, which has nothing for assembly to work with', () => {
    expect(
      isStructuredStillPrompt(
        '[GLOBAL STYLE ANCHOR]\nMaster Style: narrative cinematography; live-action photoreal film still'
      )
    ).toBe(false)
  })

  it('the route hands structured custom prompts to assembly instead of the rules optimizer', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'),
      'utf8'
    )

    // The old gate looked for a phrase pair no code emits any more, so every
    // Express beat fell through to optimizePromptForImagen and lost its sections.
    expect(src).not.toMatch(/must\\s\+match\\s\+their\\s\+reference\\s\+image/)
    expect(src).not.toContain('\\\\s+appears`')
    expect(src).toMatch(/isStructuredStillPrompt\(promptBody\)/)

    const structuredBranch = src.indexOf('isStructuredStillPrompt(promptBody)')
    const reoptimize = src.indexOf('Added character references to user-edited prompt (re-optimized)')
    expect(structuredBranch).toBeGreaterThan(-1)
    expect(reoptimize).toBeGreaterThan(structuredBranch)
  })
})

describe('identity traits reach every reference-bearing frame', () => {
  const GIDEON_VISION =
    'A man in his early 50s with warm medium-brown skin, tightly curled salt-and-pepper hair ' +
    'cropped close, and a short grizzled beard.'

  const gideonRefs = (identityTraitsWordCap?: number) =>
    stillRefsFromAttachedImages({
      selected: [{ sendIndex: 1, characterName: 'Gideon Croft', refRole: 'identity' }],
      characterReferences: [
        {
          name: 'Gideon Croft',
          promptToken: 'person [1]',
          subjectOrdinal: 1,
          visionDescription: GIDEON_VISION,
        },
      ],
      ...(identityTraitsWordCap != null ? { identityTraitsWordCap } : {}),
    })

  it('the route leads a non-beat reference prompt with the legend', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'),
      'utf8'
    )

    // Dialogue, establishing, and custom frames used to fall through to the bare
    // optimized prompt, which names the subject only as `person [N]`.
    expect(src).not.toMatch(/\}\)\s*\n\s*:\s*remappedOptimizedPrompt/)
    expect(src).toMatch(
      /joinPromptBlocks\(formatStillReferencesLegend\(stillRefs\), remappedOptimizedPrompt\)/
    )
  })

  it('widens the legend clause when a likeness retry asks for it', () => {
    expect(gideonRefs()[0].identityTraits).toBe(
      'warm medium-brown skin, tightly curled salt-and-pepper hair, short grizzled beard, early 50s'
    )
    expect(gideonRefs(6)[0].identityTraits).toBe('warm medium-brown skin, short grizzled beard')
  })
})
