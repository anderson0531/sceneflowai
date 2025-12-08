'use client'

import React, { useMemo } from 'react'
import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { episodeNav } from '../../config/nav/episodeNav'
import { seriesNav } from '../../config/nav/seriesNav'
import { mainNav, settingsNav } from '../../config/nav/globalNav'
import { useStore } from '../../store/useStore'
import {
  WORKFLOW_STEP_LABELS,
  WORKFLOW_STEPS,
  normalizeWorkflowStep,
} from '@/constants/workflowSteps'

type StepStatus = 'completed' | 'current' | 'upcoming'

function useBYOKReady() {
  const byok = useStore(s => s.byokSettings)
  return !!byok?.videoGenerationProvider?.isConfigured
}

function usePhaseLocks(seriesId?: string, episodeId?: string) {
  return useMemo(() => {
    if (!seriesId || !episodeId) return {} as Record<number, { locked: boolean }>
    try {
      const key = `sf_phaseLocks:${seriesId}:${episodeId}`
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }, [seriesId, episodeId])
}

const deriveStepFromPath = (pathname: string): string | undefined => {
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

function useLegacyWorkflow(pathname: string) {
  const currentProject = useStore(s => s.currentProject)
  const activeStepFromPath = normalizeWorkflowStep(deriveStepFromPath(pathname))

  const completed = useMemo(() => {
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

  const items = WORKFLOW_STEPS.map((stepId) => {
    const normalized = normalizeWorkflowStep(stepId)
    const status: StepStatus =
      normalized === currentStep
        ? 'current'
        : completed.has(normalized)
          ? 'completed'
          : 'upcoming'

    return {
      key: normalized,
      label: WORKFLOW_STEP_LABELS[normalized],
      status,
    }
  })

  return { items }
}

export function GlobalSidebar({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()
  const params = useParams() as any
  const seriesId = params?.seriesId as string | undefined
  const episodeId = params?.episodeId as string | undefined
  const byokReady = useBYOKReady()
  const phaseLocks = usePhaseLocks(seriesId, episodeId)

  // Hide sidebar on Production (vision) page - it has its own integrated navigation
  const isProductionPage = pathname?.includes('/dashboard/workflow/vision/')
  
  type WorkflowDisplayItem = { key: string; label: string; status: StepStatus }
  type NavigableItem = { key: string; label: string; href: string; requires?: number[]; byok?: boolean }

  let flowItems: Array<WorkflowDisplayItem | NavigableItem> = []
  if (seriesId && episodeId) flowItems = episodeNav(seriesId, episodeId)
  else if (seriesId) flowItems = seriesNav(seriesId)
  else flowItems = useLegacyWorkflow(pathname).items

  // If on Production page, just render children without sidebar
  if (isProductionPage) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <div className="flex">
      <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/90">
        <div className="p-4 space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">MAIN</h3>
            <div className="space-y-1">
              {mainNav.map(i => (
                <Link key={i.key} href={i.href} className={`block px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${pathname===i.href?'bg-sf-primary/15 text-gray-900 dark:text-white':'text-gray-700 dark:text-gray-300'}`}>{i.label}</Link>
              ))}
            </div>
          </section>

          {flowItems.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">WORKFLOW</h3>
              <div className="space-y-1">
                {flowItems.map(i => {
                  if ('status' in i) {
                    const statusClasses =
                      i.status === 'current'
                        ? 'bg-sf-primary/25 text-white border border-sf-primary/50'
                        : i.status === 'completed'
                          ? 'bg-sf-surface text-gray-900 dark:text-white border border-sf-border/60'
                          : 'text-gray-500 dark:text-gray-500 border border-transparent opacity-60'

                    return (
                      <div
                        key={i.key}
                        className={`block px-3 py-2 rounded flex items-center gap-2 ${statusClasses}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            i.status === 'current'
                              ? 'bg-sf-primary-light'
                              : i.status === 'completed'
                                ? 'bg-sf-success'
                                : 'bg-sf-border'
                          }`}
                        />
                        <span>{i.label}</span>
                      </div>
                    )
                  }

                  const unmet = (i.requires || []).some(p => !(phaseLocks as any)[p]?.locked)
                  const blocked = unmet || (i.byok && !byokReady)
                  const className = `block px-3 py-2 rounded ${pathname===i.href?'bg-sf-primary/15 text-gray-900 dark:text-white':'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'} ${blocked?'opacity-60 cursor-not-allowed':''}`
                  const content = (
                    <span className="flex items-center gap-2">
                      <span>{i.label}</span>
                      {i.byok && !byokReady && <span className="text-[10px] px-1 rounded bg-orange-500/20 text-orange-600 dark:text-orange-300">BYOK</span>}
                      {unmet && <span className="text-[10px] px-1 rounded bg-blue-500/20 text-blue-600 dark:text-blue-300">Locked</span>}
                    </span>
                  )
                  return blocked ? (
                    <span key={i.key} className={className} title={!byokReady && i.byok ? 'Bring Your Own Key required' : 'Complete earlier phases first'}>{content}</span>
                  ) : (
                    <Link key={i.key} href={i.href} prefetch={false} className={className}>{content}</Link>
                  )
                })}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">SETTINGS</h3>
            <div className="space-y-1">
              {settingsNav.map(i => (
                <Link key={i.key} href={i.href} className={`block px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${pathname===i.href?'bg-sf-primary/15 text-gray-900 dark:text-white':'text-gray-700 dark:text-gray-300'}`}>{i.label}</Link>
              ))}
            </div>
          </section>
        </div>
      </aside>
      <main className="flex-1 min-h-screen">{children}</main>
      </div>
  )
}

export default GlobalSidebar
