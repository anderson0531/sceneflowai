'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
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
  Film,
  Sparkles,
  Layers,
  Briefcase,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  ChevronLeft,
  ChevronRight,
  Archive,
  RotateCcw,
  CheckSquare,
  Square,
  Globe,
  UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog'
import {
  ProductPageShell,
  ProductPageHeader,
  ProductEmptyState,
} from '@/components/product'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'
import { normalizeWorkflowStep } from '@/constants/workflowSteps'
import { useSession } from 'next-auth/react'
import { useEnhancedStore } from '@/store/enhancedStore'
import { isDemoProjectId } from '@/lib/demo/uiSandboxProject'
import type { ProjectFacetCounts } from '@/lib/projects/projectListQuery'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

interface TeamMemberOption {
  id: string
  memberUserId: string | null
  memberEmail: string
  role: 'admin' | 'project_manager'
  status: 'invited' | 'active' | 'revoked'
}

const EMPTY_FACETS: ProjectFacetCounts = {
  totalNonArchived: 0,
  blueprintCount: 0,
  productionCount: 0,
  activeCount: 0,
  completedCount: 0,
  archivedCount: 0,
  clientTotal: 0,
  actionRequiredCount: 0,
  waitingOnClientCount: 0,
  clientApprovedCount: 0,
  unassignedCount: 0,
}

const LOCALE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Locales' },
  { value: 'en', label: 'English (EN)' },
  { value: 'es', label: 'Español (ES)' },
  { value: 'pt', label: 'Português (PT)' },
  { value: 'fr', label: 'Français (FR)' },
  { value: 'de', label: 'Deutsch (DE)' },
  { value: 'hi', label: 'हिन्दी (HI)' },
  { value: 'zh-CN', label: '简体中文 (ZH)' },
  { value: 'ar', label: 'العربية (AR)' },
  { value: 'th', label: 'ไทย (TH)' },
] as const

