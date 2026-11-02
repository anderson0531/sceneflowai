'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ProjectCard } from '../components/ProjectCard'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import {
  Plus,
  Search,
  Grid3x3,
  List,
  FolderOpen,
  Star,
  FileText,
  Film,
  Sparkles,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog'
import {
  ScriptImportDialog,
  type ScriptImportPayload,
} from '@/components/blueprint/ScriptImportDialog'
import {
  ProductPageShell,
  ProductPageHeader,
  ProductEmptyState,
} from '@/components/product'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'
import { normalizeWorkflowStep } from '@/constants/workflowSteps'
import { useSession } from 'next-auth/react'
import { useEnhancedStore } from '@/store/enhancedStore'
import {
  DEMO_PROJECT_ID,
  getUiSandboxProjectSummary,
  isDemoProjectId,
} from '@/lib/demo/uiSandboxProject'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

function getCanonicalProjectProgress(p: any): number {
  if (typeof p.progress === 'number' && p.progress > 0) {
    return Math.min(100, Math.round(p.progress))
  }
  if (p.status === 'completed') return 100
  return normalizeWorkflowStep(p.currentStep) === 'blueprint' ? 20 : 50
}

function isProjectActiveStatus(status?: string): boolean {
  return status === 'in-progress' || status === 'in_progress' || status === 'active'
}

