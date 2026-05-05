/**
 * One-shot, idempotent migration that converts a project with the legacy
 * "flat dialogue + production segments" shape into the new segmented-script
 * shape.
 *
 * Inputs read:
 *   - metadata.visionPhase.script.script.scenes[].dialogue / narration / sfx
 *   - metadata.visionPhase.production.scenes[sceneId].segments[]
 *   - metadata.visionPhase.translations[lang][sceneIdx]
 *   - per-scene dialogueAudio[lang] (positional)
 *
 * Outputs written (in-place on a deep clone):
 *   - script.scenes[i].segments[]: ScriptSegment[]
 *     -> dialogue: DialogueLine[] with stable lineIds, narrator inline
 *     -> sfx:      SegmentSFX[]   with stable sfxIds
 *   - dialogueAudio[lang][]: now carries { lineId, dialogueIndex, kind, ... }
 *   - translations[lang][sceneIdx].dialogueByLineId / sfxByLineId
 *   - metadata.visionPhase.scriptSegmentMigratedAt = ISO
 *
 * The legacy fields (`dialogue`, `sfx`, `narration`, positional translations)
 * are KEPT so any consumer that hasn't been updated still works during the
 * migration window.
 */

import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import {
  bumpProductionStreamSourceHashes,
  hashScriptSegments,
  syncProductionSegmentsFromScript,
} from '@/lib/scene/syncProductionSegments'
import {
  buildSegmentSfx,
  enforceOneSentencePerLine,
  normalizeDialogueToCompleteSentenceLines,
  mintLineId,
  mintSegmentId,
  quantizeAndResequence,
} from '@/lib/script/segmentScript'
import {
  DialogueAudioEntry,
  DialogueLine,
  NARRATOR_CHARACTER,
  NARRATOR_CHARACTER_ID,
  ScriptSegment,
  SegmentSFX,
  SegmentTransitionType,
} from '@/lib/script/segmentTypes'
import { allocateVeoSplitDurations, snapToVeoDuration } from '@/lib/scene/veoDuration'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface MigrateResult {
  /** Deep-cloned, migrated metadata. Safe to PUT to the project endpoint. */
  metadata: Record<string, any>
  /** Number of scenes that gained segments[]. */
  migratedSceneCount: number
  /** Number of pre-existing scenes already in the segmented shape. */
  alreadyMigratedSceneCount: number
  /** Audio entries that were rewritten to include lineId. */
  audioEntriesRewritten: number
  /** Translation entries written into dialogueByLineId. */
  translationLinesWritten: number
  /** True if any change was made (i.e. caller should persist). */
  changed: boolean
}

const MIGRATION_FLAG_KEY = 'scriptSegmentMigratedAt'

/**
 * Returns true if this project has already been migrated.
 */
export function isProjectMigrated(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false
  const visionPhase = (metadata as any).visionPhase
  if (!visionPhase || typeof visionPhase !== 'object') return false
  return typeof visionPhase[MIGRATION_FLAG_KEY] === 'string' && visionPhase[MIGRATION_FLAG_KEY].length > 0
}

/**
 * Idempotent: if every scene already has `segments[]`, no work is done.
 */
