'use client'

import { motion } from 'framer-motion'
import { ActiveProjectCard } from './ActiveProjectCard'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { formatRelativeTime, getPhaseDisplayName, getStepNumber, getTotalSteps } from '@/hooks/useDashboardData'
import {
  getProjectAudienceResonanceScore,
  getProjectBudgetStatus,
  getProjectCreditsUsed,
  getProjectEstimatedRemainingCredits,
  getProjectSceneCount,
  getProjectScenesList,
} from '@/lib/credits/projectBudgetShared'
import { getResumeRouteForStep } from '@/constants/workflowRoutes'
import { normalizeWorkflowStep } from '@/constants/workflowSteps'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'

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
  selectedProjectId?: string | null
  onProjectUpdated?: () => void
}

// Transform API project to ActiveProjectCard props
function transformProject(project: DashboardProject, index: number, selectedProjectId?: string | null) {
  const currentStep = getStepNumber(project.currentStep)
  const totalSteps = getTotalSteps()
  const phaseName = getPhaseDisplayName(project.currentStep)
  const normalizedStep = normalizeWorkflowStep(project.currentStep)

  const visionPhase = project.metadata?.visionPhase
  const scenes = getProjectScenesList(project.metadata)
  const sceneCount = getProjectSceneCount(project.metadata)

  // Get thumbnail - prioritize billboard, then thumbnail, then first scene image
  const thumbnailUrl =
    project.metadata?.billboardUrl ||
    visionPhase?.billboardUrl ||
    project.metadata?.thumbnailUrl ||
    project.metadata?.thumbnail ||
    visionPhase?.thumbnailUrl ||
    scenes[0]?.imageUrl ||
    scenes[0]?.generatedImage?.url ||
    undefined

  // Truthful Audience Resonance score (null if not yet analyzed)
  const audienceResonanceScore = getProjectAudienceResonanceScore(project.metadata)
  const estimatedRemaining = getProjectEstimatedRemainingCredits(project.metadata, project.progress)

  // Determine current phase & resume action accurately
  const getNextStep = () => {
    const isComplete = project.progress >= 100 || project.status === 'completed'
    const resumeUrl = getResumeRouteForStep(project.id, project.currentStep)
    const screeningRoomUrl = `/dashboard/workflow/screening-room?projectId=${project.id}&tab=publish`

    if (isComplete) {
      return {
        name: 'Screening Room',
        description: 'Screen, export, and publish your completed production',
        estimatedCredits: 0,
        actionLabel: 'Open Screening Room',
        actionUrl: screeningRoomUrl,
        isComplete: true,
      }
    }

    if (normalizedStep === 'blueprint') {
      return {
        name: STUDIO_DISPLAY_NAMES.blueprint,
        description: 'Develop treatment, target audience resonance, and story bible',
        estimatedCredits: estimatedRemaining,
        actionLabel: `Resume ${STUDIO_DISPLAY_NAMES.blueprint}`,
        actionUrl: resumeUrl,
        isComplete: false,
      }
    }

    return {
      name: STUDIO_DISPLAY_NAMES.production,
      description: 'Continue script direction, frames, audio, and video streams',
      estimatedCredits: estimatedRemaining,
      actionLabel: `Resume ${STUDIO_DISPLAY_NAMES.production}`,
      actionUrl: resumeUrl,
      isComplete: false,
    }
  }

  const creditsUsed = getProjectCreditsUsed(project.metadata)
  const budgetStatus = getProjectBudgetStatus(project.metadata)

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    thumbnailUrl,
    currentStep,
    totalSteps,
    phaseName,
    progressPercent: project.progress || (normalizedStep === 'blueprint' ? 20 : 50),
    audienceResonanceScore,
    nextStep: getNextStep(),
    estimatedCredits: estimatedRemaining,
    lastActive: formatRelativeTime(project.updatedAt),
    budgetStatus,
    creditsUsed,
    sceneCount,
    isStarred: Boolean(selectedProjectId && project.id === selectedProjectId),
    index,
    genre: project.genre || project.metadata?.genre,
    metadata: project.metadata,
  }
}

export function ActiveProjectsContainer({
  projects = [],
  selectedProjectId,
  onProjectUpdated,
}: ActiveProjectsContainerProps) {
  const displayProjects = projects.length > 0 ? projects : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="space-y-4"
    >
      {displayProjects.map((project, index) => (
        <ActiveProjectCard
          key={project.id}
          {...transformProject(project, index, selectedProjectId)}
          onThumbnailUpdated={() => onProjectUpdated?.()}
          onBudgetUpdated={() => onProjectUpdated?.()}
        />
      ))}

      {displayProjects.length === 0 && (
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl p-8 text-center">
          <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <Plus className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">No Active Productions Yet</h3>
          <p className="text-sm text-gray-400 mb-5 max-w-md mx-auto">
            Create your first film blueprint, start a multi-episode series bible, or import an existing screenplay.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard/studio/new-project">
              <Button variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </Button>
            </Link>
            <Link href="/dashboard/series">
              <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
                Explore {STUDIO_DISPLAY_NAMES.series}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  )
}
