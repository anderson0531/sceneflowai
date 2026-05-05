/**
 * Reflect script-side `ScriptSegment[]` into the production-state
 * `SceneSegment[]`, preserving asset/take state and detecting staleness.
 *
 * Source of truth:
 *   - Creative content (timing, direction, dialogue, sfx, frame descriptions)
 *     lives on `script.scenes[i].segments[]`.
 *   - Generation state (assets, takes, prompts, audio anchors) lives on
 *     `production.scenes[sceneId].segments[]`.
 *
 * The two are joined by `segmentId`. This helper is invoked whenever the
 * creative side changes (script generation, Edit Script save, segment
 * direction edit) so the production state stays consistent.
 */

import type { SceneProductionData } from '@/components/vision/scene-production/types'
import type {
  DialogueLine,
  ScriptSegment,
  SegmentSFX,
} from '@/lib/script/segmentTypes'

/**
 * Output of `syncProductionSegmentsFromScript`.
 */
export interface ProductionSyncResult<TSegment = any> {
  segments: TSegment[]
  /** Segment ids that did not exist before (newly created from the script). */
  createdSegmentIds: string[]
  /** Segment ids whose creative hash changed (marked isStale: true). */
  staleSegmentIds: string[]
  /** Pre-existing production segments without a matching script segment. */
  orphanSegmentIds: string[]
  /** True when any field on the production segments changed. */
  changed: boolean
}

const TRANSITION_TO_LEGACY: Record<string, 'cut' | 'dissolve' | 'fade_out'> = {
  CUT: 'cut',
  CONTINUE: 'cut',
  DISSOLVE: 'dissolve',
  FADE: 'fade_out',
}

export interface SyncOptions {
  /**
   * When true (default), production segments without a matching script
   * segment are dropped. When false, they are kept at the end of the array
   * so we can show "orphan" UI. Either way they are listed in `orphanSegmentIds`.
   */
  dropOrphans?: boolean
}

export function syncProductionSegmentsFromScript(
  scriptSegments: ScriptSegment[] | undefined,
  productionData: Partial<SceneProductionData> | null | undefined,
  options: SyncOptions = {}
): ProductionSyncResult {
  const dropOrphans = options.dropOrphans !== false
  const existing = Array.isArray(productionData?.segments)
    ? (productionData!.segments as any[])
    : []
  const existingById = new Map<string, any>()
  for (const seg of existing) {
    if (seg && typeof seg === 'object' && typeof seg.segmentId === 'string') {
      existingById.set(seg.segmentId, seg)
    }
  }

  const createdSegmentIds: string[] = []
  const staleSegmentIds: string[] = []
  let changed = false

  const merged: any[] = []

  if (Array.isArray(scriptSegments)) {
    scriptSegments.forEach((scriptSeg, idx) => {
      const prev = existingById.get(scriptSeg.segmentId)
      const dialogueLineIds = scriptSeg.dialogue.map((d) => d.lineId)
      const dialogueLines = scriptSeg.dialogue.map((d) => ({
        id: d.lineId,
        character: d.character,
        line: d.line,
      }))
      const dialogueHash = hashDialogue(scriptSeg.dialogue)
      const visualDescriptionHash = hashVisualDescription(scriptSeg)
      const sfxHash = hashSfx(scriptSeg.sfx)

      const transitionLegacy =
        TRANSITION_TO_LEGACY[scriptSeg.transitionType || 'CUT'] || 'cut'

      const baseFromScript = {
        segmentId: scriptSeg.segmentId,
        sequenceIndex: idx,
        startTime: scriptSeg.startTime,
        endTime: scriptSeg.endTime,
        transition: transitionLegacy,
        transitionType: scriptSeg.transitionType || 'CUT',
        triggerReason: undefined as string | undefined,
        endFrameDescription:
          scriptSeg.references?.endFrameDescription ?? null,
        emotionalBeat: scriptSeg.emotionalBeat,
        dialogueLineIds,
        dialogueLines,
        segmentDirection: scriptSeg.segmentDirection || null,
        // The "references" object on SceneSegment uses different keys; we
        // patch only the script-owned subset and leave urls/anchors alone.
      }

      if (!prev) {
        const created = {
          ...baseFromScript,
          status: 'DRAFT' as const,
          activeAssetUrl: null,
          assetType: null,
          generatedPrompt: undefined,
          userEditedPrompt: null,
          isStale: false,
          references: {
            startFrameUrl: null,
            endFrameUrl: null,
            useSceneFrame: idx === 0,
            characterRefs: [],
            startFrameDescription:
              scriptSeg.references?.startFrameDescription ?? null,
            characterIds: scriptSeg.references?.characterIds ?? [],
            sceneRefIds: [],
            objectRefIds: [],
          },
          takes: [],
          promptContext: {
            dialogueHash,
            visualDescriptionHash,
            generatedAt: new Date().toISOString(),
          },
        }
        merged.push(created)
        createdSegmentIds.push(scriptSeg.segmentId)
        existingById.delete(scriptSeg.segmentId)
        changed = true
        return
      }

      // Merge: keep production fields, refresh creative fields.
      const previousHash = prev.promptContext || {}
      const creativeChanged =
        previousHash.dialogueHash !== dialogueHash ||
        previousHash.visualDescriptionHash !== visualDescriptionHash ||
        previousHash.sfxHash !== sfxHash ||
        prev.startTime !== scriptSeg.startTime ||
        prev.endTime !== scriptSeg.endTime ||
        prev.segmentDirection !== scriptSeg.segmentDirection

      const nextReferences = prev.references && typeof prev.references === 'object'
        ? {
            ...prev.references,
            startFrameDescription:
              scriptSeg.references?.startFrameDescription ?? prev.references.startFrameDescription ?? null,
            characterIds:
              Array.isArray(scriptSeg.references?.characterIds) && scriptSeg.references!.characterIds!.length > 0
                ? scriptSeg.references!.characterIds
                : prev.references.characterIds ?? [],
          }
        : {
            startFrameUrl: null,
            endFrameUrl: null,
            useSceneFrame: idx === 0,
            characterRefs: [],
            startFrameDescription: scriptSeg.references?.startFrameDescription ?? null,
            characterIds: scriptSeg.references?.characterIds ?? [],
            sceneRefIds: [],
            objectRefIds: [],
          }

      const nextSegment = {
        ...prev,
        ...baseFromScript,
        references: nextReferences,
        promptContext: {
          ...previousHash,
          dialogueHash,
          visualDescriptionHash,
          sfxHash,
          generatedAt: previousHash.generatedAt || new Date().toISOString(),
        },
        isStale: creativeChanged ? true : !!prev.isStale,
      }

      if (creativeChanged) {
        staleSegmentIds.push(scriptSeg.segmentId)
        changed = true
      } else if (
        prev.dialogueLineIds?.join('|') !== dialogueLineIds.join('|') ||
        prev.sequenceIndex !== idx
      ) {
        changed = true
      }

      merged.push(nextSegment)
      existingById.delete(scriptSeg.segmentId)
    })
  }

  const orphanSegmentIds = Array.from(existingById.keys())
  if (orphanSegmentIds.length > 0) {
    changed = true
    if (!dropOrphans) {
      for (const id of orphanSegmentIds) {
        merged.push(existingById.get(id))
      }
    }
  }

  return {
    segments: merged,
    createdSegmentIds,
    staleSegmentIds,
    orphanSegmentIds,
    changed,
  }
}

