import { describe, expect, it } from 'vitest'
import {
  readWorkerState,
  writeWorkerState,
} from '@/lib/jobs/blueprintGuidedReviseWorkerState'
import type { BlueprintChangePlan } from '@/lib/treatment/blueprintRevisionTypes'

const samplePlan: BlueprintChangePlan = {
  primaryGoal: 'Balance story and beats',
  sectionsToUpdate: ['story', 'beats'],
  crossSectionDependencies: [],
  preserveConstraints: [],
  coherenceActions: [],
}

describe('blueprintGuidedReviseWorkerState', () => {
  it('reads and writes _worker on payload', () => {
    const payload = { userIntent: 'Tighten act two' }
    const next = writeWorkerState(payload, {
      phase: 'rewrite',
      plan: samplePlan,
      sections: ['story', 'beats'],
      sectionIndex: 0,
      mergedPatch: {},
    })
    expect(readWorkerState(next)?.phase).toBe('rewrite')
    expect(readWorkerState(payload)).toBeNull()
  })
})
