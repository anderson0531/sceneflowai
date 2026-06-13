import { formatSceneHeading } from '@/lib/script/formatSceneHeading'
import type { PlayerLabelMap, SceneTranslation } from '@/lib/storyboard/playerTranslations'

export interface PreVisSceneDisplay {
  titleLine: string
  description: string
  sceneNumber: number
}

export interface PreVisSceneDisplayOptions {
  language?: string
  sceneTranslation?: SceneTranslation
  playerLabels?: PlayerLabelMap
}

function readSceneHeading(scene: Record<string, unknown>): string {
  const heading = scene.heading
  if (typeof heading === 'string') return heading.trim()
  if (heading && typeof heading === 'object' && 'text' in heading) {
    const text = (heading as { text?: unknown }).text
    if (typeof text === 'string') return text.trim()
  }
  return ''
}

function readSceneDescription(scene: Record<string, unknown>): string {
  const direction = scene.sceneDirection
  const sceneDescription =
    direction &&
    typeof direction === 'object' &&
    typeof (direction as { sceneDescription?: unknown }).sceneDescription === 'string'
      ? String((direction as { sceneDescription: string }).sceneDescription).trim()
      : ''

  const candidates = [
    scene.visualDescription,
    scene.action,
    scene.summary,
    sceneDescription,
  ]

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

/** Combined scene title + description for Pre-Vis Player chrome. */
export function resolvePreVisSceneDisplay(
  scene: Record<string, unknown> | null | undefined,
  sceneIndex: number,
  options?: PreVisSceneDisplayOptions
): PreVisSceneDisplay {
  const sceneNumber = sceneIndex + 1
  const sceneWord = options?.playerLabels?.SCENE ?? 'SCENE'
  const untitled = options?.playerLabels?.['Untitled Scene'] ?? 'Untitled Scene'

  if (!scene) {
    return {
      titleLine: `${sceneWord} ${sceneNumber}: ${untitled}`,
      description: '',
      sceneNumber,
    }
  }

  const rawHeading =
    options?.sceneTranslation?.heading ?? readSceneHeading(scene)
  const formattedHeading =
    formatSceneHeading(rawHeading) || rawHeading || untitled

  const description =
    options?.sceneTranslation?.description ?? readSceneDescription(scene)

  return {
    titleLine: `${sceneWord} ${sceneNumber}: ${formattedHeading}`,
    description,
    sceneNumber,
  }
}
