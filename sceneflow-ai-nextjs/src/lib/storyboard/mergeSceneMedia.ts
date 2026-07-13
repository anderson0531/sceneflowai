/**
 * Preserve storyboard image fields when merging stale/partial scene snapshots.
 *
 * NOTE: This module must NOT import from '@/lib/audio/cleanupAudio' — that creates a
 * runtime circular dependency (cleanupAudio imports mergeScenePreservingMedia from here),
 * which Turbopack scope-hoists into a "Cannot access X before initialization" TDZ crash.
 * mergeExpressOrchestratedScenes (the only consumer that needed the audio merge) now lives
 * in cleanupAudio.ts instead.
 */

const DIALOGUE_STORYBOARD_URL_KEYS = ['storyboardImageUrl', 'storyboardImageGcsPath'] as const
const DIALOGUE_STORYBOARD_PROMPT_KEYS = ['storyboardImagePrompt'] as const

const BEAT_STORYBOARD_URL_KEYS = [
  'storyboardImageUrl',
  'storyboardImageGcsPath',
  'storyboardEndImageUrl',
  'storyboardEndImageGcsPath',
] as const
const BEAT_STORYBOARD_PROMPT_KEYS = [
  'storyboardImagePrompt',
  'storyboardEndImagePrompt',
] as const

const SCENE_IMAGE_URL_KEYS = [
  'imageUrl',
  'imageGcsPath',
  'imageGeneratedAt',
  'imageSource',
  'sceneReferenceImageUrl',
] as const
const SCENE_IMAGE_PROMPT_KEYS = ['imagePrompt'] as const

const CUSTOM_FRAME_URL_KEYS = ['imageUrl', 'imageGcsPath'] as const
const CUSTOM_FRAME_PROMPT_KEYS = ['imagePrompt'] as const

/** True when a media URL is usable (not empty, not lite-mode placeholder). */
export function isValidStoryboardMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'deferred') return false
  return true
}

/** Extract millisecond timestamp from Vercel blob paths like `.../1779527367355.jpeg`. */
export function storyboardBlobUrlTimestamp(url: string): number {
  const match = url.match(/(\d{13})\./)
  return match ? parseInt(match[1], 10) : 0
}

function pickMediaUrl(incoming: unknown, canonical: unknown): string | undefined {
  const inc = isValidStoryboardMediaUrl(incoming) ? incoming.trim() : undefined
  const can = isValidStoryboardMediaUrl(canonical) ? canonical.trim() : undefined
  if (inc && can) {
    const ti = storyboardBlobUrlTimestamp(inc)
    const tc = storyboardBlobUrlTimestamp(can)
    if (ti && tc && ti !== tc) return ti > tc ? inc : can
  }
  if (inc) return inc
  if (can) return can
  return undefined
}

/** Prefer the newer of two storyboard media URLs (blob timestamp when available). */
export function resolvePreferredStoryboardUrl(
  urlA?: unknown,
  urlB?: unknown
): string | undefined {
  return pickMediaUrl(urlA, urlB)
}

function pickPromptText(incoming: unknown, canonical: unknown): string | undefined {
  const inc = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : undefined
  const can = typeof canonical === 'string' && canonical.trim() ? canonical.trim() : undefined
  return inc ?? can
}

function mergeMediaFields(
  merged: Record<string, unknown>,
  incoming: Record<string, unknown>,
  canonical: Record<string, unknown>,
  urlKeys: readonly string[],
  promptKeys: readonly string[]
): void {
  for (const key of urlKeys) {
    const next = pickMediaUrl(incoming[key], canonical[key])
    if (next) merged[key] = next
    else delete merged[key]
  }
  for (const key of promptKeys) {
    const next = pickPromptText(incoming[key], canonical[key])
    if (next) merged[key] = next
    else delete merged[key]
  }
}

