'use client'

import React, { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { SeriesCard } from '@/components/series/SeriesCard'
import { SeriesSynopsisIdeation } from '@/components/series/SeriesSynopsisIdeation'
import {
  createAudienceDefinition,
  type AudienceDefinition,
} from '@/lib/types/audienceResonance'
import type { SeriesSynopsisLock } from '@/lib/series/clarifySynopsis'
import { NEW_SERIES_EPISODE_COUNT } from '@/config/series/productionFormats'
import { ProductPageShell, ProductPageHeader, ProductEmptyState } from '@/components/product'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'
import { useSeriesList, useEpisode } from '@/hooks/useSeries'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
    setPage
  } = useSeriesList(userId)
  
  const { startEpisode, isStarting } = useEpisode(null)
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [format, setFormat] = useState('narrative')
  const [audienceDef, setAudienceDef] = useState<AudienceDefinition>(() =>
    createAudienceDefinition({ description: '', source: 'series' })
  )
  const [lockedSynopsis, setLockedSynopsis] = useState<SeriesSynopsisLock | null>(null)
  const [createSession, setCreateSession] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  
  // Filter series by search and status
  const filteredSeries = series.filter(s => {
    const matchesSearch = !searchQuery || 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.logline?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const resetCreateForm = () => {
    setFormat('narrative')
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
      const episodeCount = NEW_SERIES_EPISODE_COUNT
      const newSeries = await createSeries({
        userId,
        title: workingTitle || 'Untitled Series',
        maxEpisodes: episodeCount,
        genre: lockedSynopsis?.genre,
        targetAudience: hasAudience ? audienceDef.description.trim() : undefined,
        metadata: {
          ideaTopic,
          format,
          genre: lockedSynopsis?.genre,
          tone: lockedSynopsis?.tone,
          episodeCount,
          synopsisLocked: true,
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

  const handleDeleteSeries = async (seriesId: string) => {
    if (!confirm('Are you sure you want to delete this series? This will unlink all episodes.')) {
      return
    }
    
    try {
      await deleteSeries(seriesId)
      toast.success('Series deleted')
    } catch (err) {
      toast.error('Failed to delete series')
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
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{filteredSeries.length} series</span>
            <div className="flex items-center border border-gray-700 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-8 px-3 rounded-r-none ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-8 px-3 rounded-l-none ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
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
              : 'space-y-4'
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
                  onEdit={() => router.push(`/dashboard/series/${s.id}`)}
                  onDelete={() => handleDeleteSeries(s.id)}
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
              !searchQuery && statusFilter === 'all' ? 'Create Your First Series' : undefined
            }
            onAction={
              !searchQuery && statusFilter === 'all'
                ? () => setIsCreateDialogOpen(true)
                : undefined
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
            <SeriesSynopsisIdeation
              key={createSession}
              format={format}
              onFormatChange={setFormat}
              audience={audienceDef}
              onAudienceChange={setAudienceDef}
              episodeCount={NEW_SERIES_EPISODE_COUNT}
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
    </ProductPageShell>
  )
}