export function migrateProjectToSegmented(metadata: unknown): MigrateResult {
  const empty: MigrateResult = {
    metadata: (metadata && typeof metadata === 'object' ? deepClone(metadata) : {}) as Record<string, any>,
    migratedSceneCount: 0,
    alreadyMigratedSceneCount: 0,
    audioEntriesRewritten: 0,
    translationLinesWritten: 0,
    changed: false,
  }
  if (!metadata || typeof metadata !== 'object') return empty

  const cloned = deepClone(metadata) as Record<string, any>
  const visionPhase = (cloned.visionPhase ?? (cloned.visionPhase = {})) as Record<string, any>
  const script = visionPhase.script
  const sceneList = readScriptScenes(script)
  if (!sceneList) return { ...empty, metadata: cloned }

  // For lookup of production segments by sceneId, we use the same resolver
  // that Final Cut uses so legacy `sceneProductionState` is also honored.
  const productionByScene = getSceneProductionStateFromMetadata(cloned) as Record<string, any>

  let migratedSceneCount = 0
  let alreadyMigratedSceneCount = 0
  let audioEntriesRewritten = 0
  let translationLinesWritten = 0

  for (let sceneIdx = 0; sceneIdx < sceneList.length; sceneIdx++) {
    const scene = sceneList[sceneIdx]
    if (!scene || typeof scene !== 'object') continue

    if (Array.isArray(scene.segments) && scene.segments.length > 0) {
      alreadyMigratedSceneCount++
      continue
    }

    const sceneId = resolveSceneId(scene, sceneIdx)
    const productionData = sceneId ? productionByScene[sceneId] : undefined
    const productionSegments = readProductionSegments(productionData)

    const buildResult = buildSegmentsForScene(scene, productionSegments)
    if (buildResult.segments.length === 0) {
      // Nothing to migrate (empty scene). Still note the flag so we don't keep retrying.
      continue
    }

    scene.segments = buildResult.segments
    migratedSceneCount++

    if (buildResult.dialogueIndexToLineId.size > 0) {
      audioEntriesRewritten += rewriteDialogueAudioForScene(scene, buildResult)
    }
    translationLinesWritten += rewriteTranslationsForScene(
      visionPhase,
      sceneIdx,
      buildResult
    )

    // Reflect script-side segments into production state so the Action tab,
    // Director's Console and Final Cut all see segments by stable segmentId
    // immediately after migration.
    if (sceneId) {
      syncProductionForScene(visionPhase, sceneId, scene)
    }
  }

  // Mirror the migrated scenes back into the optional `visionPhase.scenes`
  // shorthand array if it exists (the vision page mirrors them on save).
  if (Array.isArray(visionPhase.scenes)) {
    visionPhase.scenes = sceneList
  }
  if (script && typeof script === 'object') {
    if (script.script && typeof script.script === 'object') {
      script.script.scenes = sceneList
    } else {
      script.scenes = sceneList
    }
  }

  const changed = migratedSceneCount > 0 || audioEntriesRewritten > 0 || translationLinesWritten > 0
  if (changed) {
    visionPhase[MIGRATION_FLAG_KEY] = new Date().toISOString()
  } else if (alreadyMigratedSceneCount > 0 && !visionPhase[MIGRATION_FLAG_KEY]) {
    visionPhase[MIGRATION_FLAG_KEY] = new Date().toISOString()
  }

  return {
    metadata: cloned,
    migratedSceneCount,
    alreadyMigratedSceneCount,
    audioEntriesRewritten,
    translationLinesWritten,
    changed,
  }
}

// ---------------------------------------------------------------------------
// Per-scene migration
// ---------------------------------------------------------------------------

interface SceneBuildResult {
  segments: ScriptSegment[]
  /** Maps a flat dialogue index (0-based) to the new lineId for back-compat. */
  dialogueIndexToLineId: Map<number, string>
  /** Lines minted from the legacy `narration` string (kind: 'narration'). */
  narrationLineIds: string[]
  /** Map raw SFX index -> new sfxId. */
  sfxIndexToSfxId: Map<number, string>
}

