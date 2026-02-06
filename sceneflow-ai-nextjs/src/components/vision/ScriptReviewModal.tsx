'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Users, Star, Download, RefreshCw, Loader, Volume2, VolumeX, Wand2, AlertTriangle, ChevronDown, ChevronUp, Target, TrendingDown, TrendingUp, Settings2, Check, Square, CheckSquare, BarChart3, MessageSquare, ListChecks, Film } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VoiceSelectorDialog } from '@/components/tts/VoiceSelectorDialog'
import { useProcessWithOverlay } from '@/hooks/useProcessWithOverlay'
import { toast } from 'sonner'
import type { CharacterContext } from '@/lib/voiceRecommendation'

interface Voice {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string>
}

// LocalStorage key for persisting voice selection
const REVIEW_VOICE_STORAGE_KEY = 'sceneflow-audience-resonance-voice'

// Recommendation can be either a string (legacy) or an object with text, priority, category
type RecommendationItem = string | { text: string; priority: 'critical' | 'high' | 'medium' | 'optional'; category: string }

interface Deduction {
  reason: string
  points: number
  category: string
}

interface SceneAnalysis {
  sceneNumber: number
  sceneHeading: string
  score: number
  pacing: 'slow' | 'moderate' | 'fast'
  tension: 'low' | 'medium' | 'high'
  characterDevelopment: 'minimal' | 'moderate' | 'strong'
  visualPotential: 'low' | 'medium' | 'high'
  notes: string
}

interface AudienceResonanceReview {
  overallScore: number
  baseScore?: number
  deductions?: Deduction[]
  categories: {
    name: string
    score: number
    weight?: number
  }[]
  showVsTellRatio?: number
  analysis: string
  strengths: string[]
  improvements: string[]
  recommendations: RecommendationItem[]
  sceneAnalysis?: SceneAnalysis[]
  targetDemographic?: string
  emotionalImpact?: string
  generatedAt: string
}

// Legacy Review interface for backward compatibility
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

// Helper to extract text from a recommendation
const getRecommendationText = (rec: RecommendationItem): string => {
  return typeof rec === 'string' ? rec : rec.text
}

// Helper to safely extract text from any item (string, object with text, or other)
const safeGetText = (item: any): string => {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    if (typeof item.text === 'string') return item.text
    if (typeof item.reason === 'string') return item.reason
    if (typeof item.message === 'string') return item.message
    // Fallback: stringify the object
    return JSON.stringify(item)
  }
  return String(item ?? '')
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

