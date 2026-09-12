import { describe, it, expect } from 'vitest'
import {
  expressKindForRequirement,
  requirementKey,
  resolveAllSceneReferenceRequirements,
  resolveBeatReferenceRequirements,
  resolveSceneRequiredReferences,
  selectUndrawnExpressableRequirements,
  type SceneReferenceRequirement,
} from '@/lib/vision/sceneReferenceRequirements'

const PIPER = {
  id: 'char-piper',
  name: 'PIPER',
  referenceImage: 'https://example.com/piper.png',
  wardrobes: [
    { id: 'wd-piper-default', name: 'Field jacket', isDefault: true, headshotUrl: 'https://example.com/wd1.png' },
    { id: 'wd-piper-gala', name: 'Gala dress', isDefault: false, sceneNumbers: [2] },
  ],
}

const RUIZ = {
  id: 'char-ruiz',
  name: 'RUIZ',
  wardrobes: [{ id: 'wd-ruiz-default', name: 'Coveralls', isDefault: true }],
}

const NARRATOR = { id: 'narrator', name: 'NARRATOR', type: 'narrator' as const }

const TUNNEL = {
  id: 'loc-tunnel',
  location: 'SERVICE TUNNEL',
  locationDisplay: 'INT. SERVICE TUNNEL - NIGHT',
  imageUrl: '',
  sourceSceneIndex: 0,
  sourceSceneHeading: 'INT. SERVICE TUNNEL - NIGHT',
  pinnedAt: '2026-01-01T00:00:00.000Z',
  sceneNumbers: [1],
}

const ATRIUM = {
  id: 'loc-atrium',
  location: 'GLASS ATRIUM',
  locationDisplay: 'INT. GLASS ATRIUM - DAY',
  imageUrl: 'https://example.com/atrium.png',
  sourceSceneIndex: 1,
  sourceSceneHeading: 'INT. GLASS ATRIUM - DAY',
  pinnedAt: '2026-01-01T00:00:00.000Z',
  sceneNumbers: [2],
}

const LANTERN = {
  id: 'obj-lantern',
  type: 'object' as const,
  name: 'brass lantern',
  importance: 'critical' as const,
  imageUrl: '',
}

const LEDGER = {
  id: 'obj-ledger',
  type: 'object' as const,
  name: 'leather ledger',
  importance: 'important' as const,
  imageUrl: 'https://example.com/ledger.png',
}

const byKind = (requirements: SceneReferenceRequirement[], kind: string) =>
  requirements.filter((requirement) => requirement.kind === kind)

const names = (requirements: SceneReferenceRequirement[], kind: string) =>
  byKind(requirements, kind).map((requirement) => requirement.name)

const baseInput = {
  characters: [PIPER, RUIZ, NARRATOR],
  locationReferences: [TUNNEL, ATRIUM],
  objectReferences: [LANTERN, LEDGER],
}

describe('a scene asks only for the references it actually uses', () => {
  it('detects cast, location and props from the script when nothing is planned yet', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene: {
        heading: 'INT. SERVICE TUNNEL - NIGHT',
        sceneNumber: 1,
        action: 'PIPER edges past the rusted pipes, a brass lantern swinging from one hand.',
      },
    })

    expect(names(requirements, 'cast')).toEqual(['PIPER'])
    expect(names(requirements, 'location')).toEqual(['SERVICE TUNNEL'])
    expect(names(requirements, 'prop')).toEqual(['brass lantern'])
    expect(byKind(requirements, 'cast')[0].source).toBe('detected')
  })

  it('leaves out the cast, location and props belonging to other scenes', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene: {
        heading: 'INT. SERVICE TUNNEL - NIGHT',
        sceneNumber: 1,
        action: 'PIPER edges past the rusted pipes, a brass lantern swinging from one hand.',
      },
    })

    const ids = requirements.map((requirement) => requirement.id)
    expect(ids).not.toContain('char-ruiz')
    expect(ids).not.toContain('loc-atrium')
    expect(ids).not.toContain('obj-ledger')
  })

  it('never asks for a narrator, who has no on-screen appearance', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene: {
        heading: 'INT. SERVICE TUNNEL - NIGHT',
        sceneNumber: 1,
        beats: [{ beatId: 'b1', kind: 'narration', character: 'NARRATOR', line: 'The tunnel had not been opened in years.' }],
      },
    })

    expect(requirements.map((requirement) => requirement.id)).not.toContain('narrator')
  })

  it('reports whether each requirement has been drawn', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene: {
        heading: 'INT. SERVICE TUNNEL - NIGHT',
        sceneNumber: 1,
        action: 'PIPER lifts the brass lantern.',
      },
    })

    const drawn = Object.fromEntries(
      requirements.map((requirement) => [requirement.id, Boolean(requirement.imageUrl)])
    )
    expect(drawn['char-piper']).toBe(true)
    expect(drawn['loc-tunnel']).toBe(false)
    expect(drawn['obj-lantern']).toBe(false)
  })
})

