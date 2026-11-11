'use client'

import React, { useState, useMemo } from 'react'
import { resolveContentIntentFromMetadata } from '@/lib/content/contentIntent'
import { motion } from 'framer-motion'
import {
  Library,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Clapperboard,
  Loader2,
  ArrowUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog'
import { SeriesCard } from '@/components/series/SeriesCard'
import { SeriesSynopsisIdeation } from '@/components/series/SeriesSynopsisIdeation'
import {
  createAudienceDefinition,
  type AudienceDefinition,
} from '@/lib/types/audienceResonance'
import type { SeriesSynopsisLock } from '@/lib/series/clarifySynopsis'
import type { SeriesResponse } from '@/types/series'
import {
  DEFAULT_SERIES_PRODUCTION_FORMAT,
  NEW_SERIES_EPISODE_COUNT,
} from '@/config/series/productionFormats'
import { DEFAULT_ART_STYLE } from '@/lib/treatment/blueprintFoundation'
import { ProductPageShell, ProductPageHeader, ProductEmptyState } from '@/components/product'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'
import { useSeriesList, useEpisode } from '@/hooks/useSeries'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const EPISODE_COUNT_OPTIONS = [3, 5, 8, 10, 12]

export default function SeriesPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id || null
  const router = useRouter()
  
  const {
    series,
    isLoading,
    error,
    page,
    total,
    fetchSeries,
    createSeries,
    deleteSeries,
    updateSeriesStatus,
    setPage
  } = useSeriesList(userId)
  
  const { startEpisode, isStarting } = useEpisode(null)
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'episodes'>('recent')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [format, setFormat] = useState(DEFAULT_SERIES_PRODUCTION_FORMAT)
  const [artStyle, setArtStyle] = useState(DEFAULT_ART_STYLE)
  const [artStyleSpec, setArtStyleSpec] = useState<import('@/lib/artStyle/globalArtStyle').ArtStyleSpec | null>(null)
  const [episodeCount, setEpisodeCount] = useState<number>(NEW_SERIES_EPISODE_COUNT)
  const [audienceDef, setAudienceDef] = useState<AudienceDefinition>(() =>
    createAudienceDefinition({ description: '', source: 'series' })
  )
  const [lockedSynopsis, setLockedSynopsis] = useState<SeriesSynopsisLock | null>(null)
  const [createSession, setCreateSession] = useState(0)
  const [isCreating, setIsCreating] = useState(false)

  // Delete confirmation modal state
  const [seriesToDelete, setSeriesToDelete] = useState<{ id: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Filter and sort series
  const filteredSeries = useMemo(() => {
    const list = (Array.isArray(series) ? series : []).filter(s => {
      const title = s.title || ''
      const matchesSearch = !searchQuery || 
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.logline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.genre?.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false
      if (statusFilter === 'archived') return s.status === 'archived'
      if (s.status === 'archived') return false
      return statusFilter === 'all' || s.status === statusFilter
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return (a.title || '').localeCompare(b.title || '')
      }
      if (sortBy === 'episodes') {
        return (b.episodeCount || 0) - (a.episodeCount || 0)
      }
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    })
  }, [series, searchQuery, statusFilter, sortBy])

  const resetCreateForm = () => {
    setFormat(DEFAULT_SERIES_PRODUCTION_FORMAT)
    setArtStyle(DEFAULT_ART_STYLE)
    setArtStyleSpec(null)
    setEpisodeCount(NEW_SERIES_EPISODE_COUNT)
    setAudienceDef(createAudienceDefinition({ description: '', source: 'series' }))
    setLockedSynopsis(null)
    setCreateSession((session) => session + 1)
  }

  const handleCreateSeries = async () => {
    const ideaTopic = lockedSynopsis?.synopsis.trim() || ''
    if (!ideaTopic || !userId) return
    
    setIsCreating(true)
    try {
      // Auto-generate a working title from the synopsis
      const words = ideaTopic.split(/\s+/)
      const workingTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '')
      
      const hasAudience = !!audienceDef.description?.trim()
      const newSeries = await createSeries({
        userId,
        title: workingTitle || 'Untitled Series',
        maxEpisodes: Math.max(20, episodeCount),
        genre: lockedSynopsis?.genre,
        targetAudience: hasAudience ? audienceDef.description.trim() : undefined,
        metadata: {
          ideaTopic,
          format,
          artStyle,
          ...(artStyleSpec ? { artStyleSpec: { ...artStyleSpec, confirmed: true, source: 'series' } } : {}),
          genre: lockedSynopsis?.genre,
          tone: lockedSynopsis?.tone,
          episodeCount,
          synopsisLocked: true,
          pendingAutoGenerate: true,
          audienceDefinition: hasAudience ? audienceDef : undefined,
          contentIntent: resolveContentIntentFromMetadata({
            format,
            genre: lockedSynopsis?.genre,
          }),
        }
      })
      
      toast.success('Series created! Generating storyline...')
      setIsCreateDialogOpen(false)
      resetCreateForm()
      
      // Navigate to series studio for ideation with autoGenerate flag
      router.push(`/dashboard/series/${newSeries.id}?autoGenerate=true`)
    } catch (err) {
      toast.error('Failed to create series')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRequestDeleteSeries = (s: SeriesResponse) => {
    setSeriesToDelete({ id: s.id, title: s.title || 'Untitled Series' })
  }

  const handleConfirmDeleteSeries = async () => {
    if (!seriesToDelete) return
    setIsDeleting(true)
    try {
      await deleteSeries(seriesToDelete.id)
      toast.success('Series deleted')
      setSeriesToDelete(null)
    } catch (err) {
      toast.error('Failed to delete series')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStatusChange = async (seriesId: string, newStatus: SeriesResponse['status']) => {
    try {
      await updateSeriesStatus(seriesId, newStatus)
      toast.success(`Series marked as ${newStatus}`)
    } catch {
      toast.error('Failed to update series status')
    }
  }

  const handleStartEpisode = async (seriesId: string, episodeId: string) => {
    if (!userId) {
      toast.error('Please sign in to start an episode')
      return
    }
    
    try {
      const result = await fetch(`/api/series/${seriesId}/episodes/${episodeId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await result.json()
      
      if (!data.success) {
        throw new Error(data.error)
      }
      
      toast.success(`Started Episode ${data.episode.episodeNumber}: ${data.episode.title}`)
      router.push(`/dashboard/studio/${data.project.id}?primeBlueprint=true`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start episode')
    }
  }

  return (
    <ProductPageShell>
        <ProductPageHeader
          icon={<Clapperboard className="h-6 w-6" />}
          title={STUDIO_DISPLAY_NAMES.series}
          subtitle="Plan a multi-episode arc once, then produce each episode against it. Continuity holds across the whole series."
          accent="series"
          primaryAction={
            <Button variant="primary" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Series
            </Button>
          }
        />

        {/* Filters and View Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
        >
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px] md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search series by title, logline, or genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-900 border-gray-800 text-white"
              />
            </div>
            <label className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <select
                aria-label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 w-40 appearance-none rounded-lg border border-gray-800 bg-gray-900 pl-9 pr-3 text-sm text-gray-200 hover:bg-gray-800/80 transition-colors"
              >
                <option value="all">All Active & Drafts</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="relative">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <select
                aria-label="Sort by"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as 'recent' | 'alphabetical' | 'episodes')}
                className="h-10 w-44 appearance-none rounded-lg border border-gray-800 bg-gray-900 pl-9 pr-3 text-sm text-gray-200 hover:bg-gray-800/80 transition-colors"
              >
                <option value="recent">Recently Updated</option>
                <option value="alphabetical">Title (A–Z)</option>
                <option value="episodes">Episode Count</option>
              </select>
            </label>
          </div>
          
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-gray-500">{filteredSeries.length} series</span>
            <div className="flex items-center border border-gray-800 bg-gray-900 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-7 px-2.5 rounded-md ${viewMode === 'grid' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-gray-400'}`}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-7 px-2.5 rounded-md ${viewMode === 'list' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-gray-400'}`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Series Grid/List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-800 rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredSeries.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-3'
            }
          >
            {filteredSeries.map((s, index) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <SeriesCard
                  series={s}
                  viewMode={viewMode}
                  onEdit={() => router.push(`/dashboard/series/${s.id}`)}
                  onDelete={() => handleRequestDeleteSeries(s)}
                  onStatusChange={(newStatus) => void handleStatusChange(s.id, newStatus)}
                  onStartEpisode={(episodeId) => handleStartEpisode(s.id, episodeId)}
                  showEpisodeList={viewMode === 'grid'}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <ProductEmptyState
            icon={<Library className="h-8 w-8 text-gray-500" />}
            title={searchQuery || statusFilter !== 'all' ? 'No matching series' : 'No Series Yet'}
            description={
              searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'Create your first series to start building multi-episode video content with consistent characters and storylines.'
            }
            actionLabel={
              searchQuery || statusFilter !== 'all' ? 'Clear Filters' : 'Create Your First Series'
            }
            onAction={
              searchQuery || statusFilter !== 'all'
                ? () => {
                    setSearchQuery('')
                    setStatusFilter('all')
                  }
                : () => setIsCreateDialogOpen(true)
            }
            accent="product"
          />
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-400">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / 20)}
            >
              Next
            </Button>
          </div>
        )}

      {/* Create Series Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Series</DialogTitle>
            <DialogDescription className="text-gray-400">
              Lock the series bible, then produce each episode against it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-gray-800 bg-gray-950/60 px-3.5 py-2.5">
              <div>
                <p className="text-xs font-semibold text-gray-200">Initial Season Length</p>
                <p className="text-[11px] text-gray-400">Choose how many episode blueprints to generate first</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg bg-gray-900 p-1 border border-gray-800">
                {EPISODE_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setEpisodeCount(count)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      episodeCount === count
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {count} eps
                  </button>
                ))}
              </div>
            </div>

            <SeriesSynopsisIdeation
              key={createSession}
              format={format}
              onFormatChange={setFormat}
              audience={audienceDef}
              onAudienceChange={setAudienceDef}
              artStyle={artStyle}
              artStyleSpec={artStyleSpec}
              onArtStyleChange={(nextStyle, nextSpec) => {
                setArtStyle(nextStyle)
                if (nextSpec) setArtStyleSpec(nextSpec)
              }}
              episodeCount={episodeCount}
              showEpisodeHint
              initialLock={lockedSynopsis}
              onLockedChange={setLockedSynopsis}
            />

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="flex-1 border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSeries}
                disabled={!lockedSynopsis?.synopsis.trim() || isCreating}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Series'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Series Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={Boolean(seriesToDelete)}
        onClose={() => setSeriesToDelete(null)}
        onConfirm={handleConfirmDeleteSeries}
        projectTitle={seriesToDelete?.title || ''}
        isDeleting={isDeleting}
      />
    </ProductPageShell>
  )
}
