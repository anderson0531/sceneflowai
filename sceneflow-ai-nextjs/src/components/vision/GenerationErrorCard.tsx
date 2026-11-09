'use client'

import React, { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Clapperboard,
  LifeBuoy,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  evaluateGenerationError,
  type EvaluatedGenerationError,
  type GenerationMediaType,
  type GenerationRecoveryAction,
} from '@/lib/errors/generationErrorIntelligence'
import type { SupportReportContext } from '@/lib/support/generationErrorReport'
import {
  ReportGenerationErrorDialog,
  type SupportErrorReportPayload,
} from '@/components/vision/ReportGenerationErrorDialog'

export interface GenerationErrorCardProps {
  mediaType: GenerationMediaType
  rawError?: unknown
  technicalDetails?: string
  userGuidance?: EvaluatedGenerationError | null
  statusCode?: number
  errorCode?: string | null
  generationMethod?: string | null
  provider?: string | null
  hasStartFrame?: boolean
  isFTVRelated?: boolean
  prompt?: string
  suggestedWording?: string[]
  vertexRaiDetails?: string
  supportContext?: SupportReportContext
  isBusy?: boolean
  onRerun?: () => void
  onRetryI2V?: () => void
  onOpenDirector?: () => void
  onSwitchCreative?: () => void
  onOpenReferences?: () => void
  onDismiss?: () => void
  onReportToSupport?: (payload: SupportErrorReportPayload) => void
  className?: string
}

