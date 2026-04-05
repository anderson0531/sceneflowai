'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Play, Check, Loader2, Sparkles, Star, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'

export const GEMINI_VOICES = [
  // Gemini Models
  { id: 'gemini-Kore', name: 'Kore (Premium)', description: 'Expressive female voice supporting Audio Profiles and script markup tags.', gender: 'Female', category: 'Premium' },
  { id: 'gemini-Charon', name: 'Charon (Premium)', description: 'Expressive male voice supporting Audio Profiles and script markup tags.', gender: 'Male', category: 'Premium' },
  { id: 'gemini-Aoede', name: 'Aoede (Premium)', description: 'Expressive female voice supporting Audio Profiles and script markup tags.', gender: 'Female', category: 'Premium' },
  { id: 'gemini-Puck', name: 'Puck (Premium)', description: 'Expressive male voice supporting Audio Profiles and script markup tags.', gender: 'Male', category: 'Premium' },
  
  // Journey Models (Deep Learning TTS) -> Storytellers
  { id: 'en-US-Journey-D', name: 'Marcus (Storyteller)', description: 'Deep, resonant, and authoritative. Best for dramatic narration and suspense.', gender: 'Male', category: 'Standard' },
  { id: 'en-US-Journey-F', name: 'Elena (Storyteller)', description: 'Clear, expressive, and engaging. Best for conversational and emotional reads.', gender: 'Female', category: 'Standard' },
  { id: 'en-US-Journey-O', name: 'Sarah (Storyteller)', description: 'Warm, natural, and friendly. Excellent all-rounder for documentaries.', gender: 'Female', category: 'Standard' },
  
  // Studio Quality -> Broadcast
  { id: 'en-US-Studio-M', name: 'James (Broadcast)', description: 'Professional studio quality male voice. Perfect for news and announcements.', gender: 'Male', category: 'Standard' },
  { id: 'en-US-Studio-O', name: 'Olivia (Broadcast)', description: 'Professional studio quality female voice. Clear and crisp articulation.', gender: 'Female', category: 'Standard' },
  { id: 'en-US-Studio-Q', name: 'Michael (Broadcast)', description: 'Energetic studio male voice. Great for action and fast-paced narratives.', gender: 'Male', category: 'Standard' },
  
  // Neural2 Fallbacks -> Documentary
  { id: 'en-US-Neural2-A', name: 'Arthur (Documentary)', description: 'Standard high-quality male voice with a calm, educational tone.', gender: 'Male', category: 'Standard' },
  { id: 'en-US-Neural2-C', name: 'Clara (Documentary)', description: 'Standard high-quality female voice. Gentle and soothing.', gender: 'Female', category: 'Standard' },
  { id: 'en-US-Neural2-D', name: 'David (Documentary)', description: 'Deep high-quality male voice. Excellent for historical pieces.', gender: 'Male', category: 'Standard' },
  { id: 'en-US-Neural2-F', name: 'Fiona (Documentary)', description: 'Clear high-quality female voice with a bright, uplifting tone.', gender: 'Female', category: 'Standard' },
  { id: 'en-US-Neural2-E', name: 'Emma (Documentary)', description: 'Articulate female voice, ideal for instructional and corporate content.', gender: 'Female', category: 'Standard' },
  { id: 'en-US-Neural2-G', name: 'Grace (Documentary)', description: 'Soft-spoken female voice, great for intimate storytelling.', gender: 'Female', category: 'Standard' },
  { id: 'en-US-Neural2-H', name: 'Hannah (Documentary)', description: 'Confident female voice with a clear, steady pace.', gender: 'Female', category: 'Standard' },
  { id: 'en-US-Neural2-I', name: 'Isaac (Documentary)', description: 'Smooth male voice, suitable for professional presentations.', gender: 'Male', category: 'Standard' },
  { id: 'en-US-Neural2-J', name: 'Jack (Documentary)', description: 'Warm male voice, excellent for friendly and welcoming narration.', gender: 'Male', category: 'Standard' },

  // Wavenet -> Classic
  { id: 'en-US-Wavenet-A', name: 'Adam (Classic)', description: 'Traditional male voice with a neutral, straightforward delivery.', gender: 'Male', category: 'Standard' },
  { id: 'en-US-Wavenet-B', name: 'Ben (Classic)', description: 'Gruff, mature male voice suitable for gritty or hardboiled stories.', gender: 'Male', category: 'Standard' },
  { id: 'en-US-Wavenet-C', name: 'Catherine (Classic)', description: 'Clear, high-pitched female voice, excellent for youth-oriented content.', gender: 'Female', category: 'Standard' },
  { id: 'en-US-Wavenet-D', name: 'Daniel (Classic)', description: 'Fast-paced, energetic male voice for upbeat narratives.', gender: 'Male', category: 'Standard' },
  { id: 'en-US-Wavenet-E', name: 'Emily (Classic)', description: 'Polite and formal female voice, great for automated announcements.', gender: 'Female', category: 'Standard' },
  { id: 'en-US-Wavenet-F', name: 'Faith (Classic)', description: 'Bright and cheery female voice.', gender: 'Female', category: 'Standard' },
  { id: 'en-US-Wavenet-G', name: 'Gwen (Classic)', description: 'Soft, melodious female voice.', gender: 'Female', category: 'Standard' },
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
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'All' | 'Favorites' | 'Male' | 'Female'>('All')
  const [favorites, setFavorites] = useState<string[]>([])
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  // Load favorites from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('directorNoteFavorites')
      if (stored) {
        setFavorites(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to load favorites', e)
    }
  }, [])

  // Save favorites to local storage
  const toggleFavorite = (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation()
    setFavorites(prev => {
      const isFav = prev.includes(voiceId)
      const newFavs = isFav ? prev.filter(id => id !== voiceId) : [...prev, voiceId]
      try {
        localStorage.setItem('directorNoteFavorites', JSON.stringify(newFavs))
      } catch (err) {
        console.error('Failed to save favorites', err)
      }
      return newFavs
    })
  }

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
          text: 'This is a preview of my voice for the Director\'s Note.',
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

  // Stop audio when dialog closes
  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause()
      setPlayingVoiceId(null)
    }
  }, [open])

  const filteredVoices = useMemo(() => {
    return GEMINI_VOICES.filter(voice => {
      // Filter by category/tab
      if (filter === 'Favorites' && !favorites.includes(voice.id)) return false
      if (filter === 'Male' && voice.gender !== 'Male') return false
      if (filter === 'Female' && voice.gender !== 'Female') return false

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchName = voice.name.toLowerCase().includes(query)
        const matchDesc = voice.description.toLowerCase().includes(query)
        if (!matchName && !matchDesc) return false
      }

      return true
    })
  }, [searchQuery, filter, favorites])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] h-[85vh] max-h-[800px] overflow-hidden flex flex-col bg-gray-900 border-gray-800 p-0">
        <DialogHeader className="p-6 pb-4 border-b border-gray-800 shrink-0">
          <DialogTitle 
            className="flex items-center gap-2 font-medium text-gray-200 text-lg"
          >
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Director's Note Voices
          </DialogTitle>
          <DialogDescription 
            className="text-gray-400 mt-2"
          >
            Select a professional narrator voice for your Director's Note.
          </DialogDescription>

          <div className="mt-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, style, or description..."
                className="w-full bg-gray-950 border-gray-700 pl-9 pr-8 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(['All', 'Favorites', 'Male', 'Female'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    filter === f 
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                  }`}
                >
                  {f === 'Favorites' ? (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> Favorites
                    </span>
                  ) : f}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar">
          {filteredVoices.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-3">
              <Search className="w-8 h-8 opacity-50" />
              <p>No voices found matching your criteria.</p>
              <button 
                onClick={() => { setSearchQuery(''); setFilter('All'); }}
                className="text-cyan-500 hover:text-cyan-400 text-sm font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-4">
              {filteredVoices.map((voice) => {
                const isSelected = selectedVoiceId === voice.id
                const isPlaying = playingVoiceId === voice.id
                const isGenerating = isSynthesizing === voice.id
                const isFavorite = favorites.includes(voice.id)

                return (
                  <div
                    key={voice.id}
                    className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-cyan-500/10 border-cyan-500/30 shadow-sm shadow-cyan-500/5' 
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
                      className={`shrink-0 w-10 h-10 mt-0.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isPlaying 
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105' 
                          : 'bg-gray-900 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white group-hover:border-gray-600'
                      }`}
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      ) : isPlaying ? (
                        <div className="w-3 h-3 rounded-sm bg-current" /> // Stop icon
                      ) : (
                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1 gap-2">
                        <span className="font-semibold text-gray-200 text-sm leading-tight truncate" title={voice.name}>
                          {voice.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          )}
                          <button
                            onClick={(e) => toggleFavorite(e, voice.id)}
                            className={`p-1 -m-1 rounded-full transition-colors ${
                              isFavorite 
                                ? 'text-amber-400 hover:text-amber-300' 
                                : 'text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100'
                            } ${isFavorite ? 'opacity-100' : ''}`}
                            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-900/80 px-1.5 py-0.5 rounded border border-gray-800">
                          {voice.gender}
                        </span>
                        {voice.category === 'Premium' && (
                          <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Premium
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-400 leading-relaxed line-clamp-2" title={voice.description}>
                        {voice.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
