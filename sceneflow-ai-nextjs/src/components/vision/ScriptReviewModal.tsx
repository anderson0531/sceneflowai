'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Film, Users, Star, Download, RefreshCw, Loader, Volume2, VolumeX, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Voice {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string>
}

// Recommendation can be either a string (legacy) or an object with text, priority, category
type RecommendationItem = string | { text: string; priority: 'critical' | 'high' | 'medium' | 'optional'; category: string }

interface Review {
  overallScore: number
  categories: {
    name: string
    score: number
  }[]
  analysis: string
  strengths: string[]
  improvements: string[]
  recommendations: RecommendationItem[]
  generatedAt: string
}

// Helper to extract text from a recommendation (handles both string and object formats)
const getRecommendationText = (rec: RecommendationItem): string => {
  return typeof rec === 'string' ? rec : rec.text
}

// Helper to get priority color
const getPriorityColor = (priority?: string): string => {
  switch (priority) {
    case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
    case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
    case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
    case 'optional': return 'text-gray-600 bg-gray-100 dark:bg-gray-700'
    default: return ''
  }
}

interface ScriptReviewModalProps {
  isOpen: boolean
  onClose: () => void
  directorReview: Review | null
  audienceReview: Review | null
  onRegenerate: () => void
  isGenerating: boolean
  onReviseScript?: (recommendations: string[]) => void
}

