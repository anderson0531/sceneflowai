import type { PhaseId } from '@/types/continuity'

export type WorkflowState = 'phase0'|'phase1'|'phase2'|'phase3'|'phase4'|'phase5'|'phase6'

export interface WorkflowContext {
  locks: Record<number, boolean>
}

export const workflowConfig = {
  initial: 'phase0' as WorkflowState,
  states: {
    phase0: { next: 'phase1' as WorkflowState },
    phase1: { prev: 'phase0' as WorkflowState, next: 'phase2' as WorkflowState },
    phase2: { prev: 'phase1' as WorkflowState, next: 'phase3' as WorkflowState },
    phase3: { prev: 'phase2' as WorkflowState, next: 'phase4' as WorkflowState },
    phase4: { prev: 'phase3' as WorkflowState, next: 'phase5' as WorkflowState },
    phase5: { prev: 'phase4' as WorkflowState, next: 'phase6' as WorkflowState },
    phase6: { prev: 'phase5' as WorkflowState }
  }
}

export function canLockPhase(_ctx: WorkflowContext, _phase: PhaseId): boolean { return true }

export function cascadeInvalidateFrom(phase: PhaseId): PhaseId[] {
  if (phase === 2) return [3,4,5]
  if (phase === 3) return [4,5]
  if (phase === 4) return [5]
  return []
}
