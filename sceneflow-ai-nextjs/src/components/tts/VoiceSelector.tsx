'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Search, RefreshCw, Play, Check } from 'lucide-react'

interface Voice {
  id: string
  name: string
  previewUrl?: string
  category?: string
  labels?: Record<string, any>
  description?: string
  language?: string
  accent?: string
  gender?: string
  age?: string
  useCase?: string
}

interface VoiceSelectorProps {
  selectedVoiceId?: string
  onSelectVoice: (voiceId: string, voiceName: string) => void
  apiKey?: string // For BYOK (optional, uses platform key if not provided)
  compact?: boolean // Compact mode for inline use
  className?: string
}

export function VoiceSelector({ 
  selectedVoiceId, 
  onSelectVoice, 
  apiKey, 
  compact = false,
  className = '' 
}: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)

  // Fetch voices on mount
  useEffect(() => {
    fetchVoices()
  }, [apiKey])

  const fetchVoices = async () => {
    setLoading(true)
    try {
      const headers: any = {}
      // TODO: BYOK - Use user's API key when implemented
      if (apiKey) headers['x-elevenlabs-api-key'] = apiKey
      
      const res = await fetch('/api/tts/elevenlabs/voices', { 
        headers,
        cache: 'no-store' 
      })
      const data = await res.json()
      if (data?.enabled && Array.isArray(data.voices)) {
        setVoices(data.voices)
      }
    } catch (err) {
      console.error('Failed to fetch voices:', err)
    } finally {
      setLoading(false)
    }
  }

  // Extract unique filter options from voices
  const filterOptions = useMemo(() => {
    const languages = new Set<string>()
    const genders = new Set<string>()
    const categories = new Set<string>()

    voices.forEach(v => {
      if (v.language) languages.add(v.language)
      if (v.gender) genders.add(v.gender)
      if (v.category) categories.add(v.category)
    })

    return {
      languages: Array.from(languages).sort(),
      genders: Array.from(genders).sort(),
      categories: Array.from(categories).sort()
    }
  }, [voices])

  // Filter voices by search and filters
  const filteredVoices = useMemo(() => {
    return voices.filter(v => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = v.name.toLowerCase().includes(query)
        const matchesDesc = v.description?.toLowerCase().includes(query)
        if (!matchesName && !matchesDesc) return false
      }
      
      // Language filter
      if (languageFilter !== 'all' && v.language !== languageFilter) return false
      
      // Gender filter
      if (genderFilter !== 'all' && v.gender !== genderFilter) return false
      
      // Category filter
      if (categoryFilter !== 'all' && v.category !== categoryFilter) return false
      
      return true
    })
  }, [voices, searchQuery, languageFilter, genderFilter, categoryFilter])

  const handlePreview = async (voice: Voice) => {
    if (!voice.previewUrl) return
    
    setPlayingVoiceId(voice.id)
    try {
      const audio = new Audio(voice.previewUrl)
      audio.onended = () => setPlayingVoiceId(null)
      audio.onerror = () => setPlayingVoiceId(null)
      await audio.play()
    } catch (err) {
      console.error('Failed to play preview:', err)
      setPlayingVoiceId(null)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-400">Loading voices...</span>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-300">
          Select Voice {voices.length > 0 && `(${filteredVoices.length}/${voices.length})`}
        </h4>
        <button 
          onClick={fetchVoices} 
          disabled={loading}
          className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 flex items-center gap-1"
          title="Refresh voice list"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search voices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Filters (not shown in compact mode) */}
      {!compact && filterOptions.languages.length > 1 && (
        <div className="grid grid-cols-3 gap-2">
          <select 
            value={languageFilter} 
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Languages</option>
            {filterOptions.languages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>

          {filterOptions.genders.length > 1 && (
            <select 
              value={genderFilter} 
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Genders</option>
              {filterOptions.genders.map(gender => (
                <option key={gender} value={gender}>{gender}</option>
              ))}
            </select>
          )}

          {filterOptions.categories.length > 1 && (
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {filterOptions.categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Voice list */}
      <div className={`overflow-y-auto space-y-1 ${compact ? 'max-h-48' : 'max-h-96'}`}>
        {filteredVoices.map(voice => (
          <div
            key={voice.id}
            onClick={() => onSelectVoice(voice.id, voice.name)}
            className={`
              group relative flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors
              ${voice.id === selectedVoiceId 
                ? 'bg-blue-600/20 border border-blue-500/50' 
                : 'bg-gray-900/50 border border-gray-700 hover:bg-gray-800 hover:border-gray-600'
              }
            `}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium truncate ${voice.id === selectedVoiceId ? 'text-blue-300' : 'text-gray-200'}`}>
                  {voice.name}
                </span>
                {voice.id === selectedVoiceId && (
                  <Check className="h-4 w-4 text-blue-400 shrink-0" />
                )}
              </div>
              {!compact && (voice.language || voice.gender || voice.category) && (
                <div className="flex items-center gap-2 mt-0.5">
                  {voice.language && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400">
                      {voice.language}
                    </span>
                  )}
                  {voice.gender && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400">
                      {voice.gender}
                    </span>
                  )}
                  {voice.category && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400">
                      {voice.category}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Preview button */}
            {voice.previewUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePreview(voice)
                }}
                disabled={playingVoiceId === voice.id}
                className="ml-2 p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 disabled:opacity-50 shrink-0"
                title="Preview voice"
              >
                <Play className={`h-3.5 w-3.5 ${playingVoiceId === voice.id ? 'animate-pulse' : ''}`} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredVoices.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-8">
          {searchQuery || languageFilter !== 'all' || genderFilter !== 'all' || categoryFilter !== 'all'
            ? 'No voices match your filters'
            : 'No voices available'
          }
        </div>
      )}

      {/* Voice count */}
      {!compact && filteredVoices.length > 0 && (
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-800">
          {filteredVoices.length === voices.length 
            ? `${voices.length} voice${voices.length === 1 ? '' : 's'} available`
            : `Showing ${filteredVoices.length} of ${voices.length} voices`
          }
        </div>
      )}
    </div>
  )
}

