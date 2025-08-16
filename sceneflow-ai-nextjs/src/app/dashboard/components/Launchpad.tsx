'use client'

import { motion } from 'framer-motion'
import { Plus, Play, FileText } from 'lucide-react'
import { useStore } from '@/store/useStore'

export function Launchpad() {
  const { projects, currentProject } = useStore()
  
  // Get the most recent project
  const mostRecentProject = projects.length > 0 
    ? projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null

  const hasActiveProjects = projects.length > 0

  const getStageDisplayName = (step: string) => {
    const stageNames = {
      'ideation': 'Spark Studio',
      'storyboard': 'Storyboard',
      'scene-direction': "Director's Chair",
      'video-generation': 'Video Lab'
    }
    return stageNames[step as keyof typeof stageNames] || step
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        <span className="text-sm text-gray-500">Jump into your workflow</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Create New Project */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="group cursor-pointer"
          onClick={() => window.location.href = '/dashboard/projects/new/spark-studio'}
        >
          <div className="bg-blue-500 text-white rounded-lg shadow-lg p-6 hover:shadow-xl transition duration-300 group-hover:scale-105 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold mb-2">Create New Project</h3>
            
            <p className="text-blue-100 text-sm leading-relaxed">
              Start brainstorming in the Spark Studio or upload an existing script.
            </p>
            
            <div className="mt-4 flex items-center text-blue-100 text-sm">
              <FileText className="w-4 h-4 mr-2" />
              <span>Spark Studio</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Continue Project */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={`group cursor-pointer ${!hasActiveProjects ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => hasActiveProjects && mostRecentProject ? 
            window.location.href = `/dashboard/workflow/${mostRecentProject.currentStep}` : 
            undefined
          }
        >
          <div className={`bg-orange-500 text-white rounded-lg shadow-lg p-6 hover:shadow-xl transition duration-300 ${hasActiveProjects ? 'group-hover:scale-105' : ''} h-full`}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold mb-2">Continue Project</h3>
            
            {hasActiveProjects && mostRecentProject ? (
              <>
                <p className="text-orange-100 text-sm leading-relaxed mb-2">
                  {mostRecentProject.title}
                </p>
                <div className="text-orange-100 text-xs">
                  Stage {mostRecentProject.completedSteps.length + 1}: {getStageDisplayName(mostRecentProject.currentStep)}
                </div>
              </>
            ) : (
              <p className="text-orange-100 text-sm leading-relaxed">
                No active projects
              </p>
            )}
            
            {hasActiveProjects && mostRecentProject && (
              <div className="mt-4 flex items-center text-orange-100 text-sm">
                <Play className="w-4 h-4 mr-2" />
                <span>Resume</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
