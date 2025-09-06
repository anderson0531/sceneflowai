'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Plus, Search, Filter, SortAsc, Sparkles, Clapperboard, Video, Film } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function ProjectsPage() {
  const [isClient, setIsClient] = useState(false)
  const { projects, setProjects } = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Hydrate from backend once on mount
  useEffect(() => {
    const hydrate = async () => {
      try {
        setIsLoading(true)
        const userId = typeof window !== 'undefined' ? localStorage.getItem('authUserId') : null
        const res = await fetch(`/api/projects${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, {
          cache: 'no-store',
          headers: userId ? { 'x-user-id': userId } as any : undefined
        })
        if (res.ok) {
          const json = await res.json()
          if (json?.projects && Array.isArray(json.projects)) setProjects(json.projects)
        }
      } catch (e) {
        console.error('Hydrate projects failed:', e)
      } finally {
        setLoaded(true)
        setIsLoading(false)
      }
    }
    if (!loaded) hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const stepLabel = (step?: string) => {
    switch (step) {
      case 'ideation':
        return 'The Blueprint'
      case 'storyboard':
        return 'Storyboard'
      case 'scene-direction':
        return 'Scene Direction'
      case 'video-generation':
        return 'Video Generation'
      default:
        return 'The Blueprint'
    }
  }

  const StepIcon = ({ step }: { step?: string }) => {
    switch (step) {
      case 'ideation':
        return <Sparkles className="w-6 h-6" />
      case 'storyboard':
        return <Clapperboard className="w-6 h-6" />
      case 'scene-direction':
        return <Film className="w-6 h-6" />
      case 'video-generation':
        return <Video className="w-6 h-6" />
      default:
        return <Sparkles className="w-6 h-6" />
    }
  }

  const continueUrl = (project: any) => {
    const step = project.currentStep || 'ideation'
    if (step === 'ideation') {
      return `/dashboard/studio/${project.id || 'new-project'}`
    }
    return `/dashboard/workflow/${step}`
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
        <Link href="/dashboard/studio/new-project/">
          <Button className="bg-sf-primary hover:bg-sf-primary/80">
            <Plus className="w-4 h-4 mr-2" />
            Start Project
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
      {(!projects || projects.length === 0) ? (
        <div className="text-center py-12 bg-sf-surface rounded-xl border border-sf-border">
          <div className="w-16 h-16 bg-sf-surface-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-sf-text-secondary" />
          </div>
          <h3 className="text-lg font-medium text-sf-text-primary mb-2">{isLoading ? 'Loading projects…' : 'No projects yet'}</h3>
          <p className="text-sf-text-secondary mb-6">Click Start Project to begin a new blueprint.</p>
          <Link href="/dashboard/studio/new-project/">
            <Button className="bg-sf-primary hover:bg-sf-primary/80">
              <Plus className="w-4 h-4 mr-2" />
              Start Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-sf-surface rounded-xl border border-sf-border p-6 hover:shadow-sf-glow transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-sf-gradient rounded-lg flex items-center justify-center text-sf-background">
                  <StepIcon step={project.currentStep} />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-sf-text-primary mb-2">{project.title || 'Untitled Project'}</h3>
              <p className="text-sf-text-secondary text-sm mb-4">{project.description || 'No description available'}</p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-sf-text-secondary">Current Workflow Step</span>
                  <span className="font-medium text-sf-text-primary">{stepLabel(project.currentStep)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-sf-text-secondary">Progress</span>
                  <span className="font-medium text-sf-text-primary">{project.currentStep === 'ideation' ? 100 : (project.progress || 0)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-sf-text-secondary">Last Modified</span>
                  <span className="font-medium text-sf-text-primary">
                    {safeFormatDate(project.updatedAt)}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Link href={continueUrl(project)} className="flex-1">
                  <Button className="w-full bg-sf-primary hover:bg-sf-primary/80">
                    Continue
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
