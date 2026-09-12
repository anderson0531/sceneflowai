import { describe, it, expect } from 'vitest'
import {
  buildFallbackBeatPlans,
  composeBeatActionFraming,
  composePersistedBeatStillPrompt,
  storedPromptMatchesDirection,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  PROJECT_LOOKBOOK_VERSION,
  type ProjectLookbook,
} from '@/lib/intelligence/project-lookbook-fallback'
import {
  assembleStructuredStillPrompt,
  isStructuredStillPrompt,
  parseStillPromptSource,
} from '@/lib/imagen/structuredStillPrompt'
import {
  beatDirectionFingerprint,
  beatStillDirectionFingerprint,
} from '@/lib/script/beatDirectionFingerprint'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const lookbook: ProjectLookbook = {
  version: PROJECT_LOOKBOOK_VERSION,
  fingerprint: 'deadbeef',
  masterStyle: 'Rain-slick neo-noir, live-action photoreal',
  colorPalette: 'Sodium orange against slate blue',
  lightingGrammar: 'Single hard key from a practical, deep falloff',
  lensAndFormat: 'Anamorphic 40mm, 2.39:1',
  textureAndGrade: '35mm grain, crushed blacks',
  negativeStyleTerms: ['illustration', 'cartoon'],
  sceneLooks: [{ sceneIndex: 0, lookNote: 'Warmer interior spill from the desk lamp' }],
  generatedAt: '2026-01-01T00:00:00.000Z',
}

describe('buildFallbackBeatPlans photorealistic prompts', () => {
  it('emits Action/Framing stills without F2V start-frame language', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'bt_0',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Hero enters the room',
      },
    ]

    const plans = buildFallbackBeatPlans({
      scene: {
        heading: 'INT. OFFICE - DAY',
        action: 'Hero enters the room',
      },
      beats,
      sceneNumber: 1,
      artStyle: 'photorealistic',
    })

    expect(plans).toHaveLength(1)
    expect(plans[0].prompt).toContain('Hero enters the room')
    expect(plans[0].prompt.toLowerCase()).not.toContain('f2v')
    expect(plans[0].prompt.toLowerCase()).not.toContain('start frame')
    expect(plans[0].prompt.toLowerCase()).not.toContain('storyboard still')
  })

  it('does not inherit another character’s scene-description sentence on dialogue beats', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'bt_dlg',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Gideon',
        line: 'I reclaimed this room.',
      },
    ]

    const plans = buildFallbackBeatPlans({
      scene: {
        heading: 'INT. BRIEFING ROOM - DAY',
        action: 'The briefing continues.',
        sceneDirection: {
          sceneDescription:
            'Piper Hayes storms the briefing room and slams a folder on the table. Gideon reclaims his academic authority.',
        },
      },
      beats,
      sceneNumber: 2,
      artStyle: 'photorealistic',
    })

    expect(plans).toHaveLength(1)
    expect(plans[0].frozenMoment).toContain('Gideon')
    expect(plans[0].frozenMoment).toContain('I reclaimed this room')
    expect(plans[0].prompt).not.toMatch(/Piper Hayes/)
  })
})

