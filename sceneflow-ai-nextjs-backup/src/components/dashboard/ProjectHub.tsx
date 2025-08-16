'use client'

import { useStore } from '@/store/useStore'
import { FolderOpen, Play, Clock, Star, Plus, Eye, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

export function ProjectHub() {
  const { projects } = useStore()

  const getCueStrengthRating = () => {
    return Math.floor(Math.random() * 5) + 1
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }

  const getWorkflowStepName = (step: string) => {
    const stepNames = {
      'ideation': 'The Spark Studio',
      'storyboard': 'Vision Board',
      'scene-direction': 'The Director\'s Chair',
      'video-generation': 'The Screening Room'
    }
    return stepNames[step as keyof typeof stepNames] || 'Unknown Step'
  }

  const getWorkflowStepColor = (step: string) => {
    const stepColors = {
      'ideation': 'from-blue-500 to-blue-600',
      'storyboard': 'from-green-500 to-green-600',
      'scene-direction': 'from-orange-500 to-orange-600',
      'video-generation': 'from-purple-500 to-purple-600'
    }
    return stepColors[step as keyof typeof stepColors] || 'from-gray-500 to-gray-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-dark-text">Project Hub</h2>
        <Link href="/dashboard/projects">
          <span className="text-dark-accent hover:text-dark-accent-hover text-sm font-medium transition-colors">
            View All →
          </span>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-dark-card border border-dark-border rounded-xl">
          <div className="w-16 h-16 bg-dark-border rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-dark-text-secondary" />
          </div>
          <h3 className="text-lg font-medium text-dark-text mb-2">No projects yet</h3>
          <p className="text-dark-text-secondary mb-6">Create your first video project to get started</p>
          <Link href="/dashboard/projects/new">
            <div className="inline-flex items-center px-4 py-2 bg-dark-accent text-white rounded-lg hover:bg-dark-accent-hover transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </div>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.slice(0, 5).map((project) => (
            <div key={project.id} className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-dark-accent transition-all duration-200 card-hover">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Project Icon */}
                  <div className={`w-12 h-12 bg-gradient-to-r ${getWorkflowStepColor(project.currentStep)} rounded-lg flex items-center justify-center`}>
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Project Info */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-dark-text">{project.title}</h3>
                    <p className="text-dark-text-secondary text-sm">{project.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-dark-text-secondary">
                      <span>Stage: {getWorkflowStepName(project.currentStep)}</span>
                      <span>Progress: {project.progress}%</span>
                      <span>Last modified: {formatDate(project.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Cue Strength Rating */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-dark-text-secondary">Cue Strength:</span>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < getCueStrengthRating() ? 'text-yellow-500 fill-current' : 'text-dark-border'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-dark-border">
                <div className="flex items-center space-x-2">
                  <Link href={`/dashboard/workflow/${project.currentStep}`}>
                    <div className="inline-flex items-center px-4 py-2 bg-dark-accent text-white rounded-lg hover:bg-dark-accent-hover transition-colors">
                      <Play className="w-4 h-4 mr-2" />
                      Continue
                    </div>
                  </Link>
                  <button className="inline-flex items-center px-3 py-2 border border-dark-border text-dark-text rounded-lg hover:border-dark-accent transition-colors">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="inline-flex items-center px-3 py-2 border border-dark-border text-dark-text rounded-lg hover:border-dark-accent transition-colors">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-red-500/20 text-red-500 rounded-lg hover:border-red-500 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/projects/new" className="group">
          <div className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-dark-accent transition-colors card-hover">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium text-dark-text">New Project</h4>
                <p className="text-sm text-dark-text-secondary">Start creating</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/ideas" className="group">
          <div className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-dark-accent transition-colors card-hover">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h4 className="font-medium text-dark-text">Browse Ideas</h4>
                <p className="text-sm text-dark-text-secondary">Get inspired</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/projects" className="group">
          <div className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-dark-accent transition-colors card-hover">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-dark-text">All Projects</h4>
                <p className="text-sm text-dark-text-secondary">Manage all</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
