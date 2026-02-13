'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Sparkles,
  Save,
  ChevronRight,
  Play,
  Users,
  MapPin,
  Film,
  Edit2,
  RefreshCw,
  Check,
  X,
  Loader2,
  Settings,
  Palette,
  MessageSquare,
  ArrowLeft,
  Plus,
  GripVertical,
  LayoutGrid,
  Download,
  Share2,
  Clapperboard,
  Trophy,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useSeriesStudio } from '@/hooks/useSeries'
import { useProcessWithOverlay } from '@/hooks/useProcessWithOverlay'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { DEFAULT_MAX_EPISODES, ABSOLUTE_MAX_EPISODES } from '@/types/series'
import type {
  SeriesCharacterResponse,
  SeriesLocationResponse,
  EpisodeBlueprintResponse
} from '@/types/series'

export default function SeriesStudioPage() {
  const params = useParams()
  const seriesId = params?.seriesId as string
  const { data: session } = useSession()
  const userId = session?.user?.id || null
  const router = useRouter()

  const {
    series,
    isLoading,
    isGenerating,
    error,
    updateSeries,
    generateStoryline,
    addMoreEpisodes,
    refreshSeries,
    selectedEpisodeId,
    selectedEpisode,
    isStartingEpisode,
    setSelectedEpisodeId,
    startEpisode,
    editMode,
    setEditMode
  } = useSeriesStudio(seriesId, userId)

  const [activeTab, setActiveTab] = useState('overview')
  const [isAddingEpisodes, setIsAddingEpisodes] = useState(false)
  const [ideaTopic, setIdeaTopic] = useState('')
  const [episodeCount, setEpisodeCount] = useState(DEFAULT_MAX_EPISODES)
  const [genre, setGenre] = useState('any')
  const [tone, setTone] = useState('any')
  const [isIdeateDialogOpen, setIsIdeateDialogOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Processing overlay for generation
  const { execute: executeWithOverlay } = useProcessWithOverlay()

  // Show ideate dialog for new series without production bible
  useEffect(() => {
    if (series && !series.productionBible?.synopsis && !series.productionBible?.logline) {
      setIsIdeateDialogOpen(true)
    }
  }, [series])

  const handleGenerate = async () => {
    if (!ideaTopic.trim()) {
      toast.error('Please enter a topic or concept')
      return
    }

    // Close dialog immediately for better UX
    setIsIdeateDialogOpen(false)
    
    try {
      const result = await executeWithOverlay(async () => {
        return await generateStoryline({
          topic: ideaTopic,
          episodeCount,
          genre: genre === 'any' ? undefined : genre,
          tone: tone === 'any' ? undefined : tone
        })
      }, {
        message: `Generating ${episodeCount} episode storyline...`,
        estimatedDuration: episodeCount * 3 + 15,
        operationType: 'script-generation'
      })

      toast.success(`Generated ${result.generated.episodeCount} episodes!`)
      setIdeaTopic('')
    } catch (err) {
      toast.error('Failed to generate storyline')
      setIsIdeateDialogOpen(true)
    }
  }

  const handleStartEpisode = async (episodeId: string) => {
    try {
      const result = await startEpisode(episodeId)
      toast.success(`Started Episode ${result.episode.episodeNumber}`)
      router.push(`/dashboard/studio/${result.project.id}?primeBlueprint=true`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start episode')
    }
  }

  const handleRegenerateField = async (field: string) => {
    if (!series) return

    try {
      await generateStoryline({
        topic: series.productionBible?.synopsis || series.title,
        regenerateField: field as any,
        preserveExisting: true,
        genre: series.genre || undefined
      })
      toast.success(`Regenerated ${field}`)
    } catch (err) {
      toast.error(`Failed to regenerate ${field}`)
    }
  }

  const handleAddMoreEpisodes = async () => {
    if (!series) return
    
    setIsAddingEpisodes(true)
    try {
      await addMoreEpisodes(5)
      toast.success('Added 5 more episodes!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add episodes')
    } finally {
      setIsAddingEpisodes(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    )
  }

  if (error || !series) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Series not found</h2>
          <p className="text-gray-400 mb-4">{error || 'The series you\'re looking for doesn\'t exist.'}</p>
          <Link href="/dashboard/series">
            <Button>Back to Series</Button>
          </Link>
        </div>
      </div>
    )
  }

  const bible = series.productionBible
  
  // Calculate progress percentage
  const blueprintCount = (series.episodeBlueprints || []).filter((ep: any) => ep.status === 'blueprint').length
  const inProgressCount = series.startedCount || 0
  const completedCount = series.completedCount || 0
  const totalEpisodes = series.episodeCount || 0
  const progressPercent = totalEpisodes > 0 ? Math.round((completedCount / totalEpisodes) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero Header with Gradient */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-gray-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        
        {/* Top navigation bar */}
        <div className="relative border-b border-amber-800/30 bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/dashboard/series">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    All Series
                  </Button>
                </Link>
                <div className="h-5 w-px bg-gray-700" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
                    <Clapperboard className="w-3 h-3 inline mr-1" />
                    SERIES STUDIO
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                  title="Export Bible"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main hero content */}
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left: Title and info */}
            <div className="flex items-start gap-5">
              {/* Series icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25 flex-shrink-0">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {series.genre && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                      {series.genre}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    Bible v{bible?.version || '1.0.0'}
                  </span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  {series.title}
                </h1>
                <p className="text-gray-400 text-sm max-w-xl line-clamp-2">
                  {bible?.logline || series.logline || 'Generate a storyline to get started with your series.'}
                </p>
              </div>
            </div>

            {/* Right: CTA buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {hasUnsavedChanges && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              )}
              <Button
                onClick={() => setIsIdeateDialogOpen(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {bible?.synopsis ? 'Regenerate Storyline' : 'Generate Storyline'}
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <Film className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{series.episodeCount}</p>
                  <p className="text-xs text-gray-500">Episodes</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{bible?.characters?.length || 0}</p>
                  <p className="text-xs text-gray-500">Characters</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{bible?.locations?.length || 0}</p>
                  <p className="text-xs text-gray-500">Locations</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{progressPercent}%</p>
                  <p className="text-xs text-gray-500">Complete</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {totalEpisodes > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Series Progress</span>
                <span>{completedCount} of {totalEpisodes} episodes completed</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div 
                    className="bg-green-500 transition-all duration-500"
                    style={{ width: `${(completedCount / totalEpisodes) * 100}%` }}
                  />
                  <div 
                    className="bg-blue-500 transition-all duration-500"
                    style={{ width: `${(inProgressCount / totalEpisodes) * 100}%` }}
                  />
                  <div 
                    className="bg-amber-500/50 transition-all duration-500"
                    style={{ width: `${(blueprintCount / totalEpisodes) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-500">Completed ({completedCount})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-gray-500">In Progress ({inProgressCount})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500/50" />
                  <span className="text-gray-500">Blueprint ({blueprintCount})</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800/50 border border-gray-700/50 mb-6 p-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/30 gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="episodes" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 gap-2"
            >
              <Film className="w-4 h-4" />
              Episodes
              <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded-full">{series.episodeCount}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="characters" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-pink-500/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/30 gap-2"
            >
              <Users className="w-4 h-4" />
              Characters
              <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded-full">{bible?.characters?.length || 0}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="locations" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/20 data-[state=active]:to-teal-500/20 data-[state=active]:text-green-400 data-[state=active]:border-green-500/30 gap-2"
            >
              <MapPin className="w-4 h-4" />
              Locations
              <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded-full">{bible?.locations?.length || 0}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="style" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/20 data-[state=active]:to-rose-500/20 data-[state=active]:text-pink-400 data-[state=active]:border-pink-500/30 gap-2"
            >
              <Palette className="w-4 h-4" />
              Visual Style
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <OverviewPanel
              series={series}
              onRegenerate={handleRegenerateField}
              isGenerating={isGenerating}
            />
          </TabsContent>

          {/* Episodes Tab */}
          <TabsContent value="episodes">
            <EpisodesPanel
              episodes={series.episodeBlueprints || []}
              seriesId={series.id}
              onStartEpisode={handleStartEpisode}
              onSelectEpisode={setSelectedEpisodeId}
              selectedEpisodeId={selectedEpisodeId}
              isStarting={isStartingEpisode}
              maxEpisodes={series.maxEpisodes}
              onAddMoreEpisodes={handleAddMoreEpisodes}
              isAddingEpisodes={isAddingEpisodes}
            />
          </TabsContent>

          {/* Characters Tab */}
          <TabsContent value="characters">
            <CharactersPanel
              characters={bible?.characters || []}
              onRegenerate={() => handleRegenerateField('characters')}
              isGenerating={isGenerating}
            />
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations">
            <LocationsPanel
              locations={bible?.locations || []}
              onRegenerate={() => handleRegenerateField('locations')}
              isGenerating={isGenerating}
            />
          </TabsContent>

          {/* Visual Style Tab */}
          <TabsContent value="style">
            <StylePanel
              aesthetic={bible?.aesthetic}
              toneGuidelines={bible?.toneGuidelines}
              visualGuidelines={bible?.visualGuidelines}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Ideate Dialog */}
      <Dialog open={isIdeateDialogOpen} onOpenChange={setIsIdeateDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
          <DialogHeader className="pb-4 border-b border-gray-700/50">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-600/20 flex items-center justify-center border border-cyan-500/30">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <span>Generate</span>
              <span className="text-gray-500 font-normal">· Series Storyline</span>
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm mt-2">
              Describe your series concept and AI will generate the complete storyline with episodes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Topic / Concept <span className="text-cyan-400">*</span>
              </label>
              <Textarea
                placeholder="e.g., A comedy about a group of friends who start a haunted house business but discover their house is actually haunted..."
                value={ideaTopic}
                onChange={(e) => setIdeaTopic(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white min-h-24 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Episodes
                </label>
                <Select value={String(episodeCount)} onValueChange={(v) => setEpisodeCount(Number(v))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 focus:border-cyan-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {[5, 8, 10, 12, 15, 20].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} episodes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Genre <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 focus:border-cyan-500/50">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="comedy">Comedy</SelectItem>
                    <SelectItem value="drama">Drama</SelectItem>
                    <SelectItem value="thriller">Thriller</SelectItem>
                    <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                    <SelectItem value="fantasy">Fantasy</SelectItem>
                    <SelectItem value="horror">Horror</SelectItem>
                    <SelectItem value="documentary">Documentary</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tone <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="bg-gray-800 border-gray-700 focus:border-cyan-500/50">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="lighthearted">Lighthearted</SelectItem>
                  <SelectItem value="dramatic">Dramatic</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                  <SelectItem value="suspenseful">Suspenseful</SelectItem>
                  <SelectItem value="whimsical">Whimsical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button
                variant="outline"
                onClick={() => setIsIdeateDialogOpen(false)}
                className="flex-1 border-gray-600 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!ideaTopic.trim() || isGenerating}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 shadow-lg shadow-cyan-500/25"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Storyline
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Sub-components

interface OverviewPanelProps {
  series: any
  onRegenerate: (field: string) => void
  isGenerating: boolean
}

function OverviewPanel({ series, onRegenerate, isGenerating }: OverviewPanelProps) {
  const bible = series.productionBible

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Overview */}
      <div className="lg:col-span-2 space-y-6">
        {/* Title & Logline */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-semibold text-lg">Series Overview</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerate('title')}
              disabled={isGenerating}
              className="text-gray-400 hover:text-amber-400 hover:bg-amber-500/10"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-amber-400/80 mb-1.5 uppercase tracking-wide">Logline</label>
              <p className="text-gray-200 text-lg leading-relaxed">{bible?.logline || series.logline || 'No logline yet'}</p>
            </div>
            <div className="pt-2 border-t border-gray-700/50">
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Synopsis</label>
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {bible?.synopsis || 'No synopsis yet. Generate a storyline to get started.'}
              </p>
            </div>
          </div>
        </div>

        {/* Setting */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-semibold text-lg">Setting</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerate('setting')}
              disabled={isGenerating}
              className="text-gray-400 hover:text-green-400 hover:bg-green-500/10"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {bible?.setting || 'No setting defined yet.'}
          </p>
          {bible?.timeframe && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/50">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 text-sm">Timeframe: {bible.timeframe}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Protagonist */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-semibold">Protagonist</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerate('protagonist')}
              disabled={isGenerating}
              className="text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {bible?.protagonist?.name ? (
            <div className="space-y-2">
              <p className="text-white font-medium text-lg">{bible.protagonist.name}</p>
              <p className="text-gray-400 text-sm">{bible.protagonist.goal}</p>
              {bible.protagonist.flaw && (
                <p className="text-gray-500 text-xs bg-gray-700/50 rounded-lg px-3 py-2">💔 Flaw: {bible.protagonist.flaw}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No protagonist defined yet.</p>
          )}
        </div>

        {/* Antagonist / Conflict */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="font-semibold">Antagonist / Conflict</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerate('antagonist')}
              disabled={isGenerating}
              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {bible?.antagonistConflict?.description ? (
            <div className="space-y-3">
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-medium">
                {bible.antagonistConflict.type}
              </span>
              <p className="text-gray-300 text-sm leading-relaxed">{bible.antagonistConflict.description}</p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No antagonist/conflict defined yet.</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 rounded-xl p-6 border border-amber-700/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="font-semibold">Quick Stats</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Episodes</span>
              <span className="text-white">{series.episodeCount}/{series.maxEpisodes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">In Progress</span>
              <span className="text-blue-400">{series.startedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Completed</span>
              <span className="text-green-400">{series.completedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Characters</span>
              <span className="text-white">{bible?.characters?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Locations</span>
              <span className="text-white">{bible?.locations?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface EpisodesPanelProps {
  episodes: EpisodeBlueprintResponse[]
  seriesId: string
  maxEpisodes: number
  onStartEpisode: (episodeId: string) => void
  onSelectEpisode: (episodeId: string | null) => void
  onAddMoreEpisodes: () => void
  selectedEpisodeId: string | null
  isStarting: boolean
  isAddingEpisodes: boolean
}

function EpisodesPanel({
  episodes,
  seriesId,
  maxEpisodes,
  onStartEpisode,
  onSelectEpisode,
  onAddMoreEpisodes,
  selectedEpisodeId,
  isStarting,
  isAddingEpisodes
}: EpisodesPanelProps) {
  const selectedEpisode = episodes.find(ep => ep.id === selectedEpisodeId)
  const canAddMore = episodes.length < maxEpisodes

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Episode List */}
      <div className="lg:col-span-1 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">Episode Blueprints</h3>
            <span className="text-xs text-gray-500">{episodes.length}/{maxEpisodes}</span>
          </div>
          <p className="text-xs text-gray-500">Click an episode to view details</p>
          {canAddMore && (
            <Button
              onClick={onAddMoreEpisodes}
              disabled={isAddingEpisodes}
              size="sm"
              className="w-full mt-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
            >
              {isAddingEpisodes ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Add 5 More Episodes</>
              )}
            </Button>
          )}
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {episodes.map((ep) => (
            <button
              key={ep.id}
              onClick={() => onSelectEpisode(ep.id)}
              className={`w-full p-4 text-left border-b border-gray-700 hover:bg-gray-750 transition-colors ${
                selectedEpisodeId === ep.id ? 'bg-gray-750 border-l-2 border-l-amber-500' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 w-8">EP {ep.episodeNumber}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{ep.title}</p>
                  <p className="text-xs text-gray-500 truncate">{ep.logline}</p>
                </div>
                <EpisodeStatusBadge status={ep.status} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Episode Detail */}
      <div className="lg:col-span-2">
        {selectedEpisode ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-amber-400">EPISODE {selectedEpisode.episodeNumber}</span>
                  <EpisodeStatusBadge status={selectedEpisode.status} />
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedEpisode.title}</h2>
                <p className="text-gray-400 mt-2">{selectedEpisode.logline}</p>
              </div>
              {selectedEpisode.status === 'blueprint' && !selectedEpisode.projectId && (
                <Button
                  onClick={() => onStartEpisode(selectedEpisode.id)}
                  disabled={isStarting}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  {isStarting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Start Project
                </Button>
              )}
              {selectedEpisode.projectId && (
                <Link href={`/dashboard/workflow/vision/${selectedEpisode.projectId}`}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Continue Project
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Synopsis */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Synopsis</h4>
              <p className="text-gray-300 text-sm">{selectedEpisode.synopsis}</p>
            </div>

            {/* Story Beats */}
            {selectedEpisode.beats?.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Story Beats</h4>
                <div className="space-y-2">
                  {selectedEpisode.beats.map((beat, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-gray-750 rounded-lg"
                    >
                      <span className="text-xs font-medium text-gray-500 bg-gray-700 px-2 py-1 rounded">
                        Act {beat.act}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">{beat.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{beat.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Episode Characters */}
            {selectedEpisode.characters?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Featured Characters</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEpisode.characters.map((char, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1.5 bg-gray-700 rounded-full text-gray-300"
                    >
                      {char.characterId} ({char.role})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">Select an Episode</h3>
            <p className="text-gray-500 text-sm">Click on an episode to view its details and beats.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EpisodeStatusBadge({ status }: { status: string }) {
  const styles = {
    blueprint: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    completed: { bg: 'bg-green-500/20', text: 'text-green-400' }
  }
  const style = styles[status as keyof typeof styles] || styles.blueprint

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

interface CharactersPanelProps {
  characters: SeriesCharacterResponse[]
  onRegenerate: () => void
  isGenerating: boolean
}

function CharactersPanel({ characters, onRegenerate, isGenerating }: CharactersPanelProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Series Characters</h3>
            <p className="text-sm text-gray-500">Characters shared across all episodes in the Production Bible</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isGenerating}
          className="border-purple-600/50 text-purple-400 hover:bg-purple-600/20"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          Regenerate
        </Button>
      </div>

      {characters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => (
            <div
              key={char.id}
              className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-white truncate">{char.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      char.role === 'protagonist' ? 'bg-green-500/20 text-green-400' :
                      char.role === 'antagonist' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-600/50 text-gray-400'
                    }`}>
                      {char.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">{char.description}</p>
                  {char.appearance && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                      <span className="text-gray-600">Appearance:</span> {char.appearance}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Characters Yet</h3>
          <p className="text-gray-500 text-sm">Generate a storyline to create series characters.</p>
        </div>
      )}
    </div>
  )
}

interface LocationsPanelProps {
  locations: SeriesLocationResponse[]
  onRegenerate: () => void
  isGenerating: boolean
}

function LocationsPanel({ locations, onRegenerate, isGenerating }: LocationsPanelProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Series Locations</h3>
            <p className="text-sm text-gray-500">Recurring locations in the Production Bible</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isGenerating}
          className="border-green-600/50 text-green-400 hover:bg-green-600/20"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          Regenerate
        </Button>
      </div>

      {locations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500/30 to-teal-600/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-white mb-1">{loc.name}</h4>
                  <p className="text-sm text-gray-400">{loc.description}</p>
                  {loc.visualDescription && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      <span className="text-gray-600">Visual:</span> {loc.visualDescription}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Locations Yet</h3>
          <p className="text-gray-500 text-sm">Generate a storyline to create series locations.</p>
        </div>
      )}
    </div>
  )
}

interface StylePanelProps {
  aesthetic?: any
  toneGuidelines?: string
  visualGuidelines?: string
}

function StylePanel({ aesthetic, toneGuidelines, visualGuidelines }: StylePanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Visual Style */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold">Visual Style</h3>
        </div>
        {aesthetic?.visualStyle || visualGuidelines ? (
          <div className="space-y-4">
            {aesthetic?.visualStyle && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Style</label>
                <p className="text-gray-300 text-sm">{aesthetic.visualStyle}</p>
              </div>
            )}
            {aesthetic?.cinematography && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Cinematography</label>
                <p className="text-gray-300 text-sm">{aesthetic.cinematography}</p>
              </div>
            )}
            {aesthetic?.lightingStyle && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Lighting</label>
                <p className="text-gray-300 text-sm">{aesthetic.lightingStyle}</p>
              </div>
            )}
            {visualGuidelines && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Guidelines</label>
                <p className="text-gray-300 text-sm">{visualGuidelines}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No visual style defined yet.</p>
        )}
      </div>

      {/* Tone Guidelines */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold">Tone & Style</h3>
        </div>
        {toneGuidelines ? (
          <p className="text-gray-300 text-sm whitespace-pre-wrap">{toneGuidelines}</p>
        ) : (
          <p className="text-gray-500 text-sm">No tone guidelines defined yet.</p>
        )}
      </div>

      {/* Color Palette */}
      {aesthetic?.colorPalette && Object.keys(aesthetic.colorPalette).length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Color Palette</h3>
          <div className="space-y-4">
            {Object.entries(aesthetic.colorPalette).map(([category, colors]: [string, any]) => (
              <div key={category}>
                <label className="text-xs text-gray-500 block mb-2 capitalize">{category}</label>
                <div className="flex gap-2 flex-wrap">
                  {(colors as string[]).map((color: string, i: number) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-lg border border-gray-700"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Prompt Tokens */}
      {aesthetic?.lockedPromptTokens?.global?.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Locked Prompt Tokens</h3>
          <p className="text-xs text-gray-500 mb-3">
            These tokens are automatically injected into all image generation prompts for consistency.
          </p>
          <div className="flex flex-wrap gap-2">
            {aesthetic.lockedPromptTokens.global.map((token: string, i: number) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full"
              >
                {token}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