function mergeDialogueLineMedia(canonLine: any, incomingLine: any): any {
  if (!incomingLine) return canonLine
  if (!canonLine) return incomingLine

  const merged = { ...incomingLine }
  mergeMediaFields(
    merged,
    incomingLine,
    canonLine,
    DIALOGUE_STORYBOARD_URL_KEYS,
    DIALOGUE_STORYBOARD_PROMPT_KEYS
  )
  return merged
}

/** Mirrors beatContentFingerprint in beatMigration.ts (inline to avoid circular imports). */
function beatContentChanged(canonBeat: any, incomingBeat: any): boolean {
  const norm = (b: any) =>
    b?.kind === 'action'
      ? `action|${(b?.actionDescription ?? '').trim()}`
      : `${b?.kind}|${(b?.character ?? '').trim().toUpperCase()}|${(b?.line ?? '').trim()}`
  return norm(canonBeat) !== norm(incomingBeat)
}

function mergeBeatMedia(canonBeat: any, incomingBeat: any): any {
  if (!incomingBeat) return canonBeat
  if (!canonBeat) return incomingBeat

  if (beatContentChanged(canonBeat, incomingBeat)) {
    return { ...incomingBeat }
  }

  const merged = { ...incomingBeat }
  mergeMediaFields(
    merged,
    incomingBeat,
    canonBeat,
    BEAT_STORYBOARD_URL_KEYS,
    BEAT_STORYBOARD_PROMPT_KEYS
  )
  return merged
}

function mergeBeatsArray(
  canonBeats: any[] | undefined,
  incomingBeats: any[] | undefined
): any[] | undefined {
  if (!Array.isArray(incomingBeats) || incomingBeats.length === 0) {
    return Array.isArray(canonBeats) && canonBeats.length > 0 ? canonBeats : incomingBeats
  }
  if (!Array.isArray(canonBeats) || canonBeats.length === 0) return incomingBeats

  const canonById = new Map<string, any>()
  for (const beat of canonBeats) {
    if (beat?.beatId) canonById.set(beat.beatId, beat)
  }

  return incomingBeats.map((incomingBeat, idx) => {
    const canonBeat =
      (incomingBeat?.beatId && canonById.get(incomingBeat.beatId)) || canonBeats[idx]
    return mergeBeatMedia(canonBeat, incomingBeat)
  })
}

function mergeStoryboardFrames(canonFrames: any[] | undefined, incomingFrames: any[] | undefined): any[] | undefined {
  if (!Array.isArray(incomingFrames) || incomingFrames.length === 0) {
    return Array.isArray(canonFrames) && canonFrames.length > 0 ? canonFrames : incomingFrames
  }
  if (!Array.isArray(canonFrames) || canonFrames.length === 0) return incomingFrames

  const canonById = new Map<string, any>()
  for (const frame of canonFrames) {
    if (frame?.id) canonById.set(frame.id, frame)
  }

  return incomingFrames.map((incomingFrame, idx) => {
    const canonFrame =
      (incomingFrame?.id && canonById.get(incomingFrame.id)) || canonFrames[idx]
    if (!canonFrame) return incomingFrame

    const merged = { ...incomingFrame }
    mergeMediaFields(
      merged,
      incomingFrame,
      canonFrame,
      CUSTOM_FRAME_URL_KEYS,
      CUSTOM_FRAME_PROMPT_KEYS
    )
    return merged
  })
}

function getDialogueAudioEntryUrl(entry: any): string | undefined {
  const url = entry?.audioUrl ?? entry?.url
  if (typeof url !== 'string' || !url.trim()) return undefined
  return url.trim()
}

function isManualUploadAudioUrl(url: string): boolean {
  return url.includes('/uploads/default/')
}

