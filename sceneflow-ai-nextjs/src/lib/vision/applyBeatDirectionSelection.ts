/**
 * Save a beat's direction and reference selection together, then refresh the
 * persisted still and clip prompts the same way the direction editor does.
 */

import { refreshSceneSegmentVideoPrompts } from '@/lib/scene/syncBeatVideoPrompt'
import { applyBeatsToScene, getSceneBeats } from '@/lib/script/beatMigration'
import { beatStillDirectionFingerprint } from '@/lib/script/beatDirectionFingerprint'
import type { BeatDirection, BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'
import { restampPreVisHashIfScriptCurrent } from '@/lib/storyboard/preVisSync'
import { syncBeatStillPromptToDirection } from '@/lib/storyboard/syncBeatStillPrompt'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'

export interface BeatDirectionSelectionUpdate {
  sceneIndex: number
  beatId: string
  direction: BeatDirection | undefined
  referenceSelection: BeatReferenceSelection | null
}

export function applyBeatDirectionSelections(
  scenes: Array<Record<string, unknown>>,
  updates: BeatDirectionSelectionUpdate[],
  options: {
    artStyleAnchor?: string
    lookbook?: ProjectLookbook
    updatedAt?: string
  } = {}
): Array<Record<string, unknown>> {
  const byScene = new Map<number, BeatDirectionSelectionUpdate[]>()
  for (const update of updates) {
    const list = byScene.get(update.sceneIndex) ?? []
    list.push(update)
    byScene.set(update.sceneIndex, list)
  }
  const updatedAt = options.updatedAt ?? new Date().toISOString()

  return scenes.map((scene, sceneIndex) => {
    const batch = byScene.get(sceneIndex)
    if (!batch?.length) return scene
    let withBeats: Record<string, unknown> = scene
    for (const update of batch) {
      const keptFrame = update.direction?.framePrompt?.trim() ?? ''
      const beats = getSceneBeats(withBeats).map((entry) => {
        if (entry.beatId !== update.beatId) return entry
        const patched: SceneBeat = { ...entry }
        if (update.direction && Object.keys(update.direction).length > 0) {
          patched.beatDirection = {
            ...update.direction,
            generatedBy: 'user',
            updatedAt,
          }
        } else {
          delete patched.beatDirection
        }
        if (update.referenceSelection) patched.referenceSelection = update.referenceSelection
        else delete patched.referenceSelection
        return syncBeatStillPromptToDirection(patched, {
          sceneIndex,
          artStyleAnchor: options.artStyleAnchor,
          lookbook: options.lookbook,
        })
      })
      const edited = beats.find((entry) => entry.beatId === update.beatId)
      withBeats = applyBeatsToScene(withBeats, beats)
      if (edited) {
        withBeats = refreshSceneSegmentVideoPrompts(withBeats, edited, {
          artStyleId: options.artStyleAnchor,
        })
      }
      if (keptFrame) {
        const restored = getSceneBeats(withBeats).map((entry) => {
          if (entry.beatId !== update.beatId) return entry
          const beatDirection = entry.beatDirection
            ? { ...entry.beatDirection, framePrompt: keptFrame }
            : entry.beatDirection
          return {
            ...entry,
            beatDirection,
            storyboardImagePrompt: keptFrame,
            storyboardImagePromptDirectionKey: beatStillDirectionFingerprint(beatDirection),
          }
        })
        withBeats = applyBeatsToScene(withBeats, restored)
      }
    }
    return restampPreVisHashIfScriptCurrent(scene, withBeats)
  })
}
