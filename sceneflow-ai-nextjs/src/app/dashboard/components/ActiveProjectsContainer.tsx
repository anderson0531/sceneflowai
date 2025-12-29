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
}

interface ActiveProjectsContainerProps {
  projects?: DashboardProject[]
}

// Transform API project to ActiveProjectCard props
function transformProject(project: DashboardProject, index: number) {
  const currentStep = getStepNumber(project.currentStep)
  const totalSteps = getTotalSteps()
  const phaseName = getPhaseDisplayName(project.currentStep)
  
  // Extract scores from metadata if available
  const visionPhase = project.metadata?.visionPhase
  const scenes = visionPhase?.script?.script?.scenes || visionPhase?.scenes || []
  
  // Get thumbnail from first scene image or project thumbnail
  const thumbnailUrl = 
    project.metadata?.thumbnailUrl || 
    project.metadata?.thumbnail ||
    scenes[0]?.imageUrl ||
    scenes[0]?.generatedImage?.url ||
    visionPhase?.thumbnailUrl ||
    null
  
  // Calculate average scene score
  const sceneScores = scenes
    .map((s: any) => s.score || s.reviewScore || 0)
    .filter((s: number) => s > 0)
  const avgScene = sceneScores.length > 0 
    ? Math.round(sceneScores.reduce((a: number, b: number) => a + b, 0) / sceneScores.length)
    : 75

  // Director score from metadata or default
  const directorScore = project.metadata?.directorScore || avgScene + 5
  const audienceScore = project.metadata?.audienceScore || avgScene - 3

  // Determine next step based on current step
  const getNextStep = () => {
    const stepConfig: Record<string, { name: string; description: string; url: string }> = {
      'blueprint': { 
        name: 'Vision Board', 
        description: 'Create visual storyboard for each scene',
        url: `/dashboard/workflow/vision/${project.id}`
      },
      'vision': { 
        name: "Director's Chair", 
        description: 'Define camera angles, lighting & movement',
        url: `/dashboard/workflow/direction/${project.id}`
      },
      'creation': { 
        name: 'Video Generation', 
        description: 'Generate video from your scenes',
        url: `/dashboard/workflow/video-generation?project=${project.id}`
      },
      'polish': { 
        name: 'Export', 
        description: 'Export your finished video',
        url: `/dashboard/workflow/export/${project.id}`
      },
      'launch': { 
        name: 'Complete', 
        description: 'Project is ready for distribution',
        url: `/dashboard/projects/${project.id}`
      }
    }
    
    const config = stepConfig[project.currentStep] || stepConfig['blueprint']
    return {
      name: config.name,
      description: config.description,
      estimatedCredits: scenes.length * 10 || 35,
      actionLabel: project.progress >= 100 ? 'View Project' : 'Continue',
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
    scores: {
      director: Math.min(100, Math.max(0, directorScore)),
      audience: Math.min(100, Math.max(0, audienceScore)),
      avgScene: Math.min(100, Math.max(0, avgScene))
    },
    nextStep: getNextStep(),
    estimatedCredits: scenes.length * 50 || 250,
    lastActive: formatRelativeTime(project.updatedAt),
    budgetStatus: budgetStatus as 'on-track' | 'near-limit' | 'over-budget',
    index
  }
}

export function ActiveProjectsContainer({ projects = [] }: ActiveProjectsContainerProps) {
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