/** Prefer newer blob timestamp; manual uploads beat legacy dialogue paths on ties. */
export function pickDialogueAudioEntry(incoming: any, canonical: any): any {
  if (!incoming) return canonical
  if (!canonical) return incoming

  const incUrl = getDialogueAudioEntryUrl(incoming)
  const canUrl = getDialogueAudioEntryUrl(canonical)

  if (incUrl && canUrl) {
    const ti = storyboardBlobUrlTimestamp(incUrl)
    const tc = storyboardBlobUrlTimestamp(canUrl)
    if (ti && tc && ti !== tc) {
      return ti > tc ? { ...incoming, audioUrl: incUrl } : { ...canonical, audioUrl: canUrl }
    }
    const incManual = isManualUploadAudioUrl(incUrl)
    const canManual = isManualUploadAudioUrl(canUrl)
    if (incManual && !canManual) return { ...incoming, audioUrl: incUrl }
    if (canManual && !incManual) return { ...canonical, audioUrl: canUrl }
  }
  if (incUrl) return { ...incoming, audioUrl: incUrl }
  if (canUrl) return { ...canonical, audioUrl: canUrl }
  return { ...incoming }
}

function dialogueAudioEntryKeys(entry: any, arrayIndex: number): string[] {
  const keys: string[] = []
  if (typeof entry?.lineId === 'string' && entry.lineId.trim()) {
    keys.push(`line:${entry.lineId.trim()}`)
  }
  if (typeof entry?.dialogueIndex === 'number' && Number.isFinite(entry.dialogueIndex)) {
    keys.push(`idx:${entry.dialogueIndex}`)
  }
  if (keys.length === 0) keys.push(`pos:${arrayIndex}`)
  return keys
}

function mergeDialogueAudioArrays(canonArr: any[], incomingArr: any[]): any[] {
  const entryByKey = new Map<string, any>()
  const keyOrder: string[] = []

  const upsert = (entry: any, arrayIndex: number) => {
    const keys = dialogueAudioEntryKeys(entry, arrayIndex)
    let merged = entry
    for (const key of keys) {
      if (entryByKey.has(key)) {
        merged = pickDialogueAudioEntry(entry, entryByKey.get(key))
      }
    }
    for (const key of keys) {
      if (!entryByKey.has(key)) keyOrder.push(key)
      entryByKey.set(key, merged)
    }
  }

  canonArr.forEach((entry, i) => {
    if (entry) upsert(entry, i)
  })
  incomingArr.forEach((entry, i) => {
    if (entry) upsert(entry, i)
  })

  const seen = new Set<any>()
  const result: any[] = []
  for (const key of keyOrder) {
    const entry = entryByKey.get(key)
    if (!entry || seen.has(entry)) continue
    seen.add(entry)
    result.push(entry)
  }
  return result
}

function mergeDialogueAudioField(canon: any, incoming: any): any {
  const c = canon?.dialogueAudio
  const inc = incoming?.dialogueAudio
  if (!c) return inc
  if (!inc) return c

  if (Array.isArray(c) || Array.isArray(inc)) {
    const canonArr = Array.isArray(c) ? c : []
    const incomingArr = Array.isArray(inc) ? inc : []
    return mergeDialogueAudioArrays(canonArr, incomingArr)
  }

  if (typeof c === 'object' && typeof inc === 'object') {
    const langs = new Set([...Object.keys(c), ...Object.keys(inc)])
    const merged: Record<string, any[]> = {}
    for (const lang of langs) {
      const canonArr = Array.isArray(c[lang]) ? c[lang] : []
      const incomingArr = Array.isArray(inc[lang]) ? inc[lang] : []
      if (canonArr.length === 0 && incomingArr.length === 0) continue
      merged[lang] = mergeDialogueAudioArrays(canonArr, incomingArr)
    }
    return merged
  }

  return inc ?? c
}

function isNonEmptySfxUrl(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

type SfxCueRecord = Record<string, unknown>

function coerceSfxCueRecord(raw: unknown, legacyIndex: number): SfxCueRecord | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const description = raw.trim()
    if (!description) return null
    return { description, legacyIndex }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as SfxCueRecord
    return {
      ...o,
      legacyIndex: typeof o.legacyIndex === 'number' ? o.legacyIndex : legacyIndex,
    }
  }
  return null
}

