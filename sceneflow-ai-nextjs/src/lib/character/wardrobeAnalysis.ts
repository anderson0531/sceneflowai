/**
 * Helpers for script wardrobe analysis — formats scene + beat content for AI.
 */

export interface WardrobeAnalysisBeatInput {
  kind?: string
  character?: string
  line?: string
  actionDescription?: string
  /** Legacy / alternate beat action fields */
  description?: string
  action?: string
}

export interface WardrobeAnalysisSceneInput {
  sceneNumber: number
  heading?: string
  action?: string
  visualDescription?: string
  dialogue?: string
  beats?: WardrobeAnalysisBeatInput[]
  segments?: Array<{
    segmentDirection?: { action?: string; visualDescription?: string }
    startFrameDescription?: string
    endFrameDescription?: string
  }>
}

/** Resolve action beat text from any supported field name. */
export function resolveBeatActionText(beat: WardrobeAnalysisBeatInput): string {
  return (
    beat.actionDescription?.trim() ||
    beat.description?.trim() ||
    beat.action?.trim() ||
    ''
  )
}

function characterMentionedInText(text: string, characterName: string): boolean {
  if (!text?.trim() || !characterName?.trim()) return false
  return text.toLowerCase().includes(characterName.toLowerCase())
}

function formatBeatLines(
  scene: WardrobeAnalysisSceneInput,
  characterName: string
): string[] {
  const lines: string[] = []
  const beats = scene.beats
  if (!Array.isArray(beats) || beats.length === 0) return lines

  for (const beat of beats) {
    const charMatch =
      beat.character &&
      beat.character.toLowerCase() === characterName.toLowerCase()
    const actionDesc = resolveBeatActionText(beat)
    const spokenLine = beat.line?.trim()

    if (charMatch && spokenLine) {
      lines.push(`[Beat] ${beat.character}: ${spokenLine}`)
    } else if (actionDesc) {
      if (
        characterMentionedInText(actionDesc, characterName) ||
        /\b(she|he|her|his|their)\b/i.test(actionDesc)
      ) {
        lines.push(`[Beat] ${actionDesc}`)
      }
    }
  }

  return lines
}

function formatSegmentLines(
  scene: WardrobeAnalysisSceneInput,
  characterName: string
): string[] {
  const lines: string[] = []
  const segments = scene.segments
  if (!Array.isArray(segments) || segments.length === 0) return lines

  for (const seg of segments) {
    const parts = [
      seg.segmentDirection?.action,
      seg.segmentDirection?.visualDescription,
      seg.startFrameDescription,
      seg.endFrameDescription,
    ].filter(Boolean) as string[]

    for (const part of parts) {
      if (characterMentionedInText(part, characterName)) {
        lines.push(`[Segment] ${part.trim()}`)
      }
    }
  }

  return lines
}

/** Format a single scene for wardrobe/appearance AI analysis. */
export function formatSceneForWardrobeAnalysis(
  scene: WardrobeAnalysisSceneInput,
  characterName: string
): string {
  const parts: string[] = []
  parts.push(`Scene ${scene.sceneNumber}:`)
  if (scene.heading) parts.push(`Location: ${scene.heading}`)
  if (scene.action) parts.push(`Action: ${scene.action}`)
  if (scene.visualDescription) parts.push(`Visual: ${scene.visualDescription}`)
  if (scene.dialogue) parts.push(`Dialogue: ${scene.dialogue}`)

  const beatLines = formatBeatLines(scene, characterName)
  const segmentLines = formatSegmentLines(scene, characterName)

  if (beatLines.length) {
    parts.push('Beats:')
    parts.push(...beatLines)
  }
  if (segmentLines.length) {
    parts.push('Segments:')
    parts.push(...segmentLines)
  }

  return parts.join('\n')
}

/** True if character appears in scene-level or beat-level content. */
export function sceneIncludesCharacter(
  scene: WardrobeAnalysisSceneInput,
  characterName: string
): boolean {
  const sceneText = [
    scene.heading,
    scene.action,
    scene.visualDescription,
    scene.dialogue,
  ]
    .filter(Boolean)
    .join(' ')

  if (characterMentionedInText(sceneText, characterName)) return true

  const beatLines = formatBeatLines(scene, characterName)
  if (beatLines.length > 0) return true

  const segmentLines = formatSegmentLines(scene, characterName)
  return segmentLines.length > 0
}

/** Keywords that indicate makeup, hair, or injury appearance changes. */
const APPEARANCE_KEYWORD_PATTERN =
  /\b(bruise|bruises|bloodshot|swelling|swollen|cut|cuts|scratch|scratches|black\s*eye|black\s*eyes|bandage|bandages|laceration|contusion|wound|wounds|disheveled|mascara|lipstick|makeup|injury|injuries|bleeding|bloody|red\s*eyes|temple)\b/i

/** Extract appearance-relevant phrases from beat/segment text for a character. */
export function extractAppearanceNotesFromSceneText(
  scene: WardrobeAnalysisSceneInput,
  characterName: string
): string[] {
  const notes: string[] = []
  const beats = scene.beats ?? []
  for (const beat of beats) {
    const actionDesc = resolveBeatActionText(beat)
    if (!actionDesc) continue
    if (
      !characterMentionedInText(actionDesc, characterName) &&
      !/\b(she|he|her|his|their)\b/i.test(actionDesc)
    ) {
      continue
    }
    if (APPEARANCE_KEYWORD_PATTERN.test(actionDesc)) {
      notes.push(actionDesc)
    }
  }

  const segments = scene.segments ?? []
  for (const seg of segments) {
    const parts = [
      seg.segmentDirection?.action,
      seg.segmentDirection?.visualDescription,
      seg.startFrameDescription,
      seg.endFrameDescription,
    ].filter(Boolean) as string[]
    for (const part of parts) {
      if (
        characterMentionedInText(part, characterName) &&
        APPEARANCE_KEYWORD_PATTERN.test(part)
      ) {
        notes.push(part.trim())
      }
    }
  }

  return notes
}

/** Distill appearance notes from raw beat text (comma-separated injury/makeup phrases). */
export function distillAppearanceNotesFromText(text: string): string | undefined {
  if (!text?.trim() || !APPEARANCE_KEYWORD_PATTERN.test(text)) return undefined

  const phrases: string[] = []

  const patterns: Array<{ re: RegExp; label: string }> = [
    { re: /bloodshot(?:\s*eyes?)?/i, label: 'bloodshot eyes' },
    { re: /faint\s+bruise[^.]*?(?:temple|cheek|forehead|face)?/i, label: '' },
    { re: /bruise[^.]*?(?:temple|cheek|forehead|face)?/i, label: '' },
    { re: /black\s*eye/i, label: 'black eye' },
    { re: /swollen[^.]{0,40}/i, label: '' },
    { re: /disheveled\s+hair/i, label: 'disheveled hair' },
    { re: /runny\s+mascara/i, label: 'runny mascara' },
  ]

  for (const { re, label } of patterns) {
    const match = text.match(re)
    if (match) {
      phrases.push(label || match[0].trim())
    }
  }

  if (phrases.length === 0 && APPEARANCE_KEYWORD_PATTERN.test(text)) {
    const sentences = text.split(/[.!?]+/).filter((s) => APPEARANCE_KEYWORD_PATTERN.test(s))
    phrases.push(...sentences.map((s) => s.trim()).filter(Boolean))
  }

  const unique = [...new Set(phrases.map((p) => p.trim()).filter(Boolean))]
  return unique.length > 0 ? unique.join('; ') : undefined
}