describe('the beat plan outranks text matching', () => {
  const plannedScene = {
    heading: 'INT. SERVICE TUNNEL - NIGHT',
    sceneNumber: 1,
    action: 'PIPER lifts the brass lantern while RUIZ waits above.',
    beats: [
      {
        beatId: 'b1',
        kind: 'action',
        referenceSelection: {
          characterIds: ['char-ruiz'],
          locationRefId: 'loc-atrium',
          objectRefIds: ['obj-ledger'],
        },
      },
    ],
  }

  it('uses only the plan when every shootable beat has one', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene: plannedScene,
    })

    expect(names(requirements, 'cast')).toEqual(['RUIZ'])
    expect(names(requirements, 'location')).toEqual(['GLASS ATRIUM'])
    expect(names(requirements, 'prop')).toEqual(['leather ledger'])
    expect(requirements.every((requirement) => requirement.source === 'beat-plan' || requirement.kind === 'wardrobe')).toBe(true)
  })

  it('falls back to text matching for the beats that have not been planned', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene: {
        ...plannedScene,
        beats: [
          plannedScene.beats[0],
          { beatId: 'b2', kind: 'action', actionDescription: 'PIPER raises the brass lantern to the vent.' },
        ],
      },
    })

    expect(names(requirements, 'cast').sort()).toEqual(['PIPER', 'RUIZ'])
    expect(names(requirements, 'prop').sort()).toEqual(['brass lantern', 'leather ledger'])
  })

  it('ignores the selections of beats the user excluded', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene: {
        heading: 'INT. SERVICE TUNNEL - NIGHT',
        sceneNumber: 1,
        beats: [
          {
            beatId: 'b1',
            kind: 'action',
            referenceSelection: { characterIds: ['char-piper'], objectRefIds: [] },
          },
          {
            beatId: 'b2',
            kind: 'action',
            excluded: true,
            referenceSelection: { characterIds: ['char-ruiz'], objectRefIds: ['obj-ledger'] },
          },
        ],
      },
    })

    expect(names(requirements, 'cast')).toEqual(['PIPER'])
    expect(byKind(requirements, 'prop')).toHaveLength(0)
  })

  it('records the plan as the source when both signals name the same reference', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene: {
        heading: 'INT. SERVICE TUNNEL - NIGHT',
        sceneNumber: 1,
        beats: [
          {
            beatId: 'b1',
            kind: 'action',
            actionDescription: 'PIPER lifts the brass lantern.',
            referenceSelection: { characterIds: ['char-piper'], objectRefIds: [] },
          },
          { beatId: 'b2', kind: 'action', actionDescription: 'PIPER lowers the brass lantern.' },
        ],
      },
    })

    expect(byKind(requirements, 'cast')[0].source).toBe('beat-plan')
  })
})

describe('wardrobe follows whoever is in the scene', () => {
  it('picks the default outfit and marks it as a guess', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene: { heading: 'INT. SERVICE TUNNEL - NIGHT', sceneNumber: 1, action: 'PIPER waits.' },
    })

    const wardrobe = byKind(requirements, 'wardrobe')
    expect(wardrobe).toHaveLength(1)
    expect(wardrobe[0].id).toBe('wd-piper-default')
    expect(wardrobe[0].source).toBe('detected')
    expect(wardrobe[0].characterName).toBe('PIPER')
  })

  it('prefers the outfit assigned to this scene number', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 1,
      scene: { heading: 'INT. GLASS ATRIUM - DAY', sceneNumber: 2, action: 'PIPER sweeps in.' },
    })

    const wardrobe = byKind(requirements, 'wardrobe')
    expect(wardrobe[0].id).toBe('wd-piper-gala')
    expect(wardrobe[0].source).toBe('scene-assigned')
  })

  it('prefers the outfit the beat plan locked in', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene: {
        heading: 'INT. SERVICE TUNNEL - NIGHT',
        sceneNumber: 1,
        beats: [
          {
            beatId: 'b1',
            kind: 'action',
            referenceSelection: {
              characterIds: ['char-piper'],
              objectRefIds: [],
              characterWardrobes: [{ characterId: 'char-piper', wardrobeId: 'wd-piper-gala' }],
            },
          },
        ],
      },
    })

    const wardrobe = byKind(requirements, 'wardrobe')
    expect(wardrobe[0].id).toBe('wd-piper-gala')
    expect(wardrobe[0].source).toBe('beat-plan')
  })

  it('flags an outfit the script has outgrown', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      characters: [
        {
          ...PIPER,
          wardrobes: [
            {
              id: 'wd-piper-default',
              name: 'Field jacket',
              isDefault: true,
              headshotUrl: 'https://example.com/wd1.png',
              needsImageRegen: true,
            },
          ],
        },
      ],
      sceneIndex: 0,
      scene: { heading: 'INT. SERVICE TUNNEL - NIGHT', sceneNumber: 1, action: 'PIPER waits.' },
    })

    expect(byKind(requirements, 'wardrobe')[0].stale).toBe(true)
  })

  it('asks for nothing when the character has no wardrobes defined', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      characters: [{ id: 'char-piper', name: 'PIPER' }],
      sceneIndex: 0,
      scene: { heading: 'INT. SERVICE TUNNEL - NIGHT', sceneNumber: 1, action: 'PIPER waits.' },
    })

    expect(byKind(requirements, 'wardrobe')).toHaveLength(0)
  })
})

