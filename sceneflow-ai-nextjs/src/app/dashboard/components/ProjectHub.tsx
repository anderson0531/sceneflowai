'use client'

import { motion } from 'framer-motion'
import { Plus, Play, Star, Calendar, Eye, Sparkles } from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'
import Link from 'next/link'

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
  const { projects } = useEnhancedStore()
  
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
        className="bg-sf-surface rounded-2xl p-6 shadow border border-sf-border"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-sf-text-primary">Recent Projects</h2>
          <Link href="/dashboard/projects">
            <button 
              className="text-sf-primary hover:text-sf-accent font-medium transition-colors"
            >
              View All
            </button>
          </Link>
        </div>
        
        {/* Enhanced Empty State with Actionable Guidance - Hero gradient background */}
        <div className="text-center py-16 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-blue-800/20 rounded-2xl border-2 border-blue-500/30 shadow-2xl">
          <div className="w-28 h-28 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-blue-400/40 shadow-2xl">
            <Sparkles className="w-16 h-16 text-blue-300" />
          </div>
          
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Create Your First Video?
          </h3>
          
          <p className="text-blue-100 mb-8 max-w-lg mx-auto leading-relaxed text-lg">
            Start your creative journey with SceneFlow AI. Our guided workflow will help you transform your ideas into professional videos.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/studio/crispr-debate-001">
              <button className="bg-sf-primary text-white px-6 py-3 rounded-lg shadow-md hover:bg-sf-accent hover:shadow-sf-elevated transition-all duration-200 font-medium">
                <Plus className="w-4 h-4 inline mr-2" />
                Start New Project
              </button>
            </Link>
            
            <Link href="/dashboard/templates">
              <button className="bg-sf-surface-light text-sf-text-primary px-6 py-3 rounded-lg border border-sf-border hover:border-sf-primary/30 hover:shadow-sf-elevated transition-all duration-200 font-medium">
                <Eye className="w-4 h-4 inline mr-2" />
                Browse Templates
              </button>
            </Link>
          </div>
          
          <p className="text-xs text-sf-text-secondary mt-4 max-w-sm mx-auto">
            💡 <strong>Pro tip:</strong> Use our AI-powered "The Spark Studio" to generate unique video concepts from any topic.
          </p>
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
      className="bg-sf-surface rounded-2xl p-6 shadow border border-sf-border"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-sf-text-primary">Recent Projects</h2>
        <Link href="/dashboard/projects">
          <button 
            className="text-sf-primary hover:text-sf-accent font-medium transition-colors"
          >
            View All
          </button>
        </Link>
      </div>
      
      {/* Projects List */}
      <div className="space-y-4">
        {projects.slice(0, 5).map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
            className="border border-sf-border rounded-lg p-4 hover:border-sf-primary/40 hover:shadow-sf-elevated transition-all duration-200 bg-sf-surface-light"
          >
            <div className="flex items-center gap-4">
              {/* Thumbnail Placeholder */}
              <div className="w-16 h-16 bg-sf-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6 text-sf-primary" />
              </div>
              
              {/* Project Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sf-text-primary mb-1 truncate">
                  {project.title}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-sf-text-secondary">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-sf-primary rounded-full"></span>
                    {getStageDisplayName(project.currentStep)} ({getStageNumber(project.currentStep, project.completedSteps)}/4)
                  </span>
                  
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-sf-accent" />
                    {getCueStrengthRating(project)}/5.0
                  </span>
                  
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(project.updatedAt)}
                  </span>
                </div>
              </div>
              
              {/* Continue Button */}
              <Link href={`/dashboard/workflow/${project.currentStep}`}>
                <button
                  className="bg-sf-primary text-white px-4 py-2 rounded-lg hover:bg-sf-accent hover:shadow-sf-elevated transition-all duration-200 font-medium text-sm flex items-center gap-2"
                >
                  <Play className="w-3 h-3" />
                  Continue
                </button>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Show More Projects Link */}
      {projects.length > 5 && (
        <div className="text-center mt-6">
          <Link href="/dashboard/projects">
            <button
              className="text-sf-primary hover:text-sf-accent font-medium transition-colors"
            >
              View {projects.length - 5} more projects →
            </button>
          </Link>
        </div>
      )}
    </motion.div>
  )
}
