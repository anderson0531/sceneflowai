'use client'

import { motion } from 'framer-motion'
import { Plus, Play, Star, Calendar, Eye } from 'lucide-react'
import { useStore } from '@/store/useStore'

interface Project {
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
  }
}

export function ProjectHub() {
  const { projects } = useStore()
  
  const getStageDisplayName = (step: string) => {
    const stageNames = {
      'ideation': 'Vision Board',
      'storyboard': 'Storyboard',
      'scene-direction': "Director's Chair",
      'video-generation': 'Video Lab'
    }
    return stageNames[step as keyof typeof stageNames] || step
  }

  const getStageNumber = (currentStep: string, completedSteps: string[]) => {
    const allSteps = ['ideation', 'storyboard', 'scene-direction', 'video-generation']
    const currentIndex = allSteps.indexOf(currentStep)
    return currentIndex + 1
  }

  const getCueStrengthRating = (project: Project) => {
    // Simulate AI rating based on project progress and metadata quality
    const baseRating = 3.5
    const progressBonus = (project.progress / 100) * 1.0
    const metadataBonus = project.metadata?.concept && project.metadata?.keyMessage ? 0.5 : 0
    const finalRating = Math.min(5.0, baseRating + progressBonus + metadataBonus)
    return finalRating.toFixed(1)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date))
  }

  if (projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
          <button 
            onClick={() => window.location.href = '/dashboard/projects'}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            View All
          </button>
        </div>
        
        {/* Empty State */}
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Eye className="w-12 h-12 text-gray-400" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No projects yet
          </h3>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Start your first video project! Create something amazing with our AI-powered workflow.
          </p>
          
          <button
            onClick={() => window.location.href = '/dashboard/projects/new'}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg mt-4 shadow-md hover:bg-blue-600 transition-colors font-medium"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Project
          </button>
        </div>
      </motion.div>
    )
  }

  // Active State - Display existing projects
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
        <button 
          onClick={() => window.location.href = '/dashboard/projects'}
          className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          View All
        </button>
      </div>
      
      {/* Projects List */}
      <div className="space-y-4">
        {projects.slice(0, 5).map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              {/* Thumbnail Placeholder */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              
              {/* Project Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">
                  {project.title}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    {getStageDisplayName(project.currentStep)} ({getStageNumber(project.currentStep, project.completedSteps)}/4)
                  </span>
                  
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    {getCueStrengthRating(project)}/5.0
                  </span>
                  
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(project.updatedAt)}
                  </span>
                </div>
              </div>
              
              {/* Continue Button */}
              <button
                onClick={() => window.location.href = `/dashboard/workflow/${project.currentStep}`}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <Play className="w-3 h-3" />
                Continue
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Show More Projects Link */}
      {projects.length > 5 && (
        <div className="text-center mt-6">
          <button
            onClick={() => window.location.href = '/dashboard/projects'}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            View {projects.length - 5} more projects →
          </button>
        </div>
      )}
    </motion.div>
  )
}