function buildSegmentsForScene(scene: any, productionSegments: any[] | null): SceneBuildResult {
  const dialogueIndexToLineId = new Map<number, string>()
  const sfxIndexToSfxId = new Map<number, string>()
  const narrationLineIds: string[] = []

  // 1. Build per-dialogue-index DialogueLine entries by splitting multi-sentence
  //    raw lines. The first sentence inherits the original index's lineId so
  //    that legacy positional consumers still resolve.
  const dialogueLinesByIndex = new Map<number, DialogueLine[]>()
  const flatDialogue: any[] = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const normalizedLegacyDialogue = normalizeDialogueToCompleteSentenceLines(
    flatDialogue.map((d, i) => ({ ...d, __legacyIndex: i, __sourceIndexes: [i] }))
  )
  normalizedLegacyDialogue.forEach((d) => {
    const lines = legacyDialogueEntryToLines(d, scene)
    if (lines.length === 0) return
    const sourceIndexes = Array.isArray(d?.__sourceIndexes)
      ? d.__sourceIndexes.filter((x: any) => Number.isInteger(x))
      : Number.isInteger(d?.__legacyIndex)
      ? [d.__legacyIndex]
      : []
    sourceIndexes.forEach((sourceIdx) => {
      dialogueLinesByIndex.set(sourceIdx, lines)
      if (!dialogueIndexToLineId.has(sourceIdx)) {
        dialogueIndexToLineId.set(sourceIdx, lines[0].lineId)
      }
    })
  })

  // 2. Narration lines are minted up-front from scene.narration.
  const narratorLines: DialogueLine[] = []
  if (typeof scene.narration === 'string' && scene.narration.trim().length > 0) {
    const narratorRaw = scene.narration.trim()
    const split = enforceOneSentencePerLine([
      {
        segmentId: 'tmp',
        sequenceIndex: 0,
        startTime: 0,
        endTime: 10,
        segmentDirection: '',
        dialogue: [
          {
            lineId: mintLineId(),
            character: NARRATOR_CHARACTER,
            characterId: NARRATOR_CHARACTER_ID,
            line: narratorRaw,
            kind: 'narration',
          },
        ],
        sfx: [],
      },
    ])[0].dialogue
    narratorLines.push(...split)
    narratorLines.forEach((ln) => narrationLineIds.push(ln.lineId))
  }

  // 3. Build SFX list with stable sfxIds. We thread `legacyIndex` so existing
  //    positional audio handlers (`scene.sfxAudio[idx]`) keep working.
  const flatSfx: any[] = Array.isArray(scene.sfx) ? scene.sfx : []
  const allSfx: SegmentSFX[] = flatSfx.map((s, idx) => {
    const description =
      typeof s === 'string'
        ? s
        : s?.description || s?.text || s?.name || ''
    const sfx: SegmentSFX = {
      ...buildSegmentSfx(description, {
        time: typeof s?.time === 'number' ? s.time : undefined,
      }),
      legacyIndex: idx,
    }
    sfxIndexToSfxId.set(idx, sfx.sfxId)
    return sfx
  })

  // 4. Build deterministic script-owned segments:
  //    - one dialogue/narration line per segment
  //    - lines longer than 12s become continuation segments
  //    - SFX mapped by sourceLineId/time/legacy position
  const lineToExistingSegmentId = new Map<string, string>()
  if (productionSegments && productionSegments.length > 0) {
    for (const ps of productionSegments) {
      if (!ps || typeof ps !== 'object' || typeof ps.segmentId !== 'string') continue
      const ids: string[] = Array.isArray(ps.dialogueLineIds) ? ps.dialogueLineIds : []
      for (const id of ids) {
        const m = /^dialogue-(\d+)$/.exec(typeof id === 'string' ? id : '')
        if (!m) continue
        const dIdx = parseInt(m[1], 10)
        const lineId = dialogueIndexToLineId.get(dIdx)
        if (lineId && !lineToExistingSegmentId.has(lineId)) {
          lineToExistingSegmentId.set(lineId, ps.segmentId)
        }
      }
    }
  }

  const allDialogue: DialogueLine[] = []
  if (narratorLines.length > 0) allDialogue.push(...narratorLines)
  Array.from(dialogueLinesByIndex.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([, lines]) => allDialogue.push(...lines))

  if (allDialogue.length === 0 && allSfx.length === 0) {
    return {
      segments: [],
      dialogueIndexToLineId,
      narrationLineIds,
      sfxIndexToSfxId,
    }
  }

  const builtSegments: ScriptSegment[] = []
  const sceneDirectionBase = typeof scene.action === 'string' ? scene.action : ''
  for (let i = 0; i < allDialogue.length; i++) {
    const line = allDialogue[i]
    const estimatedSeconds = estimateLineDurationSeconds(line.line)
    const splitDurations = estimatedSeconds > 12
      ? allocateVeoSplitDurations(estimatedSeconds, 12)
      : [snapToVeoDuration(estimatedSeconds)]

    for (let partIdx = 0; partIdx < splitDurations.length; partIdx++) {
      const isContinuation = partIdx > 0
      const transitionType: SegmentTransitionType = (i === 0 && !isContinuation) ? 'CUT' : 'CONTINUE'
      const baseSegmentId = lineToExistingSegmentId.get(line.lineId) || mintSegmentId()
      const segmentId = isContinuation ? `${baseSegmentId}_c${partIdx + 1}` : baseSegmentId
      builtSegments.push({
        segmentId,
        sequenceIndex: builtSegments.length,
        startTime: 0,
        endTime: splitDurations[partIdx],
        segmentDirection: isContinuation
          ? `${sceneDirectionBase} (continuation ${partIdx + 1}/${splitDurations.length})`.trim()
          : sceneDirectionBase,
        transitionType,
        dialogue: [line],
        sfx: [],
        references: {
          startFrameDescription: null,
          endFrameDescription: null,
          characterIds: line.characterId ? [line.characterId] : [],
        },
      })
    }
  }

  // Scene with SFX but no dialogue: create one SFX-only segment per cue.
  if (builtSegments.length === 0 && allSfx.length > 0) {
    for (let i = 0; i < allSfx.length; i++) {
      builtSegments.push({
        segmentId: mintSegmentId(),
        sequenceIndex: i,
        startTime: 0,
        endTime: 6,
        segmentDirection: sceneDirectionBase,
        transitionType: i === 0 ? 'CUT' : 'CONTINUE',
        dialogue: [],
        sfx: [allSfx[i]],
        references: {
          startFrameDescription: null,
          endFrameDescription: null,
          characterIds: [],
        },
      })
    }
  }

  const quantized = quantizeAndResequence(builtSegments)
  assignSfxToLineSegments(quantized, allSfx, allDialogue)
  return {
    segments: enforceOneSentencePerLine(quantized),
    dialogueIndexToLineId,
    narrationLineIds,
    sfxIndexToSfxId,
  }
}

