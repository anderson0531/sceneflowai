'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Users, Star, Download, RefreshCw, Loader, Volume2, VolumeX, Wand2, AlertTriangle, ChevronDown, ChevronUp, Target, TrendingDown, TrendingUp, Settings2, Check, Square, CheckSquare, BarChart3, MessageSquare, ListChecks, Film, Sparkles, CheckCircle2, Edit, Mic, Eye, FileText, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { VoiceSelectorDialog } from '@/components/tts/VoiceSelectorDialog'
import { useProcessWithOverlay } from '@/hooks/useProcessWithOverlay'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { toast } from 'sonner'
import type { CharacterContext } from '@/lib/voiceRecommendation'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Common optimization templates for "You Direct" tab
const SCRIPT_INSTRUCTION_TEMPLATES = [
  {
    id: 'improve-pacing',
    label: 'Improve Overall Pacing',
    text: 'Improve the pacing across all scenes. Tighten slow sections and expand rushed moments.'
  },
  {
    id: 'strengthen-arc',
    label: 'Strengthen Narrative Arc',
    text: 'Strengthen the overall narrative arc. Ensure clear setup, conflict escalation, and satisfying resolution.'
  },
  {
    id: 'character-consistency',
    label: 'Character Consistency',
    text: 'Ensure character voices and behaviors are consistent throughout the script.'
  },
  {
    id: 'tone-coherence',
    label: 'Unify Tone',
    text: 'Unify the tone and mood across all scenes to create a cohesive viewing experience.'
  },
  {
    id: 'visual-cohesion',
    label: 'Visual Cohesion',
    text: 'Improve visual storytelling consistency and create a unified visual style.'
  },
  {
    id: 'dialogue-polish',
    label: 'Polish All Dialogue',
    text: 'Polish dialogue throughout the script for naturalness, subtext, and character voice.'
  },
  {
    id: 'emotional-beats',
    label: 'Emotional Beats',
    text: 'Strengthen emotional beats and ensure proper build-up to key moments.'
  },
  {
    id: 'scene-transitions',
    label: 'Scene Transitions',
    text: 'Improve transitions between scenes for better flow and continuity.'
  }
]

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
  recommendations?: string[]  // Per-scene targeted fixes
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

