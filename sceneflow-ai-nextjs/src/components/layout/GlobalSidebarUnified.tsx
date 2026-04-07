'use client'

import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { useCredits } from '@/contexts/CreditsContext'
import { mainNav } from '../../config/nav/globalNav'
import { 
  getSidebarConfigForPath, 
  getProjectIdFromPath,
  type WorkflowSidebarConfig,
  type WorkflowStepStatus,
  type SectionVisibility,
} from '../../config/nav/sidebarConfig'
import { useStore } from '../../store/useStore'
import { cn } from '@/lib/utils'
import { 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  Circle,
  Home,
  FolderOpen,
  Sparkles,
  CreditCard,
  Coins,
  Library,
  PanelLeftClose,
  PanelLeft,
  // Icons for sections
  GitBranch,
  TrendingUp,
  Zap,
  // Icons for progress items
  Wrench,
  Lightbulb,
  FileText,
  ImageIcon,
  Music,
  Video,
  Film,
  // Icons for quick actions
  Bookmark,
  Play,
  BarChart3,
  Settings,
  Save,
  Download,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ReviewScoresPanel, type ReviewScores, type AudienceReviewDetails } from './ReviewScoresPanel'
import { ProjectStatsPanel, type ProjectStats } from './ProjectStatsPanel'
import { ProTipsChecklist } from '../pro-tips/ProTipsChecklist'
import { WorkflowGuidePanel } from '../workflow/WorkflowGuidePanel'
import { NavigationWarningDialog } from '../workflow/NavigationWarningDialog'
import { type WorkflowStepStatus as GuideStepStatus } from '@/config/nav/workflowGuideConfig'

// Icon map for dynamic rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle2,
  Circle,
  Wrench,
  Lightbulb,
  FileText,
  ImageIcon,
  Music,
  Video,
  Film,
  Bookmark,
  Play,
  BarChart3,
  Settings,
  Save,
  Download,
  Share2,
  Sparkles,
  Home,
  FolderOpen,
}

interface GlobalSidebarProps {
  children?: React.ReactNode
}

const SIDEBAR_VISIBILITY_KEY = 'sceneflow-unified-sidebar-visible'