function sfxCueIdentityKeys(cue: SfxCueRecord, arrayIndex: number): string[] {
  const keys: string[] = []
  if (typeof cue.sfxId === 'string' && cue.sfxId.trim()) {
    keys.push(`sfxId:${cue.sfxId.trim()}`)
  }
  if (typeof cue.sourceBeatId === 'string' && cue.sourceBeatId.trim()) {
    keys.push(`beatId:${cue.sourceBeatId.trim()}`)
  }
  if (typeof cue.legacyIndex === 'number' && Number.isFinite(cue.legacyIndex)) {
    keys.push(`idx:${cue.legacyIndex}`)
  }
  keys.push(`pos:${arrayIndex}`)
  return keys
}

function sceneSfxHasIdentityKeys(canon: any, incoming: any): boolean {
  const hasIdentity = (arr: unknown[]) =>
    arr.some((raw, i) => {
      const cue = coerceSfxCueRecord(raw, i)
      if (!cue) return false
      return sfxCueIdentityKeys(cue, i).some(
        (k) => k.startsWith('sfxId:') || k.startsWith('beatId:')
      )
    })
  const canonArr = Array.isArray(canon?.sfx) ? canon.sfx : []
  const incomingArr = Array.isArray(incoming?.sfx) ? incoming.sfx : []
  return hasIdentity(canonArr) || hasIdentity(incomingArr)
}

interface SfxAudioBundle {
  url: string | null
  meta: unknown
}

function upsertSfxUrlLookup(
  lookup: Map<string, SfxAudioBundle>,
  cues: unknown[],
  urls: unknown[],
  metas: unknown[],
  incomingWins: boolean
): void {
  cues.forEach((raw, idx) => {
    const cue = coerceSfxCueRecord(raw, idx)
    if (!cue) return
    const url = isNonEmptySfxUrl(urls[idx]) ? (urls[idx] as string) : null
    const meta = metas[idx] ?? null
    const bundle: SfxAudioBundle = { url, meta }
    for (const key of sfxCueIdentityKeys(cue, idx)) {
      const existing = lookup.get(key)
      if (!existing) {
        lookup.set(key, bundle)
      } else if (incomingWins && bundle.url) {
        lookup.set(key, bundle)
      } else if (!existing.url && bundle.url) {
        lookup.set(key, bundle)
      } else if (!incomingWins && existing.url && !bundle.url) {
        // keep canonical
      } else if (incomingWins && !bundle.url && existing.url) {
        // keep existing when incoming slot empty
      }
    }
  })
}

function buildMergedSfxUrlLookup(canon: any, incoming: any): Map<string, SfxAudioBundle> {
  const lookup = new Map<string, SfxAudioBundle>()
  const canonCues = Array.isArray(canon?.sfx) ? canon.sfx : []
  const incomingCues = Array.isArray(incoming?.sfx) ? incoming.sfx : []
  const canonUrls = Array.isArray(canon?.sfxAudio) ? canon.sfxAudio : []
  const incomingUrls = Array.isArray(incoming?.sfxAudio) ? incoming.sfxAudio : []
  const canonMetas = Array.isArray(canon?.sfxSourceMeta) ? canon.sfxSourceMeta : []
  const incomingMetas = Array.isArray(incoming?.sfxSourceMeta) ? incoming.sfxSourceMeta : []

  upsertSfxUrlLookup(lookup, canonCues, canonUrls, canonMetas, false)
  upsertSfxUrlLookup(lookup, incomingCues, incomingUrls, incomingMetas, true)
  return lookup
}

