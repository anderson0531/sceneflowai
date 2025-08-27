import type { SceneFlowProject, ModuleId, ModuleProgress } from '@/types/SceneFlowCore'

/**
 * Calculate overall project completion percentage
 */
export function calculateOverallProgress(project: SceneFlowProject): number {
  const { progress } = project
  const totalProgress = Object.values(progress).reduce((sum, value) => sum + value, 0)
  return Math.round(totalProgress / Object.keys(progress).length)
}

/**
 * Get the next module in the workflow sequence
 */
export function getNextModule(currentModule: ModuleId): ModuleId | null {
  const moduleSequence: ModuleId[] = [
    'ideation',
    'story-structure',
    'vision-board',
    'direction',
    'screening-room',
    'quality-control'
  ]
  
  const currentIndex = moduleSequence.indexOf(currentModule)
  if (currentIndex === -1 || currentIndex === moduleSequence.length - 1) {
    return null
  }
  
  return moduleSequence[currentIndex + 1]
}

/**
 * Get the previous module in the workflow sequence
 */
export function getPreviousModule(currentModule: ModuleId): ModuleId | null {
  const moduleSequence: ModuleId[] = [
    'ideation',
    'story-structure',
    'vision-board',
    'direction',
    'screening-room',
    'quality-control'
  ]
  
  const currentIndex = moduleSequence.indexOf(currentModule)
  if (currentIndex <= 0) {
    return null
  }
  
  return moduleSequence[currentIndex - 1]
}

/**
 * Check if a module can be accessed based on previous module completion
 */
export function canAccessModule(project: SceneFlowProject, targetModule: ModuleId): boolean {
  const moduleSequence: ModuleId[] = [
    'ideation',
    'story-structure',
    'vision-board',
    'direction',
    'screening-room',
    'quality-control'
  ]
  
  const targetIndex = moduleSequence.indexOf(targetModule)
  if (targetIndex === 0) return true // Ideation is always accessible
  
  // Check if all previous modules are completed
  for (let i = 0; i < targetIndex; i++) {
    const previousModule = moduleSequence[i]
    const progressKey = getProgressKey(previousModule)
    if (project.progress[progressKey] < 100) {
      return false
    }
  }
  
  return true
}

/**
 * Get the progress key for a module
 */
export function getProgressKey(moduleId: ModuleId): keyof SceneFlowProject['progress'] {
  const progressMap: Record<ModuleId, keyof SceneFlowProject['progress']> = {
    'ideation': 'ideation',
    'story-structure': 'storyStructure',
    'vision-board': 'visionBoard',
    'direction': 'direction',
    'screening-room': 'videoGeneration',
    'quality-control': 'qualityControl'
  }
  
  return progressMap[moduleId]
}

/**
 * Validate project data integrity
 */
