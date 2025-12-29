'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Video,
  FileText,
  Film,
  CheckCircle,
  Wrench,
  Sparkles,
  Eye,
  Clock,
  Key,
  AlertTriangle,
  MoreVertical,
  Edit,
  Copy,
  Archive,
  Trash,
  Layers,
  Calendar,
  Star,
  ChevronDown,
} from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'
import { useCueStore } from '@/store/useCueStore'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import ThumbnailPromptDrawer from '@/components/project/ThumbnailPromptDrawer'
import {
  WORKFLOW_STEPS,
  WORKFLOW_STEP_LABELS,
  normalizeCompletedWorkflowSteps,
  normalizeWorkflowStep,
  getWorkflowStepIndex,
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
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/40',
  },
  vision: {
    name: WORKFLOW_STEP_LABELS.vision,
    icon: Eye,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/40',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/40',
  },
  creation: {
    name: WORKFLOW_STEP_LABELS.creation,
    icon: Film,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-300',
    badgeBorder: 'border-orange-500/40',
  },
  polish: {
    name: WORKFLOW_STEP_LABELS.polish,
    icon: CheckCircle,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
    borderColor: 'border-teal-500/40',
    badgeBg: 'bg-teal-500/20',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-500/40',
  },
  launch: {
    name: WORKFLOW_STEP_LABELS.launch,
    icon: Wrench,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/40',
    badgeBg: 'bg-pink-500/20',
    badgeText: 'text-pink-300',
    badgeBorder: 'border-pink-500/40',
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
    createdAt: Date
    updatedAt: Date
    completedSteps: string[]
    metadata?: {
      genre?: string
      duration?: number
      targetAudience?: string
      style?: string
      concept?: string
      keyMessage?: string
      tone?: string
      thumbnail?: string
      visionPhase?: any
      directorScore?: number
      audienceScore?: number
      [key: string]: any // Allow additional properties
    }
  }
  className?: string
  isSelected?: boolean
  onSelectAsCurrent?: (projectId: string) => void
  onStatusChange?: (projectId: string, status: string) => void
  onDuplicate?: (projectId: string) => void
  onArchive?: (projectId: string) => void
  onDelete?: (projectId: string, projectTitle: string) => void
}