export function GenerationErrorCard({
  mediaType,
  rawError,
  technicalDetails,
  userGuidance,
  statusCode,
  errorCode,
  generationMethod,
  provider,
  hasStartFrame,
  isFTVRelated,
  prompt,
  suggestedWording,
  vertexRaiDetails,
  supportContext,
  isBusy = false,
  onRerun,
  onRetryI2V,
  onOpenDirector,
  onSwitchCreative,
  onOpenReferences,
  onDismiss,
  onReportToSupport,
  className,
}: GenerationErrorCardProps) {
  const [localReportOpen, setLocalReportOpen] = useState(false)

  const evaluated =
    userGuidance ??
    evaluateGenerationError({
      mediaType,
      rawError: technicalDetails || rawError,
      statusCode,
      errorCode,
      generationMethod,
      provider,
      hasStartFrame,
      isFTVRelated,
    })

  const rawDiag = [
    technicalDetails,
    typeof rawError === 'string' ? rawError : rawError instanceof Error ? rawError.message : undefined,
    vertexRaiDetails ? `RAI / safety details:\n${vertexRaiDetails}` : undefined,
  ]
    .filter((s): s is string => Boolean(s?.trim()))
    .join('\n\n')

  const showTechnicalToggle =
    Boolean(rawDiag.trim()) &&
    rawDiag.trim() !== evaluated.explanation.trim() &&
    rawDiag.trim() !== evaluated.shortSummary.trim()

  const resolveHandler = (
    action: GenerationRecoveryAction
  ): { onClick: () => void; label: string; icon: React.ReactNode } | null => {
    switch (action) {
      case 'retry_i2v':
        if (onRetryI2V) {
          return {
            onClick: onRetryI2V,
            label: 'Retry with Start Frame',
            icon: <RefreshCw className="h-3.5 w-3.5 mr-1" />,
          }
        }
        if (onRerun) {
          return {
            onClick: onRerun,
            label: evaluated.primaryCta.label,
            icon: <RefreshCw className="h-3.5 w-3.5 mr-1" />,
          }
        }
        return null
      case 'rewrite_director':
        if (onOpenDirector) {
          return {
            onClick: onOpenDirector,
            label: mediaType === 'clip' ? 'Rewrite for Safety' : 'Shot Director',
            icon: <Clapperboard className="h-3.5 w-3.5 mr-1" />,
          }
        }
        if (onRerun) {
          return {
            onClick: onRerun,
            label: mediaType === 'clip' ? 'Rerun Clip' : 'Rerun Still',
            icon: <RefreshCw className="h-3.5 w-3.5 mr-1" />,
          }
        }
        return null
      case 'switch_creative':
        if (onSwitchCreative) {
          return {
            onClick: onSwitchCreative,
            label: 'Switch to Creative',
            icon: <Sparkles className="h-3.5 w-3.5 mr-1" />,
          }
        }
        return null
      case 'open_references':
        if (onOpenReferences) {
          return {
            onClick: onOpenReferences,
            label: 'Review References',
            icon: <Sparkles className="h-3.5 w-3.5 mr-1" />,
          }
        }
        return null
      case 'refresh_session':
        return {
          onClick: () => {
            if (typeof window !== 'undefined') window.location.reload()
          },
          label: 'Refresh Page',
          icon: <RefreshCw className="h-3.5 w-3.5 mr-1" />,
        }
      case 'top_up_credits':
        return {
          onClick: () => {
            if (typeof window !== 'undefined') window.location.assign('/dashboard/settings')
          },
          label: 'View Credits',
          icon: <Sparkles className="h-3.5 w-3.5 mr-1" />,
        }
      case 'regenerate_previous':
      case 'rerun':
      default:
        if (onRerun) {
          return {
            onClick: onRerun,
            label: mediaType === 'clip' ? 'Rerun Clip' : 'Rerun Still',
            icon: <RefreshCw className="h-3.5 w-3.5 mr-1" />,
          }
        }
        return null
    }
  }

  const primaryBtn = resolveHandler(evaluated.primaryCta.action)
  const secondaryBtn = evaluated.secondaryCta
    ? resolveHandler(evaluated.secondaryCta.action)
    : null
  const distinctSecondaryBtn =
    secondaryBtn && secondaryBtn.label !== primaryBtn?.label ? secondaryBtn : null

  // If primary wasn't Rerun (e.g. policy block -> Shot Director) and onRerun exists, still allow quick Rerun
  const fallbackRerunBtn =
    onRerun &&
    primaryBtn?.label !== 'Rerun Clip' &&
    primaryBtn?.label !== 'Rerun Still' &&
    distinctSecondaryBtn?.label !== 'Rerun Clip' &&
    distinctSecondaryBtn?.label !== 'Rerun Still'
      ? {
          onClick: onRerun,
          label: mediaType === 'clip' ? 'Rerun Clip' : 'Rerun Still',
        }
      : null

  const reportPayload: SupportErrorReportPayload = {
    mediaType,
    rawError: typeof rawError === 'string' ? rawError : undefined,
    technicalDetails: rawDiag || undefined,
    statusCode,
    errorCode: errorCode || undefined,
    title: evaluated.title,
    explanation: `${evaluated.explanation} ${evaluated.suggestion}`.trim(),
    recommendedAction: evaluated.primaryCta.label,
    prompt,
    context: {
      ...supportContext,
      generationMethod: supportContext?.generationMethod ?? generationMethod ?? undefined,
      provider: supportContext?.provider ?? provider ?? undefined,
    },
  }

  const handleOpenSupport = () => {
    if (onReportToSupport) {
      onReportToSupport(reportPayload)
      return
    }
    setLocalReportOpen(true)
  }

  const isWarning = evaluated.severity === 'warning'

  return (
    <>
      <div
        className={cn(
          'rounded-lg border p-3 space-y-2.5',
          isWarning
            ? 'border-amber-500/40 bg-amber-950/30 text-amber-50'
            : 'border-rose-500/40 bg-rose-950/40 text-rose-50',
          className
        )}
      >
        <div className="flex items-start gap-2.5">
          {isWarning ? (
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-white">{evaluated.title}</p>
              <div className="flex items-center gap-1.5">
                {evaluated.noCreditsCharged && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                    No credits charged
                  </span>
                )}
                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss error"
                    className="rounded p-0.5 text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-200">{evaluated.explanation}</p>
            <p className="text-[11px] leading-relaxed text-slate-300/90">{evaluated.suggestion}</p>
          </div>
        </div>

        {suggestedWording && suggestedWording.length > 0 && (
          <div className="rounded border border-slate-700/60 bg-slate-950/50 px-2.5 py-1.5 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Suggested safer phrasing
            </p>
            {suggestedWording.map((wording) => (
              <p key={wording} className="text-[11px] leading-relaxed text-slate-200">
                {wording}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {primaryBtn && (
            <Button
              type="button"
              size="sm"
              disabled={isBusy}
              onClick={primaryBtn.onClick}
              className={cn(
                'h-7 text-[11px] text-white',
                isWarning
                  ? 'bg-indigo-600 hover:bg-indigo-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              )}
            >
              {primaryBtn.icon}
              {primaryBtn.label}
            </Button>
          )}

          {distinctSecondaryBtn && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={distinctSecondaryBtn.onClick}
              className="h-7 border-slate-600 bg-slate-900/60 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              {distinctSecondaryBtn.icon}
              {distinctSecondaryBtn.label}
            </Button>
          )}

          {fallbackRerunBtn && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={fallbackRerunBtn.onClick}
              className="h-7 border-slate-600 bg-slate-900/60 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              {fallbackRerunBtn.label}
            </Button>
          )}

          {evaluated.canReportToSupport && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenSupport}
              className={cn(
                'h-7 text-[11px]',
                evaluated.recommendSupportEscalation
                  ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/50'
                  : 'border-slate-600/80 bg-slate-900/50 text-slate-300 hover:bg-slate-800'
              )}
            >
              <LifeBuoy className="h-3.5 w-3.5 mr-1" />
              Report to Support
            </Button>
          )}
        </div>

        {showTechnicalToggle && (
          <details className="rounded border border-slate-800/80 bg-black/30 px-2.5 py-1">
            <summary className="cursor-pointer select-none text-[10px] text-slate-400 hover:text-slate-200">
              Technical details
            </summary>
            <pre className="mt-1.5 max-h-36 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-slate-300/90">
              {rawDiag}
            </pre>
          </details>
        )}
      </div>

      {!onReportToSupport && (
        <ReportGenerationErrorDialog
          open={localReportOpen}
          onOpenChange={setLocalReportOpen}
          payload={reportPayload}
        />
      )}
    </>
  )
}

export default GenerationErrorCard
