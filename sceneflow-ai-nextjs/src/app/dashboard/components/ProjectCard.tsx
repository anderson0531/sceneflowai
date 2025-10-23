'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, 
  Video, 
  FileText, 
  Camera, 
  Film, 
  CheckCircle, 
  Wrench,
  Sparkles,
  Eye,
  Clock,
  DollarSign,
  Key,
  AlertTriangle,
  MoreVertical,
  Edit,
  Copy,
  Archive,
  Trash
} from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'
import { useCueStore } from '@/store/useCueStore'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import ThumbnailPromptDrawer from '@/components/project/ThumbnailPromptDrawer'

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
      [key: string]: any // Allow additional properties
    }
  }
  className?: string
  onDuplicate?: (projectId: string) => void
  onArchive?: (projectId: string) => void
  onDelete?: (projectId: string, projectTitle: string) => void
}

export function ProjectCard({ project, className = '', onDuplicate, onArchive, onDelete }: ProjectCardProps) {
  const { user, byokSettings } = useEnhancedStore()
  const { invokeCue } = useCueStore()
  const [isHovered, setIsHovered] = useState(false)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const [promptDrawerOpen, setPromptDrawerOpen] = useState(false)

  // Enhanced workflow step mapping with phase information
  const workflowSteps = {
    'ideation': { 
      name: 'The Blueprint', 
      phase: 1, 
      stepNumber: 1,
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/40',
      phaseBadgeBg: 'bg-blue-500/20',
      phaseBadgeText: 'text-blue-300',
      phaseBadgeBorder: 'border-blue-500/40'
    },
    'storyboard': { 
      name: 'Vision', 
      phase: 2, 
      stepNumber: 2,
      icon: Eye,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/40',
      phaseBadgeBg: 'bg-purple-500/20',
      phaseBadgeText: 'text-purple-300',
      phaseBadgeBorder: 'border-purple-500/40'
    },
    'scene-direction': { 
      name: 'Action Plan', 
      phase: 3, 
      stepNumber: 3,
      icon: Camera,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/40',
      phaseBadgeBg: 'bg-green-500/20',
      phaseBadgeText: 'text-green-300',
      phaseBadgeBorder: 'border-green-500/40'
    },
    'video-generation': { 
      name: 'Creation Hub', 
      phase: 4, 
      stepNumber: 4,
      icon: Film,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/40',
      phaseBadgeBg: 'bg-orange-500/20',
      phaseBadgeText: 'text-orange-300',
      phaseBadgeBorder: 'border-orange-500/40'
    },
    'review': { 
      name: 'Polish', 
      phase: 5, 
      stepNumber: 5,
      icon: CheckCircle,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/20',
      borderColor: 'border-teal-500/40',
      phaseBadgeBg: 'bg-teal-500/20',
      phaseBadgeText: 'text-teal-300',
      phaseBadgeBorder: 'border-teal-500/40'
    },
    'optimization': { 
      name: 'Launchpad', 
      phase: 6, 
      stepNumber: 6,
      icon: Wrench,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-500/40',
      phaseBadgeBg: 'bg-pink-500/20',
      phaseBadgeText: 'text-pink-300',
      phaseBadgeBorder: 'border-pink-500/40'
    }
  }

  const currentStepInfo = workflowSteps[project.currentStep as keyof typeof workflowSteps]
  const isPhase1Complete = project.completedSteps.includes('scene-direction')
  const isPhase2Available = isPhase1Complete
  const hasValidBYOK = Boolean(byokSettings?.videoGenerationProvider?.isConfigured)

  // Calculate estimated costs based on project complexity and duration
  const getEstimatedCosts = () => {
    const baseAnalysisCost = 150 // credits per step
    const analysisCreditsUsed = project.completedSteps.length * baseAnalysisCost
    const estimatedBYOKCost = project.metadata?.duration ? 
      Math.max(5, project.metadata.duration * 0.5) : 15 // $0.50 per minute, minimum $5
    
    return {
      analysisCredits: analysisCreditsUsed,
      estimatedBYOK: estimatedBYOKCost
    }
  }

  const costs = getEstimatedCosts()

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
        text: `Step ${currentStepInfo.stepNumber}/6: ${currentStepInfo.name}`,
        color: currentStepInfo.color,
        bgColor: currentStepInfo.bgColor,
        borderColor: currentStepInfo.borderColor
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
      'scene-direction': `/dashboard/workflow/scene-direction?project=${id}`,
      
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
      className={`bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden ${className}`}
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
        
        {/* Phase Indicator */}
        <div className="absolute top-3 right-3">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${currentStepInfo.phaseBadgeBg} ${currentStepInfo.phaseBadgeText} border ${currentStepInfo.phaseBadgeBorder}`}>
            Phase {currentStepInfo.phase} • {currentStepInfo.name}
          </div>
        </div>
      </div>

      {/* Project Content */}
      <div className="p-6">
        {/* Project Header */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {project.metadata?.duration ? `${project.metadata.duration} min` : 'Duration TBD'}
            </span>
            {project.metadata?.genre && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {project.metadata.genre}
              </span>
            )}
          </div>
        </div>

        {/* Workflow Status */}
        <div className="mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${workflowStatus.bgColor} ${workflowStatus.borderColor} border`}>
            <span className={`text-sm font-semibold ${workflowStatus.color}`}>
              {workflowStatus.text}
            </span>
          </div>
        </div>

        {/* Costs & Budgeting */}
        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            Costs & Budgeting
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Analysis Credits Used:</span>
              <span className="text-sm font-semibold text-white">{costs.analysisCredits}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Est. BYOK (if generating):</span>
              <span className="text-sm font-semibold text-white">~${costs.estimatedBYOK}</span>
            </div>
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
                className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
                  hasValidBYOK 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25'
                }`}
              >
                <Video className="w-5 h-5 mr-2" />
                {hasValidBYOK ? 'Generate Video' : 'Setup BYOK & Generate'}
              </Button>


            </>
          ) : (
            // Phase 1: Continue current step
            <Link href={getResumeRoute()}>
              <Button
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-base font-semibold shadow-lg shadow-blue-500/25"
                title={`Continue to ${currentStepInfo.name}`}
              >
                <Play className="w-5 h-5 mr-2" />
                Resume Project
              </Button>
            </Link>
          )}
        </div>

        {/* BYOK Status Indicator */}
        {isPhase2Available && (
          <div className="mt-4 p-3 rounded-lg border border-gray-700/50 bg-gray-800/30">
            <div className="flex items-center gap-2">
              <Key className={`w-4 h-4 ${hasValidBYOK ? 'text-green-400' : 'text-yellow-400'}`} />
              <span className="text-sm text-gray-300">
                {hasValidBYOK 
                  ? 'BYOK Configured - Ready for AI Generation' 
                  : 'BYOK Required for AI Video Generation'
                }
              </span>
            </div>
            
            {!hasValidBYOK && (
              <div className="mt-2 flex items-center gap-2 text-xs text-yellow-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Click "Generate Video" to setup your API keys</span>
              </div>
            )}
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