describe('buildFallbackBeatPlans under a project lookbook', () => {
  const beats: SceneBeat[] = [
    {
      beatId: 'bt_0',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Hero enters the room',
    },
    {
      beatId: 'bt_1',
      sequenceIndex: 1,
      kind: 'action',
      actionDescription: 'Hero sets the folder down',
    },
  ]

  const scene = {
    heading: 'INT. OFFICE - NIGHT',
    action: 'Hero enters the room',
    sceneDirection: { lighting: { overallMood: 'Low-key desk lamp' } },
  }

  it('wraps every beat in the film-wide style anchor', () => {
    const plans = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 1,
      lookbook,
      artStyle: 'photorealistic',
    })

    expect(plans).toHaveLength(2)
    for (const plan of plans) {
      expect(plan.prompt.startsWith('[GLOBAL STYLE ANCHOR]')).toBe(true)
      expect(plan.prompt).toContain('Rain-slick neo-noir')
      expect(plan.prompt).toContain('Anamorphic 40mm')
      expect(plan.prompt).toContain('Sodium orange against slate blue')
      expect(plan.prompt).toContain('35mm grain, crushed blacks')
      expect(plan.prompt).toContain('[SCENE COMPOSITION & BEAT]')
    }

    // Every beat of this scene carries the same look, and only the same look.
    const anchors = plans.map((p) => p.prompt.split('[SCENE COMPOSITION & BEAT]')[0])
    expect(new Set(anchors).size).toBe(1)
    expect(anchors[0]).toContain('Warmer interior spill from the desk lamp')
  })

  it('keeps the style prose out of the parsed action text', () => {
    const [plan] = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 1,
      lookbook,
      artStyle: 'photorealistic',
    })

    const { actionFraming, style } = parseStillPromptSource(plan.prompt)
    expect(actionFraming).toContain('Hero enters the room')
    expect(actionFraming).not.toMatch(/neo-noir|Anamorphic|crushed blacks/i)
    expect(style).toContain('Rain-slick neo-noir')
  })

  // A prompt that is not sectioned gets handed to the rules optimizer, which
  // rewrites the shot language and declares the frame to be about every
  // attached character. An unanchored project must not lose its beats that way.
  it('still sections the composition when the project has no lookbook', () => {
    const [plan] = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 1,
      artStyle: 'photorealistic',
    })

    expect(plan.prompt).not.toContain('[GLOBAL STYLE ANCHOR]')
    expect(plan.prompt).toContain('[SCENE COMPOSITION & BEAT]')
    expect(isStructuredStillPrompt(plan.prompt)).toBe(true)
    expect(parseStillPromptSource(plan.prompt).actionFraming).toContain('Hero enters the room')
  })

  it('anchors an unanchored project on the code-owned art style when given one', () => {
    const [plan] = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 1,
      artStyle: 'photorealistic',
      artStyleAnchor: 'live-action film still, photographed on real camera',
    })

    expect(plan.prompt.startsWith('[GLOBAL STYLE ANCHOR]')).toBe(true)
    expect(parseStillPromptSource(plan.prompt).style).toContain('live-action film still')
    expect(parseStillPromptSource(plan.prompt).actionFraming).not.toMatch(/live-action film still/i)
  })

  it('carries the direction lighting mood onto the plan for direction gap-fill', () => {
    const [plan] = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 1,
      lookbook,
    })

    expect(plan.lighting).toBe('Low-key desk lamp')
    expect(plan.prompt).toContain('Low-key desk lamp')
  })
})

