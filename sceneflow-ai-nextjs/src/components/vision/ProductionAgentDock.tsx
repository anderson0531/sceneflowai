'use client'

import React, { useEffect, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Play,
  Square,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type {
  ProductionAgentTelemetry,
  ProductionCheckpointGate,
  ProductionStageId,
} from '@/lib/production/runProductionAgent'

export interface ProductionAgentDockState {
  visible: boolean
  running: boolean
  finished: boolean
  startedAt: number | null
  stage: ProductionStageId
  subtitle: string
  progressPct: number
  telemetry: ProductionAgentTelemetry
  checkpointGate: ProductionCheckpointGate | null
}

interface ProductionAgentDockProps {
  state: ProductionAgentDockState | null
  onApproveCheckpoint?: () => void
  onStopCheckpoint?: () => void
  onCancel?: () => void
  onClose?: () => void
  onOpenScreeningView?: () => void
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) {
    return `${hrs}h ${mins % 60}m`
  }
  return `${mins}m ${seconds % 60}s`
}

const STAGE_LABELS: Record<ProductionStageId, string> = {
  previs: 'Stage 1 · Pre-Vis',
  clips: 'Stage 2 · Clips',
  scenes: 'Stage 3 · Scenes',
  master: 'Stage 4 · Master',
  promo: 'Stage 5 · Promo',
}

export function ProductionAgentDock({
  state,
  onApproveCheckpoint,
  onStopCheckpoint,
  onCancel,
  onClose,
  onOpenScreeningView,
}: ProductionAgentDockProps) {
  const [elapsedSec, setElapsedSec] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!state?.visible || state.finished || !state.startedAt) return
    const startedAt = state.startedAt
    const tick = () => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [state?.visible, state?.finished, state?.startedAt])

  if (!state || !state.visible) return null

  const { telemetry, checkpointGate } = state
  const screeningUrl = checkpointGate?.screeningUrl || telemetry.screeningUrl

  const handleCopyScreeningLink = async () => {
    if (!screeningUrl) return
    try {
      const fullUrl = screeningUrl.startsWith('http')
        ? screeningUrl
        : `${window.location.origin}${screeningUrl}`
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      toast.success('Screening Room link copied to clipboard')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-purple-950/40 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-purple-600 text-white shrink-0">
            {state.running && !checkpointGate ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : state.finished && telemetry.errors.length === 0 ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Bot className="w-3.5 h-3.5" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate">
                Production Agent
              </span>
              <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                {STAGE_LABELS[state.stage]}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-slate-400">
          <span>
            {telemetry.scenesCompleted}/{telemetry.totalScenes} scenes
          </span>
          <span>·</span>
          <span>{state.finished ? '100%' : `${state.progressPct}%`}</span>
          {state.startedAt && (
            <>
              <span>·</span>
              <span>{formatElapsed(elapsedSec)}</span>
            </>
          )}
          {state.running && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              title="Stop Production Agent"
              className="ml-1 rounded p-1 text-rose-400 hover:bg-rose-500/15 hover:text-rose-300"
            >
              <Square className="w-3 h-3" />
            </button>
          )}
          {state.finished && onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Dismiss Production Agent dock"
              className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-900 overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300',
            checkpointGate
              ? 'bg-amber-400'
              : state.finished
                ? telemetry.errors.length > 0
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
                : 'bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400'
          )}
          style={{ width: `${state.finished ? 100 : Math.max(5, state.progressPct)}%` }}
        />
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-3">
        <p className="text-xs text-slate-300 leading-snug">{state.subtitle}</p>

        {/* Live Telemetry Counters */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="rounded-lg bg-slate-900/90 border border-slate-800 px-2 py-1.5">
            <div className="text-xs font-extrabold text-white">
              {telemetry.stillsGenerated}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Stills
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/90 border border-slate-800 px-2 py-1.5">
            <div className="text-xs font-extrabold text-purple-300">
              {telemetry.clipsGenerated}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Clips
            </div>
          </div>
          <div
            className="rounded-lg bg-slate-900/90 border border-slate-800 px-2 py-1.5"
            title="Shots where the Agent automatically optimized shot direction"
          >
            <div className="text-xs font-extrabold text-cyan-300 flex items-center justify-center gap-0.5">
              <Sparkles className="w-3 h-3" />
              {telemetry.shotsOptimized}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Optimized
            </div>
          </div>
          <div
            className="rounded-lg bg-slate-900/90 border border-slate-800 px-2 py-1.5"
            title="Policy-blocked shots automatically rescued via Creative Clips"
          >
            <div className="text-xs font-extrabold text-emerald-300 flex items-center justify-center gap-0.5">
              <ShieldCheck className="w-3 h-3" />
              {telemetry.creativeFallbacksUsed}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Creative
            </div>
          </div>
        </div>

        {/* Director Checkpoint Approval Gate */}
        {checkpointGate && (
          <div className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-200">
                ⏸ {checkpointGate.title}
              </span>
            </div>
            <p className="text-[11px] text-amber-100/85 leading-snug">
              {checkpointGate.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onApproveCheckpoint && (
                <button
                  type="button"
                  onClick={onApproveCheckpoint}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  Approve & Continue →
                </button>
              )}
              {onOpenScreeningView && (
                <button
                  type="button"
                  onClick={onOpenScreeningView}
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/50 bg-cyan-500/15 hover:bg-cyan-500/25 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Inspect in Screening Room
                </button>
              )}
              {onStopCheckpoint && (
                <button
                  type="button"
                  onClick={onStopCheckpoint}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300"
                >
                  Stop Here
                </button>
              )}
            </div>
          </div>
        )}

        {/* Screening Room Review Link Banner */}
        {screeningUrl && !checkpointGate && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Screening Room Link Ready
              </div>
              <div className="text-xs font-mono text-slate-200 truncate">
                {screeningUrl}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyScreeningLink}
                title="Copy Screening Room link"
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-slate-900/90 hover:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-emerald-200"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <a
                href={screeningUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1 text-[11px] font-bold text-slate-950"
              >
                <span>Open</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Error summary if any */}
        {state.finished && telemetry.errors.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">
              {telemetry.errors[0]}
              {telemetry.errors.length > 1
                ? ` (+${telemetry.errors.length - 1} more)`
                : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
export default ProductionAgentDock
