'use client'

import { motion } from 'framer-motion'
import { ActiveProjectCard } from './ActiveProjectCard'
import { Filter, ArrowUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { formatRelativeTime, getPhaseDisplayName, getStepNumber, getTotalSteps } from '@/hooks/useDashboardData'

// Types for project data from API
interface DashboardProject {
  id: string
  title: string
  description: string
  currentStep: string
  progress: number
  status: string
  createdAt: string
  updatedAt: string
  completedSteps: string[]
  metadata: Record<string, any>
  genre?: string
}

interface ActiveProjectsContainerProps {
  projects?: DashboardProject[]
  onProjectUpdated?: () => void
}

// Transform API project to ActiveProjectCard props
function transformProject(project: DashboardProject, index: number) {
  const currentStep = getStepNumber(project.currentStep)
  const totalSteps = getTotalSteps()
  const phaseName = getPhaseDisplayName(project.currentStep)
  
  // Extract scores from metadata if available
  const visionPhase = project.metadata?.visionPhase
  const scenes = visionPhase?.script?.script?.scenes || visionPhase?.scenes || []
  
  // Get thumbnail - prioritize billboard, then thumbnail, then first scene image
  const thumbnailUrl = 
    project.metadata?.billboardUrl ||
    visionPhase?.billboardUrl ||
    project.metadata?.thumbnailUrl || 
    project.metadata?.thumbnail ||
    visionPhase?.thumbnailUrl ||
    scenes[0]?.imageUrl ||
    scenes[0]?.generatedImage?.url ||
    null
  
  // Calculate average scene score
  const sceneScores = scenes
    .map((s: any) => s.score || s.reviewScore || 0)
    .filter((s: number) => s > 0)
  const avgScene = sceneScores.length > 0 
    ? Math.round(sceneScores.reduce((a: number, b: number) => a + b, 0) / sceneScores.length)
    : 75

  // Extract Audience Resonance score from vision phase reviews
  const audienceResonanceScore = visionPhase?.reviews?.audience?.overallScore || 
    project.metadata?.audienceScore || 
    avgScene

  // Determine next step based on current step
  const getNextStep = () => {
    const stepConfig: Record<string, { name: string; description: string; url: string }> = {
      blueprint: { 
        name: 'Production', 
        description: 'Create visual storyboard for each scene',
        url: `/dashboard/workflow/vision/${project.id}`
      },
      vision: { 
        name: 'Final Cut', 
        description: 'Edit scenes, timing, and mix in Final Cut',
        url: `/dashboard/workflow/final-cut?projectId=${project.id}`
      },
      creation: { 
        name: 'Premiere', 
        description: 'Finalize review in Screening Room',
        url: `/dashboard/workflow/premiere?projectId=${project.id}`
      },
      polish: { 
        name: 'Premiere', 
        description: 'Finalize review in Screening Room',
        url: `/dashboard/workflow/premiere?projectId=${project.id}`
      },
      launch: { 
        name: 'Complete', 
        description: 'Project is ready for distribution',
        url: `/dashboard/projects/${project.id}`
      },
      // Backward-compat aliases for older step keys
      ideation: {
        name: 'Production',
        description: 'Create visual storyboard for each scene',
        url: `/dashboard/workflow/vision/${project.id}`,
      },
      storyboard: {
        name: 'Production',
        description: 'Create visual storyboard for each scene',
        url: `/dashboard/workflow/vision/${project.id}`,
      },
      'scene-direction': {
        name: 'Final Cut',
        description: 'Edit scenes, timing, and mix in Final Cut',
        url: `/dashboard/workflow/final-cut?projectId=${project.id}`,
      },
      'video-generation': {
        name: 'Final Cut',
        description: 'Edit scenes, timing, and mix in Final Cut',
        url: `/dashboard/workflow/final-cut?projectId=${project.id}`,
      },
      review: {
        name: 'Premiere',
        description: 'Finalize review in Screening Room',
        url: `/dashboard/workflow/premiere?projectId=${project.id}`,
      },
      optimization: {
        name: 'Premiere',
        description: 'Finalize review in Screening Room',
        url: `/dashboard/workflow/premiere?projectId=${project.id}`,
      },
    }
    
    const config = stepConfig[project.currentStep] || stepConfig['blueprint']
    return {
      name: config.name,
      description: config.description,
      estimatedCredits: scenes.length * 10 || 35,
      actionLabel: project.progress >= 100 ? 'View Project' : 'Resume',
      actionUrl: config.url,
      isComplete: project.progress >= 100
    }
  }

  // Determine budget status
  const creditsUsed = project.metadata?.creditsUsed || 0
  const estimatedTotal = scenes.length * 100 || 500
  const budgetStatus = creditsUsed > estimatedTotal ? 'over-budget' 
    : creditsUsed > estimatedTotal * 0.75 ? 'near-limit' 
    : 'on-track'

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    thumbnailUrl,
    currentStep,
    totalSteps,
    phaseName,
    progressPercent: project.progress,
    audienceResonanceScore: Math.min(100, Math.max(0, audienceResonanceScore)),
    nextStep: getNextStep(),
    estimatedCredits: scenes.length * 50 || 250,
    lastActive: formatRelativeTime(project.updatedAt),
    budgetStatus: budgetStatus as 'on-track' | 'near-limit' | 'over-budget',
    index,
    genre: project.genre || project.metadata?.genre,
    metadata: project.metadata
  }
}

export function ActiveProjectsContainer({ projects = [], onProjectUpdated }: ActiveProjectsContainerProps) {
  const displayProjects = projects.length > 0 ? projects : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="space-y-4"
    >
      {/* Project Cards - No header needed for single project view */}
      {displayProjects.map((project, index) => (
        <ActiveProjectCard
          key={project.id}
          {...transformProject(project, index)}
          onThumbnailUpdated={() => onProjectUpdated?.()}
        />
      ))}

      {/* Empty State */}
      {displayProjects.length === 0 && (
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Project Selected</h3>
          <p className="text-gray-400 mb-6">Select a project from the Projects page or create a new one</p>
          <Link href="/dashboard/studio/new-project">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Create New Project
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
  )
}