function resolveSfxBundleForCue(
  cue: SfxCueRecord,
  newIndex: number,
  lookup: Map<string, SfxAudioBundle>
): SfxAudioBundle {
  for (const key of sfxCueIdentityKeys(cue, newIndex)) {
    const bundle = lookup.get(key)
    if (bundle?.url) return bundle
  }
  return { url: null, meta: null }
}

function mergeSfxCuesByIdentity(canonArr: unknown[], incomingArr: unknown[]): unknown[] {
  const canonByKey = new Map<string, SfxCueRecord>()
  canonArr.forEach((raw, idx) => {
    const cue = coerceSfxCueRecord(raw, idx)
    if (!cue) return
    for (const key of sfxCueIdentityKeys(cue, idx)) {
      if (!canonByKey.has(key)) canonByKey.set(key, cue)
    }
  })

  const merged: unknown[] = []
  const seen = new Set<string>()

  const primaryKey = (cue: SfxCueRecord, idx: number): string =>
    sfxCueIdentityKeys(cue, idx).find((k) => k.startsWith('sfxId:') || k.startsWith('beatId:')) ??
    `pos:${idx}`

  incomingArr.forEach((raw, idx) => {
    const cue = coerceSfxCueRecord(raw, idx)
    if (!cue) return
    const idKey = primaryKey(cue, idx)
    if (seen.has(idKey)) return
    seen.add(idKey)

    let base: SfxCueRecord = { ...cue }
    for (const key of sfxCueIdentityKeys(cue, idx)) {
      const canonCue = canonByKey.get(key)
      if (canonCue) {
        base = { ...canonCue, ...cue }
        break
      }
    }
    merged.push(base)
  })

  canonArr.forEach((raw, idx) => {
    const cue = coerceSfxCueRecord(raw, idx)
    if (!cue) return
    const idKey = primaryKey(cue, idx)
    if (seen.has(idKey)) return
    seen.add(idKey)
    merged.push(cue)
  })

  return merged
}

function mergeSfxParallelArraysByCueIdentity(
  canon: any,
  incoming: any,
  mergedCues: unknown[]
): { sfxAudio: (string | null)[]; sfxSourceMeta: unknown[] } {
  const lookup = buildMergedSfxUrlLookup(canon, incoming)
  const sfxAudio: (string | null)[] = []
  const sfxSourceMeta: unknown[] = []

  mergedCues.forEach((raw, idx) => {
    const cue = coerceSfxCueRecord(raw, idx)
    if (!cue) {
      sfxAudio.push(null)
      sfxSourceMeta.push(null)
      return
    }
    const bundle = resolveSfxBundleForCue(cue, idx, lookup)
    sfxAudio.push(bundle.url)
    sfxSourceMeta.push(bundle.meta)
  })

  return { sfxAudio, sfxSourceMeta }
}

/** Positional merge: incoming URL wins when non-empty; otherwise keep canonical slot. */
function mergeSfxAudioArrays(canonArr: unknown[], incomingArr: unknown[]): (string | null)[] {
  const maxLen = Math.max(canonArr.length, incomingArr.length)
  const result: (string | null)[] = []
  for (let i = 0; i < maxLen; i++) {
    const inc = incomingArr[i]
    const can = canonArr[i]
    if (isNonEmptySfxUrl(inc)) result.push(inc)
    else if (isNonEmptySfxUrl(can)) result.push(can)
    else result.push(null)
  }
  return result
}

function mergeSfxAudioField(canon: any, incoming: any): (string | null)[] | undefined {
  const c = canon?.sfxAudio
  const inc = incoming?.sfxAudio
  if (c === undefined && inc === undefined) return undefined
  const canonArr = Array.isArray(c) ? c : []
  const incomingArr = Array.isArray(inc) ? inc : []
  if (canonArr.length === 0 && incomingArr.length === 0) {
    return Array.isArray(inc) ? inc : Array.isArray(c) ? c : undefined
  }
  return mergeSfxAudioArrays(canonArr, incomingArr)
}

