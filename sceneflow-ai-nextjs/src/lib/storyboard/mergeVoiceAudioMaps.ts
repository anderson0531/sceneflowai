/**
 * Copy voice clip URLs onto empty slots matched by lineId.
 *
 * Script PUTs and stale-write salvage must not drop paid dialogue/narration
 * clips just because a snapshot omitted `audioUrl`. Matching is by `lineId`
 * only — never by array position — so a deleted line cannot inherit a
 * neighbor's clip.
 */

export interface VoiceAudioMergeResult<T> {
  scene: T
  filled: number
  fields: string[]
}

function voiceAudioUrl(entry: unknown): string | undefined {
  if (!entry || typeof entry !== 'object') return undefined
  const rec = entry as Record<string, unknown>
  const raw = rec.audioUrl ?? rec.url
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (!trimmed || trimmed === 'deferred') return undefined
  return trimmed
}

function voiceLineId(entry: unknown): string | undefined {
  if (!entry || typeof entry !== 'object') return undefined
  const id = (entry as Record<string, unknown>).lineId
  return typeof id === 'string' && id.trim() ? id.trim() : undefined
}

function withFilledUrl(
  entry: Record<string, unknown>,
  url: string,
  source?: Record<string, unknown>
): Record<string, unknown> {
  const sourceUsesUrl = Boolean(source && 'url' in source && !('audioUrl' in source))
  const targetUsesUrl = 'url' in entry && !('audioUrl' in entry)
  if (sourceUsesUrl || targetUsesUrl) {
    return { ...entry, url }
  }
  return { ...entry, audioUrl: url }
}

function mergeVoiceLineArray(
  targetLines: unknown[],
  sourceLines: unknown[],
  path: string
): { lines: unknown[]; filled: number; fields: string[] } {
  const sourceByLineId = new Map<string, Record<string, unknown>>()
  for (const line of sourceLines) {
    const id = voiceLineId(line)
    if (!id || sourceByLineId.has(id)) continue
    if (line && typeof line === 'object') {
      sourceByLineId.set(id, line as Record<string, unknown>)
    }
  }

  let filled = 0
  const fields: string[] = []
  let changed = false
  const lines = targetLines.map((line) => {
    if (!line || typeof line !== 'object') return line
    const entry = line as Record<string, unknown>
    if (voiceAudioUrl(entry)) return line
    const id = voiceLineId(entry)
    if (!id) return line
    const sourceEntry = sourceByLineId.get(id)
    const url = voiceAudioUrl(sourceEntry)
    if (!url) return line
    filled += 1
    changed = true
    fields.push(`${path}[${id}]`)
    return withFilledUrl(entry, url, sourceEntry)
  })

  return { lines: changed ? lines : targetLines, filled, fields }
}

function mergeVoiceLangMap(
  targetMap: unknown,
  sourceMap: unknown,
  fieldName: string
): { map: unknown; filled: number; fields: string[] } {
  if (targetMap == null || typeof targetMap !== 'object' || Array.isArray(targetMap)) {
    return { map: targetMap, filled: 0, fields: [] }
  }

  const target = targetMap as Record<string, unknown>
  const source =
    sourceMap && typeof sourceMap === 'object' && !Array.isArray(sourceMap)
      ? (sourceMap as Record<string, unknown>)
      : {}

  let filled = 0
  const fields: string[] = []
  let changed = false
  const next: Record<string, unknown> = { ...target }

  for (const lang of Object.keys(target)) {
    const targetVal = target[lang]
    const sourceVal = source[lang]
    if (Array.isArray(targetVal)) {
      const merged = mergeVoiceLineArray(
        targetVal,
        Array.isArray(sourceVal) ? sourceVal : [],
        `${fieldName}.${lang}`
      )
      if (merged.filled > 0) {
        next[lang] = merged.lines
        filled += merged.filled
        fields.push(...merged.fields)
        changed = true
      }
      continue
    }
    if (targetVal && typeof targetVal === 'object') {
      const targetEntry = targetVal as Record<string, unknown>
      if (voiceAudioUrl(targetEntry)) continue
      const url = voiceAudioUrl(sourceVal)
      if (!url) continue
      next[lang] = withFilledUrl(
        targetEntry,
        url,
        sourceVal && typeof sourceVal === 'object'
          ? (sourceVal as Record<string, unknown>)
          : undefined
      )
      filled += 1
      fields.push(`${fieldName}.${lang}`)
      changed = true
    }
  }

  return { map: changed ? next : targetMap, filled, fields }
}

function mergeVoiceLineArrayResult(
  targetMap: unknown,
  sourceMap: unknown,
  fieldName: string
): { map: unknown; filled: number; fields: string[] } {
  if (Array.isArray(targetMap)) {
    const merged = mergeVoiceLineArray(
      targetMap,
      Array.isArray(sourceMap) ? sourceMap : [],
      fieldName
    )
    return { map: merged.lines, filled: merged.filled, fields: merged.fields }
  }
  return mergeVoiceLangMap(targetMap, sourceMap, fieldName)
}

/**
 * Fill empty `dialogueAudio` / `narrationAudio` slots on `targetScene` from
 * `sourceScene`, matching entries by `lineId` (and by language for object-shaped
 * narration maps).
 */
export function mergeVoiceAudioMapsByLineId<T>(
  targetScene: T,
  sourceScene: T | null | undefined
): VoiceAudioMergeResult<T> {
  if (!targetScene || typeof targetScene !== 'object') {
    return { scene: targetScene, filled: 0, fields: [] }
  }
  if (!sourceScene || typeof sourceScene !== 'object') {
    return { scene: targetScene, filled: 0, fields: [] }
  }

  const target = targetScene as Record<string, unknown>
  const source = sourceScene as Record<string, unknown>
  const dialogue = mergeVoiceLineArrayResult(
    target.dialogueAudio,
    source.dialogueAudio,
    'dialogueAudio'
  )
  const narration = mergeVoiceLineArrayResult(
    target.narrationAudio,
    source.narrationAudio,
    'narrationAudio'
  )

  const filled = dialogue.filled + narration.filled
  if (filled === 0) {
    return { scene: targetScene, filled: 0, fields: [] }
  }

  return {
    scene: {
      ...target,
      ...(dialogue.filled > 0 ? { dialogueAudio: dialogue.map } : {}),
      ...(narration.filled > 0 ? { narrationAudio: narration.map } : {}),
    } as T,
    filled,
    fields: [...dialogue.fields, ...narration.fields],
  }
}
