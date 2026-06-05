import { MODERATION_CREDITS, getModerationValidationCost } from '@/lib/credits/creditCosts'
import type { ModerationReport, ModerationStage } from './moderationPipeline'
import type { ValidationContentSource } from './validationResolver'

export interface ModerationValidateRequest {
  projectId: string
  stage: ModerationStage
  source?: ValidationContentSource
  resourceId?: string
  text?: string
  imageUrl?: string
  videoUrl?: string
  includeCopyrightMedia?: boolean
}

export interface ModerationValidateResponse {
  success: boolean
  moderationReport?: ModerationReport
  creditsCharged?: number
  creditsBalance?: number
  error?: string
  code?: string
  creditsRequired?: number
  creditsAvailable?: number
}

export function getValidationCreditLabel(stage: ModerationStage, includeCopyrightMedia?: boolean): number {
  return getModerationValidationCost(stage, { includeCopyrightMedia })
}

export { MODERATION_CREDITS }

export async function requestModerationValidation(
  params: ModerationValidateRequest
): Promise<ModerationValidateResponse> {
  const res = await fetch('/api/moderation/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) {
    return {
      success: false,
      error: data.error || 'Validation failed',
      code: data.code,
      creditsRequired: data.creditsRequired,
      creditsAvailable: data.creditsAvailable,
    }
  }
  return data as ModerationValidateResponse
}