describe('composePersistedBeatStillPrompt', () => {
  it('wraps the direction in the lookbook rather than the wording it last shipped', () => {
    const beatDirection = {
      frozenMoment: 'Gideon at the zinc workbench',
      lightingAccent: 'Low-key practicals',
    }
    const prompt = composePersistedBeatStillPrompt({
      lookbook,
      sceneIndex: 0,
      beat: {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Gideon hunches over the seismograph.',
        beatDirection,
        // Keyed to the direction above, so the staleness check passes. The
        // composer still ignores it: a prompt can be current and wrong.
        storyboardImagePrompt: 'Wide shot: Piper sprints across the gantry.',
        storyboardImagePromptDirectionKey: beatDirectionFingerprint(beatDirection),
      },
    })

    expect(prompt).toBeDefined()
    expect(prompt!.startsWith('[GLOBAL STYLE ANCHOR]')).toBe(true)
    expect(prompt).toContain('Rain-slick neo-noir')
    const parsed = parseStillPromptSource(prompt!)
    expect(parsed.style?.trim()).toBeTruthy()
    expect(parsed.actionFraming).toContain('Gideon at the zinc workbench')
    // One instant per still: the prose spans time, so it does not trail the
    // frozen moment and leave the model choosing which action to stage.
    expect(parsed.actionFraming).not.toMatch(/hunches over/)
    expect(parsed.actionFraming).not.toMatch(/Piper|gantry/)
  })

  it('recomposes from direction when the stored prompt predates it', () => {
    const prompt = composePersistedBeatStillPrompt({
      lookbook,
      sceneIndex: 0,
      beat: {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Gideon hunches over the seismograph.',
        beatDirection: {
          frozenMoment: 'Gideon turns away from the dead seismograph',
          lightingAccent: 'Low-key practicals',
        },
        storyboardImagePrompt: 'Medium shot: Gideon at the zinc workbench.',
        storyboardImagePromptDirectionKey: beatDirectionFingerprint({
          frozenMoment: 'Gideon at the zinc workbench',
        }),
      },
    })

    expect(prompt).toContain('Gideon turns away from the dead seismograph')
    expect(prompt).not.toContain('zinc workbench')
  })

  it('states shot, blocking, prop handling and gaze so the frame is described', () => {
    const framing = composeBeatActionFraming({
      beatId: 'bt_2',
      sequenceIndex: 1,
      kind: 'action',
      actionDescription: 'Brass pneumatic hatch collar flanked by three rusted locking dogs.',
      beatDirection: {
        shotType: 'Medium Shot',
        cameraAngle: 'low angle',
        blocking: 'Piper Hayes braces against the bulkhead, Gideon Croft behind her',
        propInteraction: 'Piper Hayes swings the Thirty-Inch Iron Rail Spanner at the dogs',
        gaze: 'toward the hatch wheel',
        keyProps: ['Thirty-Inch Iron Rail Spanner', 'Violet Ink Drafting Vellum'],
      },
    })

    expect(framing).toContain('Medium Shot, low angle')
    expect(framing).toContain('Brass pneumatic hatch collar')
    expect(framing).toContain('Blocking: Piper Hayes braces against the bulkhead')
    expect(framing).toContain('Prop handling: Piper Hayes swings the Thirty-Inch Iron Rail Spanner')
    expect(framing).toContain('Gaze: toward the hatch wheel')
    // The spanner is already handled; only the untouched prop needs stating.
    expect(framing).toContain('Props in frame: Violet Ink Drafting Vellum.')
    expect(framing.match(/Thirty-Inch Iron Rail Spanner/g)).toHaveLength(1)
  })

  it('stages one instant, not the frozen moment and the prose around it', () => {
    const framing = composeBeatActionFraming({
      beatId: 'bt_instant',
      sequenceIndex: 7,
      kind: 'action',
      actionDescription: 'Gideon raises the spanner and swings it down onto the locking dogs.',
      beatDirection: {
        shotType: 'Medium Shot',
        frozenMoment: 'The spanner is already buried in the third dog, Gideon following through.',
      },
    })

    expect(framing).toContain('The spanner is already buried in the third dog')
    expect(framing).not.toMatch(/raises the spanner/)
  })

  it('describes the beat from its prose when no frozen moment is directed', () => {
    const framing = composeBeatActionFraming({
      beatId: 'bt_prose',
      sequenceIndex: 8,
      kind: 'action',
      actionDescription: 'Gideon raises the spanner over the locking dogs.',
      beatDirection: { shotType: 'Medium Shot' },
    })

    expect(framing).toContain('Gideon raises the spanner over the locking dogs.')
  })

  it('reduces a directed camera move to the angle the still is taken from', () => {
    const framing = composeBeatActionFraming({
      beatId: 'bt_move',
      sequenceIndex: 6,
      kind: 'dialogue',
      character: 'Piper Hayes',
      line: 'You knew, and you said nothing.',
      beatDirection: {
        shotType: 'Two-Shot',
        cameraAngle: 'Dynamic, shifting from high-angle dominance to low-angle vulnerability',
      },
    })

    expect(framing).toContain('Two-Shot, low angle')
    expect(framing).not.toMatch(/shifting from/i)
    expect(framing).not.toMatch(/Dynamic/i)
  })

  it('composes the same frame no matter what was stored last time', () => {
    const beat: SceneBeat = {
      beatId: 'bt_3',
      sequenceIndex: 2,
      kind: 'action',
      actionDescription: 'Gideon Croft hunches over the seismograph.',
      beatDirection: {
        shotType: 'Medium Close-Up',
        blocking: 'Gideon Croft at the zinc workbench',
        gaze: 'toward the drum needle',
        keyProps: ['Violet Ink Drafting Vellum'],
      },
    }

    const first = composeBeatActionFraming(beat)

    expect(composeBeatActionFraming({ ...beat, storyboardImagePrompt: first })).toBe(first)
    expect(
      composeBeatActionFraming({
        ...beat,
        storyboardImagePrompt: 'Wide shot: an entirely different frame.',
        storyboardImagePromptDirectionKey: beatDirectionFingerprint(beat.beatDirection),
      })
    ).toBe(first)
    expect(first.match(/Blocking:/g)).toHaveLength(1)
    expect(first.match(/Props in frame:/g)).toHaveLength(1)
  })

  it('says outright that an insert shot has nobody in it', () => {
    const framing = composeBeatActionFraming({
      beatId: 'bt_gauge',
      sequenceIndex: 4,
      kind: 'action',
      actionDescription:
        'A brass pressure gauge redlines. Three heavy iron locking dogs scream against the metal.',
      beatDirection: {
        shotType: 'Extreme Close-Up',
        blocking: 'The brass pressure needle shakes violently in the red zone.',
        frozenMoment: 'Pressure gauge needle pinned to the maximum.',
        keyProps: ['Heavy iron spanner'],
        castInFrame: [],
      },
    })

    expect(framing).toContain('No people in frame')
    expect(framing).not.toMatch(/Cast in frame/)
  })

  it('closes the cast list so nobody else can join the frame', () => {
    const framing = composeBeatActionFraming({
      beatId: 'bt_cast',
      sequenceIndex: 5,
      kind: 'action',
      actionDescription: 'Piper Hayes braces against the bulkhead.',
      beatDirection: {
        shotType: 'Medium Shot',
        castInFrame: ['Piper Hayes'],
      },
    })

    expect(framing).toContain('Cast in frame: Piper Hayes — and no other people.')
    expect(framing).not.toMatch(/No people in frame/)
  })

  it('binds composed cast names to person tokens during still assembly', () => {
    const framing = composeBeatActionFraming({
      beatId: 'bt_4',
      sequenceIndex: 3,
      kind: 'action',
      actionDescription: 'Piper turns on Gideon.',
      beatDirection: { shotType: 'Two-Shot' },
    })

    const still = assembleStructuredStillPrompt({
      actionOrStructured: framing,
      refs: [
        { kind: 'person', token: 'person [1]', name: 'Piper Hayes', roleLabel: 'identity' },
        {
          kind: 'person',
          token: 'person [2]',
          name: 'Professor Gideon Croft',
          roleLabel: 'identity',
        },
      ],
      includeCandid: true,
    })

    expect(still).toContain('Action/Framing: Two-Shot. person [1] turns on person [2].')
    // Cast names belong in the legend; the composition itself must be tokenized.
    expect(parseStillPromptSource(still).actionFraming).not.toMatch(/Piper|Gideon/)
  })

  it('returns undefined when the beat has no stored look to compose', () => {
    expect(
      composePersistedBeatStillPrompt({
        lookbook,
        sceneIndex: 0,
        beat: {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Gideon hunches over the seismograph.',
        },
      })
    ).toBeUndefined()
  })

  it('storedPromptMatchesDirection ignores video-only direction edits', () => {
    const still = { shotType: 'Medium Shot', frozenMoment: 'Gideon at the bench' }
    const beat = {
      beatId: 'bt_1',
      sequenceIndex: 0,
      kind: 'action' as const,
      actionDescription: 'Gideon hunches over the seismograph.',
      beatDirection: { ...still, cameraMovement: 'dolly in', emotion: 'tense' },
      storyboardImagePrompt: 'Medium Shot. Gideon at the bench.',
      storyboardImagePromptDirectionKey: beatStillDirectionFingerprint(still),
    }
    expect(storedPromptMatchesDirection(beat)).toBe(true)
  })
})
