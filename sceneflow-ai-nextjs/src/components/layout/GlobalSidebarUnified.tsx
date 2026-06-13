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
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ReviewScoresPanel, type ReviewScores, type AudienceReviewDetails } from './ReviewScoresPanel'
import { ProjectStatsPanel, type ProjectStats } from './ProjectStatsPanel'
import { ProTipsChecklist } from '../pro-tips/ProTipsChecklist'
import { WorkflowGuidePanel } from '../workflow/WorkflowGuidePanel'
import { NavigationWarningDialog } from '../workflow/NavigationWarningDialog'
import { type WorkflowStepStatus as GuideStepStatus } from '@/config/nav/workflowGuideConfig'

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
  MessageSquare,
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
  const isVisionProduction = pathname.includes('/dashboard/workflow/vision/')
  const projectId = useMemo(
    () =>
      getProjectIdFromPath(pathname) ||
      (typeof params?.projectId === 'string' ? params.projectId : undefined) ||
      currentProject?.id ||
      null,
    [pathname, params?.projectId, currentProject?.id]
  )
  
  // Section toggle state - initialize from config defaults
  const [sectionsOpen, setSectionsOpen] = useState<Record<keyof SectionVisibility, boolean>>({
    workflow: config.sectionDefaults.workflow,
    workflowGuide: config.sectionDefaults.workflowGuide,
    proTips: config.sectionDefaults.proTips,
    progress: config.sectionDefaults.progress,
    quickActions: config.sectionDefaults.quickActions,
    reviewScores: config.sectionDefaults.reviewScores,
    voiceSelector: config.sectionDefaults.voiceSelector ?? false,
    screeningRoom: config.sectionDefaults.screeningRoom,
    projectStats: config.sectionDefaults.projectStats,
    credits: config.sectionDefaults.credits,
  })
  
  const toggleSection = useCallback((section: keyof SectionVisibility) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }))
  }, [])

  // Blueprint + Final Cut guide step status - updated via custom events from workflow pages
  const [workflowGuideStatus, setWorkflowGuideStatus] = useState<Record<string, GuideStepStatus>>({})

  // Navigation warning dialog state for backward navigation
  const [showNavigationWarning, setShowNavigationWarning] = useState(false)
  const [navigationTarget, setNavigationTarget] = useState<{ href: string; label: string }>({ href: '', label: '' })

  /** Whole left rail hidden → main uses full width (persisted when user toggles). */
  const [sidebarVisible, setSidebarVisible] = useState(true)

  const persistSidebarVisibility = useCallback((visible: boolean) => {
    setSidebarVisible(visible)
    try {
      localStorage.setItem(SIDEBAR_VISIBILITY_KEY, visible ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_VISIBILITY_KEY)
      if (raw === '1') {
        setSidebarVisible(true)
      } else if (raw === '0') {
        setSidebarVisible(false)
      } else if (pathname.includes('/workflow/vision/')) {
        setSidebarVisible(false)
      } else {
        setSidebarVisible(true)
      }
    } catch {
      /* ignore */
    }
  }, [pathname])

  // Determine if currently in Production phase (Vision page)
  const isInProductionPhase = pathname.includes('/workflow/vision/')

  // Listen for workflow guide status updates (Blueprint, Final Cut, …)
  useEffect(() => {
    const handleStatusUpdate = (e: CustomEvent<Record<string, GuideStepStatus>>) => {
      setWorkflowGuideStatus(prev => ({ ...prev, ...e.detail }))
    }
    window.addEventListener('blueprint:guide-status' as any, handleStatusUpdate)
    window.addEventListener('final-cut:guide-status' as any, handleStatusUpdate)
    window.addEventListener('premiere:guide-status' as any, handleStatusUpdate)
    return () => {
      window.removeEventListener('blueprint:guide-status' as any, handleStatusUpdate)
      window.removeEventListener('final-cut:guide-status' as any, handleStatusUpdate)
      window.removeEventListener('premiere:guide-status' as any, handleStatusUpdate)
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
      const meta = currentProject?.metadata as Record<string, unknown> | undefined
      const variants = (meta?.treatmentVariants as unknown[]) ?? []
      const ar = meta?.blueprintAudienceResonance as { analysis?: { overallScore?: number } } | undefined
      const audienceDef = meta?.audienceDefinition as { profile?: { primaryAudience?: string } } | undefined
      const arScore = ar?.analysis?.overallScore ?? null
      const hasBlueprint = variants.length > 0
      const hasAudience = !!(
        audienceDef?.updatedAt ||
        (meta?.blueprintAudienceResonance as { audienceDefinition?: { updatedAt?: string } } | undefined)
          ?.audienceDefinition?.updatedAt
      )
      const hasAR = arScore !== null
      const atTarget = arScore !== null && arScore >= 80
      return [
        { id: 'blueprint-generated', label: 'Blueprint Generated', icon: 'CheckCircle2', isComplete: hasBlueprint },
        { id: 'audience-saved', label: 'Target Audience Saved', icon: 'Users', isComplete: hasAudience },
        { id: 'ar-analyzed', label: 'Audience Resonance', icon: 'Radar', isComplete: hasAR, value: arScore !== null ? `${arScore}/100` : undefined },
        { id: 'ar-target', label: 'Score 80+', icon: 'Target', isComplete: atTarget },
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
    if (config.phase === 'final-cut') {
      const meta = currentProject?.metadata as Record<string, unknown> | undefined
      const exported = !!(meta?.exportedVideoUrl as string | undefined)?.trim()
      const finalCut = meta?.finalCut as { perSceneOverrides?: Record<string, unknown> } | undefined
      const hasAssembly = !!finalCut
      const vision = meta?.visionPhase as { production?: { scenes?: unknown[] } } | undefined
      const sceneCount = vision?.production?.scenes?.length ?? 0
      return [
        { id: 'streams-ready', label: 'Streams ready', icon: 'Video', isComplete: sceneCount > 0, value: sceneCount ? `${sceneCount} scenes` : undefined },
        { id: 'assembly', label: 'Assembly configured', icon: 'Film', isComplete: hasAssembly },
        { id: 'export', label: 'Master exported', icon: 'Download', isComplete: exported },
      ]
    }
    if (config.phase === 'premiere') {
      const meta = currentProject?.metadata as Record<string, unknown> | undefined
      const exported = !!(meta?.exportedVideoUrl as string | undefined)?.trim()
      return [
        { id: 'master-ready', label: 'Master ready', icon: 'Film', isComplete: exported },
        { id: 'screenings', label: 'Screenings', icon: 'Play', isComplete: false },
        { id: 'published', label: 'Published', icon: 'Download', isComplete: false },
      ]
    }
    return config.progressItems || []
  }, [config.phase, config.progressItems, currentProject?.metadata, progressData])

  return (
    <div className="flex relative w-full h-[calc(100dvh-4rem)] overflow-hidden">
      <aside
        className={cn(
          'shrink-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/90 h-full min-h-0 z-30 relative overflow-hidden transition-[width] duration-200 ease-out',
          sidebarVisible ? 'w-64 border-r' : 'w-0 border-transparent'
        )}
        aria-hidden={!sidebarVisible}
      >
        <div
          data-vision-scroll-panel
          className={cn(
            'w-64 h-full min-h-0 overflow-y-auto flex flex-col transition-opacity duration-200',
            sidebarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <div className="flex items-center justify-end gap-1 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              onClick={() => persistSidebarVisibility(false)}
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
              externalStatus={workflowGuideStatus}
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
          onClick={() => persistSidebarVisibility(true)}
          className="absolute left-2 top-3 z-[35] flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-md transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Show navigation sidebar"
          title="Show sidebar"
        >
          <PanelLeft className="h-4 w-4" aria-hidden />
        </button>
      )}

      <main
        className={cn(
          'flex-1 min-w-0 relative',
          isVisionProduction
            ? 'min-h-0 h-full overflow-hidden flex flex-col'
            : 'overflow-y-auto overflow-x-hidden',
          !sidebarVisible && 'w-full'
        )}
      >
        {isVisionProduction ? (
          <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
            {children}
          </div>
        ) : (
          children
        )}
      </main>

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
