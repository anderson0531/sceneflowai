'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Search, RefreshCw, Play, Check, Sparkles, Star, Wand2, Mic, X, Volume2, Heart } from 'lucide-react'
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

// ================================================================================
// Favorites persistence (localStorage)
// ================================================================================

const FAVORITES_KEY = 'sceneflow-voice-favorites'

function loadFavorites(): Set<string> {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(FAVORITES_KEY) : null
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function saveFavorites(ids: Set<string>) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]))
    }
  } catch {
    // Silent fail
  }
}

// ================================================================================
// Voice consistency persistence (localStorage)
// ================================================================================

const VOICE_HISTORY_KEY = 'sceneflow-voice-history'

export interface VoiceHistoryEntry {
  voiceId: string
  voiceName: string
  characterName: string
  timestamp: number
}

function loadVoiceHistory(): VoiceHistoryEntry[] {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(VOICE_HISTORY_KEY) : null
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveVoiceHistory(entry: VoiceHistoryEntry) {
  try {
    if (typeof window === 'undefined') return
    const history = loadVoiceHistory()
    // Keep last 50 entries, deduplicate by character
    const filtered = history.filter(h => h.characterName !== entry.characterName)
    filtered.unshift(entry)
    localStorage.setItem(VOICE_HISTORY_KEY, JSON.stringify(filtered.slice(0, 50)))
  } catch {
    // Silent fail
  }
}

// ================================================================================
// Dialog Props
// ================================================================================

export type VoiceSelectionMode = 'character' | 'narrator' | 'browse'

interface VoiceSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: 'elevenlabs' | 'google'
  selectedVoiceId?: string
  onSelectVoice: (voiceId: string, voiceName: string) => void
  /** Controls which view to show */
  mode?: VoiceSelectionMode
  characterContext?: CharacterContext
  screenplayContext?: ScreenplayContext
  apiKey?: string
  /** Default use case filter (e.g., 'narrative', 'conversational', 'characters') */
  defaultUseCaseFilter?: string
}

// ================================================================================
// Component
// ================================================================================

