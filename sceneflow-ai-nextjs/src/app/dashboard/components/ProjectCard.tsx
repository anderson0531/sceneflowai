'use client'

import React, { useState } from 'react'
import { getResumeRouteForStep } from '@/constants/workflowRoutes'
import { motion } from 'framer-motion'
import {
  FileText,
  Film,
  CheckCircle,
  Wrench,
  Sparkles,
  Eye,
  Clock,
  Key,
  MoreVertical,
  Edit,
  Copy,
  Archive,
  Trash,
  Layers,
  Calendar,
  Star,
  ChevronDown,
  Calculator,
  DollarSign,
  TrendingUp,
  Coins,
  ChevronRight,
  Clapperboard,
  Library,
} from 'lucide-react'
import { useCredits } from '@/contexts/CreditsContext'
import { useEnhancedStore } from '@/store/enhancedStore'
import { toast } from 'sonner'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import ThumbnailPromptDrawer from '@/components/project/ThumbnailPromptDrawer'
import { ProjectCostCalculator } from '@/components/credits/ProjectCostCalculator'
import { AdjustCreditsUsedDialog } from '@/components/credits/AdjustCreditsUsedDialog'
import {
  getProjectAudienceResonanceScore,
  getProjectCreditsBudget,
  getProjectCreditsUsed,
  getProjectEstimatedRemainingCredits,
  getProjectSceneCount,
  getProjectScenesList,
} from '@/lib/credits/projectBudgetShared'
import { useProjectCosts } from '@/hooks/useProjectCosts'
import { isDemoProjectId } from '@/lib/demo/uiSandboxProject'
import {
  WORKFLOW_STEPS,
  WORKFLOW_STEP_LABELS,
  normalizeCompletedWorkflowSteps,
  normalizeWorkflowStep,
} from '@/constants/workflowSteps'

type NormalizedWorkflowStep = (typeof WORKFLOW_STEPS)[number]

const STEP_STYLES: Record<
  NormalizedWorkflowStep,
  {
    name: string
    icon: typeof FileText
    color: string
    bgColor: string
    borderColor: string
    badgeBg: string
    badgeText: string
    badgeBorder: string
  }
> = {
  blueprint: {
    name: WORKFLOW_STEP_LABELS.blueprint,
    icon: FileText,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
    borderColor: 'border-indigo-500/40',
    badgeBg: 'bg-indigo-950/85',
    badgeText: 'text-indigo-300',
    badgeBorder: 'border-indigo-500/40',
  },
  vision: {
    name: WORKFLOW_STEP_LABELS.vision,
    icon: Eye,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/40',
    badgeBg: 'bg-purple-950/85',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/40',
  },
  creation: {
    name: WORKFLOW_STEP_LABELS.creation,
    icon: Film,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/40',
    badgeBg: 'bg-purple-950/85',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/40',
  },
  polish: {
    name: WORKFLOW_STEP_LABELS.polish,
    icon: CheckCircle,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
    borderColor: 'border-teal-500/40',
    badgeBg: 'bg-teal-950/85',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-500/40',
  },
  launch: {
    name: WORKFLOW_STEP_LABELS.launch,
    icon: Wrench,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-950/85',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/40',
  },
}

interface ProjectCardProps {
  project: {
    id: string
    title: string
    description: string
    currentStep: string
    progress: number
    status: string
    createdAt: Date | string
    updatedAt: Date | string
    completedSteps: string[]
    series_id?: string | null
    seriesId?: string | null
    episode_number?: number | null
    episodeNumber?: number | null
    metadata?: {
      genre?: string
      duration?: number
      targetAudience?: string
      style?: string
      concept?: string
      keyMessage?: string
      tone?: string
      thumbnail?: string
      thumbnailUrl?: string
      billboardUrl?: string
      visionPhase?: any
      directorScore?: number
      audienceScore?: number
      // Cost tracking fields
      creditsUsed?: number
      creditsBudget?: number
      estimatedTotalCredits?: number
      actualCostUsd?: number
      budgetCostUsd?: number
      estimatedCompletionCostUsd?: number
      [key: string]: any
    }
  }
  viewMode?: 'grid' | 'list'
  className?: string
  isSelected?: boolean
  onSelectAsCurrent?: (projectId: string) => void
  onStatusChange?: (projectId: string, status: string) => void
  onDuplicate?: (projectId: string) => void
  onArchive?: (projectId: string) => void
  onDelete?: (projectId: string, projectTitle: string) => void
  onPromoteToSeries?: (projectId: string) => void
}