function isProjectCompleted(p: any): boolean {
  return (
    p.status === 'completed' ||
    (typeof p.progress === 'number' && p.progress >= 100)
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStage, setFilterStage] = useState<'all' | 'blueprint' | 'production'>('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(
    null
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [ownershipSynced, setOwnershipSynced] = useState(false)
  const [showScriptImportDialog, setShowScriptImportDialog] = useState(false)

  const router = useRouter()
  const { data: session, status: authStatus } = useSession()

  // Import a full screenplay: create a production project and jump to Vision.
  const handleScriptImport = useCallback(
    async (result: ScriptImportPayload) => {
      try {
        if (authStatus !== 'authenticated' || !session?.user?.id) {
          toast.error('Sign in to import a script')
          return
        }

        toast.info('Importing script...')

        const res = await fetch('/api/projects/from-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parsedScript: result.parsedScript,
            importCompletenessScore: result.importCompletenessScore,
            importGapsResolved: result.importGapsResolved,
          }),
        })

        const data = await res.json()

        if (data.success && data.project) {
          toast.success(
            `Script imported! ${data.project.metadata?.sceneCount || 0} scenes, ${data.project.metadata?.characterCount || 0} characters`
          )
          router.push(`/dashboard/workflow/vision/${data.project.id}`)
        } else {
          toast.error(data.error || 'Failed to import script')
        }
      } catch (e: unknown) {
        console.error('Script import error:', e)
        const message = e instanceof Error ? e.message : 'Unknown error'
        toast.error('Failed to import script: ' + message)
      }
    },
    [authStatus, session?.user?.id, router]
  )

  // Selected project for dashboard display
  const selectedProjectId = useEnhancedStore((s: any) => s.selectedProjectId)
  const setSelectedProjectId = useEnhancedStore((s: any) => s.setSelectedProjectId)

  // Get user ID from session, with fallback sync for localStorage projects
  const getUserId = useCallback(() => {
    if (session?.user?.email) {
      return session.user.email
    }
    if (typeof window !== 'undefined') {
      let userId = localStorage.getItem('authUserId')
      if (!userId) {
        userId = crypto.randomUUID()
        localStorage.setItem('authUserId', userId)
      }
      return userId
    }
    return 'anonymous'
  }, [session?.user?.email])

  // Sync project ownership from localStorage UUID to session user ID
  const syncProjectOwnership = useCallback(async () => {
    if (!session?.user?.id || ownershipSynced) return

    const localStorageUserId =
      typeof window !== 'undefined' ? localStorage.getItem('authUserId') : null

    if (!localStorageUserId || localStorageUserId === session.user.id) {
      setOwnershipSynced(true)
      return
    }

    try {
      const res = await fetch('/api/projects/sync-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldUserId: localStorageUserId,
          newUserId: session.user.id,
        }),
      })

      if (res.ok) {
        await res.json()
        localStorage.removeItem('authUserId')
      }
    } catch {
      // Silently fail - not critical
    }
    setOwnershipSynced(true)
  }, [session?.user?.id, ownershipSynced])

  // Normalize API project list: hide UI Sandbox demo card when real projects exist
  const applyLoadedProjects = useCallback(
    (rawProjects: any[], apiTotal?: number) => {
      const realProjects = rawProjects.filter((p) => !isDemoProjectId(p.id))
      const hasRealProjects = realProjects.length > 0
      const effectiveList = hasRealProjects ? realProjects : rawProjects

      setProjects(effectiveList)
      setTotalCount(
        hasRealProjects
          ? Math.max(realProjects.length, (apiTotal || rawProjects.length) - (rawProjects.length - realProjects.length))
          : effectiveList.length
      )

      if (hasRealProjects) {
        const selectedIsReal = realProjects.some((p) => p.id === selectedProjectId)
        if (!selectedProjectId || !selectedIsReal || isDemoProjectId(selectedProjectId)) {
          const sortedReal = [...realProjects].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          setSelectedProjectId(sortedReal[0].id)
        }
      } else if (effectiveList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(effectiveList[0].id)
      }
    },
    [selectedProjectId, setSelectedProjectId]
  )

  const loadProjects = useCallback(async () => {
    try {
      const userId = getUserId()
      const apiUrl = `/api/projects?userId=${encodeURIComponent(userId)}&pageSize=50`
      const res = await fetch(apiUrl)
      const data = await res.json()

      if (data.success && Array.isArray(data.projects) && data.projects.length > 0) {
        applyLoadedProjects(data.projects, data.total)
      } else {
        const fallbackList = [getUiSandboxProjectSummary()]
        setProjects(fallbackList)
        setTotalCount(1)
        if (!selectedProjectId) {
          setSelectedProjectId(DEMO_PROJECT_ID)
        }
      }
    } catch (error) {
      console.error('Failed to load projects, falling back to UI Sandbox project:', error)
      const fallbackList = [getUiSandboxProjectSummary()]
      setProjects(fallbackList)
      setTotalCount(1)
      if (!selectedProjectId) {
        setSelectedProjectId(DEMO_PROJECT_ID)
      }
    } finally {
      setLoading(false)
    }
  }, [getUserId, applyLoadedProjects, selectedProjectId, setSelectedProjectId])

  // Sync ownership and fetch projects when auth is ready
  useEffect(() => {
    const initProjects = async () => {
      if (authStatus === 'loading') return

      if (authStatus === 'authenticated' && session?.user?.id) {
        await syncProjectOwnership()
      }

      loadProjects()
    }

    initProjects()
  }, [authStatus, session?.user?.id, syncProjectOwnership, loadProjects])

  // Listen for project updates (e.g., thumbnail generation, budget updates)
  useEffect(() => {
    const handleProjectUpdate = () => {
      loadProjects()
    }

    window.addEventListener('project-updated', handleProjectUpdate)
    return () => window.removeEventListener('project-updated', handleProjectUpdate)
  }, [loadProjects])

  // Handle selecting a project as the current project for dashboard
  const handleSelectAsCurrent = (projectId: string) => {
    setSelectedProjectId(projectId)
    const project = projects.find((p) => p.id === projectId)
    toast.success(`"${project?.title || 'Project'}" pinned to Dashboard`)
  }

  // Handle changing project status
  const handleStatusChange = async (projectId: string, status: string) => {
    if (isDemoProjectId(projectId)) return
    try {
      const res = await fetch(`/api/projects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          userId: getUserId(),
          status: status,
        }),
      })

      if (res.ok) {
        loadProjects()
        toast.success(`Project status updated to ${status === 'in-progress' ? 'Active' : status}`)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update project status')
    }
  }

  const handleDuplicate = async (projectId: string) => {
    if (isDemoProjectId(projectId)) return
    const project = projects.find((p) => p.id === projectId)
    if (!project) return

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: getUserId(),
          title: `${project.title} (Copy)`,
          description: project.description,
          metadata: project.metadata,
        }),
      })

      if (res.ok) {
        loadProjects()
        toast.success('Project duplicated!')
      }
    } catch (error) {
      console.error('Failed to duplicate:', error)
      toast.error('Failed to duplicate project')
    }
  }

  const handleArchive = async (projectId: string) => {
    if (isDemoProjectId(projectId)) return
    try {
      const res = await fetch(`/api/projects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          status: 'archived',
        }),
      })

      if (res.ok) {
        loadProjects()
        toast.success('Project archived')
      }
    } catch (error) {
      console.error('Failed to archive:', error)
      toast.error('Failed to archive project')
    }
  }

  const handleDelete = (projectId: string, projectTitle: string) => {
    if (isDemoProjectId(projectId)) return
    setProjectToDelete({ id: projectId, title: projectTitle })
    setDeleteDialogOpen(true)
  }

  const handlePromoteToSeries = async (projectId: string) => {
    if (isDemoProjectId(projectId)) return
    if (authStatus !== 'authenticated' || !session?.user?.id) {
      toast.error('Sign in to promote a project')
      return
    }
    try {
      toast.info('Creating series from project…')
      const res = await fetch(`/api/projects/${projectId}/promote-to-series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Promote failed')
      toast.success('Series created from project')
      router.push(`/dashboard/series/${data.seriesId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to promote project')
    }
  }

  const confirmDelete = async () => {
    if (!projectToDelete) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok && data.success) {
        await loadProjects()
        toast.success('Project deleted')
      } else {
        throw new Error(data.error || 'Delete failed')
      }
    } catch (error: any) {
      console.error('[confirmDelete] Error:', error)
      toast.error(error.message || 'Failed to delete project')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    }
  }

  const cancelDelete = () => {
    setDeleteDialogOpen(false)
    setProjectToDelete(null)
  }

  // Stage & Status summary counts (excluding archived from stage counts)
  const stats = useMemo(() => {
    const nonArchived = projects.filter((p) => p.status !== 'archived')
    const blueprintCount = nonArchived.filter(
      (p) => normalizeWorkflowStep(p.currentStep) === 'blueprint'
    ).length
    const productionCount = nonArchived.filter(
      (p) => normalizeWorkflowStep(p.currentStep) !== 'blueprint'
    ).length
    const activeCount = nonArchived.filter(
      (p) => isProjectActiveStatus(p.status) || p.status === 'draft'
    ).length
    const completedCount = nonArchived.filter((p) => isProjectCompleted(p)).length
    const archivedCount = projects.filter((p) => p.status === 'archived').length

    return {
      totalNonArchived: nonArchived.length,
      blueprintCount,
      productionCount,
      activeCount,
      completedCount,
      archivedCount,
    }
  }, [projects])

  // Filter and sort logic
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return (
            p.title?.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query) ||
            p.genre?.toLowerCase().includes(query)
          )
        }
        return true
      })
      .filter((p) => {
        // Status filter: hide archived unless 'archived' filter is explicitly selected
        if (filterStatus === 'archived') {
          return p.status === 'archived'
        }
        if (p.status === 'archived') {
          return false
        }
        if (filterStatus === 'all') return true
        if (filterStatus === 'in-progress' || filterStatus === 'active') {
          return isProjectActiveStatus(p.status)
        }
        if (filterStatus === 'completed') {
          return isProjectCompleted(p)
        }
        return p.status === filterStatus
      })
      .filter((p) => {
        // Stage filter (Blueprint Room vs Production Stage)
        if (filterStage === 'all') return true
        const step = normalizeWorkflowStep(p.currentStep)
        if (filterStage === 'blueprint') return step === 'blueprint'
        if (filterStage === 'production') return step !== 'blueprint'
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        }
        if (sortBy === 'alphabetical') {
          return (a.title || '').localeCompare(b.title || '')
        }
        if (sortBy === 'created') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        if (sortBy === 'progress') {
          return getCanonicalProjectProgress(b) - getCanonicalProjectProgress(a)
        }
        return 0
      })
  }, [projects, searchQuery, filterStatus, filterStage, sortBy])

  const pinnedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  )

  const hasActiveFilters =
    Boolean(searchQuery) || filterStatus !== 'all' || filterStage !== 'all'

  const resetFilters = () => {
    setSearchQuery('')
    setFilterStatus('all')
    setFilterStage('all')
  }

  return (
    <ProductPageShell>
      <ProductPageHeader
        icon={<Film className="h-6 w-6" />}
        title="Projects"
        subtitle={`Standalone films and series episodes across ${STUDIO_DISPLAY_NAMES.blueprint} and ${STUDIO_DISPLAY_NAMES.production}.`}
        accent="product"
        secondaryActions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/dashboard/workflow/vision/${DEMO_PROJECT_ID}`}>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Sparkles className="w-4 h-4" />
                UI Sandbox Demo
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setShowScriptImportDialog(true)}
              className="flex items-center gap-2 border-gray-700 bg-gray-900/60 text-gray-200 hover:bg-gray-800"
            >
              <FileText className="w-4 h-4" />
              Import Script
            </Button>
          </div>
        }
        primaryAction={
          <Link href="/dashboard/studio/new-project">
            <Button variant="primary" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </Link>
        }
      />

      {/* Studio Stage Filter Bar + Pinned Project Indicator */}
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-800 bg-gray-900/80 p-1">
          <button
            type="button"
            onClick={() => setFilterStage('all')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filterStage === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All Stages
            <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
              {stats.totalNonArchived}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStage('blueprint')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filterStage === 'blueprint'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {STUDIO_DISPLAY_NAMES.blueprint}
            <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
              {stats.blueprintCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStage('production')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filterStage === 'production'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            {STUDIO_DISPLAY_NAMES.production}
            <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
              {stats.productionCount}
            </span>
          </button>
        </div>

        {/* Pinned Project Indicator */}
        {pinnedProject && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/25 text-xs">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
            <span className="text-yellow-200/90 truncate max-w-[280px]">
              Pinned to Dashboard: <strong className="text-yellow-100">{pinnedProject.title}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Search, Status, Sort & View Mode Controls */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-0 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title, description, or genre..."
            className="pl-10 w-full bg-gray-900 border-gray-800 text-white focus:ring-2 focus:ring-cyan-500/40 transition-all"
          />
        </div>

        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[170px] bg-gray-900 border-gray-800 text-gray-200 hover:bg-gray-800/80 transition-all">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Active & Drafts</SelectItem>
            <SelectItem value="in-progress">Active ({stats.activeCount})</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="completed">Completed ({stats.completedCount})</SelectItem>
            <SelectItem value="archived">
              Archived{stats.archivedCount > 0 ? ` (${stats.archivedCount})` : ''}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[180px] bg-gray-900 border-gray-800 text-gray-200 hover:bg-gray-800/80 transition-all">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently Updated</SelectItem>
            <SelectItem value="progress">Progress %</SelectItem>
            <SelectItem value="alphabetical">Title (A–Z)</SelectItem>
            <SelectItem value="created">Date Created</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-end gap-2">
          <div className="inline-flex items-center border border-gray-800 bg-gray-900 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="List view"
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gray-900/80 border border-gray-800 rounded-xl h-80 animate-pulse"
            />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <ProductEmptyState
          icon={
            hasActiveFilters ? (
              <Search className="h-8 w-8 text-gray-400" />
            ) : (
              <FolderOpen className="h-8 w-8 text-gray-400" />
            )
          }
          title={hasActiveFilters ? 'No matching projects' : 'No projects yet'}
          description={
            hasActiveFilters
              ? searchQuery
                ? `No projects match "${searchQuery}" under the selected filters.`
                : 'No projects match your current stage or status filters.'
              : `Start a new project in ${STUDIO_DISPLAY_NAMES.blueprint} or explore the interactive UI Sandbox Demo.`
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Create First Project'}
          onAction={
            hasActiveFilters
              ? resetFilters
              : () => router.push('/dashboard/studio/new-project')
          }
          secondaryAction={
            !hasActiveFilters ? (
              <Link href={`/dashboard/workflow/vision/${DEMO_PROJECT_ID}`}>
                <Button
                  variant="outline"
                  className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Open UI Sandbox Project
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-3'
          }
        >
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              viewMode={viewMode}
              isSelected={project.id === selectedProjectId}
              onSelectAsCurrent={handleSelectAsCurrent}
              onStatusChange={handleStatusChange}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onPromoteToSeries={handlePromoteToSeries}
            />
          ))}
        </div>
      )}

      {/* Footer Summary */}
      {projects.length > 0 && !loading && (
        <div className="mt-8 pt-6 border-t border-gray-800/80">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Showing <strong className="text-gray-200">{filteredProjects.length}</strong> of{' '}
                <strong className="text-gray-200">{totalCount}</strong> projects
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                >
                  Reset filters
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span>
                <strong className="text-blue-300">{stats.blueprintCount}</strong> in{' '}
                {STUDIO_DISPLAY_NAMES.blueprint}
              </span>
              <span>•</span>
              <span>
                <strong className="text-purple-300">{stats.productionCount}</strong> in{' '}
                {STUDIO_DISPLAY_NAMES.production}
              </span>
              <span>•</span>
              <span>
                <strong className="text-emerald-300">{stats.completedCount}</strong> completed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        projectTitle={projectToDelete?.title || ''}
        isDeleting={isDeleting}
      />

      <ScriptImportDialog
        open={showScriptImportDialog}
        onOpenChange={setShowScriptImportDialog}
        onImport={handleScriptImport}
      />
    </ProductPageShell>
  )
}

