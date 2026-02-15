'use client'

import React, { useState, useCallback } from 'react'
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
  onEdit?: () => void
  onDelete?: () => void
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
    border: 'border-slate-500/30'
  },
  active: { 
    bg: 'bg-emerald-500/20', 
    text: 'text-emerald-300', 
    label: 'Active',
    gradient: 'from-emerald-500/30 to-teal-600/30',
    border: 'border-emerald-500/30'
  },
  completed: { 
    bg: 'bg-blue-500/20', 
    text: 'text-blue-300', 
    label: 'Completed',
    gradient: 'from-blue-500/30 to-indigo-600/30',
    border: 'border-blue-500/30'
  },
  archived: { 
    bg: 'bg-gray-600/20', 
    text: 'text-gray-500', 
    label: 'Archived',
    gradient: 'from-gray-700/40 to-gray-800/40',
    border: 'border-gray-600/30'
  }
}

const EPISODE_STATUS_STYLES = {
  blueprint: { icon: Sparkles, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  in_progress: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
}

export function SeriesCard({
  series,
  onEdit,
  onDelete,
  onStartEpisode,
  onThumbnailUpdate,
  showEpisodeList = true
}: SeriesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    (series.metadata as any)?.thumbnailUrl || null
  )
  
  const statusStyle = STATUS_STYLES[series.status] || STATUS_STYLES.draft
  const characterCount = series.productionBible?.characters?.length || 0
  const locationCount = series.productionBible?.locations?.length || 0
  
  const progressPercent = series.episodeCount > 0
    ? Math.round((series.completedCount / series.episodeCount) * 100)
    : 0

  // Generate thumbnail handler
  const handleGenerateThumbnail = useCallback(async () => {
    setIsGeneratingThumbnail(true)
    try {
      const response = await fetch(`/api/series/${series.id}/generate-thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate thumbnail')
      }
      
      const data = await response.json()
      setThumbnailUrl(data.thumbnailUrl)
      onThumbnailUpdate?.(series.id, data.thumbnailUrl)
      toast.success('Thumbnail generated!')
    } catch (err) {
      toast.error('Failed to generate thumbnail')
    } finally {
      setIsGeneratingThumbnail(false)
    }
  }, [series.id, series.logline, series.title, series.genre, onThumbnailUpdate])

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${statusStyle.gradient} border ${statusStyle.border} rounded-xl overflow-hidden hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 group`}
      >
        {/* YouTube-style Thumbnail Section */}
        <div className="relative aspect-video bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 overflow-hidden">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={series.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20">
              <Tv2 className="w-12 h-12 text-gray-600 mb-2" />
              <span className="text-xs text-gray-500">No thumbnail</span>
            </div>
          )}
          
          {/* Hover Overlay with Generate/Regenerate Controls */}
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleGenerateThumbnail()
              }}
              disabled={isGeneratingThumbnail}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
            >
              {isGeneratingThumbnail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : thumbnailUrl ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Regenerate
                </>
              ) : (
                <>
                  <ImagePlus className="w-4 h-4 mr-1.5" />
                  Generate
                </>
              )}
            </Button>
          </div>
          
          {/* Episode Count Badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1">
            <Film className="w-3 h-3" />
            {series.episodeCount}/{series.maxEpisodes}
          </div>
          
          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <span className={`text-xs px-2 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text} backdrop-blur-sm border ${statusStyle.border}`}>
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Main Card Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500/30 to-purple-600/30 rounded-lg flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
                <Clapperboard className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/dashboard/series/${series.id}`}>
                      <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors cursor-pointer line-clamp-1">
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
                  <span className="text-xs text-gray-500">{series.genre}</span>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-white flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                <DropdownMenuItem onClick={onEdit} className="text-gray-300 hover:text-white">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Series
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem onClick={onDelete} className="text-red-400 hover:text-red-300">
                  <Trash className="w-4 h-4 mr-2" />
                  Delete Series
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-400" />
              <span>{characterCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>{locationCount}</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">Progress</span>
              <span className="text-gray-400">{series.completedCount}/{series.episodeCount}</span>
            </div>
            <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/series/${series.id}`} className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-gray-600 text-gray-300 hover:text-indigo-300 hover:border-indigo-500/50 hover:bg-indigo-500/10"
              >
                Open Studio
              </Button>
            </Link>
            
            {showEpisodeList && series.episodeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-white px-2"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="sr-only">Episodes</span>
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
          <Link href={`/dashboard/workflow/vision/${episode.projectId}`}>
            <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 text-xs h-7 px-2">
              Continue
            </Button>
          </Link>
        ) : canStart ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStart}
            className="text-emerald-400 hover:text-emerald-300 text-xs h-7 px-2"
          >
            <Play className="w-3 h-3 mr-1" />
            Start
          </Button>
        ) : (
          <span className="text-[10px] text-gray-600">Blueprint</span>
        )}
      </div>
    </div>
  )
}

export default SeriesCard
