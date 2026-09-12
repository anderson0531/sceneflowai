/**
 * The invariant that ends the iteration.
 *
 * Five rounds of fixes hardened the prompt builder and the bug came back each
 * time, because each round removed one route by which cast and props reached a
 * frame and left the rest. This asserts the property instead of the route: for
 * every fixture, the frame a beat composes states its shot and introduces
 * nobody and nothing its direction did not ask for.
 */

import { describe, expect, it } from 'vitest'
import { composePersistedBeatStillPrompt } from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import {
  assembleStructuredStillPrompt,
  buildPropPromptToken,
  type StillPromptBoundRef,
} from '@/lib/imagen/structuredStillPrompt'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { resolveBeatFrameGenerationContext } from '@/lib/vision/beatFrameGenerationContext'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

const PROJECT_CHARACTERS = [
  { id: 'c-piper', name: 'Piper Hayes', referenceImage: 'https://blob.example/piper.jpg' },
  { id: 'c-gideon', name: 'Professor Gideon Croft', referenceImage: 'https://blob.example/gideon.jpg' },
  { id: 'c-narrator', name: 'Narrator', type: 'narrator' },
]

const CAST_NAMES = ['Piper Hayes', 'Professor Gideon Croft']

const OBJECT_REFERENCES: VisualReference[] = [
  {
    id: 'obj-spanner',
    type: 'object',
    name: 'Heavy iron spanner',
    imageUrl: 'https://blob.example/spanner.jpg',
  },
  {
    id: 'obj-cylinder',
    type: 'object',
    name: 'Olive-drab aluminum cylinder',
    imageUrl: 'https://blob.example/cylinder.jpg',
  },
  {
    id: 'obj-vellum',
    type: 'object',
    name: 'Violet ink drafting vellum',
    imageUrl: 'https://blob.example/vellum.jpg',
  },
  {
    id: 'obj-gauge',
    type: 'object',
    name: 'Brass pressure gauge',
    imageUrl: 'https://blob.example/gauge.jpg',
  },
]

const LOCATION_REFERENCES: LocationReference[] = [
  {
    id: 'loc-terminal',
    location: 'PNEUMATIC TERMINAL',
    imageUrl: 'https://blob.example/terminal.jpg',
  },
]

/** Names nobody, so any name in a composed prompt came from the beat. */
const lookbook: ProjectLookbook = {
  masterLook: 'Rain-slick industrial noir, hard practicals, long lens compression.',
  scenes: [],
}

/** Every beat in the corpus lives in one scene whose cast is both characters. */
function terminalScene(beats: SceneBeat[]): Record<string, unknown> {
  return {
    sceneNumber: 1,
    heading: 'INT. PNEUMATIC TERMINAL - NIGHT',
    action:
      'Piper Hayes and Professor Gideon Croft fight the terminal as the vacuum builds behind it.',
    characters: CAST_NAMES,
    beats,
  }
}

type Fixture = {
  name: string
  beat: SceneBeat
  /** Title and credit beats carry a typography lead-in. */
  allowTypography?: boolean
}

const PRESSURE_GAUGE_BEAT: SceneBeat = {
  beatId: 'bt-gauge',
  sequenceIndex: 0,
  kind: 'action',
  actionDescription:
    'A brass pressure gauge redlines. The massive industrial pneumatic terminal groans as three heavy iron locking dogs scream against the metal, straining to hold back a lethal vacuum.',
  beatDirection: {
    shotType: 'Extreme Close-Up',
    cameraMovement: 'Aggressive Handheld',
    blocking: 'The brass pressure needle shakes violently in the red zone.',
    emotion: 'Violent anticipation',
    keyProps: ['Heavy iron spanner'],
    lightingAccent: 'Hard & Dramatic',
    frozenMoment: 'Pressure gauge needle pinned to the maximum.',
    audioCue: 'Deafening roar of escaping pneumatic steam',
    transition: 'CUT',
    castInFrame: [],
  },
}

const FIXTURES: Fixture[] = [
  // The beat from the bug report, verbatim. It came back as "Wide Shot. The
  // heavy iron hatch of the pneumatic terminal is blown inward … person [1] is
  // captured mid-fall toward the flagstone floor, clutching an prop [4]".
  { name: 'the pressure gauge insert', beat: PRESSURE_GAUGE_BEAT },
  {
    name: 'a single-hander who is one of two in the scene',
    beat: {
      beatId: 'bt-single',
      sequenceIndex: 1,
      kind: 'dialogue',
      character: 'Piper Hayes',
      line: 'It will not hold.',
      beatDirection: {
        shotType: 'Close-Up',
        blocking: 'Piper Hayes braced against the bulkhead.',
        gaze: 'toward the hatch wheel',
        frozenMoment: 'Piper Hayes shouts over the escaping steam.',
        castInFrame: ['Piper Hayes'],
      },
    },
  },
  {
    name: 'a reaction cut away from the speaker',
    beat: {
      beatId: 'bt-reaction',
      sequenceIndex: 2,
      kind: 'dialogue',
      character: 'Piper Hayes',
      line: 'It will not hold.',
      beatDirection: {
        shotType: 'Medium Close-Up',
        blocking: 'Professor Gideon Croft still at the drafting table.',
        frozenMoment: 'Professor Gideon Croft does not look up.',
        castInFrame: ['Professor Gideon Croft'],
      },
    },
  },
  {
    name: 'a two-hander with a stated prop',
    beat: {
      beatId: 'bt-two',
      sequenceIndex: 3,
      kind: 'action',
      actionDescription: 'They take the locking dogs together.',
      beatDirection: {
        shotType: 'Two-Shot',
        cameraAngle: 'low angle',
        propInteraction: 'Piper Hayes swings the Heavy iron spanner at the dogs.',
        frozenMoment: 'The spanner connects.',
        keyProps: ['Heavy iron spanner'],
        castInFrame: ['Piper Hayes', 'Professor Gideon Croft'],
      },
    },
  },
  {
    name: 'a narration backdrop with nobody in it',
    beat: {
      beatId: 'bt-narration',
      sequenceIndex: 4,
      kind: 'narration',
      character: 'NARRATOR',
      line: 'The terminal had held for thirty years. It would not hold for thirty more.',
      beatDirection: {
        shotType: 'Wide Shot',
        frozenMoment: 'The empty terminal floor, steam pooling at the seams.',
        castInFrame: [],
      },
    },
  },
  {
    name: 'a title card',
    allowTypography: true,
    beat: {
      beatId: 'bt-title',
      sequenceIndex: 5,
      kind: 'action',
      actionDescription: 'Title: THE LAST VACUUM.',
      beatDirection: {
        shotType: 'Insert Shot',
        frozenMoment: 'Centered title typography over the dark terminal.',
        castInFrame: [],
      },
    },
  },
]