describe('cross-scene usage shows what a reference pays for', () => {
  const scenes = [
    { heading: 'INT. SERVICE TUNNEL - NIGHT', sceneNumber: 1, action: 'PIPER lifts the brass lantern.' },
    { heading: 'INT. GLASS ATRIUM - DAY', sceneNumber: 2, action: 'RUIZ crosses the floor.' },
    { heading: 'INT. SERVICE TUNNEL - NIGHT', sceneNumber: 3, action: 'PIPER returns for the brass lantern.' },
  ]

  it('names the other scenes that need the same reference', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene: scenes[0],
      scenes,
    })

    const piper = requirements.find((requirement) => requirement.id === 'char-piper')
    expect(piper?.alsoUsedInScenes).toEqual([3])
  })

  it('omits the field when no other scene needs it', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 1,
      scene: scenes[1],
      scenes,
    })

    const ruiz = requirements.find((requirement) => requirement.id === 'char-ruiz')
    expect(ruiz?.alsoUsedInScenes).toBeUndefined()
  })

  it('agrees with the single-pass resolver when resolving every scene at once', () => {
    const all = resolveAllSceneReferenceRequirements({ ...baseInput, scenes })
    const perScene = scenes.map((scene, sceneIndex) =>
      resolveSceneRequiredReferences({ ...baseInput, scene, sceneIndex, scenes })
    )

    expect(all).toEqual(perScene)
  })
})

describe('the user can correct the matchers in both directions', () => {
  const scene = {
    heading: 'INT. SERVICE TUNNEL - NIGHT',
    sceneNumber: 1,
    action: 'PIPER lifts the brass lantern.',
  }

  it('drops a reference the matchers over-detected', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene,
      overrides: { removed: ['prop:obj-lantern'] },
    })

    expect(byKind(requirements, 'prop')).toHaveLength(0)
  })

  it('adds a reference the matchers missed', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene,
      overrides: { added: ['prop:obj-ledger', 'cast:char-ruiz', 'wardrobe:wd-ruiz-default'] },
    })

    expect(names(requirements, 'prop').sort()).toEqual(['brass lantern', 'leather ledger'])
    expect(names(requirements, 'cast').sort()).toEqual(['PIPER', 'RUIZ'])
    expect(byKind(requirements, 'wardrobe').map((requirement) => requirement.id)).toContain(
      'wd-ruiz-default'
    )
  })

  it('ignores an added key that names nothing in the library', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      sceneIndex: 0,
      scene,
      overrides: { added: ['prop:obj-does-not-exist', 'nonsense'] },
    })

    expect(names(requirements, 'prop')).toEqual(['brass lantern'])
  })

  it('keys overrides the same way requirements identify themselves', () => {
    const requirements = resolveSceneRequiredReferences({ ...baseInput, sceneIndex: 0, scene })
    const lantern = requirements.find((requirement) => requirement.id === 'obj-lantern')!

    expect(requirementKey(lantern)).toBe('prop:obj-lantern')
  })
})

