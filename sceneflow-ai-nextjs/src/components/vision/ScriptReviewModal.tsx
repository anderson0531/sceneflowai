'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Users, RefreshCw, Loader, Volume2, VolumeX, AlertTriangle, ChevronDown, ChevronUp, Target, TrendingDown, TrendingUp, Square, BarChart3, ListChecks, Film, Sparkles, CheckCircle2, Lightbulb, Play, Share2, Bot, Clapperboard, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  DIRECTOR_ASSISTANTS,
  applyAssistantStyle,
  getAssistantByVoiceId,
  persistAssistantVoice,
  loadPersistedAssistantVoice,
  resolveAssistant,
  resolveAssistantGeminiVoiceId,
} from '@/lib/tts/productionAssistants'
import {
  collectTopImpactIssues,
  firstHighImpactSceneIndex,
  recommendationId,
  recommendationIsHighImpact,
  sceneHasHighImpactIssue,
} from '@/lib/script/audienceResonance/highImpact'
import {
  DEFAULT_SCENE_DIRECTOR_CONCURRENCY,
  buildSceneRecSelectionKey,
  collectInitialSelectedRecKeys,
  getArRecommendationsBackgroundState,
  groupSelectedRecommendationsByScene,
  isRecommendationApplied,
  patchArRecommendationsBackgroundState,
  resolveSceneAnalysisIndex,
  runPreVisScenePreparation,
  subscribeArRecommendationsBackgroundState,
  summarizeSelectedRecommendations,
  type BatchSceneRevisionItem,
  type PreVisPrepProgress,
  type PreVisPrepResult,
  type SceneDirectorRevisionDepth,
} from '@/lib/vision/prepareScenesForPreVis'
import { dismissAgentRun, runWithAgentDock } from '@/store/useAgentRunStore'
import { useStore } from '@/store/useStore'
import { AnimatedScore, AnimatedProgressBar } from '@/components/ui/AnimatedScore'
import { toast } from 'sonner'
import {
  createScriptARShare,
  triggerScriptARShareAudio,
} from '@/lib/script/audienceResonance/createScriptARShare'
import Link from 'next/link'
import {
  createAudienceDefinition,
  formatAudienceDefinitionForPrompt,
  type AudienceDefinition,
} from '@/lib/types/audienceResonance'
import { AudienceDescriptionField } from '@/components/audience/AudienceDescriptionField'
import { isStoredReviewStale } from '@/lib/script/audienceResonance/staleness'

const SCRIPT_REVIEW_TARGET_AUDIENCE_KEY = 'sceneflow-script-review-target-audience'

interface Voice {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string>
}

// Recommendation can be either a string (legacy) or an object with text, priority, category
type RecommendationItem = string | { text: string; priority: 'critical' | 'high' | 'medium' | 'optional'; category: string }

interface Deduction {
  reason: string
  points: number
  category: string
  importance?: string
}

interface SceneRecommendation {
  text: string
  category?: string
  targetElement?: string
  impact?: 'structural' | 'polish'
  priority?: 'high' | 'medium' | 'low'
  pointsDeducted?: number
}

interface SceneAnalysis {
  sceneNumber: number
  sceneHeading: string
  score: number
  storyWeight?: number
  pacing: 'slow' | 'moderate' | 'fast'
  tension: 'low' | 'medium' | 'high'
  characterDevelopment: 'minimal' | 'moderate' | 'strong'
  visualPotential: 'low' | 'medium' | 'high'
  notes: string
  recommendations?: (string | SceneRecommendation)[]  // Per-scene targeted fixes (string legacy, object new)
  appliedRecommendationIds?: string[]
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

