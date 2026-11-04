'use client'

import { AgentRunDock } from '@/components/vision/AgentRunDock'
import type { StoredAgentRun } from '@/store/useAgentRunStore'
import { dismissAgentRun } from '@/store/useAgentRunStore'

/**
 * One-row (or few-row) agent run from `useAgentRunStore`.
 *
 * DirectFrameRunDock is the visual template: same AgentRunDock card, no freeze.
 */
export function SimpleAgentRunDock({ run }: { run: StoredAgentRun }) {
  const keepTabPhrase = 'keep this tab open'
  const subtitle =
    run.keepTabOpen && !run.finished
      ? run.subtitle?.toLowerCase().includes(keepTabPhrase)
        ? run.subtitle
        : `${run.subtitle ?? 'Working'} — ${keepTabPhrase}`
      : run.subtitle

  return (
    <AgentRunDock
      title={run.title}
      subtitle={subtitle}
      meta={run.meta}
      tone={run.tone}
      items={run.items}
      progressPct={run.progressPct ?? null}
      onClose={
        run.finished
          ? () => dismissAgentRun(run.id)
          : run.onCancel
            ? () => run.onCancel?.()
            : undefined
      }
      closeLabel={run.finished ? 'Dismiss' : 'Cancel run'}
      footer={
        !run.finished && run.onCancel ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => run.onCancel?.()}
              className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {run.cancelLabel || 'Cancel'}
            </button>
          </div>
        ) : run.finished && run.onAction && run.actionLabel ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => run.onAction?.()}
              className="rounded-md bg-cyan-500 hover:bg-cyan-400 px-2.5 py-1 text-[11px] font-semibold text-slate-950 transition-colors"
            >
              {run.actionLabel}
            </button>
          </div>
        ) : undefined
      }
    />
  )
}

export default SimpleAgentRunDock
