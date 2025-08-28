'use client'

import { motion } from 'framer-motion'
import { Plus, Sparkles, Play, Eye, FolderOpen } from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ProjectCard } from './ProjectCard'

export function ProjectHub() {
  const { projects } = useEnhancedStore()

  const getStageDisplayName = (step: string) => {
    const stageNames = {
      'ideation': 'Script Analysis',
      'storyboard': 'Storyboarding',
      'scene-direction': "Director's Chair",
      'video-generation': 'Video Generation',
      'review': 'Quality Review',
      'optimization': 'Finalization'
    }
    return stageNames[step as keyof typeof stageNames] || step
  }

  if (projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
      >
        {/* Header - Balanced with top of page */}
        <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Production Projects</h2>
              <p className="text-gray-400 mt-1">Manage your creative workflow</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">No projects yet</span>
              <Link href="/studio/crispr-debate-001">
                <Button
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Empty State */}
        <div className="p-8 text-center">
          <div className="w-24 h-24 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600/50">
            <FolderOpen className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">No Production Projects Yet</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Start your first video project to begin your creative journey with SceneFlow AI.
          </p>
          <Link href="/studio/crispr-debate-001">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </Link>
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
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
    >
      {/* Header - Balanced with top of page */}
      <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Production Projects</h2>
            <p className="text-gray-400 mt-1">Manage your creative workflow</p>
          </div>
          
          <div className="flex gap-3">
            <Link href="/dashboard/projects/new">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 shadow-lg shadow-blue-500/25 transition-all duration-200 font-semibold">
                <Plus className="w-5 h-5 mr-2" />
                + New Project
              </Button>
            </Link>
            
            <Link href="/dashboard/projects">
              <Button variant="outline" className="border-gray-600/50 text-gray-200 hover:text-white hover:border-gray-500/70 px-6 py-3 transition-all duration-200 font-semibold">
                <Eye className="w-5 h-5 mr-2" />
                Manage Projects
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Recent Projects List */}
      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Projects</h3>
          <div className="space-y-3">
            {projects.slice(0, 5).map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
                className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 hover:bg-gray-800/70 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center border border-gray-600/50">
                      <FolderOpen className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{project.title}</h4>
                      <p className="text-gray-400 text-sm">{project.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Workflow Status */}
                    <div className="text-right">
                      <div className="text-sm text-gray-300 font-medium">
                        {getStageDisplayName(project.currentStep)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Step {project.completedSteps.length + 1}/6
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-24 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                    
                    {/* Action Button */}
                    <Link href={`/dashboard/workflow/${project.currentStep}?project=${project.id}`}>
                      <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Continue
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Show More Projects Link */}
        {projects.length > 5 && (
          <div className="text-center">
            <Link href="/dashboard/projects">
              <Button variant="outline" className="border-gray-600/50 text-gray-300 hover:text-white hover:border-gray-500/70">
                View All {projects.length} Projects
              </Button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  )
}
