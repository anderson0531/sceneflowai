'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Search, RefreshCw, Play, Check, Sparkles, Star, Wand2, Mic, X, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { VoiceDesignPanel } from './VoiceDesignPanel'
import { VoiceClonePanel } from './VoiceClonePanel'
import { 
  getCharacterVoiceRecommendations, 
  searchVoicesIntelligently,
  CharacterContext,
  ScreenplayContext,
  VoiceRecommendation,
  ElevenLabsVoice
} from '@/lib/voiceRecommendation'
import { debounce } from 'lodash'

interface VoiceSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: 'elevenlabs' | 'google'
  selectedVoiceId?: string
  onSelectVoice: (voiceId: string, voiceName: string) => void
  characterContext?: CharacterContext
  screenplayContext?: ScreenplayContext
  apiKey?: string
}

export function VoiceSelectorDialog({
  open,
  onOpenChange,
  provider,
  selectedVoiceId,
  onSelectVoice,
  characterContext,
  screenplayContext,
  apiKey
}: VoiceSelectorDialogProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse')
  const [createTab, setCreateTab] = useState<'design' | 'clone'>('design')
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<VoiceRecommendation[]>([])

  // Debounced search query
  const updateDebouncedQuery = useCallback(
    debounce((query: string) => setDebouncedQuery(query), 300),
    []
  )

  useEffect(() => {
    updateDebouncedQuery(searchQuery)
    return () => updateDebouncedQuery.cancel()
  }, [searchQuery, updateDebouncedQuery])

  // Fetch voices when dialog opens
  useEffect(() => {
    if (open && provider === 'elevenlabs') {
      fetchVoices()
    }
  }, [open, provider])

  // Generate recommendations when voices and character context are available
  useEffect(() => {
    if (voices.length > 0 && characterContext) {
      const recs = getCharacterVoiceRecommendations(voices, characterContext, screenplayContext, 5)
      setRecommendations(recs)
    } else {
      setRecommendations([])
    }
  }, [voices, characterContext, screenplayContext])

  const fetchVoices = async () => {
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (apiKey && provider === 'elevenlabs') {
        headers['x-elevenlabs-api-key'] = apiKey
      }

      const endpoint = provider === 'elevenlabs' 
        ? '/api/tts/elevenlabs/voices'
        : '/api/tts/google/voices'

      const res = await fetch(endpoint, { headers, cache: 'no-store' })
      const data = await res.json()

      if (data?.enabled && Array.isArray(data.voices)) {
        setVoices(data.voices)
      } else {
        console.warn(`[VoiceSelectorDialog] Provider ${provider} not available:`, data.error)
        setVoices([])
      }
    } catch (err) {
      console.error('Failed to fetch voices:', err)
      setVoices([])
    } finally {
      setLoading(false)
    }
  }

  // Filter options from voices
  const filterOptions = useMemo(() => {
    const languages = new Set<string>()
    const genders = new Set<string>()

    voices.forEach(v => {
      if (v.language) languages.add(v.language)
      if (v.gender) genders.add(v.gender)
    })

    return {
      languages: Array.from(languages).sort(),
      genders: Array.from(genders).sort()
    }
  }, [voices])

  // Get recommended voice IDs for highlighting
  const recommendedVoiceIds = useMemo(() => 
    new Set(recommendations.map(r => r.voiceId)),
    [recommendations]
  )

  // Get recommendation score for a voice
  const getRecommendationScore = useCallback((voiceId: string) => {
    const rec = recommendations.find(r => r.voiceId === voiceId)
    return rec?.score || 0
  }, [recommendations])

  // Filtered and searched voices
  const filteredVoices = useMemo(() => {
    let result = voices

    // Apply intelligent search if query exists
    if (debouncedQuery) {
      result = searchVoicesIntelligently(result, debouncedQuery, characterContext, screenplayContext)
    }

    // Apply filters
    if (languageFilter !== 'all') {
      result = result.filter(v => v.language === languageFilter)
    }
    if (genderFilter !== 'all') {
      result = result.filter(v => v.gender === genderFilter)
    }
    if (showRecommendedOnly) {
      result = result.filter(v => recommendedVoiceIds.has(v.id))
    }

    // Sort: recommended voices first, then by score
    return result.sort((a, b) => {
      const scoreA = getRecommendationScore(a.id)
      const scoreB = getRecommendationScore(b.id)
      if (scoreA !== scoreB) return scoreB - scoreA
      return a.name.localeCompare(b.name)
    })
  }, [voices, debouncedQuery, languageFilter, genderFilter, showRecommendedOnly, recommendedVoiceIds, getRecommendationScore, characterContext, screenplayContext])

  const handlePreview = async (voice: ElevenLabsVoice) => {
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

  const handleSelectVoice = (voiceId: string, voiceName: string) => {
    onSelectVoice(voiceId, voiceName)
    onOpenChange(false)
  }

  const handleVoiceCreated = (voiceId: string, voiceName: string) => {
    // Refresh voice list to include new voice
    fetchVoices()
    // Select the newly created voice
    onSelectVoice(voiceId, voiceName)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle 
            className="flex items-center gap-1.5 font-medium text-gray-200"
            style={{ fontSize: '15px', lineHeight: '1.3' }}
          >
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            {characterContext ? `Select Voice for ${characterContext.name}` : 'Select Voice'}
          </DialogTitle>
          <DialogDescription 
            className="text-gray-400"
            style={{ fontSize: '12px', lineHeight: '1.4' }}
          >
            {characterContext 
              ? 'Choose a voice that matches your character, or create a custom one.'
              : 'Browse and select a voice, or create a custom voice.'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'browse' | 'create')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="shrink-0 h-8 bg-transparent border-b border-gray-700 rounded-none p-0 gap-4">
            <TabsTrigger 
              value="browse" 
              className="font-medium text-gray-300 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 bg-transparent rounded-none px-0 pb-2 whitespace-nowrap inline-flex items-center gap-1"
              style={{ fontSize: '13px' }}
            >
              <Search className="w-3 h-3" />Browse Voices
            </TabsTrigger>
            <TabsTrigger 
              value="create" 
              className="font-medium text-gray-300 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 bg-transparent rounded-none px-0 pb-2 whitespace-nowrap inline-flex items-center gap-1"
              style={{ fontSize: '13px' }}
            >
              <Sparkles className="w-3 h-3" />Create Custom
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="flex-1 overflow-hidden flex flex-col mt-4">
            {/* Recommendations Section */}
            {recommendations.length > 0 && !debouncedQuery && (
              <div className="mb-4 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-medium text-gray-300 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                    Recommended for {characterContext?.name}
                  </h4>
                  <button
                    onClick={() => setShowRecommendedOnly(!showRecommendedOnly)}
                    className={`text-[11px] px-2 py-1 rounded transition-colors ${
                      showRecommendedOnly 
                        ? 'bg-yellow-500/20 text-yellow-300' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {showRecommendedOnly ? 'Show All' : 'Show Only Recommended'}
                  </button>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recommendations.slice(0, 3).map((rec) => {
                    const voice = voices.find(v => v.id === rec.voiceId)
                    if (!voice) return null
                    
                    return (
                      <div
                        key={rec.voiceId}
                        onClick={() => handleSelectVoice(rec.voiceId, rec.voiceName)}
                        className={`
                          flex-shrink-0 w-48 p-3 rounded-lg cursor-pointer transition-all border
                          ${selectedVoiceId === rec.voiceId 
                            ? 'bg-yellow-500/20 border-yellow-500/50' 
                            : 'bg-gray-800/50 border-gray-700 hover:border-yellow-500/30'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-200 truncate">
                            {rec.voiceName}
                          </span>
                          {voice.previewUrl && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePreview(voice)
                              }}
                              className="p-1 rounded hover:bg-gray-700/50"
                            >
                              <Play className={`w-3 h-3 ${playingVoiceId === rec.voiceId ? 'animate-pulse text-blue-400' : 'text-gray-400'}`} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                            {Math.round(rec.score)}% match
                          </span>
                          {voice.gender && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                              {voice.gender}
                            </span>
                          )}
                        </div>
                        {rec.reasons.length > 0 && (
                          <p className="text-[10px] text-gray-500 mt-1 truncate">
                            {rec.reasons[0]}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder={characterContext 
                    ? `Search voices for ${characterContext.name}...` 
                    : 'Search voices...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-gray-900 border border-gray-700 rounded text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
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

                <div className="flex-1" />

                <button
                  onClick={fetchVoices}
                  disabled={loading}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Voice List */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-400">Loading voices...</span>
                </div>
              ) : filteredVoices.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-12">
                  {searchQuery || languageFilter !== 'all' || genderFilter !== 'all' || showRecommendedOnly
                    ? 'No voices match your filters'
                    : 'No voices available'
                  }
                </div>
              ) : (
                filteredVoices.map(voice => {
                  const isRecommended = recommendedVoiceIds.has(voice.id)
                  const recScore = getRecommendationScore(voice.id)
                  
                  return (
                    <div
                      key={voice.id}
                      onClick={() => handleSelectVoice(voice.id, voice.name)}
                      className={`
                        group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all
                        ${voice.id === selectedVoiceId
                          ? 'bg-blue-600/20 border border-blue-500/50'
                          : isRecommended
                            ? 'bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10'
                            : 'bg-gray-900/50 border border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isRecommended && (
                            <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                          )}
                          <span className={`text-sm font-medium truncate ${
                            voice.id === selectedVoiceId 
                              ? 'text-blue-300' 
                              : isRecommended 
                                ? 'text-yellow-200'
                                : 'text-gray-200'
                          }`}>
                            {voice.name}
                          </span>
                          {voice.id === selectedVoiceId && (
                            <Check className="h-4 w-4 text-blue-400 shrink-0" />
                          )}
                          {isRecommended && recScore > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                              {Math.round(recScore)}%
                            </span>
                          )}
                        </div>
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
                          {voice.accent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400">
                              {voice.accent}
                            </span>
                          )}
                          {voice.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400">
                              {voice.category}
                            </span>
                          )}
                        </div>
                      </div>

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
                  )
                })
              )}
            </div>

            {/* Voice Count */}
            {!loading && filteredVoices.length > 0 && (
              <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-800 shrink-0">
                {filteredVoices.length === voices.length
                  ? `${voices.length} voice${voices.length === 1 ? '' : 's'} available`
                  : `Showing ${filteredVoices.length} of ${voices.length} voices`
                }
              </div>
            )}
          </TabsContent>

          {/* Create Tab */}
          <TabsContent value="create" className="flex-1 overflow-y-auto mt-4">
            <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as 'design' | 'clone')} className="h-full">
              <TabsList className="mb-3 h-8">
                <TabsTrigger value="design" className="text-[12px] px-2.5 py-1 whitespace-nowrap">
                  <Wand2 className="w-3.5 h-3.5 mr-1" />
                  AI Voice Design
                </TabsTrigger>
                <TabsTrigger value="clone" className="text-[12px] px-2.5 py-1 whitespace-nowrap">
                  <Mic className="w-3.5 h-3.5 mr-1" />
                  Clone Voice
                </TabsTrigger>
              </TabsList>

              <TabsContent value="design">
                <VoiceDesignPanel
                  onVoiceCreated={handleVoiceCreated}
                  characterContext={characterContext}
                  screenplayContext={screenplayContext}
                />
              </TabsContent>

              <TabsContent value="clone">
                <VoiceClonePanel
                  onVoiceCreated={handleVoiceCreated}
                  characterName={characterContext?.name}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