// ---------------------------------------------------------------------------
// Stream staleness
// ---------------------------------------------------------------------------

/**
 * Bump `productionStreams[].sourceHash` whenever the script-side creative
 * content changes for this scene. Returns the (possibly mutated) array. Any
 * existing render outputs are preserved; downstream UIs surface "stale" via
 * the hash mismatch.
 */
export function bumpProductionStreamSourceHashes<T extends { sourceHash?: string | null }>(
  streams: T[] | undefined,
  newHash: string
): T[] {
  if (!Array.isArray(streams)) return []
  return streams.map((s) => {
    if (!s || typeof s !== 'object') return s
    if (s.sourceHash === newHash) return s
    return { ...s, sourceHash: newHash }
  })
}

/**
 * Build a deterministic hash representing the creative content of all
 * segments on a scene. Suitable for use as `productionStreams[].sourceHash`.
 */
export function hashScriptSegments(segments: ScriptSegment[] | undefined): string {
  if (!segments || segments.length === 0) return 'empty'
  const parts: string[] = []
  for (const seg of segments) {
    parts.push(seg.segmentId)
    parts.push(String(Math.round(seg.startTime * 100)))
    parts.push(String(Math.round(seg.endTime * 100)))
    parts.push(simpleHash(seg.segmentDirection || ''))
    parts.push(hashDialogue(seg.dialogue))
    parts.push(hashSfx(seg.sfx))
    parts.push(seg.transitionType || 'CUT')
  }
  return simpleHash(parts.join('|'))
}

// ---------------------------------------------------------------------------
// Hashing primitives
// ---------------------------------------------------------------------------

function hashDialogue(lines: DialogueLine[]): string {
  if (!lines?.length) return 'empty'
  const parts: string[] = []
  for (const ln of lines) {
    parts.push(ln.lineId)
    parts.push(ln.character || '')
    parts.push(ln.kind)
    parts.push(ln.line || '')
  }
  return simpleHash(parts.join('|'))
}

function hashSfx(sfx: SegmentSFX[]): string {
  if (!sfx?.length) return 'empty'
  return simpleHash(
    sfx.map((s) => `${s.sfxId}:${s.description || ''}:${s.time ?? ''}`).join('|')
  )
}

function hashVisualDescription(seg: ScriptSegment): string {
  return simpleHash(
    [
      seg.references?.startFrameDescription || '',
      seg.references?.endFrameDescription || '',
      (seg.references?.characterIds || []).join(','),
    ].join('|')
  )
}

function simpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return (hash >>> 0).toString(36)
}
