import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  disconnectCharacterReference,
  selectCharacterWardrobe,
} from '@/lib/vision/beatReferenceConnections'
import {
  mergeCharacterWardrobeSelections,
  resolveBeatElementSelection,
  resolveBeatVideoReferences,
} from '@/lib/vision/resolveBeatVideoReferences'
import {
  boundBeatReferenceSelection,
  saveDirectorPatchToScenes,
  selectionFromBeat,
} from '@/lib/vision/saveBeatDirection'
import { resolveVerifiedBeatRefsForApi } from '@/lib/vision/beatFrameGenerationContext'
import { listAllFrameEditCharacterReferences } from '@/lib/vision/resolveFrameEditCharacterReferences'
import { buildBeatBoundContinuity } from '@/lib/vision/shotDirectionBatch'
import { getUiSandboxProject } from '@/lib/demo/uiSandboxProject'
import type { BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'

function readSource(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), 'utf8')
}

const CHARACTERS = [
  {
    id: 'char-elara',
    name: 'Elara Vance',
    type: 'character',
    referenceImage: 'https://cdn.example/elara-id.jpg',
    defaultWardrobe: 'Slate-gray wool trench coat',
    wardrobes: [
      {
        id: 'wardrobe-elara-1',
        name: 'Archive Duty Trench',
        description: 'Tailored slate-gray wool trench coat over charcoal mock-neck',
        sceneNumbers: [1],
        isDefault: true,
        fullBodyUrl: 'https://cdn.example/elara-trench.jpg',
      },
      {
        id: 'wardrobe-elara-2',
        name: 'Harbor Rain Stealth Coat',
        description: 'Matte-black waterproof storm trench with upturned collar',
        sceneNumbers: [2],
        isDefault: false,
        fullBodyUrl: 'https://cdn.example/elara-stealth.jpg',
      },
    ],
  },
  {
    id: 'char-marcus',
    name: 'Marcus Thorne',
    type: 'character',
    referenceImage: 'https://cdn.example/marcus-id.jpg',
    defaultWardrobe: 'Charcoal three-piece suit',
    wardrobes: [
      {
        id: 'wardrobe-marcus-1',
        name: 'Curator Formal Suit',
        description: 'Charcoal bespoke three-piece suit with silver pocket watch',
        sceneNumbers: [1, 2],
        isDefault: true,
        fullBodyUrl: 'https://cdn.example/marcus-suit.jpg',
      },
      {
        id: 'wardrobe-marcus-2',
        name: 'Director Evening Overcoat',
        description: 'Heavy midnight-navy cashmere overcoat over waistcoat',
        sceneNumbers: [],
        isDefault: false,
        fullBodyUrl: 'https://cdn.example/marcus-overcoat.jpg',
      },
    ],
  },
]

