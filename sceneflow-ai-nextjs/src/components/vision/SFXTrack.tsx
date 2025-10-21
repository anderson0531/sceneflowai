'use client'

import React from 'react'
import { Check, Play, Download, Loader } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SFXTrack as SFXTrackType } from '@/types/sceneAudio'

interface SFXTrackProps {
  sfx: SFXTrackType
  index: number
  onGenerate: (index: number) => Promise<void>
  onPlay: (index: number) => void
  onDownload: (index: number) => void
  isGenerating?: boolean
}

export function SFXTrack({
  sfx,
  index,
  onGenerate,
  onPlay,
  onDownload,
  isGenerating = false
}: SFXTrackProps) {
  return (
    <div className="mb-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
              SFX
            </span>
            {sfx.generated && (
              <Check className="w-3 h-3 text-green-500" />
            )}
            {sfx.startTime > 0 && (
              <span className="text-xs text-gray-500">@{sfx.startTime}s</span>
            )}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
            {sfx.description}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Action Buttons */}
          {sfx.generated ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onPlay(index)}
                className="h-7 w-7 p-0"
                title="Play SFX"
              >
                <Play className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDownload(index)}
                className="h-7 w-7 p-0"
                title="Download MP3"
              >
                <Download className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => onGenerate(index)}
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
    </div>
  )
}