export function GlobalSidebarUnified({ children }: GlobalSidebarProps) {
  const pathname = usePathname()
  const params = useParams() as Record<string, string>
  const currentProject = useStore(s => s.currentProject)
  const { credits: creditsData } = useCredits()
  
  // Read sidebar data from store (populated by workflow pages)
  const sidebarData = useStore(s => s.sidebarData)
  const { reviewScores, audienceReviewDetails, projectStats, progressData, quickActionHandlers, isGeneratingReviews } = sidebarData
  
  // Get sidebar config based on current path
  const config = useMemo(() => getSidebarConfigForPath(pathname), [pathname])
  const projectId = useMemo(() => getProjectIdFromPath(pathname) || params?.projectId, [pathname, params?.projectId])
  
  // Section toggle state - initialize from config defaults
  const [sectionsOpen, setSectionsOpen] = useState<Record<keyof SectionVisibility, boolean>>({
    workflow: config.sectionDefaults.workflow,
    workflowGuide: config.sectionDefaults.workflowGuide,
    proTips: config.sectionDefaults.proTips,
    progress: config.sectionDefaults.progress,
    quickActions: config.sectionDefaults.quickActions,
    reviewScores: config.sectionDefaults.reviewScores,
    screeningRoom: config.sectionDefaults.screeningRoom,
    projectStats: config.sectionDefaults.projectStats,
    credits: config.sectionDefaults.credits,
  })
  
  const toggleSection = useCallback((section: keyof SectionVisibility) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }))
  }, [])

  // Blueprint guide step status - updated via custom events from workflow pages
  const [blueprintGuideStatus, setBlueprintGuideStatus] = useState<Record<string, GuideStepStatus>>({})

  // Navigation warning dialog state for backward navigation
  const [showNavigationWarning, setShowNavigationWarning] = useState(false)
  const [navigationTarget, setNavigationTarget] = useState<{ href: string; label: string }>({ href: '', label: '' })

  /** Whole left rail hidden → main uses full width (persisted for different displays). */
  const [sidebarVisible, setSidebarVisible] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_VISIBILITY_KEY)
      if (raw === '0') setSidebarVisible(false)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_VISIBILITY_KEY, sidebarVisible ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [sidebarVisible])

  // Determine if currently in Production phase (Vision page)
  const isInProductionPhase = pathname.includes('/workflow/vision/')

  // Track storyboard open/close state (broadcast by Vision page)
  const [isStoryboardOpen, setIsStoryboardOpen] = useState(false)
  useEffect(() => {
    const handler = (e: CustomEvent<{ open: boolean }>) => {
      setIsStoryboardOpen(e.detail.open)
    }
    window.addEventListener('production:storyboard-state' as any, handler)
    return () => window.removeEventListener('production:storyboard-state' as any, handler)
  }, [])
  // Reset when navigating away from production
  useEffect(() => {
    if (!isInProductionPhase) setIsStoryboardOpen(false)
  }, [isInProductionPhase])

  // Listen for blueprint guide status updates
  useEffect(() => {
    const handleStatusUpdate = (e: CustomEvent<Record<string, GuideStepStatus>>) => {
      setBlueprintGuideStatus(prev => ({ ...prev, ...e.detail }))
    }
    window.addEventListener('blueprint:guide-status' as any, handleStatusUpdate)
    return () => {
      window.removeEventListener('blueprint:guide-status' as any, handleStatusUpdate)
    }
  }, [])

  // Handle quick action clicks
  const handleQuickAction = useCallback((actionId: string, action: 'navigate' | 'event' | 'callback', eventName?: string, href?: string) => {
    if (action === 'navigate' && href) {
      // Navigation is handled by Link component
      return
    }
    if (action === 'event' && eventName) {
      const event = new CustomEvent(eventName)
      window.dispatchEvent(event)
    }
    // Call registered handler from store if available
    if (quickActionHandlers[actionId]) {
      quickActionHandlers[actionId]()
    }
  }, [quickActionHandlers])

  // Get status classes for workflow step
  const getWorkflowStepClasses = (status: WorkflowStepStatus) => {
    switch (status) {
      case 'completed':
        return {
          container: 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
          dot: 'bg-green-500',
          dotIcon: 'text-white',
        }
      case 'current':
        return {
          container: 'bg-sf-primary/10 text-sf-primary font-medium',
          dot: 'bg-sf-primary animate-pulse',
          dotIcon: null,
        }
      case 'upcoming':
        return {
          container: 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800',
          dot: 'bg-gray-300 dark:bg-gray-600',
          dotIcon: 'text-gray-400 dark:text-gray-500',
        }
      case 'locked':
        return {
          container: 'text-gray-400 dark:text-gray-500 opacity-60 cursor-not-allowed',
          dot: 'bg-gray-300 dark:bg-gray-600',
          dotIcon: 'text-gray-400 dark:text-gray-500',
        }
    }
  }

  // Build progress items with computed completion status for Blueprint
  const progressItems = useMemo(() => {
    if (config.phase === 'blueprint') {
      return [
        { id: 'concept-analysis', label: 'Concept Analysis', icon: 'CheckCircle2', isComplete: !!currentProject?.metadata?.coreConcept },
        { id: 'workshop', label: 'Workshop Refinement', icon: 'Wrench', isComplete: !!currentProject?.metadata?.workshopComplete },
        { id: 'ideas', label: 'Ideas Generated', icon: 'Lightbulb', isComplete: !!currentProject?.metadata?.ideasGenerated },
        { id: 'core-concept', label: 'Core Concept Ready', icon: 'FileText', isComplete: !!currentProject?.metadata?.coreConceptReady },
      ]
    }
    if (config.phase === 'production' && progressData) {
      return [
        { id: 'film-treatment', label: 'Film Treatment', icon: 'CheckCircle2', isComplete: progressData.hasFilmTreatment },
        { id: 'screenplay', label: 'Screenplay', icon: 'CheckCircle2', isComplete: progressData.hasScreenplay, value: progressData.sceneCount ? `${progressData.sceneCount} scenes` : undefined },
        { id: 'references', label: 'References', icon: 'ImageIcon', isComplete: (progressData.refLibraryCount || 0) > 0, value: progressData.refLibraryCount },
        { id: 'scene-images', label: 'Scene Images', icon: 'ImageIcon', isComplete: progressData.imageProgress === 100, progress: progressData.imageProgress },
        { id: 'audio', label: 'Audio', icon: 'Music', isComplete: progressData.audioProgress === 100, progress: progressData.audioProgress },
        { id: 'video-export', label: 'Video Export', icon: 'Video', isComplete: false, badge: 'Soon' },
      ]
    }
    return config.progressItems || []
  }, [config.phase, config.progressItems, currentProject?.metadata, progressData])

  return (
    <div className="flex pt-16 relative">
      <aside
        className={cn(
          'shrink-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/90 h-[calc(100vh-4rem)] sticky top-16 z-30 relative overflow-hidden transition-[width] duration-200 ease-out',
          sidebarVisible ? 'w-64 border-r' : 'w-0 border-transparent'
        )}
        aria-hidden={!sidebarVisible}
      >
        <div
          className={cn(
            'w-64 h-full overflow-y-auto flex flex-col transition-opacity duration-200',
            sidebarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <div className="flex items-center justify-end gap-1 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              onClick={() => setSidebarVisible(false)}
              aria-label="Hide navigation sidebar"
              title="Hide sidebar (more space for content)"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          {/* Main Navigation */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <nav className="space-y-1">
              {mainNav.map(item => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors',
                    pathname === item.href
                      ? 'bg-sf-primary/15 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {item.key === 'dashboard' && <Home className="w-4 h-4 text-amber-500" />}
                  {item.key === 'projects' && <FolderOpen className="w-4 h-4 text-yellow-500" />}
                  {item.key === 'series' && <Library className="w-4 h-4 text-cyan-500" />}
                  {item.key === 'start' && <Sparkles className="w-4 h-4 text-purple-500" />}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Workflow Steps - Vertical Stepper */}
          {config.showWorkflowStepper && config.sectionVisibility.workflow && config.workflowSteps && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => toggleSection('workflow')}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-cyan-500" />
                  <span>Workflow</span>
                </div>
                {sectionsOpen.workflow ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {sectionsOpen.workflow && (
                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-gray-300 via-sf-primary to-gray-300 dark:from-gray-600 dark:via-sf-primary dark:to-gray-600" />
                  <nav className="space-y-0 relative">
                    {config.workflowSteps.map(step => {
                      const status = typeof step.status === 'function' ? step.status(projectId || '') : step.status
                      const href = typeof step.href === 'function' ? step.href(projectId || '') : step.href
                      const classes = getWorkflowStepClasses(status)
                      
                      const stepContent = (
                        <>
                          <div className={cn('w-[14px] h-[14px] rounded-full border-2 border-white dark:border-gray-900 shadow-sm flex items-center justify-center z-10', classes.dot)}>
                            {status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                            {status === 'upcoming' && <Circle className={cn('w-2.5 h-2.5', classes.dotIcon)} />}
                            {status === 'locked' && <Circle className={cn('w-2.5 h-2.5', classes.dotIcon)} />}
                          </div>
                          <span className="group-hover:text-gray-700 dark:group-hover:text-gray-200">{step.label}</span>
                          {step.badge && (
                            <span className="ml-auto text-[10px] bg-sf-primary/20 px-1.5 py-0.5 rounded">{step.badge}</span>
                          )}
                        </>
                      )
                      
                      if (status === 'locked') {
                        return (
                          <div
                            key={step.id}
                            className={cn('flex items-center gap-3 px-3 py-2 text-sm rounded-lg', classes.container)}
                          >
                            {stepContent}
                          </div>
                        )
                      }

                      // Check if this is backward navigation from Production to Blueprint
                      const isBackwardNavigation = isInProductionPhase && step.id === 'blueprint'
                      
                      if (isBackwardNavigation) {
                        return (
                          <button
                            key={step.id}
                            onClick={() => {
                              setNavigationTarget({ href, label: step.label })
                              setShowNavigationWarning(true)
                            }}
                            className={cn('flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors group w-full text-left', classes.container)}
                          >
                            {stepContent}
                          </button>
                        )
                      }
                      
                      return (
                        <Link
                          key={step.id}
                          href={href}
                          prefetch={false}
                          className={cn('flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors group', classes.container)}
                        >
                          {stepContent}
                        </Link>
                      )
                    })}
                  </nav>
                </div>
              )}
            </div>
          )}

          {/* Workflow Guide Section */}
          {config.sectionVisibility.workflowGuide && (
            <WorkflowGuidePanel
              phase={config.phase}
              isOpen={sectionsOpen.workflowGuide}
              onToggle={() => toggleSection('workflowGuide')}
              externalStatus={blueprintGuideStatus}
            />
          )}

          {/* Review Scores Section */}
          {config.sectionVisibility.reviewScores && (
            <ReviewScoresPanel
              scores={reviewScores || { director: null, audience: null }}
              reviewDetails={audienceReviewDetails}
              isOpen={sectionsOpen.reviewScores}
              onToggle={() => toggleSection('reviewScores')}
              isGenerating={isGeneratingReviews}
            />
          )}

          {/* Storyboard Section */}
          {isInProductionPhase && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('production:scene-gallery'))
                }}
                className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Storyboard</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-normal transition-opacity",
                  isStoryboardOpen
                    ? "text-cyan-400 opacity-100"
                    : "text-cyan-400 opacity-0 group-hover:opacity-100"
                )}>
                  <span>{isStoryboardOpen ? 'Close' : 'Open'}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", isStoryboardOpen ? 'rotate-90' : 'rotate-[-90deg]')} />
                </div>
              </button>
              <p className="text-[10px] text-slate-500 mt-1.5 pl-5">
                Visual storyboard with AI generation
              </p>
            </div>
          )}

          {/* Screening Room Section (Removed from general nav, restricted to Final Cut phase) */}

          {/* Credits Section - Always at bottom, pushed by flex-grow spacer */}
          <div className="flex-grow" />
          {config.sectionVisibility.credits && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
              <button
                onClick={() => toggleSection('credits')}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-500" />
                  <span>Credits</span>
                </div>
                {sectionsOpen.credits ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {sectionsOpen.credits && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10 rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Balance</span>
                      </div>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{creditsData?.total_credits?.toLocaleString() ?? '—'}</span>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/settings/billing"
                    className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full justify-center"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>Buy Credits</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {!sidebarVisible && (
        <button
          type="button"
          onClick={() => setSidebarVisible(true)}
          className="fixed left-2 top-[4.75rem] z-[35] flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-md transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Show navigation sidebar"
          title="Show sidebar"
        >
          <PanelLeft className="h-4 w-4" aria-hidden />
        </button>
      )}

      <main className={cn('flex-1 min-h-screen min-w-0', !sidebarVisible && 'w-full')}>{children}</main>

      {/* Navigation Warning Dialog for backward navigation */}
      <NavigationWarningDialog
        open={showNavigationWarning}
        onOpenChange={setShowNavigationWarning}
        targetHref={navigationTarget.href}
        targetLabel={navigationTarget.label}
      />
    </div>
  )
}

export default GlobalSidebarUnified