// Radar Chart Component for dimensional scores
function RadarChart({ categories }: { categories: { name: string; score: number; weight?: number }[] }) {
  const size = 280
  const center = size / 2
  const radius = 100
  const levels = 5

  // Calculate points for each category
  const angleStep = (2 * Math.PI) / categories.length
  
  // Generate polygon points for each level (grid lines)
  const getLevelPoints = (level: number) => {
    const levelRadius = (radius * level) / levels
    return categories.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2
      return {
        x: center + levelRadius * Math.cos(angle),
        y: center + levelRadius * Math.sin(angle)
      }
    })
  }

  // Generate data polygon points
  const dataPoints = categories.map((cat, i) => {
    const angle = i * angleStep - Math.PI / 2
    const normalizedScore = (cat.score / 100) * radius
    return {
      x: center + normalizedScore * Math.cos(angle),
      y: center + normalizedScore * Math.sin(angle)
    }
  })

  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e' // green
    if (score >= 70) return '#3b82f6' // blue  
    if (score >= 60) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  const avgScore = categories.reduce((sum, c) => sum + c.score, 0) / categories.length
  const fillColor = getScoreColor(avgScore)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background levels */}
        {[1, 2, 3, 4, 5].map(level => {
          const points = getLevelPoints(level)
          const polygon = points.map(p => `${p.x},${p.y}`).join(' ')
          return (
            <polygon
              key={level}
              points={polygon}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
            />
          )
        })}

        {/* Axis lines */}
        {categories.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2
          const endX = center + radius * Math.cos(angle)
          const endY = center + radius * Math.sin(angle)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={endX}
              y2={endY}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={1}
            />
          )
        })}

        {/* Data polygon */}
        <polygon
          points={dataPolygon}
          fill={fillColor}
          fillOpacity={0.25}
          stroke={fillColor}
          strokeWidth={2}
        />

        {/* Data points */}
        {dataPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={fillColor}
          />
        ))}

        {/* Labels */}
        {categories.map((cat, i) => {
          const angle = i * angleStep - Math.PI / 2
          const labelRadius = radius + 35
          const x = center + labelRadius * Math.cos(angle)
          const y = center + labelRadius * Math.sin(angle)
          
          // Shorten category names
          const shortName = cat.name
            .replace('Dialogue Subtext', 'Dialogue')
            .replace('Structural Integrity', 'Structure')
            .replace('Emotional Arc', 'Emotion')
            .replace('Visual Storytelling', 'Visual')
            .replace('Pacing & Rhythm', 'Pacing')
            .replace('Show vs Tell Ratio', 'Show/Tell')

          return (
            <g key={i}>
              <text
                x={x}
                y={y - 8}
                textAnchor="middle"
                className="fill-current text-xs font-medium"
              >
                {shortName}
              </text>
              <text
                x={x}
                y={y + 8}
                textAnchor="middle"
                className={`text-xs font-bold ${
                  cat.score >= 70 ? 'fill-green-600 dark:fill-green-400' :
                  cat.score >= 50 ? 'fill-yellow-600 dark:fill-yellow-400' :
                  'fill-red-600 dark:fill-red-400'
                }`}
              >
                {cat.score}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

interface ScriptReviewModalProps {
  isOpen: boolean
  onClose: () => void
  directorReview: Review | null // Deprecated, kept for compatibility
  audienceReview: AudienceResonanceReview | Review | null
  onRegenerate: () => void
  isGenerating: boolean
  onReviseScript?: (recommendations: string[]) => void
  // New props for inline revision
  projectId?: string
  script?: any
  characters?: any[]
  onScriptOptimized?: (optimizedScript: any) => void
  // Score outdated indicator
  scoreOutdated?: boolean
  // Review history for score trend
  reviewHistory?: Array<{ score: number; generatedAt: string; dimensionalScores?: any[] }>
}

type ReviewTab = 'overview' | 'feedback' | 'recommendations' | 'scenes'

export default function ScriptReviewModal({
  isOpen,
  onClose,
  directorReview, // No longer used - user is the director
  audienceReview,
  onRegenerate,
  isGenerating,
  onReviseScript,
  projectId,
  script,
  characters,
  onScriptOptimized,
  scoreOutdated,
  reviewHistory = []
}: ScriptReviewModalProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [activeTab, setActiveTab] = useState<ReviewTab>('overview')
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(REVIEW_VOICE_STORAGE_KEY)
        if (stored) {
          const { voiceId } = JSON.parse(stored)
          if (voiceId) return voiceId
        }
      } catch (e) {
        console.warn('Failed to load review voice from localStorage:', e)
      }
    }
    return 'CwhRBWXzGAHq8TQ4Fs17' // Roger - professional narrator (default)
  })
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(REVIEW_VOICE_STORAGE_KEY)
        if (stored) {
          const { voiceName } = JSON.parse(stored)
          if (voiceName) return voiceName
        }
      } catch (e) {
        // Already warned above
      }
    }
    return 'Roger'
  })
  const [voiceSelectorOpen, setVoiceSelectorOpen] = useState(false)
  const [playingSection, setPlayingSection] = useState<string | null>(null)
  const [loadingSection, setLoadingSection] = useState<string | null>(null)
  const [showDeductions, setShowDeductions] = useState(false)
  const [showSceneAnalysis, setShowSceneAnalysis] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCacheRef = useRef<Map<string, { url: string; voiceId: string; textHash: string }>>(new Map())

  // State for inline revision with selectable recommendations
  const [selectedRecommendationIndices, setSelectedRecommendationIndices] = useState<Set<number>>(new Set())
  const [isRevising, setIsRevising] = useState(false)
  const { execute } = useProcessWithOverlay()

  // Character context for Review Expert voice recommendations
  // Voices that match: authoritative, mature, professional narrators
  const reviewExpertContext: CharacterContext = {
    name: 'Review Expert',
    role: 'narrator',
    gender: 'male',
    age: 'middle',
    personality: 'authoritative, knowledgeable, articulate, measured, insightful',
    description: 'A trusted film critic and screenplay analyst with decades of experience. Speaks with clarity and gravitas, like a seasoned documentary narrator or respected film reviewer. Professional, warm but analytical tone.'
  }

  // Handle voice selection from dialog
  const handleVoiceSelect = (voiceId: string, voiceName: string) => {
    setSelectedVoiceId(voiceId)
    setSelectedVoiceName(voiceName)
    setVoiceSelectorOpen(false)
    // Clear audio cache since voice changed
    audioCacheRef.current.clear()
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(REVIEW_VOICE_STORAGE_KEY, JSON.stringify({ voiceId, voiceName }))
      } catch (e) {
        console.warn('Failed to save review voice to localStorage:', e)
      }
    }
  }

  const hashText = (text: string): string => {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  useEffect(() => {
    if (isOpen) {
      fetchVoices()
    }
    return () => {
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
        const voiceList = data.voices || []
        setVoices(voiceList)
        // Verify persisted/default voice exists and update name
        if (voiceList.length > 0) {
          const currentVoice = voiceList.find((v: Voice) => v.voice_id === selectedVoiceId)
          if (currentVoice) {
            // Voice exists, just ensure name is correct
            setSelectedVoiceName(currentVoice.name)
          } else {
            // Persisted voice not found - fallback to Roger or first available
            console.log('Selected voice not in list, using fallback voice')
            const roger = voiceList.find((v: Voice) => v.name === 'Roger' || v.voice_id === 'CwhRBWXzGAHq8TQ4Fs17')
            const fallback = roger || voiceList[0]
            if (fallback) {
              setSelectedVoiceId(fallback.voice_id)
              setSelectedVoiceName(fallback.name)
              // Update localStorage with the valid fallback
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem(REVIEW_VOICE_STORAGE_KEY, JSON.stringify({ 
                    voiceId: fallback.voice_id, 
                    voiceName: fallback.name 
                  }))
                } catch (e) {
                  // Ignore storage errors
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch voices:', err)
    }
  }

  const getCachedAudio = (sectionId: string, text: string): string | null => {
    const cached = audioCacheRef.current.get(sectionId)
    if (!cached) return null
    const textHash = hashText(text)
    if (cached.voiceId === selectedVoiceId && cached.textHash === textHash) {
      return cached.url
    }
    return null
  }

  const cacheAudio = (sectionId: string, text: string, url: string) => {
    audioCacheRef.current.set(sectionId, {
      url,
      voiceId: selectedVoiceId,
      textHash: hashText(text)
    })
  }

  const hasCachedAudio = (sectionId: string, text: string): boolean => {
    return getCachedAudio(sectionId, text) !== null
  }

  const playSection = async (sectionId: string, text: string, forceRegenerate = false) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    if (playingSection === sectionId) {
      setPlayingSection(null)
      return
    }

    const cachedUrl = !forceRegenerate ? getCachedAudio(sectionId, text) : null
    
    if (cachedUrl) {
      audioRef.current = new Audio(cachedUrl)
      audioRef.current.onended = () => setPlayingSection(null)
      audioRef.current.onerror = () => {
        setPlayingSection(null)
        audioCacheRef.current.delete(sectionId)
      }
      await audioRef.current.play()
      setPlayingSection(sectionId)
      return
    }

    setLoadingSection(sectionId)
    try {
      // Determine the voice to use
      let voiceToUse = selectedVoiceId
      
      // If no voice selected, use default Roger
      if (!voiceToUse) {
        voiceToUse = 'CwhRBWXzGAHq8TQ4Fs17' // Roger - default
        console.log('No voice in state, using default Roger')
      }
      
      // Verify voice exists in list (if list is loaded)
      if (voices.length > 0) {
        const voiceExists = voices.some(v => v.voice_id === voiceToUse)
        if (!voiceExists) {
          console.warn('Selected voice not in list, using first available voice')
          voiceToUse = voices[0].voice_id
          setSelectedVoiceId(voiceToUse)
        }
      }
      
      const response = await fetch('/api/tts/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: voiceToUse,
          parallel: true,
          stability: 0.5,
          similarityBoost: 0.75
        })
      })

      if (!response.ok) throw new Error('TTS failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
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

  // Initialize all recommendations as selected when review loads
  useEffect(() => {
    if (audienceReview && 'recommendations' in audienceReview && audienceReview.recommendations.length > 0) {
      const allIndices = new Set(audienceReview.recommendations.map((_, i) => i))
      setSelectedRecommendationIndices(allIndices)
    }
  }, [audienceReview])

  // Toggle recommendation selection
  const toggleRecommendation = (index: number) => {
    setSelectedRecommendationIndices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  // Select/deselect all recommendations
  const toggleAllRecommendations = (selectAll: boolean) => {
    if (selectAll && audienceReview && 'recommendations' in audienceReview) {
      setSelectedRecommendationIndices(new Set(audienceReview.recommendations.map((_, i) => i)))
    } else {
      setSelectedRecommendationIndices(new Set())
    }
  }

  // Inline revision handler - calls optimize-script API directly
  const handleInlineRevise = async () => {
    if (!projectId || !script || !onScriptOptimized) {
      // Fall back to legacy behavior if new props not provided
      if (onReviseScript && audienceReview && 'recommendations' in audienceReview) {
        const selectedRecs = audienceReview.recommendations
          .filter((_, i) => selectedRecommendationIndices.has(i))
          .map(r => getRecommendationText(r))
        onReviseScript(selectedRecs)
      }
      return
    }

    if (selectedRecommendationIndices.size === 0) {
      toast.error('Please select at least one recommendation to apply')
      return
    }

    // Build instruction from selected recommendations, sorted by priority and enriched with metadata
    const review = audienceReview as AudienceResonanceReview
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, optional: 3 }
    const selectedRecs = review.recommendations
      .map((r, i) => ({ rec: r, originalIndex: i }))
      .filter(({ originalIndex }) => selectedRecommendationIndices.has(originalIndex))
      .sort((a, b) => {
        const pa = typeof a.rec === 'object' ? (priorityOrder[a.rec.priority] ?? 3) : 3
        const pb = typeof b.rec === 'object' ? (priorityOrder[b.rec.priority] ?? 3) : 3
        return pa - pb
      })
    
    const instruction = selectedRecs.map(({ rec }, i) => {
      const text = getRecommendationText(rec)
      if (typeof rec === 'object' && rec.priority) {
        const tag = `[${rec.priority.toUpperCase()}${rec.category ? ` — ${rec.category}` : ''}]`
        return `${i + 1}. ${tag} ${text}`
      }
      return `${i + 1}. ${text}`
    }).join('\n\n')

    setIsRevising(true)
    try {
      await execute(
        async () => {
          let response = await fetch('/api/vision/optimize-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            script,
            instruction,
            characters: characters || [],
            audienceReview: review
          })
        })

        if (!response.ok) {
          if (response.status === 422) {
            // Retry with compact response
            toast.message('Retrying with compact optimization...')
            response = await fetch('/api/vision/optimize-script', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                script,
                instruction,
                characters: characters || [],
                compact: true,
                audienceReview: review
              })
            })
          }
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to optimize script')
          }
        }

        const data = await response.json()
        
        if (data.optimizedScript) {
          // Apply the optimized script
          onScriptOptimized(data.optimizedScript)
          toast.success(`Script revised with ${selectedRecs.length} recommendation${selectedRecs.length > 1 ? 's' : ''} applied!`)
          onClose()
        } else {
          throw new Error('No optimized script returned')
        }
      }, { 
        message: `Revising script with ${selectedRecs.length} recommendation${selectedRecs.length > 1 ? 's' : ''}...`, 
        // Batched optimization: ~4 scenes/batch, 2 parallel, ~25s/batch-pair + overhead
        // e.g. 17 scenes = 5 batches → 3 waves × 25s = 75s + 15s overhead = 90s
        // With MAX_TOKENS retries possible, allow up to 300s
        estimatedDuration: Math.min(300, Math.max(60, Math.ceil(Math.ceil((script?.scenes?.length || 10) / 4) / 2) * 25 + 15)),
        operationType: 'script-optimization'
      })
    } catch (err: any) {
      console.error('[Script Revision] Error:', err)
      toast.error(err.message || 'Failed to revise script')
    } finally {
      setIsRevising(false)
    }
  }

  if (!isOpen) return null

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 70) return 'bg-blue-100 dark:bg-blue-900/30'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Exceptional — Ready for Production'
    if (score >= 80) return 'Strong — Ready for Production'
    if (score >= 75) return 'Solid — Ready for Scene Editing'
    if (score >= 70) return 'Good — Review Recommendations'
    if (score >= 60) return 'Developing — Apply Recommendations'
    if (score >= 50) return 'Early Draft — Revisions Needed'
    return 'Concept Stage — Major Revisions Needed'
  }

  // Cast to AudienceResonanceReview for new features
  const review = audienceReview as AudienceResonanceReview | null
  const deductions = review?.deductions || []
  const sceneAnalysis = review?.sceneAnalysis || []
  const showVsTellRatio = review?.showVsTellRatio ?? 0
  const totalDeductions = deductions.reduce((sum, d) => sum + d.points, 0)

  const exportAsPDF = () => {
    console.log('Export as PDF functionality to be implemented')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-semibold">Audience Resonance Analysis</h2>
            </div>
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
                Re-analyze
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
          
          {/* Voice Selector */}
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Playback Voice:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVoiceSelectorOpen(true)}
              className="flex items-center gap-2 h-8 min-w-[180px] justify-between"
            >
              <span className="truncate">{selectedVoiceName || 'Select voice...'}</span>
              <Settings2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </Button>
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
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {!review ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 flex-1 flex flex-col items-center justify-center">
              <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No audience resonance analysis available</p>
              <p className="text-sm mt-2">Click "Re-analyze" to generate a new analysis</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReviewTab)} className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Tab Navigation */}
              <div className="px-6 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                {/* Score Outdated Banner */}
                {scoreOutdated && (
                  <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Script has been revised. Score may be outdated.</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRegenerate}
                      disabled={isGenerating}
                      className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      {isGenerating ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                      Re-analyze
                    </Button>
                  </div>
                )}
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Overview</span>
                    <span className="sm:hidden">Score</span>
                  </TabsTrigger>
                  <TabsTrigger value="feedback" className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Feedback
                  </TabsTrigger>
                  <TabsTrigger value="recommendations" className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <ListChecks className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Recommendations</span>
                    <span className="sm:hidden">Actions</span>
                    {review.recommendations.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                        {review.recommendations.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="scenes" className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <Film className="w-3.5 h-3.5" />
                    Scenes
                    {sceneAnalysis.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                        {sceneAnalysis.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Score Overview with Radar Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overall Score Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-500" />
                      Overall Resonance Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`text-5xl font-bold ${getScoreColor(review.overallScore)}`}>
                          {review.overallScore}
                        </div>
                        {/* Score trend indicator */}
                        {reviewHistory.length > 0 && (() => {
                          const previousScore = reviewHistory[0]?.score
                          const delta = review.overallScore - previousScore
                          if (delta === 0) return null
                          return (
                            <div className={`flex items-center text-sm font-medium ${delta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {delta > 0 ? (
                                <TrendingUp className="w-4 h-4 mr-1" />
                              ) : (
                                <TrendingDown className="w-4 h-4 mr-1" />
                              )}
                              {delta > 0 ? '+' : ''}{delta}
                            </div>
                          )
                        })()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {getScoreLabel(review.overallScore)}
                      </div>
                      {/* Show previous score context if available */}
                      {reviewHistory.length > 0 && reviewHistory[0]?.score !== review.overallScore && (
                        <div className="text-xs text-gray-400 mt-1">
                          Previous: {reviewHistory[0]?.score} ({new Date(reviewHistory[0]?.generatedAt).toLocaleDateString()})
                        </div>
                      )}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            review.overallScore >= 80 ? 'bg-green-500' :
                            review.overallScore >= 70 ? 'bg-blue-500' :
                            review.overallScore >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${review.overallScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Deduction Breakdown Toggle */}
                    {deductions.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <button
                          onClick={() => setShowDeductions(!showDeductions)}
                          className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium">
                              Score Breakdown: 100 → {review.overallScore}
                            </span>
                            <Badge variant="destructive" className="text-xs">
                              -{totalDeductions} points
                            </Badge>
                          </div>
                          {showDeductions ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        
                        {showDeductions && (
                          <div className="mt-3 max-h-48 overflow-y-auto space-y-2 pl-6 pr-2">
                            {deductions.map((d, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-red-500 font-mono shrink-0">-{d.points}</span>
                                <span className="text-gray-600 dark:text-gray-400 flex-1">{d.reason}</span>
                                {d.importance && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs shrink-0 ${
                                      d.importance === 'critical' ? 'border-red-500 text-red-500' :
                                      d.importance === 'high' ? 'border-orange-500 text-orange-500' :
                                      d.importance === 'medium' ? 'border-yellow-500 text-yellow-500' :
                                      'border-gray-400 text-gray-400'
                                    }`}
                                  >
                                    {d.importance}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {d.category}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show vs Tell Ratio */}
                    {showVsTellRatio > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Show vs Tell Ratio:</span>
                          <span className={`font-medium ${
                            showVsTellRatio <= 10 ? 'text-green-600' :
                            showVsTellRatio <= 15 ? 'text-blue-600' :
                            showVsTellRatio <= 25 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {showVsTellRatio.toFixed(1)}% narration
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {showVsTellRatio <= 10 ? '✓ Excellent - minimal narration' :
                           showVsTellRatio <= 15 ? '○ Good - within professional range' :
                           showVsTellRatio <= 25 ? '△ High - consider reducing narration' :
                           '✗ Excessive - significant revision needed'}
                        </div>
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                      Generated {new Date(review.generatedAt).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                {/* Radar Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Dimensional Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <RadarChart categories={review.categories} />
                  </CardContent>
                </Card>
              </div>

              {/* Target Audience & Emotional Impact */}
              {(review.targetDemographic || review.emotionalImpact) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {review.targetDemographic && (
                    <Card className="bg-purple-50 dark:bg-purple-900/20">
                      <CardContent className="pt-4">
                        <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Target Demographic</div>
                        <div className="text-sm mt-1">{review.targetDemographic}</div>
                      </CardContent>
                    </Card>
                  )}
                  {review.emotionalImpact && (
                    <Card className="bg-blue-50 dark:bg-blue-900/20">
                      <CardContent className="pt-4">
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Expected Emotional Impact</div>
                        <div className="text-sm mt-1">{review.emotionalImpact}</div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
                  </div>
                )}

                {/* Feedback Tab */}
                {activeTab === 'feedback' && (
                  <div className="space-y-6">
                    {/* Analysis */}
                    <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">💡 Analysis</CardTitle>
                  <AudioButton sectionId="analysis" text={review.analysis} />
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {review.analysis}
                  </p>
                </CardContent>
              </Card>

              {/* Strengths & Improvements Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">✨ Strengths</CardTitle>
                    <AudioButton sectionId="strengths" text={`Strengths: ${review.strengths.map(s => safeGetText(s)).join('. ')}`} />
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {review.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{safeGetText(strength)}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Improvements */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">⚠️ Areas for Improvement</CardTitle>
                    <AudioButton sectionId="improvements" text={`Areas for improvement: ${review.improvements.map(i => safeGetText(i)).join('. ')}`} />
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {review.improvements.map((improvement, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-yellow-500 mt-1">•</span>
                          <span>{safeGetText(improvement)}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
                  </div>
                )}

                {/* Recommendations Tab */}
                {activeTab === 'recommendations' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">🎯 Recommendations</CardTitle>
                        <div className="flex items-center gap-2">
                          <AudioButton sectionId="recommendations" text={`Recommendations: ${review.recommendations.map(r => getRecommendationText(r)).join('. ')}`} />
                        </div>
                      </CardHeader>
                      <CardContent>
                  {/* Selection controls */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>{selectedRecommendationIndices.size} of {review.recommendations.length} selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAllRecommendations(true)}
                        className="text-xs h-7 px-2"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAllRecommendations(false)}
                        className="text-xs h-7 px-2"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  
                  {/* Selectable recommendations list */}
                  <ul className="space-y-2">
                    {review.recommendations.map((recommendation, index) => {
                      const isObject = typeof recommendation !== 'string'
                      const text = getRecommendationText(recommendation)
                      const priority = isObject ? recommendation.priority : undefined
                      const category = isObject ? recommendation.category : undefined
                      const isSelected = selectedRecommendationIndices.has(index)
                      
                      return (
                        <li 
                          key={index} 
                          className={`flex items-start gap-2 text-sm p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                          }`}
                          onClick={() => toggleRecommendation(index)}
                        >
                          {/* Checkbox */}
                          <button
                            type="button"
                            className="mt-0.5 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleRecommendation(index)
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <div className="flex-1">
                            <span className={isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}>{text}</span>
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
                  
                  {/* Revise Script button */}
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleInlineRevise}
                      disabled={selectedRecommendationIndices.size === 0 || isRevising}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                    >
                      {isRevising ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Revising Script...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          Revise Script with {selectedRecommendationIndices.size} Recommendation{selectedRecommendationIndices.size !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
                    </Card>
                  </div>
                )}

                {/* Scenes Tab */}
                {activeTab === 'scenes' && (
                  <div className="space-y-6">
                    {sceneAnalysis.length > 0 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">🎬 Scene-by-Scene Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
                            {sceneAnalysis.map((scene, index) => (
                              <div 
                                key={index} 
                                className={`p-4 rounded-lg border ${
                                  scene.score >= 80 ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800' :
                                  scene.score >= 60 ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800' :
                              'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">
                                Scene {scene.sceneNumber}: {scene.sceneHeading}
                              </div>
                              <div className={`text-lg font-bold ${getScoreColor(scene.score)}`}>
                                {scene.score}
                              </div>
                            </div>
                            <div className="flex gap-2 mb-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                Pacing: {scene.pacing}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Tension: {scene.tension}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Character: {scene.characterDevelopment}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Visual: {scene.visualPotential}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {scene.notes}
                            </p>
                          </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No scene-by-scene analysis available</p>
                        <p className="text-sm mt-1">This analysis is generated for detailed reviews</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Tabs>
          )}
        </div>

        {/* Voice Selector Dialog */}
        <VoiceSelectorDialog
          open={voiceSelectorOpen}
          onOpenChange={setVoiceSelectorOpen}
          provider="elevenlabs"
          selectedVoiceId={selectedVoiceId}
          onSelectVoice={handleVoiceSelect}
          characterContext={reviewExpertContext}
        />
      </div>
    </div>
  )
}
