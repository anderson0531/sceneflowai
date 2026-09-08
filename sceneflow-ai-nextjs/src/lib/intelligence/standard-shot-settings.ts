/**
 * Deterministic Standard-take (Omni Flash) settings from beat context.
 * Defaults to ingredients (REF) when library refs resolve.
 */

import type { VideoGenerationMethod } from '@/components/vision/scene-production/types'
import {
  clampToVeoClipDuration,
  type GeminiThinkingLevel,
  type VeoClipDuration,
} from '@/lib/config/modelConfig'
import { detectSceneType } from '@/lib/intelligence/scene-direction-metadata'

export type OmniVideoResolution = '360p' | '720p' | '1080p' | '4k'

export interface StandardShotSettingsInput {
  segment: {
    shotType?: string
    action?: string
    actionPrompt?: string
    dialogueLines?: Array<{ line?: string }>
    cameraMovement?: string
  }
  sceneHeading?: string
  sceneAction?: string
  sceneNumber?: number
  totalScenes?: number
  ingredientCount: number
  spokenDurationSeconds?: number
  isContinuation?: boolean
  hasOmniInteractionRef?: boolean
}

export interface StandardShotSettings {
  method: VideoGenerationMethod
  duration: VeoClipDuration
  resolution: OmniVideoResolution
  frameRate: 24
  thinkingLevel: GeminiThinkingLevel
  omniMultiShot: boolean
  reason: string
}

function isCloseUp(shotType?: string): boolean {
  const s = (shotType || '').toLowerCase()
  return s.includes('close') || s.includes('cu') || s.includes('detail')
}

function isActionHeavy(action?: string, cameraMovement?: string): boolean {
  const text = `${action || ''} ${cameraMovement || ''}`.toLowerCase()
  return /\b(chase|run|fight|explod|crash|fast|dynamic|tracking|orbit|dolly)\b/.test(text)
}

function suggestsMultiShot(
  sceneType: ReturnType<typeof detectSceneType>,
  action?: string
): boolean {
  const a = (action || '').toLowerCase()
  return (
    sceneType === 'montage' ||
    a.includes('series of shots') ||
    a.includes('montage') ||
    /\b(cut to|then we see|meanwhile)\b/.test(a)
  )
}

export function optimizeStandardOmniSettings(
  input: StandardShotSettingsInput
): StandardShotSettings {
  const sceneType = detectSceneType(
    input.sceneHeading || '',
    input.sceneAction || input.segment.action || '',
    input.sceneNumber ?? 1,
    input.totalScenes
  )

  const multiShot = suggestsMultiShot(sceneType, input.segment.action || input.segment.actionPrompt)
  const closeUp = isCloseUp(input.segment.shotType)
  const hasDialogue = (input.segment.dialogueLines?.length ?? 0) > 0
  const actionHeavy = isActionHeavy(
    input.segment.action || input.segment.actionPrompt,
    input.segment.cameraMovement
  )

  let method: VideoGenerationMethod = 'T2V'
  if (input.isContinuation && input.hasOmniInteractionRef) {
    method = 'EXT'
  } else if (input.ingredientCount > 0) {
    method = 'REF'
  }

  let duration: VeoClipDuration = 10
  if (method === 'EXT') {
    duration = 10
  } else {
    const base = input.spokenDurationSeconds ?? (actionHeavy || multiShot ? 8 : 6)
    duration = clampToVeoClipDuration(base)
  }

  let resolution: OmniVideoResolution = '720p'
  if (sceneType === 'establishing') {
    resolution = '4k'
  } else if (closeUp || hasDialogue) {
    resolution = '1080p'
  }

  let thinkingLevel: GeminiThinkingLevel = 'low'
  if (multiShot || sceneType === 'montage') {
    thinkingLevel = 'high'
  } else if (input.ingredientCount > 2 || actionHeavy) {
    thinkingLevel = 'medium'
  }

  const parts: string[] = []
  if (method === 'REF') parts.push('ingredients')
  else if (method === 'EXT') parts.push('continue')
  else parts.push('text')
  parts.push(`${duration}s`, resolution)
  if (multiShot) parts.push('multi-shot')

  return {
    method,
    duration,
    resolution,
    frameRate: 24,
    thinkingLevel,
    omniMultiShot: multiShot,
    reason: parts.join(' · '),
  }
}