export function VoiceSelectionDialog({
  open,
  onOpenChange,
  provider,
  selectedVoiceId,
  onSelectVoice,
  mode = 'character',
  characterContext,
  screenplayContext,
  apiKey,
  defaultUseCaseFilter = 'all'
}: VoiceSelectionDialogProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse')
  const [createTab, setCreateTab] = useState<'design' | 'clone'>('design')
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
  const [showCustomOnly, setShowCustomOnly] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<VoiceRecommendation[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  // Load favorites on mount
  useEffect(() => {
    setFavoriteIds(loadFavorites())
  }, [])

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
        console.warn(`[VoiceSelectionDialog] Provider ${provider} not available:`, data.error)
        setVoices([])
      }
    } catch (err) {
      console.error('Failed to fetch voices:', err)
      setVoices([])
    } finally {
      setLoading(false)
    }
  }

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

  // ---- Favorites ----
  const toggleFavorite = useCallback((voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFavoriteIds(prev => {
      const next = new Set(prev)
      if (next.has(voiceId)) {
        next.delete(voiceId)
      } else {
        next.add(voiceId)
      }
      saveFavorites(next)
      return next
    })
  }, [])

  // ---- Filter options (only gender for the simplified UI) ----
  const genderOptions = useMemo(() => {
    const genders = new Set<string>()
    voices.forEach(v => { if (v.gender) genders.add(v.gender) })
    return Array.from(genders).sort()
  }, [voices])

  // ---- Filtered + searched voices ----
  const filteredVoices = useMemo(() => {
    let result = voices

    // Apply intelligent search if query exists
    if (debouncedQuery) {
      result = searchVoicesIntelligently(result, debouncedQuery, characterContext, screenplayContext)
    }

    // Gender toggle
    if (genderFilter !== 'all') {
      result = result.filter(v => v.gender === genderFilter)
    }

    // Custom voices toggle
    if (showCustomOnly) {
      result = result.filter(v => v.category === 'cloned')
    }

    // Favorites only
    if (showFavoritesOnly) {
      result = result.filter(v => favoriteIds.has(v.id))
    }

    // Sort: favorites first → recommended → score → gender match → category → alpha
    return result.sort((a, b) => {
      // Favorites at top
      const favA = favoriteIds.has(a.id) ? 1 : 0
      const favB = favoriteIds.has(b.id) ? 1 : 0
      if (favA !== favB) return favB - favA

      const scoreA = getRecommendationScore(a.id)
      const scoreB = getRecommendationScore(b.id)
      if (scoreA !== scoreB) return scoreB - scoreA

      const recA = recommendedVoiceIds.has(a.id) ? 1 : 0
      const recB = recommendedVoiceIds.has(b.id) ? 1 : 0
      if (recA !== recB) return recB - recA

      // Gender match
      if (characterContext?.gender) {
        const cg = characterContext.gender.toLowerCase()
        const gA = a.gender?.toLowerCase() === cg ? 1 : 0
        const gB = b.gender?.toLowerCase() === cg ? 1 : 0
        if (gA !== gB) return gB - gA
      }

      // Professional category first
      const catA = a.category === 'professional' ? 1 : 0
      const catB = b.category === 'professional' ? 1 : 0
      if (catA !== catB) return catB - catA

      return a.name.localeCompare(b.name)
    })
  }, [voices, debouncedQuery, genderFilter, showCustomOnly, showFavoritesOnly, favoriteIds, recommendedVoiceIds, getRecommendationScore, characterContext, screenplayContext])

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
    // Persist to voice history for consistency tracking
    if (characterContext?.name) {
      saveVoiceHistory({
        voiceId,
        voiceName,
        characterName: characterContext.name,
        timestamp: Date.now()
      })
    }
    onSelectVoice(voiceId, voiceName)
    onOpenChange(false)
  }

  const handleVoiceCreated = (voiceId: string, voiceName: string) => {
    fetchVoices()
    onSelectVoice(voiceId, voiceName)
    onOpenChange(false)
  }

  // ---- Dialog title / description ----
  const dialogTitle = useMemo(() => {
    if (mode === 'narrator') return 'Select Narrator Voice'
    if (characterContext?.name) return `Select Voice for ${characterContext.name}`
    return 'Browse Voices'
  }, [mode, characterContext])

  const dialogDesc = useMemo(() => {
    if (mode === 'narrator') return 'Choose a voice for your project narration.'
    if (characterContext) return 'Choose a voice that matches your character, or create a custom one.'
    return 'Browse and select a voice from our library.'
  }, [mode, characterContext])

  // Whether to show the Create tab (not for browse-only mode)
  const showCreateTab = mode === 'character' || mode === 'narrator'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle 
            className="flex items-center gap-1.5 font-medium text-gray-200"
            style={{ fontSize: '15px', lineHeight: '1.3' }}
          >
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription 
            className="text-gray-400"
            style={{ fontSize: '12px', lineHeight: '1.4' }}
          >
            {dialogDesc}
          </DialogDescription>
        </DialogHeader>

        {showCreateTab ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'browse' | 'create')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="shrink-0 h-8 bg-transparent border-b border-gray-700 rounded-none p-0 gap-6">
              <TabsTrigger 
                value="browse" 
                className="font-medium text-gray-300 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 bg-transparent rounded-none px-0 pb-2"
                style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', minWidth: '120px' }}
              >
                <span className="inline-flex items-center gap-1.5"><Search className="w-3 h-3 shrink-0" />Browse Voices</span>
              </TabsTrigger>
              <TabsTrigger 
                value="create" 
                className="font-medium text-gray-300 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 bg-transparent rounded-none px-0 pb-2"
                style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', minWidth: '120px' }}
              >
                <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3 shrink-0" />Create Custom</span>
              </TabsTrigger>
            </TabsList>

            {/* Browse Tab */}
            <TabsContent value="browse" className="flex-1 overflow-hidden flex flex-col mt-4">
              <BrowseVoiceContent
                voices={voices}
                loading={loading}
                filteredVoices={filteredVoices}
                recommendations={recommendations}
                recommendedVoiceIds={recommendedVoiceIds}
                getRecommendationScore={getRecommendationScore}
                selectedVoiceId={selectedVoiceId}
                searchQuery={searchQuery}
                debouncedQuery={debouncedQuery}
                genderFilter={genderFilter}
                genderOptions={genderOptions}
                showCustomOnly={showCustomOnly}
                showFavoritesOnly={showFavoritesOnly}
                favoriteIds={favoriteIds}
                playingVoiceId={playingVoiceId}
                characterContext={characterContext}
                onSearchChange={setSearchQuery}
                onGenderFilterChange={setGenderFilter}
                onToggleCustomOnly={() => setShowCustomOnly(p => !p)}
                onToggleFavoritesOnly={() => setShowFavoritesOnly(p => !p)}
                onToggleFavorite={toggleFavorite}
                onPreview={handlePreview}
                onSelect={handleSelectVoice}
                onRefresh={fetchVoices}
              />
            </TabsContent>

            {/* Create Tab */}
            <TabsContent value="create" className="flex-1 overflow-y-auto mt-4">
              <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as 'design' | 'clone')} className="h-full">
                <TabsList className="mb-3 h-8 bg-transparent border-b border-gray-700 rounded-none p-0 gap-6">
                  <TabsTrigger 
                    value="design" 
                    className="font-medium text-gray-300 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-purple-500 bg-transparent rounded-none px-0 pb-2"
                    style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', minWidth: '120px' }}
                  >
                    <span className="inline-flex items-center gap-1.5"><Wand2 className="w-3 h-3 shrink-0" />AI Voice Design</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="clone" 
                    className="font-medium text-gray-300 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-purple-500 bg-transparent rounded-none px-0 pb-2"
                    style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', minWidth: '100px' }}
                  >
                    <span className="inline-flex items-center gap-1.5"><Mic className="w-3 h-3 shrink-0" />Clone Voice</span>
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
        ) : (
          /* Browse-only mode (no Create tab) */
          <div className="flex-1 overflow-hidden flex flex-col mt-4">
            <BrowseVoiceContent
              voices={voices}
              loading={loading}
              filteredVoices={filteredVoices}
              recommendations={recommendations}
              recommendedVoiceIds={recommendedVoiceIds}
              getRecommendationScore={getRecommendationScore}
              selectedVoiceId={selectedVoiceId}
              searchQuery={searchQuery}
              debouncedQuery={debouncedQuery}
              genderFilter={genderFilter}
              genderOptions={genderOptions}
              showCustomOnly={showCustomOnly}
              showFavoritesOnly={showFavoritesOnly}
              favoriteIds={favoriteIds}
              playingVoiceId={playingVoiceId}
              characterContext={characterContext}
              onSearchChange={setSearchQuery}
              onGenderFilterChange={setGenderFilter}
              onToggleCustomOnly={() => setShowCustomOnly(p => !p)}
              onToggleFavoritesOnly={() => setShowFavoritesOnly(p => !p)}
              onToggleFavorite={toggleFavorite}
              onPreview={handlePreview}
              onSelect={handleSelectVoice}
              onRefresh={fetchVoices}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ================================================================================
// Browse Voice Content — extracted to avoid duplication between tabbed/untabbed
// ================================================================================

interface BrowseVoiceContentProps {
  voices: ElevenLabsVoice[]
  loading: boolean
  filteredVoices: ElevenLabsVoice[]
  recommendations: VoiceRecommendation[]
  recommendedVoiceIds: Set<string>
  getRecommendationScore: (voiceId: string) => number
  selectedVoiceId?: string
  searchQuery: string
  debouncedQuery: string
  genderFilter: string
  genderOptions: string[]
  showCustomOnly: boolean
  showFavoritesOnly: boolean
  favoriteIds: Set<string>
  playingVoiceId: string | null
  characterContext?: CharacterContext
  onSearchChange: (q: string) => void
  onGenderFilterChange: (g: string) => void
  onToggleCustomOnly: () => void
  onToggleFavoritesOnly: () => void
  onToggleFavorite: (voiceId: string, e: React.MouseEvent) => void
  onPreview: (voice: ElevenLabsVoice) => void
  onSelect: (voiceId: string, voiceName: string) => void
  onRefresh: () => void
}

function BrowseVoiceContent({
  voices,
  loading,
  filteredVoices,
  recommendations,
  recommendedVoiceIds,
  getRecommendationScore,
  selectedVoiceId,
  searchQuery,
  debouncedQuery,
  genderFilter,
  genderOptions,
  showCustomOnly,
  showFavoritesOnly,
  favoriteIds,
  playingVoiceId,
  characterContext,
  onSearchChange,
  onGenderFilterChange,
  onToggleCustomOnly,
  onToggleFavoritesOnly,
  onToggleFavorite,
  onPreview,
  onSelect,
  onRefresh,
}: BrowseVoiceContentProps) {

  const hasActiveFilters = genderFilter !== 'all' || showCustomOnly || showFavoritesOnly

  return (
    <>
      {/* AI Recommendations Section */}
      {recommendations.length > 0 && !debouncedQuery && (
        <div className="mb-4 shrink-0">
          <div className="flex items-center mb-2">
            <h4 className="text-[13px] font-medium text-gray-300 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              Recommended for {characterContext?.name}
            </h4>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recommendations.slice(0, 3).map((rec) => {
              const voice = voices.find(v => v.id === rec.voiceId)
              if (!voice) return null
              
              return (
                <div
                  key={rec.voiceId}
                  onClick={() => onSelect(rec.voiceId, rec.voiceName)}
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => onToggleFavorite(rec.voiceId, e)}
                        className="p-1 rounded hover:bg-gray-700/50"
                      >
                        <Heart className={`w-3 h-3 ${favoriteIds.has(rec.voiceId) ? 'fill-red-400 text-red-400' : 'text-gray-500'}`} />
                      </button>
                      {voice.previewUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onPreview(voice)
                          }}
                          className="p-1 rounded hover:bg-gray-700/50"
                        >
                          <Play className={`w-3 h-3 ${playingVoiceId === rec.voiceId ? 'animate-pulse text-blue-400' : 'text-gray-400'}`} />
                        </button>
                      )}
                    </div>
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

      {/* Smart Search + Filter Bar */}
      <div className="space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder={characterContext 
              ? `Search for "${characterContext.name}" style voices — try "warm baritone" or "young energetic"` 
              : 'Search voices — try "warm female" or "deep narrator"'
            }
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-gray-900 border border-gray-700 rounded text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Compact filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Gender toggle pills */}
          {genderOptions.length > 1 && (
            <div className="flex gap-1">
              <button
                onClick={() => onGenderFilterChange('all')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  genderFilter === 'all'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'text-gray-400 hover:text-gray-300 border border-gray-700 hover:border-gray-600'
                }`}
              >
                All
              </button>
              {genderOptions.map(g => (
                <button
                  key={g}
                  onClick={() => onGenderFilterChange(genderFilter === g ? 'all' : g)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors capitalize ${
                    genderFilter === g
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'text-gray-400 hover:text-gray-300 border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          <div className="w-px h-4 bg-gray-700" />

          {/* Custom Voices toggle */}
          <button
            onClick={onToggleCustomOnly}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              showCustomOnly
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-gray-400 hover:text-gray-300 border border-gray-700 hover:border-gray-600'
            }`}
          >
            Custom Voices
          </button>

          {/* Favorites toggle */}
          <button
            onClick={onToggleFavoritesOnly}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1 ${
              showFavoritesOnly
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'text-gray-400 hover:text-gray-300 border border-gray-700 hover:border-gray-600'
            }`}
          >
            <Heart className={`w-3 h-3 ${showFavoritesOnly ? 'fill-red-300' : ''}`} />
            Favorites
          </button>

          <div className="flex-1" />

          <button
            onClick={onRefresh}
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
            {searchQuery || hasActiveFilters
              ? 'No voices match your search'
              : 'No voices available'
            }
          </div>
        ) : (
          filteredVoices.map(voice => {
            const isRecommended = recommendedVoiceIds.has(voice.id)
            const recScore = getRecommendationScore(voice.id)
            const isCustom = voice.category === 'cloned'
            const isFavorite = favoriteIds.has(voice.id)
            
            return (
              <div
                key={voice.id}
                onClick={() => onSelect(voice.id, voice.name)}
                className={`
                  group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all
                  ${voice.id === selectedVoiceId
                    ? 'bg-blue-600/20 border border-blue-500/50'
                    : isRecommended
                      ? 'bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10'
                      : isCustom
                        ? 'bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10'
                        : 'bg-gray-900/50 border border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isRecommended && (
                      <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                    )}
                    {isCustom && !isRecommended && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300">
                        Custom
                      </span>
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
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {/* Favorite button */}
                  <button
                    onClick={(e) => onToggleFavorite(voice.id, e)}
                    className={`p-1.5 rounded hover:bg-gray-700/50 transition-colors ${
                      isFavorite ? 'text-red-400' : 'text-gray-600 opacity-0 group-hover:opacity-100'
                    }`}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-red-400' : ''}`} />
                  </button>

                  {/* Preview button */}
                  {voice.previewUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onPreview(voice)
                      }}
                      disabled={playingVoiceId === voice.id}
                      className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 disabled:opacity-50"
                      title="Preview voice"
                    >
                      <Play className={`h-3.5 w-3.5 ${playingVoiceId === voice.id ? 'animate-pulse' : ''}`} />
                    </button>
                  )}
                </div>
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
    </>
  )
}
