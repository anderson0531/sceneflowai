'use client'

import { SimpleAgentRunDock } from '@/components/vision/SimpleAgentRunDock'
import { useAgentRunStore } from '@/store/useAgentRunStore'

/** Renders every store-backed agent run into the dock stack. */
export function AgentRunStoreDocks() {
  const runs = useAgentRunStore((state) => state.runs)
  return (
    <>
      {runs.map((run) => (
        <SimpleAgentRunDock key={run.id} run={run} />
      ))}
    </>
  )
}

export default AgentRunStoreDocks