export function validateProjectData(project: SceneFlowProject): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields validation
  if (!project.title.trim()) {
    errors.push('Project title is required')
  }
  
  if (!project.coreConcept.corePremise.trim()) {
    errors.push('Core premise is required')
  }
  
  if (!project.coreConcept.genre.trim()) {
    errors.push('Genre is required')
  }
  
  if (!project.coreConcept.targetAudience.trim()) {
    errors.push('Target audience is required')
  }
  
  // Progress validation
  Object.entries(project.progress).forEach(([key, value]) => {
    if (value < 0 || value > 100) {
      errors.push(`Invalid progress value for ${key}: ${value}`)
    }
  })
  
  // Data consistency warnings
  if (project.progress.storyStructure > 0 && !project.narrativeBlueprint.selectedStructure) {
    warnings.push('Story structure progress exists but no structure is selected')
  }
  
  if (project.progress.visionBoard > 0 && project.styleGuide.artDirectionKeywords.length === 0) {
    warnings.push('Vision board progress exists but no art direction keywords are set')
  }
  
  if (project.progress.direction > 0 && !project.productionPackage.shootingScript) {
    warnings.push('Direction progress exists but no shooting script is generated')
  }
  
  if (project.progress.videoGeneration > 0 && !project.generationQueue) {
    warnings.push('Video generation progress exists but no generation queue is set')
  }
  
  if (project.progress.qualityControl > 0 && !project.timelineProject) {
    warnings.push('Quality control progress exists but no timeline project is created')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Generate a project summary for display
 */
export function generateProjectSummary(project: SceneFlowProject): {
  title: string
  status: string
  progress: number
  currentModule: string
  estimatedDuration: string
  lastUpdated: string
  nextSteps: string[]
} {
  const overallProgress = calculateOverallProgress(project)
  
  // Determine current module
  let currentModule = 'Not Started'
  if (project.progress.qualityControl === 100) {
    currentModule = 'Quality Control - Complete'
  } else if (project.progress.videoGeneration === 100) {
    currentModule = 'Screening Room - Complete'
  } else if (project.progress.direction === 100) {
    currentModule = "Director's Chair - Complete"
  } else if (project.progress.visionBoard === 100) {
    currentModule = 'Vision Board - Complete'
  } else if (project.progress.storyStructure === 100) {
    currentModule = 'Story Structure - Complete'
  } else if (project.progress.ideation > 0) {
    currentModule = 'Ideation - In Progress'
  }
  
  // Format estimated duration
  const duration = project.coreConcept.estimatedDuration
  const estimatedDuration = duration >= 60 
    ? `${Math.floor(duration / 60)}h ${duration % 60}m`
    : `${duration}m`
  
  // Format last updated
  const lastUpdated = new Date(project.metadata.updatedAt).toLocaleDateString()
  
  // Determine next steps
  const nextSteps: string[] = []
  if (project.progress.ideation < 100) {
    nextSteps.push('Complete core concept development')
  } else if (project.progress.storyStructure < 100) {
    nextSteps.push('Develop narrative structure and character arcs')
  } else if (project.progress.visionBoard < 100) {
    nextSteps.push('Create visual style guide and references')
  } else if (project.progress.direction < 100) {
    nextSteps.push('Generate production documents')
  } else if (project.progress.videoGeneration < 100) {
    nextSteps.push('Generate AI video clips')
  } else if (project.progress.qualityControl < 100) {
    nextSteps.push('Review and refine final video')
  } else {
    nextSteps.push('Project complete! Ready for export')
  }
  
  return {
    title: project.title,
    status: project.status,
    progress: overallProgress,
    currentModule,
    estimatedDuration,
    lastUpdated,
    nextSteps
  }
}

/**
 * Check if project can be exported
 */
export function canExportProject(project: SceneFlowProject): boolean {
  return project.progress.qualityControl === 100
}

/**
 * Generate export filename
 */
export function generateExportFilename(project: SceneFlowProject, format: string = 'json'): string {
  const timestamp = new Date().toISOString().split('T')[0]
  const safeTitle = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  return `sceneflow_${safeTitle}_${timestamp}.${format}`
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Calculate estimated project size
 */
export function estimateProjectSize(project: SceneFlowProject): number {
  let estimatedSize = 0
  
  // Base project data
  estimatedSize += 1024 // ~1KB for project metadata
  
  // Visual references
  if (project.styleGuide.visualReferences) {
    estimatedSize += project.styleGuide.visualReferences.length * 512 // ~512B per reference
  }
  
  // Generated content (rough estimates)
  if (project.digitalDailies) {
    estimatedSize += 1024 * 1024 // ~1MB for dailies metadata
  }
  
  if (project.timelineProject) {
    estimatedSize += 512 * 1024 // ~512KB for timeline data
  }
  
  return estimatedSize
}

/**
 * Get module display name
 */
export function getModuleDisplayName(moduleId: ModuleId): string {
  const displayNames: Record<ModuleId, string> = {
    'ideation': 'The Spark Studio',
    'story-structure': 'Story Structure Studio',
    'vision-board': 'The Vision Board',
    'direction': "The Director's Chair",
    'screening-room': 'The Screening Room',
    'quality-control': 'Quality Control'
  }
  
  return displayNames[moduleId] || moduleId
}

/**
 * Get module description
 */
export function getModuleDescription(moduleId: ModuleId): string {
  const descriptions: Record<ModuleId, string> = {
    'ideation': 'Generate compelling film concepts and core premises',
    'story-structure': 'Architect your narrative blueprint with professional structures',
    'vision-board': 'Define visual language and create style guides',
    'direction': 'Generate industry-standard production documents',
    'screening-room': 'Transform your plan into AI-generated video clips',
    'quality-control': 'Refine, review, and finalize your cinematic product'
  }
  
  return descriptions[moduleId] || ''
}





