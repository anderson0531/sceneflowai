'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { useEnhancedStore } from '@/store/enhancedStore'
import {
  WORKFLOW_STEP_LABELS,
  WORKFLOW_STEPS,
  normalizeWorkflowStep,
} from '@/constants/workflowSteps'
import type { WorkflowStep } from '@/types/enhanced-project'

type NavigationRequest = {
  stepId: string
  href?: string
  onNavigate?: () => void
  labelOverride?: string
}

type WorkflowNavigationContextValue = {
  attemptNavigation: (request: NavigationRequest) => void
}

const WorkflowNavigationContext = createContext<WorkflowNavigationContextValue | undefined>(
  undefined,
)

export function WorkflowNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [pending, setPending] = useState<NavigationRequest | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const closeDialog = useCallback(() => {
    setIsOpen(false)
    setPending(null)
  }, [])

  const performNavigation = useCallback(
    (request: NavigationRequest) => {
      const enhancedStore = useEnhancedStore.getState()
      const normalizedStep = normalizeWorkflowStep(request.stepId)
      enhancedStore.setCurrentStep(normalizedStep)

      if (request.onNavigate) {
        request.onNavigate()
      }

      if (request.href) {
        router.push(request.href)
      }
    },
    [router],
  )

  const confirmNavigation = useCallback(() => {
    if (!pending) return
    performNavigation(pending)
    closeDialog()
  }, [closeDialog, pending, performNavigation])

  const attemptNavigation = useCallback(
    (request: NavigationRequest) => {
      const enhancedStore = useEnhancedStore.getState()
      const workflowSteps = enhancedStore.workflowSteps ?? WORKFLOW_STEPS
      const activeRawStep =
        enhancedStore.currentProject?.currentStep ?? enhancedStore.currentStep ?? WORKFLOW_STEPS[0]

      const normalizedCurrent = normalizeWorkflowStep(activeRawStep)
      const normalizedTarget = normalizeWorkflowStep(request.stepId)

      const currentIndex = workflowSteps.indexOf(normalizedCurrent)
      const targetIndex = workflowSteps.indexOf(normalizedTarget)
      const isBackward =
        currentIndex !== -1 && targetIndex !== -1 && targetIndex < currentIndex

      if (isBackward) {
        setPending(request)
        setIsOpen(true)
        return
      }

      performNavigation({
        ...request,
        stepId: normalizedTarget,
      })
    },
    [performNavigation],
  )

  const contextValue = useMemo<WorkflowNavigationContextValue>(
    () => ({
      attemptNavigation,
    }),
    [attemptNavigation],
  )

  const pendingLabel =
    pending?.labelOverride ??
    (pending ? WORKFLOW_STEP_LABELS[normalizeWorkflowStep(pending.stepId)] : '')

  return (
    <WorkflowNavigationContext.Provider value={contextValue}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => (!open ? closeDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave current step?</DialogTitle>
            <DialogDescription>
              You&apos;re moving back to{' '}
              <span className="font-medium text-sf-text-primary">{pendingLabel}</span>. Any unsaved
              changes on the current workflow step may be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeDialog}>
              Stay here
            </Button>
            <Button onClick={confirmNavigation}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkflowNavigationContext.Provider>
  )
}

export function useWorkflowNavigation(options?: { disableFallback?: boolean }) {
  const router = useRouter()
  const ctx = useContext(WorkflowNavigationContext)

  if (ctx) {
    return ctx
  }

  if (options?.disableFallback) {
    throw new Error('useWorkflowNavigation must be used within a WorkflowNavigationProvider')
  }

  return useMemo<WorkflowNavigationContextValue>(() => {
    return {
      attemptNavigation: (request) => {
        const enhancedStore = useEnhancedStore.getState()
        const normalizedStep = normalizeWorkflowStep(request.stepId)
        enhancedStore.setCurrentStep(normalizedStep)
        if (request.onNavigate) {
          request.onNavigate()
        }
        if (request.href) {
          router.push(request.href)
        }
      },
    }
  }, [router])
}