const SCENE = terminalScene(FIXTURES.map((fixture) => fixture.beat))

function composeFor(fixture: Fixture): string {
  const prompt = composePersistedBeatStillPrompt({
    lookbook,
    sceneIndex: 0,
    beat: fixture.beat,
    ...(fixture.allowTypography
      ? { actionLeadIn: 'Abstract cinematic digital composition with NO people.' }
      : {}),
  })
  expect(prompt, fixture.name).toBeDefined()
  return prompt!
}

/** What the beat itself says, which a composed prompt is entitled to repeat. */
function ownText(beat: SceneBeat): string {
  return [beat.actionDescription ?? '', beat.line ?? ''].join(' ').toLowerCase()
}

describe('a composed beat frame introduces nothing the direction did not ask for', () => {
  for (const fixture of FIXTURES) {
    describe(fixture.name, () => {
      it('names no character the beat left out of frame', () => {
        const prompt = composeFor(fixture).toLowerCase()
        const inFrame = (fixture.beat.beatDirection?.castInFrame ?? []).map((n) =>
          n.toLowerCase()
        )
        for (const name of CAST_NAMES) {
          if (inFrame.includes(name.toLowerCase())) continue
          expect(prompt, name).not.toContain(name.toLowerCase())
        }
      })

      it('names no library prop the beat left out of frame', () => {
        const prompt = composeFor(fixture).toLowerCase()
        const stated = (fixture.beat.beatDirection?.keyProps ?? []).map((p) => p.toLowerCase())
        const own = ownText(fixture.beat)
        for (const ref of OBJECT_REFERENCES) {
          const name = (ref.name || '').toLowerCase()
          // A prop the beat's own description names is the beat's to name. The
          // catalog is what must not leak: nothing may arrive because it exists.
          if (stated.includes(name) || own.includes(name)) continue
          expect(prompt, name).not.toContain(name)
        }
      })

      it('states the shot the direction asked for', () => {
        const shotType = fixture.beat.beatDirection?.shotType
        expect(shotType, fixture.name).toBeTruthy()
        expect(composeFor(fixture).toLowerCase()).toContain(shotType!.toLowerCase())
      })

      it('attaches a reference for everyone in frame and no one else', () => {
        const resolved = resolveBeatFrameGenerationContext({
          scene: SCENE,
          beat: fixture.beat,
          sceneIndex: 0,
          projectCharacters: PROJECT_CHARACTERS,
          locationReferences: LOCATION_REFERENCES,
          objectReferences: OBJECT_REFERENCES,
        })

        expect(resolved.characterNames.slice().sort()).toEqual(
          (fixture.beat.beatDirection?.castInFrame ?? []).slice().sort()
        )
      })
    })
  }
})

describe('the pressure gauge insert, assembled the way the image model sees it', () => {
  function assemble(beat: SceneBeat): string {
    const resolved = resolveBeatFrameGenerationContext({
      scene: SCENE,
      beat,
      sceneIndex: 0,
      projectCharacters: PROJECT_CHARACTERS,
      locationReferences: LOCATION_REFERENCES,
      objectReferences: OBJECT_REFERENCES,
    })
    const refs: StillPromptBoundRef[] = [
      ...resolved.characterNames.map((name, index) => ({
        kind: 'person' as const,
        token: `person [${index + 1}]`,
        name,
        roleLabel: 'identity',
      })),
      ...resolved.objectNames.map((name, index) => ({
        kind: 'prop' as const,
        token: buildPropPromptToken(index + 1),
        name,
        roleLabel: 'library prop',
      })),
    ]
    return assembleStructuredStillPrompt({
      actionOrStructured: composeFor({ name: 'gauge', beat }),
      refs,
      includeCandid: true,
    })
  }

  it('has no person in it, in either the composition or the legend', () => {
    const still = assemble(PRESSURE_GAUGE_BEAT)

    expect(still).not.toMatch(/person \[\d+\]/)
    expect(still).not.toMatch(/Piper|Gideon/)
    expect(still).toContain('No people in frame')
  })

  it('has no prop in it that the beat never mentioned', () => {
    const still = assemble(PRESSURE_GAUGE_BEAT).toLowerCase()

    expect(still).not.toContain('cylinder')
    expect(still).not.toContain('vellum')
  })

  it('still says which shot it is', () => {
    expect(assemble(PRESSURE_GAUGE_BEAT)).toContain('Extreme Close-Up')
  })
})
