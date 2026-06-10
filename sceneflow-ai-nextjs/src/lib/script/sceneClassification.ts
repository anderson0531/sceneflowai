/** Client-safe scene type helpers (no server/AI dependencies). */

import { detectSceneType } from '@/lib/intelligence/scene-direction-metadata'
import { detectNoTalentSegment } from '@/types/scene-direction'

export function isTitleOrCinematicScene(scene: Record<string, unknown>): boolean {
  if (scene.cinematicType === 'title' || scene.cinematicType === 'outro') return true
  const heading = String(scene.heading ?? '').toLowerCase()
  return (
    heading.includes('title sequence') ||
    heading.includes('title card') ||
    heading.includes('opening title') ||
    heading.includes('main title')
  )
}

/**
 * Title/credits/abstract scenes should not attach cast reference images to storyboard frames.
 */
export function isStoryboardNoCharacterScene(
  scene: Record<string, unknown>,
  sceneNumber = 1,
  totalScenes?: number
): boolean {
  if (isTitleOrCinematicScene(scene)) return true

  const heading = String(scene.heading ?? '')
  const action = String(scene.action ?? scene.visualDescription ?? '')
  const sceneType = detectSceneType(heading, action, sceneNumber, totalScenes)
  if (sceneType === 'title' || sceneType === 'credits') return true

  const direction = scene.sceneDirection
  if (direction && typeof direction === 'object') {
    const talent = (direction as { talent?: unknown }).talent
    if (talent && detectNoTalentSegment(talent)) return true
  }

  return false
}
