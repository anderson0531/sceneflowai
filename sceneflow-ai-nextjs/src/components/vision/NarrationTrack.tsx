'use client'

import React from 'react'
import { Check, Play, Download, Loader } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Voice, NarrationTrack as NarrationTrackType } from '@/types/sceneAudio'

interface NarrationTrackProps {
  track?: NarrationTrackType
  text: string
  voices: Voice[]
  onGenerate: (voiceId: string) => Promise<void>
  onPlay: () => void
  onDownload: () => void
  onVoiceChange: (voiceId: string) => void
  isGenerating?: boolean
}

export function NarrationTrack({
  track,
  text,
  voices,
  onGenerate,
  onPlay,
  onDownload,
  onVoiceChange,
  isGenerating = false
}: NarrationTrackProps) {
  const defaultVoice = voices[0]?.id || 'en-US-Studio-O'
  const selectedVoice = track?.voiceId || defaultVoice

  return (
    <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Narration</span>
          {track?.generated && (
            <Check className="w-4 h-4 text-green-500" />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Voice Selector */}
          <Select value={selectedVoice} onValueChange={onVoiceChange}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {voices.map(voice => (
                <SelectItem key={voice.id} value={voice.id} className="text-xs">
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          {track?.generated ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onPlay}
                className="h-8 px-2"
                title="Play narration"
              >
                <Play className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDownload}
                className="h-8 px-2"
                title="Download MP3"
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onGenerate(selectedVoice)}
                disabled={isGenerating}
                className="h-8 px-2 text-xs"
              >
                Regenerate
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => onGenerate(selectedVoice)}
              disabled={isGenerating}
              className="h-8 px-3 text-xs"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-3 h-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Text Preview */}
      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
        {text || 'No narration text'}
      </div>

      {/* Duration Display */}
      {track?.duration && (
        <div className="text-xs text-gray-500 mt-1">
          Duration: {track.duration.toFixed(1)}s
        </div>
      )}
    </div>
  )
}

