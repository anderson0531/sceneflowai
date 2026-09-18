'use client'

import { toast } from 'sonner'
import {
  IMAGE_CONTENT_POLICY_CODE,
  IMAGE_CONTENT_POLICY_TOAST_DESCRIPTION,
  IMAGE_CONTENT_POLICY_TOAST_TITLE,
  IMAGE_CONTENT_POLICY_USER_MESSAGE,
  IMAGE_SAFETY_CODE,
  IMAGE_SAFETY_TOAST_DESCRIPTION,
  IMAGE_SAFETY_TOAST_TITLE,
  IMAGE_SAFETY_USER_MESSAGE,
  isImageContentPolicyError,
  isImageSafetyError,
  stillPolicyBoardMessage,
  stillPolicyUserMessage,
} from '@/lib/generation/stillPolicy'

export type StillPolicyFailureKind = 'content_policy' | 'identity'

export interface StillPolicyFailure {
  kind: StillPolicyFailureKind
  code: typeof IMAGE_CONTENT_POLICY_CODE | typeof IMAGE_SAFETY_CODE
  message: string
  boardMessage: string
}

export function resolveStillPolicyFailure(err: unknown): StillPolicyFailure | null {
  if (isImageContentPolicyError(err)) {
    return {
      kind: 'content_policy',
      code: IMAGE_CONTENT_POLICY_CODE,
      message: stillPolicyUserMessage(err) || IMAGE_CONTENT_POLICY_USER_MESSAGE,
      boardMessage: stillPolicyBoardMessage(err),
    }
  }
  if (isImageSafetyError(err)) {
    return {
      kind: 'identity',
      code: IMAGE_SAFETY_CODE,
      message: stillPolicyUserMessage(err) || IMAGE_SAFETY_USER_MESSAGE,
      boardMessage: stillPolicyBoardMessage(err),
    }
  }
  return null
}

export function toastStillPolicyFailure(args: {
  error: unknown
  onOpenDirector?: () => void
  openDirectorLabel?: string
}): boolean {
  const failure = resolveStillPolicyFailure(args.error)
  if (!failure) return false

  const title =
    failure.kind === 'content_policy'
      ? IMAGE_CONTENT_POLICY_TOAST_TITLE
      : IMAGE_SAFETY_TOAST_TITLE
  const description =
    failure.kind === 'content_policy'
      ? IMAGE_CONTENT_POLICY_TOAST_DESCRIPTION
      : IMAGE_SAFETY_TOAST_DESCRIPTION

  toast.error(title, {
    description,
    duration: 16000,
    ...(args.onOpenDirector
      ? {
          action: {
            label: args.openDirectorLabel || 'Open Director',
            onClick: args.onOpenDirector,
          },
        }
      : {}),
  })
  return true
}

export function stillPolicyErrorWithCode(
  message: string,
  code: string
): Error & { code: string } {
  const error = new Error(message) as Error & { code: string }
  error.code = code
  return error
}
