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
  PIP_REPRODUCTION_EXCLUSION_TERMS,
  STILL_TASK_LINES,
  STILL_TASK_INSERT_FRAMING_LINE,
  STILL_TASK_OBJECT_INSERT_LINE,
  STILL_TASK_FACE_CLOSE_UP_LINES,
  STILL_TASK_FACE_CLOSE_UP_IDENTITY_PLATE_LINES,
  PAIRED_IDENTITY_LANDMARK_PREFIX,
  STILL_TASK_LOCATION_NEARFIELD_LINE,
  STILL_TASK_LOCATION_ENVIRONMENT_LINE,
  STILL_TASK_MOUNTED_FIXTURE_LINE,
  STILL_TASK_PERSON_PROP_TOKEN_LINE,
  STILL_TASK_PROP_TOKEN_LINE,
  STILL_TASK_PRO_LEAD,
  STILL_TASK_PAIRED_PERSON_PROP_TOKEN_LINE,
  STILL_TASK_PAIRED_PROP_SCALE_LINE,
  STILL_TASK_PAIRED_PLATES_MANDATORY_LINE,
  stillTaskLines,
  stillRefsFromAttachedImages,
  stillRefsFromNamedLibrary,
  formatStillReferencesLegend,
  formatPersonReferenceLegendLine,
  bindLibraryNamesToTokens,
  replaceLibraryNamesWithTokens,
  bindMountedFixturesToLocationToken,
  actionFramingFromStoredPrompt,
  extractActionFramingBody,
  isStructuredStillPrompt,
  parseStillPromptSource,
  parseStillReferencesLegend,
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
  composePersistedBeatStillPrompt,
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
    expect(prompt).toContain('do not enlarge to fill the frame')
    expect(prompt).toContain('Held props keep the physical size described in [REFERENCES]')
    expect(prompt).toContain('person [1] (Vesper Vale) — matches its identity reference')
    expect(prompt).toContain('interposing prop [3] between person [2]')
    expect(prompt).not.toContain("interposing Arthur Pendelton's 1893 Journal")
    expect(prompt).toContain(STILL_SECTION_STILL)
    expect(prompt).toMatch(/\n\[STILL\]\n/)
    expect(prompt).toContain('Not a video start frame')
    expect(prompt).not.toMatch(/Subjects absorbed in the action[^\n]*\[GLOBAL STYLE ANCHOR\]/)
    expect(prompt).not.toMatch(/title beats\)\.\s*live-action/)
    expect(prompt).toContain(STILL_SECTION_STYLE)
    expect(prompt).toContain(STILL_SECTION_EXCLUSIONS)
    expect(prompt).not.toContain(STILL_TASK_PAIRED_PLATES_MANDATORY_LINE)
  })

  it('omits [REFERENCES] for Pro interleaved pairs and keeps role-stable tokens in TASK', () => {
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured:
        'A medium-shot captures person [1] resting a palm on the zinc workbench at location [1].',
      refs: [
        { kind: 'person', token: 'person [1]', name: 'Piper Hayes', roleLabel: 'identity' },
        {
          kind: 'prop',
          token: 'prop [1]',
          name: 'Zinc workbench',
          roleLabel: 'library prop',
        },
        {
          kind: 'location',
          token: 'location [1]',
          name: 'FREIGHT TUNNEL VAULT',
          roleLabel: 'library location',
        },
      ],
      photorealisticAnchor: 'live-action film still, photographed on real camera',
      includeCandid: true,
      shotType: 'medium shot',
      omitReferencesSection: true,
    })

    expect(prompt).toContain(`${STILL_SECTION_TASK}\n${STILL_TASK_PRO_LEAD}`)
    expect(prompt).toContain(STILL_TASK_PAIRED_PERSON_PROP_TOKEN_LINE)
    expect(prompt).toContain(STILL_TASK_PAIRED_PLATES_MANDATORY_LINE)
    expect(prompt).toContain(STILL_TASK_PAIRED_PROP_SCALE_LINE)
    expect(prompt).toContain(STILL_TASK_LOCATION_ENVIRONMENT_LINE)
    expect(prompt).toContain('Action/Framing:')
    expect(prompt).toContain('person [1]')
    expect(prompt).toContain('prop [1]')
    expect(prompt).toContain('location [1]')
    expect(prompt).not.toContain(STILL_SECTION_REFERENCES)
    expect(prompt).not.toContain('Every token listed in [REFERENCES]')
    expect(prompt).not.toContain('physical size described in [REFERENCES]')
    expect(prompt).not.toContain('prop [3]')
    expect(prompt).not.toContain('location [4]')
    expect(prompt).not.toContain('not a second wide subject')

    const replayed = assembleStructuredStillPrompt({
      actionOrStructured: prompt,
      refs: [
        { kind: 'person', token: 'person [1]', name: 'Piper Hayes', roleLabel: 'identity' },
        {
          kind: 'prop',
          token: 'prop [1]',
          name: 'Zinc workbench',
          roleLabel: 'library prop',
        },
        {
          kind: 'location',
          token: 'location [1]',
          name: 'FREIGHT TUNNEL VAULT',
          roleLabel: 'library location',
        },
      ],
      photorealisticAnchor: 'live-action film still, photographed on real camera',
      includeCandid: true,
      shotType: 'medium shot',
      omitReferencesSection: true,
    })
    expect(replayed).toBe(prompt)
    expect(actionFramingFromStoredPrompt(prompt)).not.toContain(
      STILL_TASK_PAIRED_PLATES_MANDATORY_LINE
    )
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
        expect.objectContaining({
          token: 'person [1]',
          name: 'Vesper Vale',
          identitySendIndex: 1,
        }),
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

  it('stillRefsFromAttachedImages keeps library tokens when preferLibraryPromptTokens is on', () => {
    const refs = stillRefsFromAttachedImages({
      selected: [
        {
          sendIndex: 1,
          characterName: 'Piper Hayes',
          refRole: 'identity',
        },
        {
          sendIndex: 3,
          propName: 'Zinc workbench',
          promptToken: 'prop [1]',
        },
        {
          sendIndex: 4,
          locationName: 'FREIGHT TUNNEL VAULT',
          role: 'location',
          promptToken: 'location [1]',
        },
      ],
      characterReferences: [
        { name: 'Piper Hayes', promptToken: 'person [1]', subjectOrdinal: 1 },
      ],
      preferLibraryPromptTokens: true,
    })

    expect(refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ token: 'person [1]', name: 'Piper Hayes' }),
        expect.objectContaining({ token: 'prop [1]', name: 'Zinc workbench' }),
        expect.objectContaining({ token: 'location [1]', name: 'FREIGHT TUNNEL VAULT' }),
      ])
    )
  })

  it('binds location and prop tokens to send index when the library token started at 1', () => {
    const refs = stillRefsFromAttachedImages({
      selected: [
        { sendIndex: 1, characterName: 'Piper Hayes', refRole: 'wardrobe-diptych' },
        { sendIndex: 2, characterName: 'Gideon Croft', refRole: 'wardrobe-diptych' },
        {
          sendIndex: 3,
          propName: 'Thirty-Inch Iron Rail Spanner',
          promptToken: 'prop [1]',
        },
        {
          sendIndex: 5,
          locationName: 'FREIGHT TUNNEL VAULT',
          role: 'location',
          promptToken: 'location [1]',
        },
      ],
      characterReferences: [
        { name: 'Piper Hayes', promptToken: 'person [1]', subjectOrdinal: 1 },
        { name: 'Gideon Croft', promptToken: 'person [2]', subjectOrdinal: 2 },
      ],
    })

    expect(refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ token: 'location [5]', name: 'FREIGHT TUNNEL VAULT' }),
        expect.objectContaining({ token: 'prop [3]' }),
      ])
    )
    expect(refs.find((ref) => ref.kind === 'location')?.token).not.toBe('location [1]')
  })

  it('locks prop scale in the legend and still parses tokens', () => {
    const refs = stillRefsFromAttachedImages({
      selected: [
        {
          sendIndex: 2,
          propName: 'Canister',
          propDescription: '12-inch stainless sample canister, handheld',
        },
      ],
      characterReferences: [],
    })
    const legend = formatStillReferencesLegend(refs)
    expect(legend).toContain('prop [2] = Canister — library prop')
    expect(legend).toContain('12-inch')
    expect(legend).toContain('do not enlarge to fill the frame')
    expect(parseStillReferencesLegend(legend)).toEqual([
      expect.objectContaining({
        kind: 'prop',
        token: 'prop [2]',
        name: 'Canister',
        roleLabel: 'library prop',
      }),
    ])
  })

  it('binds wardrobe send indices onto the person legend line', () => {
    const refs = stillRefsFromAttachedImages({
      selected: [
        { sendIndex: 1, characterName: 'Gideon Croft', refRole: 'identity' },
        { sendIndex: 2, characterName: 'Piper Hayes', refRole: 'identity' },
        { sendIndex: 3, characterName: 'Gideon Croft', refRole: 'wardrobe' },
        { sendIndex: 4, characterName: 'Piper Hayes', refRole: 'wardrobe' },
      ],
      characterReferences: [
        { name: 'Gideon Croft', promptToken: 'person [1]', subjectOrdinal: 1 },
        { name: 'Piper Hayes', promptToken: 'person [2]', subjectOrdinal: 2 },
      ],
    })

    const legend = formatStillReferencesLegend(refs)
    expect(legend).toContain(
      'person [1] (Gideon Croft) — matches Reference image 1 (Identity) and Reference image 3 (Wardrobe)'
    )
    expect(legend).toContain(
      'person [2] (Piper Hayes) — matches Reference image 2 (Identity) and Reference image 4 (Wardrobe)'
    )
  })

  it('keeps the identity send index when a PiP card is also attached', () => {
    const refs = stillRefsFromAttachedImages({
      selected: [
        { sendIndex: 1, characterName: 'Piper Hayes', refRole: 'identity' },
        { sendIndex: 2, characterName: 'Gideon Croft', refRole: 'identity' },
        { sendIndex: 3, characterName: 'Piper Hayes', refRole: 'wardrobe-diptych' },
        { sendIndex: 4, characterName: 'Gideon Croft', refRole: 'wardrobe-diptych' },
        {
          sendIndex: 5,
          propName: 'Thirty-Inch Iron Rail Spanner',
          promptToken: 'prop [1]',
        },
      ],
      characterReferences: [
        { name: 'Piper Hayes', promptToken: 'person [1]', subjectOrdinal: 1 },
        { name: 'Gideon Croft', promptToken: 'person [2]', subjectOrdinal: 2 },
      ],
    })

    const legend = formatStillReferencesLegend(refs)
    expect(legend).toContain(
      'person [1] (Piper Hayes) — matches Reference image 1 (Identity) and Reference image 3 (Wardrobe)'
    )
    expect(legend).toContain(
      'person [2] (Gideon Croft) — matches Reference image 2 (Identity) and Reference image 4 (Wardrobe)'
    )
    expect(legend).toContain('prop [5] = Thirty-Inch Iron Rail Spanner')
    expect(legend).not.toMatch(/LEFT|RIGHT|diptych|composite/i)
  })

  it('names a combined character slot without panel language', () => {
    const refs = stillRefsFromAttachedImages({
      selected: [
        { sendIndex: 1, characterName: 'Gideon Croft', refRole: 'wardrobe-diptych' },
        { sendIndex: 2, characterName: 'Piper Hayes', refRole: 'wardrobe-diptych' },
      ],
      characterReferences: [
        {
          name: 'Gideon Croft',
          promptToken: 'person [1]',
          subjectOrdinal: 1,
          wardrobeDescription: 'charcoal wool overcoat, scuffed boots',
        },
        { name: 'Piper Hayes', promptToken: 'person [2]', subjectOrdinal: 2 },
      ],
    })

    const legend = formatStillReferencesLegend(refs)
    expect(legend).toContain('person [1] (Gideon Croft) — matches Reference image 1')
    expect(legend).toContain('person [2] (Piper Hayes) — matches Reference image 2')
    expect(legend).not.toMatch(/charcoal wool overcoat|scuffed boots/i)
    expect(legend).not.toMatch(/\(Identity\)|\(Wardrobe\)/)
    expect(legend).not.toMatch(/LEFT|RIGHT|diptych|composite/i)
  })

  it('does not restate face or outfit prose when the person is bound to attached images', () => {
    expect(
      formatPersonReferenceLegendLine({
        kind: 'person',
        token: 'person [1]',
        name: 'Gideon Croft',
        roleLabel: 'identity',
        identityTraits: 'warm medium-brown skin, short grizzled beard, early 50s',
        wardrobeClause: 'charcoal wool overcoat, scuffed boots',
        identitySendIndex: 1,
        wardrobeSendIndex: 2,
      })
    ).toBe(
      'person [1] (Gideon Croft) — matches Reference image 1 (Identity) and Reference image 2 (Wardrobe)'
    )
  })

  it('does not ask for cartoon animatic aesthetics or negative limb priming', () => {
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured: 'person [1] stands in the vault.',
      refs: [{ kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' }],
    })
    expect(prompt).toContain('Cinematic live-action film still')
    expect(prompt).toContain('photographed on 35mm')
    expect(prompt).toContain('Unbroken single-camera frame')
    expect(prompt).toContain('unified 16:9 cinematic perspective')
    expect(prompt).toContain('seamless single-layer optical exposure')
    expect(prompt).toContain('anatomically distinct silhouettes')
    expect(prompt).not.toContain('Frozen animatic')
    expect(prompt).not.toMatch(/Never duplicate, blur, streak or repeat a limb/)
    const stillBody = prompt.split('[EXCLUSIONS]')[0] ?? prompt
    expect(stillBody.toLowerCase()).not.toMatch(/split-screen|diptych|two-panel/)
    expect(stillBody.toLowerCase()).not.toMatch(/picture-in-picture|inset frame/)
    const exclusions = prompt.split('[EXCLUSIONS]')[1] ?? ''
    expect(exclusions.toLowerCase()).not.toMatch(/picture-in-picture/)
    expect(exclusions.toLowerCase()).not.toMatch(/circular frame/)
    expect(exclusions.toLowerCase()).not.toMatch(/split-screen output/)
    expect(exclusions.toLowerCase()).not.toMatch(/\bcollage\b/)
    for (const term of PIP_REPRODUCTION_EXCLUSION_TERMS) {
      if (term === 'pip') {
        expect(exclusions.toLowerCase()).not.toMatch(/\bpip\b/)
        continue
      }
      expect(exclusions.toLowerCase()).not.toContain(term)
    }
    expect(prompt).not.toContain('Continuous wide shot')
  })

  it('strips persisted PiP layout primes out of [EXCLUSIONS] on re-assembly', () => {
    const persisted = assembleStructuredStillPrompt({
      actionOrStructured:
        'person [1] stands in the vault.\n[EXCLUSIONS]\n' +
        'Strictly Avoid: Mannequin geometry, picture-in-picture, circular frame, collage.',
      refs: [{ kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' }],
    })
    const exclusions = persisted.split('[EXCLUSIONS]')[1] ?? ''
    expect(exclusions.toLowerCase()).not.toMatch(/picture-in-picture/)
    expect(exclusions.toLowerCase()).not.toMatch(/circular frame/)
    expect(exclusions.toLowerCase()).not.toMatch(/\bcollage\b/)
    expect(exclusions).toMatch(/Mannequin geometry/i)
  })

  it('adds continuous wide shot only for wide/establishing direction', () => {
    const wide = assembleStructuredStillPrompt({
      actionOrStructured: 'person [1] stands in the vault.',
      refs: [{ kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' }],
      shotType: 'wide shot',
    })
    expect(wide).toContain('Continuous wide shot')

    const close = assembleStructuredStillPrompt({
      actionOrStructured: 'person [1] stands in the vault.',
      refs: [{ kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' }],
      shotType: 'close-up',
    })
    expect(close).not.toContain('Continuous wide shot')
  })

  it('replaces full-body TASK anatomy with limb framing on insert shots', () => {
    const insert = assembleStructuredStillPrompt({
      actionOrStructured: 'Insert Shot. A hand holds prop [3].',
      refs: [
        { kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' },
        { kind: 'prop', token: 'prop [3]', name: '1893 Induction Manifold', roleLabel: 'library prop' },
      ],
      shotType: 'Insert Shot',
    })
    expect(insert).toContain(STILL_TASK_INSERT_FRAMING_LINE)
    expect(insert).not.toMatch(/two arms and two legs/)
    expect(stillTaskLines('Insert Shot')).toContain(STILL_TASK_INSERT_FRAMING_LINE)
    expect(stillTaskLines('Close-Up').join('\n')).not.toContain('two arms and two legs')
    expect(stillTaskLines('Close-Up').join('\n')).toContain(
      'visible face and upper body match the identity reference'
    )
    expect(stillTaskLines('Close-Up')).not.toContain(STILL_TASK_INSERT_FRAMING_LINE)
    expect(stillTaskLines('Two-Shot').join('\n')).toContain('two arms and two legs')
    expect(stillTaskLines('Two-Shot')).not.toContain(STILL_TASK_PAIRED_PLATES_MANDATORY_LINE)
    expect(STILL_TASK_LINES).not.toContain(STILL_TASK_PAIRED_PLATES_MANDATORY_LINE)
    expect(
      stillTaskLines('Two-Shot', {
        occupancyMode: 'paired',
        refs: [{ kind: 'person', token: 'person [1]', name: 'Piper Hayes', roleLabel: 'identity' }],
      })
    ).toContain(STILL_TASK_PAIRED_PLATES_MANDATORY_LINE)
    expect(stillTaskLines('Two-Shot', { occupancyMode: 'paired' })).toContain(
      STILL_TASK_PAIRED_PLATES_MANDATORY_LINE
    )
    expect(stillTaskLines('Two-Shot', { occupancyMode: 'paired', refs: [] })).not.toContain(
      STILL_TASK_PAIRED_PLATES_MANDATORY_LINE
    )
  })

  it('uses head-and-shoulders TASK on a face close-up and location as bokeh', () => {
    const close = assembleStructuredStillPrompt({
      actionOrStructured: 'Close-Up. person [1] stares at the needle.',
      refs: [
        { kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' },
        {
          kind: 'location',
          token: 'location [3]',
          name: 'TITLE SEQUENCE',
          roleLabel: 'library location',
        },
      ],
      shotType: 'Close-Up',
      includeCandid: true,
    })
    expect(close).not.toMatch(/two arms and two legs/)
    expect(close).toContain(STILL_TASK_FACE_CLOSE_UP_IDENTITY_PLATE_LINES[0])
    expect(close).toContain(STILL_TASK_FACE_CLOSE_UP_IDENTITY_PLATE_LINES[1])
    expect(close).not.toContain('identity card')
    expect(close).not.toContain(STILL_TASK_FACE_CLOSE_UP_LINES[0])
    expect(close).not.toContain(STILL_TASK_INSERT_FRAMING_LINE)
    expect(close).toContain('shallow-focus background bokeh')
    expect(close).not.toContain('Also in frame:')
    expect(close).toContain('no posing, no lens eye-contact, no turnaround framing')
    expect(close).not.toMatch(/no headshot or turnaround/)
  })

  it('keeps identity-card CU language when the person plate is a composite diptych', () => {
    const close = assembleStructuredStillPrompt({
      actionOrStructured: 'Close-Up. person [1] stares at the needle.',
      refs: [
        {
          kind: 'person',
          token: 'person [1]',
          name: 'Gideon Croft',
          roleLabel: 'character reference',
          isComposite: true,
        },
      ],
      shotType: 'Close-Up',
    })
    expect(close).toContain(STILL_TASK_FACE_CLOSE_UP_LINES[0])
    expect(close).toContain('identity card')
    expect(close).not.toContain(STILL_TASK_FACE_CLOSE_UP_IDENTITY_PLATE_LINES[0])
  })

  it('is stable when a Close-Up candid still is re-assembled', () => {
    const first = assembleStructuredStillPrompt({
      actionOrStructured: 'Close-Up. person [1] sits with his head bowed.',
      refs: [{ kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' }],
      shotType: 'Close-Up',
      includeCandid: true,
    })
    const second = assembleStructuredStillPrompt({
      actionOrStructured: first,
      refs: [{ kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' }],
      shotType: 'Close-Up',
      includeCandid: true,
    })
    expect(second).toBe(first)
    expect(first.match(/Action\/Framing:/g)).toHaveLength(1)
    expect(first.match(/Subjects absorbed in the action/g)).toHaveLength(1)
  })

  it('uses object-insert TASK occupancy on an empty-cast ECU and keeps location as near-field', () => {
    const refs = stillRefsFromNamedLibrary({
      props: [{ name: 'Brass pressure gauge', token: 'prop [2]' }],
      locations: [
        { name: 'FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS', token: 'location [1]' },
      ],
      castInFrame: [],
    })
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured:
        'Action/Framing: Extreme Close-Up. Pressure gauge needle pinned to the maximum. No people in frame.',
      refs,
      shotType: 'medium shot',
    })

    expect(prompt).toContain(STILL_SECTION_REFERENCES)
    expect(prompt).toContain('location [1] = FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS')
    expect(prompt).toContain('prop [2] = Brass pressure gauge')
    expect(prompt).toContain(STILL_TASK_OBJECT_INSERT_LINE)
    expect(prompt).toContain(STILL_TASK_LOCATION_NEARFIELD_LINE)
    expect(prompt).toContain(STILL_TASK_PROP_TOKEN_LINE)
    expect(prompt).not.toContain(STILL_TASK_INSERT_FRAMING_LINE)
    expect(prompt).not.toMatch(/two arms and two legs/)
    expect(prompt).not.toMatch(/Every token listed in \[REFERENCES\] appears/)
    expect(prompt).not.toMatch(/Gaze:/)
    expect(prompt).not.toContain('Also in frame:')
    expect(prompt).toContain('No people in frame')
    expect(prompt.match(/No people in frame/g)).toHaveLength(1)
    expect(prompt).toContain('near-field materials')
    expect(prompt).not.toContain('shallow-focus background bokeh')
  })

  it('recovers a previous [REFERENCES] legend when assemble is called without refs', () => {
    const stored = assembleStructuredStillPrompt({
      actionOrStructured: 'Extreme Close-Up. Pressure gauge needle pinned. No people in frame.',
      refs: [
        {
          kind: 'location',
          token: 'location [1]',
          name: 'FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS',
          roleLabel: 'library location',
        },
      ],
      shotType: 'Extreme Close-Up',
    })
    const replayed = assembleStructuredStillPrompt({
      actionOrStructured: stored,
      shotType: 'Extreme Close-Up',
    })

    expect(parseStillReferencesLegend(replayed)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'location',
          token: 'location [1]',
          name: 'FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS',
        }),
      ])
    )
    expect(replayed).toContain(STILL_SECTION_REFERENCES)
    expect(replayed).toContain('location [1]')
  })

  it('unions overlapping Strictly Avoid terms into one paragraph', () => {
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured: `Action/Framing: person [1] stands in the vault.

[EXCLUSIONS]
Strictly Avoid: Mannequin geometry, plastic skin, cartoon style, 3D render aesthetics, canvas textures, faceless figures, extra limbs, deformed anatomy. Maintain 100% photographic realism when art style is photorealistic.`,
      refs: [{ kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' }],
      exclusions:
        'mannequin geometry, plastic skin, cartoon style, 3D render aesthetics, extra limbs, deformed anatomy',
    })
    const exclusions = prompt.split(STILL_SECTION_EXCLUSIONS)[1] ?? ''
    expect(exclusions.match(/Strictly Avoid:/gi)).toHaveLength(1)
    expect(exclusions.match(/mannequin geometry/gi)).toHaveLength(1)
    expect(exclusions.match(/cartoon style/gi)).toHaveLength(1)
    expect(exclusions.match(/3D render aesthetics/gi)).toHaveLength(1)
  })

  it('strips title typography exclusions when typography is allowed', () => {
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured: 'Insert Shot. Centered title typography over the dark terminal.',
      shotType: 'Insert Shot',
      allowTypography: true,
      exclusions: 'text overlay, captions, subtitles',
    })
    const exclusions = prompt.split(STILL_SECTION_EXCLUSIONS)[1] ?? ''
    expect(exclusions.toLowerCase()).not.toMatch(/text overlay/)
    expect(exclusions.toLowerCase()).not.toMatch(/typography/)
    expect(exclusions).not.toMatch(/No dialogue captions, subtitles, or watermarks/)
    expect(prompt).not.toContain(STILL_TASK_INSERT_FRAMING_LINE)
    expect(prompt).toContain('Centered title typography')
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
    expect(system).toMatch(/facial expression/i)
    expect(system).toContain('Insert/Extreme Close-Up of a limb: tight macro, only the specified limb/hand')
    expect(system).toContain('Insert/Extreme Close-Up of an object with nobody in frame')
    expect(system).toContain('Omit a library prop from Action/Framing unless this beat actually uses it')
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

  it('persisted still re-assembles with refs without rewriting Action/Framing', () => {
    const persisted = composePersistedBeatStillPrompt({
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
      sceneIndex: 0,
      beat: {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Ice crystals bloom across the rusted iron.',
        beatDirection: {
          shotType: 'Close-Up',
          cameraAngle: 'eye-level',
          frozenMoment: 'Ice crystals blooming across dark, rusted iron',
          castInFrame: [],
        },
      },
    })

    expect(persisted).toBeDefined()
    expect(persisted!.startsWith(STILL_SECTION_TASK)).toBe(true)
    expect(persisted).not.toContain(`${STILL_SECTION_REFERENCES}\n`)

    const before = parseStillPromptSource(persisted!)
    const withRefs = assembleStructuredStillPrompt({
      actionOrStructured: persisted!,
      refs: [
        {
          kind: 'location',
          token: 'location [1]',
          name: 'FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS',
          roleLabel: 'library location',
        },
      ],
      includeCandid: true,
    })

    expect(withRefs.startsWith(STILL_SECTION_REFERENCES)).toBe(true)
    expect(withRefs).toContain('location [1] = FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS')
    expect(parseStillPromptSource(withRefs).actionFraming).toBe(before.actionFraming)
    expect(parseStillPromptSource(withRefs).style).toBe(before.style)
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

  it('binds a unique workbench head noun and table synonym to the send-index token', () => {
    const text = replaceLibraryNamesWithTokens(
      'person [1] leans against the table, gaze down at the workbench.',
      [
        { kind: 'person', token: 'person [1]', name: 'Piper Hayes', roleLabel: 'identity' },
        {
          kind: 'prop',
          token: 'prop [3]',
          name: 'Zinc workbench',
          roleLabel: 'library prop',
        },
      ]
    )
    expect(text).toBe('person [1] leans against the prop [3], gaze down at the prop [3].')
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

  it('omits unused props from the legend instead of if/then-ing them into the frame', () => {
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured:
        'Wide shot. person [1] sprawled across the damp flagstone floor, shielding prop [6].',
      refs: cylinderRefs,
      includeCandid: true,
    })

    const still = prompt.split(STILL_SECTION_STILL)[1]?.split(STILL_SECTION_STYLE)[0] ?? prompt
    expect(still).toContain('Also in frame: location [3]')
    expect(still).not.toMatch(/Also in frame:[^\n]*prop \[4\]/)
    expect(still).not.toMatch(/Also in frame:[^\n]*prop \[5\]/)
    expect(prompt).not.toContain('prop [4] = Brass cylinder')
    expect(prompt).not.toContain('prop [5] = Machined brass cylinder')
    expect(prompt).toContain('prop [6] = Olive-drab aluminum cylinder')
    expect(still).not.toMatch(/Also in frame:[^\n]*prop \[6\]/)
  })

  it('does not add location as a second subject on a detail shot', () => {
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured: "Insert Shot. person [1]'s hand turns prop [6].",
      refs: cylinderRefs,
      shotType: 'Insert Shot',
    })

    expect(prompt).toContain(STILL_TASK_INSERT_FRAMING_LINE)
    expect(prompt).not.toMatch(/two arms and two legs/)
    expect(prompt).toContain('shallow-focus background bokeh')
    expect(prompt).not.toContain('Also in frame:')
  })

  it('does not require the location plate as a second wide subject on a two-shot', () => {
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured:
        'Medium Two-Shot. person [1] interposes the journal between person [2] and the cage.',
      refs: [
        { kind: 'person', token: 'person [1]', name: 'Piper Hayes', roleLabel: 'identity' },
        { kind: 'person', token: 'person [2]', name: 'Gideon Croft', roleLabel: 'identity' },
        {
          kind: 'location',
          token: 'location [1]',
          name: 'FREIGHT TUNNEL VAULT',
          roleLabel: 'library location',
        },
      ],
      shotType: 'Two-Shot',
    })

    expect(prompt).not.toContain('Also in frame: location [1]')
    expect(prompt).toContain(STILL_TASK_LOCATION_ENVIRONMENT_LINE)
    expect(prompt).toContain(STILL_TASK_PERSON_PROP_TOKEN_LINE)
    expect(prompt).toContain(
      'location [1] = FREIGHT TUNNEL VAULT — library location: match architecture, palette, and lighting as environment; not a second wide subject'
    )
    expect(prompt).not.toMatch(/LOCATION location \[1\].*extreme-wide establishing shot/)
    expect(prompt).not.toMatch(/Also in frame: location \[1\]/)
    expect(prompt).not.toContain(STILL_TASK_MOUNTED_FIXTURE_LINE)
  })

  it('binds a lockdown wheel in Action/Framing to the location plate', () => {
    const action =
      'Medium Shot, low angle. person [1] leans his entire body weight sideways, pulling down hard on the handle of a prop [1] attached to the Massive brass lockdown wheel. Body position: person [1] stands screen-center in profile, his knees bent and weight shifted onto his back foot, both hands gripping the handle of the prop [1]. Hands and props: Both hands grip the handle of the prop [1], which is engaged with the center of the Massive brass lockdown wheel. Gaze: Fixed intensely on the center of the Massive brass lockdown wheel. Cast in frame: person [1] — and no other people.'
    const refs = [
      { kind: 'person' as const, token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' },
      {
        kind: 'prop' as const,
        token: 'prop [1]',
        name: 'Thirty-Inch Iron Rail Spanner',
        roleLabel: 'library prop',
      },
      {
        kind: 'location' as const,
        token: 'location [1]',
        name: 'FREIGHT TUNNEL VAULT - WORKBENCH',
        roleLabel: 'library location',
      },
    ]

    const prompt = assembleStructuredStillPrompt({
      actionOrStructured: action,
      refs,
      includeCandid: true,
      shotType: 'Medium Shot',
      omitReferencesSection: true,
    })

    expect(prompt).toContain('Massive brass lockdown wheel already on location [1]')
    expect(prompt.match(/already on location \[1\]/g)?.length).toBe(3)
    expect(prompt).toContain(STILL_TASK_MOUNTED_FIXTURE_LINE)
    expect(prompt).toContain(STILL_TASK_LOCATION_ENVIRONMENT_LINE)
    expect(prompt).toContain('prop [1]')
    expect(prompt).toContain(
      'handle of a prop [1] attached to the Massive brass lockdown wheel already on location [1]'
    )
    expect(prompt).not.toContain('already on location [1] already on')

    const replayed = assembleStructuredStillPrompt({
      actionOrStructured: prompt,
      refs,
      includeCandid: true,
      shotType: 'Medium Shot',
      omitReferencesSection: true,
    })
    expect(replayed.match(/already on location \[1\]/g)?.length).toBe(3)
    expect(replayed).toContain(STILL_TASK_MOUNTED_FIXTURE_LINE)
  })

  it('leaves a mounted-fixture phrase unbound when no location plate is attached', () => {
    const prompt = assembleStructuredStillPrompt({
      actionOrStructured:
        'Medium Shot. person [1] pulls down hard on the Massive brass lockdown wheel.',
      refs: [
        { kind: 'person', token: 'person [1]', name: 'Gideon Croft', roleLabel: 'identity' },
        {
          kind: 'prop',
          token: 'prop [1]',
          name: 'Thirty-Inch Iron Rail Spanner',
          roleLabel: 'library prop',
        },
      ],
      shotType: 'Medium Shot',
    })

    expect(prompt).toContain('Massive brass lockdown wheel')
    expect(prompt).not.toMatch(/already on location \[/)
    expect(prompt).not.toContain(STILL_TASK_MOUNTED_FIXTURE_LINE)
  })

  it('bindMountedFixturesToLocationToken is idempotent and prefers the longest phrase', () => {
    const once = bindMountedFixturesToLocationToken(
      'Both hands grip the Massive brass lockdown wheel.',
      'location [1]'
    )
    expect(once).toBe(
      'Both hands grip the Massive brass lockdown wheel already on location [1].'
    )
    expect(bindMountedFixturesToLocationToken(once, 'location [1]')).toBe(once)
    expect(bindMountedFixturesToLocationToken(once, 'location [4]')).toBe(once)
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
    expect(first).toContain('Also in frame: location [3]')
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

  it('keeps one wrench/spanner synonym when the frame only names the tool', () => {
    const wrenches = [
      { name: 'Thirty-Inch Iron Rail Spanner' },
      { name: 'Spud wrench' },
      { name: 'Industrial cast-iron spanner wrench' },
    ]
    const headNoun = { matched: true as const, basis: 'head-noun' as const }
    const { kept, dropped } = dropDuplicateHeadNounMatches(
      'person [1] swings the iron rail spanner.',
      wrenches.map((item) => ({ item, match: headNoun }))
    )

    expect(kept).toEqual([{ name: 'Thirty-Inch Iron Rail Spanner' }])
    expect(dropped.map((entry) => entry.item.name)).toEqual([
      'Spud wrench',
      'Industrial cast-iron spanner wrench',
    ])
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
    expect(first).toMatch(/no headshot or turnaround framing/)
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

  it('strips a stored Frozen animatic purpose line so it cannot fight photoreal style', () => {
    const stored = `[REFERENCES]
person [1] (Piper Hayes) matches its identity reference

[STILL]
Frozen animatic film still of this beat. Not a video start frame. No camera motion.
Action/Framing: person [1] raises prop [7] toward the hatch collar.`

    expect(actionFramingFromStoredPrompt(stored)).toBe(
      'person [1] raises prop [7] toward the hatch collar.'
    )
    expect(assemble(stored)).toContain('Cinematic live-action film still')
    expect(assemble(stored)).not.toContain('Frozen animatic')
  })

  it('recovers the beat action from an assembled still', () => {
    expect(actionFramingFromStoredPrompt(assemble('person [1] raises prop [7].'))).toBe(
      'person [1] raises prop [7].'
    )
  })

  it('strips the Pro paired-plate mandate so it cannot re-enter Action/Framing', () => {
    const body = `${STILL_TASK_PAIRED_PLATES_MANDATORY_LINE}
Action/Framing: ${STILL_TASK_PAIRED_PLATES_MANDATORY_LINE} person [1] raises prop [7] toward the hatch collar.`

    expect(extractActionFramingBody(body)).toBe(
      'person [1] raises prop [7] toward the hatch collar.'
    )
    expect(actionFramingFromStoredPrompt(`[STILL]\n${body}`)).toBe(
      'person [1] raises prop [7] toward the hatch collar.'
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

  it('keeps a tokenized prop after compose replaced the catalog name', () => {
    const match = resolveLibraryItemPromptMatch(
      'person [2] rests his weight on the upright prop [1] planted firmly on the floor between them.',
      {
        name: 'Thirty-Inch Iron Rail Spanner',
        promptToken: 'prop [1]',
      }
    )

    expect(match).toEqual({ matched: true, basis: 'token', matchedTerm: 'prop [1]' })
  })

  it('drops a tokenized-away catalog name when the object has no promptToken', () => {
    expect(
      resolveLibraryItemPromptMatch(
        'person [2] rests his weight on the upright prop [1] planted firmly on the floor.',
        { name: 'Thirty-Inch Iron Rail Spanner' }
      )
    ).toEqual({ matched: false, basis: 'none' })
  })

  it('still rejects a prop the frame only shares decoration with', () => {
    expect(
      resolveLibraryItemPromptMatch('Piper braces against the iron rail.', {
        name: 'Thirty-Inch Iron Rail Spanner',
        promptToken: 'prop [7]',
      })
    ).toEqual({ matched: false, basis: 'none' })
  })

  it('keeps drafting vellum when the frozen moment names the object, not the catalog', () => {
    expect(
      resolveLibraryItemPromptMatch('A heavy roll of drafting vellum slides out.', {
        name: 'Roll of drafting vellum with violet ink',
      })
    ).toEqual({ matched: true, basis: 'head-noun', matchedTerm: 'vellum' })
  })

  it('keeps a frozen-moment noun pair when the catalog head noun is absent', () => {
    expect(
      resolveLibraryItemPromptMatch('The drafting roll unspools across the table.', {
        name: 'Roll of drafting vellum with violet ink',
      })
    ).toEqual({
      matched: true,
      basis: 'partial-overlap',
      matchedTerm: 'roll drafting',
    })
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
    const dropsUnnamed = src.indexOf('actionFramingForLibraryMatch(optimizedPrompt)')
    const buildsImages = src.indexOf('const objectImageReferences =')
    expect(dropsUnnamed).toBeGreaterThan(-1)
    expect(buildsImages).toBeGreaterThan(dropsUnnamed)
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
      /joinPromptBlocks\(\s*formatStillReferencesLegend\(stillRefs,\s*effectiveShotType/
    )
    expect(src).toContain("useInterleavedProRefs = effectiveImageTier !== 'eco'")
    expect(src).toContain('includeAttachedIdentityTraits = useInterleavedProRefs')
    expect(src).toContain('omitReferencesSection: useInterleavedProRefs')
    expect(src).toContain('omitWardrobePlatesForFaceCloseUp')
    expect(src).toContain('buildInterleavedReferencePairCaptions')
    expect(src).toContain('preserveLibraryPromptTokens: useInterleavedProRefs')
    expect(src).toContain('if (keyFeatures.length === 0)')
    expect(src).toContain('visionLandmarks')
  })

  it('does not re-describe faces or outfits from text when identity images are attached', () => {
    expect(gideonRefs()[0].identityTraits).toBeUndefined()
    expect(gideonRefs()[0].wardrobeClause).toBeUndefined()
    expect(gideonRefs(6)[0].identityTraits).toBeUndefined()
    expect(formatStillReferencesLegend(gideonRefs())).toBe(
      '[REFERENCES]\nperson [1] (Gideon Croft) — matches Reference image 1 (Identity)'
    )
  })

  it('locks Pro stills with short vision landmarks that must match Reference image 1', () => {
    const refs = stillRefsFromAttachedImages({
      selected: [
        { sendIndex: 1, characterName: 'Gideon Croft', refRole: 'identity' },
        { sendIndex: 2, characterName: 'Gideon Croft', refRole: 'wardrobe' },
      ],
      characterReferences: [
        {
          name: 'Gideon Croft',
          promptToken: 'person [1]',
          subjectOrdinal: 1,
          visionDescription: GIDEON_VISION,
        },
      ],
      includeAttachedIdentityTraits: true,
    })
    expect(refs[0].identityTraits).toMatch(/medium-brown skin/)
    expect(
      formatStillReferencesLegend(refs, undefined, { includeAttachedIdentityTraits: true })
    ).toContain(
      'facial landmarks from Reference image 1 — warm medium-brown skin, tightly curled salt-and-pepper hair, short grizzled beard, early 50s'
    )
    expect(
      formatStillReferencesLegend(refs, undefined, { includeAttachedIdentityTraits: true })
    ).not.toMatch(/overcoat/i)
  })

  it('puts HUD-free IDENTITY landmarks on Pro TASK when the [REFERENCES] wall is omitted', () => {
    const refs = stillRefsFromAttachedImages({
      selected: [{ sendIndex: 1, characterName: 'Gideon Croft', refRole: 'identity' }],
      characterReferences: [
        {
          name: 'Gideon Croft',
          promptToken: 'person [1]',
          subjectOrdinal: 1,
          visionDescription: GIDEON_VISION,
          wardrobeDescription: 'charcoal wool overcoat over a dark knit',
        },
      ],
      includeAttachedIdentityTraits: true,
    })
    expect(refs[0].wardrobeClause).toMatch(/charcoal wool overcoat/i)

    const prompt = assembleStructuredStillPrompt({
      actionOrStructured: 'Close-Up. person [1] stares at the needle.',
      refs,
      shotType: 'Close-Up',
      includeAttachedIdentityTraits: true,
      omitReferencesSection: true,
    })

    expect(prompt).toContain(PAIRED_IDENTITY_LANDMARK_PREFIX)
    expect(prompt).toContain('person [1] (Gideon Croft) must match the IDENTITY plate')
    expect(prompt).toMatch(/medium-brown skin/)
    expect(prompt).toContain('Garments at the collar and shoulders:')
    expect(prompt).not.toContain('Reference image 1')
    expect(prompt).not.toContain(STILL_SECTION_REFERENCES)
    expect(prompt).toContain(STILL_TASK_FACE_CLOSE_UP_IDENTITY_PLATE_LINES[0])
    expect(prompt).not.toContain('identity card')

    const replayed = assembleStructuredStillPrompt({
      actionOrStructured: prompt,
      refs,
      shotType: 'Close-Up',
      includeAttachedIdentityTraits: true,
      omitReferencesSection: true,
    })
    expect(replayed).toBe(prompt)
  })
})

describe('generate-image Direct/regen still payload', () => {
  it('derives allowTypography and skips caption exclusions on title beats', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'),
      'utf8'
    )
    expect(src).toContain('stillAllowsTypography')
    expect(src).toMatch(/if \(!allowTypography\) \{[\s\S]*?No dialogue captions, subtitles, or watermarks/)
    expect(src).toContain('actionFramingForLibraryMatch(optimizedPrompt)')
    expect(src).toContain('shallow-focus background bokeh')
    expect(src).toContain('resolveEffectiveStillShotType')
    expect(src).toContain('stillRefsFromNamedLibrary')
    expect(src).toContain('shotType: effectiveShotType')
    expect(src).toContain('combinedCharacterReferenceInstruction(effectiveShotType)')
  })
})