describe('Shot Director per-shot wardrobe selection', () => {
  it('connects character and locks specific wardrobe via selectCharacterWardrobe, then clears override cleanly', () => {
    const baseSelection: BeatReferenceSelection = {
      characterIds: ['char-marcus'],
      objectRefIds: [],
      locationRefId: 'loc-vault',
      locationVersionId: null,
      characterWardrobes: [{ characterId: 'char-marcus', wardrobeId: 'wardrobe-marcus-2' }],
      source: 'user',
      resolvedAt: '2026-11-13T00:00:00.000Z',
    }

    // 1. Selecting a wardrobe on an unconnected character auto-connects them and sets their wardrobe
    const step1 = selectCharacterWardrobe({
      direction: { shotType: 'Two-Shot', castInFrame: ['Marcus Thorne'] },
      selection: baseSelection,
      characterId: 'char-elara',
      characterName: 'Elara Vance',
      wardrobeId: 'wardrobe-elara-2',
      connectedCharacterNames: ['Marcus Thorne'],
      resolvedAt: '2026-11-13T01:00:00.000Z',
    })

    expect(step1.selection.source).toBe('user')
    expect(step1.selection.characterIds).toEqual(['char-marcus', 'char-elara'])
    expect(step1.direction.castInFrame).toEqual(['Marcus Thorne', 'Elara Vance'])
    expect(step1.selection.characterWardrobes).toEqual([
      { characterId: 'char-marcus', wardrobeId: 'wardrobe-marcus-2' },
      { characterId: 'char-elara', wardrobeId: 'wardrobe-elara-2' },
    ])

    // 2. Switching Elara's wardrobe updates only Elara's entry
    const step2 = selectCharacterWardrobe({
      direction: step1.direction,
      selection: step1.selection,
      characterId: 'char-elara',
      characterName: 'Elara Vance',
      wardrobeId: 'wardrobe-elara-1',
      connectedCharacterNames: ['Marcus Thorne', 'Elara Vance'],
      resolvedAt: '2026-11-13T02:00:00.000Z',
    })
    expect(step2.selection.characterWardrobes).toEqual([
      { characterId: 'char-marcus', wardrobeId: 'wardrobe-marcus-2' },
      { characterId: 'char-elara', wardrobeId: 'wardrobe-elara-1' },
    ])

    // 3. Reverting Elara to Scene Default (wardrobeId: null) removes her explicit override while keeping her connected
    const step3 = selectCharacterWardrobe({
      direction: step2.direction,
      selection: step2.selection,
      characterId: 'char-elara',
      characterName: 'Elara Vance',
      wardrobeId: null,
      connectedCharacterNames: ['Marcus Thorne', 'Elara Vance'],
      resolvedAt: '2026-11-13T03:00:00.000Z',
    })
    expect(step3.selection.characterIds).toEqual(['char-marcus', 'char-elara'])
    expect(step3.selection.characterWardrobes).toEqual([
      { characterId: 'char-marcus', wardrobeId: 'wardrobe-marcus-2' },
    ])

    // 4. Disconnecting Marcus removes both his characterId and wardrobe override
    const step4 = disconnectCharacterReference({
      direction: step3.direction,
      selection: step3.selection,
      characterId: 'char-marcus',
      characterName: 'Marcus Thorne',
      connectedCharacterNames: ['Marcus Thorne', 'Elara Vance'],
      resolvedAt: '2026-11-13T04:00:00.000Z',
    })
    expect(step4.selection.characterIds).toEqual(['char-elara'])
    expect(step4.selection.characterWardrobes).toEqual([])
  })

  it('merges explicit per-shot wardrobe override with scene-default wardrobe for other cast in Stills, Clips, and Bound Continuity', () => {
    const beat: SceneBeat = {
      beatId: 'b-vault-1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara Vance faces Marcus Thorne across the oak table.',
      beatDirection: {
        shotType: 'Medium Two-Shot',
        frozenMoment: 'Elara Vance faces Marcus Thorne across the oak table.',
        castInFrame: ['Elara Vance', 'Marcus Thorne'],
      },
      referenceSelection: {
        characterIds: ['char-elara', 'char-marcus'],
        objectRefIds: [],
        locationRefId: null,
        locationVersionId: null,
        // User overrode ONLY Elara to her Scene 2 stealth coat inside Scene 1!
        characterWardrobes: [{ characterId: 'char-elara', wardrobeId: 'wardrobe-elara-2' }],
        source: 'user',
        resolvedAt: '2026-11-13T05:00:00.000Z',
      },
    }
    const scene = {
      id: 'scene-1',
      sceneNumber: 1,
      heading: 'INT. SUBTERRANEAN ARCHIVE VAULT - NIGHT',
      beats: [beat],
    }

    // 1. resolveBeatElementSelection keeps Elara's override AND resolves Marcus's Scene 1 default
    const elementSel = resolveBeatElementSelection({
      scene,
      beat,
      sceneIndex: 0,
      projectCharacters: CHARACTERS,
      locationReferences: [],
      objectReferences: [],
    })
    expect(elementSel.characterWardrobes).toEqual([
      { characterId: 'char-elara', wardrobeId: 'wardrobe-elara-2' },
      { characterId: 'char-marcus', wardrobeId: 'wardrobe-marcus-1' },
    ])

    // 2. selectionFromBeat preserves ONLY the user's explicit override in BeatReferenceSelection UI state
    const uiSelection = selectionFromBeat(beat, elementSel, CHARACTERS)
    expect(uiSelection.characterWardrobes).toEqual([
      { characterId: 'char-elara', wardrobeId: 'wardrobe-elara-2' },
    ])

    // 3. Video reference resolution attaches Elara's stealth coat fullBodyUrl and Marcus's formal suit fullBodyUrl
    const videoRefs = resolveBeatVideoReferences({
      scene,
      beat,
      sceneIndex: 0,
      projectCharacters: CHARACTERS,
      locationReferences: [],
      objectReferences: [],
      includeWardrobeDiptych: false,
      includeWardrobeReferenceImages: true,
    })
    expect(videoRefs.urlList).toContain('https://cdn.example/elara-stealth.jpg')
    expect(videoRefs.urlList).toContain('https://cdn.example/marcus-suit.jpg')

    // 4. Still API payload includes both characters' resolved wardrobes
    const apiPayload = resolveVerifiedBeatRefsForApi({
      beat,
      scene,
      sceneIndex: 0,
      projectCharacters: CHARACTERS,
      locationReferences: [],
      objectReferences: [],
    })
    expect(apiPayload.characterWardrobes).toEqual([
      { characterId: 'char-elara', wardrobeId: 'wardrobe-elara-2' },
      { characterId: 'char-marcus', wardrobeId: 'wardrobe-marcus-1' },
    ])

    // 5. Shot Director Bound Continuity feeds the chosen outfit name & description to AI Still Director
    const bound = buildBeatBoundContinuity({
      scene,
      beat,
      sceneIdx: 0,
      characters: CHARACTERS,
      locationReferences: [],
      objectReferences: [],
    })
    expect(bound?.wardrobes).toEqual([
      {
        characterName: 'Elara Vance',
        wardrobeName: 'Harbor Rain Stealth Coat',
        description: 'Matte-black waterproof storm trench with upturned collar',
      },
      {
        characterName: 'Marcus Thorne',
        wardrobeName: 'Curator Formal Suit',
        description: 'Charcoal bespoke three-piece suit with silver pocket watch',
      },
    ])

    // 6. Refine Current Frame inside Shot Director receives Elara's overridden wardrobe image
    const editRefs = listAllFrameEditCharacterReferences({
      scene,
      sceneIndex: 0,
      characters: CHARACTERS as unknown as Array<Record<string, unknown>>,
      characterWardrobes: elementSel.characterWardrobes,
    })
    const elaraEditRef = editRefs.find((r) => r.characterName === 'Elara Vance')
    expect(elaraEditRef?.wardrobeImageUrl).toBe('https://cdn.example/elara-stealth.jpg')
  })

  it('preserves empty characterWardrobes when user explicitly reverts to Scene Default and preserves overrides across saveDirectorPatchToScenes', () => {
    const revertedBeat: SceneBeat = {
      beatId: 'b-vault-2',
      sequenceIndex: 1,
      kind: 'action',
      actionDescription: 'Elara Vance examines the codex.',
      beatDirection: {
        shotType: 'Close-Up',
        frozenMoment: 'Elara Vance examines the codex.',
        castInFrame: ['Elara Vance'],
      },
      referenceSelection: {
        characterIds: ['char-elara'],
        objectRefIds: [],
        locationRefId: null,
        locationVersionId: null,
        characterWardrobes: [],
        source: 'user',
        resolvedAt: '2026-11-13T06:00:00.000Z',
      },
    }
    const scene = { id: 'scene-1', sceneNumber: 1, beats: [revertedBeat] }
    const elementSel = resolveBeatElementSelection({
      scene,
      beat: revertedBeat,
      sceneIndex: 0,
      projectCharacters: CHARACTERS,
      locationReferences: [],
      objectReferences: [],
    })
    // Effective wardrobe still resolves Scene 1 default for generation...
    expect(elementSel.characterWardrobes).toEqual([
      { characterId: 'char-elara', wardrobeId: 'wardrobe-elara-1' },
    ])
    // ...while UI selection keeps [] so dropdown stays on "Scene default"
    const uiSelection = selectionFromBeat(revertedBeat, elementSel, CHARACTERS)
    expect(uiSelection.characterWardrobes).toEqual([])

    // Now test saving a Shot Director patch with an explicit wardrobe lock
    const lockedSelection: BeatReferenceSelection = {
      ...uiSelection,
      characterWardrobes: [{ characterId: 'char-elara', wardrobeId: 'wardrobe-elara-2' }],
    }
    const updatedScenes = saveDirectorPatchToScenes({
      scenes: [scene],
      sceneIdx: 0,
      beatId: 'b-vault-2',
      patch: {
        shotType: 'Medium Close-Up',
        frozenMoment: 'Elara Vance lifts the quartz plate toward the amber lamp.',
        castInFrame: ['Elara Vance'],
      },
      referenceSelection: lockedSelection,
      characters: CHARACTERS,
      objectReferences: [],
    })
    const savedBeat = updatedScenes[0].beats[0] as SceneBeat
    expect(savedBeat.referenceSelection?.characterWardrobes).toEqual([
      { characterId: 'char-elara', wardrobeId: 'wardrobe-elara-2' },
    ])

    const boundSel = boundBeatReferenceSelection({
      scene: updatedScenes[0],
      beat: savedBeat,
      sceneIdx: 0,
      characters: CHARACTERS,
      locationReferences: [],
      objectReferences: [],
    })
    expect(boundSel.characterWardrobes).toEqual([
      { characterId: 'char-elara', wardrobeId: 'wardrobe-elara-2' },
    ])
  })

  it('wires Shot Director wardrobe selector in UI and enriches Sandbox Showcase with multiple wardrobes', () => {
    const dialog = readSource('src/components/vision/BeatDirectorDialog.tsx')
    const editor = readSource('src/components/vision/BeatDirectionEditor.tsx')
    const route = readSource('src/app/api/scene/direct-beat-still/route.ts')

    expect(dialog).toContain('onSelectCharacterWardrobe')
    expect(dialog).toContain('Wardrobe for ${character.name}')
    expect(dialog).toContain('Select wardrobe for ${character.name}')
    expect(dialog).toContain('referenceSelection,')
    expect(editor).toContain('onSelectCharacterWardrobe={selectCharacterWardrobe}')
    expect(editor).not.toContain('<select')
    expect(route).toContain('body.referenceSelection')

    const sandbox = getUiSandboxProject()
    const elara = sandbox.metadata.visionPhase.characters.find(
      (c: { id?: string }) => c.id === 'char-elara'
    )
    expect(elara?.wardrobes?.length).toBeGreaterThanOrEqual(2)
    expect(mergeCharacterWardrobeSelections([], [])).toEqual([])
  })
})
