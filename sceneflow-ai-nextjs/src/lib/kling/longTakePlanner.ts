/**
 * Long-take planner: base clip (5–10s) + native video-extend (+5s each), 180s hard cap.
 */

import {
  KLING_EXTEND_DELTA_SEC,
  KLING_LONG_TAKE_MAX_SEC,
  KLING_SINGLE_CLIP_MAX_SEC,
  type KlingModelId,
} from './types'

export type KlingLongTakeWarning =
  | 'camera_angle_cut'
  | 'drift_risk'
  | 'hard_cap_applied'
  | 'model_locked'

export interface KlingLongTakePlan {
  model: KlingModelId
  baseSeconds: number
  /** Number of +5s extend steps after base */
  extensions: number
  totalSeconds: number
  warnings: KlingLongTakeWarning[]
}

export function planKlingLongTake(args: {
  targetSeconds: number
  model: KlingModelId | string
}): KlingLongTakePlan {
  const model = (args.model || 'kling-v3-omni') as KlingModelId
  const warnings: KlingLongTakeWarning[] = []
  warnings.push('model_locked')

  const rawTarget = Math.max(1, args.targetSeconds)
  if (rawTarget > 30) warnings.push('camera_angle_cut')
  if (rawTarget > 60) warnings.push('drift_risk')

  const cappedTarget = Math.min(rawTarget, KLING_LONG_TAKE_MAX_SEC)
  if (rawTarget > KLING_LONG_TAKE_MAX_SEC) warnings.push('hard_cap_applied')

  const baseSeconds =
    cappedTarget <= KLING_SINGLE_CLIP_MAX_SEC
      ? Math.min(10, Math.max(5, cappedTarget))
      : 10

  const extensions =
    cappedTarget <= baseSeconds
      ? 0
      : Math.ceil((cappedTarget - baseSeconds) / KLING_EXTEND_DELTA_SEC)

  const totalSeconds = Math.min(
    KLING_LONG_TAKE_MAX_SEC,
    baseSeconds + extensions * KLING_EXTEND_DELTA_SEC
  )

  return {
    model,
    baseSeconds,
    extensions,
    totalSeconds,
    warnings,
  }
}

/** True when spoken dialogue exceeds the single-clip Kling ceiling */
export function shouldUseKlingLongTake(dialogueSeconds: number): boolean {
  return dialogueSeconds > KLING_SINGLE_CLIP_MAX_SEC
}
