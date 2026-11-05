import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { generateSceneContentHash, isDirectionStale } from '@/lib/utils/contentHash'
import { sceneContinuityActions } from '@/lib/vision/sceneScriptReadiness'
import {
  freshBeatReferenceSelection,
  syncSceneReferenceSelections,
} from '@/lib/vision/saveBeatDirection'
import { ensureSceneBeats, getSceneBeats } from '@/lib/script/beatMigration'
import { finalizeStructuredRevisedScene } from '@/lib/script/structuredSceneRevision'
import { getLocationMissingDirectionSceneNumbers } from '@/components/vision/LocationLibrary'

function read(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), 'utf8')
}

describe('sceneContinuityActions', () => {
  it('blocks an outline', () => {
    expect(
      sceneContinuityActions({
        isExpanded: false,
        summary: 'They arrive later.',
        action: 'Mira turns the key.',
      })
    ).toEqual({
      canGenerate: false,
      needsSceneDirection: false,
      canSyncReferences: false,
    })
  })

  it('generates from optimized shots when scene direction has not been written', () => {
    expect(
      sceneContinuityActions({
        isExpanded: true,
        action: 'Mira turns the key.',
        beats: [
          {
            beatId: 'shot-1',
            beatDirection: { generatedBy: 'director', frozenMoment: 'The key turns' },
          },
        ],
      })
    ).toMatchObject({
      canGenerate: true,
      needsSceneDirection: false,
      canSyncReferences: true,
    })
  })

  it('generates when scene direction still matches the script', () => {
    const body = { isExpanded: true, heading: 'INT. ROOM', action: 'Mira waits.' }
    expect(
      sceneContinuityActions({
        ...body,
        sceneDirection: {
          scene: { location: 'Room' },
          basedOnContentHash: generateSceneContentHash(body),
        },
      })
    ).toMatchObject({ canGenerate: true, needsSceneDirection: false })
  })

  it('marks needsSceneDirection while keeping canGenerate true on a written scene whose direction is stale and whose shots are not optimized', () => {
    expect(
      sceneContinuityActions({
        isExpanded: true,
        action: 'Mira drops the key.',
        sceneDirection: { basedOnContentHash: 'old-hash' },
        beats: [{ beatId: 'shot-1', beatDirection: { generatedBy: 'llm' } }],
      })
    ).toEqual({
      canGenerate: true,
      needsSceneDirection: true,
      canSyncReferences: true,
    })
  })
})

describe('fresh continuity selections', () => {
  const previous = {
    characterIds: ['c-old'],
    objectRefIds: ['p-old'],
    locationRefId: 'l-old',
    source: 'user' as const,
    resolvedAt: '2020-01-01T00:00:00.000Z',
  }

  it('replaces a locked plate list with the shot’s current cast', () => {
    const beat = {
      beatId: 'shot-1',
      sequenceIndex: 0,
      kind: 'action' as const,
      characterId: 'c-new',
      actionDescription: 'She waits by the door.',
      referenceSelection: previous,
    }
    const selection = freshBeatReferenceSelection({
      scene: { beats: [beat] },
      beat,
      sceneIdx: 0,
      characters: [
        { id: 'c-new', name: 'Mira' },
        { id: 'c-old', name: 'Bo' },
      ],
      locationReferences: [],
      objectReferences: [],
      resolvedAt: '2026-10-11T00:00:00.000Z',
    })

    expect(selection.characterIds).toEqual(['c-new'])
    expect(selection.characterIds).not.toContain('c-old')
    expect(selection.source).toBe('user')
    expect(selection.resolvedAt).toBe('2026-10-11T00:00:00.000Z')
  })

  it('writes that fresh list onto the scene and leaves an excluded shot alone', () => {
    const scenes = [
      {
        isExpanded: true,
        action: 'Mira waits.',
        beats: [
          {
            beatId: 'shot-1',
            characterId: 'c-new',
            actionDescription: 'She waits by the door.',
            referenceSelection: previous,
          },
          {
            beatId: 'shot-2',
            excluded: true,
            referenceSelection: previous,
          },
        ],
      },
    ]
    const next = syncSceneReferenceSelections({
      scenes,
      sceneIdx: 0,
      characters: [{ id: 'c-new', name: 'Mira' }],
      locationReferences: [],
      objectReferences: [],
      resolvedAt: '2026-10-11T00:00:00.000Z',
    })
    const [first, second] = getSceneBeats(next[0])
    expect(first.referenceSelection?.characterIds).toEqual(['c-new'])
    expect(first.referenceSelection?.source).toBe('user')
    expect(second.referenceSelection).toEqual(previous)
    expect(scenes[0].beats[0].referenceSelection).toEqual(previous)
  })
})

