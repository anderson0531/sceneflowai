'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
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
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import type { SeriesResponse, EpisodeBlueprintResponse } from '@/types/series'

interface SeriesCardProps {
  series: SeriesResponse
  onEdit?: () => void
  onDelete?: () => void
  onStartEpisode?: (episodeId: string) => void
  showEpisodeList?: boolean
}

const STATUS_STYLES = {
  draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Draft' },
  active: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Active' },
  completed: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Completed' },
  archived: { bg: 'bg-gray-600/20', text: 'text-gray-500', label: 'Archived' }
}

const EPISODE_STATUS_STYLES = {
  blueprint: { icon: Sparkles, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  in_progress: { icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' }
}

export function SeriesCard({
  series,
  onEdit,
  onDelete,
  onStartEpisode,
  showEpisodeList = true
}: SeriesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const statusStyle = STATUS_STYLES[series.status] || STATUS_STYLES.draft
  const characterCount = series.productionBible?.characters?.length || 0
  const locationCount = series.productionBible?.locations?.length || 0
  
  const progressPercent = series.episodeCount > 0
    ? Math.round((series.completedCount / series.episodeCount) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all group"
    >
      {/* Main Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/30 to-purple-600/30 rounded-lg flex items-center justify-center border border-cyan-500/20">
              <BookOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <Link href={`/dashboard/series/${series.id}`}>
                <h3 className="text-base font-medium text-white group-hover:text-cyan-300 transition-colors cursor-pointer line-clamp-1">
                  {series.title}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                  {statusStyle.label}
                </span>
                {series.genre && (
                  <span className="text-xs text-gray-500">{series.genre}</span>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
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
        
        {/* Logline */}
        {series.logline && (
          <p className="text-sm text-gray-400 mb-4 line-clamp-2">{series.logline}</p>
        )}
        
        {/* Stats Row */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" />
            <span>{series.episodeCount}/{series.maxEpisodes} episodes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{characterCount} characters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{locationCount} locations</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500">Series Progress</span>
            <span className="text-gray-400">{series.completedCount} of {series.episodeCount} completed</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
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
              className="w-full border-gray-600 text-gray-300 hover:text-cyan-300 hover:border-cyan-500/50"
            >
              Open Studio
            </Button>
          </Link>
          
          {showEpisodeList && series.episodeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Episodes
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
          className="border-t border-gray-700 bg-gray-850"
        >
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
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
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${statusStyle.bg}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${statusStyle.color}`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">EP {episode.episodeNumber}</span>
            <span className="text-sm text-white truncate">{episode.title}</span>
          </div>
          {episode.logline && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{episode.logline}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-2">
        {episode.projectId ? (
          <Link href={`/dashboard/workflow/vision/${episode.projectId}`}>
            <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 text-xs">
              Continue
            </Button>
          </Link>
        ) : canStart ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStart}
            className="text-cyan-400 hover:text-cyan-300 text-xs"
          >
            <Play className="w-3 h-3 mr-1" />
            Start
          </Button>
        ) : (
          <span className="text-xs text-gray-600">Blueprint</span>
        )}
      </div>
    </div>
  )
}

export default SeriesCard