describe('what Express References can actually draw', () => {
  const requirement = (
    over: Partial<SceneReferenceRequirement> & Pick<SceneReferenceRequirement, 'kind' | 'id'>
  ): SceneReferenceRequirement => ({
    name: over.id,
    source: 'detected',
    ...over,
  })

  it('maps the three kinds the reference batch generates', () => {
    expect(expressKindForRequirement('cast')).toBe('cast')
    expect(expressKindForRequirement('location')).toBe('location')
    expect(expressKindForRequirement('prop')).toBe('prop')
  })

  it('excludes wardrobe, which is drawn by the character wardrobe pass', () => {
    expect(expressKindForRequirement('wardrobe')).toBeNull()
  })

  it('selects only the undrawn rows a run would queue', () => {
    const selected = selectUndrawnExpressableRequirements([
      requirement({ kind: 'cast', id: 'char-piper', imageUrl: 'https://example.com/piper.png' }),
      requirement({ kind: 'cast', id: 'char-ruiz' }),
      requirement({ kind: 'location', id: 'loc-tunnel', imageUrl: '   ' }),
      requirement({ kind: 'prop', id: 'obj-ledger', imageUrl: 'https://example.com/ledger.png' }),
    ])

    expect(selected.map((entry) => entry.id)).toEqual(['char-ruiz', 'loc-tunnel'])
  })

  /**
   * An undrawn wardrobe is a real gap, but no reference batch will ever fill
   * it. Chaining on it would wait forever, so it is reported and skipped.
   */
  it('skips an undrawn wardrobe so a chained run cannot block on it', () => {
    const selected = selectUndrawnExpressableRequirements([
      requirement({ kind: 'wardrobe', id: 'wd-piper-gala', characterId: 'char-piper' }),
    ])

    expect(selected).toEqual([])
  })

  it('finds nothing to draw once the scene is fully referenced', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      objectReferences: [LEDGER],
      locationReferences: [ATRIUM],
      sceneIndex: 1,
      scene: {
        heading: 'INT. GLASS ATRIUM - DAY',
        sceneNumber: 2,
        action: 'PIPER sets the leather ledger on the table.',
      },
    })

    expect(requirements.length).toBeGreaterThan(0)
    expect(selectUndrawnExpressableRequirements(requirements)).toEqual([])
  })
})

describe('one beat is the narrowest scope a gate can have', () => {
  const scene = {
    heading: 'INT. SERVICE TUNNEL - NIGHT',
    sceneNumber: 1,
    action: 'PIPER edges past the rusted pipes, a brass lantern swinging from one hand.',
    beats: [
      {
        beatId: 'b1',
        referenceSelection: { characterIds: ['char-ruiz'], objectRefIds: ['obj-ledger'] },
      },
      {
        beatId: 'b2',
        referenceSelection: { characterIds: ['char-piper'], objectRefIds: [] },
      },
    ],
  }

  it('returns only what the beat itself names, not the rest of the scene', () => {
    const requirements = resolveBeatReferenceRequirements({
      beat: scene.beats[1],
      scene,
      sceneIndex: 0,
      ...baseInput,
    })!

    expect(names(requirements, 'cast')).toEqual(['PIPER'])
    expect(names(requirements, 'prop')).toEqual([])
  })

  it('trusts the beat over the script text, since the selection was resolved at plan time', () => {
    const requirements = resolveBeatReferenceRequirements({
      beat: scene.beats[0],
      scene,
      sceneIndex: 0,
      ...baseInput,
    })!

    expect(names(requirements, 'cast')).toEqual(['RUIZ'])
    expect(names(requirements, 'prop')).toEqual(['leather ledger'])
    expect(byKind(requirements, 'cast')[0].source).toBe('beat-plan')
  })

  /**
   * No selection means the beat was never planned, so there is nothing
   * authoritative to gate on and the caller has to fall back to the scene.
   */
  it('returns null for a beat with no saved selection', () => {
    expect(
      resolveBeatReferenceRequirements({
        beat: { beatId: 'b3' },
        scene,
        sceneIndex: 0,
        ...baseInput,
      })
    ).toBeNull()
    expect(
      resolveBeatReferenceRequirements({ beat: null, scene, sceneIndex: 0, ...baseInput })
    ).toBeNull()
  })

  it('still carries the wardrobe of whoever the beat puts on screen', () => {
    const requirements = resolveBeatReferenceRequirements({
      beat: scene.beats[1],
      scene,
      sceneIndex: 0,
      ...baseInput,
    })!

    expect(byKind(requirements, 'wardrobe').map((entry) => entry.id)).toEqual([
      'wd-piper-default',
    ])
  })
})

describe('empty and malformed input', () => {
  it('returns nothing for a missing scene', () => {
    expect(resolveSceneRequiredReferences({ ...baseInput, scene: null, sceneIndex: 0 })).toEqual([])
  })

  it('returns nothing when the library is empty', () => {
    const requirements = resolveSceneRequiredReferences({
      scene: { heading: 'INT. SERVICE TUNNEL - NIGHT', sceneNumber: 1, action: 'PIPER waits.' },
      sceneIndex: 0,
    })

    expect(requirements).toEqual([])
  })

  it('skips library rows with no id, which cannot be generated', () => {
    const requirements = resolveSceneRequiredReferences({
      ...baseInput,
      objectReferences: [{ ...LANTERN, id: '' }],
      sceneIndex: 0,
      scene: { heading: 'INT. SERVICE TUNNEL - NIGHT', sceneNumber: 1, action: 'PIPER lifts the brass lantern.' },
    })

    expect(byKind(requirements, 'prop')).toHaveLength(0)
  })
})