describe('Continuity tab controls', () => {
  it('offers unified Continuity Agent on the scene card', () => {
    const panel = read('src/components/vision/SceneReferencesPanel.tsx')
    expect(panel).toContain('Continuity Agent')
    expect(panel).not.toContain('Scene Ref Agent')
    expect(panel).toContain('!canGenerate')
    expect(panel).not.toContain('scriptReady')

    const scriptPanel = read('src/components/vision/ScriptPanel.tsx')
    expect(scriptPanel).toContain('sceneContinuityActions')
    expect(scriptPanel).toContain('syncSceneDirectionToContinuityCatalog')
  })

  it('uses the same readiness predicate and auto-updates direction + references before a scene reference draw', () => {
    const page = read('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain('sceneContinuityActions')
    expect(page).toContain('continuity.canGenerate')
    expect(page).toContain('continuity.needsSceneDirection')
    expect(page).toContain('refreshPromoSceneDirection(sceneIndex)')
    expect(page).toContain('syncSceneDirectionToContinuityCatalog')
    expect(page).not.toContain('if (scene && !isSceneScriptReadyForReferences(scene))')
  })

  it('keeps basedOnContentHash in sync across ensureSceneBeats and Scene Director revisions', () => {
    const rawScene = {
      heading: 'INT. ARCHIVE - NIGHT',
      action: 'Gideon checks the current.',
      narration: 'The loop never closes.',
      dialogue: [{ character: 'GIDEON', line: 'Every time.' }],
    }
    const ensured = ensureSceneBeats({
      ...rawScene,
      sceneDirection: {
        scene: { location: 'Archive' },
        basedOnContentHash: generateSceneContentHash(rawScene),
      },
    })
    expect(isDirectionStale(ensured)).toBe(false)

    const revised = finalizeStructuredRevisedScene(
      {
        beats: [
          {
            kind: 'action',
            actionDescription: 'Gideon slams the switch.',
            beatDirection: { shotType: 'Close-Up', frozenMoment: 'Hand on switch.' },
          },
        ],
      },
      ensured,
      ['sceneDirection'],
      { characters: [{ id: 'c1', name: 'GIDEON' }] }
    )
    expect(isDirectionStale(revised)).toBe(false)
  })

  it('flags only missing scene directions in LocationLibrary and provides an actionable Direct control', () => {
    const loc = {
      id: 'loc-1',
      location: 'ARCHIVE',
      sceneNumbers: [1, 2],
    } as any

    const scenesWithDirection = [
      {
        heading: 'INT. ARCHIVE - NIGHT',
        action: 'Gideon waits.',
        sceneDirection: { scene: { location: 'Archive' }, basedOnContentHash: 'stale-hash' },
      },
      {
        heading: 'INT. ARCHIVE - LATER',
        action: 'Gideon leaves.',
        sceneDirection: { scene: { location: 'Archive' } },
      },
    ]
    expect(getLocationMissingDirectionSceneNumbers(loc, scenesWithDirection as any)).toEqual([])

    const scenesMissingSecond = [
      scenesWithDirection[0],
      {
        heading: 'INT. ARCHIVE - LATER',
        action: 'Gideon leaves.',
      },
    ]
    expect(getLocationMissingDirectionSceneNumbers(loc, scenesMissingSecond as any)).toEqual([2])

    const locationLibrarySource = read('src/components/vision/LocationLibrary.tsx')
    expect(locationLibrarySource).not.toContain('Scene direction missing or outdated for mapped scene(s)')
    expect(locationLibrarySource).toContain('handleDirectLocationScenes')
    expect(locationLibrarySource).toContain('Generate Scene Direction')
  })
})
