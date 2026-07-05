/**
 * DirectorConsole entry — thin shell that lazy-loads the implementation chunk
 * to avoid webpack TDZ when ScriptPanel and queue modules share scope-hoisted deps.
 */
'use client'

import dynamic from 'next/dynamic'
import type { DirectorConsoleProps, DirectorWorkflowProps } from './DirectorConsoleImpl'

const DirectorConsoleImpl = dynamic(
  () =>
    import('./DirectorConsoleImpl').then((mod) => ({
      default: mod.DirectorConsoleRoot,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-6 w-6 border-2 border-slate-500 border-t-transparent rounded-full" />
          <span className="text-sm">Loading Director Console…</span>
        </div>
      </div>
    ),
  }
)

export type { DirectorWorkflowSlots, DirectorWorkflowProps, DirectorConsoleProps } from './DirectorConsoleImpl'

export function DirectorWorkflow(props: DirectorWorkflowProps) {
  return <DirectorConsoleImpl {...props} />
}

export function DirectorConsole(props: DirectorConsoleProps) {
  return <DirectorConsoleImpl {...props} />
}

export default DirectorConsole
