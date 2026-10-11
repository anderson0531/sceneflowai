import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { generateSceneContentHash } from '@/lib/utils/contentHash'
import { sceneContinuityActions } from '@/lib/vision/sceneScriptReadiness'
import {
  freshBeatReferenceSelection,
  syncSceneReferenceSelections,
} from '@/lib/vision/saveBeatDirection'
import { getSceneBeats } from '@/lib/script/beatMigration'

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
      needsSceneDirection: true,
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

  it('blocks a written scene whose direction is stale and whose shots are not optimized', () => {
    expect(
      sceneContinuityActions({
        isExpanded: true,
        action: 'Mira drops the key.',
        sceneDirection: { basedOnContentHash: 'old-hash' },
        beats: [{ beatId: 'shot-1', beatDirection: { generatedBy: 'llm' } }],
      })
    ).toEqual({
      canGenerate: false,
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
  it('offers Update references and Lock direction on the scene card', () => {
    const panel = read('src/components/vision/SceneReferencesPanel.tsx')
    expect(panel).toContain('Update references')
    expect(panel).toContain('Lock direction')
    expect(panel).toContain('onSyncReferences')
    expect(panel).toContain('onLockDirection')
    expect(panel).toContain('!canGenerate')
    expect(panel).not.toContain('scriptReady')

    const scriptPanel = read('src/components/vision/ScriptPanel.tsx')
    expect(scriptPanel).toContain('sceneContinuityActions')
    expect(scriptPanel).toContain('handleSyncSceneReferences')
    expect(scriptPanel).toContain('handleLockSceneDirection')
    expect(scriptPanel).toContain("fetch('/api/scene/generate-direction'")
    expect(scriptPanel).toContain('freshBeatReferenceSelection')
  })

  it('uses the same readiness predicate before a scene reference draw', () => {
    const page = read('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain('sceneContinuityActions')
    expect(page).toContain('continuity.canGenerate')
    expect(page).not.toContain('if (scene && !isSceneScriptReadyForReferences(scene))')
  })
})
