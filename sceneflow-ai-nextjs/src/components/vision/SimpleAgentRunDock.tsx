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
      tone={run.tone}
      items={run.items}
      progressPct={run.progressPct ?? null}
      onClose={run.finished ? () => dismissAgentRun(run.id) : undefined}
    />
  )
}

export default SimpleAgentRunDock