export default function ScriptReviewModal({
  isOpen,
  onClose,
  directorReview,
  audienceReview,
  onRegenerate,
  isGenerating,
  onReviseScript
}: ScriptReviewModalProps) {
  const [activeTab, setActiveTab] = useState<'director' | 'audience'>('director')
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('pNInz6obpgDQGcFmaJgB') // Adam default
  const [playingSection, setPlayingSection] = useState<string | null>(null)
  const [loadingSection, setLoadingSection] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Audio cache: maps sectionId to { url: string, voiceId: string, textHash: string }
  const audioCacheRef = useRef<Map<string, { url: string; voiceId: string; textHash: string }>>(new Map())
  
  // Simple hash function for text comparison
  const hashText = (text: string): string => {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(36)
  }

  // Fetch ElevenLabs voices on mount
  useEffect(() => {
    if (isOpen) {
      fetchVoices()
    }
    return () => {
      // Cleanup audio on unmount
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [isOpen])

  const fetchVoices = async () => {
    try {
      const res = await fetch('/api/tts/elevenlabs/voices', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setVoices(data.voices || [])
      }
    } catch (err) {
      console.error('Failed to fetch voices:', err)
    }
  }

  // Check if we have a valid cached audio for this section
  const getCachedAudio = (sectionId: string, text: string): string | null => {
    const cached = audioCacheRef.current.get(sectionId)
    if (!cached) return null
    
    const textHash = hashText(text)
    // Cache is valid if same voice and same text
    if (cached.voiceId === selectedVoiceId && cached.textHash === textHash) {
      return cached.url
    }
    return null
  }

  // Store audio in cache
  const cacheAudio = (sectionId: string, text: string, url: string) => {
    audioCacheRef.current.set(sectionId, {
      url,
      voiceId: selectedVoiceId,
      textHash: hashText(text)
    })
  }

  // Check if section has cached audio
  const hasCachedAudio = (sectionId: string, text: string): boolean => {
    return getCachedAudio(sectionId, text) !== null
  }

  const playSection = async (sectionId: string, text: string, forceRegenerate = false) => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    // If clicking same section, just stop
    if (playingSection === sectionId) {
      setPlayingSection(null)
      return
    }

    // Check cache first (unless force regenerating)
    const cachedUrl = !forceRegenerate ? getCachedAudio(sectionId, text) : null
    
    if (cachedUrl) {
      // Play from cache - instant playback!
      audioRef.current = new Audio(cachedUrl)
      audioRef.current.onended = () => setPlayingSection(null)
      audioRef.current.onerror = () => {
        setPlayingSection(null)
        // Remove from cache if playback fails
        audioCacheRef.current.delete(sectionId)
      }
      await audioRef.current.play()
      setPlayingSection(sectionId)
      return
    }

    setLoadingSection(sectionId)
    try {
      const response = await fetch('/api/tts/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: selectedVoiceId,
          parallel: true, // Enable parallel paragraph processing for faster TTS
          stability: 0.5,
          similarityBoost: 0.75
        })
      })

      if (!response.ok) throw new Error('TTS failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // Cache the generated audio
      cacheAudio(sectionId, text, url)
      
      audioRef.current = new Audio(url)
      audioRef.current.onended = () => setPlayingSection(null)
      audioRef.current.onerror = () => setPlayingSection(null)
      
      await audioRef.current.play()
      setPlayingSection(sectionId)
    } catch (err) {
      console.error('TTS error:', err)
    } finally {
      setLoadingSection(null)
    }
  }

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingSection(null)
  }

  const AudioButton = ({ sectionId, text }: { sectionId: string; text: string }) => {
    const isPlaying = playingSection === sectionId
    const isLoading = loadingSection === sectionId
    const isCached = hasCachedAudio(sectionId, text)

    return (
      <div className="flex items-center gap-0.5">
        {/* Play/Stop Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => playSection(sectionId, text, false)}
          disabled={isLoading}
          className="h-7 w-7 p-0"
          title={isPlaying ? 'Stop' : isCached ? 'Play (cached)' : 'Generate & play audio'}
        >
          {isLoading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <VolumeX className="w-4 h-4 text-red-500" />
          ) : (
            <Volume2 className={`w-4 h-4 ${isCached ? 'text-green-500' : 'text-blue-500'}`} />
          )}
        </Button>
        {/* Regenerate Button - only show if cached */}
        {isCached && !isPlaying && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => playSection(sectionId, text, true)}
            disabled={isLoading}
            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
            title="Regenerate audio"
          >
            <RefreshCw className="w-3 h-3 text-gray-400" />
          </Button>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 75) return 'text-blue-600 dark:text-blue-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBgColor = (score: number): string => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 75) return 'bg-blue-100 dark:bg-blue-900/30'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  const renderReview = (review: Review | null, type: 'director' | 'audience') => {
    if (!review) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {type} review available</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              {type === 'director' ? (
                <Film className="w-5 h-5" />
              ) : (
                <Users className="w-5 h-5" />
              )}
              {type === 'director' ? "Director's Perspective" : "Audience Perspective"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(review.overallScore)}`}>
                {review.overallScore}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">out of 100</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${review.overallScore}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Generated {new Date(review.generatedAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {review.categories.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{category.name}</span>
                    <span className={`text-sm font-semibold ${getScoreColor(category.score)}`}>
                      {category.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${category.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analysis */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">💡 Analysis</CardTitle>
            <AudioButton sectionId={`${type}-analysis`} text={review.analysis} />
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {review.analysis}
            </p>
          </CardContent>
        </Card>

        {/* Strengths */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">✨ Strengths</CardTitle>
            <AudioButton sectionId={`${type}-strengths`} text={`Strengths: ${review.strengths.join('. ')}`} />
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {review.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-1">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">⚠️ Areas for Improvement</CardTitle>
            <AudioButton sectionId={`${type}-improvements`} text={`Areas for improvement: ${review.improvements.join('. ')}`} />
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {review.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">🎯 Recommendations</CardTitle>
            <div className="flex items-center gap-2">
              <AudioButton sectionId={`${type}-recommendations`} text={`Recommendations: ${review.recommendations.map(r => getRecommendationText(r)).join('. ')}`} />
              {onReviseScript && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onReviseScript(review.recommendations.map(r => getRecommendationText(r)))}
                  className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Wand2 className="w-3 h-3" />
                  Revise Script
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {review.recommendations.map((recommendation, index) => {
                const isObject = typeof recommendation !== 'string'
                const text = getRecommendationText(recommendation)
                const priority = isObject ? recommendation.priority : undefined
                const category = isObject ? recommendation.category : undefined
                
                return (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500 mt-1 flex-shrink-0">•</span>
                    <div className="flex-1">
                      <span>{text}</span>
                      {(priority || category) && (
                        <div className="flex gap-2 mt-1">
                          {priority && (
                            <Badge variant="secondary" className={`text-xs ${getPriorityColor(priority)}`}>
                              {priority}
                            </Badge>
                          )}
                          {category && (
                            <Badge variant="outline" className="text-xs">
                              {category}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  const exportAsPDF = () => {
    // TODO: Implement PDF export functionality
    console.log('Export as PDF functionality to be implemented')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Script Review & Analysis</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportAsPDF}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
              onClick={onRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                stopPlayback()
                onClose()
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          </div>
          
          {/* Voice Selector Row */}
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Playback Voice:</span>
            <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {voices.map((voice) => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {playingSection && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopPlayback}
                className="flex items-center gap-1 text-red-500 border-red-300"
              >
                <VolumeX className="w-3 h-3" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'director' | 'audience')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="director" className="flex items-center gap-2">
                <Film className="w-4 h-4" />
                Director ({directorReview?.overallScore || 'N/A'})
              </TabsTrigger>
              <TabsTrigger value="audience" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Audience ({audienceReview?.overallScore || 'N/A'})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="director">
              {renderReview(directorReview, 'director')}
            </TabsContent>

            <TabsContent value="audience">
              {renderReview(audienceReview, 'audience')}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