const VERTICAL_FILTER_OPTIONS = [
  { value: 'all', label: 'All Verticals' },
  { value: 'video_memoir', label: 'Video Memoir / Legacy' },
  { value: 'real_estate_tour', label: 'Real Estate Tour' },
  { value: 'education_module', label: 'Training / Education' },
  { value: 'brand_story', label: 'Brand / SMB Story' },
  { value: 'custom_production', label: 'Custom Production' },
] as const

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
  const tProj = useTranslations('dashboard.projects')

  // Server-paginated project list state
  const [projects, setProjects] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [facets, setFacets] = useState<ProjectFacetCounts>(EMPTY_FACETS)
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  // Server-side search, filter & pagination controls
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filterStage, setFilterStage] = useState<'all' | 'blueprint' | 'production'>('all')
  const [clientFilter, setClientFilter] = useState<
    'all' | 'client_only' | 'action_required' | 'waiting_on_client' | 'client_approved'
  >('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [assignedPmFilter, setAssignedPmFilter] = useState('all')
  const [localeFilter, setLocaleFilter] = useState('all')
  const [verticalFilter, setVerticalFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Team members for PM filter + inline & bulk PM assignment
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([])

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(
    null
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [ownershipSynced, setOwnershipSynced] = useState(false)

  const router = useRouter()
  const { data: session, status: authStatus } = useSession()
  const abortRef = useRef<AbortController | null>(null)

  // Selected project for dashboard display
  const selectedProjectId = useEnhancedStore((s: any) => s.selectedProjectId)
  const setSelectedProjectId = useEnhancedStore((s: any) => s.setSelectedProjectId)

  // Debounce search input (250ms) and reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim())
      setPage(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Reset page to 1 when any filter or sort changes
  const updateFilterAndResetPage = <T,>(setter: (v: T) => void) => (val: T) => {
    setter(val)
    setPage(1)
    setSelectedIds(new Set())
  }

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

  // Load workspace team members (for multi-PM filter + inline/bulk assignment)
  useEffect(() => {
    if (authStatus !== 'authenticated') return
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/workspace/members')
        if (!res.ok) return
        const data = await res.json()
        if (!active || !data.success || !Array.isArray(data.members) || data.demoFallback) return
        setTeamMembers(
          data.members.filter(
            (m: TeamMemberOption) => m.status === 'active' && Boolean(m.memberUserId)
          )
        )
      } catch {
        // Optional feature for multi-PM workspaces
      }
    })()
    return () => {
      active = false
    }
  }, [authStatus])

  const loadProjects = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsFetching(true)
    try {
      const userId = getUserId()
      const qs = new URLSearchParams({
        userId,
        summary: '1',
        includeFacets: '1',
        page: String(page),
        pageSize: String(pageSize),
        status: filterStatus,
        stage: filterStage,
        clientAction: clientFilter,
        assignedPm: assignedPmFilter,
        locale: localeFilter,
        vertical: verticalFilter,
        sort: sortBy,
      })
      if (debouncedQuery) {
        qs.set('q', debouncedQuery)
      }

      const res = await fetch(`/api/projects?${qs.toString()}`, {
        signal: controller.signal,
      })
      const data = await res.json()

      if (controller.signal.aborted) return

      if (data.success && Array.isArray(data.projects)) {
        const rawProjects = data.projects
        const realProjects = rawProjects.filter((p: any) => !isDemoProjectId(p.id))
        const effectiveList = realProjects.length > 0 ? realProjects : rawProjects

        setProjects(effectiveList)
        setTotalCount(typeof data.total === 'number' ? data.total : effectiveList.length)
        setTotalPages(
          typeof data.totalPages === 'number'
            ? data.totalPages
            : Math.max(1, Math.ceil((data.total || effectiveList.length) / pageSize))
        )

        if (data.facets) {
          setFacets(data.facets as ProjectFacetCounts)
        } else {
          // Fallback local calculation when facets omitted (e.g., sandbox fallback)
          const nonArchived = effectiveList.filter((p: any) => p.status !== 'archived')
          setFacets({
            totalNonArchived: nonArchived.length,
            blueprintCount: nonArchived.filter(
              (p: any) => normalizeWorkflowStep(p.currentStep) === 'blueprint'
            ).length,
            productionCount: nonArchived.filter(
              (p: any) => normalizeWorkflowStep(p.currentStep) !== 'blueprint'
            ).length,
            activeCount: nonArchived.filter(
              (p: any) => isProjectActiveStatus(p.status) || p.status === 'draft'
            ).length,
            completedCount: nonArchived.filter((p: any) => isProjectCompleted(p)).length,
            archivedCount: effectiveList.filter((p: any) => p.status === 'archived').length,
            clientTotal: nonArchived.filter((p: any) =>
              Boolean(p.metadata?.clientOrder?.isClientProject)
            ).length,
            actionRequiredCount: nonArchived.filter(
              (p: any) => p.metadata?.clientOrder?.actionState === 'action_required'
            ).length,
            waitingOnClientCount: nonArchived.filter(
              (p: any) => p.metadata?.clientOrder?.actionState === 'waiting_on_client'
            ).length,
            clientApprovedCount: nonArchived.filter(
              (p: any) => p.metadata?.clientOrder?.actionState === 'client_approved'
            ).length,
            unassignedCount: nonArchived.length,
          })
        }

        if (realProjects.length > 0 && page === 1 && !debouncedQuery && filterStatus === 'all') {
          if (!selectedProjectId || isDemoProjectId(selectedProjectId)) {
            setSelectedProjectId(realProjects[0].id)
          }
        }
      } else {
        setProjects([])
        setTotalCount(0)
        setTotalPages(1)
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return
      console.error('Failed to load projects:', error)
      setProjects([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
        setIsFetching(false)
      }
    }
  }, [
    getUserId,
    page,
    pageSize,
    filterStatus,
    filterStage,
    clientFilter,
    assignedPmFilter,
    localeFilter,
    verticalFilter,
    sortBy,
    debouncedQuery,
    selectedProjectId,
    setSelectedProjectId,
  ])

  // Sync ownership and fetch projects when auth or query params change
  useEffect(() => {
    if (authStatus === 'loading') return
    let cancelled = false
    ;(async () => {
      if (authStatus === 'authenticated' && session?.user?.id && !ownershipSynced) {
        await syncProjectOwnership()
      }
      if (!cancelled) {
        void loadProjects()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authStatus, session?.user?.id, ownershipSynced, syncProjectOwnership, loadProjects])

  // Listen for project updates (e.g., thumbnail generation, budget updates)
  useEffect(() => {
    const handleProjectUpdate = () => {
      void loadProjects()
    }
    window.addEventListener('project-updated', handleProjectUpdate)
    return () => window.removeEventListener('project-updated', handleProjectUpdate)
  }, [loadProjects])

  // Bulk operation runner
  const runBulkAction = async (
    action: 'archive' | 'unarchive' | 'status' | 'assign_pm',
    projectIds: string[],
    extra?: { status?: string; memberUserId?: string | null }
  ) => {
    const cleanIds = projectIds.filter((id) => !isDemoProjectId(id))
    if (cleanIds.length === 0) return

    setBulkBusy(true)
    try {
      const res = await fetch('/api/projects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          projectIds: cleanIds,
          ...extra,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bulk operation failed')
      }

      if (action === 'archive') {
        toast.success(`Archived ${data.updatedCount} project${data.updatedCount === 1 ? '' : 's'}`)
      } else if (action === 'unarchive') {
        toast.success(`Restored ${data.updatedCount} project${data.updatedCount === 1 ? '' : 's'}`)
      } else if (action === 'status') {
        toast.success(
          `Updated ${data.updatedCount} project${data.updatedCount === 1 ? '' : 's'} to ${extra?.status}`
        )
      } else if (action === 'assign_pm') {
        toast.success(
          extra?.memberUserId
            ? `Assigned PM to ${data.updatedCount} project${data.updatedCount === 1 ? '' : 's'}`
            : `Cleared PM assignment on ${data.updatedCount} project${data.updatedCount === 1 ? '' : 's'}`
        )
      }
      setSelectedIds(new Set())
      await loadProjects()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk action failed')
    } finally {
      setBulkBusy(false)
    }
  }

  // Handle selecting a project as the current project for dashboard
  const handleSelectAsCurrent = (projectId: string) => {
    setSelectedProjectId(projectId)
    const project = projects.find((p) => p.id === projectId)
    toast.success(`"${project?.title || 'Project'}" pinned to Dashboard`)
  }

  const handleStatusChange = async (projectId: string, status: string) => {
    if (isDemoProjectId(projectId)) return
    try {
      const res = await fetch(`/api/projects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          userId: getUserId(),
          status,
        }),
      })

      if (res.ok) {
        void loadProjects()
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
        void loadProjects()
        toast.success('Project duplicated!')
      }
    } catch (error) {
      console.error('Failed to duplicate:', error)
      toast.error('Failed to duplicate project')
    }
  }

  const handleArchive = async (projectId: string) => {
    if (isDemoProjectId(projectId)) return
    await runBulkAction('archive', [projectId])
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
        toast.success(tProj('deleted'))
      } else {
        throw new Error(data.error || tProj('deleteFailed'))
      }
    } catch (error: any) {
      console.error('[confirmDelete] Error:', error)
      toast.error(error.message || tProj('deleteFailed'))
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    }
  }

  const toggleSelectProject = (projectId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const selectableProjectIds = useMemo(
    () => projects.filter((p) => !isDemoProjectId(p.id)).map((p) => p.id as string),
    [projects]
  )

  const allOnPageSelected =
    selectableProjectIds.length > 0 &&
    selectableProjectIds.every((id) => selectedIds.has(id))

  const toggleSelectMode = () => {
    if (selectionMode || selectedIds.size > 0) {
      setSelectionMode(false)
      setSelectedIds(new Set())
    } else {
      setSelectionMode(true)
    }
  }

  const toggleSelectPage = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectionMode(true)
      setSelectedIds(new Set(selectableProjectIds))
    }
  }

  const pinnedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  )

  const hasActiveFilters =
    Boolean(debouncedQuery) ||
    filterStatus !== 'all' ||
    filterStage !== 'all' ||
    clientFilter !== 'all' ||
    assignedPmFilter !== 'all' ||
    localeFilter !== 'all' ||
    verticalFilter !== 'all'

  const resetFilters = () => {
    setSearchInput('')
    setDebouncedQuery('')
    setFilterStatus('all')
    setFilterStage('all')
    setClientFilter('all')
    setAssignedPmFilter('all')
    setLocaleFilter('all')
    setVerticalFilter('all')
    setPage(1)
    setSelectedIds(new Set())
  }

  const showAgencyFilters =
    teamMembers.length > 0 ||
    facets.clientTotal > 0 ||
    assignedPmFilter !== 'all' ||
    localeFilter !== 'all' ||
    verticalFilter !== 'all'

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(totalCount, page * pageSize)

  return (
    <ProductPageShell>
      <ProductPageHeader
        icon={<Film className="h-6 w-6" />}
        title={tProj('title')}
        subtitle={`Standalone films, client productions, and series episodes across ${STUDIO_DISPLAY_NAMES.blueprint} and ${STUDIO_DISPLAY_NAMES.production}.`}
        accent="product"
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/settings/producer">
              <Button variant="secondary" className="flex items-center gap-2 border border-gray-700">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                Producer Hub
              </Button>
            </Link>
            <Link href="/dashboard/studio/new-project">
              <Button variant="primary" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {tProj('newProject')}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Producer Client Action Triage Bar */}
      {(facets.clientTotal > 0 || clientFilter !== 'all') && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-800/80 bg-gray-900/60 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
              <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              Client Triage:
            </span>
            <button
              type="button"
              onClick={() => updateFilterAndResetPage(setClientFilter)('all')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                clientFilter === 'all'
                  ? 'bg-gray-800 text-white border border-gray-700'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent'
              }`}
            >
              All Projects
            </button>
            <button
              type="button"
              onClick={() => updateFilterAndResetPage(setClientFilter)('client_only')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                clientFilter === 'client_only'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-cyan-200 border border-transparent'
              }`}
            >
              Client Orders
              <span className="rounded-full bg-cyan-950/80 px-1.5 py-0.5 text-[10px] text-cyan-200">
                {facets.clientTotal}
              </span>
            </button>
            <button
              type="button"
              onClick={() => updateFilterAndResetPage(setClientFilter)('action_required')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                clientFilter === 'action_required'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-gray-400 hover:text-amber-200 border border-transparent'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              Action Required
              <span className="rounded-full bg-amber-950/80 px-1.5 py-0.5 text-[10px] text-amber-200">
                {facets.actionRequiredCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => updateFilterAndResetPage(setClientFilter)('waiting_on_client')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                clientFilter === 'waiting_on_client'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-gray-400 hover:text-sky-200 border border-transparent'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Waiting on Client
              <span className="rounded-full bg-sky-950/80 px-1.5 py-0.5 text-[10px] text-sky-200">
                {facets.waitingOnClientCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => updateFilterAndResetPage(setClientFilter)('client_approved')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                clientFilter === 'client_approved'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-gray-400 hover:text-emerald-200 border border-transparent'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Client Approved
              <span className="rounded-full bg-emerald-950/80 px-1.5 py-0.5 text-[10px] text-emerald-200">
                {facets.clientApprovedCount}
              </span>
            </button>
          </div>
          <Link
            href="/dashboard/settings/producer"
            className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
          >
            Manage Intake & Team →
          </Link>
        </div>
      )}

      {/* Studio Stage Filter Bar + Pinned Project Indicator */}
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-800 bg-gray-900/80 p-1">
          <button
            type="button"
            onClick={() => updateFilterAndResetPage(setFilterStage)('all')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filterStage === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All Stages
            <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
              {facets.totalNonArchived}
            </span>
          </button>
          <button
            type="button"
            onClick={() => updateFilterAndResetPage(setFilterStage)('blueprint')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filterStage === 'blueprint'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {STUDIO_DISPLAY_NAMES.blueprint}
            <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
              {facets.blueprintCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => updateFilterAndResetPage(setFilterStage)('production')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filterStage === 'production'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            {STUDIO_DISPLAY_NAMES.production}
            <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
              {facets.productionCount}
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

      {/* Search, Status, PM/Locale/Vertical, Sort & View Mode Controls */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Server-Side Full-Text Search */}
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search all projects by title, client name, email, order code, or genre..."
              className="pl-10 w-full bg-gray-900 border-gray-800 text-white focus:ring-2 focus:ring-cyan-500/40 transition-all"
            />
          </div>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={updateFilterAndResetPage(setFilterStatus)}>
            <SelectTrigger className="w-full sm:w-[175px] bg-gray-900 border-gray-800 text-gray-200 hover:bg-gray-800/80 transition-all">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Active &amp; Drafts</SelectItem>
              <SelectItem value="active">Active ({facets.activeCount})</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed ({facets.completedCount})</SelectItem>
              <SelectItem value="archived">
                Archived{facets.archivedCount > 0 ? ` (${facets.archivedCount})` : ''}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={updateFilterAndResetPage(setSortBy)}>
            <SelectTrigger className="w-full sm:w-[175px] bg-gray-900 border-gray-800 text-gray-200 hover:bg-gray-800/80 transition-all">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Updated</SelectItem>
              <SelectItem value="progress">Progress %</SelectItem>
              <SelectItem value="alphabetical">Title (A–Z)</SelectItem>
              <SelectItem value="created">Date Created</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle + Select Page */}
          <div className="flex items-center justify-end gap-2">
            {selectableProjectIds.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectMode}
                className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  selectionMode || selectedIds.size > 0
                    ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                    : 'border-gray-800 bg-gray-900 text-gray-400 hover:text-gray-200'
                }`}
                title="Toggle bulk selection checkboxes"
              >
                {selectionMode || selectedIds.size > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-300" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span>Select{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</span>
              </button>
            )}
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

        {/* Multi-PM & White-Label Agency Filter Row */}
        {showAgencyFilters && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-gray-800/70 bg-gray-900/40 px-3 py-2">
            {teamMembers.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <Select
                  value={assignedPmFilter}
                  onValueChange={updateFilterAndResetPage(setAssignedPmFilter)}
                >
                  <SelectTrigger className="h-8 w-[195px] bg-gray-950/70 border-gray-800 text-xs text-gray-200">
                    <SelectValue placeholder="Filter by PM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team PMs</SelectItem>
                    <SelectItem value="unassigned">
                      Unassigned ({facets.unassignedCount})
                    </SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.memberUserId || m.id}>
                        {m.memberEmail}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <Select
                value={localeFilter}
                onValueChange={updateFilterAndResetPage(setLocaleFilter)}
              >
                <SelectTrigger className="h-8 w-[150px] bg-gray-950/70 border-gray-800 text-xs text-gray-200">
                  <SelectValue placeholder="Client Locale" />
                </SelectTrigger>
                <SelectContent>
                  {LOCALE_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select
              value={verticalFilter}
              onValueChange={updateFilterAndResetPage(setVerticalFilter)}
            >
              <SelectTrigger className="h-8 w-[175px] bg-gray-950/70 border-gray-800 text-xs text-gray-200">
                <SelectValue placeholder="Client Vertical" />
              </SelectTrigger>
              <SelectContent>
                {VERTICAL_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Bar (Shown when selection mode is active or 1+ projects selected) */}
      {(selectionMode || selectedIds.size > 0) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/35 bg-cyan-950/25 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-cyan-100">
            <CheckSquare className="w-4 h-4 text-cyan-400" />
            <span>
              <strong>{selectedIds.size}</strong> selected
            </span>
            <button
              type="button"
              onClick={toggleSelectPage}
              className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2 ml-2"
            >
              {allOnPageSelected ? 'Deselect page' : `Select all on page (${selectableProjectIds.length})`}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedIds(new Set())
                setSelectionMode(false)
              }}
              className="text-cyan-300/80 hover:text-cyan-200 underline underline-offset-2 ml-2"
            >
              Done
            </button>
          </div>
          {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {teamMembers.length > 0 && (
              <Select
                disabled={bulkBusy}
                onValueChange={(val) =>
                  void runBulkAction('assign_pm', Array.from(selectedIds), {
                    memberUserId: val === '__unassign__' ? null : val,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[180px] bg-gray-950 border-cyan-500/30 text-xs text-cyan-100">
                  <SelectValue placeholder="Assign PM…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassign__">Unassign PM</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.memberUserId || m.id}>
                      {m.memberEmail}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() =>
                void runBulkAction('status', Array.from(selectedIds), { status: 'completed' })
              }
              className="h-8 text-xs border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Mark Completed
            </Button>
            {filterStatus === 'archived' ? (
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => void runBulkAction('unarchive', Array.from(selectedIds))}
                className="h-8 text-xs border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/20"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Restore
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => void runBulkAction('archive', Array.from(selectedIds))}
                className="h-8 text-xs border-amber-500/40 text-amber-200 hover:bg-amber-500/20"
              >
                <Archive className="w-3.5 h-3.5 mr-1.5" />
                Archive Selected
              </Button>
            )}
          </div>
          )}
        </div>
      )}

      {/* Projects Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-gray-900/80 border border-gray-800 rounded-xl h-80 animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <ProductEmptyState
          icon={
            hasActiveFilters ? (
              <Search className="h-8 w-8 text-gray-400" />
            ) : (
              <FolderOpen className="h-8 w-8 text-gray-400" />
            )
          }
          title={hasActiveFilters ? 'No matching projects' : tProj('empty')}
          description={
            hasActiveFilters
              ? debouncedQuery
                ? `No projects match "${debouncedQuery}" under the selected filters.`
                : 'No projects match your current filters.'
              : tProj('emptyHint')
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Create First Project'}
          onAction={
            hasActiveFilters
              ? resetFilters
              : () => router.push('/dashboard/studio/new-project')
          }
        />
      ) : (
        <div
          className={`${
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-3'
          } ${isFetching ? 'opacity-70 transition-opacity' : ''}`}
        >
          {projects.map((project) => {
            const isChecked = selectedIds.has(project.id)
            const assignedMembers: Array<{
              memberUserId: string
              memberEmail: string
              role: string
            }> = Array.isArray(project.assignedMembers) ? project.assignedMembers : []
            const canSelect = !isDemoProjectId(project.id)

            return (
              <div
                key={project.id}
                className={`relative rounded-xl transition-all ${
                  isChecked ? 'ring-2 ring-cyan-400/70 ring-offset-2 ring-offset-gray-950' : ''
                }`}
              >
                {/* Bulk Selection & Inline PM Strip */}
                {canSelect && (selectionMode || selectedIds.size > 0 || teamMembers.length > 0 || assignedMembers.length > 0) && (
                  <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                    <button
                      type="button"
                      onClick={() => toggleSelectProject(project.id)}
                      className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-cyan-300"
                      aria-label={`Select ${project.title}`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      <span>Select</span>
                    </button>

                    {teamMembers.length > 0 ? (
                      <div className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                        <UserCheck className="w-3 h-3 text-indigo-400 shrink-0" />
                        <select
                          aria-label={`Assign PM for ${project.title}`}
                          value={assignedMembers[0]?.memberUserId || '__unassigned__'}
                          disabled={bulkBusy}
                          onChange={(e) => {
                            const val = e.target.value
                            void runBulkAction('assign_pm', [project.id], {
                              memberUserId: val === '__unassigned__' ? null : val,
                            })
                          }}
                          className="bg-gray-900 border border-gray-800 rounded px-1.5 py-0.5 text-[11px] text-gray-200 max-w-[165px] truncate hover:border-gray-700 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="__unassigned__">Unassigned PM</option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.memberUserId || m.id}>
                              {m.memberEmail}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : assignedMembers.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-300 truncate max-w-[180px]">
                        <UserCheck className="w-3 h-3 shrink-0" />
                        {assignedMembers.map((m) => m.memberEmail).join(', ')}
                      </span>
                    ) : null}
                  </div>
                )}

                <ProjectCard
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
              </div>
            )
          })}
        </div>
      )}

      {/* Server-Side Pagination & Footer Summary */}
      {totalCount > 0 && !loading && (
        <div className="mt-8 pt-6 border-t border-gray-800/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span>
                Showing{' '}
                <strong className="text-gray-200">
                  {rangeStart}–{rangeEnd}
                </strong>{' '}
                of <strong className="text-gray-200">{totalCount.toLocaleString()}</strong> projects
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

            <div className="flex flex-wrap items-center gap-3">
              {/* Page Size Selector */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span>Per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v))
                    setPage(1)
                    setSelectedIds(new Set())
                  }}
                >
                  <SelectTrigger className="h-8 w-[74px] bg-gray-900 border-gray-800 text-xs text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Prev / Page Indicator / Next */}
              {totalPages > 1 && (
                <div className="inline-flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1 || isFetching}
                    onClick={() => {
                      setPage((p) => Math.max(1, p - 1))
                      setSelectedIds(new Set())
                    }}
                    className="h-8 px-2.5 text-xs border-gray-800 text-gray-200 hover:bg-gray-800"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Prev
                  </Button>
                  <span className="px-2 text-xs text-gray-300 tabular-nums">
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages || isFetching}
                    onClick={() => {
                      setPage((p) => Math.min(totalPages, p + 1))
                      setSelectedIds(new Set())
                    }}
                    className="h-8 px-2.5 text-xs border-gray-800 text-gray-200 hover:bg-gray-800"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
            <span>
              <strong className="text-blue-300">{facets.blueprintCount}</strong> in{' '}
              {STUDIO_DISPLAY_NAMES.blueprint}
            </span>
            <span>•</span>
            <span>
              <strong className="text-purple-300">{facets.productionCount}</strong> in{' '}
              {STUDIO_DISPLAY_NAMES.production}
            </span>
            <span>•</span>
            <span>
              <strong className="text-emerald-300">{facets.completedCount}</strong> completed
            </span>
            {facets.archivedCount > 0 && (
              <>
                <span>•</span>
                <span>
                  <strong className="text-gray-300">{facets.archivedCount}</strong> archived
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setProjectToDelete(null)
        }}
        onConfirm={confirmDelete}
        projectTitle={projectToDelete?.title || ''}
        isDeleting={isDeleting}
      />
    </ProductPageShell>
  )
}
