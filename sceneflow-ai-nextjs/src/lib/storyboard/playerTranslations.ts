/**
 * Pre-Vis player — translation types and client-safe label helpers.
 */

export interface SceneTranslation {
  heading?: string
  description?: string
  action?: string
  narration?: string
  dialogue?: string[]
}

export type PlayerLabelMap = Record<string, string>

export const PREVIS_PLAYER_LABEL_KEYS = [
  'Action',
  'Narrator',
  'Dialogue',
  'Scene',
  'of',
  'SCENE',
  'Untitled Scene',
] as const

/** Map known English role/UI labels to the active language; character names pass through. */
export function translatePlayerLabel(
  label: string | undefined,
  labelMap?: PlayerLabelMap
): string | undefined {
  if (!label || !labelMap || Object.keys(labelMap).length === 0) return label

  if (labelMap[label]) return labelMap[label]

  const numberedDialogue = label.match(/^Dialogue (\d+)$/)
  if (numberedDialogue && labelMap.Dialogue) {
    return `${labelMap.Dialogue} ${numberedDialogue[1]}`
  }

  return label
}