        {/* Data polygon — animated reveal */}
        <polygon
          points={dataPolygon}
          fill={fillColor}
          fillOpacity={0.25}
          stroke={fillColor}
          strokeWidth={2}
          style={{
            transformOrigin: `${center}px ${center}px`,
            animation: 'radarReveal 0.8s cubic-bezier(0.33, 1, 0.68, 1) 0.3s both',
          }}
        />
        <style>{`
          @keyframes radarReveal {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes dotReveal {
            from { r: 0; opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        {/* Data points — staggered reveal */}
        {dataPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={fillColor}
            style={{
              animation: `dotReveal 0.4s cubic-bezier(0.33, 1, 0.68, 1) ${0.5 + i * 0.08}s both`,
            }}
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
  onRegenerate: (targetDemographic?: string) => Promise<void>
  isGenerating: boolean
  projectId?: string
  script?: any
  characters?: any[]
  // Score outdated indicator
  scoreOutdated?: boolean
  // Review history for score trend
  reviewHistory?: Array<{ score: number; generatedAt: string; dimensionalScores?: any[] }>
  // Callback to persist scene analysis to project
  onSceneAnalysisComplete?: (sceneAnalyses: Array<{
    sceneIndex: number
    analysis: {
      score: number
      pacing: 'slow' | 'moderate' | 'fast'
      tension: 'low' | 'medium' | 'high'
      characterDevelopment: 'minimal' | 'moderate' | 'strong'
      visualPotential: 'low' | 'medium' | 'high'
      notes: string
      recommendations: (string | SceneRecommendation)[]
      analyzedAt: string
    }
  }>) => void
  /** Project-level audience from Blueprint (single source of truth) */
  audienceDefinition?: AudienceDefinition | null
  /** Current script timestamp, used to detect a review that analysis outran. */
  scriptUpdatedAt?: string | null
  /** Jump to a 0-based scene in Production Studio and close this dialog. */
  onJumpToScene?: (sceneIndex: number) => void
  /** Batch-apply revised scenes from the Pre-Vis Preparation Agent */
  onBatchApplySceneRevisions?: (
    revisions: BatchSceneRevisionItem[]
  ) => Promise<{ sceneCount: number } | void>
  /** Reload project state after server-side Scene Direction & Shot Direction complete */
  onRefreshProject?: () => Promise<void>
}

type ReviewTab = 'overview' | 'analysis' | 'recommendations'

/**
 * Inline picker for the Production Assistant voice. Replaces the previous
 * sidebar voice section: shows the active assistant, lets the user pick a
 * different one, and previews the voice with a Listen/Stop control.
 */
function AssistantPickerButton({
  selectedVoiceId,
  onSelect,
}: {
  selectedVoiceId: string
  onSelect: (voiceId: string, voiceName: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  const userName = useStore(s => s.user?.name)
  const firstName =
    (userName && userName.split(' ')[0]) ||
    (typeof window !== 'undefined'
      ? (() => {
          try {
            const stored = localStorage.getItem('authUserName')
            return stored && stored.trim() ? stored.split(' ')[0] : 'Director'
          } catch {
            return 'Director'
          }
        })()
      : 'Director')

  const selectedAssistant = getAssistantByVoiceId(selectedVoiceId) || DIRECTOR_ASSISTANTS[0]

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current = null
    }
    setIsPlaying(false)
    setIsLoading(false)
  }

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
        previewAudioRef.current = null
      }
    }
  }, [])

  const handleListen = async () => {
    if (isPlaying) {
      stopPreview()
      return
    }
    const message = `Hi ${firstName}. I'm ${selectedAssistant.name}, your ${selectedAssistant.title}. ${selectedAssistant.pitch} I will be your voice for this session.`
    const styled = applyAssistantStyle(message, selectedAssistant.id)
    setIsLoading(true)
    try {
      const response = await fetch('/api/tts/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: styled,
          voiceId: resolveAssistantGeminiVoiceId(selectedAssistant.voiceId),
          language: 'en',
        }),
      })
      if (!response.ok) throw new Error('TTS failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      stopPreview()
      previewAudioRef.current = new Audio(url)
      previewAudioRef.current.onended = () => setIsPlaying(false)
      previewAudioRef.current.onerror = () => setIsPlaying(false)
      await previewAudioRef.current.play()
      setIsPlaying(true)
    } catch (err) {
      console.error('Failed to preview assistant voice:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (voiceId: string) => {
    const asst = DIRECTOR_ASSISTANTS.find(a => a.voiceId === voiceId)
    if (asst) onSelect(asst.voiceId, asst.title)
    stopPreview()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) stopPreview()
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 h-8 text-xs"
          aria-label="Choose Production Assistant voice"
        >
          <span
            className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm border border-white/10',
              selectedAssistant.avatar.color
            )}
          >
            {selectedAssistant.avatar.initials}
          </span>
          Assistant
          <ChevronDown className="w-3 h-3 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-blue-500" />
            Production Assistant
          </span>
        </div>

        <Select value={selectedAssistant.voiceId} onValueChange={handleSelect}>
          <SelectTrigger className="w-full h-auto min-h-[44px] py-1.5 px-3 [&>span]:line-clamp-none [&>span]:w-full [&>span]:flex-1">
            <SelectValue>
              <div className="flex items-center gap-3 text-left w-full min-w-0">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm border border-white/10',
                    selectedAssistant.avatar.color
                  )}
                >
                  {selectedAssistant.avatar.initials}
                </div>
                <div className="flex flex-col min-w-0 overflow-hidden pr-2">
                  <span className="font-semibold text-[13px] truncate">{selectedAssistant.name}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider truncate">
                    {selectedAssistant.title}
                  </span>
                </div>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {DIRECTOR_ASSISTANTS.map(asst => (
              <SelectItem key={asst.id} value={asst.voiceId} className="py-2.5 px-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm border border-white/10',
                      asst.avatar.color
                    )}
                  >
                    {asst.avatar.initials}
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="font-medium text-[13px] truncate">{asst.name}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide truncate">
                      {asst.title}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="p-3 bg-gray-100/60 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-lg space-y-2 relative overflow-hidden">
          <div
            className={cn(
              'absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none',
              selectedAssistant.avatar.color
            )}
          />
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Voice Profile</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleListen}
              disabled={isLoading}
              className="h-7 px-3 text-[11px] rounded-full"
            >
              {isLoading ? (
                <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : isPlaying ? (
                <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              )}
              {isPlaying ? 'Stop' : 'Listen'}
            </Button>
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed relative z-10">
            {selectedAssistant.description}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function ScriptReviewModal({
  isOpen,
  onClose,
  directorReview, // No longer used - user is the director
  audienceReview,
  scriptUpdatedAt,
  onRegenerate,
  isGenerating,
  projectId,
  script,
  characters,
  scoreOutdated,
  reviewHistory = [],
  onSceneAnalysisComplete,
  audienceDefinition: projectAudienceDefinition,
  onJumpToScene,
  onBatchApplySceneRevisions,
  onRefreshProject,
}: ScriptReviewModalProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [activeTab, setActiveTab] = useState<ReviewTab>('overview')

  const storedVoiceId = useStore(s => s.sidebarData.selectedVoiceId)
  const selectedAssistant = resolveAssistant(storedVoiceId)
  const selectedVoiceId = selectedAssistant.voiceId
  const setSidebarVoiceSelection = useStore(s => s.setSidebarVoiceSelection)
  
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en') // Keep for TTS playback
  const [playingSection, setPlayingSection] = useState<string | null>(null)
  const [sharingReport, setSharingReport] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const handleShareListenOnly = async () => {
    if (!projectId) {
      toast.error('Save the project before sharing this report')
      return
    }
    setSharingReport(true)
    try {
      const result = await createScriptARShare({ projectId })
      if (!result.success) {
        toast.error(result.error || 'Failed to create listen-only report')
        return
      }
      setShareUrl(result.url)
      void triggerScriptARShareAudio(result.token, { language: selectedLanguage })
      try {
        await navigator.clipboard.writeText(result.url)
        toast.success('Listen-only report link copied')
      } catch {
        toast.success('Listen-only report link ready')
      }
    } finally {
      setSharingReport(false)
    }
  }
  const [loadingSection, setLoadingSection] = useState<string | null>(null)
    const [showDeductions, setShowDeductions] = useState(false)
    const [showSceneAnalysis, setShowSceneAnalysis] = useState(false)
    const [scenePromptDismissed, setScenePromptDismissed] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCacheRef = useRef<Map<string, { url: string; voiceId: string; textHash: string; language: string }>>(new Map())
  
  // Guard ref to prevent re-persisting the same analysis data (prevents infinite loops)
  const lastPersistedAnalysisRef = useRef<string | null>(null)

  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set()) // scene numbers with expanded recommendations

  // Scene Analysis generation state (separate from main review)
  const [isGeneratingSceneAnalysis, setIsGeneratingSceneAnalysis] = useState(false)
  const [localSceneAnalysis, setLocalSceneAnalysis] = useState<SceneAnalysis[] | null>(null)

  const [audienceDef, setAudienceDef] = useState<AudienceDefinition>(() =>
    createAudienceDefinition({ ...(projectAudienceDefinition || {}), source: 'script' })
  )
  const [targetAudienceOpen, setTargetAudienceOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const persisted = loadPersistedAssistantVoice()
    if (persisted) {
      setSidebarVoiceSelection(persisted.voiceId, persisted.voiceName)
    }
  }, [isOpen, setSidebarVoiceSelection])

  useEffect(() => {
    if (!isOpen) return
    if (projectAudienceDefinition) {
      setAudienceDef(
        createAudienceDefinition({ ...projectAudienceDefinition, source: 'script' })
      )
      return
    }
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(SCRIPT_REVIEW_TARGET_AUDIENCE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        // Backward-compat: older builds stored just the profile object
        setAudienceDef(
          parsed && parsed.profile
            ? createAudienceDefinition({ ...parsed, source: 'script' })
            : createAudienceDefinition({ profile: parsed, source: 'script' })
        )
      }
    } catch {}
  }, [isOpen, projectAudienceDefinition])

  useEffect(() => {
    try {
      localStorage.setItem(SCRIPT_REVIEW_TARGET_AUDIENCE_KEY, JSON.stringify(audienceDef))
    } catch {}
  }, [audienceDef])

  const buildAudiencePrompt = useCallback(() => {
    return formatAudienceDefinitionForPrompt(audienceDef)
  }, [audienceDef])

  const handleRegenerate = async () => {
    await onRegenerate(buildAudiencePrompt())
  }

  // Review Expert voice: uses NarratorVoicePicker with curated narrator catalog
  // Default voice: Arnold (authoritative documentary narrator)

  // Clear cache if voice changes (now handled globally, so just a watcher)
  useEffect(() => {
    audioCacheRef.current.clear()
  }, [selectedVoiceId])

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
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [isOpen])

  const getCachedAudio = (sectionId: string, text: string): string | null => {
    const cached = audioCacheRef.current.get(sectionId)
    if (!cached) return null
    const textHash = hashText(text)
    if (cached.voiceId === resolveAssistantGeminiVoiceId(selectedVoiceId) && cached.textHash === textHash && cached.language === selectedLanguage) {
      return cached.url
    }
    return null
  }

  const cacheAudio = (sectionId: string, text: string, url: string) => {
    audioCacheRef.current.set(sectionId, {
      url,
      voiceId: resolveAssistantGeminiVoiceId(selectedVoiceId),
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
      const assistant = resolveAssistant(selectedVoiceId)
      const voiceToUse = resolveAssistantGeminiVoiceId(assistant.voiceId)

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

      // Apply the chosen assistant's persona styling
      if (assistant) {
        textToSpeak = applyAssistantStyle(textToSpeak, assistant.id)
      }
      
      const response = await fetch('/api/tts/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voiceId: voiceToUse,
          language: selectedLanguage
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

  const jumpToScene = (sceneIndex: number) => {
    stopPlayback()
    onJumpToScene?.(sceneIndex)
    onClose()
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
    setExpandedScenes(new Set())
  }, [audienceReview, isOpen])

  // Persist scene analysis to project when analysis completes
  useEffect(() => {
    if (!audienceReview || !onSceneAnalysisComplete) return
    
    const review = audienceReview as AudienceResonanceReview
    const sceneAnalysisList = review.sceneAnalysis
    
    if (!sceneAnalysisList || sceneAnalysisList.length === 0) return
    
    // Map scene analysis to the format expected by the callback
    const analysesToPersist = sceneAnalysisList.map((sa) => ({
      sceneIndex: sa.sceneNumber - 1, // Convert 1-indexed to 0-indexed
      analysis: {
        score: sa.score,
        pacing: sa.pacing,
        tension: sa.tension,
        characterDevelopment: sa.characterDevelopment,
        visualPotential: sa.visualPotential,
        notes: sa.notes,
        recommendations: sa.recommendations || [],
        appliedRecommendationIds: sa.appliedRecommendationIds,
        analyzedAt: review.generatedAt
      }
    }))
    
    // Guard: Skip if we already persisted this exact analysis data
    // This prevents infinite loops when callback causes parent re-render
    const analysisHash = JSON.stringify(analysesToPersist)
    if (lastPersistedAnalysisRef.current === analysisHash) {
      return
    }
    lastPersistedAnalysisRef.current = analysisHash
    
    // Call the callback to persist to project
    onSceneAnalysisComplete(analysesToPersist)
  }, [audienceReview, onSceneAnalysisComplete])

  // Generate scene-by-scene analysis via dedicated API
  const handleGenerateSceneAnalysis = async () => {
    if (!projectId || !script?.scenes?.length) {
      toast.error('Missing project or script data')
      return
    }
    
    setIsGeneratingSceneAnalysis(true)
    try {
      // Build audienceReview context for calibrated scene analysis
      const audienceReviewContext = audienceReview ? {
        overallScore: audienceReview.overallScore,
        categories: audienceReview.categories?.map(c => ({
          name: c.name,
          score: c.score,
          weight: 'weight' in c ? c.weight : 0
        })),
        recommendations: audienceReview.recommendations?.map(r => ({
          text: typeof r === 'string' ? r : r.text,
          priority: typeof r === 'string' ? 'medium' : (r.priority || 'medium'),
          category: typeof r === 'string' ? undefined : r.category
        })),
        improvements: audienceReview.improvements
      } : undefined

      const response = await fetch('/api/vision/analyze-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          script,
          audienceReview: audienceReviewContext,
          targetDemographic: buildAudiencePrompt(),
        })
      })
      
      const data = await response.json()
      if (data.success && data.sceneAnalysis) {
        setLocalSceneAnalysis(data.sceneAnalysis)
        toast.success(`Analyzed ${data.sceneAnalysis.length} scenes`)
        
        // Persist to parent if callback provided
        if (onSceneAnalysisComplete) {
          onSceneAnalysisComplete(data.sceneAnalysis.map((sa: SceneAnalysis) => ({
            sceneIndex: sa.sceneNumber - 1,
            analysis: {
              score: sa.score,
              pacing: sa.pacing,
              tension: sa.tension,
              characterDevelopment: sa.characterDevelopment,
              visualPotential: sa.visualPotential,
              notes: sa.notes,
              recommendations: sa.recommendations || [],
              analyzedAt: new Date().toISOString()
            }
          })))
        }
      } else {
        toast.error(data.error || 'Failed to analyze scenes')
      }
    } catch (error) {
      console.error('[Scene Analysis] Error:', error)
      toast.error('Failed to analyze scenes')
    } finally {
      setIsGeneratingSceneAnalysis(false)
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

  // Cast to AudienceResonanceReview for new features
  const review = audienceReview as AudienceResonanceReview | null
  // Use localSceneAnalysis if available (from dedicated API), otherwise fall back to review data
  const sceneAnalysis = localSceneAnalysis || review?.sceneAnalysis || []
  const scriptScenes = Array.isArray(script?.scenes)
    ? script.scenes
    : Array.isArray(script?.script?.scenes)
      ? script.script.scenes
      : []

  // Scene Director Agent Recommendation Selection & Background Agent State
  const [selectedRecKeys, setSelectedRecKeys] = useState<Set<string>>(() => new Set())
  const [revisionDepth, setRevisionDepth] = useState<SceneDirectorRevisionDepth>('moderate')
  const [preserveMusic, setPreserveMusic] = useState<boolean>(true)
  const [autoReanalyzeAfterApply, setAutoReanalyzeAfterApply] = useState<boolean>(false)
  const [showDirectorOptions, setShowDirectorOptions] = useState<boolean>(false)
  const [directorNote, setDirectorNote] = useState<string>('')
  const [sceneFilter, setSceneFilter] = useState<'all' | 'with-recs' | 'selected'>('all')
  const [, setBgStateVersion] = useState(0)
  const bgState = getArRecommendationsBackgroundState(projectId)
  const localAppliedRecKeys = bgState.appliedRecKeys
  const isRunningPreVisPrep = bgState.isRunning
  const preVisPrepProgress = bgState.progress
  const preVisPrepResult = bgState.result
  const lastSelectionInitSignatureRef = useRef<string | null>(null)
  const onBatchApplySceneRevisionsRef = useRef(onBatchApplySceneRevisions)
  const onRefreshProjectRef = useRef(onRefreshProject)
  const onRegenerateRef = useRef(onRegenerate)

  useEffect(() => {
    onBatchApplySceneRevisionsRef.current = onBatchApplySceneRevisions
    onRefreshProjectRef.current = onRefreshProject
    onRegenerateRef.current = onRegenerate
  }, [onBatchApplySceneRevisions, onRefreshProject, onRegenerate])

  useEffect(() => {
    return subscribeArRecommendationsBackgroundState(() => {
      setBgStateVersion((v) => v + 1)
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const currentBg = getArRecommendationsBackgroundState(projectId)
    const defaultBg = getArRecommendationsBackgroundState(undefined)
    if (
      currentBg.pendingOpenTab === 'recommendations' ||
      defaultBg.pendingOpenTab === 'recommendations'
    ) {
      setActiveTab('recommendations')
      patchArRecommendationsBackgroundState(projectId, { pendingOpenTab: null })
      patchArRecommendationsBackgroundState(undefined, { pendingOpenTab: null })
    }
  }, [isOpen, projectId])

  const sceneAnalysisSignature = `${review?.generatedAt || 'local'}::${sceneAnalysis
    .map((s, idx) => {
      const recIds = Array.isArray(s?.recommendations)
        ? s.recommendations.map((r, rIdx) => recommendationId(r, rIdx)).join(',')
        : ''
      return `${s?.sceneNumber ?? idx + 1}:${recIds}`
    })
    .join('|')}`

  useEffect(() => {
    if (!isOpen || sceneAnalysis.length === 0) return
    if (lastSelectionInitSignatureRef.current === sceneAnalysisSignature) return
    lastSelectionInitSignatureRef.current = sceneAnalysisSignature
    setSelectedRecKeys(
      collectInitialSelectedRecKeys(sceneAnalysis, scriptScenes, {
        localAppliedKeys: localAppliedRecKeys,
      })
    )
  }, [isOpen, sceneAnalysis, sceneAnalysisSignature, scriptScenes, localAppliedRecKeys])

  const handleToggleRecSelection = (sceneIndex: number, recId: string) => {
    const key = buildSceneRecSelectionKey(sceneIndex, recId)
    setSelectedRecKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSelectAllRecommendations = (options?: {
    highImpactOnly?: boolean
    maxSceneScoreExclusive?: number
  }) => {
    setSelectedRecKeys(
      collectInitialSelectedRecKeys(sceneAnalysis, scriptScenes, {
        highImpactOnly: options?.highImpactOnly,
        maxSceneScoreExclusive: options?.maxSceneScoreExclusive,
        localAppliedKeys: localAppliedRecKeys,
      })
    )
  }

  const handleClearAllRecommendations = () => {
    setSelectedRecKeys(new Set())
  }

  const handleToggleSceneRecommendations = (sceneIndex: number, unappliedRecIds: string[]) => {
    if (unappliedRecIds.length === 0) return
    setSelectedRecKeys((prev) => {
      const next = new Set(prev)
      const keys = unappliedRecIds.map((id) => buildSceneRecSelectionKey(sceneIndex, id))
      const allSelected = keys.every((k) => next.has(k))
      if (allSelected) {
        keys.forEach((k) => next.delete(k))
      } else {
        keys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  const handleCancelPreVisPrep = () => {
    getArRecommendationsBackgroundState(projectId).abortController?.abort()
  }

  const handleRunPreVisPrepAgent = (overrideSelectedKeys?: Set<string>) => {
    if (!projectId) {
      toast.error('Save the project before applying scene recommendations')
      return
    }
    if (isRunningPreVisPrep) return

    const activeSelection = overrideSelectedKeys ?? selectedRecKeys
    const initialGroups = groupSelectedRecommendationsByScene(
      sceneAnalysis,
      activeSelection,
      scriptScenes,
      localAppliedRecKeys
    )
    if (initialGroups.length === 0) {
      toast.info('Select at least one scene recommendation to apply')
      return
    }

    const selectedRecCount = initialGroups.reduce(
      (sum, g) => sum + g.selectedRecommendations.length,
      0
    )
    const selectedSnapshot = new Set(activeSelection)
    const appliedSnapshot = new Set(localAppliedRecKeys)
    const targetDemographicSnapshot =
      formatAudienceDefinitionForPrompt(audienceDef) || review?.targetDemographic || ''
    const scriptTitleSnapshot = script?.title || script?.script?.title
    const loglineSnapshot = script?.logline || script?.script?.logline
    const charactersSnapshot = characters || []
    const sceneAnalysisSnapshot = [...sceneAnalysis]
    const scriptScenesSnapshot = [...scriptScenes]
    const revisionDepthSnapshot = revisionDepth
    const directorNoteSnapshot = directorNote
    const preserveElementsSnapshot = preserveMusic ? (['music'] as const) : ([] as const)
    const autoReanalyzeSnapshot = autoReanalyzeAfterApply

    let completedBeforeAbortCount = 0
    const controller = new AbortController()
    patchArRecommendationsBackgroundState(projectId, {
      isRunning: true,
      progress: {
        phase: 'revise-scenes',
        done: 0,
        total: initialGroups.length,
        currentSceneNumber: initialGroups[0]?.sceneNumber,
        progressPct: 8,
        label: `Preparing Scene Director for ${initialGroups.length} scene${initialGroups.length === 1 ? '' : 's'}…`,
      },
      result: null,
      abortController: controller,
    })

    // Hand off to the background dock so the user can keep working in Production Studio
    stopPlayback()
    onClose()

    toast.info(
      `Scene Director Agent started: ${selectedRecCount} recommendation${selectedRecCount === 1 ? '' : 's'} across ${initialGroups.length} scene${initialGroups.length === 1 ? '' : 's'}`,
      {
        description:
          'Watch the Scene Director Agent toast in the bottom-right corner for live concurrent progress.',
        duration: 6000,
      }
    )

    const dockRunId = 'ar-scene-recommendations'
    const reopenArDialog = () => {
      patchArRecommendationsBackgroundState(projectId, {
        pendingOpenTab: 'recommendations',
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('production:review-analysis'))
      }
    }

    void (async () => {
      try {
        await runWithAgentDock(
          {
            id: dockRunId,
            title: 'Scene Director Agent',
            subtitle: `Applying ${selectedRecCount} AR recommendation${selectedRecCount === 1 ? '' : 's'} across ${initialGroups.length} scene${initialGroups.length === 1 ? '' : 's'}`,
            meta: `0/${initialGroups.length} scenes`,
            keepTabOpen: true,
            items: initialGroups.map((g) => {
              const shortHeading =
                g.sceneHeading && g.sceneHeading !== `Scene ${g.sceneNumber}`
                  ? ` · ${g.sceneHeading.slice(0, 32)}${g.sceneHeading.length > 32 ? '…' : ''}`
                  : ''
              return {
                key: `scene-${g.sceneIndex}`,
                label: `Scene ${g.sceneNumber}${shortHeading} (${g.selectedRecommendations.length} rec${g.selectedRecommendations.length === 1 ? '' : 's'})`,
                status: 'pending' as const,
              }
            }),
            onCancel: () => controller.abort(),
            cancelLabel: 'Cancel',
          },
          async ({ setProgress, setSubtitle, setMeta, setItem, setFinishPatch }) => {
            const result = await runPreVisScenePreparation({
              projectId,
              sceneAnalysis: sceneAnalysisSnapshot,
              selectedKeys: selectedSnapshot,
              scriptScenes: scriptScenesSnapshot,
              characters: charactersSnapshot,
              targetDemographic: targetDemographicSnapshot,
              scriptTitle: scriptTitleSnapshot,
              logline: loglineSnapshot,
              localAppliedKeys: appliedSnapshot,
              revisionConcurrency: DEFAULT_SCENE_DIRECTOR_CONCURRENCY,
              revisionDepth: revisionDepthSnapshot,
              directorNote: directorNoteSnapshot,
              preserveElements: [...preserveElementsSnapshot],
              signal: controller.signal,
              onProgress: (progress) => {
                patchArRecommendationsBackgroundState(projectId, { progress })
                setSubtitle(progress.label)
                const activeCount = progress.activeSceneNumbers?.length ?? 0
                setMeta(
                  activeCount > 1
                    ? `${progress.done}/${progress.total} · ${activeCount} active`
                    : `${progress.done}/${progress.total} scenes`
                )
                if (typeof progress.progressPct === 'number') {
                  setProgress(progress.progressPct)
                }
              },
              onSceneStatusChange: (event) => {
                setItem(`scene-${event.sceneIndex}`, {
                  status: event.status,
                  error: event.error,
                })
                if (event.status === 'done' && event.revision) {
                  completedBeforeAbortCount += 1
                  const currentBg = getArRecommendationsBackgroundState(projectId)
                  const nextApplied = new Set(currentBg.appliedRecKeys)
                  for (const recId of event.revision.appliedRecommendationIds) {
                    nextApplied.add(buildSceneRecSelectionKey(event.sceneIndex, recId))
                  }
                  patchArRecommendationsBackgroundState(projectId, {
                    appliedRecKeys: nextApplied,
                  })
                  setSelectedRecKeys((prev) => {
                    const next = new Set(prev)
                    for (const recId of event.revision!.appliedRecommendationIds) {
                      next.delete(buildSceneRecSelectionKey(event.sceneIndex, recId))
                    }
                    return next
                  })
                  setLocalSceneAnalysis((prev) => {
                    if (!prev) return prev
                    const appliedSet = new Set(event.revision!.appliedRecommendationIds)
                    return prev.map((sa, idx) => {
                      if (resolveSceneAnalysisIndex(sa, idx) !== event.sceneIndex) return sa
                      const nextRecs = (sa.recommendations || []).filter(
                        (rec, rIdx) => !appliedSet.has(recommendationId(rec, rIdx))
                      )
                      return { ...sa, recommendations: nextRecs }
                    })
                  })
                }
              },
              onPersistRevisedScenes: async (revisions) => {
                const currentBg = getArRecommendationsBackgroundState(projectId)
                const nextApplied = new Set(currentBg.appliedRecKeys)
                for (const rev of revisions) {
                  for (const recId of rev.appliedRecommendationIds) {
                    nextApplied.add(buildSceneRecSelectionKey(rev.sceneIndex, recId))
                  }
                }
                patchArRecommendationsBackgroundState(projectId, {
                  appliedRecKeys: nextApplied,
                })
                setSelectedRecKeys((prev) => {
                  const next = new Set(prev)
                  for (const rev of revisions) {
                    for (const recId of rev.appliedRecommendationIds) {
                      next.delete(buildSceneRecSelectionKey(rev.sceneIndex, recId))
                    }
                  }
                  return next
                })
                setLocalSceneAnalysis((prev) => {
                  if (!prev) return prev
                  const byScene = new Map<number, Set<string>>()
                  for (const rev of revisions) {
                    byScene.set(rev.sceneIndex, new Set(rev.appliedRecommendationIds))
                  }
                  return prev.map((sa, idx) => {
                    const appliedSet = byScene.get(resolveSceneAnalysisIndex(sa, idx))
                    if (!appliedSet) return sa
                    const nextRecs = (sa.recommendations || []).filter(
                      (rec, rIdx) => !appliedSet.has(recommendationId(rec, rIdx))
                    )
                    return { ...sa, recommendations: nextRecs }
                  })
                })
                if (onBatchApplySceneRevisionsRef.current) {
                  return await onBatchApplySceneRevisionsRef.current(revisions)
                }
                await onRefreshProjectRef.current?.()
              },
            })

            patchArRecommendationsBackgroundState(projectId, {
              result,
            })

            const hasFailures = result.failedRevisions.length > 0
            const shouldAutoReanalyze =
              autoReanalyzeSnapshot && result.revisedSceneCount > 0
            const summaryText = shouldAutoReanalyze
              ? `Applied ${result.appliedRecommendationCount} recommendation${result.appliedRecommendationCount === 1 ? '' : 's'} across ${result.revisedSceneCount} scene${result.revisedSceneCount === 1 ? '' : 's'} — refreshing Audience Resonance score…`
              : `Applied ${result.appliedRecommendationCount} recommendation${result.appliedRecommendationCount === 1 ? '' : 's'} across ${result.revisedSceneCount} scene${result.revisedSceneCount === 1 ? '' : 's'} — re-run AR Analysis to update your score`

            setFinishPatch({
              subtitle:
                result.revisedSceneCount === 0 && hasFailures
                  ? result.failedRevisions[0]?.error || 'Scene Director revision failed'
                  : summaryText,
              meta: `${result.revisedSceneCount}/${initialGroups.length} scenes`,
              tone:
                result.revisedSceneCount === 0 && hasFailures
                  ? 'error'
                  : hasFailures
                    ? 'warning'
                    : 'success',
              actionLabel: 'Open AR Dialog',
              onAction: reopenArDialog,
            })

            if (result.revisedSceneCount === 0 && hasFailures) {
              const firstErr = result.failedRevisions[0]?.error || 'Scene Director revision failed'
              toast.error(
                `Failed to revise ${result.failedRevisions.length} scene${result.failedRevisions.length === 1 ? '' : 's'}: ${firstErr}`,
                {
                  duration: 10000,
                  action: { label: 'Open AR Dialog', onClick: reopenArDialog },
                }
              )
            } else if (hasFailures) {
              toast.warning(
                `${summaryText} (${result.failedRevisions.length} scene${result.failedRevisions.length === 1 ? '' : 's'} failed)`,
                {
                  duration: 10000,
                  action: { label: 'Open AR Dialog', onClick: reopenArDialog },
                }
              )
            } else {
              toast.success(summaryText, {
                duration: 10000,
                action: { label: 'Open AR Dialog', onClick: reopenArDialog },
              })
            }

            if (shouldAutoReanalyze) {
              void onRegenerateRef.current?.(targetDemographicSnapshot)
            }

            return result
          }
        )
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError')
        ) {
          dismissAgentRun(dockRunId)
          if (completedBeforeAbortCount > 0) {
            toast.info(
              `Scene Director Agent cancelled — saved ${completedBeforeAbortCount} completed scene${completedBeforeAbortCount === 1 ? '' : 's'}`
            )
          } else {
            toast.info('Scene Director Agent cancelled')
          }
        } else {
          toast.error(
            err instanceof Error ? err.message : 'Failed to apply scene recommendations'
          )
        }
      } finally {
        patchArRecommendationsBackgroundState(projectId, {
          isRunning: false,
          progress: null,
          abortController: null,
        })
      }
    })()
  }

  const handleRunSingleSceneDirector = (sceneIndex: number, unappliedRecIds: string[]) => {
    const keysForScene = new Set<string>()
    for (const recId of unappliedRecIds) {
      const k = buildSceneRecSelectionKey(sceneIndex, recId)
      if (selectedRecKeys.has(k)) {
        keysForScene.add(k)
      }
    }
    if (keysForScene.size === 0) {
      unappliedRecIds.forEach((recId) => {
        keysForScene.add(buildSceneRecSelectionKey(sceneIndex, recId))
      })
    }
    handleRunPreVisPrepAgent(keysForScene)
  }

  const handleRetryFailedScenes = () => {
    const failedIndices = preVisPrepResult?.failedSceneIndices
    if (!failedIndices || failedIndices.length === 0) return
    const retryKeys = collectInitialSelectedRecKeys(sceneAnalysis, scriptScenes, {
      sceneIndicesFilter: new Set(failedIndices),
      localAppliedKeys: localAppliedRecKeys,
    })
    if (retryKeys.size === 0) {
      toast.info('No unapplied recommendations remaining on failed scenes')
      return
    }
    setSelectedRecKeys(retryKeys)
    handleRunPreVisPrepAgent(retryKeys)
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

  // Background analysis can finish after further edits, in which case scene
  // numbers may no longer line up with what was scored.
  const reviewIsStale = isStoredReviewStale(
    review as { baseScriptUpdatedAt?: string | null; stale?: boolean } | null,
    scriptUpdatedAt
  )
  const deductions = review?.deductions || []
  const jumpToScenes = () => {
    const highImpactIndex = firstHighImpactSceneIndex(sceneAnalysis)
    if (highImpactIndex !== null) {
      jumpToScene(highImpactIndex)
      return
    }
    stopPlayback()
    onClose()
  }
  const showVsTellRatio = review?.showVsTellRatio ?? 0
  const totalDeductions = deductions.reduce((sum, d) => sum + d.points, 0)
  const selectedSummary = summarizeSelectedRecommendations(
    sceneAnalysis,
    selectedRecKeys,
    scriptScenes,
    localAppliedRecKeys
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="script-review-dialog-title"
        className="dialog-text-reset bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          {/* Top Line: Title & Close Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              <h2
                id="script-review-dialog-title"
                className="dashboard-widget-title text-lg font-semibold leading-tight m-0"
              >
                Audience Analysis
              </h2>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded ml-2">Script Analysis and Recommendations</span>
              {reviewIsStale && (
                <span className="ml-1 inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Out of date
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {review && projectId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleShareListenOnly()}
                  disabled={sharingReport}
                  className="h-8 gap-1.5 text-xs"
                >
                  {sharingReport ? (
                    <Loader className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  {shareUrl ? 'Copy listen-only link' : 'Share listen-only report'}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  stopPlayback()
                  onClose()
                }}
                className="h-8 w-8 p-0 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {reviewIsStale && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Your script changed after this analysis started, so scene numbers and fixes may no
                longer match.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={isGenerating}
                onClick={() => void handleRegenerate()}
                className="h-7 border-amber-500/50 text-xs text-amber-700 dark:text-amber-300"
              >
                <RefreshCw className={`mr-1.5 h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                Re-run analysis
              </Button>
            </div>
          )}

          {/* Bottom Line: Action Buttons & Playback Control */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-3">
              {playingSection && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopPlayback}
                  className="flex items-center gap-1 text-red-500 border-red-300 h-8"
                >
                  <VolumeX className="w-3 h-3" />
                  Stop Playback
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <AssistantPickerButton
                selectedVoiceId={selectedVoiceId}
                onSelect={(voiceId, voiceName) => {
                  const assistant = resolveAssistant(voiceId)
                  setSidebarVoiceSelection(assistant.voiceId, voiceName || assistant.title)
                  persistAssistantVoice(assistant)
                }}
              />
              <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-2 ml-1">
                <Popover open={targetAudienceOpen} onOpenChange={setTargetAudienceOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 max-w-[200px] truncate"
                    >
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Target audience</span>
                      <span className="sm:hidden">Audience</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[min(calc(100vw-2rem),28rem)] p-0 border-gray-700 bg-gray-950 shadow-xl"
                    align="end"
                    sideOffset={8}
                  >
                    <div className="p-4 max-h-[min(70vh,520px)] overflow-y-auto custom-scrollbar">
                      <p className="text-sm font-semibold text-white mb-1">Target audience</p>
                      <p className="text-xs text-gray-400 mb-2">
                        {projectAudienceDefinition
                          ? 'Loaded from your Blueprint project audience.'
                          : 'Tailor scoring, feedback, and scene recommendations to this profile.'}
                      </p>
                      {projectId && (
                        <Link
                          href={`/dashboard/studio/${projectId}`}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 mb-3 inline-block"
                        >
                          Edit audience in Blueprint →
                        </Link>
                      )}
                      <AudienceDescriptionField
                        value={audienceDef}
                        onChange={setAudienceDef}
                        projectId={projectId}
                        variant="compact"
                        rows={3}
                      />
                      <label className="block text-xs text-gray-400 mt-4 mb-1">
                        Analysis direction (optional)
                      </label>
                      <Textarea
                        value={audienceDef.customDirection || ''}
                        onChange={(e) =>
                          setAudienceDef((prev) =>
                            createAudienceDefinition({
                              ...prev,
                              customDirection: e.target.value,
                            })
                          )
                        }
                        placeholder="e.g. Focus on Gen Z social-media pacing and authenticity…"
                        className="min-h-[72px] text-xs bg-slate-900 border-slate-700"
                      />
                      <Button
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => setTargetAudienceOpen(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 h-8 text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {isGenerating ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Analyze
                </Button>
              </div>
              {/* Scene Director Agent quick-launch button */}
              {review && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeTab === 'recommendations' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveTab('recommendations')}
                        className={cn(
                          'flex items-center gap-1.5 h-8 text-xs ml-1',
                          activeTab === 'recommendations'
                            ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white border-0'
                            : 'border-cyan-500/50 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10'
                        )}
                      >
                        {isRunningPreVisPrep ? (
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Clapperboard className="w-3.5 h-3.5" />
                        )}
                        <span>Scene Director</span>
                        {selectedSummary.totalUnappliedCount > 0 && (
                          <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                            {selectedSummary.selectedRecCount}/{selectedSummary.totalUnappliedCount}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs bg-gray-900 text-white p-3">
                      <div className="space-y-1.5">
                        <p className="font-medium flex items-center gap-1.5">
                          <Clapperboard className="w-3.5 h-3.5 text-cyan-400" />
                          Scene Director Agent
                        </p>
                        <p className="text-xs text-gray-300">
                          Review, select/unselect, and automatically apply scene-by-scene recommendations across multiple scenes in parallel.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* Go to Scenes with tooltip showing scene stats */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={jumpToScenes}
                      className="flex items-center gap-2 h-8 text-xs border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    >
                      <Film className="w-3.5 h-3.5" />
                      Go to Scenes
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs bg-gray-900 text-white p-3">
                    <div className="space-y-2">
                      <p className="font-medium">Scene Editing</p>
                      <p className="text-xs text-gray-300">
                        Per-scene analysis and optimization is integrated into each scene header.
                      </p>
                      {sceneAnalysis.length > 0 && (
                        <div className="flex items-center gap-3 text-xs pt-1 border-t border-gray-700">
                          <span>{sceneAnalysis.length} scenes</span>
                          <span className="text-green-400">{sceneAnalysis.filter(s => s.score >= 80).length} ready</span>
                          <span className="text-amber-400">{sceneAnalysis.filter(s => s.score < 80).length} to optimize</span>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
                      onClick={handleRegenerate}
                      disabled={isGenerating}
                      className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      {isGenerating ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                      Re-analyze
                    </Button>
                  </div>
                )}
                <TabsList className="grid w-full grid-cols-3">
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
                    value="recommendations" 
                    className="flex items-center gap-1.5 text-xs sm:text-sm"
                    title="Scene-by-scene breakdown and Scene Director Agent"
                  >
                    <Clapperboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Scene Breakdown &amp; Director</span>
                    <span className="sm:hidden">Director</span>
                    {selectedSummary.totalUnappliedCount > 0 ? (
                      <Badge variant="secondary" className="ml-1 text-[11px] h-5 px-1.5 hidden sm:flex bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-0 tabular-nums">
                        {selectedSummary.selectedRecCount}/{selectedSummary.totalUnappliedCount}
                      </Badge>
                    ) : sceneAnalysis.length > 0 ? (
                      <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5 hidden sm:flex">
                        {sceneAnalysis.length}
                      </Badge>
                    ) : null}
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

                    {/* Top Impact Issues (from scene recommendations) */}
                    {(() => {
                      const topIssues = collectTopImpactIssues(sceneAnalysis, {
                        excludeApplied: true,
                        limit: 5,
                      }).filter(
                        (issue) =>
                          !isRecommendationApplied(
                            issue.sceneIndex,
                            issue.recId,
                            scriptScenes,
                            localAppliedRecKeys
                          )
                      )
                      if (topIssues.length === 0) return null

                      return (
                        <div className="mt-4 border-t pt-4">
                          <button
                            onClick={() => setShowDeductions(!showDeductions)}
                            className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-red-500" />
                              <span className="text-sm font-medium">Top Impact Issues</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-rose-400/40 text-rose-600 dark:text-rose-400">
                                {topIssues.length}
                              </Badge>
                            </div>
                            {showDeductions ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          
                          {showDeductions && (
                            <div className="mt-3 space-y-2.5 pl-1 pr-1">
                              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                                {topIssues.map((issue) => {
                                  const issueSelectionKey = buildSceneRecSelectionKey(
                                    issue.sceneIndex,
                                    issue.recId
                                  )
                                  const isIssueSelected = selectedRecKeys.has(issueSelectionKey)
                                  return (
                                    <div
                                      key={`${issue.sceneIndex}-${issue.recId}`}
                                      className={cn(
                                        'flex items-start gap-2.5 text-sm text-left w-full p-3 rounded-md border transition-colors',
                                        isIssueSelected
                                          ? 'bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60'
                                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
                                      )}
                                    >
                                      <Checkbox
                                        checked={isIssueSelected}
                                        onCheckedChange={() =>
                                          handleToggleRecSelection(issue.sceneIndex, issue.recId)
                                        }
                                        disabled={isRunningPreVisPrep}
                                        className="mt-0.5"
                                        aria-label={`Select Scene ${issue.sceneNum} recommendation for Scene Director Agent`}
                                      />
                                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            Scene {issue.sceneNum}: {issue.heading}
                                          </span>
                                          <div className="flex gap-1.5 shrink-0">
                                            {issue.rec.priority && (
                                              <Badge 
                                                variant="outline" 
                                                className={`text-[10px] uppercase tracking-wider ${
                                                  issue.rec.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                  issue.rec.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}
                                              >
                                                {issue.rec.priority}
                                              </Badge>
                                            )}
                                            <Badge variant="destructive" className="text-[10px] shrink-0">
                                              -{issue.rec.pointsDeducted} pts
                                            </Badge>
                                          </div>
                                        </div>
                                        <span className="text-gray-600 dark:text-gray-400">{issue.rec.text}</span>
                                        <div className="flex items-center justify-between gap-2 mt-1">
                                          {issue.rec.category ? (
                                            <span className="text-xs text-gray-400">{issue.rec.category}</span>
                                          ) : <span />}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (typeof issue.sceneNum === 'number' && issue.sceneNum > 0) {
                                                jumpToScene(issue.sceneNum - 1)
                                              }
                                            }}
                                            className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                                          >
                                            Go to scene →
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                                <span className="text-gray-500 dark:text-gray-400">
                                  Checked items are queued for Scene Director Agent
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('recommendations')}
                                  className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                                >
                                  Review all {selectedSummary.totalUnappliedCount} recommendations →
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

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

                {/* Scene Director Agent Overview Callout — Automated Scene-by-Scene Recommendations */}
                {!scenePromptDismissed && (
                  <Card className="border-cyan-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/90 to-cyan-950/90 text-white shadow-md">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-0.5 p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30 shrink-0">
                            <Clapperboard className="w-4 h-4 text-cyan-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white">
                                Scene Director Agent
                              </span>
                              <Badge variant="outline" className="border-cyan-400/40 bg-cyan-500/15 text-cyan-200 text-[10px]">
                                Automated Multi-Scene Revision
                              </Badge>
                              {selectedSummary.selectedPointsDeducted > 0 && (
                                <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/15 text-emerald-200 text-[10px] tabular-nums">
                                  Up to +{selectedSummary.selectedPointsDeducted} pts at stake
                                </Badge>
                              )}
                            </div>

                            {sceneAnalysis.length === 0 ? (
                              <>
                                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                                  Generate a scene-by-scene breakdown to let the <strong>Scene Director Agent</strong> apply targeted recommendations across your script automatically—without manually cycling through each scene.
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => void handleGenerateSceneAnalysis()}
                                    disabled={isGeneratingSceneAnalysis || !projectId || scriptScenes.length === 0}
                                    className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border-0 h-8 text-xs font-semibold"
                                  >
                                    {isGeneratingSceneAnalysis ? (
                                      <>
                                        <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        Analyzing Scenes…
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                        Generate Scene Breakdown
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={jumpToScenes}
                                    className="border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 h-8 text-xs"
                                  >
                                    <Film className="w-3.5 h-3.5 mr-1.5" />
                                    Go to Scenes
                                  </Button>
                                </div>
                              </>
                            ) : selectedSummary.totalUnappliedCount > 0 ? (
                              <>
                                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                                  <strong>{selectedSummary.selectedRecCount} of {selectedSummary.totalUnappliedCount}</strong> scene recommendations are selected by default across <strong>{selectedSummary.selectedSceneCount} scene{selectedSummary.selectedSceneCount === 1 ? '' : 's'}</strong>. Review &amp; uncheck any items you want to skip, or run the Scene Director Agent in the background now.
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
                                  <span>{sceneAnalysis.length} scenes analyzed</span>
                                  <span className="text-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {sceneAnalysis.filter(s => s.score >= 80).length} scoring 80+
                                  </span>
                                  {sceneAnalysis.filter(s => s.score < 80).length > 0 && (
                                    <span className="text-amber-300">
                                      {sceneAnalysis.filter(s => s.score < 80).length} below 80
                                    </span>
                                  )}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => setActiveTab('recommendations')}
                                    className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border-0 h-8 text-xs font-semibold"
                                  >
                                    <ListChecks className="w-3.5 h-3.5 mr-1.5" />
                                    Review &amp; Select ({selectedSummary.selectedRecCount}/{selectedSummary.totalUnappliedCount})
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isRunningPreVisPrep || !projectId || selectedSummary.selectedRecCount === 0}
                                    onClick={() => handleRunPreVisPrepAgent()}
                                    className="border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 h-8 text-xs font-medium"
                                  >
                                    {isRunningPreVisPrep ? (
                                      <>
                                        <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        Scene Director Running…
                                      </>
                                    ) : (
                                      <>
                                        <Clapperboard className="w-3.5 h-3.5 mr-1.5" />
                                        Run Scene Director ({selectedSummary.selectedSceneCount} Scene{selectedSummary.selectedSceneCount === 1 ? '' : 's'})
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-emerald-200 mt-1.5 leading-relaxed">
                                  All scene recommendations from this analysis have been applied! Re-run Audience Analysis to measure your updated score, or jump to scenes to continue production.
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    disabled={isGenerating}
                                    onClick={() => void handleRegenerate()}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-8 text-xs"
                                  >
                                    <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isGenerating && 'animate-spin')} />
                                    Re-run AR Analysis
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={jumpToScenes}
                                    className="border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 h-8 text-xs"
                                  >
                                    <Film className="w-3.5 h-3.5 mr-1.5" />
                                    Go to Scenes
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setScenePromptDismissed(true)}
                          className="text-slate-400 hover:text-white shrink-0 h-7 w-7 p-0"
                          aria-label="Dismiss Scene Director prompt"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
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

                {/* Recommendations Tab */}
                {activeTab === 'recommendations' && (() => {
                  const allUnappliedKeys = collectInitialSelectedRecKeys(
                    sceneAnalysis,
                    scriptScenes,
                    { localAppliedKeys: localAppliedRecKeys }
                  )
                  const highImpactUnappliedKeys = collectInitialSelectedRecKeys(
                    sceneAnalysis,
                    scriptScenes,
                    { highImpactOnly: true, localAppliedKeys: localAppliedRecKeys }
                  )
                  const lowScoreUnappliedKeys = collectInitialSelectedRecKeys(
                    sceneAnalysis,
                    scriptScenes,
                    { maxSceneScoreExclusive: 80, localAppliedKeys: localAppliedRecKeys }
                  )
                  const selectedGroups = groupSelectedRecommendationsByScene(
                    sceneAnalysis,
                    selectedRecKeys,
                    scriptScenes,
                    localAppliedRecKeys
                  )
                  const selectedSceneIndexSet = new Set(
                    selectedGroups.map((g) => g.sceneIndex)
                  )
                  const selectedRecCount = selectedGroups.reduce(
                    (sum, g) => sum + g.selectedRecommendations.length,
                    0
                  )

                  return (
                  <div className="space-y-6">
                    {sceneAnalysis.length > 0 && (
                      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-slate-900/95 via-indigo-950/80 to-cyan-950/80 p-4 text-white shadow-md">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/20 border border-cyan-400/30 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                                <Clapperboard className="w-3.5 h-3.5 text-cyan-300" />
                                Scene Director Agent
                              </span>
                              <Badge variant="outline" className="border-purple-400/40 bg-purple-500/15 text-purple-200 text-[10px]">
                                Concurrent Scene Revision ({DEFAULT_SCENE_DIRECTOR_CONCURRENCY}x)
                              </Badge>
                              {selectedSummary.selectedPointsDeducted > 0 && (
                                <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/15 text-emerald-200 text-[10px] tabular-nums">
                                  Up to +{selectedSummary.selectedPointsDeducted} pts targeted
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed m-0">
                              All unapplied recommendations are selected by default. Uncheck any recommendations you do not want to apply, then run the Scene Director Agent to revise scenes concurrently in the background.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDirectorOptions((prev) => !prev)}
                              className={cn(
                                'h-9 px-3 text-xs border-white/20 bg-white/5 hover:bg-white/15 text-slate-200',
                                (showDirectorOptions || directorNote.trim().length > 0 || revisionDepth !== 'moderate' || autoReanalyzeAfterApply) &&
                                  'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                              )}
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                              Options
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRunPreVisPrepAgent()}
                              disabled={isRunningPreVisPrep || !projectId || selectedRecCount === 0}
                              className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border-0 shadow-sm h-9 px-3.5 text-xs font-semibold"
                            >
                              {isRunningPreVisPrep ? (
                                <>
                                  <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  Running Scene Director…
                                </>
                              ) : (
                                <>
                                  <Clapperboard className="w-3.5 h-3.5 mr-1.5" />
                                  Run Scene Director ({selectedRecCount} in {selectedGroups.length} Scene{selectedGroups.length === 1 ? '' : 's'})
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Bulk selection bar */}
                        <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-300 flex-wrap">
                            <span className="font-medium text-white">
                              {selectedRecCount} of {allUnappliedKeys.size}
                            </span>
                            <span>unapplied recommendation{allUnappliedKeys.size === 1 ? '' : 's'} selected</span>
                            {selectedGroups.length > 0 && (
                              <span className="text-cyan-300">
                                ({selectedGroups.length} scene{selectedGroups.length === 1 ? '' : 's'} queued)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              disabled={isRunningPreVisPrep || allUnappliedKeys.size === 0}
                              onClick={() => handleSelectAllRecommendations({ highImpactOnly: false })}
                              className="rounded px-2 py-1 text-[11px] font-medium bg-white/10 hover:bg-white/20 text-slate-100 disabled:opacity-40 transition-colors"
                            >
                              Select All ({allUnappliedKeys.size})
                            </button>
                            {highImpactUnappliedKeys.size > 0 && (
                              <button
                                type="button"
                                disabled={isRunningPreVisPrep}
                                onClick={() => handleSelectAllRecommendations({ highImpactOnly: true })}
                                className="rounded px-2 py-1 text-[11px] font-medium bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 disabled:opacity-40 transition-colors"
                              >
                                High-Impact Only ({highImpactUnappliedKeys.size})
                              </button>
                            )}
                            {lowScoreUnappliedKeys.size > 0 && lowScoreUnappliedKeys.size < allUnappliedKeys.size && (
                              <button
                                type="button"
                                disabled={isRunningPreVisPrep}
                                onClick={() =>
                                  handleSelectAllRecommendations({ maxSceneScoreExclusive: 80 })
                                }
                                className="rounded px-2 py-1 text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 disabled:opacity-40 transition-colors"
                              >
                                Scenes &lt; 80 ({lowScoreUnappliedKeys.size})
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isRunningPreVisPrep || selectedRecCount === 0}
                              onClick={handleClearAllRecommendations}
                              className="rounded px-2 py-1 text-[11px] font-medium bg-white/5 hover:bg-white/15 text-slate-300 disabled:opacity-40 transition-colors"
                            >
                              Clear Selection
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Scene Director Optimization Options */}
                        {showDirectorOptions && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-slate-300 font-medium">Revision Depth:</span>
                                {(
                                  [
                                    { id: 'light', label: 'Polish', hint: 'Tighten wording, keep beat count' },
                                    { id: 'moderate', label: 'Rewrite (Default)', hint: 'Substantive dialogue & beat fixes' },
                                    { id: 'deep', label: 'Restructure', hint: 'Reimagine scene staging & flow' },
                                  ] as const
                                ).map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    title={opt.hint}
                                    disabled={isRunningPreVisPrep}
                                    onClick={() => setRevisionDepth(opt.id)}
                                    className={cn(
                                      'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors border',
                                      revisionDepth === opt.id
                                        ? 'bg-cyan-500/25 border-cyan-400 text-white'
                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-4 flex-wrap">
                                <label className="inline-flex items-center gap-2 cursor-pointer text-slate-200">
                                  <Checkbox
                                    checked={preserveMusic}
                                    onCheckedChange={(v) => setPreserveMusic(Boolean(v))}
                                    disabled={isRunningPreVisPrep}
                                  />
                                  <span>Preserve scene music cues</span>
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer text-slate-200">
                                  <Checkbox
                                    checked={autoReanalyzeAfterApply}
                                    onCheckedChange={(v) => setAutoReanalyzeAfterApply(Boolean(v))}
                                    disabled={isRunningPreVisPrep}
                                  />
                                  <span>Auto re-score AR when done</span>
                                </label>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                                Global Director Note (optional — applied across all selected scenes)
                              </label>
                              <Textarea
                                value={directorNote}
                                onChange={(e) => setDirectorNote(e.target.value)}
                                disabled={isRunningPreVisPrep}
                                rows={2}
                                placeholder="e.g. Keep dialogue sharp and naturalistic; convert exposition into visual action without adding voiceover…"
                                className="min-h-[52px] text-xs bg-slate-950/70 border-slate-700 text-slate-100 placeholder:text-slate-500"
                              />
                            </div>
                          </div>
                        )}

                        {/* Live progress bar */}
                        {isRunningPreVisPrep && preVisPrepProgress && (
                          <div className="mt-3 rounded-lg border border-cyan-400/30 bg-slate-950/70 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Loader className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                                <span className="font-medium text-cyan-100 truncate">
                                  {preVisPrepProgress.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] tabular-nums text-slate-400">
                                  {preVisPrepProgress.done}/{preVisPrepProgress.total}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelPreVisPrep}
                                  className="h-6 px-2 text-[11px] border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300"
                                style={{
                                  width: `${
                                    typeof preVisPrepProgress.progressPct === 'number'
                                      ? preVisPrepProgress.progressPct
                                      : preVisPrepProgress.total > 0
                                        ? Math.min(
                                            100,
                                            Math.round(
                                              (preVisPrepProgress.done / preVisPrepProgress.total) * 100
                                            )
                                          )
                                        : 15
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Completion banner — Re-run AR Analysis to iterate or Launch Production Agent */}
                        {!isRunningPreVisPrep && preVisPrepResult && preVisPrepResult.revisedSceneCount > 0 && (
                          <div className="mt-3 rounded-lg border border-emerald-400/40 bg-emerald-950/40 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                            <div className="flex items-start gap-2 text-xs text-emerald-100">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <div className="font-semibold text-white">
                                  Applied {preVisPrepResult.appliedRecommendationCount} Recommendation{preVisPrepResult.appliedRecommendationCount === 1 ? '' : 's'} Across {preVisPrepResult.revisedSceneCount} Scene{preVisPrepResult.revisedSceneCount === 1 ? '' : 's'}
                                </div>
                                <p className="text-[11px] text-emerald-200/90 m-0 mt-0.5">
                                  Re-run AR Analysis to score your updated script, or proceed to Production (updated scenes are flagged for Shot Direction).
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                disabled={isGenerating}
                                onClick={() => void handleRegenerate()}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-8 px-3 text-xs"
                              >
                                <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isGenerating && 'animate-spin')} />
                                {isGenerating ? 'Analyzing Script…' : 'Re-run AR Analysis'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  stopPlayback()
                                  onClose()
                                  if (typeof window !== 'undefined') {
                                    window.dispatchEvent(
                                      new CustomEvent('sceneflow:open-production-builder')
                                    )
                                  }
                                }}
                                className="border-emerald-400/40 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-100 h-8 px-3 text-xs"
                              >
                                <Bot className="w-3.5 h-3.5 mr-1.5" />
                                Production Agent
                              </Button>
                            </div>
                          </div>
                        )}
                        {!isRunningPreVisPrep && preVisPrepResult && preVisPrepResult.failedRevisions.length > 0 && (
                          <div className="mt-3 rounded-lg border border-rose-400/40 bg-rose-950/40 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-rose-100">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <div className="font-semibold text-white">
                                  {preVisPrepResult.failedRevisions.length} Scene{preVisPrepResult.failedRevisions.length === 1 ? '' : 's'} Failed During Scene Director Revision
                                </div>
                                <p className="text-[11px] text-rose-200/90 m-0 mt-0.5">
                                  {preVisPrepResult.failedRevisions
                                    .map((f) => `Scene ${f.sceneNumber}: ${f.error}`)
                                    .join(' · ')}
                                </p>
                              </div>
                            </div>
                            {preVisPrepResult.failedSceneIndices && preVisPrepResult.failedSceneIndices.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRetryFailedScenes}
                                className="h-8 px-3 text-xs border-rose-400/50 bg-rose-950/60 hover:bg-rose-900/60 text-rose-100 shrink-0"
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                Retry Failed ({preVisPrepResult.failedSceneIndices.length})
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ListChecks className="w-5 h-5 text-purple-600" />
                          Scene Breakdown
                        </CardTitle>
                        {sceneAnalysis.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs">
                            {(
                              [
                                { id: 'all', label: `All Scenes (${sceneAnalysis.length})` },
                                {
                                  id: 'with-recs',
                                  label: `With Recommendations (${selectedSummary.totalScenesWithUnappliedCount})`,
                                },
                                {
                                  id: 'selected',
                                  label: `Selected (${selectedGroups.length})`,
                                },
                              ] as const
                            ).map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSceneFilter(tab.id)}
                                className={cn(
                                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors border',
                                  sceneFilter === tab.id
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                                )}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        {sceneAnalysis.length === 0 ? (
                          <div className="text-center py-10 space-y-3">
                            <Clapperboard className="w-10 h-10 mx-auto text-purple-500/60" />
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              No scene-by-scene breakdown generated yet
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                              Generate per-scene resonance scores and targeted recommendations so the Scene Director Agent can revise multiple scenes automatically.
                            </p>
                            {projectId && scriptScenes.length > 0 && (
                              <Button
                                size="sm"
                                onClick={() => void handleGenerateSceneAnalysis()}
                                disabled={isGeneratingSceneAnalysis}
                                className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white"
                              >
                                {isGeneratingSceneAnalysis ? (
                                  <>
                                    <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    Generating Scene Breakdown…
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                    Generate Scene-by-Scene Recommendations
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {sceneAnalysis.map((scene, index) => {
                              const resolvedSceneIdx = resolveSceneAnalysisIndex(scene, index)
                              const sceneRecs = Array.isArray(scene.recommendations)
                                ? scene.recommendations
                                : []
                              const unappliedRecsInScene = sceneRecs
                                .map((rec, rIdx) => ({
                                  rec,
                                  rIdx,
                                  recId: recommendationId(rec, rIdx),
                                }))
                                .filter(
                                  ({ recId }) =>
                                    !isRecommendationApplied(
                                      resolvedSceneIdx,
                                      recId,
                                      scriptScenes,
                                      localAppliedRecKeys
                                    )
                                )
                              if (sceneFilter === 'with-recs' && unappliedRecsInScene.length === 0) {
                                return null
                              }
                              if (sceneFilter === 'selected' && !selectedSceneIndexSet.has(resolvedSceneIdx)) {
                                return null
                              }
                              const unappliedRecIdsInScene = unappliedRecsInScene.map(({ recId }) => recId)
                              const hasUnappliedHighImpact = unappliedRecsInScene.some(({ rec }) =>
                                recommendationIsHighImpact(rec)
                              )
                              const selectedInSceneCount = unappliedRecIdsInScene.filter((recId) =>
                                selectedRecKeys.has(buildSceneRecSelectionKey(resolvedSceneIdx, recId))
                              ).length
                              const allInSceneSelected =
                                unappliedRecIdsInScene.length > 0 &&
                                selectedInSceneCount === unappliedRecIdsInScene.length

                              return (
                              <div
                                key={index}
                                className={cn(
                                  'rounded-lg border p-3.5 bg-gray-50 dark:bg-gray-800/40',
                                  hasUnappliedHighImpact
                                    ? 'border-rose-400/70 dark:border-rose-500/50'
                                    : 'border-gray-200 dark:border-gray-700'
                                )}
                              >
                                <div className="flex items-start justify-between gap-3 mb-2.5 flex-wrap">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[11px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                                        Scene {scene.sceneNumber}
                                      </span>
                                      {hasUnappliedHighImpact && (
                                        <Badge variant="destructive" className="text-[10px] uppercase tracking-wider">
                                          High impact
                                        </Badge>
                                      )}
                                      {sceneRecs.length > 0 && unappliedRecsInScene.length === 0 && (
                                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                                          All fixes applied
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="ar-scene-heading mt-1.5 mb-0 text-sm font-medium leading-snug tracking-wide text-gray-800 dark:text-gray-100">
                                      {scene.sceneHeading}
                                    </p>
                                    {scene.notes ? (
                                      <p className="mt-1 mb-0 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                        {scene.notes}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    {scene.storyWeight && (
                                      <div className="flex flex-col items-end">
                                        <span className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200">
                                          {scene.storyWeight}%
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wider text-gray-400">Weight</span>
                                      </div>
                                    )}
                                    <div className="flex flex-col items-end">
                                      <span className={`text-sm font-semibold tabular-nums ${scene.score >= 80 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {scene.score}
                                      </span>
                                      <span className="text-[10px] uppercase tracking-wider text-gray-400">Score</span>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const n = scene.sceneNumber
                                        jumpToScene(typeof n === 'number' && n > 0 ? n - 1 : index)
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      <Film className="w-3.5 h-3.5 mr-1" />
                                      Go to scene
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Metrics */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                  <Badge variant="outline" className="text-xs bg-white dark:bg-gray-900">
                                    Pacing: <span className="ml-1 capitalize">{scene.pacing}</span>
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-white dark:bg-gray-900">
                                    Tension: <span className="ml-1 capitalize">{scene.tension}</span>
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-white dark:bg-gray-900">
                                    Visual: <span className="ml-1 capitalize">{scene.visualPotential}</span>
                                  </Badge>
                                </div>
                                
                                {/* Specific Recommendations (only unapplied recommendations are shown) */}
                                {unappliedRecsInScene.length > 0 && (
                                  <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-purple-100 dark:border-purple-900/30">
                                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                                      <div className="text-[10px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                                        Recommendations ({selectedInSceneCount}/{unappliedRecIdsInScene.length} selected)
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <button
                                          type="button"
                                          disabled={isRunningPreVisPrep}
                                          onClick={() =>
                                            handleToggleSceneRecommendations(
                                              resolvedSceneIdx,
                                              unappliedRecIdsInScene
                                            )
                                          }
                                          className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-40"
                                        >
                                          {allInSceneSelected ? 'Unselect scene' : 'Select scene'}
                                        </button>
                                        {projectId && (
                                          <button
                                            type="button"
                                            disabled={isRunningPreVisPrep}
                                            onClick={() =>
                                              handleRunSingleSceneDirector(
                                                resolvedSceneIdx,
                                                unappliedRecIdsInScene
                                              )
                                            }
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline disabled:opacity-40"
                                            title="Run Scene Director Agent on just this scene in the background"
                                          >
                                            <Clapperboard className="w-3 h-3" />
                                            Direct Scene {scene.sceneNumber}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <ul className="space-y-1.5 mb-0">
                                      {unappliedRecsInScene.map(({ rec, rIdx, recId }) => {
                                        const recText = typeof rec === 'string' ? rec : rec?.text || String(rec)
                                        const recPriority = typeof rec === 'object' && rec?.priority ? rec.priority : null
                                        const recCategory = typeof rec === 'object' && rec?.category ? rec.category : null
                                        const recTargetElement = typeof rec === 'object' && rec?.targetElement ? rec.targetElement : null
                                        const recPointsDeducted = typeof rec === 'object' && rec?.pointsDeducted ? rec.pointsDeducted : null
                                        const selectionKey = buildSceneRecSelectionKey(resolvedSceneIdx, recId)
                                        const isSelected = selectedRecKeys.has(selectionKey)

                                        return (
                                          <li
                                            key={recId || rIdx}
                                            className={cn(
                                              'text-sm rounded-md px-2 py-1.5 transition-colors mb-0',
                                              isSelected
                                                ? 'bg-purple-50/70 dark:bg-purple-950/25 text-gray-800 dark:text-gray-200'
                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 opacity-75'
                                            )}
                                          >
                                            <label
                                              className={cn(
                                                'flex items-start gap-2.5',
                                                isRunningPreVisPrep ? 'cursor-default' : 'cursor-pointer'
                                              )}
                                            >
                                              <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() =>
                                                  handleToggleRecSelection(resolvedSceneIdx, recId)
                                                }
                                                disabled={isRunningPreVisPrep}
                                                className="mt-0.5"
                                              />
                                              <span className="flex-1 leading-snug">
                                                <span>{recText}</span>
                                                {recPriority && (
                                                  <Badge variant="outline" className={`ml-2 text-[10px] px-1 py-0 h-4 border-none uppercase tracking-wider ${
                                                    recPriority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    recPriority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                  }`}>
                                                    {recPriority}
                                                  </Badge>
                                                )}
                                                {recPointsDeducted && (
                                                  <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0 h-4 border-none uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    -{recPointsDeducted} pts
                                                  </Badge>
                                                )}
                                                {recCategory && (
                                                  <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 h-4 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                                                    {recCategory}
                                                  </Badge>
                                                )}
                                                {recTargetElement && (
                                                  <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 border-indigo-300/60 dark:border-indigo-700/60 text-indigo-600 dark:text-indigo-400 capitalize">
                                                    {recTargetElement}
                                                  </Badge>
                                                )}
                                              </span>
                                            </label>
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  </div>
                                )}
                              </div>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  )
                })()}

              </div>
            </Tabs>
          )}
        </div>


      </div>
    </div>
  )
}