export function ProjectCard({ project, className = '', isSelected = false, onSelectAsCurrent, onStatusChange, onDuplicate, onArchive, onDelete }: ProjectCardProps) {
  const { user, byokSettings } = useEnhancedStore()
  const { invokeCue } = useCueStore()
  const [isHovered, setIsHovered] = useState(false)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const [promptDrawerOpen, setPromptDrawerOpen] = useState(false)

  const normalizedCurrentStep = normalizeWorkflowStep(project.currentStep)
  const normalizedCompletedSteps = normalizeCompletedWorkflowSteps(project.completedSteps)
  const currentStepInfo = STEP_STYLES[normalizedCurrentStep]
  const currentStepIndex = getWorkflowStepIndex(normalizedCurrentStep)
  const stepNumber = currentStepIndex === -1 ? 1 : currentStepIndex + 1
  const totalSteps = WORKFLOW_STEPS.length
  const isPhase1Complete = normalizedCompletedSteps.includes('creation')
  const isPhase2Available = isPhase1Complete
  const hasValidBYOK = Boolean(byokSettings?.videoGenerationProvider?.isConfigured)

  // Format relative time (e.g., "2 days ago", "just now")
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

  // Get scenes array from vision phase data
  const getScenes = () => {
    return project.metadata?.visionPhase?.script?.script?.scenes ||
           project.metadata?.visionPhase?.scenes ||
           project.metadata?.scenes ||
           []
  }

  // Get scene count from vision phase data
  const getSceneCount = () => {
    return getScenes().length
  }

  // Get calculated duration from actual scene durations or metadata
  const getProjectDuration = (): number | null => {
    // First check if we have explicit duration in metadata (in minutes)
    if (project.metadata?.duration && project.metadata.duration > 0) {
      return project.metadata.duration
    }
    
    // Calculate total duration from scene durations (scenes store duration in seconds)
    const scenes = getScenes()
    if (scenes.length > 0) {
      // Check if any scenes have duration data
      const scenesWithDuration = scenes.filter((scene: any) => 
        scene.duration !== undefined && scene.duration !== null && Number(scene.duration) > 0
      )
      
      if (scenesWithDuration.length === 0) {
        return null // No duration data available
      }
      
      const totalSeconds = scenes.reduce((sum: number, scene: any) => {
        return sum + (Number(scene.duration) || 0)
      }, 0)
      
      if (totalSeconds > 0) {
        // Convert to minutes, round to 1 decimal
        return Math.round((totalSeconds / 60) * 10) / 10
      }
    }
    
    return null
  }

  // Format duration display
  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return 'TBD'
    if (minutes < 1) return `${Math.round(minutes * 60)}s`
    return `${minutes} min`
  }

  // Calculate project progress percentage
  const getProgressPercentage = () => {
    const completedCount = normalizedCompletedSteps.length
    return Math.round((completedCount / totalSteps) * 100)
  }

  // Calculate actual costs - show real data when available
  const getProjectCosts = () => {
    // Real credits used from project metadata if tracked
    const creditsUsed = project.metadata?.creditsUsed || 0
    
    // Estimate based on remaining work if generating
    const sceneCount = getSceneCount()
    const estimatedBYOKCost = sceneCount > 0 
      ? Math.max(3, sceneCount * 1.5) // ~$1.50 per scene for video generation
      : 15 // Default estimate
    
    return {
      creditsUsed,
      estimatedBYOK: Math.round(estimatedBYOKCost)
    }
  }

  // Calculate review scores from scene data or metadata
  const getReviewScores = () => {
    const scenes = getScenes()
    const sceneScores = scenes
      .map((s: any) => s.score || s.reviewScore || 0)
      .filter((s: number) => s > 0)
    const avgScene = sceneScores.length > 0 
      ? Math.round(sceneScores.reduce((a: number, b: number) => a + b, 0) / sceneScores.length)
      : 75

    const directorScore = project.metadata?.directorScore || avgScene + 5
    const audienceScore = project.metadata?.audienceScore || avgScene - 3

    return {
      director: Math.min(100, Math.max(0, directorScore)),
      audience: Math.min(100, Math.max(0, audienceScore)),
      avgScene: Math.min(100, Math.max(0, avgScene))
    }
  }

  const costs = getProjectCosts()
  const sceneCount = getSceneCount()
  const duration = getProjectDuration()
  const progressPercent = getProgressPercentage()
  const reviewScores = getReviewScores()

  // Get contextual button label based on stage
  const getActionLabel = () => {
    if (isPhase1Complete) return hasValidBYOK ? 'Generate Video' : 'Setup & Generate'
    // Stage is already displayed separately, so just use "Continue"
    return 'Continue'
  }

  // Handle Generate Video button click with JIT BYOK onboarding
  const handleGenerateVideo = () => {
    if (!hasValidBYOK) {
      // Trigger Cue with BYOK onboarding flow
      invokeCue({
        type: 'analysis',
        content: 'BYOK_GUIDED_SETUP',
        payload: {
          projectId: project.id,
          projectTitle: project.title,
          estimatedCost: costs.estimatedBYOK,
          message: `I need help setting up BYOK (Bring Your Own Key) to generate video for "${project.title}". The estimated cost is $${costs.estimatedBYOK}. Can you guide me through the setup process?`
        }
      })
    } else {
      // Proceed to generation page
      window.location.href = `/dashboard/workflow/video-generation?project=${project.id}`
    }
  }



  // Get workflow status display
  const getWorkflowStatus = () => {
    if (isPhase1Complete) {
      return {
        text: 'Pre-Production Complete',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/40'
      }
    } else {
      return {
        text: `Stage ${stepNumber}/${totalSteps}: ${currentStepInfo.name}`,
        color: currentStepInfo.color,
        bgColor: currentStepInfo.bgColor,
        borderColor: currentStepInfo.borderColor,
      }
    }
  }

  const workflowStatus = getWorkflowStatus()

  // Helper function to get project thumbnail
  const getThumbnailUrl = (): string | null => {
    // Priority 1: First scene image from vision phase
    const firstSceneImage = project.metadata?.visionPhase?.script?.script?.scenes?.[0]?.imageUrl
    if (firstSceneImage) return firstSceneImage
    
    // Priority 2: First scene from scenes array
    const firstScene = project.metadata?.visionPhase?.scenes?.[0]?.imageUrl
    if (firstScene) return firstScene
    
    // Priority 3: First character image
    const firstCharImage = project.metadata?.visionPhase?.characters?.[0]?.referenceImage
    if (firstCharImage) return firstCharImage
    
    // Priority 4: Cached generated thumbnail
    const cachedThumb = project.metadata?.thumbnail
    if (cachedThumb) return cachedThumb
    
    // Priority 5: null (show gradient placeholder)
    return null
  }

  // Handler for generating thumbnail
  const handleGenerateThumbnail = async () => {
    if (isGeneratingThumbnail) return
    
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
          userApiKey: byokSettings?.imageGenerationProvider?.apiKey || '' // Pass BYOK key
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Trigger a reload of the projects list by calling parent
        // The thumbnail is already saved in the backend, so a page refresh will show it
        try { 
          const { toast } = require('sonner')
          toast.success('Thumbnail generated successfully!')
        } catch {}
        
        // Force a page reload to show the new thumbnail
        window.location.reload()
      } else {
        // Check if BYOK is required
        if (data.requiresBYOK) {
          throw new Error('OpenAI API key required. Please configure your BYOK settings in the dashboard.')
        }
        throw new Error(data.error || 'Failed to generate thumbnail')
      }
    } catch (error: any) {
      console.error('Thumbnail generation error:', error)
      try { 
        const { toast } = require('sonner')
        toast.error(error.message || 'Failed to generate thumbnail')
      } catch {}
    } finally {
      setIsGeneratingThumbnail(false)
    }
  }

  // Helper function to get correct route for resume action
  const getResumeRoute = (): string => {
    const { currentStep, id } = project
    
    // Map workflow steps to correct routes
    const routeMap: Record<string, string> = {
      // Phase 1 - Pre-Production
      'ideation': `/dashboard/studio/${id}`,
      'start': `/dashboard/studio/${id}`,
      'storyboard': `/dashboard/workflow/vision/${id}`, // Route to new Vision page
      'vision': `/dashboard/workflow/vision/${id}`,     // Route to new Vision page
      'scene-direction': `/dashboard/workflow/video-generation?project=${id}`,
      
      // Phase 2 - Production
      'video-generation': `/dashboard/workflow/video-generation?project=${id}`,
      'review': `/dashboard/workflow/review?project=${id}`,
      'optimization': `/dashboard/workflow/optimization?project=${id}`
    }
    
    return routeMap[currentStep] || `/dashboard/studio/${id}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`bg-gray-900/95 backdrop-blur-sm rounded-xl border ${isSelected ? 'border-yellow-500 ring-2 ring-yellow-500/30' : 'border-gray-700/50'} shadow-2xl overflow-hidden ${className}`}
    >
      {/* Project Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center overflow-hidden">
        {getThumbnailUrl() ? (
          <img 
            src={`${getThumbnailUrl()}?t=${project.metadata?.thumbnailGeneratedAt || Date.now()}`}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto mb-3 ${currentStepInfo.bgColor} ${currentStepInfo.borderColor} border-2 rounded-xl flex items-center justify-center`}>
              <currentStepInfo.icon className={`w-8 h-8 ${currentStepInfo.color}`} />
            </div>
            <p className="text-gray-400 text-sm">{project.metadata?.genre || 'Project'}</p>
          </div>
        )}
        
        {/* Current Project Star Toggle */}
        {onSelectAsCurrent && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onSelectAsCurrent(project.id)
            }}
            className={`absolute top-3 right-14 p-2 rounded-lg backdrop-blur-sm transition-all ${
              isSelected 
                ? 'bg-yellow-500/30 text-yellow-400 hover:bg-yellow-500/40' 
                : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700 hover:text-yellow-400'
            }`}
            title={isSelected ? 'Current project (shown on dashboard)' : 'Set as current project'}
          >
            <Star className={`w-4 h-4 ${isSelected ? 'fill-yellow-400' : ''}`} />
          </button>
        )}
        
        {/* Actions Menu */}
        {(onDuplicate || onArchive || onDelete) && (
          <div className="absolute top-3 left-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 backdrop-blur-sm transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                {onDuplicate && (
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
                  {isGeneratingThumbnail ? 'Generating...' : 'Quick Generate'}
                </DropdownMenuItem>
                {onArchive && (
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
                {onDelete && (
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
          </div>
        )}
        
        {/* Stage Indicator */}
        <div className="absolute top-3 right-3">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${currentStepInfo.badgeBg} ${currentStepInfo.badgeText} border ${currentStepInfo.badgeBorder}`}>
            Stage {stepNumber} • {currentStepInfo.name}
          </div>
        </div>
      </div>

      {/* Project Content */}
      <div className="p-6">
        {/* Project Header */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{project.title}</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
            {/* Duration */}
            <span className="flex items-center gap-1" title="Estimated duration">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(duration)}
            </span>
            
            {/* Scene count */}
            {sceneCount > 0 && (
              <span className="flex items-center gap-1" title="Number of scenes">
                <Layers className="w-3.5 h-3.5" />
                {sceneCount} scenes
              </span>
            )}
            
            {/* Last updated */}
            <span className="flex items-center gap-1" title={`Last updated: ${new Date(project.updatedAt).toLocaleString()}`}>
              <Calendar className="w-3.5 h-3.5" />
              {formatRelativeTime(project.updatedAt)}
            </span>
          </div>
        </div>

        {/* Progress Bar + Workflow Status */}
        <div className="mb-4 space-y-2">
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
            <div 
              className={`h-full ${currentStepInfo.bgColor.replace('/20', '')} transition-all duration-500`}
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            />
          </div>
          
          {/* Status badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${workflowStatus.bgColor} ${workflowStatus.borderColor} border`}>
            <span className={`text-xs font-semibold ${workflowStatus.color}`}>
              {workflowStatus.text}
            </span>
          </div>
        </div>

        {/* Review Scores */}
        <div className="mb-4 p-3 bg-gray-800/40 rounded-lg border border-gray-700/40">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Review Scores</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🎬</span>
              <span className="text-xs text-gray-400">Director</span>
              <span className="text-sm font-bold text-white ml-auto">{reviewScores.director}</span>
              <span className="text-xs">{reviewScores.director >= 85 ? '🟢' : reviewScores.director >= 75 ? '🟡' : '🔴'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">👥</span>
              <span className="text-xs text-gray-400">Audience</span>
              <span className="text-sm font-bold text-white ml-auto">{reviewScores.audience}</span>
              <span className="text-xs">{reviewScores.audience >= 85 ? '🟢' : reviewScores.audience >= 75 ? '🟡' : '🔴'}</span>
            </div>
          </div>
        </div>

        {/* Project Status Selector */}
        {onStatusChange && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">Project Status</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/40 hover:bg-gray-800/60 rounded-lg border border-gray-700/40 hover:border-gray-600/50 transition-colors text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-white font-medium capitalize">{project.status === 'in-progress' ? 'Active' : project.status}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuItem onClick={() => onStatusChange(project.id, 'draft')}>
                  <span className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                  Draft
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(project.id, 'active')}>
                  <span className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(project.id, 'completed')}>
                  <span className="w-2 h-2 rounded-full bg-green-400 mr-2" />
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(project.id, 'archived')}>
                  <span className="w-2 h-2 rounded-full bg-gray-600 mr-2" />
                  Archived
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Project Stats - Compact */}
        <div className="mb-5 p-3 bg-gray-800/40 rounded-lg border border-gray-700/40">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Credits:</span>
              <span className="font-medium text-white">{costs.creditsUsed}</span>
            </div>
            {isPhase2Available && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Est. cost:</span>
                <span className="font-medium text-amber-400">~${costs.estimatedBYOK}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {isPhase1Complete ? (
            // Phase 2: Dual pathway options
            <>
              {/* Primary: Generate Video */}
              <Button
                onClick={handleGenerateVideo}
                className={`w-full h-11 text-sm font-semibold transition-all duration-200 ${
                  hasValidBYOK 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25'
                }`}
              >
                <Video className="w-4 h-4 mr-2" />
                {getActionLabel()}
              </Button>


            </>
          ) : (
            // Phase 1: Continue current step with contextual label
            <Link href={getResumeRoute()} className="block">
              <Button
                className="w-full h-11 bg-gradient-to-r from-sf-primary to-purple-500 hover:from-sf-accent hover:to-purple-600 text-white text-sm font-semibold shadow-lg shadow-sf-primary/25"
                title={`Continue to ${currentStepInfo.name}`}
              >
                <Play className="w-4 h-4 mr-2" />
                {getActionLabel()}
              </Button>
            </Link>
          )}
        </div>

        {/* BYOK Status Indicator - Only show when relevant */}
        {isPhase2Available && !hasValidBYOK && (
          <div className="mt-3 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-amber-300">
                API key required for video generation
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail Prompt Editor Drawer */}
      <ThumbnailPromptDrawer
        open={promptDrawerOpen}
        onClose={() => setPromptDrawerOpen(false)}
        project={project}
        currentThumbnail={getThumbnailUrl() || undefined}
        onThumbnailGenerated={(imageUrl) => {
          // Thumbnail was generated and saved via API
          // Trigger parent to reload projects
          window.dispatchEvent(new CustomEvent('project-updated'))
        }}
      />
    </motion.div>
  )
}
