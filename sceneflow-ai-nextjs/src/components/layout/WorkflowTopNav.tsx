'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useEnhancedStore } from '@/store/enhancedStore'
import {
  WORKFLOW_STEP_LABELS,
  WORKFLOW_STEPS,
  normalizeWorkflowStep,
} from '@/constants/workflowSteps'

type StepStatus = 'completed' | 'current' | 'upcoming'

const deriveStepFromPath = (pathname?: string): string | undefined => {
  if (!pathname) {
    return undefined
  }

  const segments = pathname.split('/').filter(Boolean)
  const workflowIndex = segments.findIndex((segment) => segment === 'workflow')

  if (workflowIndex !== -1 && segments[workflowIndex + 1]) {
    return segments[workflowIndex + 1]
  }

  if (segments.includes('studio')) {
    return 'blueprint'
  }

  return undefined
}

export default function WorkflowTopNav() {
  const pathname = usePathname()
  const { currentProject } = useEnhancedStore()
  const activeStepFromPath = normalizeWorkflowStep(deriveStepFromPath(pathname))

  const completedSteps = useMemo(() => {
    if (!currentProject?.completedSteps?.length) {
      return new Set<ReturnType<typeof normalizeWorkflowStep>>()
    }

    return new Set(
      currentProject.completedSteps.map((step) => normalizeWorkflowStep(step))
    )
  }, [currentProject?.completedSteps])

  const currentStep = useMemo(() => {
    if (currentProject?.currentStep) {
      return normalizeWorkflowStep(currentProject.currentStep)
    }
    return activeStepFromPath
  }, [currentProject?.currentStep, activeStepFromPath])

  const stepsWithStatus = useMemo(() => {
    return WORKFLOW_STEPS.map((stepId) => {
      const normalizedStep = normalizeWorkflowStep(stepId)
      let status: StepStatus = 'upcoming'

      if (normalizedStep === currentStep) {
        status = 'current'
      } else if (completedSteps.has(normalizedStep)) {
        status = 'completed'
      }

      return {
        id: normalizedStep,
        label: WORKFLOW_STEP_LABELS[normalizedStep],
        status,
      }
    })
  }, [completedSteps, currentStep])

  return (
    <div className="sticky top-16 z-40 bg-sf-surface/70 backdrop-blur border-b border-sf-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-2 py-2 overflow-x-auto justify-center px-2">
          {stepsWithStatus.map((step) => {
            const baseClass =
              'px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors border flex items-center gap-2'
            const statusClass =
              step.status === 'current'
                ? 'bg-sf-primary/30 border-sf-primary/60 text-white'
                : step.status === 'completed'
                  ? 'bg-sf-surface/60 border-sf-border text-sf-text-primary'
                  : 'bg-transparent border-sf-border/30 text-sf-text-secondary opacity-60'

            return (
              <div key={step.id} className={`${baseClass} ${statusClass}`}>
                <span
                  className={`h-2 w-2 rounded-full ${
                    step.status === 'current'
                      ? 'bg-sf-primary-light'
                      : step.status === 'completed'
                        ? 'bg-sf-success'
                        : 'bg-sf-border'
                  }`}
                />
                <span>{step.label}</span>
              </div>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
