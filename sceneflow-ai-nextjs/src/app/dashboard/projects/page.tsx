'use client'

import { useState, useEffect } from 'react'
import { ContextBar } from '@/components/layout/ContextBar'
import { ProjectCard } from '../components/ProjectCard'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Plus, Search, Grid3x3, List, FolderOpen } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function EmptyState({ hasProjects, searchQuery, onReset }: { hasProjects: boolean; searchQuery: string; onReset: () => void }) {
  if (!hasProjects) {
    // No projects at all
    return (
      <div className="text-center py-16">
        <FolderOpen className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No projects yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create your first project to get started
        </p>
        <Link href="/dashboard/studio/new-project">
          <Button className="bg-sf-primary text-white hover:bg-sf-accent">
            <Plus className="w-4 h-4 mr-2" />
            Create First Project
          </Button>
        </Link>
      </div>
    )
  }

  // No search results
  return (
    <div className="text-center py-16">
      <Search className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No projects found
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {searchQuery 
          ? `No projects match "${searchQuery}"`
          : 'No projects match your filters'
        }
      </p>
      <Button onClick={onReset} variant="outline">
        Clear Filters
      </Button>
    </div>
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const getUserId = () => {
    if (typeof window !== 'undefined') {
      let userId = localStorage.getItem('authUserId')
      if (!userId) {
        userId = crypto.randomUUID()
        localStorage.setItem('authUserId', userId)
      }
      return userId
    }
    return 'anonymous'
  }

  // Fetch projects
  useEffect(() => {
    loadProjects()
  }, [])

  // Listen for project updates (e.g., thumbnail generation)
  useEffect(() => {
    const handleProjectUpdate = () => {
      console.log('[Projects Page] Project updated, reloading projects...')
      loadProjects()
    }

    window.addEventListener('project-updated', handleProjectUpdate)
    return () => window.removeEventListener('project-updated', handleProjectUpdate)
  }, [])

  const loadProjects = async () => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [loadProjects] Starting...`)
    
    try {
      const userId = getUserId()
      console.log(`[${timestamp}] [loadProjects] Using userId:`, userId)
      
      const apiUrl = `/api/projects?userId=${userId}`
      console.log(`[${timestamp}] [loadProjects] Fetching from:`, apiUrl)
      
      const res = await fetch(apiUrl)
      console.log(`[${timestamp}] [loadProjects] Response status:`, res.status, res.statusText)
      
      const data = await res.json()
      console.log(`[${timestamp}] [loadProjects] Response data:`, data)
      
      if (data.success) {
        const projectCount = data.projects?.length || 0
        const total = data.total || 0
        setProjects(data.projects || [])
        setTotalCount(total)
        console.log(`[${timestamp}] [loadProjects] State updated with ${projectCount} projects on page, ${total} total projects`)
      } else {
        console.log(`[${timestamp}] [loadProjects] Response not successful:`, data.error)
      }
    } catch (error) {
      console.error(`[${timestamp}] [loadProjects] Failed to load projects:`, error)
    } finally {
      setLoading(false)
      console.log(`[${timestamp}] [loadProjects] Completed`)
    }
  }

  const handleDuplicate = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: getUserId(),
          title: `${project.title} (Copy)`,
          description: project.description,
          metadata: project.metadata
        })
      })
      
      if (res.ok) {
        loadProjects()
        try { const { toast } = require('sonner'); toast.success('Project duplicated!') } catch {}
      }
    } catch (error) {
      console.error('Failed to duplicate:', error)
      try { const { toast } = require('sonner'); toast.error('Failed to duplicate project') } catch {}
    }
  }

  const handleArchive = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          status: 'archived'
        })
      })
      
      if (res.ok) {
        loadProjects()
        try { const { toast } = require('sonner'); toast.success('Project archived') } catch {}
      }
    } catch (error) {
      console.error('Failed to archive:', error)
      try { const { toast } = require('sonner'); toast.error('Failed to archive project') } catch {}
    }
  }

  const handleDelete = async (projectId: string) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [handleDelete] Confirm dialog shown for project:`, projectId)
    
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      console.log(`[${timestamp}] [handleDelete] User cancelled deletion`)
      return
    }
    
    console.log(`[${timestamp}] [handleDelete] User confirmed deletion`)
    
    try {
      console.log(`[${timestamp}] [handleDelete] Sending DELETE request to /api/projects/${projectId}`)
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })
      
      console.log(`[${timestamp}] [handleDelete] Response status:`, res.status, res.statusText)
      
      const data = await res.json()
      console.log(`[${timestamp}] [handleDelete] Response data:`, data)
      
      if (res.ok && data.success) {
        console.log(`[${timestamp}] [handleDelete] Delete successful, calling loadProjects()`)
        await loadProjects()
        console.log(`[${timestamp}] [handleDelete] loadProjects() completed`)
        try { const { toast } = require('sonner'); toast.success('Project deleted') } catch {}
      } else {
        throw new Error(data.error || 'Delete failed')
      }
    } catch (error: any) {
      console.error(`[${timestamp}] [handleDelete] Error:`, error)
      try { const { toast } = require('sonner'); toast.error(error.message || 'Failed to delete project') } catch {}
    }
  }

  // Filter and sort logic
  const filteredProjects = projects
    .filter(p => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return p.title.toLowerCase().includes(query) || 
               p.description?.toLowerCase().includes(query)
      }
      return true
    })
    .filter(p => {
      // Status filter
      if (filterStatus === 'all') return true
      return p.status === filterStatus
    })
    .sort((a, b) => {
      // Sorting
      if (sortBy === 'recent') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title)
      }
      if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (sortBy === 'progress') {
        return (b.progress || 0) - (a.progress || 0)
      }
      return 0
    })

  // Stats
  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active' || p.status === 'draft').length,
    completed: projects.filter(p => p.completedSteps?.length === 6).length
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-sf-background">
      <ContextBar
        title="Projects"
        titleVariant="page"
        emphasis
        primaryActions={
          <Link href="/dashboard/studio/new-project">
            <Button className="bg-sf-primary text-white hover:bg-sf-accent flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </Link>
        }
        secondaryActions={
          <>
            {/* View toggle */}
            <div className="flex gap-1 border border-gray-300 dark:border-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-sf-primary text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-sf-primary text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </>
        }
      />

      <div className="px-4 lg:px-8 py-6">
        {/* Search & Filters Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Updated</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
              <SelectItem value="created">Date Created</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Projects Grid/List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-sf-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState 
            hasProjects={projects.length > 0}
            searchQuery={searchQuery}
            onReset={() => {
              setSearchQuery('')
              setFilterStatus('all')
            }}
          />
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }>
            {filteredProjects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {projects.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Page: {projects.length} projects</span>
              <span>•</span>
              <span className="font-semibold">Total: {totalCount} projects</span>
              <span>•</span>
              <span>{stats.active} active</span>
              <span>•</span>
              <span>{stats.completed} completed</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