export function ProjectCard({
  project,
  viewMode = 'grid',
  className = '',
  isSelected = false,
  onSelectAsCurrent,
  onStatusChange,
  onDuplicate,
  onArchive,
  onDelete,
  onPromoteToSeries,
}: ProjectCardProps) {
  const byokSettings = useEnhancedStore((s: any) => s.byokSettings)
  const { credits: userCredits } = useCredits()
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const [promptDrawerOpen, setPromptDrawerOpen] = useState(false)
  const [costCalculatorOpen, setCostCalculatorOpen] = useState(false)
  const [adjustCreditsOpen, setAdjustCreditsOpen] = useState(false)

  const isDemo = isDemoProjectId(project.id)
  const seriesId = project.series_id || project.seriesId || project.metadata?.seriesId || null
  const episodeNumber =
    project.episode_number ?? project.episodeNumber ?? project.metadata?.episodeNumber ?? null

  // Get project cost parameters from actual project data stored in metadata
  const projectCosts = useProjectCosts(project.metadata?.visionPhase)

  const normalizedCurrentStep = normalizeWorkflowStep(project.currentStep)
  const normalizedCompletedSteps = normalizeCompletedWorkflowSteps(project.completedSteps)
  const currentStepInfo = STEP_STYLES[normalizedCurrentStep]
  // Canonical 2-stage pipeline: Stage 1 = Blueprint Room, Stage 2 = Production Stage
  const stepNumber = normalizedCurrentStep === 'blueprint' ? 1 : 2
  const totalSteps = 2
  const isPhase1Complete = normalizedCompletedSteps.includes('creation')
  const isPhase2Available = isPhase1Complete
  const hasValidBYOK = Boolean(byokSettings?.videoGenerationProvider?.isConfigured)

  // Format relative time (e.g., "2d ago", "Just now")
  const formatRelativeTime = (date: Date | string) => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getScenes = () => getProjectScenesList(project.metadata)
  const getSceneCount = () => getProjectSceneCount(project.metadata)

  // Get calculated duration from actual scene durations or metadata
  const getProjectDuration = (): number | null => {
    if (project.metadata?.duration && project.metadata.duration > 0) {
      return project.metadata.duration
    }

    const scenes = getScenes()
    if (scenes.length > 0) {
      const scenesWithDuration = scenes.filter(
        (scene: any) =>
          scene.duration !== undefined && scene.duration !== null && Number(scene.duration) > 0
      )

      if (scenesWithDuration.length === 0) {
        return null
      }

      const totalSeconds = scenes.reduce((sum: number, scene: any) => {
        return sum + (Number(scene.duration) || 0)
      }, 0)

      if (totalSeconds > 0) {
        return Math.round((totalSeconds / 60) * 10) / 10
      }
    }

    return null
  }

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return 'TBD'
    if (minutes < 1) return `${Math.round(minutes * 60)}s`
    return `${minutes} min`
  }

  // Use stored progress percentage when present; fallback to canonical stage progress
  const getProgressPercentage = () => {
    if (typeof project.progress === 'number' && project.progress > 0) {
      return Math.min(100, Math.round(project.progress))
    }
    if (project.status === 'completed') return 100
    return normalizedCurrentStep === 'blueprint' ? 20 : 50
  }

  const getProjectCosts = () => {
    const creditsUsed = getProjectCreditsUsed(project.metadata)
    const creditsBudget = getProjectCreditsBudget(project.metadata)
    const progressPercent = getProgressPercentage()
    const estimatedCreditsToComplete = getProjectEstimatedRemainingCredits(
      project.metadata,
      progressPercent
    )

    const variance = creditsBudget > 0 ? creditsUsed - creditsBudget : 0
    const variancePercent = creditsBudget > 0 ? Math.round((variance / creditsBudget) * 100) : 0

    return {
      creditsUsed,
      creditsBudget,
      estimatedCreditsToComplete,
      variance,
      variancePercent,
      isOverBudget: variance > 0,
    }
  }

  const getReviewScores = (): {
    director: number | null
    audience: number | null
    hasReviews: boolean
  } => {
    const visionPhase = project.metadata?.visionPhase
    const directorReview = visionPhase?.reviews?.director
    const directorScore = directorReview?.overallScore ?? project.metadata?.directorScore ?? null
    const audienceScore = getProjectAudienceResonanceScore(project.metadata)

    return {
      director: directorScore !== null ? Math.min(100, Math.max(0, Number(directorScore))) : null,
      audience: audienceScore,
      hasReviews: directorScore !== null || audienceScore !== null,
    }
  }

  const costs = getProjectCosts()
  const sceneCount = getSceneCount()
  const duration = getProjectDuration()
  const progressPercent = getProgressPercentage()
  const reviewScores = getReviewScores()

  // Unified thumbnail lookup matching Dashboard & ActiveProjectCard
  const getThumbnailUrl = (): string | null => {
    const visionPhase = project.metadata?.visionPhase
    const scenes = getScenes()
    return (
      project.metadata?.billboardUrl ||
      visionPhase?.billboardUrl ||
      project.metadata?.thumbnailUrl ||
      visionPhase?.thumbnailUrl ||
      project.metadata?.thumbnail ||
      scenes[0]?.imageUrl ||
      scenes[0]?.generatedImage?.url ||
      visionPhase?.characters?.[0]?.referenceImage ||
      null
    )
  }

  const handleGenerateThumbnail = async () => {
    if (isGeneratingThumbnail || isDemo) return

    setIsGeneratingThumbnail(true)
    try {
      const response = await fetch('/api/projects/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          description: project.description || project.metadata?.concept || project.title,
          title: project.title,
          genre: project.metadata?.genre,
          userApiKey: byokSettings?.imageGenerationProvider?.apiKey || '',
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Thumbnail generated successfully!')
        window.dispatchEvent(new CustomEvent('project-updated'))
      } else {
        if (data.requiresBYOK) {
          throw new Error(
            'OpenAI API key required. Please configure your BYOK settings in the dashboard.'
          )
        }
        throw new Error(data.error || 'Failed to generate thumbnail')
      }
    } catch (error: any) {
      console.error('Thumbnail generation error:', error)
      toast.error(error.message || 'Failed to generate thumbnail')
    } finally {
      setIsGeneratingThumbnail(false)
    }
  }

  const getResumeRoute = (): string => {
    return getResumeRouteForStep(project.id, project.currentStep)
  }

  const getStatusLabel = (status: string) => {
    if (status === 'in-progress' || status === 'in_progress' || status === 'active') return 'Active'
    return status
  }

  const getStatusDotClass = (status: string) => {
    if (status === 'completed') return 'bg-emerald-400'
    if (status === 'in-progress' || status === 'in_progress' || status === 'active')
      return 'bg-indigo-400'
    if (status === 'archived') return 'bg-gray-600'
    return 'bg-gray-400'
  }

  const renderActionsDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="p-2 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/60 backdrop-blur-sm transition-colors"
          onClick={(e) => e.stopPropagation()}
          aria-label="Project options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[190px]">
        {!isDemo && onDuplicate && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onDuplicate(project.id)
            }}
          >
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
        )}
        {!isDemo && onPromoteToSeries && !seriesId ? (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onPromoteToSeries(project.id)
            }}
          >
            <Clapperboard className="w-4 h-4 mr-2" />
            Promote to Series
          </DropdownMenuItem>
        ) : null}
        {!isDemo && (
          <>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setPromptDrawerOpen(true)
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Thumbnail Prompt
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleGenerateThumbnail()
              }}
              disabled={isGeneratingThumbnail}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGeneratingThumbnail ? 'Generating...' : 'Quick Generate Thumbnail'}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            navigator.clipboard.writeText(project.id || '')
            toast.success('Project ID copied')
          }}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Project ID
        </DropdownMenuItem>
        {!isDemo && onArchive && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onArchive(project.id)
            }}
          >
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </DropdownMenuItem>
        )}
        {!isDemo && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onDelete(project.id, project.title)
              }}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 focus:text-red-300 focus:bg-red-900/20"
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderStatusControl = () => {
    if (isDemo) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          UI Sandbox Demo
        </span>
      )
    }
    if (!onStatusChange) return null
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/60 hover:bg-gray-800 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors text-xs"
          >
            <span className={`w-2 h-2 rounded-full ${getStatusDotClass(project.status)}`} />
            <span className="text-gray-200 font-medium capitalize">
              {getStatusLabel(project.status)}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[150px]">
          <DropdownMenuItem
            onClick={() => onStatusChange(project.id, 'draft')}
            className={project.status === 'draft' ? 'bg-gray-800/50' : ''}
          >
            <span className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
            Draft
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onStatusChange(project.id, 'in-progress')}
            className={
              project.status === 'in-progress' ||
              project.status === 'in_progress' ||
              project.status === 'active'
                ? 'bg-gray-800/50'
                : ''
            }
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400 mr-2" />
            Active
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onStatusChange(project.id, 'completed')}
            className={project.status === 'completed' ? 'bg-gray-800/50' : ''}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
            Completed
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onStatusChange(project.id, 'archived')}
            className={project.status === 'archived' ? 'bg-gray-800/50' : ''}
          >
            <span className="w-2 h-2 rounded-full bg-gray-600 mr-2" />
            Archived
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const renderDialogs = () => (
    <>
      <ThumbnailPromptDrawer
        open={promptDrawerOpen}
        onClose={() => setPromptDrawerOpen(false)}
        project={{
          ...project,
          description: project.description || '',
        }}
        currentThumbnail={getThumbnailUrl() || undefined}
        onThumbnailGenerated={() => {
          window.dispatchEvent(new CustomEvent('project-updated'))
        }}
      />

      <Dialog open={costCalculatorOpen} onOpenChange={setCostCalculatorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-sf-primary" />
              Production Budget Management - {project.title}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Set a credit budget, track production charges, and plan animatic-first before video.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ProjectCostCalculator
              currentTier="starter"
              currentBalance={userCredits?.total_credits ?? 0}
              compact={false}
              projectId={project.id}
              currentCreditsUsed={costs.creditsUsed}
              initialParams={projectCosts || undefined}
              initialByokExcludeMedia={hasValidBYOK}
              onSetBudget={async (budget, budgetParams) => {
                try {
                  await fetch(`/api/projects/${project.id}/budget`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      creditsBudget: budget,
                      ...(budgetParams ? { creditsBudgetParams: budgetParams } : {}),
                    }),
                  })
                  setCostCalculatorOpen(false)
                  window.dispatchEvent(new CustomEvent('project-updated'))
                } catch (error) {
                  console.error('Failed to set budget:', error)
                }
              }}
              onSetCreditsUsed={async (creditsUsed) => {
                try {
                  await fetch(`/api/projects/${project.id}/budget`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ creditsUsed }),
                  })
                  window.dispatchEvent(new CustomEvent('project-updated'))
                } catch (error) {
                  console.error('Failed to set credits used:', error)
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AdjustCreditsUsedDialog
        open={adjustCreditsOpen}
        onOpenChange={setAdjustCreditsOpen}
        projectId={project.id}
        projectTitle={project.title}
        currentCreditsUsed={costs.creditsUsed}
      />
    </>
  )

  const thumbUrl = getThumbnailUrl()

  // ============================================================================
  // COMPACT HORIZONTAL ROW FOR LIST VIEW (viewMode === 'list')
  // ============================================================================
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gray-900/95 backdrop-blur-sm rounded-xl border ${
          isSelected
            ? 'border-yellow-500/80 ring-1 ring-yellow-500/30'
            : 'border-gray-700/60 hover:border-gray-600'
        } shadow-lg p-4 transition-all ${className}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Thumbnail + Pin + Title & Metadata */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {!isDemo && onSelectAsCurrent && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onSelectAsCurrent(project.id)
                }}
                className={`p-2 rounded-lg transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                    : 'bg-gray-800/70 text-gray-500 hover:text-yellow-400 border border-gray-700/50'
                }`}
                title={isSelected ? 'Pinned on dashboard' : 'Pin as current project on dashboard'}
              >
                <Star className={`w-4 h-4 ${isSelected ? 'fill-yellow-400' : ''}`} />
              </button>
            )}

            <Link
              href={getResumeRoute()}
              className="w-24 h-16 rounded-lg overflow-hidden bg-gray-800 border border-gray-700/60 shrink-0 flex items-center justify-center relative"
            >
              {thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${thumbUrl}${thumbUrl.includes('?') ? '&' : '?'}t=${project.metadata?.thumbnailGeneratedAt || ''}`}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <currentStepInfo.icon className={`w-6 h-6 ${currentStepInfo.color}`} />
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={getResumeRoute()} className="min-w-0">
                  <h3 className="text-base font-bold text-white hover:text-indigo-300 transition-colors truncate">
                    {project.title}
                  </h3>
                </Link>
                {seriesId && (
                  <Link
                    href={`/dashboard/series/${seriesId}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25"
                  >
                    <Library className="w-3 h-3" />
                    {episodeNumber ? `Ep. ${episodeNumber}` : 'Series'}
                  </Link>
                )}
                {renderStatusControl()}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(duration)}
                </span>
                {sceneCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatRelativeTime(project.updatedAt)}
                </span>
                {project.metadata?.genre && (
                  <span className="text-gray-500">· {project.metadata.genre}</span>
                )}
              </div>
            </div>
          </div>

          {/* Middle: Stage, Progress, Resonance, & Cost */}
          <div className="flex flex-wrap items-center gap-4 lg:gap-6 shrink-0">
            <div className="w-40">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`font-medium ${currentStepInfo.badgeText}`}>
                  Stage {stepNumber}/{totalSteps} · {currentStepInfo.name}
                </span>
                <span className="text-gray-400">{progressPercent}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5">
              <span title="Director Review Score">
                🎬{' '}
                <strong className="text-white">
                  {reviewScores.director !== null ? reviewScores.director : '—'}
                </strong>
              </span>
              <span className="text-gray-600">|</span>
              <span title="Audience Resonance Score">
                👥{' '}
                <strong className="text-white">
                  {reviewScores.audience !== null ? reviewScores.audience : '—'}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5">
              <Coins className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-gray-300">
                <strong className="text-white">{costs.creditsUsed.toLocaleString()}</strong> used
              </span>
              {!isDemo && (
                <button
                  type="button"
                  onClick={() => setCostCalculatorOpen(true)}
                  className="ml-1 text-indigo-400 hover:text-indigo-300"
                  title="Open budget calculator"
                >
                  <Calculator className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Resume CTA + Actions Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={getResumeRoute()}
              className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              {isDemo ? 'Explore Demo' : `Resume`}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            {renderActionsDropdown()}
          </div>
        </div>
        {renderDialogs()}
      </motion.div>
    )
  }

  // ============================================================================
  // GRID CARD VIEW (viewMode === 'grid')
  // ============================================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`bg-gray-900/95 backdrop-blur-sm rounded-xl border ${
        isSelected
          ? 'border-yellow-500 ring-2 ring-yellow-500/30'
          : 'border-gray-700/60 hover:border-gray-600/80'
      } shadow-xl overflow-hidden flex flex-col justify-between transition-all ${className}`}
    >
      <div>
        {/* Project Thumbnail */}
        <div className="relative h-44 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${thumbUrl}${thumbUrl.includes('?') ? '&' : '?'}t=${project.metadata?.thumbnailGeneratedAt || ''}`}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <div
                className={`w-14 h-14 mx-auto mb-2 ${currentStepInfo.bgColor} ${currentStepInfo.borderColor} border rounded-xl flex items-center justify-center`}
              >
                <currentStepInfo.icon className={`w-7 h-7 ${currentStepInfo.color}`} />
              </div>
              <p className="text-gray-400 text-xs">{project.metadata?.genre || 'Project'}</p>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-black/30" />

          {/* Top Left: Actions Dropdown + Pin Star Toggle */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
            {renderActionsDropdown()}
            {!isDemo && onSelectAsCurrent && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onSelectAsCurrent(project.id)
                }}
                className={`p-2 rounded-lg backdrop-blur-sm border transition-all ${
                  isSelected
                    ? 'bg-yellow-500/30 text-yellow-400 border-yellow-500/50 shadow-lg shadow-yellow-500/20'
                    : 'bg-gray-900/80 text-gray-400 border-gray-700/60 hover:bg-gray-800 hover:text-yellow-400'
                }`}
                title={
                  isSelected
                    ? 'Pinned on dashboard'
                    : 'Pin as current project on dashboard'
                }
              >
                <Star className={`w-4 h-4 ${isSelected ? 'fill-yellow-400' : ''}`} />
              </button>
            )}
          </div>

          {/* Top Right: Canonical 2-Stage Indicator */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${currentStepInfo.badgeBg} ${currentStepInfo.badgeText} border ${currentStepInfo.badgeBorder}`}
            >
              Stage {stepNumber}/{totalSteps} · {currentStepInfo.name}
            </div>
            {seriesId && (
              <Link
                href={`/dashboard/series/${seriesId}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 backdrop-blur-md hover:bg-cyan-900/90"
              >
                <Library className="w-3 h-3" />
                {episodeNumber ? `Episode ${episodeNumber}` : 'Series Episode'}
              </Link>
            )}
          </div>
        </div>

        {/* Project Content */}
        <div className="p-5">
          {/* Header + Status Pill */}
          <div className="mb-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Link href={getResumeRoute()} className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white hover:text-indigo-300 transition-colors line-clamp-1">
                  {project.title}
                </h3>
              </Link>
              {renderStatusControl()}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1" title="Estimated duration">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(duration)}
              </span>

              {sceneCount > 0 && (
                <span className="flex items-center gap-1" title="Number of scenes">
                  <Layers className="w-3.5 h-3.5" />
                  {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
                </span>
              )}

              <span
                className="flex items-center gap-1"
                title={`Last updated: ${new Date(project.updatedAt).toLocaleString()}`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {formatRelativeTime(project.updatedAt)}
              </span>
            </div>
          </div>

          {/* Progress Bar (Single clean indicator — no duplicate stage badge) */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-400">
                {isPhase1Complete ? 'Pre-Production Ready' : currentStepInfo.name}
              </span>
              <span className="text-gray-300 font-medium">{progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Review Scores */}
          <div className="mb-3.5 p-2.5 bg-gray-800/40 rounded-lg border border-gray-700/40">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">🎬</span>
                <span className="text-xs text-gray-400">Director</span>
                <span
                  className={`text-xs font-bold ml-auto ${
                    reviewScores.director !== null ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {reviewScores.director !== null ? reviewScores.director : '—'}
                </span>
                {reviewScores.director !== null && (
                  <span className="text-[10px]">
                    {reviewScores.director >= 85
                      ? '🟢'
                      : reviewScores.director >= 75
                        ? '🟡'
                        : '🔴'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 border-l border-gray-700/50 pl-3">
                <span className="text-xs">👥</span>
                <span className="text-xs text-gray-400">Audience</span>
                <span
                  className={`text-xs font-bold ml-auto ${
                    reviewScores.audience !== null ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {reviewScores.audience !== null ? reviewScores.audience : '—'}
                </span>
                {reviewScores.audience !== null && (
                  <span className="text-[10px]">
                    {reviewScores.audience >= 85
                      ? '🟢'
                      : reviewScores.audience >= 75
                        ? '🟡'
                        : '🔴'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Project Cost Section (Subtle calculator button so Resume CTA remains primary) */}
          <div className="p-2.5 bg-gray-800/40 rounded-lg border border-gray-700/40">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-gray-500" />
                Credits & Budget
              </div>
              {!isDemo && (
                <button
                  type="button"
                  onClick={() => setCostCalculatorOpen(true)}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-indigo-300 hover:text-white border border-gray-700 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors"
                  title="Open cost calculator to set budget"
                >
                  <Calculator className="w-3 h-3" />
                  Calculator
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-1.5 bg-gray-900/50 rounded">
                <div className="text-gray-400 text-[11px] mb-0.5">Used</div>
                <div className="font-bold text-white">{costs.creditsUsed.toLocaleString()}</div>
                {!isDemo && (
                  <button
                    type="button"
                    onClick={() => setAdjustCreditsOpen(true)}
                    className="mt-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline"
                  >
                    Adjust
                  </button>
                )}
              </div>

              <div className="text-center p-1.5 bg-gray-900/50 rounded">
                <div className="text-gray-400 text-[11px] mb-0.5">Budget</div>
                <div
                  className={`font-bold ${
                    costs.creditsBudget > 0 ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {costs.creditsBudget > 0 ? costs.creditsBudget.toLocaleString() : '—'}
                </div>
              </div>

              <div className="text-center p-1.5 bg-gray-900/50 rounded">
                <div className="text-gray-400 text-[11px] mb-0.5">Est. Left</div>
                <div className="font-bold text-amber-400">
                  {costs.estimatedCreditsToComplete.toLocaleString()}
                </div>
              </div>
            </div>

            {costs.creditsBudget > 0 && (
              <div
                className={`mt-2 flex items-center justify-center gap-1 text-[11px] ${
                  costs.isOverBudget ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                <TrendingUp className={`w-3 h-3 ${costs.isOverBudget ? 'rotate-0' : 'rotate-180'}`} />
                <span>
                  {costs.isOverBudget ? 'Over' : 'Under'} budget by{' '}
                  {Math.abs(costs.variance).toLocaleString()} credits (
                  {Math.abs(costs.variancePercent)}%)
                </span>
              </div>
            )}
          </div>

          {isPhase2Available && !hasValidBYOK && (
            <div className="mt-3 p-2 rounded-lg border border-amber-500/30 bg-amber-500/10">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-300">
                  API key required for video generation
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Resume Button Footer */}
      <div className="px-5 pb-5 pt-1">
        <Link
          href={getResumeRoute()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/15 rounded-lg text-sm font-semibold transition-all"
        >
          {isDemo ? 'Explore UI Sandbox' : `Resume ${currentStepInfo.name}`}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {renderDialogs()}
    </motion.div>
  )
}
