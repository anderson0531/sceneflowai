'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Play, Check, Volume2, Star } from 'lucide-react'
import { 
  NARRATION_VOICES, 
  NarrationVoice, 
  NarrationContext,
  getRankedNarrationVoices 
} from '@/lib/tts/narrationVoiceSelection'

// ================================================================================
// Props
// ================================================================================

interface NarratorVoicePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedVoiceId?: string
  onSelectVoice: (voiceId: string, voiceName: string) => void
  /** Optional context for smart ranking */
  narrationContext?: NarrationContext
}

// ================================================================================
// Component
// ================================================================================

export function NarratorVoicePicker({
  open,
  onOpenChange,
  selectedVoiceId,
  onSelectVoice,
  narrationContext,
}: NarratorVoicePickerProps) {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')

  // Rank voices by context if provided
  const rankedVoices = useMemo(() => {
    const ranked = narrationContext 
      ? getRankedNarrationVoices(narrationContext)
      : NARRATION_VOICES.map(v => ({ voice: v, score: 50 }))

    // Apply gender filter
    const filtered = genderFilter === 'all' 
      ? ranked 
      : ranked.filter(r => r.voice.gender === genderFilter)

    return filtered
  }, [narrationContext, genderFilter])

  // Best match (first ranked voice)
  const bestMatch = rankedVoices[0]

  const handlePreview = useCallback(async (voice: NarrationVoice) => {
    // Use ElevenLabs preview URLs — these are the standard preview URLs
    const previewUrl = `https://api.elevenlabs.io/v1/voices/${voice.id}/preview`
    
    setPlayingVoiceId(voice.id)
    try {
      // For curated voices, try fetching from our API to get the preview URL
      const res = await fetch('/api/tts/elevenlabs/voices', { cache: 'no-store' })
      const data = await res.json()
      const apiVoice = data.voices?.find((v: any) => v.id === voice.id)
      
      if (apiVoice?.previewUrl) {
        const audio = new Audio(apiVoice.previewUrl)
        audio.onended = () => setPlayingVoiceId(null)
        audio.onerror = () => setPlayingVoiceId(null)
        await audio.play()
      } else {
        setPlayingVoiceId(null)
      }
    } catch (err) {
      console.error('Failed to play preview:', err)
      setPlayingVoiceId(null)
    }
  }, [])

  const handleSelect = useCallback((voice: NarrationVoice) => {
    onSelectVoice(voice.id, voice.name)
    onOpenChange(false)
  }, [onSelectVoice, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle 
            className="flex items-center gap-1.5 font-medium text-gray-200"
            style={{ fontSize: '15px', lineHeight: '1.3' }}
          >
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            Select Narrator Voice
          </DialogTitle>
          <DialogDescription 
            className="text-gray-400"
            style={{ fontSize: '12px', lineHeight: '1.4' }}
          >
            Choose from our curated narrator voices, optimized for storytelling.
          </DialogDescription>
        </DialogHeader>

        {/* Gender Filter Pills */}
        <div className="flex items-center gap-2 mt-2 shrink-0">
          {(['all', 'male', 'female'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGenderFilter(g)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors capitalize ${
                genderFilter === g
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-gray-400 hover:text-gray-300 border border-gray-700 hover:border-gray-600'
              }`}
            >
              {g === 'all' ? 'All Voices' : g}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[11px] text-gray-500">
            {rankedVoices.length} voice{rankedVoices.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Voice Grid */}
        <div className="flex-1 overflow-y-auto mt-3 space-y-1.5">
          {rankedVoices.map(({ voice, score }, index) => {
            const isSelected = voice.id === selectedVoiceId
            const isBestMatch = index === 0 && narrationContext && score > 55

            return (
              <div
                key={voice.id}
                onClick={() => handleSelect(voice)}
                className={`
                  group relative flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-all
                  ${isSelected
                    ? 'bg-blue-600/20 border border-blue-500/50'
                    : isBestMatch
                      ? 'bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10'
                      : 'bg-gray-900/50 border border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isBestMatch && (
                      <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${
                      isSelected ? 'text-blue-300' : isBestMatch ? 'text-yellow-200' : 'text-gray-200'
                    }`}>
                      {voice.name}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-blue-400 shrink-0" />}
                    {isBestMatch && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                        Best Match
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-400">
                      {voice.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-500 capitalize">
                      {voice.gender}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-500 capitalize">
                      {voice.accent}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-500 capitalize">
                      {voice.style}
                    </span>
                    {voice.bestFor.slice(0, 2).map(bf => (
                      <span key={bf} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/30 text-gray-500">
                        {bf}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preview button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePreview(voice)
                  }}
                  disabled={playingVoiceId === voice.id}
                  className="ml-2 p-2 rounded-full hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 disabled:opacity-50 shrink-0"
                  title="Preview voice"
                >
                  <Play className={`h-4 w-4 ${playingVoiceId === voice.id ? 'animate-pulse text-blue-400' : ''}`} />
                </button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