function mergeSfxSourceMetaField(canon: any, incoming: any): unknown[] | undefined {
  const c = canon?.sfxSourceMeta
  const inc = incoming?.sfxSourceMeta
  if (c === undefined && inc === undefined) return undefined
  const canonArr = Array.isArray(c) ? c : []
  const incomingArr = Array.isArray(inc) ? inc : []
  if (canonArr.length === 0 && incomingArr.length === 0) {
    return Array.isArray(inc) ? inc : Array.isArray(c) ? c : undefined
  }
  const maxLen = Math.max(canonArr.length, incomingArr.length)
  const result: unknown[] = []
  for (let i = 0; i < maxLen; i++) {
    const inc = incomingArr[i]
    const can = canonArr[i]
    if (inc != null && inc !== '') result.push(inc)
    else if (can != null && can !== '') result.push(can)
    else result.push(null)
  }
  return result
}

function sfxCueRichness(entry: unknown): number {
  if (entry == null) return 0
  if (typeof entry === 'string' && entry.trim()) return 1
  if (typeof entry === 'object') {
    const cue = entry as Record<string, unknown>
    let score = 2
    if (isNonEmptySfxUrl(cue.audioUrl)) score += 2
    if (typeof cue.sourceBeatId === 'string' && cue.sourceBeatId.trim()) score += 1
    if (typeof cue.description === 'string' && cue.description.trim()) score += 1
    return score
  }
  return 0
}

function mergeSfxCueAtIndex(canon: unknown, incoming: unknown): unknown {
  const ri = sfxCueRichness(incoming)
  const rc = sfxCueRichness(canon)
  if (ri >= rc) {
    if (incoming && typeof incoming === 'object' && canon && typeof canon === 'object') {
      return { ...(canon as object), ...(incoming as object) }
    }
    return incoming ?? canon ?? null
  }
  if (canon && typeof canon === 'object' && incoming && typeof incoming === 'object') {
    return { ...(canon as object), ...(incoming as object) }
  }
  return canon ?? incoming ?? null
}

function mergeSfxCuesArrays(canonArr: unknown[], incomingArr: unknown[]): unknown[] {
  const maxLen = Math.max(canonArr.length, incomingArr.length)
  const result: unknown[] = []
  for (let i = 0; i < maxLen; i++) {
    result.push(mergeSfxCueAtIndex(canonArr[i], incomingArr[i]))
  }
  return result
}

function mergeSfxCuesField(canon: any, incoming: any): unknown[] | undefined {
  const c = canon?.sfx
  const inc = incoming?.sfx
  if (c === undefined && inc === undefined) return undefined
  const canonArr = Array.isArray(c) ? c : []
  const incomingArr = Array.isArray(inc) ? inc : []
  if (canonArr.length === 0 && incomingArr.length === 0) {
    return Array.isArray(inc) ? inc : Array.isArray(c) ? c : undefined
  }
  return mergeSfxCuesArrays(canonArr, incomingArr)
}

function mergeSegmentDialogueMedia(canonSegments: any[] | undefined, incomingSegments: any[] | undefined): any[] | undefined {
  if (!Array.isArray(incomingSegments) || incomingSegments.length === 0) {
    return Array.isArray(canonSegments) && canonSegments.length > 0 ? canonSegments : incomingSegments
  }
  if (!Array.isArray(canonSegments) || canonSegments.length === 0) return incomingSegments

  const canonLineById = new Map<string, any>()
  for (const seg of canonSegments) {
    for (const line of seg?.dialogue || []) {
      if (line?.lineId) canonLineById.set(line.lineId, line)
    }
  }

  return incomingSegments.map((incomingSeg, segIdx) => {
    const canonSeg = canonSegments[segIdx]
    const incomingDialogue = Array.isArray(incomingSeg?.dialogue) ? incomingSeg.dialogue : []
    const mergedDialogue = incomingDialogue.map((line: any, lineIdx: number) => {
      const canonLine =
        (line?.lineId && canonLineById.get(line.lineId)) ||
        (Array.isArray(canonSeg?.dialogue) ? canonSeg.dialogue[lineIdx] : undefined)
      return mergeDialogueLineMedia(canonLine, line)
    })
    return { ...incomingSeg, dialogue: mergedDialogue }
  })
}

