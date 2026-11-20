'use client'

import React, { useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { getHelpUiCopy } from '@/config/help/helpUiCopy'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Clapperboard,
  HelpCircle,
  LifeBuoy,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  evaluateGenerationError,
  type EvaluatedGenerationError,
  type GenerationMediaType,
  type GenerationRecoveryAction,
} from '@/lib/errors/generationErrorIntelligence'
import {
  buildDeterministicShotInvestigation,
  type ShotErrorInvestigationResult,
  type ShotErrorReferenceSummary,
  type ShotErrorResolution,
} from '@/lib/errors/shotErrorInvestigator'
import type { SupportReportContext } from '@/lib/support/generationErrorReport'
import {
  ReportGenerationErrorDialog,
  type SupportErrorReportPayload,
} from '@/components/vision/ReportGenerationErrorDialog'
import { openJitHelp } from '@/components/help/JitHelpDrawer'

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
  referenceImages?: ShotErrorReferenceSummary[]
  suggestedWording?: string[]
  vertexRaiDetails?: string
  supportContext?: SupportReportContext
  isBusy?: boolean
  onRerun?: () => void
  onRetryI2V?: () => void
  onOpenDirector?: () => void
  onSwitchCreative?: () => void
  onOpenReferences?: () => void
  onApplyRevisedPrompt?: (revisedPrompt: string) => void | Promise<void>
  onRegeneratePortrait?: (refName?: string, guidance?: string) => void | Promise<void>
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
  referenceImages,
  suggestedWording,
  vertexRaiDetails,
  supportContext,
  isBusy = false,
  onRerun,
  onRetryI2V,
  onOpenDirector,
  onSwitchCreative,
  onOpenReferences,
  onApplyRevisedPrompt,
  onRegeneratePortrait,
  onDismiss,
  onReportToSupport,
  className,
}: GenerationErrorCardProps) {
  const locale = useLocale()
  const errorCardCopy = useMemo(() => getHelpUiCopy(locale).errorCard, [locale])
  const [localReportOpen, setLocalReportOpen] = useState(false)
  const [investigating, setInvestigating] = useState(false)
  const [investigation, setInvestigation] = useState<ShotErrorInvestigationResult | null>(null)
  const [applyingResolutionId, setApplyingResolutionId] = useState<string | null>(null)
  const [appliedResolutionIds, setAppliedResolutionIds] = useState<Record<string, boolean>>({})

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
            if (typeof window !== 'undefined') window.location.assign('/dashboard/settings/billing')
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

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy || investigating}
            onClick={async () => {
              setInvestigating(true)
              const payload = {
                mediaType,
                rawError:
                  typeof rawError === 'string'
                    ? rawError
                    : rawError instanceof Error
                      ? rawError.message
                      : undefined,
                technicalDetails,
                vertexRaiDetails,
                errorCode,
                statusCode,
                provider,
                generationMethod,
                hasStartFrame,
                isFTVRelated,
                prompt,
                referenceImages,
                shotLabel: supportContext?.shotLabel,
              }
              try {
                const res = await fetch('/api/production/investigate-shot-error', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                })
                if (res.ok) {
                  const data = (await res.json()) as ShotErrorInvestigationResult
                  setInvestigation(data)
                } else {
                  setInvestigation(buildDeterministicShotInvestigation(payload))
                }
              } catch {
                setInvestigation(buildDeterministicShotInvestigation(payload))
              } finally {
                setInvestigating(false)
              }
            }}
            className="h-7 border-cyan-500/50 bg-cyan-950/40 text-[11px] text-cyan-200 hover:bg-cyan-900/50"
          >
            {investigating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5 mr-1" />
            )}
            {investigating ? 'Investigating...' : 'Investigate'}
          </Button>
        </div>

        {investigation && (
          <div className="space-y-2 rounded-lg border border-cyan-500/35 bg-slate-950/80 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-1.5 min-w-0">
                <Zap className="h-3.5 w-3.5 shrink-0 text-cyan-400 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-cyan-200">
                    Self-Healing Diagnosis
                  </p>
                  <p className="text-[11px] leading-snug text-slate-300">
                    {investigation.summary}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInvestigation(null)}
                className="text-slate-500 hover:text-slate-300"
                aria-label="Close investigation"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {investigation.resolutions.map((res: ShotErrorResolution) => {
                const isApplying = applyingResolutionId === res.id
                const isApplied = Boolean(appliedResolutionIds[res.id])
                const handleApplyResolution = async () => {
                  setApplyingResolutionId(res.id)
                  try {
                    switch (res.actionType) {
                      case 'switch_creative_kling_f2v':
                        if (onSwitchCreative) onSwitchCreative()
                        else if (onRerun) onRerun()
                        break
                      case 'downgrade_ftv_to_i2v':
                        if (onRetryI2V) onRetryI2V()
                        else if (onRerun) onRerun()
                        break
                      case 'apply_sanitized_prompt_and_retry':
                      case 'mitigate_likeness_and_retry':
                        if (res.patch?.revisedPrompt && onApplyRevisedPrompt) {
                          await onApplyRevisedPrompt(res.patch.revisedPrompt)
                        } else if (onOpenDirector) {
                          onOpenDirector()
                        } else if (onRerun) {
                          onRerun()
                        }
                        break
                      case 'regenerate_non_celebrity_portrait':
                        if (onRegeneratePortrait) {
                          await onRegeneratePortrait(
                            res.patch?.flaggedReferenceName,
                            res.patch?.portraitRewriteGuidance
                          )
                        } else if (onOpenReferences) {
                          onOpenReferences()
                        }
                        break
                      case 'open_director_rewrite':
                        if (onOpenDirector) onOpenDirector()
                        break
                      case 'open_references':
                        if (onOpenReferences) onOpenReferences()
                        break
                      case 'retry_after_cooldown':
                      case 'rerun':
                      default:
                        if (onRerun) onRerun()
                        break
                    }
                    setAppliedResolutionIds((prev) => ({ ...prev, [res.id]: true }))
                  } finally {
                    setApplyingResolutionId(null)
                  }
                }

                return (
                  <div
                    key={res.id}
                    className="rounded-md border border-slate-800 bg-slate-900/70 p-2 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-white">
                            {res.title}
                          </span>
                          {res.recommended && (
                            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                          {res.reason}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isBusy || isApplying}
                        onClick={handleApplyResolution}
                        className={cn(
                          'h-6 shrink-0 px-2.5 text-[10px] font-semibold',
                          isApplied
                            ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                            : res.recommended
                              ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        )}
                      >
                        {isApplying ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : isApplied ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Zap className="h-3 w-3 mr-1" />
                        )}
                        {isApplying ? 'Applying...' : isApplied ? 'Applied' : res.ctaLabel}
                      </Button>
                    </div>
                    {res.patch?.revisedPrompt && (
                      <p className="rounded bg-black/40 px-2 py-1 text-[10px] text-slate-300/90 line-clamp-2">
                        {res.patch.revisedPrompt}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {(showTechnicalToggle || evaluated.canReportToSupport) && (
          <details className="rounded border border-slate-800/80 bg-black/30 px-2.5 py-1">
            <summary className="cursor-pointer select-none text-[10px] text-slate-400 hover:text-slate-200">
              {errorCardCopy.technicalDetailsSummary}
            </summary>
            {rawDiag && (
              <pre className="mt-1.5 max-h-36 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-slate-300/90">
                {rawDiag}
              </pre>
            )}
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-1.5">
              <button
                type="button"
                onClick={() => openJitHelp({ contextId: 'production', tab: 'coach' })}
                className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 underline-offset-2 hover:underline"
              >
                <HelpCircle className="h-3 w-3" />
                {errorCardCopy.troubleshootingGuideBtn}
              </button>
              {evaluated.canReportToSupport && (
                <button
                  type="button"
                  onClick={handleOpenSupport}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline"
                >
                  <LifeBuoy className="h-3 w-3" />
                  {errorCardCopy.reportBugBtn}
                </button>
              )}
            </div>
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
