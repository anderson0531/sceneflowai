/**
 * Helpers for script wardrobe analysis — formats scene + beat content for AI.
 */

export interface WardrobeAnalysisSceneInput {
  sceneNumber: number
  heading?: string
  action?: string
  visualDescription?: string
  dialogue?: string
  beats?: Array<{
    kind?: string
    character?: string
    line?: string
    actionDescription?: string
  }>
  segments?: Array<{
    segmentDirection?: { action?: string; visualDescription?: string }
    startFrameDescription?: string
    endFrameDescription?: string
  }>
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
    const actionDesc = beat.actionDescription?.trim()
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
  if (beatLines.length) {
    parts.push('Beats:')
    parts.push(...beatLines)
  } else {
    const segmentLines = formatSegmentLines(scene, characterName)
    if (segmentLines.length) {
      parts.push('Segments:')
      parts.push(...segmentLines)
    }
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
