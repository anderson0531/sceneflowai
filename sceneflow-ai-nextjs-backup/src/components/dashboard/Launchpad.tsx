'use client'

import { useStore } from '@/store/useStore'
import { Plus, Play, FolderOpen } from 'lucide-react'
import Link from 'next/link'

export function Launchpad() {
  const { projects } = useStore()
  const hasRecentProject = projects.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-dark-text">The Launchpad</h2>
        <p className="text-dark-text-secondary">Quick actions to get you started</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create New Project */}
        <Link href="/dashboard/projects/new" className="group">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white hover:from-blue-700 hover:to-blue-800 transition-all duration-200 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <span className="text-sm text-blue-100">New Project</span>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Create New Project</h3>
            <p className="text-blue-100 mb-4">
              Start a new video production project from scratch or upload existing content
            </p>
            <div className="flex items-center text-blue-100 group-hover:text-white transition-colors">
              <span className="font-medium">Get Started</span>
              <Plus className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Continue Project */}
        <Link href={hasRecentProject ? "/dashboard/projects" : "/dashboard/projects/new"} className="group">
          <div className={`rounded-xl p-6 transition-all duration-200 card-hover ${
            hasRecentProject 
              ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700' 
              : 'bg-dark-card border border-dark-border text-dark-text-secondary'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                hasRecentProject ? 'bg-white/20' : 'bg-dark-border'
              }`}>
                <Play className={`w-6 h-6 ${hasRecentProject ? 'text-white' : 'text-dark-text-secondary'}`} />
              </div>
              <div className="text-right">
                <span className={`text-sm ${hasRecentProject ? 'text-orange-100' : 'text-dark-text-secondary'}`}>
                  {hasRecentProject ? 'Continue' : 'No Projects'}
                </span>
              </div>
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${hasRecentProject ? 'text-white' : 'text-dark-text-secondary'}`}>
              Continue Project
            </h3>
            <p className={`mb-4 ${hasRecentProject ? 'text-orange-100' : 'text-dark-text-secondary'}`}>
              {hasRecentProject 
                ? `Resume work on "${projects[0]?.title}" or browse all projects`
                : 'Create your first project to get started with video production'
              }
            </p>
            <div className={`flex items-center transition-colors ${
              hasRecentProject ? 'text-orange-100 group-hover:text-white' : 'text-dark-text-secondary'
            }`}>
              <span className="font-medium">
                {hasRecentProject ? 'Continue Working' : 'Create First Project'}
              </span>
              <Play className={`w-4 h-4 ml-2 ${hasRecentProject ? 'group-hover:translate-x-1' : ''} transition-transform`} />
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium text-dark-text">All Projects</h4>
                <p className="text-sm text-dark-text-secondary">Manage projects</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/settings" className="group">
          <div className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-dark-accent transition-colors card-hover">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h4 className="font-medium text-dark-text">Settings</h4>
                <p className="text-sm text-dark-text-secondary">Configure app</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