/**
 * Overlay incoming scene edits while keeping storyboard media from the canonical scene
 * when incoming values are missing or invalid.
 */
export function mergeScenePreservingMedia(canonical: any, incoming: any): any {
  if (!canonical) return incoming
  if (!incoming) return canonical

  const merged: any = { ...incoming }

  mergeMediaFields(
    merged,
    incoming,
    canonical,
    SCENE_IMAGE_URL_KEYS,
    SCENE_IMAGE_PROMPT_KEYS
  )

  if (Array.isArray(incoming.dialogue)) {
    const canonDialogue = Array.isArray(canonical.dialogue) ? canonical.dialogue : []
    const canonByLineId = new Map<string, any>()
    for (const line of canonDialogue) {
      if (line?.lineId) canonByLineId.set(line.lineId, line)
    }

    merged.dialogue = incoming.dialogue.map((line: any, i: number) => {
      const canonLine =
        (line?.lineId && canonByLineId.get(line.lineId)) || canonDialogue[i]
      return mergeDialogueLineMedia(canonLine, line)
    })
  }

  merged.storyboardFrames = mergeStoryboardFrames(canonical.storyboardFrames, incoming.storyboardFrames)
  merged.beats = mergeBeatsArray(canonical.beats, incoming.beats)
  merged.segments = mergeSegmentDialogueMedia(canonical.segments, incoming.segments)
  merged.dialogueAudio = mergeDialogueAudioField(canonical, incoming)

  if (sceneSfxHasIdentityKeys(canonical, incoming)) {
    const canonSfxArr = Array.isArray(canonical.sfx) ? canonical.sfx : []
    const incomingSfxArr = Array.isArray(incoming.sfx) ? incoming.sfx : []
    const mergedSfx =
      canonSfxArr.length === 0 && incomingSfxArr.length === 0
        ? undefined
        : mergeSfxCuesByIdentity(canonSfxArr, incomingSfxArr)
    if (mergedSfx !== undefined) {
      merged.sfx = mergedSfx
      const { sfxAudio, sfxSourceMeta } = mergeSfxParallelArraysByCueIdentity(
        canonical,
        incoming,
        mergedSfx
      )
      if (sfxAudio.length > 0 || Array.isArray(canonical.sfxAudio) || Array.isArray(incoming.sfxAudio)) {
        merged.sfxAudio = sfxAudio
      }
      if (
        sfxSourceMeta.length > 0 ||
        Array.isArray(canonical.sfxSourceMeta) ||
        Array.isArray(incoming.sfxSourceMeta)
      ) {
        merged.sfxSourceMeta = sfxSourceMeta
      }
    }
  } else {
    const mergedSfxAudio = mergeSfxAudioField(canonical, incoming)
    if (mergedSfxAudio !== undefined) merged.sfxAudio = mergedSfxAudio

    const mergedSfxSourceMeta = mergeSfxSourceMetaField(canonical, incoming)
    if (mergedSfxSourceMeta !== undefined) merged.sfxSourceMeta = mergedSfxSourceMeta

    const mergedSfx = mergeSfxCuesField(canonical, incoming)
    if (mergedSfx !== undefined) merged.sfx = mergedSfx
  }

  return merged
}

export interface MergeSceneArraysOptions {
  deletedSceneIds?: string[]
}

/**
 * Deep-merge incoming scene snapshots onto existing DB scenes.
 * Preserves storyboard media, sceneDirection, and scenes missing from stale payloads.
 */