type ReviewTab = 'overview' | 'analysis' | 'script' | 'scenes' | 'you-direct'

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
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  const [playingSection, setPlayingSection] = useState<string | null>(null)
  const [loadingSection, setLoadingSection] = useState<string | null>(null)
  const [showDeductions, setShowDeductions] = useState(false)
  const [showSceneAnalysis, setShowSceneAnalysis] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCacheRef = useRef<Map<string, { url: string; voiceId: string; textHash: string; language: string }>>(new Map())

  // State for inline revision with selectable recommendations
  const [selectedRecommendationIndices, setSelectedRecommendationIndices] = useState<Set<number>>(new Set())
  const [isRevising, setIsRevising] = useState(false)
  const { execute } = useProcessWithOverlay()

  // Per-scene fix state
  const [fixingScenes, setFixingScenes] = useState<Set<number>>(new Set()) // scene numbers currently being fixed
  const [fixedScenes, setFixedScenes] = useState<Set<number>>(new Set())   // scene numbers successfully fixed
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set()) // scene numbers with expanded recommendations

  // "You Direct" tab state
  const [selectedOptimizations, setSelectedOptimizations] = useState<string[]>([])
  const [customInstruction, setCustomInstruction] = useState('')
  const [isOptimizingYouDirect, setIsOptimizingYouDirect] = useState(false)
  const baseInstructionRef = useRef<string>('')
  
  // Speech recognition for voice input
  const {
    supported: sttSupported,
    isSecure: sttSecure,
    permission: micPermission,
    isRecording: isMicRecording,
    transcript: micTranscript,
    error: micError,
    start: startMic,
    stop: stopMic,
    setTranscript: setMicTranscript
  } = useSpeechRecognition()

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
    if (cached.voiceId === selectedVoiceId && cached.textHash === textHash && cached.language === selectedLanguage) {
      return cached.url
    }
    return null
  }

  const cacheAudio = (sectionId: string, text: string, url: string) => {
    audioCacheRef.current.set(sectionId, {
      url,
      voiceId: selectedVoiceId,
      textHash: hashText(text),
      language: selectedLanguage
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
      // Use the selected voice directly - trust the user's selection from VoiceSelectorDialog
      // Only fall back to default if no voice is selected at all
      const voiceToUse = selectedVoiceId || 'CwhRBWXzGAHq8TQ4Fs17' // Roger as ultimate fallback
      
      if (!selectedVoiceId) {
        console.log('No voice in state, using default Roger')
      } else {
        console.log('Using selected voice:', selectedVoiceId, selectedVoiceName)
      }
      
      // Translate text if non-English language is selected
      // Uses Vertex AI Translation API (service account auth) to avoid API key rate limits
      let textToSpeak = text
      if (selectedLanguage !== 'en') {
        try {
          const translateResponse = await fetch('/api/translate/vertex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: text,
              targetLanguage: selectedLanguage,
              sourceLanguage: 'en'
            })
          })
          if (translateResponse.ok) {
            const translateData = await translateResponse.json()
            textToSpeak = translateData.translatedText || text
          }
        } catch (translateErr) {
          console.warn('Translation failed, using original text:', translateErr)
        }
      }
      
      const response = await fetch('/api/tts/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voiceId: voiceToUse,
          language: selectedLanguage,
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

  // Reset per-scene fix state when review changes (new analysis) or modal opens/closes
  useEffect(() => {
    setFixedScenes(new Set())
    setFixingScenes(new Set())
    setExpandedScenes(new Set())
    // Also reset You Direct state
    setSelectedOptimizations([])
    setCustomInstruction('')
    setIsOptimizingYouDirect(false)
  }, [audienceReview, isOpen])

  // Initialize all recommendations as selected when review loads
  useEffect(() => {
    if (audienceReview && 'recommendations' in audienceReview && audienceReview.recommendations.length > 0) {
      const allIndices = new Set(audienceReview.recommendations.map((_, i) => i))
      setSelectedRecommendationIndices(allIndices)
    }
  }, [audienceReview])

  // Auto-update custom instructions when optimization selections change
  useEffect(() => {
    const selectedTexts = SCRIPT_INSTRUCTION_TEMPLATES
      .filter(t => selectedOptimizations.includes(t.id))
      .map(t => t.text)
    
    if (selectedTexts.length > 0) {
      setCustomInstruction(selectedTexts.join('\n\n'))
    }
  }, [selectedOptimizations])

  // When recording starts, save the current instruction as base
  useEffect(() => {
    if (isMicRecording) {
      baseInstructionRef.current = customInstruction
    }
  }, [isMicRecording, customInstruction])
  
  // Update instruction with voice transcript
  useEffect(() => {
    if (!isMicRecording) return
    if (!micTranscript) return
    
    // Combine base instruction with current transcript
    const base = baseInstructionRef.current.trim()
    const newInstruction = base ? `${base} ${micTranscript}` : micTranscript
    setCustomInstruction(newInstruction)
  }, [isMicRecording, micTranscript])

  // Voice input toggle handler
  const handleVoiceToggle = () => {
    if (!sttSupported || !sttSecure) return
    if (isMicRecording) {
      stopMic()
      // Keep the final transcript in the instruction
      baseInstructionRef.current = customInstruction
      setMicTranscript('')
      return
    }
    // Save current instruction as base before starting
    baseInstructionRef.current = customInstruction
    setMicTranscript('')
    startMic()
  }

  // "You Direct" revision handler
  const handleYouDirectRevise = async () => {
    const instruction = customInstruction.trim()
    
    if (!instruction && selectedOptimizations.length === 0) {
      toast.error('Please select optimizations or enter custom instructions')
      return
    }

    if (!projectId || !script || !onScriptOptimized) {
      toast.error('Script optimization not available')
      return
    }
    
    setIsOptimizingYouDirect(true)
    try {
      await execute(async () => {
        let response = await fetch('/api/vision/optimize-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectId, 
            script, 
            instruction, 
            characters: characters || []
          })
        })
        if (!response.ok) {
          if (response.status === 422) {
            // Retry with compact response to avoid truncation/parse issues
            toast.message('Preview was large; retrying compact version...')
            response = await fetch('/api/vision/optimize-script', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                projectId, 
                script, 
                instruction, 
                characters: characters || [], 
                compact: true
              })
            })
          }
          if (!response.ok) throw new Error('Optimization failed')
        }
        const data = await response.json()
        
        if (data.optimizedScript) {
          onScriptOptimized(data.optimizedScript)
          toast.success('Script revised with your custom direction!')
          // Reset You Direct state after success
          setSelectedOptimizations([])
          setCustomInstruction('')
        } else {
          toast.message('No changes returned for the current instruction.')
        }
      }, { message: 'Revising your script with custom direction...', estimatedDuration: 25, operationType: 'script-optimization' })
    } catch (error: any) {
      console.error('[You Direct] Error:', error)
      toast.error(error.message || 'Failed to revise script')
    } finally {
      setIsOptimizingYouDirect(false)
    }
  }

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
            characters: characters || []
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
                compact: true
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
        // Structural pre-pass (~20s) + batched optimization: ~4 scenes/batch, 2 parallel, ~25s/wave + overhead
        // e.g. 17 scenes = 20s structural + 5 batches → 3 waves × 25s = 75s + 15s overhead = 110s
        // With MAX_TOKENS retries possible, allow up to 300s
        estimatedDuration: Math.min(300, Math.max(60, Math.ceil(Math.ceil((script?.scenes?.length || 10) / 4) / 2) * 25 + 35)),
        operationType: 'script-optimization'
      })
    } catch (err: any) {
      console.error('[Script Revision] Error:', err)
      toast.error(err.message || 'Failed to revise script')
    } finally {
      setIsRevising(false)
    }
  }

  // Per-scene fix handler — calls revise-scene API with scene-specific recommendations
  const handleFixScene = async (sceneAnalysisItem: SceneAnalysis) => {
    if (!projectId || !script || !onScriptOptimized) {
      toast.error('Missing project context for scene fix')
      return
    }

    const sceneIndex = sceneAnalysisItem.sceneNumber - 1 // Convert 1-indexed to 0-indexed
    const currentScene = script.scenes?.[sceneIndex]
    if (!currentScene) {
      toast.error(`Scene ${sceneAnalysisItem.sceneNumber} not found in script`)
      return
    }

    const recommendations = sceneAnalysisItem.recommendations || []
    if (recommendations.length === 0) {
      toast.error('No recommendations available for this scene')
      return
    }

    // Mark scene as fixing
    setFixingScenes(prev => new Set(prev).add(sceneAnalysisItem.sceneNumber))

    try {
      const previousScene = sceneIndex > 0 ? script.scenes[sceneIndex - 1] : undefined
      const nextScene = sceneIndex < script.scenes.length - 1 ? script.scenes[sceneIndex + 1] : undefined

      const response = await fetch('/api/vision/revise-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          currentScene,
          revisionMode: 'recommendations',
          selectedRecommendations: recommendations,
          context: {
            characters: characters || [],
            previousScene,
            nextScene
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to revise scene')
      }

      const data = await response.json()

      if (data.revisedScene) {
        // Check for legacy silent failure flag
        if (data.revisedScene._revisionError) {
          throw new Error('Scene revision failed — AI response could not be parsed. Try again.')
        }

        // Verify the scene actually changed (compare key fields for debug logging)
        const dialogueChanged = JSON.stringify(currentScene.dialogue || []) !== JSON.stringify(data.revisedScene.dialogue || [])
        const actionChanged = (currentScene.action || '') !== (data.revisedScene.action || '')
        const narrationChanged = (currentScene.narration || '') !== (data.revisedScene.narration || '')
        const changed = dialogueChanged || actionChanged || narrationChanged
        
        console.log(`[Scene Fix] Scene ${sceneAnalysisItem.sceneNumber}: dialogue=${dialogueChanged}, action=${actionChanged}, narration=${narrationChanged}`)

        // Update the script in place — replace the scene at sceneIndex
        const updatedScenes = [...script.scenes]
        updatedScenes[sceneIndex] = data.revisedScene
        const updatedScript = { ...script, scenes: updatedScenes }

        // Notify parent of the updated script
        onScriptOptimized(updatedScript)

        // Mark scene as fixed
        setFixedScenes(prev => new Set(prev).add(sceneAnalysisItem.sceneNumber))
        toast.success(
          changed
            ? `Scene ${sceneAnalysisItem.sceneNumber} revised successfully`
            : `Scene ${sceneAnalysisItem.sceneNumber} processed — changes were minimal`
        )
      } else {
        throw new Error('No revised scene returned')
      }
    } catch (err: any) {
      console.error(`[Scene Fix] Error fixing scene ${sceneAnalysisItem.sceneNumber}:`, err)
      toast.error(err.message || `Failed to fix scene ${sceneAnalysisItem.sceneNumber}`)
    } finally {
      setFixingScenes(prev => {
        const next = new Set(prev)
        next.delete(sceneAnalysisItem.sceneNumber)
        return next
      })
    }
  }

  // Toggle expanded state for scene recommendations
  const toggleSceneExpanded = (sceneNumber: number) => {
    setExpandedScenes(prev => {
      const next = new Set(prev)
      if (next.has(sceneNumber)) {
        next.delete(sceneNumber)
      } else {
        next.add(sceneNumber)
      }
      return next
    })
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
            
            {/* Language Selector */}
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-[130px] h-8 text-sm">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
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
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger 
                    value="overview" 
                    className="flex items-center gap-1.5 text-xs sm:text-sm"
                    title="Score overview and dimensional analysis"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analysis" 
                    className="flex items-center gap-1.5 text-xs sm:text-sm"
                    title="Strengths, improvements, and AI feedback"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Analysis</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="script" 
                    className="flex items-center gap-1.5 text-xs sm:text-sm"
                    title="AI recommendations to improve your script"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Script</span>
                    {review.recommendations.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5 hidden sm:flex">
                        {review.recommendations.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="scenes" 
                    className="flex items-center gap-1.5 text-xs sm:text-sm"
                    title="Per-scene analysis and targeted fixes"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Scenes</span>
                    {sceneAnalysis.length > 0 && (() => {
                      const needsFix = sceneAnalysis.filter(s => s.score < 80).length
                      return needsFix > 0 ? (
                        <Badge 
                          variant="secondary" 
                          className="ml-1 text-xs h-5 px-1.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hidden sm:flex"
                        >
                          {needsFix}
                        </Badge>
                      ) : null
                    })()}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="you-direct" 
                    className="flex items-center gap-1.5 text-xs sm:text-sm"
                    title="Custom optimizations with your own direction"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">You Direct</span>
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

                {/* Analysis Tab */}
                {activeTab === 'analysis' && (
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

                {/* Script Tab */}
                {activeTab === 'script' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">🎯 Script Recommendations</CardTitle>
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
                      <>
                        {/* Summary bar */}
                        {(() => {
                          const belowThreshold = sceneAnalysis.filter(s => s.score < 80).length
                          const alreadyFixed = fixedScenes.size
                          const currentlyFixing = fixingScenes.size
                          return (
                            <div className="flex items-center justify-between px-1">
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {belowThreshold > 0 ? (
                                  <span>{belowThreshold} scene{belowThreshold !== 1 ? 's' : ''} below 80 — fix individually below</span>
                                ) : (
                                  <span className="text-green-600 dark:text-green-400">All scenes scoring 80+</span>
                                )}
                                {alreadyFixed > 0 && (
                                  <span className="ml-2 text-green-600 dark:text-green-400">
                                    · {alreadyFixed} fixed
                                  </span>
                                )}
                                {currentlyFixing > 0 && (
                                  <span className="ml-2 text-purple-600 dark:text-purple-400">
                                    · {currentlyFixing} in progress
                                  </span>
                                )}
                              </div>
                              {fixedScenes.size > 0 && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setFixedScenes(new Set())
                                    setExpandedScenes(new Set())
                                    onRegenerate()
                                  }}
                                  disabled={isGenerating || fixingScenes.size > 0}
                                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  {isGenerating ? (
                                    <>
                                      <Loader className="w-3.5 h-3.5 animate-spin" />
                                      Re-analyzing...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      Re-analyze Script
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )
                        })()}

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">🎬 Scene-by-Scene Analysis</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
                              {sceneAnalysis.map((scene, index) => {
                                const isFixing = fixingScenes.has(scene.sceneNumber)
                                const isFixed = fixedScenes.has(scene.sceneNumber)
                                const isExpanded = expandedScenes.has(scene.sceneNumber)
                                const hasRecs = (scene.recommendations?.length || 0) > 0
                                const canFix = !!projectId && !!script && !!onScriptOptimized && hasRecs && !isFixed && !isFixing

                                return (
                                  <div 
                                    key={index} 
                                    className={`p-4 rounded-lg border transition-colors ${
                                      isFixed ? 'border-green-300 bg-green-50/70 dark:bg-green-900/20 dark:border-green-700' :
                                      isFixing ? 'border-purple-300 bg-purple-50/50 dark:bg-purple-900/15 dark:border-purple-700' :
                                      scene.score >= 80 ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800' :
                                      scene.score >= 60 ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800' :
                                      'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800'
                                    }`}
                                  >
                                    {/* Header row: heading + score + fix button */}
                                    <div className="flex items-center justify-between mb-2 gap-3">
                                      <div className="font-medium flex-1 min-w-0">
                                        <span className="truncate block">Scene {scene.sceneNumber}: {scene.sceneHeading}</span>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className={`text-lg font-bold ${getScoreColor(scene.score)}`}>
                                          {scene.score}
                                        </div>
                                        {isFixed ? (
                                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Fixed
                                          </div>
                                        ) : isFixing ? (
                                          <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 text-xs font-medium px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30">
                                            <Loader className="w-3.5 h-3.5 animate-spin" />
                                            Fixing...
                                          </div>
                                        ) : canFix ? (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleFixScene(scene)}
                                            className="text-xs h-7 px-2.5 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/20"
                                          >
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            Fix Scene
                                          </Button>
                                        ) : scene.score >= 80 ? (
                                          <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>

                                    {/* Badge row */}
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

                                    {/* Notes */}
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {scene.notes}
                                    </p>

                                    {/* Expandable per-scene recommendations */}
                                    {hasRecs && !isFixed && (
                                      <div className="mt-2">
                                        <button
                                          onClick={() => toggleSceneExpanded(scene.sceneNumber)}
                                          className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                                        >
                                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                          {scene.recommendations!.length} recommendation{scene.recommendations!.length !== 1 ? 's' : ''}
                                        </button>
                                        {isExpanded && (
                                          <ul className="mt-2 space-y-1.5 pl-1">
                                            {scene.recommendations!.map((rec, rIdx) => (
                                              <li key={rIdx} className="text-xs text-gray-600 dark:text-gray-400 flex gap-2">
                                                <span className="text-purple-400 mt-0.5">•</span>
                                                <span>{rec}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Re-analyze CTA at bottom when scenes have been fixed */}
                        {fixedScenes.size > 0 && (
                          <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
                            <CardContent className="py-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {fixedScenes.size} scene{fixedScenes.size !== 1 ? 's' : ''} revised
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Re-analyze to see updated scores and find remaining improvements
                                  </p>
                                </div>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setFixedScenes(new Set())
                                    setExpandedScenes(new Set())
                                    onRegenerate()
                                  }}
                                  disabled={isGenerating || fixingScenes.size > 0}
                                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  {isGenerating ? (
                                    <>
                                      <Loader className="w-3.5 h-3.5 animate-spin" />
                                      Re-analyzing...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      Re-analyze Script
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No scene-by-scene analysis available</p>
                        <p className="text-sm mt-1">This analysis is generated for detailed reviews</p>
                      </div>
                    )}
                  </div>
                )}

                {/* You Direct Tab */}
                {activeTab === 'you-direct' && (
                  <div className="space-y-6">
                    {/* Common Optimizations */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-blue-600" />
                        Common Optimizations
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {SCRIPT_INSTRUCTION_TEMPLATES.map(template => (
                          <Button
                            key={template.id}
                            size="sm"
                            variant={selectedOptimizations.includes(template.id) ? "default" : "outline"}
                            onClick={() => {
                              if (selectedOptimizations.includes(template.id)) {
                                setSelectedOptimizations(prev => prev.filter(id => id !== template.id))
                              } else {
                                setSelectedOptimizations(prev => [...prev, template.id])
                              }
                            }}
                            className={`justify-start text-left h-auto py-3 px-3 ${
                              selectedOptimizations.includes(template.id) 
                                ? 'bg-blue-600 text-white hover:bg-blue-500' 
                                : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            }`}
                          >
                            <div className="flex items-start gap-2 w-full">
                              {selectedOptimizations.includes(template.id) && (
                                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              )}
                              <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                              <div className="text-left">
                                <div className="font-medium text-xs">{template.label}</div>
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Instructions */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Edit className="w-4 h-4 text-green-600" />
                        Custom Instructions
                      </h3>
                      <div className="space-y-2">
                        <div className="flex flex-col gap-2">
                          <Textarea
                            value={customInstruction}
                            onChange={(e) => setCustomInstruction(e.target.value)}
                            placeholder="Describe how you want to optimize your script...
Examples:
• Make the pacing more dynamic and cut unnecessary scenes
• Strengthen the emotional arc and character development
• Unify the visual style across all scenes
• Polish dialogue for more natural, subtext-rich conversations"
                            className="min-h-[180px] text-sm"
                          />
                          <div className="flex items-center justify-between gap-3">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleVoiceToggle}
                              disabled={!sttSupported || !sttSecure}
                              className={`flex items-center gap-2 ${isMicRecording ? 'border-red-500 text-red-400' : ''}`}
                              aria-label={isMicRecording ? 'Stop voice input' : 'Start voice input'}
                            >
                              {isMicRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                              <span>
                                {isMicRecording ? 'Stop Recording' : 'Voice Input'}
                              </span>
                            </Button>
                            {isMicRecording && (
                              <span className="text-xs text-red-400 animate-pulse">Listening...</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          💡 Be specific about what to optimize. The more detailed your instructions, the better the results.
                        </p>
                        {!sttSupported && (
                          <p className="text-xs text-amber-500">
                            Voice input is unavailable in this browser. Try Chrome on HTTPS or localhost.
                          </p>
                        )}
                        {sttSupported && !sttSecure && (
                          <p className="text-xs text-amber-500">
                            Voice input requires a secure context (HTTPS or localhost).
                          </p>
                        )}
                        {micError && (
                          <p className="text-xs text-red-500">
                            Mic error: {micError}
                          </p>
                        )}
                        {micPermission && micPermission !== 'granted' && (
                          <p className="text-xs text-amber-400">
                            Microphone permission: {micPermission}. Update browser settings to enable voice input.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Revise Button */}
                    <div className="flex gap-3 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={handleYouDirectRevise}
                        disabled={isOptimizingYouDirect || (!customInstruction.trim() && selectedOptimizations.length === 0)}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-6"
                      >
                        {isOptimizingYouDirect ? (
                          <>
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                            Revising Script...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 mr-2" />
                            Revise Script with Custom Direction
                          </>
                        )}
                      </Button>
                    </div>
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
