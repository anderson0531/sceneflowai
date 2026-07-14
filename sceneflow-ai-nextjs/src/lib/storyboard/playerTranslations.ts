/**
 * Pre-Vis player — translation types and client-safe label helpers.
 */

import type { BeatOverlayType } from '@/lib/script/segmentTypes'

export interface SceneTranslation {
  heading?: string
  description?: string
  action?: string
  narration?: string
  dialogue?: string[]
  beatsByBeatId?: Record<
    string,
    {
      overlayText?: string
      /** True when the user manually edited this language's caption override. */
      overlayEdited?: boolean
    }
  >
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

export function defaultBeatOverlayType(beatRole?: string): BeatOverlayType {
  if (beatRole === 'title_reveal') return 'title'
  if (beatRole === 'credit') return 'lower_third'
  return 'signage'
}

export function resolveBeatCaptionText(
  sceneTranslation: SceneTranslation | undefined,
  beatId: string | undefined,
  englishOverlayText: string | undefined
): string | undefined {
  const english = englishOverlayText?.trim()
  if (!beatId) return english || undefined

  const entry = sceneTranslation?.beatsByBeatId?.[beatId]
  const translated = entry?.overlayText?.trim()

  if (!english) {
    if (entry?.overlayEdited && translated) return translated
    return undefined
  }

  return translated || english
}

export function isBeatCaptionManuallyEdited(
  sceneTranslation: SceneTranslation | undefined,
  beatId: string
): boolean {
  return sceneTranslation?.beatsByBeatId?.[beatId]?.overlayEdited === true
}
