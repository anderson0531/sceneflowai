'use client'

import React, { useState } from 'react'
import { Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import {
  requestModerationValidation,
  getValidationCreditLabel,
  type ModerationValidateRequest,
} from '@/lib/moderation/validateClient'
import type { ModerationReport } from '@/lib/moderation/moderationPipeline'
import type { ModerationStage } from '@/lib/moderation/moderationPipeline'

interface ModerationValidateButtonProps {
  projectId: string
  stage: ModerationStage
  label?: string
  source?: ModerationValidateRequest['source']
  resourceId?: string
  text?: string
  imageUrl?: string
  videoUrl?: string
  includeCopyrightMedia?: boolean
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default'
  className?: string
  onReport?: (report: ModerationReport) => void
}

export function ModerationValidateButton({
  projectId,
  stage,
  label,
  source,
  resourceId,
  text,
  imageUrl,
  videoUrl,
  includeCopyrightMedia,
  disabled,
  variant = 'outline',
  size = 'sm',
  className,
  onReport,
}: ModerationValidateButtonProps) {
  const [loading, setLoading] = useState(false)
  const creditCost = getValidationCreditLabel(stage, includeCopyrightMedia)
  const buttonLabel = label ?? `Validate (${creditCost} credits)`

  const handleClick = async () => {
    const confirmed = window.confirm(
      `Run Hive content validation for ${creditCost} credits? Results are informational only and do not block generation.`
    )
    if (!confirmed) return

    setLoading(true)
    try {
      const result = await requestModerationValidation({
        projectId,
        stage,
        source,
        resourceId,
        text,
        imageUrl,
        videoUrl,
        includeCopyrightMedia,
      })

      if (!result.success) {
        if (result.code === 'INSUFFICIENT_CREDITS') {
          toast.error(
            `Insufficient credits (${result.creditsAvailable ?? 0} available, ${result.creditsRequired ?? creditCost} required)`
          )
        } else if (result.code === 'MODERATION_DISABLED') {
          toast.error('Content validation is not enabled on this environment.')
        } else {
          toast.error(result.error || 'Validation failed')
        }
        return
      }

      if (result.moderationReport) {
        onReport?.(result.moderationReport)
        const hasFindings =
          result.moderationReport.action === 'warning' ||
          result.moderationReport.checks.some((c) => c.categories.length > 0)
        if (hasFindings) {
          toast.warning('Validation complete — review the policy notice for details.')
        } else {
          toast.success(`Validation complete (${result.creditsCharged ?? creditCost} credits charged).`)
        }
      } else {
        toast.success(`Validation complete (${result.creditsCharged ?? creditCost} credits charged).`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Validation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || loading || !projectId}
      onClick={handleClick}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Shield className="h-4 w-4 mr-2" />
      )}
      {loading ? 'Validating...' : buttonLabel}
    </Button>
  )
}
