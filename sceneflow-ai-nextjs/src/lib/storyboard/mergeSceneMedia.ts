/**
 * Preserve storyboard image fields when merging stale/partial scene snapshots.
 */

const STORYBOARD_IMAGE_FIELD_KEYS = [
  'imageUrl',
  'imageGcsPath',
  'imagePrompt',
  'imageGeneratedAt',
  'imageSource',
  'sceneReferenceImageUrl',
] as const

const DIALOGUE_STORYBOARD_KEYS = [
  'storyboardImageUrl',
  'storyboardImageGcsPath',
  'storyboardImagePrompt',
] as const

const CUSTOM_FRAME_IMAGE_KEYS = ['imageUrl', 'imageGcsPath', 'imagePrompt'] as const

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

function mergeDialogueLineMedia(canonLine: any, incomingLine: any): any {
  if (!incomingLine) return canonLine
  if (!canonLine) return incomingLine

  const merged = { ...incomingLine }
  for (const key of DIALOGUE_STORYBOARD_KEYS) {
    const next = pickMediaUrl(incomingLine[key], canonLine[key])
    if (next) merged[key] = next
    else delete merged[key]
  }
  return merged
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
    for (const key of CUSTOM_FRAME_IMAGE_KEYS) {
      const next = pickMediaUrl(incomingFrame[key], canonFrame[key])
      if (next) merged[key] = next
      else delete merged[key]
    }
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

  for (const key of STORYBOARD_IMAGE_FIELD_KEYS) {
    const next = pickMediaUrl(incoming[key], canonical[key])
    if (next) merged[key] = next
    else delete merged[key]
  }

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
  merged.segments = mergeSegmentDialogueMedia(canonical.segments, incoming.segments)
  merged.dialogueAudio = mergeDialogueAudioField(canonical, incoming)

  return merged
}

/** Audit helper — counts media fields per scene for debugging fragmented storage. */
export function auditStoryboardSceneMedia(scenes: any[]): Array<{
  index: number
  sceneId?: string
  hasImageUrl: boolean
  dialogueFrames: number
  segmentDialogueFrames: number
}> {
  return scenes.map((scene, index) => {
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
      dialogueFrames,
      segmentDialogueFrames,
    }
  })
}
