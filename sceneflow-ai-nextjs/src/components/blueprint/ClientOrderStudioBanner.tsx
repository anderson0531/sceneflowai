'use client'

import React, { useMemo, useState } from 'react'
import {
  Briefcase,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Send,
  Sparkles,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  estimateBlueprintMarginSummary,
  estimateBlueprintProjectCost,
} from '@/lib/credits/blueprintCostEstimator'
import { cn } from '@/lib/utils'

interface ClientOrderStudioBannerProps {
  projectId: string
  treatment: Record<string, unknown> | null | undefined
  projectMetadata: Record<string, unknown> | null | undefined
  shareUrl: string | null
  isSharing: boolean
  isIllustratingBeats?: boolean
  onOpenBudgetTab: () => void
  onAcceptAndShareBlueprint: () => Promise<void>
  onIllustrateAllBeats?: () => Promise<void>
  onStartProduction?: () => void
  onClientOrderUpdated?: (nextClientOrder: Record<string, unknown>) => void
}

export function ClientOrderStudioBanner({
  projectId,
  treatment,
  projectMetadata,
  shareUrl,
  isSharing,
  isIllustratingBeats = false,
  onOpenBudgetTab,
  onAcceptAndShareBlueprint,
  onIllustrateAllBeats,
  onStartProduction,
  onClientOrderUpdated,
}: ClientOrderStudioBannerProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const clientOrder = (projectMetadata?.clientOrder || null) as Record<
    string,
    unknown
  > | null

  const estimate = useMemo(
    () =>
      estimateBlueprintProjectCost({
        treatment,
        visionPhase: (projectMetadata?.visionPhase || null) as Record<
          string,
          unknown
        > | null,
        sunkCreditsUsed: Number(projectMetadata?.creditsUsed || 0),
        options: (projectMetadata?.creditsBudgetParams || undefined) as any,
      }),
    [treatment, projectMetadata]
  )

  const clientPriceUsd =
    typeof clientOrder?.clientPriceUsd === 'number'
      ? clientOrder.clientPriceUsd
      : 300
  const maxRounds =
    typeof clientOrder?.maxFeedbackRounds === 'number'
      ? clientOrder.maxFeedbackRounds
      : 2

  const margin = useMemo(
    () =>
      estimateBlueprintMarginSummary({
        estimate,
        clientPriceUsd,
        includedRevisionRounds: maxRounds,
      }),
    [estimate, clientPriceUsd, maxRounds]
  )

  if (!clientOrder?.isClientProject) return null

  const stage = String(clientOrder.stage || 'blueprint_review_ready')
  const customerName = String(
    clientOrder.customerName || clientOrder.customerLabel || 'Client'
  )
  const customerEmail = clientOrder.customerEmail
    ? String(clientOrder.customerEmail)
    : null
  const confirmedVision = (clientOrder.confirmedVision || null) as {
    clarifiedVision?: string
    intendedImpact?: string
    targetAudience?: string
    toneAndStyle?: string
  } | null
  const transcriptText =
    typeof projectMetadata?.blueprintPrimeInput === 'string'
      ? projectMetadata.blueprintPrimeInput
      : ''

  const beats = Array.isArray(treatment?.beats)
    ? (treatment!.beats as Array<Record<string, unknown>>)
    : []
  const illustratedBeatsCount = beats.filter((b) =>
    Boolean(b?.imageUrl || b?.storyboardStillUrl || b?.stillUrl)
  ).length

  const stageConfig =
    stage === 'blueprint_approved'
      ? {
          label: 'Client Approved Blueprint',
          pillClass:
            'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
          icon: CheckCircle2,
        }
      : stage === 'awaiting_blueprint_approval'
        ? {
            label: 'Shared • Awaiting Client Sign-Off',
            pillClass: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
            icon: Clock,
          }
        : {
            label: 'New Intake • Producer Review Ready',
            pillClass: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
            icon: Sparkles,
          }

  const StageIcon = stageConfig.icon

  const handleAcceptAndShare = async () => {
    if (accepting || isSharing) return
    setAccepting(true)
    try {
      const res = await fetch(
        `/api/producer/projects/${encodeURIComponent(projectId)}/accept-blueprint`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creditsBudget: margin.recommendedCreditCeiling,
            creditsBudgetParams: estimate.creditsBudgetParams,
            clientPriceUsd,
          }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not accept client Blueprint')
      }
      if (data.clientOrder) {
        onClientOrderUpdated?.(data.clientOrder)
      }
      await onAcceptAndShareBlueprint()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to accept & share Blueprint'
      )
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-slate-900 via-purple-950/20 to-slate-900 px-4 py-3.5 shadow-lg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Client identity + stage */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 text-xs font-semibold text-purple-200">
            <Briefcase className="w-3.5 h-3.5 text-purple-400" />
            {customerName}
            {customerEmail ? (
              <span className="text-purple-300/70 font-normal">
                ({customerEmail})
              </span>
            ) : null}
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
              stageConfig.pillClass
            )}
          >
            <StageIcon className="w-3.5 h-3.5" />
            {stageConfig.label}
          </span>

          <button
            type="button"
            onClick={onOpenBudgetTab}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 hover:border-cyan-500/40 px-2.5 py-1 text-xs text-slate-200 transition"
            title="Open Blueprint Cost & Margin Estimator"
          >
            <Calculator className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              COGS ~${margin.sceneFlowCogsUsd.toFixed(2)} (
              {margin.recommendedCreditCeiling.toLocaleString()} cr)
            </span>
            <span className="text-slate-500">•</span>
            <span
              className={
                margin.healthyMargin ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'
              }
            >
              {margin.providerGrossMarginPercent}% Margin on ${clientPriceUsd}
            </span>
          </button>
        </div>

        {/* Right: Producer Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {(confirmedVision?.clarifiedVision || transcriptText) && (
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200"
            >
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              Client Vision & Intake
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 transition-transform',
                  detailsOpen && 'rotate-180'
                )}
              />
            </button>
          )}

          {onIllustrateAllBeats && beats.length > 0 && (
            <button
              type="button"
              onClick={() => void onIllustrateAllBeats()}
              disabled={isIllustratingBeats}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-200 disabled:opacity-50"
            >
              {isIllustratingBeats ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
              {illustratedBeatsCount >= beats.length
                ? `Refresh Storyboard Stills (${illustratedBeatsCount}/${beats.length})`
                : `Illustrate Beats (${illustratedBeatsCount}/${beats.length})`}
            </button>
          )}

          {stage === 'blueprint_approved' ? (
            <>
              <a
                href={`/dashboard/settings/producer`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 hover:bg-purple-500/25 px-3 py-1.5 text-xs font-semibold text-purple-100"
              >
                Send Continuity Photo Link
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {onStartProduction && (
                <button
                  type="button"
                  onClick={onStartProduction}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white"
                >
                  Start Production
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleAcceptAndShare()}
              disabled={accepting || isSharing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3.5 py-1.5 text-xs font-semibold text-white transition"
            >
              {accepting || isSharing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {shareUrl && stage === 'awaiting_blueprint_approval'
                ? 'Sync & Copy Client Share Link'
                : 'Accept Project & Share Blueprint'}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Confirmed Vision + Intake Transcript Drawer */}
      {detailsOpen && (
        <div className="pt-2 border-t border-slate-800/80 grid md:grid-cols-2 gap-3 text-xs">
          {confirmedVision?.clarifiedVision && (
            <div className="rounded-xl border border-cyan-500/25 bg-slate-950/75 p-3 space-y-1.5">
              <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Customer Confirmed Vision Statement
              </div>
              <p className="text-slate-200 leading-relaxed">
                {confirmedVision.clarifiedVision}
              </p>
              {confirmedVision.intendedImpact && (
                <p className="text-emerald-300/90">
                  <span className="font-semibold">Intended Impact:</span>{' '}
                  {confirmedVision.intendedImpact}
                </p>
              )}
            </div>
          )}

          {transcriptText && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-3 space-y-1.5 max-h-44 overflow-y-auto">
              <div className="font-semibold text-slate-300">
                Automated Intake Discovery Transcript
              </div>
              <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-400 leading-relaxed">
                {transcriptText}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
