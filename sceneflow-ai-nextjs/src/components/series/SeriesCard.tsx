'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Clapperboard,
  Play,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash,
  Users,
  MapPin,
  Film,
  CheckCircle,
  Clock,
  Sparkles,
  ImagePlus,
  RefreshCw,
  Loader2,
  Tv2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import Link from 'next/link'
import Image from 'next/image'
import type { SeriesResponse, EpisodeBlueprintResponse } from '@/types/series'
import { toast } from 'sonner'

interface SeriesCardProps {
  series: SeriesResponse
  viewMode?: 'grid' | 'list'
  onEdit?: () => void
  onDelete?: () => void
  onStatusChange?: (status: SeriesResponse['status']) => void
  onStartEpisode?: (episodeId: string) => void
  onThumbnailUpdate?: (seriesId: string, thumbnailUrl: string) => void
  showEpisodeList?: boolean
}

// Enhanced status styles with gradients
const STATUS_STYLES = {
  draft: { 
    bg: 'bg-slate-500/20', 
    text: 'text-slate-300', 
    label: 'Draft',
    gradient: 'from-slate-600/40 to-gray-700/40',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
  },
  active: { 
    bg: 'bg-emerald-500/20', 
    text: 'text-emerald-300', 
    label: 'Active',
    gradient: 'from-emerald-500/30 to-teal-600/30',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  completed: { 
    bg: 'bg-blue-500/20', 
    text: 'text-blue-300', 
    label: 'Completed',
    gradient: 'from-blue-500/30 to-indigo-600/30',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
  },
  archived: { 
    bg: 'bg-gray-600/20', 
    text: 'text-gray-500', 
    label: 'Archived',
    gradient: 'from-gray-700/40 to-gray-800/40',
    border: 'border-gray-600/30',
    dot: 'bg-gray-500',
  }
}

const EPISODE_STATUS_STYLES = {
  blueprint: { icon: Sparkles, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  in_progress: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
}

export function SeriesCard({
  series,
  viewMode = 'grid',
  onEdit,
  onDelete,
  onStatusChange,
  onStartEpisode,
  onThumbnailUpdate,
  showEpisodeList = true
}: SeriesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    (series.metadata as { thumbnailUrl?: string; thumbnail?: string })?.thumbnailUrl ||
      (series.metadata as { thumbnail?: string })?.thumbnail ||
      null
  )

  useEffect(() => {
    const meta = series.metadata as { thumbnailUrl?: string; thumbnail?: string } | undefined
    const url = meta?.thumbnailUrl || meta?.thumbnail || null
    setThumbnailUrl(url)
  }, [series.id, series.metadata])
  
  const statusStyle = STATUS_STYLES[series.status] || STATUS_STYLES.draft
  const characterCount = series.productionBible?.characters?.length || 0
  const locationCount = series.productionBible?.locations?.length || 0
  const inProgressCount = Math.max(0, (series.startedCount || 0) - (series.completedCount || 0))
  const resonanceScore =
    (series.metadata as any)?.resonance_analysis?.greenlightScore?.score ?? null

  const progressPercent = series.episodeCount > 0
    ? Math.min(
        100,
        Math.round(
          (((series.completedCount || 0) + inProgressCount * 0.5) / series.episodeCount) * 100
        )
      )
    : 0

  const progressSummaryLabel =
    inProgressCount > 0
      ? `${series.completedCount} done · ${inProgressCount} active of ${series.episodeCount}`
      : `${series.completedCount}/${series.episodeCount} completed`

  // Generate thumbnail handler
  const handleGenerateThumbnail = useCallback(async () => {
    setIsGeneratingThumbnail(true)
    try {
      const response = await fetch(`/api/series/${series.id}/generate-thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate thumbnail')
      }

      const url = data.thumbnailUrl as string | undefined
      if (!url) {
        throw new Error('Thumbnail generated but no image URL was returned')
      }

      setThumbnailUrl(url)
      onThumbnailUpdate?.(series.id, url)
      toast.success('Thumbnail generated!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate thumbnail'
      toast.error(message)
    } finally {
      setIsGeneratingThumbnail(false)
    }
  }, [series.id, onThumbnailUpdate])

  const renderActionsMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-gray-400 hover:text-white flex-shrink-0"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 w-48">
        <DropdownMenuItem onClick={onEdit} className="text-gray-200 hover:text-white">
          <Edit className="w-4 h-4 mr-2" />
          Open Series Room
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void handleGenerateThumbnail()}
          disabled={isGeneratingThumbnail}
          className="text-gray-200 hover:text-white"
        >
          {isGeneratingThumbnail ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ImagePlus className="w-4 h-4 mr-2" />
          )}
          {thumbnailUrl ? 'Regenerate Thumbnail' : 'Generate Thumbnail'}
        </DropdownMenuItem>
        {onStatusChange ? (
          <>
            <DropdownMenuSeparator className="bg-gray-700" />
            {(['draft', 'active', 'completed', 'archived'] as const).map((st) => (
              <DropdownMenuItem
                key={st}
                onClick={() => onStatusChange(st)}
                className={`text-gray-300 hover:text-white ${
                  series.status === st ? 'bg-gray-800/70 font-medium text-white' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${STATUS_STYLES[st].dot}`} />
                Mark as {STATUS_STYLES[st].label}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem onClick={onDelete} className="text-red-400 hover:text-red-300">
          <Trash className="w-4 h-4 mr-2" />
          Delete Series
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (viewMode === 'list') {
    return (
      <TooltipProvider delayDuration={300}>
        <div
          className={`bg-gray-900/90 border ${statusStyle.border} rounded-xl p-3 sm:p-4 hover:border-amber-500/40 transition-all duration-200 group`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Compact 16:9 Thumbnail */}
            <Link
              href={`/dashboard/series/${series.id}`}
              className="relative w-full sm:w-44 aspect-video rounded-lg bg-gray-800 overflow-hidden shrink-0 border border-gray-700/60"
            >
              {thumbnailUrl ? (
                <Image
                  src={thumbnailUrl}
                  alt={series.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-amber-900/20">
                  <Tv2 className="w-7 h-7 text-gray-600" />
                </div>
              )}
              <div className="absolute top-1.5 left-1.5">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text} backdrop-blur-sm border ${statusStyle.border}`}
                >
                  {statusStyle.label}
                </span>
              </div>
              <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-medium text-white flex items-center gap-1">
                <Film className="w-2.5 h-2.5 text-amber-400" />
                {series.episodeCount} ep
              </div>
            </Link>

            {/* Title, Logline & Metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Link href={`/dashboard/series/${series.id}`} className="min-w-0">
                  <h3 className="text-base font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                    {series.title}
                  </h3>
                </Link>
                {series.genre ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                    {series.genre}
                  </span>
                ) : null}
                {typeof resonanceScore === 'number' ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                    Resonance {resonanceScore}
                  </span>
                ) : null}
              </div>
              {series.logline ? (
                <p className="text-xs text-gray-400 line-clamp-1 mb-2.5">{series.logline}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  {series.episodeCount} episodes
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  {characterCount} cast
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {locationCount} locations
                </span>
              </div>
            </div>

            {/* Progress & Actions */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 sm:w-52">
              <div className="w-36 sm:w-full">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-gray-400 truncate">{progressSummaryLabel}</span>
                  <span className="text-gray-300 font-medium ml-1">{progressPercent}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/dashboard/series/${series.id}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-8 px-3 text-xs whitespace-nowrap"
                  >
                    Open Studio
                  </Button>
                </Link>
                {renderActionsMenu()}
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${statusStyle.gradient} border ${statusStyle.border} rounded-xl overflow-hidden hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 group flex flex-col`}
      >
        {/* Clickable 16:9 Thumbnail Section */}
        <div className="relative aspect-video bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 overflow-hidden">
          <Link href={`/dashboard/series/${series.id}`} className="block absolute inset-0 z-0">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={series.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-amber-900/20">
                <Tv2 className="w-12 h-12 text-gray-600 mb-2" />
                <span className="text-xs text-gray-500">Click to open Series Room</span>
              </div>
            )}
          </Link>
          
          {/* Top-right Quick Thumbnail Generate Button on Hover */}
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleGenerateThumbnail()
              }}
              disabled={isGeneratingThumbnail}
              className="h-7 px-2.5 text-xs bg-gray-900/85 hover:bg-indigo-600 text-white border border-white/15 backdrop-blur-sm shadow-lg"
            >
              {isGeneratingThumbnail ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Generating...
                </>
              ) : thumbnailUrl ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  New Art
                </>
              ) : (
                <>
                  <ImagePlus className="w-3.5 h-3.5 mr-1" />
                  Generate Art
                </>
              )}
            </Button>
          </div>
          
          {/* Episode Count & Resonance Badges */}
          <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 pointer-events-none">
            {typeof resonanceScore === 'number' ? (
              <div className="bg-cyan-950/90 border border-cyan-500/40 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-semibold text-cyan-300">
                AR {resonanceScore}
              </div>
            ) : null}
            <div className="bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-medium text-white flex items-center gap-1">
              <Film className="w-3 h-3 text-amber-400" />
              {series.episodeCount} {series.episodeCount === 1 ? 'Episode' : 'Episodes'}
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span className={`text-xs px-2.5 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text} backdrop-blur-sm border ${statusStyle.border}`}>
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Main Card Content */}
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500/25 to-orange-600/25 rounded-lg flex items-center justify-center border border-amber-500/25 flex-shrink-0">
                <Clapperboard className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/dashboard/series/${series.id}`}>
                      <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors cursor-pointer line-clamp-1">
                        {series.title}
                      </h3>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 border-gray-700 text-white max-w-xs p-3">
                    <p className="font-medium text-sm">{series.title}</p>
                    {series.logline && (
                      <p className="text-xs text-gray-400 mt-1.5">{series.logline}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
                {series.genre && (
                  <span className="text-xs text-gray-400">{series.genre}</span>
                )}
              </div>
            </div>
            
            {renderActionsMenu()}
          </div>
          
          {/* Logline with Tooltip */}
          {series.logline && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-gray-400 mb-3 line-clamp-2 cursor-help">{series.logline}</p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 border-gray-700 text-white max-w-sm p-3">
                <p className="text-sm">{series.logline}</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Stats Row */}
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3 mt-auto">
            <div className="flex items-center gap-1" title="Series Cast">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>{characterCount} cast</span>
            </div>
            <div className="flex items-center gap-1" title="Locations">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{locationCount} locations</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">{progressSummaryLabel}</span>
              <span className="text-gray-300 font-medium">{progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/series/${series.id}`} className="flex-1">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
              >
                Open Studio
              </Button>
            </Link>
            
            {showEpisodeList && series.episodeCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="border-gray-700 text-gray-300 hover:text-white px-2.5"
                title={isExpanded ? 'Hide episodes' : 'Show episodes'}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="ml-1 text-xs">{series.episodeCount}</span>
              </Button>
            )}
          </div>
        </div>
      
      {/* Expandable Episode List */}
        {showEpisodeList && isExpanded && series.episodeBlueprints?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-700/50 bg-gray-900/30"
          >
            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
              {series.episodeBlueprints.map((episode) => (
                <EpisodeRow
                  key={episode.id}
                  episode={episode}
                  onStart={() => onStartEpisode?.(episode.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </TooltipProvider>
  )
}

interface EpisodeRowProps {
  episode: EpisodeBlueprintResponse
  onStart?: () => void
}

function EpisodeRow({ episode, onStart }: EpisodeRowProps) {
  const statusStyle = EPISODE_STATUS_STYLES[episode.status] || EPISODE_STATUS_STYLES.blueprint
  const StatusIcon = statusStyle.icon
  
  const canStart = episode.status === 'blueprint' && !episode.projectId
  
  return (
    <div className="flex items-center justify-between p-2.5 bg-gray-800/40 rounded-lg hover:bg-gray-800/60 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${statusStyle.bg}`}>
          <StatusIcon className={`w-3 h-3 ${statusStyle.color}`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-medium">EP {episode.episodeNumber}</span>
            <span className="text-xs text-white truncate">{episode.title}</span>
          </div>
          {episode.logline && (
            <p className="text-[10px] text-gray-500 truncate mt-0.5">{episode.logline}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-2">
        {episode.projectId ? (
          <Link href={`/dashboard/studio/${episode.projectId}?primeBlueprint=true`}>
            <Button variant="outline" size="sm" className="text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 text-xs h-7 px-2">
              Continue
            </Button>
          </Link>
        ) : canStart ? (
          <div className="flex flex-col items-end gap-0.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onStart}
              title="Opens Blueprint Room"
              className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs h-7 px-2"
            >
              <Play className="w-3 h-3 mr-1" />
              Start episode
            </Button>
            <span className="text-[9px] text-gray-500">Opens Blueprint Room</span>
          </div>
        ) : (
          <span className="text-[10px] text-gray-600">Blueprint</span>
        )}
      </div>
    </div>
  )
}

export default SeriesCard
