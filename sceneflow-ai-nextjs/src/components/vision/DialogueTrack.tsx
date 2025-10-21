'use client'

import React from 'react'
import { Check, Play, Download, Loader } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Voice, DialogueTrack as DialogueTrackType } from '@/types/sceneAudio'

interface DialogueTrackProps {
  dialogue: DialogueTrackType
  index: number
  voices: Voice[]
  onGenerate: (index: number, voiceId: string) => Promise<void>
  onPlay: (index: number) => void
  onDownload: (index: number) => void
  onVoiceChange: (index: number, voiceId: string) => void
  isGenerating?: boolean
}

export function DialogueTrack({
  dialogue,
  index,
  voices,
  onGenerate,
  onPlay,
  onDownload,
  onVoiceChange,
  isGenerating = false
}: DialogueTrackProps) {
  const defaultVoice = voices.find(v => v.name.toLowerCase().includes('emma'))?.id || voices[0]?.id || 'en-US-Studio-Q'
  const selectedVoice = dialogue.voiceId || defaultVoice

  return (
    <div className="mb-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
              {dialogue.character}
            </span>
            {dialogue.generated && (
              <Check className="w-3 h-3 text-green-500" />
            )}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
            "{dialogue.line}"
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Voice Selector */}
          <Select value={selectedVoice} onValueChange={(v) => onVoiceChange(index, v)}>
            <SelectTrigger className="h-7 text-xs w-[120px]">
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
          {dialogue.generated ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onPlay(index)}
                className="h-7 w-7 p-0"
                title="Play"
              >
                <Play className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDownload(index)}
                className="h-7 w-7 p-0"
                title="Download"
              >
                <Download className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => onGenerate(index, selectedVoice)}
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
      {dialogue.duration && (
        <div className="text-xs text-gray-500 mt-1">
          {dialogue.duration.toFixed(1)}s
        </div>
      )}
    </div>
  )
}

