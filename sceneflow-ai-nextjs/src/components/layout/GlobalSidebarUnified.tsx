'use client'

import React, { useMemo, useState, useCallback } from 'react'
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
import { ReviewScoresPanel, type ReviewScores } from './ReviewScoresPanel'
import { ProjectStatsPanel, type ProjectStats } from './ProjectStatsPanel'
import { ProTipsChecklist } from '../pro-tips/ProTipsChecklist'
import { WorkflowGuidePanel } from '../workflow/WorkflowGuidePanel'

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

export function GlobalSidebarUnified({ children }: GlobalSidebarProps) {
  const pathname = usePathname()
  const params = useParams() as Record<string, string>
  const currentProject = useStore(s => s.currentProject)
  const { credits: creditsData } = useCredits()
  
  // Read sidebar data from store (populated by workflow pages)
  const sidebarData = useStore(s => s.sidebarData)
  const { reviewScores, projectStats, progressData, quickActionHandlers, isGeneratingReviews } = sidebarData
  
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
    <div className="flex pt-16">
      <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/90 h-[calc(100vh-4rem)] overflow-y-auto sticky top-16">
        <div className="flex flex-col h-full">
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
                  {item.key === 'dashboard' && <Home className="w-4 h-4 text-blue-500" />}
                  {item.key === 'projects' && <FolderOpen className="w-4 h-4 text-amber-500" />}
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
            />
          )}

          {/* Review Scores Section */}
          {config.sectionVisibility.reviewScores && reviewScores && (
            <ReviewScoresPanel
              scores={reviewScores}
              isOpen={sectionsOpen.reviewScores}
              onToggle={() => toggleSection('reviewScores')}
              isGenerating={isGeneratingReviews}
            />
          )}

          {/* Screening Room Section */}
          {config.sectionVisibility.screeningRoom && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('production:screening-room'))
                }}
                className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-green-500" />
                  <span>Screening Room</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-normal text-green-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Open</span>
                  <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                </div>
              </button>
              <p className="text-[10px] text-slate-500 mt-1.5 pl-5">
                Review animatic before video generation
              </p>
            </div>
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
      <main className="flex-1 min-h-screen">{children}</main>
    </div>
  )
}

export default GlobalSidebarUnified
