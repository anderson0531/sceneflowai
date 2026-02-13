'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Library,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  BookOpen,
  Users,
  MapPin,
  Film,
  Sparkles,
  ArrowRight,
  X,
  Clapperboard,
  Rocket
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { SeriesCard } from '@/components/series/SeriesCard'
import { useSeriesList, useEpisode } from '@/hooks/useSeries'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { DEFAULT_MAX_EPISODES, ABSOLUTE_MAX_EPISODES } from '@/types/series'

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
  const [newSeriesTitle, setNewSeriesTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  // Filter series by search and status
  const filteredSeries = series.filter(s => {
    const matchesSearch = !searchQuery || 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.logline?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreateSeries = async () => {
    if (!newSeriesTitle.trim() || !userId) return
    
    setIsCreating(true)
    try {
      const newSeries = await createSeries({
        userId,
        title: newSeriesTitle.trim()
      })
      
      toast.success('Series created! Opening the studio...')
      setIsCreateDialogOpen(false)
      setNewSeriesTitle('')
      
      // Navigate to series studio for ideation
      router.push(`/dashboard/series/${newSeries.id}`)
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
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/30 to-purple-600/30 rounded-xl flex items-center justify-center border border-cyan-500/20">
                <Clapperboard className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30">
                    PRODUCTION HUB
                  </span>
                </div>
                <h1 className="text-3xl font-bold">Production Series Dashboard</h1>
                <p className="text-gray-400 mt-1">
                  Create multi-episode video series with consistent characters and storylines
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white shadow-lg shadow-cyan-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Series
            </Button>
          </div>
        </motion.div>

        {/* Feature Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-cyan-900/20 via-purple-900/20 to-pink-900/20 border border-cyan-700/30 rounded-xl p-6 mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Rocket className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-cyan-300 mb-2">Start Your Next Production</h2>
              <p className="text-gray-300 text-sm mb-4">
                Ideate a topic and let AI generate your complete series storyline — title, logline, 
                setting, protagonist, antagonist, and up to {DEFAULT_MAX_EPISODES} episodes with beats and characters.
                Each series has a shared Production Bible for character and visual consistency across all episodes.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Production Bible</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Shared Characters</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span>Consistent Locations</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Film className="w-4 h-4 text-pink-400" />
                  <span>Episode Blueprints</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center"
          >
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Library className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No matching series' : 'No Series Yet'}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters or search query.'
                : 'Create your first series to start building multi-episode video content with consistent characters and storylines.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white shadow-lg shadow-cyan-500/25"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Series
              </Button>
            )}
          </motion.div>
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

        {/* Back to Dashboard */}
        <div className="mt-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Create Series Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Series</DialogTitle>
            <DialogDescription className="text-gray-400">
              Give your series a working title. You can use AI to generate the full storyline in the studio.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Series Title
              </label>
              <Input
                placeholder="e.g., The Adventures of..."
                value={newSeriesTitle}
                onChange={(e) => setNewSeriesTitle(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSeriesTitle.trim()) {
                    handleCreateSeries()
                  }
                }}
              />
            </div>
            
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
                disabled={!newSeriesTitle.trim() || isCreating}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
              >
                {isCreating ? 'Creating...' : 'Create & Open Studio'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
