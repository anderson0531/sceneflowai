/**
 * Server-only: translate and persist Pre-Vis language stream text.
 */

import { translateWithVertexAI } from '@/lib/vertexai/translate'
import {
  PREVIS_PLAYER_LABEL_KEYS,
  type PlayerLabelMap,
  type SceneTranslation,
} from '@/lib/storyboard/playerTranslations'

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

  const candidates = [scene.visualDescription, scene.action, scene.summary, sceneDescription]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text.trim() || targetLanguage === 'en') return text
  const result = await translateWithVertexAI({
    text,
    targetLanguage,
    sourceLanguage: 'en',
  })
  return result.translatedText
}

/** Translate fixed UI labels once per language stream. */
export async function ensurePlayerLabels(
  visionPhase: Record<string, unknown>,
  language: string
): Promise<PlayerLabelMap> {
  if (language === 'en') return {}

  const playerLabelsRoot =
    (visionPhase.playerLabels as Record<string, PlayerLabelMap> | undefined) ?? {}
  if (playerLabelsRoot[language]) return playerLabelsRoot[language]

  const labelMap: PlayerLabelMap = {}
  for (const key of PREVIS_PLAYER_LABEL_KEYS) {
    labelMap[key] = await translateText(key, language)
  }

  playerLabelsRoot[language] = labelMap
  visionPhase.playerLabels = playerLabelsRoot
  return labelMap
}

/** Translate scene script fields for overlay + TTS reuse. */
export async function translateSceneForLanguage(
  scene: Record<string, unknown>,
  language: string
): Promise<SceneTranslation> {
  if (language === 'en') {
    const dialogue = Array.isArray(scene.dialogue)
      ? scene.dialogue.map((line: any) => String(line?.line ?? line?.text ?? '').trim())
      : []
    return {
      heading: readSceneHeading(scene) || undefined,
      description: readSceneDescription(scene) || undefined,
      action: typeof scene.action === 'string' ? scene.action.trim() : undefined,
      narration: typeof scene.narration === 'string' ? scene.narration.trim() : undefined,
      dialogue,
    }
  }

  const heading = readSceneHeading(scene)
  const description = readSceneDescription(scene)
  const action = typeof scene.action === 'string' ? scene.action.trim() : ''
  const narration = typeof scene.narration === 'string' ? scene.narration.trim() : ''
  const dialogueLines = Array.isArray(scene.dialogue) ? scene.dialogue : []

  const translatedDialogue: string[] = []
  for (const line of dialogueLines) {
    const text = String(
      (line as { line?: unknown; text?: unknown })?.line ??
        (line as { text?: unknown })?.text ??
        ''
    ).trim()
    translatedDialogue.push(text ? await translateText(text, language) : '')
  }

  return {
    heading: heading ? await translateText(heading, language) : undefined,
    description: description ? await translateText(description, language) : undefined,
    action: action ? await translateText(action, language) : undefined,
    narration: narration ? await translateText(narration, language) : undefined,
    dialogue: translatedDialogue,
  }
}

/**
 * Populate visionPhase.translations[lang] and playerLabels[lang] for dialogue-only runs.
 * Mutates project.metadata.visionPhase in place.
 */
export async function ensureLanguageStreamTranslations(
  project: { metadata?: Record<string, unknown> },
  scenes: Record<string, unknown>[],
  language: string,
  sceneIndices: number[]
): Promise<void> {
  if (language === 'en') return

  const metadata = project.metadata || {}
  const visionPhase = (metadata.visionPhase as Record<string, unknown>) || {}
  metadata.visionPhase = visionPhase

  await ensurePlayerLabels(visionPhase, language)

  const translationsRoot =
    (visionPhase.translations as Record<string, Record<number, SceneTranslation>> | undefined) ?? {}
  if (!translationsRoot[language]) translationsRoot[language] = {}
  visionPhase.translations = translationsRoot

  for (const sceneIndex of sceneIndices) {
    const scene = scenes[sceneIndex]
    if (!scene) continue
    translationsRoot[language][sceneIndex] = await translateSceneForLanguage(scene, language)
  }
}