export function mergeSceneArraysForPersistence(
  existingScenes: any[],
  incomingScenes: any[],
  options?: MergeSceneArraysOptions
): any[] {
  if (!Array.isArray(incomingScenes) || incomingScenes.length === 0) {
    return Array.isArray(existingScenes) ? existingScenes : []
  }
  if (!Array.isArray(existingScenes) || existingScenes.length === 0) {
    return incomingScenes
  }

  const existingScenesById = new Map(
    existingScenes
      .filter((s: any) => s.id || s.sceneId)
      .map((s: any) => [s.id || s.sceneId, s])
  )

  const merged = incomingScenes.map((incomingScene: any, idx: number) => {
    const incomingId = incomingScene.id || incomingScene.sceneId

    if (incomingId && !existingScenesById.has(incomingId)) {
      if (incomingId.startsWith('cinematic-')) {
        return incomingScene
      }
    }

    let existingScene = incomingId ? existingScenesById.get(incomingId) : null

    if (!existingScene && idx < existingScenes.length) {
      const existingAtIdx = existingScenes[idx]
      if (!existingAtIdx.id && !existingAtIdx.sceneId) {
        existingScene = existingAtIdx
      }
    }

    if (!existingScene) return incomingScene

    const spread = {
      ...existingScene,
      ...incomingScene,
      sceneDirection: incomingScene.sceneDirection || existingScene.sceneDirection,
    }
    return mergeScenePreservingMedia(existingScene, spread)
  })

  const deletedSceneIds = new Set<string>(options?.deletedSceneIds || [])
  const incomingScenesById = new Map(
    incomingScenes
      .filter((s: any) => s.id || s.sceneId)
      .map((s: any) => [s.id || s.sceneId, s])
  )

  const preservedScenes = existingScenes.filter((existingScene: any) => {
    const existingId = existingScene.id || existingScene.sceneId
    if (!existingId) return false
    if (deletedSceneIds.has(existingId)) return false
    return !incomingScenesById.has(existingId)
  })

  if (preservedScenes.length === 0) return merged

  return [...merged, ...preservedScenes].sort(
    (a: any, b: any) => (a.sceneNumber || 0) - (b.sceneNumber || 0)
  )
}

export function findMatchingSceneInArray(
  scenes: any[],
  target: any,
  index: number
): any | null {
  const targetId = target?.id || target?.sceneId
  if (targetId) {
    const byId = scenes.find((s) => (s?.id || s?.sceneId) === targetId)
    if (byId) return byId
  }
  if (index < scenes.length) {
    const atIdx = scenes[index]
    if (!targetId && (!atIdx?.id && !atIdx?.sceneId)) return atIdx
    if (targetId && (atIdx?.id || atIdx?.sceneId) === targetId) return atIdx
  }
  return null
}

/** Audit helper — counts media fields per scene for debugging fragmented storage. */
export function auditStoryboardSceneMedia(scenes: any[]): Array<{
  index: number
  sceneId?: string
  hasImageUrl: boolean
  beatFrames: number
  dialogueFrames: number
  segmentDialogueFrames: number
}> {
  return scenes.map((scene, index) => {
    const beats = Array.isArray(scene?.beats) ? scene.beats : []
    const beatFrames = beats.filter((b: any) =>
      isValidStoryboardMediaUrl(b?.storyboardImageUrl)
    ).length

    const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
    const dialogueFrames = dialogue.filter((d: any) =>
      isValidStoryboardMediaUrl(d?.storyboardImageUrl)
    ).length

    let segmentDialogueFrames = 0
    for (const seg of scene?.segments || []) {
      for (const line of seg?.dialogue || []) {
        if (isValidStoryboardMediaUrl(line?.storyboardImageUrl)) segmentDialogueFrames++
      }
    }

    return {
      index,
      sceneId: scene?.id || scene?.sceneId,
      hasImageUrl: isValidStoryboardMediaUrl(scene?.imageUrl),
      beatFrames,
      dialogueFrames,
      segmentDialogueFrames,
    }
  })
}
