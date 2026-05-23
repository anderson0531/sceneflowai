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
