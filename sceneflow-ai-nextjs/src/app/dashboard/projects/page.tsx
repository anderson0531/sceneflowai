'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Plus, Search, Filter, SortAsc, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function ProjectsPage() {
  const [isClient, setIsClient] = useState(false)
  const { projects } = useStore()

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Safe format date function with error handling
  const safeFormatDate = (date: any): string => {
    try {
      if (!date) return 'Unknown'
      if (date instanceof Date) {
        return formatDate(date)
      }
      if (typeof date === 'string') {
        return formatDate(new Date(date))
      }
      return 'Unknown'
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Unknown'
    }
  }

  // Don't render until client-side
  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-sf-text-primary">Projects</h1>
            <p className="text-sf-text-secondary">Manage your video production projects</p>
          </div>
        </div>
        <div className="text-center py-12 bg-sf-surface rounded-xl border border-sf-border">
          <div className="w-16 h-16 bg-sf-surface-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-sf-text-secondary" />
          </div>
          <p className="text-sf-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sf-text-primary">Projects</h1>
          <p className="text-sf-text-secondary">Manage your video production projects</p>
        </div>
        <Link href="/dashboard/workflow/ideation">
          <Button className="bg-sf-primary hover:bg-sf-primary/80">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sf-text-secondary w-4 h-4" />
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 border border-sf-border rounded-lg bg-sf-control text-sf-text-primary placeholder-sf-text-secondary focus:ring-2 focus:ring-sf-primary/30 focus:border-sf-primary/60"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
        <Button variant="outline" size="sm">
          <SortAsc className="w-4 h-4 mr-2" />
          Sort
        </Button>
      </div>

      {/* Projects Grid */}
      {!projects || projects.length === 0 ? (
        <div className="text-center py-12 bg-sf-surface rounded-xl border border-sf-border">
          <div className="w-16 h-16 bg-sf-surface-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-sf-text-secondary" />
          </div>
          <h3 className="text-lg font-medium text-sf-text-primary mb-2">No projects yet</h3>
          <p className="text-sf-text-secondary mb-6">Create your first video project to get started</p>
          <Link href="/dashboard/workflow/ideation">
            <Button className="bg-sf-primary hover:bg-sf-primary/80">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-sf-surface rounded-xl border border-sf-border p-6 hover:shadow-sf-glow transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-sf-gradient rounded-lg flex items-center justify-center">
                  <span className="text-sf-background font-bold text-sm">P</span>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              
              <h3 className="text-lg font-semibold text-sf-text-primary mb-2">{project.title || 'Untitled Project'}</h3>
              <p className="text-sf-text-secondary text-sm mb-4">{project.description || 'No description available'}</p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-sf-text-secondary">Current Stage</span>
                  <span className="font-medium text-sf-text-primary">{project.currentStep || 'ideation'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-sf-text-secondary">Progress</span>
                  <span className="font-medium text-sf-text-primary">{project.progress || 0}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-sf-text-secondary">Last Modified</span>
                  <span className="font-medium text-sf-text-primary">
                    {safeFormatDate(project.updatedAt)}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Link href={`/dashboard/workflow/${project.currentStep || 'ideation'}`} className="flex-1">
                  <Button className="w-full bg-sf-primary hover:bg-sf-primary/80">
                    Continue
                  </Button>
                </Link>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
