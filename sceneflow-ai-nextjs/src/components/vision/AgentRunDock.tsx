'use client'

import type { ReactNode } from 'react'
import { AlertTriangle, Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The one shape every agent run reports through.
 *
 * Each agent used to report differently — the Frame Agent into a corner card,
 * the Audio Agent into the full-screen processing overlay, the Video Agent into
 * a bar inside a console that stops existing when you close it. A run that the
 * user is meant to walk away from has to report the same way wherever it came
 * from, so the card and its stack live here and the agents only supply rows.
 */

export type AgentRunItemStatus = 'pending' | 'running' | 'done' | 'error'

export type AgentRunTone = 'running' | 'success' | 'warning' | 'error'

export interface AgentRunPhase {
  key: string
  label: string
  status: AgentRunItemStatus
}

export interface AgentRunItem {
  key: string
  label: string
  status: AgentRunItemStatus
  error?: string
}

export interface AgentRunDockProps {
  title: string
  /** One line under the title: what is happening, or how it ended. */
  subtitle?: ReactNode
  tone?: AgentRunTone
  phases?: AgentRunPhase[]
  items?: AgentRunItem[]
  /** Counts, elapsed time and ETA — rendered above the progress bar. */
  meta?: ReactNode
  /** 0-100. Omit to hide the bar. */
  progressPct?: number | null
  /** Close/dismiss affordance. Omit while a run must not be dismissed. */
  onClose?: () => void
  closeLabel?: string
  /** Buttons offered once the run has settled. */
  footer?: ReactNode
  /** Extra content between the meta line and the item rows. */
  children?: ReactNode
  className?: string
}

function toneIcon(tone: AgentRunTone) {
  switch (tone) {
    case 'success':
      return <Check className="h-4 w-4 text-emerald-400" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-400" />
    case 'error':
      return <AlertTriangle className="h-4 w-4 text-rose-400" />
    default:
      return <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
  }
}

function AgentPhasePill({ label, status }: { label: string; status: AgentRunItemStatus }) {
  const cls = (() => {
    switch (status) {
      case 'running':
        return 'bg-indigo-500/30 text-indigo-200 border-indigo-400/40'
      case 'done':
        return 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
      case 'error':
        return 'bg-rose-500/30 text-rose-200 border-rose-400/40'
      default:
        return 'bg-gray-700/40 text-gray-300 border-gray-500/40'
    }
  })()

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border',
        cls
      )}
    >
      {status === 'running' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {status === 'done' && <Check className="w-2.5 h-2.5" />}
      {status === 'error' && <X className="w-2.5 h-2.5" />}
      {label}
    </span>
  )
}

function AgentItemRow({ item }: { item: AgentRunItem }) {
  const cls = (() => {
    switch (item.status) {
      case 'running':
        return 'border-amber-400/50 bg-amber-500/10 text-amber-100'
      case 'done':
        return 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
      case 'error':
        return 'border-rose-400/50 bg-rose-500/10 text-rose-100'
      default:
        return 'border-gray-600/50 bg-gray-800/40 text-gray-300'
    }
  })()

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]',
        item.status === 'running' && 'animate-pulse',
        cls
      )}
      title={item.error}
    >
      <span className="shrink-0">
        {item.status === 'running' && (
          <Loader2 className="w-3 h-3 animate-spin text-amber-300" aria-hidden />
        )}
        {item.status === 'done' && <Check className="w-3 h-3 text-emerald-300" aria-hidden />}
        {item.status === 'error' && <X className="w-3 h-3 text-rose-300" aria-hidden />}
        {item.status === 'pending' && (
          <span className="inline-block w-3 h-3 rounded-full border border-gray-500" aria-hidden />
        )}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.status === 'error' && item.error && (
        <span className="text-[10px] text-rose-200/80 truncate max-w-[100px]">{item.error}</span>
      )}
    </div>
  )
}

/**
 * A single agent run, reported without taking the page away from the user.
 *
 * Positioning belongs to `AgentDockStack` — a card that places itself cannot be
 * stacked with another one without each knowing how tall its neighbours are.
 */
export function AgentRunDock({
  title,
  subtitle,
  tone = 'running',
  phases,
  items,
  meta,
  progressPct,
  onClose,
  closeLabel = 'Close',
  footer,
  children,
  className,
}: AgentRunDockProps) {
  const hasProgress = typeof progressPct === 'number'

  return (
    <div
      className={cn(
        'pointer-events-auto w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn('px-3 py-2', (phases?.length || items?.length || meta || hasProgress || children) && 'border-b border-slate-800')}>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0">{toneIcon(tone)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{title}</p>
            {subtitle ? (
              <p
                className={cn(
                  'mt-0.5 text-[11px]',
                  tone === 'error'
                    ? 'text-rose-300'
                    : tone === 'warning'
                      ? 'text-amber-300/90'
                      : 'text-slate-400'
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        {phases?.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {phases.map((phase) => (
              <AgentPhasePill key={phase.key} label={phase.label} status={phase.status} />
            ))}
          </div>
        ) : null}
      </div>

      {meta || hasProgress || items?.length || children ? (
        <div className="px-3 py-2 space-y-2">
          {meta ? <div className="text-[11px] text-slate-400">{meta}</div> : null}

          {hasProgress ? (
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progressPct ?? 0))}%` }}
              />
            </div>
          ) : null}

          {children}

          {items?.length ? (
            <div className="max-h-40 overflow-y-auto space-y-1 pr-0.5">
              {items.map((item) => (
                <AgentItemRow key={item.key} item={item} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {footer ? (
        <div className="border-t border-slate-800 px-3 py-2 flex flex-wrap justify-end gap-1.5">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Bottom-right column that every dock renders into.
 *
 * Docks used to place themselves and were kept apart by passing `bottom-44` and
 * `bottom-80` down from the page, which only held while exactly the two docks
 * the author had in mind were open. Newest run sits closest to the corner.
 */
export function AgentDockStack({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex max-h-[calc(100vh-2rem)] flex-col-reverse items-end gap-2 overflow-y-auto">
      {children}
    </div>
  )
}

export default AgentRunDock
