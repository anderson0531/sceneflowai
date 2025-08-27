'use client'

import { motion } from 'framer-motion'
import { Plus, Play } from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'
import Link from 'next/link'

export function Launchpad() {
  const { projects, currentProject } = useEnhancedStore()
  
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
      className="bg-sf-surface rounded-2xl p-6 shadow border border-sf-border"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-sf-text-primary">Quick Actions</h2>
        <span className="text-sm text-sf-text-secondary">Jump into your workflow</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Start Project - Now with dark gray background and accent highlights */}
        <Link href="/studio/crispr-debate-001">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="group cursor-pointer"
          >
            <div className="bg-sf-surface-light text-sf-text-primary rounded-lg shadow-lg p-6 hover:shadow-sf-elevated transition duration-300 group-hover:scale-105 h-full border border-sf-border hover:border-sf-primary/30">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-sf-primary/10 rounded-lg flex items-center justify-center border border-sf-primary/20">
                  <Plus className="w-6 h-6 text-sf-primary" />
                </div>
              </div>

              <h3 className="text-xl font-bold mb-2">Start Project</h3>

              <p className="text-sf-text-secondary text-sm leading-relaxed font-medium">
                Start blank, from a Creator Template, from an idea, or import a script.
              </p>
            </div>
          </motion.div>
        </Link>

        {/* Card 2 removed: Enhanced Project flows moved into Start wizard */}

        {/* Card 3: Continue Project - Now consistent with Start Project */}
        {hasActiveProjects && mostRecentProject ? (
          <Link href={hasActiveProjects && mostRecentProject ? 
            `/dashboard/workflow/${mostRecentProject.currentStep}` : 
            '/dashboard/workflow/ideation'
          }>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="group cursor-pointer"
            >
              <div className="bg-sf-surface-light text-sf-text-primary rounded-lg border border-sf-border shadow p-6 transition duration-300 group-hover:scale-105 hover:shadow-sf-elevated hover:border-sf-primary/30 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-sf-primary/10 rounded-lg flex items-center justify-center border border-sf-primary/20">
                    <Play className="w-6 h-6 text-sf-primary" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-2">Continue Project</h3>
                
                <p className="text-sf-text-secondary text-sm leading-relaxed mb-2">
                  {mostRecentProject.title}
                </p>
                <div className="text-sf-text-secondary text-xs">
                  Stage {mostRecentProject.completedSteps.length + 1}: {getStageDisplayName(mostRecentProject.currentStep)}
                </div>
                
                <div className="mt-4 flex items-center text-sf-text-secondary text-sm">
                  <Play className="w-4 h-4 mr-2" />
                  <span>Resume</span>
                </div>
              </div>
            </motion.div>
          </Link>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="group opacity-50 pointer-events-none"
          >
            <div className="bg-sf-surface-light text-sf-text-primary rounded-lg border border-sf-border shadow p-6 transition duration-300 h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-sf-primary/10 rounded-lg flex items-center justify-center border border-sf-primary/20">
                  <Play className="w-6 h-6 text-sf-primary" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-2">Continue Project</h3>
              
              <p className="text-sf-text-secondary text-sm leading-relaxed">
                No active projects
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
