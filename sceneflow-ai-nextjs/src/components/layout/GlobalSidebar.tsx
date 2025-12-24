'use client'

import React, { useMemo, useState } from 'react'
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
import { 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  Circle, 
  Sparkles,
  FileText,
  Wrench,
  BarChart3,
  Save,
  Download,
  CreditCard,
  Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

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
  const currentProject = useStore(s => s.currentProject)
  
  // Section toggle state
  const [sectionsOpen, setSectionsOpen] = useState({
    progress: true,
    quickActions: true,
  })
  
  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }))
  }

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
    <div className="flex pt-16">
      <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/90 h-[calc(100vh-4rem)] overflow-y-auto sticky top-16">
        <div className="p-4 space-y-6">
          <section>
            <div className="space-y-1">
              {mainNav.map(i => (
                <Link key={i.key} href={i.href} className={`block px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 ${pathname===i.href?'bg-sf-primary/15 text-gray-900 dark:text-white':'text-gray-700 dark:text-gray-300'}`}>{i.label}</Link>
              ))}
            </div>
          </section>

          {flowItems.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Workflow</h3>
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
                        className={`block px-3 py-2 rounded text-sm flex items-center gap-2 ${statusClasses}`}
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
                  const className = `block px-3 py-2 rounded text-sm font-medium ${pathname===i.href?'bg-sf-primary/15 text-gray-900 dark:text-white':'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'} ${blocked?'opacity-60 cursor-not-allowed':''}`
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

          {/* Progress Section - Blueprint specific */}
          {pathname?.includes('/dashboard/workflow/ideation') && (
            <section className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button 
                onClick={() => toggleSection('progress')}
                className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <span>Progress</span>
                {sectionsOpen.progress ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {sectionsOpen.progress && (
                <div className="space-y-2">
                  {/* Concept Analysis */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${currentProject?.metadata?.coreConcept ? 'bg-green-500/20 text-green-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                      {currentProject?.metadata?.coreConcept ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                    </div>
                    <span className={currentProject?.metadata?.coreConcept ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>Concept Analysis</span>
                  </div>
                  {/* Workshop Refinement */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${currentProject?.metadata?.workshopComplete ? 'bg-green-500/20 text-green-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                      {currentProject?.metadata?.workshopComplete ? <CheckCircle2 className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                    </div>
                    <span className={currentProject?.metadata?.workshopComplete ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>Workshop Refinement</span>
                  </div>
                  {/* Ideas Generated */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${currentProject?.metadata?.ideasGenerated ? 'bg-green-500/20 text-green-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                      {currentProject?.metadata?.ideasGenerated ? <CheckCircle2 className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                    </div>
                    <span className={currentProject?.metadata?.ideasGenerated ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>Ideas Generated</span>
                  </div>
                  {/* Core Concept Ready */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${currentProject?.metadata?.coreConceptReady ? 'bg-green-500/20 text-green-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                      {currentProject?.metadata?.coreConceptReady ? <CheckCircle2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    </div>
                    <span className={currentProject?.metadata?.coreConceptReady ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>Core Concept Ready</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Quick Actions Section - Blueprint specific */}
          {pathname?.includes('/dashboard/workflow/ideation') && (
            <section className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button 
                onClick={() => toggleSection('quickActions')}
                className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <span>Quick Actions</span>
                {sectionsOpen.quickActions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {sectionsOpen.quickActions && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      // Trigger generate blueprint action
                      const event = new CustomEvent('blueprint:generate')
                      window.dispatchEvent(event)
                    }}
                  >
                    <Sparkles className="w-3 h-3 mr-2 text-sf-primary" />
                    Generate Blueprint
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      const event = new CustomEvent('blueprint:refine')
                      window.dispatchEvent(event)
                    }}
                  >
                    <Wrench className="w-3 h-3 mr-2 text-amber-500" />
                    Refine Concept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      const event = new CustomEvent('blueprint:scorecard')
                      window.dispatchEvent(event)
                    }}
                  >
                    <BarChart3 className="w-3 h-3 mr-2 text-purple-500" />
                    View Score Card
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      const event = new CustomEvent('blueprint:save')
                      window.dispatchEvent(event)
                    }}
                  >
                    <Save className="w-3 h-3 mr-2 text-green-500" />
                    Save Progress
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      const event = new CustomEvent('blueprint:export')
                      window.dispatchEvent(event)
                    }}
                  >
                    <Download className="w-3 h-3 mr-2 text-blue-500" />
                    Export Ideas
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Credits Section */}
          <section className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Credits</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Available</span>
                <span className="font-semibold text-gray-900 dark:text-white">5,400</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-sf-primary h-1.5 rounded-full" style={{ width: '72%' }} />
              </div>
              <Link
                href="/dashboard/settings/billing"
                className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center"
              >
                <CreditCard className="w-3 h-3" />
                <span>Buy Credits</span>
              </Link>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Settings</h3>
            <div className="space-y-1">
              {settingsNav.map(i => (
                <Link key={i.key} href={i.href} className={`block px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 ${pathname===i.href?'bg-sf-primary/15 text-gray-900 dark:text-white':'text-gray-700 dark:text-gray-300'}`}>{i.label}</Link>
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