// ---------------------------------------------------------------------------
// Audio rewrite
// ---------------------------------------------------------------------------

function rewriteDialogueAudioForScene(scene: any, build: SceneBuildResult): number {
  if (!scene.dialogueAudio) return 0
  let rewritten = 0

  // Two legacy shapes are possible:
  //   - Array<DialogueAudioEntry>     (no language partitioning)
  //   - Record<lang, DialogueAudioEntry[]>
  if (Array.isArray(scene.dialogueAudio)) {
    rewritten += stampDialogueAudioArray(scene.dialogueAudio, build)
  } else if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object') {
    for (const lang of Object.keys(scene.dialogueAudio)) {
      const arr = scene.dialogueAudio[lang]
      if (Array.isArray(arr)) {
        rewritten += stampDialogueAudioArray(arr, build)
      }
    }
  }

  // Fold legacy narrationAudio into dialogueAudio[lang] under the first
  // narrator lineId so the new code path can play it back. Only do this when
  // we successfully minted at least one narrator line during this migration.
  if (build.narrationLineIds.length > 0) {
    rewritten += foldNarrationAudio(scene, build.narrationLineIds[0])
  }

  return rewritten
}

function stampDialogueAudioArray(arr: DialogueAudioEntry[], build: SceneBuildResult): number {
  let rewritten = 0
  for (const entry of arr) {
    if (!entry || typeof entry !== 'object') continue
    if (entry.lineId) continue
    const idx =
      typeof entry.dialogueIndex === 'number'
        ? entry.dialogueIndex
        : null
    if (idx === null) continue
    const lineId = build.dialogueIndexToLineId.get(idx)
    if (!lineId) continue
    entry.lineId = lineId
    if (!entry.kind) entry.kind = 'dialogue'
    rewritten++
  }
  return rewritten
}

function foldNarrationAudio(scene: any, narratorLineId: string): number {
  const narrationAudio = scene.narrationAudio
  const narrationAudioUrl = scene.narrationAudioUrl
  if (!narrationAudio && !narrationAudioUrl) return 0

  ensureDialogueAudioContainer(scene)

  let rewritten = 0
  // Single URL form (legacy).
  if (typeof narrationAudioUrl === 'string' && narrationAudioUrl.length > 0) {
    pushOrReplaceDialogueAudio(scene.dialogueAudio.en, {
      lineId: narratorLineId,
      character: NARRATOR_CHARACTER,
      characterId: NARRATOR_CHARACTER_ID,
      kind: 'narration',
      audioUrl: narrationAudioUrl,
    })
    rewritten++
  }
  // Map form: { [lang]: string | { audioUrl, ... } }
  if (narrationAudio && typeof narrationAudio === 'object') {
    for (const lang of Object.keys(narrationAudio)) {
      const value = narrationAudio[lang]
      const audioUrl = typeof value === 'string' ? value : value?.audioUrl
      if (typeof audioUrl !== 'string' || audioUrl.length === 0) continue
      ensureDialogueAudioLanguage(scene, lang)
      pushOrReplaceDialogueAudio(scene.dialogueAudio[lang], {
        lineId: narratorLineId,
        character: NARRATOR_CHARACTER,
        characterId: NARRATOR_CHARACTER_ID,
        kind: 'narration',
        audioUrl,
      })
      rewritten++
    }
  }
  return rewritten
}

