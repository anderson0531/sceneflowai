import { describe, it, expect } from 'vitest'
import { evaluateBlueprintReadyChecklist } from '@/lib/blueprint/blueprintReadinessGate'

describe('blueprintReadinessGate runtime estimate', () => {
  it('prefers variant estimatedDurationMinutes over legacy metadata', () => {
    const checklist = evaluateBlueprintReadyChecklist({
      hasBlueprint: true,
      variant: {
        estimatedDurationMinutes: 45,
        format_length: '600 seconds',
        beats: [{ title: 'Beat', minutes: 45 }],
      },
      audienceDefinition: null,
      savedBlueprintAR: null,
      estimatedRuntimeMinutes: 10,
    })

    expect(checklist.runtimeEstimate).toBe('~45 min')
  })

  it('computes runtime from beats when variant duration fields are missing', () => {
    const checklist = evaluateBlueprintReadyChecklist({
      hasBlueprint: true,
      variant: {
        beats: [
          { title: 'A', minutes: 20 },
          { title: 'B', minutes: 25 },
        ],
      },
      audienceDefinition: null,
      savedBlueprintAR: null,
      estimatedRuntimeMinutes: 10,
    })

    expect(checklist.runtimeEstimate).toBe('~45 min')
  })

  it('falls back to legacy metadata when variant has no duration signals', () => {
    const checklist = evaluateBlueprintReadyChecklist({
      hasBlueprint: true,
      variant: { title: 'Untitled' },
      audienceDefinition: null,
      savedBlueprintAR: null,
      estimatedRuntimeMinutes: 12,
    })

    expect(checklist.runtimeEstimate).toBe('~12 min')
  })
})
