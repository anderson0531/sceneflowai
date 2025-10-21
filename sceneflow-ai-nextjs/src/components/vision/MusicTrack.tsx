'use client'

import React from 'react'
import { Check, Play, Download, Loader, Music as MusicIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MusicTrack as MusicTrackType } from '@/types/sceneAudio'

interface MusicTrackProps {
  track?: MusicTrackType
  description: string
  onGenerate: () => Promise<void>
  onPlay: () => void
  onDownload: () => void
  isGenerating?: boolean
}

export function MusicTrack({
  track,
  description,
  onGenerate,
  onPlay,
  onDownload,
  isGenerating = false
}: MusicTrackProps) {
  if (!description) return null

  return (
    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <MusicIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Background Music
            </span>
            {track?.generated && (
              <Check className="w-3 h-3 text-green-500" />
            )}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
            {description}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Action Buttons */}
          {track?.generated ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={onPlay}
                className="h-7 w-7 p-0"
                title="Play music"
              >
                <Play className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDownload}
                className="h-7 w-7 p-0"
                title="Download MP3"
              >
                <Download className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating}
              className="h-7 px-2 text-xs"
            >
              {isGenerating ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : (
                'Generate'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Duration Display */}
      {track?.duration && (
        <div className="text-xs text-gray-500 mt-1">
          {track.duration}s (loops as needed)
        </div>
      )}
    </div>
  )
}