function ensureDialogueAudioContainer(scene: any) {
  if (Array.isArray(scene.dialogueAudio)) {
    // Promote array to { en: [...] }
    scene.dialogueAudio = { en: scene.dialogueAudio }
  } else if (!scene.dialogueAudio || typeof scene.dialogueAudio !== 'object') {
    scene.dialogueAudio = {}
  }
  if (!Array.isArray(scene.dialogueAudio.en)) scene.dialogueAudio.en = []
}

function ensureDialogueAudioLanguage(scene: any, lang: string) {
  ensureDialogueAudioContainer(scene)
  if (!Array.isArray(scene.dialogueAudio[lang])) scene.dialogueAudio[lang] = []
}

function pushOrReplaceDialogueAudio(arr: DialogueAudioEntry[], entry: DialogueAudioEntry) {
  const existing = arr.findIndex((e) => e?.lineId === entry.lineId)
  if (existing >= 0) {
    arr[existing] = { ...arr[existing], ...entry }
  } else {
    arr.push(entry)
  }
}

// ---------------------------------------------------------------------------
// Translation rewrite
// ---------------------------------------------------------------------------

function rewriteTranslationsForScene(
  visionPhase: Record<string, any>,
  sceneIdx: number,
  build: SceneBuildResult
): number {
  const translations = visionPhase.translations
  if (!translations || typeof translations !== 'object') return 0

  let written = 0
  for (const lang of Object.keys(translations)) {
    const sceneTranslations = translations[lang]?.[sceneIdx]
    if (!sceneTranslations || typeof sceneTranslations !== 'object') continue

    const dialogueByLineId: Record<string, string> = sceneTranslations.dialogueByLineId || {}
    const dialogueArr: any[] = Array.isArray(sceneTranslations.dialogue) ? sceneTranslations.dialogue : []

    dialogueArr.forEach((text, idx) => {
      const lineId = build.dialogueIndexToLineId.get(idx)
      if (!lineId) return
      if (typeof text !== 'string' || text.length === 0) return
      if (dialogueByLineId[lineId]) return
      dialogueByLineId[lineId] = text
      written++
    })

    // Fold legacy `narration` into the first narrator lineId.
    if (
      typeof sceneTranslations.narration === 'string' &&
      sceneTranslations.narration.length > 0 &&
      build.narrationLineIds.length > 0
    ) {
      const firstId = build.narrationLineIds[0]
      if (!dialogueByLineId[firstId]) {
        dialogueByLineId[firstId] = sceneTranslations.narration
        written++
      }
    }

    sceneTranslations.dialogueByLineId = dialogueByLineId
  }
  return written
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function syncProductionForScene(visionPhase: any, sceneId: string, scene: any) {
  const production = (visionPhase.production ??= {})
  const scenes = (production.scenes ??= {})
  const current = scenes[sceneId] && typeof scenes[sceneId] === 'object'
    ? scenes[sceneId]
    : { isSegmented: true, targetSegmentDuration: 10, segments: [], lastGeneratedAt: null }

  const sync = syncProductionSegmentsFromScript(scene.segments, current, { dropOrphans: true })
  const newHash = hashScriptSegments(scene.segments)

  scenes[sceneId] = {
    ...current,
    isSegmented: true,
    segments: sync.segments,
    productionStreams: bumpProductionStreamSourceHashes(current.productionStreams, newHash),
  }
}

function readScriptScenes(script: any): any[] | null {
  if (!script || typeof script !== 'object') return null
  if (Array.isArray(script.script?.scenes)) return script.script.scenes
  if (Array.isArray(script.scenes)) return script.scenes
  return null
}

function readProductionSegments(productionData: any): any[] | null {
  if (!productionData || typeof productionData !== 'object') return null
  const segs = productionData.segments
  if (Array.isArray(segs) && segs.length > 0) return segs
  return null
}

function resolveSceneId(scene: any, sceneIdx: number): string | null {
  if (typeof scene?.id === 'string' && scene.id.length > 0) return scene.id
  if (typeof scene?.sceneId === 'string' && scene.sceneId.length > 0) return scene.sceneId
  if (typeof scene?.sceneNumber === 'number') return String(scene.sceneNumber)
  return String(sceneIdx + 1)
}

function legacyDialogueEntryToLines(d: any, _scene: any): DialogueLine[] {
  const character: string =
    (typeof d?.character === 'string' && d.character) ||
    (typeof d?.name === 'string' && d.name) ||
    ''
  const text: string =
    (typeof d?.line === 'string' && d.line) ||
    (typeof d?.text === 'string' && d.text) ||
    (typeof d?.dialogue === 'string' && d.dialogue) ||
    ''
  if (!text) return []
  const characterId =
    typeof d?.characterId === 'string' ? d.characterId : undefined
  const voiceDirection =
    typeof d?.emotion === 'string' && d.emotion
      ? d.emotion
      : typeof d?.voiceDirection === 'string'
      ? d.voiceDirection
      : undefined

  // The first sentence of a multi-sentence legacy entry inherits the
  // pre-existing id (if any) so audio entries that already cite a `lineId`
  // remain valid.
  const firstLineId =
    typeof d?.id === 'string' && d.id.length > 0
      ? d.id
      : typeof d?.lineId === 'string' && d.lineId.length > 0
      ? d.lineId
      : mintLineId()

  // Use enforceOneSentencePerLine via a temporary segment.
  const tmp = enforceOneSentencePerLine([
    {
      segmentId: 'tmp',
      sequenceIndex: 0,
      startTime: 0,
      endTime: 0,
      segmentDirection: '',
      dialogue: [
        {
          lineId: firstLineId,
          character,
          characterId,
          kind: 'dialogue',
          line: text,
          voiceDirection,
        },
      ],
      sfx: [],
    },
  ])[0].dialogue

  return tmp
}

function assignSfxToLineSegments(
  segments: ScriptSegment[],
  sfx: SegmentSFX[],
  orderedDialogue: DialogueLine[]
) {
  if (!sfx.length || !segments.length) return
  const firstSegmentByLineId = new Map<string, ScriptSegment>()
  for (const seg of segments) {
    const lineId = seg.dialogue[0]?.lineId
    if (lineId && !firstSegmentByLineId.has(lineId)) {
      firstSegmentByLineId.set(lineId, seg)
    }
  }

  const byLegacyIndex = new Map<number, string>()
  orderedDialogue.forEach((line, idx) => byLegacyIndex.set(idx, line.lineId))

  for (const cue of sfx) {
    // 1) Source line id explicitly provided.
    if (cue.sourceLineId) {
      const seg = firstSegmentByLineId.get(cue.sourceLineId)
      if (seg) {
        seg.sfx.push(cue)
        continue
      }
    }

    // 2) Legacy positional cue index maps to same dialogue index.
    if (typeof cue.legacyIndex === 'number' && byLegacyIndex.has(cue.legacyIndex)) {
      const lineId = byLegacyIndex.get(cue.legacyIndex)!
      const seg = firstSegmentByLineId.get(lineId)
      if (seg) {
        seg.sfx.push(cue)
        continue
      }
    }

    // 3) Timeline-based routing when cue.time exists.
    if (typeof cue.time === 'number') {
      let target = segments[0]
      for (const seg of segments) {
        if (cue.time >= seg.startTime && cue.time < seg.endTime) {
          target = seg
          break
        }
        if (cue.time >= seg.endTime) target = seg
      }
      target.sfx.push(cue)
      continue
    }

    // 4) Default script order: attach by modulo to preserve all cues.
    const fallbackIdx = Math.min(segments.length - 1, cue.legacyIndex ?? 0)
    segments[fallbackIdx]?.sfx.push(cue)
  }
}

function estimateLineDurationSeconds(line: string): number {
  const text = String(line || '').trim()
  if (!text) return 4
  const words = text.split(/\s+/).filter(Boolean).length
  const punctuationPauses = (text.match(/[,:;…]/g)?.length || 0) * 0.25
  // Conversational baseline ~2.3 words/sec + pause weight.
  const seconds = words / 2.3 + punctuationPauses + 0.5
  return Math.max(4, Math.min(40, seconds))
}

function normalizeTransitionType(input: any): SegmentTransitionType {
  const s = String(input || '').toUpperCase()
  if (s === 'CUT' || s === 'CONTINUE' || s === 'DISSOLVE' || s === 'FADE') {
    return s as SegmentTransitionType
  }
  return 'CUT'
}

function clampDuration(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 10
  return snapToVeoDuration(value)
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // fallthrough
    }
  }
  return JSON.parse(JSON.stringify(value)) as T
}
