'use client'

import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Play, Check, Volume2, Loader2, Sparkles } from 'lucide-react'

// Google Cloud TTS (Journey Models)
export const GEMINI_VOICES = [
  // Journey Models (Deep Learning TTS)
  { id: 'en-US-Journey-D', name: 'Journey D (Male)', description: 'Deep, resonant, and authoritative. Best for dramatic narration.' },
  { id: 'en-US-Journey-F', name: 'Journey F (Female)', description: 'Clear, expressive, and engaging. Best for conversational reads.' },
  { id: 'en-US-Journey-O', name: 'Journey O (Female)', description: 'Warm, natural, and friendly. Excellent all-rounder.' },
  
  // Studio Quality Fallbacks
  { id: 'en-US-Studio-M', name: 'Studio M (Male)', description: 'Professional studio quality male voice.' },
  { id: 'en-US-Studio-O', name: 'Studio O (Female)', description: 'Professional studio quality female voice.' },
  { id: 'en-US-Studio-Q', name: 'Studio Q (Male)', description: 'Energetic studio male voice.' },
  
  // Neural2 Fallbacks (High Quality)
  { id: 'en-US-Neural2-A', name: 'Neural2 A (Male)', description: 'Standard high-quality male voice.' },
  { id: 'en-US-Neural2-C', name: 'Neural2 C (Female)', description: 'Standard high-quality female voice.' },
  { id: 'en-US-Neural2-D', name: 'Neural2 D (Male)', description: 'Deep high-quality male voice.' },
  { id: 'en-US-Neural2-F', name: 'Neural2 F (Female)', description: 'Clear high-quality female voice.' }
]

interface GeminiVoicePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedVoiceId?: string
  onSelectVoice: (voiceId: string, voiceName: string) => void
}

export function GeminiVoicePicker({
  open,
  onOpenChange,
  selectedVoiceId,
  onSelectVoice,
}: GeminiVoicePickerProps) {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [isSynthesizing, setIsSynthesizing] = useState<string | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const handlePreview = useCallback(async (voiceId: string) => {
    // If playing, stop it
    if (playingVoiceId === voiceId && audioRef.current) {
      audioRef.current.pause()
      setPlayingVoiceId(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    setIsSynthesizing(voiceId)
    try {
      // Use the Google TTS API to generate a preview
      const response = await fetch('/api/tts/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'This is a preview of my voice using Google Cloud Journey TTS models.',
          voiceId: voiceId
        }),
      })

      if (!response.ok) throw new Error('TTS preview failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setPlayingVoiceId(null)
      audio.onerror = () => setPlayingVoiceId(null)
      
      await audio.play()
      setPlayingVoiceId(voiceId)
    } catch (err) {
      console.error('Failed to play preview:', err)
      setPlayingVoiceId(null)
    } finally {
      setIsSynthesizing(null)
    }
  }, [playingVoiceId])

  const handleSelect = useCallback((voiceId: string, voiceName: string) => {
    onSelectVoice(voiceId, voiceName)
    onOpenChange(false)
  }, [onSelectVoice, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col bg-gray-900 border-gray-800">
        <DialogHeader className="pb-4 border-b border-gray-800">
          <DialogTitle 
            className="flex items-center gap-2 font-medium text-gray-200 text-lg"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Google Cloud Journey TTS
          </DialogTitle>
          <DialogDescription 
            className="text-gray-400"
          >
            Powered by Google Cloud Text-to-Speech. Journey voices provide highly natural, expressive narration.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-2 mt-4 custom-scrollbar grid grid-cols-2 gap-3 pb-4">
          {GEMINI_VOICES.map((voice) => {
            const isSelected = selectedVoiceId === voice.id
            const isPlaying = playingVoiceId === voice.id
            const isGenerating = isSynthesizing === voice.id

            return (
              <div
                key={voice.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-cyan-500/10 border-cyan-500/30' 
                    : 'bg-gray-800/40 border-gray-800/60 hover:bg-gray-800 hover:border-gray-700'
                }`}
                onClick={() => handleSelect(voice.id, voice.name)}
              >
                {/* Preview Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePreview(voice.id)
                  }}
                  disabled={isSynthesizing !== null && isSynthesizing !== voice.id}
                  className={`shrink-0 w-8 h-8 mt-0.5 rounded-full flex items-center justify-center transition-colors ${
                    isPlaying 
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isPlaying ? (
                    <div className="w-2 h-2 rounded-sm bg-current" /> // Stop icon
                  ) : (
                    <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-gray-200 text-[13px]">{voice.name}</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 leading-relaxed line-clamp-2" title={voice.description}>
                    {voice.description}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
