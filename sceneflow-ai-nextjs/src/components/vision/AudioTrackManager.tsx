'use client'

import React, { useState } from 'react'
import { Volume2, Play, Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NarrationTrack } from './NarrationTrack'
import { DialogueTrack } from './DialogueTrack'
import { SFXTrack } from './SFXTrack'
import { MusicTrack } from './MusicTrack'
import { SceneAudioTracks, Voice } from '@/types/sceneAudio'

interface AudioTrackManagerProps {
  scene: any
  sceneNumber: number
  sceneAudio?: SceneAudioTracks
  voices: Voice[]
  onGenerateNarration: (voiceId: string) => Promise<void>
  onGenerateDialogue: (index: number, voiceId: string) => Promise<void>
  onGenerateSFX: (index: number) => Promise<void>
  onGenerateMusic: () => Promise<void>
  onPlayTrack: (type: 'narration' | 'dialogue' | 'sfx' | 'music', index?: number) => void
  onDownloadTrack: (type: 'narration' | 'dialogue' | 'sfx' | 'music', index?: number) => void
  onVoiceChange: (type: 'narration' | 'dialogue', voiceId: string, index?: number) => void
  onPlayAll: () => Promise<void>
  onGenerateAll: () => Promise<void>
  isGenerating?: Record<string, boolean>
}

export function AudioTrackManager({
  scene,
  sceneNumber,
  sceneAudio,
  voices,
  onGenerateNarration,
  onGenerateDialogue,
  onGenerateSFX,
  onGenerateMusic,
  onPlayTrack,
  onDownloadTrack,
  onVoiceChange,
  onPlayAll,
  onGenerateAll,
  isGenerating = {}
}: AudioTrackManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Use dedicated narration field (captivating storytelling narration)
  const narrationText = scene.narration || ''

  // Extract SFX from scene data
  const sfxList = scene.sfx || []

  // Extract music from scene data
  const musicDescription = scene.music?.description || ''

  // Calculate track completion
  const narrationComplete = sceneAudio?.narration?.generated || false
  const dialogueComplete = sceneAudio?.dialogue?.every(d => d.generated) || false
  const sfxComplete = sceneAudio?.sfx?.every(s => s.generated) || false
  const musicComplete = sceneAudio?.music?.generated || false
  const allComplete = narrationComplete && dialogueComplete && sfxComplete && (musicDescription ? musicComplete : true)

  const totalTracks = 1 + (scene.dialogue?.length || 0) + sfxList.length + (musicDescription ? 1 : 0)
  const completedTracks = 
    (narrationComplete ? 1 : 0) +
    (sceneAudio?.dialogue?.filter(d => d.generated).length || 0) +
    (sceneAudio?.sfx?.filter(s => s.generated).length || 0) +
    (musicComplete ? 1 : 0)

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <Volume2 className="w-4 h-4" />
          <span>Audio Tracks</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {completedTracks}/{totalTracks}
          </span>
        </button>

        {allComplete && (
          <Button
            size="sm"
            onClick={onPlayAll}
            className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-3 h-3 mr-1" />
            Play All
          </Button>
        )}
      </div>

      {/* Expanded Track List */}
      {isExpanded && (
        <div className="space-y-3">
          {/* Narration Track */}
          {narrationText && (
            <NarrationTrack
              track={sceneAudio?.narration}
              text={narrationText}
              voices={voices}
              onGenerate={onGenerateNarration}
              onPlay={() => onPlayTrack('narration')}
              onDownload={() => onDownloadTrack('narration')}
              onVoiceChange={(voiceId) => onVoiceChange('narration', voiceId)}
              isGenerating={isGenerating.narration}
            />
          )}

          {/* Dialogue Tracks */}
          {scene.dialogue && scene.dialogue.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Dialogue ({scene.dialogue.length} {scene.dialogue.length === 1 ? 'line' : 'lines'})
              </div>
              {scene.dialogue.map((d: any, idx: number) => {
                const trackData = sceneAudio?.dialogue?.[idx] || {
                  character: d.character,
                  line: d.line,
                  voiceId: '',
                  generated: false
                }
                
                return (
                  <DialogueTrack
                    key={idx}
                    dialogue={trackData}
                    index={idx}
                    voices={voices}
                    onGenerate={onGenerateDialogue}
                    onPlay={(i) => onPlayTrack('dialogue', i)}
                    onDownload={(i) => onDownloadTrack('dialogue', i)}
                    onVoiceChange={(i, voiceId) => onVoiceChange('dialogue', voiceId, i)}
                    isGenerating={isGenerating[`dialogue-${idx}`]}
                  />
                )
              })}
            </div>
          )}

          {/* SFX Tracks */}
          {sfxList.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Sound Effects ({sfxList.length})
              </div>
              {sfxList.map((sfx: any, idx: number) => {
                const trackData = sceneAudio?.sfx?.[idx] || {
                  description: sfx.description,
                  duration: 2.0,
                  startTime: sfx.time || 0,
                  generated: false
                }
                
                return (
                  <SFXTrack
                    key={idx}
                    sfx={trackData}
                    index={idx}
                    onGenerate={onGenerateSFX}
                    onPlay={(i) => onPlayTrack('sfx', i)}
                    onDownload={(i) => onDownloadTrack('sfx', i)}
                    isGenerating={isGenerating[`sfx-${idx}`]}
                  />
                )
              })}
            </div>
          )}

          {/* Music Track */}
          {musicDescription && (
            <MusicTrack
              track={sceneAudio?.music}
              description={musicDescription}
              onGenerate={onGenerateMusic}
              onPlay={() => onPlayTrack('music')}
              onDownload={() => onDownloadTrack('music')}
              isGenerating={isGenerating.music}
            />
          )}

          {/* Bulk Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              size="sm"
              onClick={onGenerateAll}
              variant="outline"
              className="flex-1 text-xs"
              disabled={allComplete}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Generate All
            </Button>
            {allComplete && (
              <Button
                size="sm"
                onClick={() => {/* TODO: Implement download all */}}
                variant="outline"
                className="flex-1 text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Download All
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

