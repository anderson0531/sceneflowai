/**
 * Vision Page - Main workflow page for script and visual development
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 * @see /CONTRIBUTING.md for development guidelines
 * 
 * CRITICAL: Scene data source of truth is `script.script.scenes`
Implement the fix * Do NOT create separate `scenes` state - this causes sync bugs.
 * 
 * Key handlers:
 * - handleGenerateScene: Updates script.script.scenes, not separate state
 * - handleUploadScene: Updates script.script.scenes, not separate state
 */
'use client'
// Force rebuild: 2024-11-01

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { upload } from '@vercel/blob/client'
import { debounce } from 'lodash'
import { cleanupStaleAudio, clearAllSceneAudio } from '@/lib/audio/cleanupAudio'
import { toast } from 'sonner'
import { ScriptPanel } from '@/components/vision/ScriptPanel'
import { SceneSelector } from '@/components/vision/SceneSelector'
import { SceneGallery } from '@/components/vision/SceneGallery'
import { GenerationProgress } from '@/components/vision/GenerationProgress'
import { ScreeningRoomV2 } from '@/components/vision/ScreeningRoomV2'
import { ImageQualitySelector } from '@/components/vision/ImageQualitySelector'
import { VoiceSelector } from '@/components/tts/VoiceSelector'
import { Button, buttonVariants } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Share2, ArrowRight, ArrowLeft, Play, Volume2, Image as ImageIcon, Copy, Check, X, Settings, Info, Users, ChevronDown, ChevronUp, ChevronRight, Eye, Sparkles, BarChart3, Save, Home, FolderOpen, Key, CreditCard, User, Bookmark, FileText, Coins, ExternalLink, CheckCircle2, Circle, Music, Video } from 'lucide-react'
import { useStore } from '@/store/useStore'

const DirectorChairIcon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number }> = ({ size = 32, className, ...props }) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    aria-hidden="true"
    className={className}
    {...props}
  >
    <rect x="10" y="18" width="44" height="10" rx="2" className="fill-current" />
    <rect x="14" y="30" width="36" height="7" rx="2" className="fill-current" />
    <path d="M18 37L10 54" className="stroke-current" strokeWidth="3" strokeLinecap="round" />
    <path d="M46 37L54 54" className="stroke-current" strokeWidth="3" strokeLinecap="round" />
    <path d="M18 37L30 54" className="stroke-current" strokeWidth="3" strokeLinecap="round" />
    <path d="M46 37L34 54" className="stroke-current" strokeWidth="3" strokeLinecap="round" />
  </svg>
)
import Link from 'next/link'
import ScriptReviewModal from '@/components/vision/ScriptReviewModal'
import { SceneEditorModal } from '@/components/vision/SceneEditorModalV2'
import { NavigationWarningDialog } from '@/components/workflow/NavigationWarningDialog'
import { FilmTreatmentReviewModal } from '@/components/vision/FilmTreatmentReviewModal'
import { findSceneCharacters, findSceneObjects } from '../../../../../lib/character/matching'
import { toCanonicalName, generateAliases } from '@/lib/character/canonical'
import { v4 as uuidv4 } from 'uuid'
import { useProcessWithOverlay } from '@/hooks/useProcessWithOverlay'
import { useSidebarData, useSidebarQuickActions } from '@/hooks/useSidebarData'
import { DetailedSceneDirection } from '@/types/scene-direction'
import { cn } from '@/lib/utils'
import { VisionReferencesSidebar } from '@/components/vision/VisionReferencesSidebar'
import { VisualReference, VisualReferenceType, VisionReferencesPayload } from '@/types/visionReferences'
import { SceneProductionData, SceneProductionReferences, SegmentKeyframeSettings } from '@/components/vision/scene-production'
import { applyIntelligentDefaults } from '@/lib/audio/anchoredTiming'
import { buildAudioTracksForLanguage, buildAudioTracksWithBaselineTiming, determineBaselineLanguage } from '@/components/vision/scene-production/audioTrackBuilder'

/**
 * Client-side upload helper that uses the API endpoint
 */
async function uploadAssetViaAPI(file: File, projectId: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('projectId', projectId)
  
  // Determine the correct endpoint based on file type
  const isAudio = file.type.startsWith('audio/')
  const endpoint = isAudio ? '/api/upload/audio' : '/api/upload/image'
  
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || 'Upload failed')
  }
  
  const result = await response.json()
  return result.url || result.imageUrl || result.audioUrl
}

// Scene Analysis interface for score generation
interface SceneAnalysis {
  overallScore: number
  directorScore: number
  audienceScore: number
  generatedAt: string
  recommendations: any[]
  iterationCount?: number  // Track analysis iterations for score stabilization
  appliedRecommendationIds?: string[]  // Track which recommendations were applied
}

// Character wardrobe collection - allows multiple outfit variations per character
interface CharacterWardrobe {
  id: string
  name: string  // e.g., "Office Attire", "Casual", "Formal Event"
  description: string  // Detailed wardrobe description for image prompts
  accessories?: string  // Optional accessories
  previewImageUrl?: string  // Generated preview image of character in this wardrobe
  isDefault: boolean
  createdAt: string
}

// Scene-level wardrobe assignment for characters
interface SceneCharacterWardrobe {
  characterId: string
  wardrobeId: string  // References CharacterWardrobe.id
}

// Scene interface with score analysis
interface Scene {
  id?: string
  heading?: string | { text: string }
  visualDescription?: string
  narration?: string
  dialogue?: any[]
  music?: string | { description: string }
  sfx?: any[]
  imageUrl?: string
  narrationAudioUrl?: string
  musicAudio?: string
  duration?: number
  scoreAnalysis?: SceneAnalysis
  sceneDirection?: DetailedSceneDirection
  appliedRecommendations?: string[]  // Legacy field
  appliedRecommendationIds?: string[]  // New field for score stabilization
  analysisIterationCount?: number  // Track iterations for score stabilization
  characterWardrobes?: SceneCharacterWardrobe[]  // Per-scene wardrobe overrides
  // Audience Resonance scene-level analysis (persisted)
  audienceAnalysis?: {
    score: number
    pacing: 'slow' | 'moderate' | 'fast'
    tension: 'low' | 'medium' | 'high'
    characterDevelopment: 'minimal' | 'moderate' | 'strong'
    visualPotential: 'low' | 'medium' | 'high'
    notes: string
    recommendations: string[]
    appliedRecommendationIds?: string[]
    analyzedAt: string
    previousScore?: number
  }
  [key: string]: any
}

type SceneBookmark = {
  sceneId: string
  sceneNumber: number
}

// UUID v4 validation regex - rejects placeholder IDs like 'new-project'
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Helper to validate projectId before API calls
const isValidProjectId = (id: string | undefined | null): boolean => {
  return !!id && UUID_REGEX.test(id)
}

const getSceneProductionKey = (scene: Scene, index: number): string =>
  (scene as any)?.sceneId || scene.id || `scene-${index}`

// Helper function to normalize character names by removing screenplay annotations
const normalizeCharacterName = (name: string): string => {
  if (!name) return ''
  
  // Remove common screenplay annotations:
  // (V.O.), (O.S.), (CONT'D), (V.O. - from video), etc.
  return name
    .replace(/\s*\([^)]*\)\s*/g, '') // Remove anything in parentheses
    .trim()
}

// Helper function to normalize scenes from various data paths
// This ensures consistent scene access across all components
function normalizeScenes(source: any): any[] {
  if (!source) return []

  const candidates = [
    source?.script?.scenes,
    source?.scenes,
    source?.visionPhase?.script?.script?.scenes,
    source?.visionPhase?.scenes,
    source?.metadata?.visionPhase?.script?.script?.scenes,
    source?.metadata?.visionPhase?.scenes
  ]

  // First, try to find a non-empty array
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate
    }
  }

  // If all are empty, return the first valid array (even if empty)
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

// Helper function to ensure narrator character exists
const ensureNarratorCharacter = (characters: Character[], narrationVoice?: VoiceConfig): Character => {
  const existingNarrator = characters.find(char => char.type === 'narrator')
  
  if (existingNarrator) {
    return existingNarrator
  }
  
  // Create new narrator character
  return {
    id: 'narrator-1',
    name: 'Narrator',
    description: 'Storytelling voice for scene narration',
    type: 'narrator',
    voiceConfig: narrationVoice || {
      provider: 'elevenlabs',
      voiceName: 'Adam',
      voiceId: 'pNInz6obpgDQGcFmaJgB'
    }
  }
}

interface VoiceConfig {
  provider: 'elevenlabs' | 'google'
  voiceId: string
  voiceName: string
  // ElevenLabs specific
  stability?: number
  similarityBoost?: number
  // Google specific
  languageCode?: string
}

interface Character {
  id: string
  name: string
  description: string
  role?: 'protagonist' | 'main' | 'supporting'
  type?: 'character' | 'narrator' | 'description'
  referenceImage?: string
  appearanceDescription?: string
  // Voice assignment
  voiceConfig?: VoiceConfig
  // Wardrobe collection - allows multiple outfit variations
  wardrobes?: CharacterWardrobe[]
  // Legacy single wardrobe fields (for backwards compatibility)
  defaultWardrobe?: string
  wardrobeAccessories?: string
}

interface BYOKSettings {
  imageProvider: 'google' | 'openai' | 'stability'
  imageModel: string
  audioProvider: 'google' | 'elevenlabs'
  audioModel: string
  videoProvider: 'runway' | 'pika' | 'kling'
  videoModel: string
}

interface Project {
  id: string
  title: string
  description: string
  duration?: number
  genre?: string
  tone?: string
  metadata?: {
    blueprintVariant?: string
    filmTreatmentVariant?: any
    imageQuality?: 'max' | 'auto' // NEW: Image generation quality setting
    visionPhase?: {
      script?: any
      characters?: any[]
      scenes?: any[]
      scriptGenerated?: boolean
      charactersGenerated?: boolean
      scenesGenerated?: boolean
      narrationVoice?: VoiceConfig
      descriptionVoice?: VoiceConfig
    }
  }
}

// BYOK Settings Panel Component
interface BYOKSettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: BYOKSettings
  onUpdateSettings: (settings: BYOKSettings) => void
  project: Project | null
  projectId: string
}

function BYOKSettingsPanel({ isOpen, onClose, settings, onUpdateSettings, project, projectId }: BYOKSettingsPanelProps) {
  const [imageQuality, setImageQuality] = useState<'max' | 'auto'>('auto')
  const [showComparison, setShowComparison] = useState(false)
  
  // Load current image quality from project
  useEffect(() => {
    if (project?.metadata?.imageQuality) {
      setImageQuality(project.metadata.imageQuality)
    }
  }, [project])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generation Settings</DialogTitle>
          <DialogDescription>
            Configure providers, models, and quality settings for all generation tasks
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Image Generation Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Image Generation
            </h3>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Provider</label>
              <Select value={settings.imageProvider} onValueChange={(value) => onUpdateSettings({ ...settings, imageProvider: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google Imagen 3</SelectItem>
                  <SelectItem value="openai">OpenAI DALL-E</SelectItem>
                  <SelectItem value="stability">Stability AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Model</label>
              <Select value={settings.imageModel} onValueChange={(value) => onUpdateSettings({ ...settings, imageModel: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.imageProvider === 'google' && (
                    <>
                      <SelectItem value="imagen-3.0-generate-001">Imagen 3.0</SelectItem>
                      <SelectItem value="imagen-3.0-fast-generate-001">Imagen 3.0 Fast</SelectItem>
                    </>
                  )}
                  {settings.imageProvider === 'openai' && (
                    <>
                      <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                      <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
                    </>
                  )}
                  {settings.imageProvider === 'stability' && (
                    <>
                      <SelectItem value="stable-diffusion-xl">SDXL</SelectItem>
                      <SelectItem value="stable-diffusion-3">SD3</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Image Quality Setting */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Quality</label>
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  Show Comparison
                </button>
              </div>
              <Select 
                value={imageQuality} 
                onValueChange={async (value: 'max' | 'auto') => {
                  setImageQuality(value)
                  // Save to project metadata
                  try {
                    await fetch(`/api/projects/${projectId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        metadata: {
                          ...project?.metadata,
                          imageQuality: value
                        }
                      })
                    })
                  } catch (error) {
                    console.error('Failed to save image quality:', error)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Auto (Recommended)</span>
                      <span className="text-xs text-gray-500">Balanced quality and speed</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="max">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Maximum Quality</span>
                      <span className="text-xs text-gray-500">Highest detail, slower generation</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Comparison Info */}
              {showComparison && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs space-y-2">
                  <div>
                    <strong className="text-blue-900 dark:text-blue-100">Auto Quality:</strong>
                    <p className="text-blue-700 dark:text-blue-300">Fast generation with good detail. Best for iteration.</p>
                  </div>
                  <div>
                    <strong className="text-blue-900 dark:text-blue-100">Max Quality:</strong>
                    <p className="text-blue-700 dark:text-blue-300">Highest resolution and detail. Best for final production.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Audio Generation Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Audio Generation (TTS)
            </h3>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Provider</label>
              <Select value={settings.audioProvider} onValueChange={(value) => onUpdateSettings({ ...settings, audioProvider: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google TTS</SelectItem>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Model</label>
              <Select value={settings.audioModel} onValueChange={(value) => onUpdateSettings({ ...settings, audioModel: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.audioProvider === 'google' && (
                    <>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="wavenet">WaveNet</SelectItem>
                      <SelectItem value="neural2">Neural2</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                    </>
                  )}
                  {settings.audioProvider === 'elevenlabs' && (
                    <>
                      <SelectItem value="eleven_multilingual_v2">Multilingual v2</SelectItem>
                      <SelectItem value="eleven_turbo_v2">Turbo v2</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Video Generation Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Play className="w-4 h-4" />
              Video Generation
            </h3>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Provider</label>
              <Select value={settings.videoProvider} onValueChange={(value) => onUpdateSettings({ ...settings, videoProvider: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="runway">Runway Gen-3</SelectItem>
                  <SelectItem value="pika">Pika Labs</SelectItem>
                  <SelectItem value="kling">Kling AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Model</label>
              <Select value={settings.videoModel} onValueChange={(value) => onUpdateSettings({ ...settings, videoModel: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.videoProvider === 'runway' && (
                    <>
                      <SelectItem value="gen3-alpha">Gen-3 Alpha</SelectItem>
                      <SelectItem value="gen3-turbo">Gen-3 Turbo</SelectItem>
                    </>
                  )}
                  {settings.videoProvider === 'pika' && (
                    <>
                      <SelectItem value="pika-1.0">Pika 1.0</SelectItem>
                      <SelectItem value="pika-1.5">Pika 1.5</SelectItem>
                    </>
                  )}
                  {settings.videoProvider === 'kling' && (
                    <>
                      <SelectItem value="kling-v1">Kling v1</SelectItem>
                      <SelectItem value="kling-v1.5">Kling v1.5</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button onClick={async () => {
                    // Save settings to database
                    try {
                      const existingMetadata = project?.metadata || {}
                      await fetch(`/api/projects/${projectId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          metadata: {
                            ...existingMetadata,
                            byokSettings: settings,
                            imageQuality: imageQuality
                          }
                        })
                      })
                      console.log('[BYOK Settings] Saved settings:', settings, 'imageQuality:', imageQuality)
                      onClose()
                    } catch (error) {
                      console.error('[BYOK Settings] Failed to save:', error)
                    }
                  }}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function VisionPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()
  const { execute } = useProcessWithOverlay()
  const [mounted, setMounted] = useState(false)
  const [project, setProject] = useState<Project | null>(null)
  const [script, setScript] = useState<any>(null)
  // Timestamp updated when script is edited - used to clear audio caches in ScreeningRoom
  const [scriptEditedAt, setScriptEditedAt] = useState<number>(Date.now())
  const [characters, setCharacters] = useState<any[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingRef, setUploadingRef] = useState<Record<string, boolean>>({})
  const [validationWarnings, setValidationWarnings] = useState<Record<number, string>>({})
  
  // Debounce ref for audio clip persistence
  const audioClipPersistDebounceRef = useRef<NodeJS.Timeout | null>(null)
  
  // Enhanced validation info state (not just warnings)
  const [validationInfo, setValidationInfo] = useState<Record<number, {
    passed: boolean
    confidence: number
    message?: string
    warning?: string
    dismissed?: boolean
  }>>({})
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [showSceneGallery, setShowSceneGallery] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showNavigationWarning, setShowNavigationWarning] = useState(false)
  const [showTreatmentReview, setShowTreatmentReview] = useState(false)
  const [voiceAssignments, setVoiceAssignments] = useState<Record<string, any>>({})
  const [sceneReferences, setSceneReferences] = useState<VisualReference[]>([])
  const [objectReferences, setObjectReferences] = useState<VisualReference[]>([])
  const [sceneProductionState, setSceneProductionState] = useState<Record<string, SceneProductionData>>({})
  const [sceneBookmark, setSceneBookmark] = useState<SceneBookmark | null>(null)
  
  // Script Review state - for Director and Audience review scoring
  const [directorReview, setDirectorReview] = useState<any>(null)
  const [audienceReview, setAudienceReview] = useState<any>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [isGeneratingReviews, setIsGeneratingReviews] = useState(false)
  const [reviewsOutdated, setReviewsOutdated] = useState(false)
  
  // Collapsible sidebar sections
  const [sectionsOpen, setSectionsOpen] = useState({
    workflow: true,
    progress: true,
    quickActions: true,
    reviewScores: true,
    projectStats: false,
    credits: true
  })
  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }))
  }
  
  // Get user credits from store
  const user = useStore((state) => state.user)
  
  // Track if we've done initial production state load to avoid resetting during active generation
  const hasInitializedProductionState = useRef(false)
  
  useEffect(() => {
    // Only run sanitization on initial load, not on subsequent project changes
    // This prevents resetting GENERATING status during active video generation
    if (hasInitializedProductionState.current) {
      return
    }
    
    const productionScenes =
      project?.metadata?.visionPhase?.production?.scenes as Record<string, SceneProductionData> | undefined
    if (productionScenes && typeof productionScenes === 'object') {
      hasInitializedProductionState.current = true
      try {
        const cloned = JSON.parse(JSON.stringify(productionScenes)) as Record<string, SceneProductionData>
        
        // Sanitize stuck 'GENERATING' statuses - reset them to 'PENDING'
        // This handles cases where generation was interrupted (page refresh, network error, etc.)
        // Only runs on initial load, not during active generation
        for (const sceneId of Object.keys(cloned)) {
          const production = cloned[sceneId]
          if (production?.segments) {
            production.segments = production.segments.map((segment) => {
              if (segment.status === 'GENERATING') {
                console.log(`[VisionPage] Resetting stuck GENERATING status for segment ${segment.segmentId}`)
                return { ...segment, status: 'PENDING' as const }
              }
              return segment
            })
          }
        }
        
        setSceneProductionState(cloned)
      } catch {
        setSceneProductionState(productionScenes)
      }
    }
  }, [project?.metadata?.visionPhase?.production?.scenes])

  // Wrapper for setScript that also updates the edit timestamp AND saves to database
  // This ensures ScreeningRoom clears audio caches when script is edited via ScriptEditorModal
  // and that changes are persisted to the database
  const handleScriptChange = useCallback(async (updatedScript: any) => {
    // Update local state immediately for responsive UI
    setScript(updatedScript)
    setScriptEditedAt(Date.now())
    
    // Guard: Don't save if projectId is invalid
    if (!isValidProjectId(projectId)) {
      console.warn('[handleScriptChange] Skipping save - invalid projectId:', projectId)
      return
    }
    
    // Save to database
    const updatedScenes = updatedScript?.script?.scenes || []
    if (updatedScenes.length > 0 && project) {
      try {
        const existingMetadata = project?.metadata || {}
        const existingVisionPhase = existingMetadata.visionPhase || {}
        
        const payload = {
          metadata: {
            ...existingMetadata,
            visionPhase: {
              ...existingVisionPhase,
              script: updatedScript,
              scenes: updatedScenes
            }
          }
        }
        
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          console.error('[handleScriptChange] Failed to save script to database')
          try {
            const { toast } = require('sonner')
            toast.error('Failed to save script changes')
          } catch {}
        } else {
          console.log('[handleScriptChange] Script saved to database')
        }
      } catch (error) {
        console.error('[handleScriptChange] Error saving script:', error)
        try {
          const { toast } = require('sonner')
          toast.error('Failed to save script changes')
        } catch {}
      }
    }
  }, [project, projectId])

  // Handle openPlayer query param from Screening Room dashboard
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('openPlayer') === 'true') {
      setIsPlayerOpen(true)
      // Remove openPlayer param from URL to prevent re-opening on refresh
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.delete('openPlayer')
      const newUrl = newParams.toString() 
        ? `${window.location.pathname}?${newParams}` 
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  useEffect(() => {
    const references = project?.metadata?.visionPhase?.references as VisionReferencesPayload | undefined
    if (references) {
      setSceneReferences(references.sceneReferences ?? [])
      setObjectReferences(references.objectReferences ?? [])
    } else if (project) {
      setSceneReferences([])
      setObjectReferences([])
    }
  }, [project])

  useEffect(() => {
    const bookmark = project?.metadata?.visionPhase?.bookmark as SceneBookmark | undefined
    if (bookmark && (bookmark.sceneId || bookmark.sceneNumber)) {
      setSceneBookmark({
        sceneId: bookmark.sceneId || `scene-${bookmark.sceneNumber ?? 1}`,
        sceneNumber: Number(bookmark.sceneNumber) || 1
      })
    } else {
      setSceneBookmark(null)
    }
  }, [project])

  // Load existing script reviews from project metadata
  useEffect(() => {
    const reviews = project?.metadata?.visionPhase?.reviews
    if (reviews) {
      if (reviews.director) {
        setDirectorReview(reviews.director)
      }
      if (reviews.audience) {
        setAudienceReview(reviews.audience)
      }
      // Check if reviews might be outdated (script changed since review)
      // We could compare script hash here if needed
      setReviewsOutdated(false)
    }
  }, [project?.metadata?.visionPhase?.reviews])
  
  // Load stored translations from project metadata
  const storedTranslations = useMemo(() => {
    return (project?.metadata?.visionPhase?.translations || {}) as Record<string, Record<number, { narration?: string; dialogue?: string[] }>>
  }, [project?.metadata?.visionPhase?.translations])
  
  // Save translations callback
  const handleSaveTranslations = useCallback(async (langCode: string, translations: Record<number, { narration?: string; dialogue?: string[] }>) => {
    try {
      const existingMetadata = project?.metadata || {}
      const existingVisionPhase = existingMetadata.visionPhase || {}
      const existingTranslations = existingVisionPhase.translations || {}
      
      const updatedTranslations = {
        ...existingTranslations,
        [langCode]: translations
      }
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...existingMetadata,
            visionPhase: {
              ...existingVisionPhase,
              translations: updatedTranslations
            }
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save translations')
      }
      
      // Update local project state to reflect saved translations
      setProject(prev => {
        if (!prev) return prev
        return {
          ...prev,
          metadata: {
            ...prev.metadata,
            visionPhase: {
              ...prev.metadata?.visionPhase,
              translations: updatedTranslations
            }
          }
        }
      })
      
      console.log(`[VisionPage] Saved ${Object.keys(translations).length} scene translations for ${langCode}`)
    } catch (error) {
      console.error('[VisionPage] Error saving translations:', error)
      throw error
    }
  }, [project, projectId])

  // Auto-select first scene when scenes are loaded
  useEffect(() => {
    const scriptScenes = script?.script?.scenes || []
    if (scriptScenes.length > 0 && selectedSceneIndex === null) {
      setSelectedSceneIndex(0)
    }
  }, [script?.script?.scenes, selectedSceneIndex])

  // Compute bookmark index for quick actions
  const bookmarkedSceneIndex = useMemo(() => {
    if (!sceneBookmark) return -1
    const scriptScenes = normalizeScenes(script)
    return scriptScenes.findIndex((s: any, idx: number) => {
      const sceneId = s.id || s.sceneId || `scene-${idx}`
      if (sceneBookmark?.sceneId) {
        return sceneId === sceneBookmark.sceneId
      }
      if (sceneBookmark?.sceneNumber != null) {
        return idx === Number(sceneBookmark.sceneNumber) - 1
      }
      return false
    })
  }, [sceneBookmark, script])

  // Handler to jump to bookmarked scene
  const handleJumpToBookmark = useCallback(() => {
    if (bookmarkedSceneIndex === -1) return
    setSelectedSceneIndex(bookmarkedSceneIndex)
    // Scroll to scene
    const sceneElement = document.getElementById(`scene-card-${bookmarkedSceneIndex}`)
    sceneElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [bookmarkedSceneIndex])

  // Keyboard navigation for scenes (← → arrow keys, 1-9 number keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      
      const scriptScenes = script?.script?.scenes || []
      if (scriptScenes.length === 0) return
      
      // Arrow key navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSceneIndex(prev => {
          const current = prev ?? 0
          return Math.max(0, current - 1)
        })
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSceneIndex(prev => {
          const current = prev ?? 0
          return Math.min(scriptScenes.length - 1, current + 1)
        })
      }
      // Number keys 1-9 for quick jump to scene
      else if (e.key >= '1' && e.key <= '9') {
        const sceneNum = parseInt(e.key)
        if (sceneNum <= scriptScenes.length) {
          e.preventDefault()
          setSelectedSceneIndex(sceneNum - 1)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [script?.script?.scenes])

  const handleBookmarkScene = useCallback(
    async (bookmark: SceneBookmark | null) => {
      if (!projectId) return
      setSceneBookmark(bookmark)
      setProject(prev => {
        if (!prev) return prev
        const prevMetadata = prev.metadata || {}
        const nextVisionPhase = {
          ...(prevMetadata.visionPhase || {}),
          bookmark: bookmark ? bookmark : null
        }
        return {
          ...prev,
          metadata: {
            ...prevMetadata,
            visionPhase: nextVisionPhase
          }
        }
      })

      const existingMetadata = project?.metadata || {}
      const nextMetadata = {
        ...existingMetadata,
        visionPhase: {
          ...(existingMetadata.visionPhase || {}),
          bookmark: bookmark ? bookmark : null
        }
      }

      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: nextMetadata })
        })
      } catch (error) {
        console.error('[Bookmark] Failed to save bookmark', error)
        try {
          const { toast } = require('sonner')
          toast.error('Failed to save bookmark')
        } catch {}
      }
    },
    [projectId, project]
  )

  // Handle marking workflow steps as complete
  const handleMarkWorkflowComplete = useCallback(
    async (sceneIdx: number, stepKey: string, isComplete: boolean) => {
      if (!script?.script?.scenes) return
      
      const updatedScenes = [...script.script.scenes]
      const currentScene = updatedScenes[sceneIdx]
      
      // Guard against invalid scene index
      if (!currentScene) {
        console.warn('[handleMarkWorkflowComplete] Invalid scene index:', sceneIdx)
        return
      }
      
      // Update workflow completions on the scene
      const workflowCompletions = currentScene.workflowCompletions || {}
      updatedScenes[sceneIdx] = {
        ...currentScene,
        workflowCompletions: {
          ...workflowCompletions,
          [stepKey]: isComplete
        },
        // Clear dismissed stale warning when unmarking (they may want to see the warning again)
        ...(isComplete ? {} : {
          dismissedStaleWarnings: {
            ...(currentScene.dismissedStaleWarnings || {}),
            [stepKey]: false
          }
        })
      }
      
      // Update local state
      const updatedScript = {
        ...script,
        script: {
          ...script.script,
          scenes: updatedScenes
        }
      }
      setScript(updatedScript)
      
      // Persist to database
      try {
        const existingMetadata = project?.metadata || {}
        const existingVisionPhase = existingMetadata.visionPhase || {}
        
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...existingMetadata,
              visionPhase: {
                ...existingVisionPhase,
                script: updatedScript
              }
            }
          })
        })
        
        const { toast } = require('sonner')
        toast.success(isComplete ? `Marked as complete` : `Unmarked`)
      } catch (error) {
        console.error('[MarkWorkflowComplete] Failed to save:', error)
        const { toast } = require('sonner')
        toast.error('Failed to save workflow status')
      }
    },
    [script, project, projectId]
  )

  // Handle dismissing stale warnings
  const handleDismissStaleWarning = useCallback(
    async (sceneIdx: number, stepKey: string) => {
      if (!script?.script?.scenes) return
      
      const updatedScenes = [...script.script.scenes]
      const currentScene = updatedScenes[sceneIdx]
      
      // Update dismissed stale warnings on the scene
      const dismissedStaleWarnings = currentScene.dismissedStaleWarnings || {}
      updatedScenes[sceneIdx] = {
        ...currentScene,
        dismissedStaleWarnings: {
          ...dismissedStaleWarnings,
          [stepKey]: true
        }
      }
      
      // Update local state
      const updatedScript = {
        ...script,
        script: {
          ...script.script,
          scenes: updatedScenes
        }
      }
      setScript(updatedScript)
      
      // Persist to database
      try {
        const existingMetadata = project?.metadata || {}
        const existingVisionPhase = existingMetadata.visionPhase || {}
        
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...existingMetadata,
              visionPhase: {
                ...existingVisionPhase,
                script: updatedScript
              }
            }
          })
        })
      } catch (error) {
        console.error('[DismissStaleWarning] Failed to save:', error)
      }
    },
    [script, project, projectId]
  )

  // Scene production handlers
  // Lightweight persist function that only sends specific scene's production data
  // This avoids 413 errors by not sending the entire project metadata
  const persistSceneProductionLightweight = useCallback(
    async (sceneId: string, productionData: SceneProductionData) => {
      if (!project?.id) return
      try {
        // Debug: Log the size of what we're sending
        const payload = JSON.stringify({ sceneId, productionData })
        console.log(`[SceneProduction] Payload size for ${sceneId}: ${(payload.length / 1024).toFixed(2)} KB`)
        
        // Check if any segment has base64 data (shouldn't happen)
        // Safety check: ensure segments array exists
        if (productionData.segments && Array.isArray(productionData.segments)) {
          productionData.segments.forEach((seg, i) => {
            if (seg.activeAssetUrl?.startsWith('data:')) {
              console.error(`[SceneProduction] ERROR: Segment ${i} has base64 activeAssetUrl!`)
            }
            // Safety check: ensure takes array exists
            if (seg.takes && Array.isArray(seg.takes)) {
              seg.takes.forEach((take, j) => {
                if (take.assetUrl?.startsWith('data:')) {
                  console.error(`[SceneProduction] ERROR: Segment ${i} take ${j} has base64 assetUrl!`)
                }
              })
            }
          })
        }
        
        const response = await fetch(`/api/projects/${project.id}/production`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('[SceneProduction] Lightweight persist failed:', response.status, errorText.substring(0, 200))
          return
        }
        
        console.log('[SceneProduction] Lightweight persist successful for scene:', sceneId)
      } catch (error) {
        console.error('[SceneProduction] Failed to persist production data (lightweight)', error)
      }
    },
    [project?.id]
  )
  
  const persistSceneProduction = useCallback(
    async (nextState: Record<string, SceneProductionData>, nextScenes: Scene[], changedSceneId?: string) => {
      if (!project?.id) return
      
      // If we know which scene changed, use the lightweight endpoint
      if (changedSceneId && nextState[changedSceneId]) {
        await persistSceneProductionLightweight(changedSceneId, nextState[changedSceneId])
        
        // Update local project state without re-fetching
        setProject((prev) => {
          if (!prev) return prev
          const currentMetadata = prev.metadata ?? {}
          const currentVisionPhase = currentMetadata.visionPhase ?? {}
          const currentProduction = currentVisionPhase.production ?? {}
          const currentProductionScenes = currentProduction.scenes ?? {}
          
          return {
            ...prev,
            metadata: {
              ...currentMetadata,
              visionPhase: {
                ...currentVisionPhase,
                production: {
                  ...currentProduction,
                  lastUpdated: new Date().toISOString(),
                  scenes: {
                    ...currentProductionScenes,
                    [changedSceneId]: nextState[changedSceneId]
                  }
                }
              }
            }
          }
        })
        return
      }
      
      // Fallback: persist all scenes one by one (for bulk updates)
      // This is slower but avoids the 413 error
      for (const [sceneId, production] of Object.entries(nextState)) {
        if (production) {
          await persistSceneProductionLightweight(sceneId, production)
        }
      }
    },
    [project?.id, persistSceneProductionLightweight, setProject]
  )

  const applySceneProductionUpdate = useCallback(
    (sceneId: string, updater: (current: SceneProductionData | undefined) => SceneProductionData | undefined) => {
      setSceneProductionState((prev) => {
        const nextSceneData = updater(prev[sceneId])
        if (!nextSceneData) {
          return prev
        }

        const nextState = { ...prev, [sceneId]: nextSceneData }
        let nextScenesRef: Scene[] = []

        setScenes((prevScenes) => {
          nextScenesRef = prevScenes.map((sceneEntry, index) => {
            const key = getSceneProductionKey(sceneEntry as Scene, index)
            const production = nextState[key] ?? (sceneEntry as any)?.productionData
            return production ? { ...sceneEntry, productionData: production } : sceneEntry
          })
          return nextScenesRef
        })

        // Pass the changed sceneId so we can use lightweight persist
        void persistSceneProduction(nextState, nextScenesRef, sceneId)
        return nextState
      })
    },
    [persistSceneProduction]
  )

  const handleCreateReference = useCallback(
    async (
      type: VisualReferenceType,
      payload: { name: string; description?: string; file?: File | null }
    ) => {
      let imageUrl: string | undefined
      if (payload.file) {
        if (!project?.id) {
          throw new Error('Project must be loaded before adding references.')
        }
        const safeName = payload.file.name.replace(/\s+/g, '-').toLowerCase()
        const filename = `${type}-reference-${crypto.randomUUID()}-${safeName}`
        imageUrl = await uploadAssetViaAPI(payload.file, project.id)
      }

      const newReference: VisualReference = {
        id: crypto.randomUUID(),
        type,
        name: payload.name,
        description: payload.description,
        imageUrl,
        createdAt: new Date().toISOString(),
      }

      // Update local state
      let updatedSceneRefs = sceneReferences
      let updatedObjectRefs = objectReferences
      
      if (type === 'scene') {
        updatedSceneRefs = [...sceneReferences, newReference]
        setSceneReferences(updatedSceneRefs)
      } else {
        updatedObjectRefs = [...objectReferences, newReference]
        setObjectReferences(updatedObjectRefs)
      }
      
      // Save to database
      try {
        const existingMetadata = project?.metadata || {}
        const existingVisionPhase = existingMetadata.visionPhase || {}
        
        const payload = {
          metadata: {
            ...existingMetadata,
            visionPhase: {
              ...existingVisionPhase,
              references: {
                sceneReferences: updatedSceneRefs,
                objectReferences: updatedObjectRefs
              }
            }
          }
        }
        
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          console.error('[handleCreateReference] Failed to save reference to database')
        }
      } catch (error) {
        console.error('[handleCreateReference] Error saving reference:', error)
      }
    },
    [project, projectId, sceneReferences, objectReferences]
  )

  const handleRemoveReference = useCallback(
    async (type: VisualReferenceType, referenceId: string) => {
      // Update local state
      let updatedSceneRefs = sceneReferences
      let updatedObjectRefs = objectReferences
      
      if (type === 'scene') {
        updatedSceneRefs = sceneReferences.filter((reference) => reference.id !== referenceId)
        setSceneReferences(updatedSceneRefs)
      } else {
        updatedObjectRefs = objectReferences.filter((reference) => reference.id !== referenceId)
        setObjectReferences(updatedObjectRefs)
      }
      
      // Save to database
      try {
        const existingMetadata = project?.metadata || {}
        const existingVisionPhase = existingMetadata.visionPhase || {}
        
        const payload = {
          metadata: {
            ...existingMetadata,
            visionPhase: {
              ...existingVisionPhase,
              references: {
                sceneReferences: updatedSceneRefs,
                objectReferences: updatedObjectRefs
              }
            }
          }
        }
        
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          console.error('[handleRemoveReference] Failed to save reference removal to database')
        }
      } catch (error) {
        console.error('[handleRemoveReference] Error saving reference removal:', error)
      }
    },
    [project, projectId, sceneReferences, objectReferences]
  )

  // Handler for updating a reference image after editing
  const handleUpdateReferenceImage = useCallback(
    async (type: 'scene' | 'object', referenceId: string, newImageUrl: string) => {
      // Update local state
      let updatedSceneRefs = sceneReferences
      let updatedObjectRefs = objectReferences
      
      if (type === 'scene') {
        updatedSceneRefs = sceneReferences.map((ref) => 
          ref.id === referenceId ? { ...ref, imageUrl: newImageUrl, updatedAt: new Date().toISOString() } : ref
        )
        setSceneReferences(updatedSceneRefs)
      } else {
        updatedObjectRefs = objectReferences.map((ref) => 
          ref.id === referenceId ? { ...ref, imageUrl: newImageUrl, updatedAt: new Date().toISOString() } : ref
        )
        setObjectReferences(updatedObjectRefs)
      }
      
      // Save to database
      try {
        const existingMetadata = project?.metadata || {}
        const existingVisionPhase = existingMetadata.visionPhase || {}
        
        const payload = {
          metadata: {
            ...existingMetadata,
            visionPhase: {
              ...existingVisionPhase,
              references: {
                sceneReferences: updatedSceneRefs,
                objectReferences: updatedObjectRefs
              }
            }
          }
        }
        
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          console.error('[handleUpdateReferenceImage] Failed to save updated image to database')
        } else {
          toast.success(`${type === 'scene' ? 'Scene' : 'Object'} image updated`)
        }
      } catch (error) {
        console.error('[handleUpdateReferenceImage] Error saving updated image:', error)
        toast.error('Failed to save image update')
      }
    },
    [project, projectId, sceneReferences, objectReferences]
  )

  // Handler for updating a character's reference image after editing
  const handleEditCharacterImage = useCallback(
    async (characterId: string, newImageUrl: string) => {
      // Update local state
      const updatedCharacters = characters.map((char, idx) => {
        const charId = char.id || idx.toString()
        return charId === characterId 
          ? { ...char, referenceImage: newImageUrl, imageApproved: false }
          : char
      })
      
      setCharacters(updatedCharacters)
      
      // Save to database
      try {
        const existingMetadata = project?.metadata || {}
        const existingVisionPhase = existingMetadata.visionPhase || {}
        
        const payload = {
          metadata: {
            ...existingMetadata,
            visionPhase: {
              ...existingVisionPhase,
              characters: updatedCharacters
            }
          }
        }
        
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          console.error('[handleEditCharacterImage] Failed to save updated image to database')
        } else {
          toast.success('Character image updated')
        }
      } catch (error) {
        console.error('[handleEditCharacterImage] Error saving updated image:', error)
        toast.error('Failed to save image update')
      }
    },
    [project, projectId, characters]
  )

  // Handler for when a backdrop is generated via AI
  const handleBackdropGenerated = useCallback(
    async (reference: { name: string; description?: string; imageUrl: string; sourceSceneNumber?: number; backdropMode?: string }) => {
      const newReference: VisualReference = {
        id: crypto.randomUUID(),
        type: 'scene',
        name: reference.name,
        description: reference.description,
        imageUrl: reference.imageUrl,
        createdAt: new Date().toISOString(),
      }

      // Update local state
      const updatedSceneRefs = [...sceneReferences, newReference]
      setSceneReferences(updatedSceneRefs)

      // Save to database
      try {
        const existingMetadata = project?.metadata || {}
        const existingVisionPhase = existingMetadata.visionPhase || {}

        const payload = {
          metadata: {
            ...existingMetadata,
            visionPhase: {
              ...existingVisionPhase,
              references: {
                sceneReferences: updatedSceneRefs,
                objectReferences
              }
            }
          }
        }

        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          console.error('[handleBackdropGenerated] Failed to save reference to database')
        }
      } catch (error) {
        console.error('[handleBackdropGenerated] Error saving reference:', error)
      }
    },
    [project, projectId, sceneReferences, objectReferences]
  )

  // Handler for when an object reference is generated via AI
  const handleObjectGenerated = useCallback(
    async (object: { 
      name: string; 
      description: string; 
      imageUrl: string; 
      category: string;
      importance: string;
      generationPrompt: string;
      aiGenerated: boolean;
    }) => {
      const newReference: VisualReference = {
        id: crypto.randomUUID(),
        type: 'object',
        name: object.name,
        description: object.description,
        imageUrl: object.imageUrl,
        createdAt: new Date().toISOString(),
        category: object.category as any,
        importance: object.importance as any,
        generationPrompt: object.generationPrompt,
        aiGenerated: object.aiGenerated,
      }

      // Update local state
      const updatedObjectRefs = [...objectReferences, newReference]
      setObjectReferences(updatedObjectRefs)

      // Save to database
      try {
        const existingMetadata = project?.metadata || {}
        const existingVisionPhase = existingMetadata.visionPhase || {}

        const payload = {
          metadata: {
            ...existingMetadata,
            visionPhase: {
              ...existingVisionPhase,
              references: {
                sceneReferences,
                objectReferences: updatedObjectRefs
              }
            }
          }
        }

        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          console.error('[handleObjectGenerated] Failed to save reference to database')
        }
      } catch (error) {
        console.error('[handleObjectGenerated] Error saving reference:', error)
      }
    },
    [project, projectId, sceneReferences, objectReferences]
  )

  // Handler for inserting a backdrop segment at the beginning of a scene
  const handleInsertBackdropSegment = useCallback(
    async (sceneId: string, referenceId: string, imageUrl: string, name: string) => {
      const currentProduction = sceneProductionState[sceneId]
      
      // Create a new segment at the beginning
      const newSegment = {
        segmentId: `seg_${sceneId}_backdrop_${Date.now()}`,
        sequenceIndex: 0, // Insert at beginning
        startTime: 0,
        endTime: 5, // Default 5 second duration
        action: `Backdrop: ${name}`,
        shotType: 'establishing' as const,
        imageUrl: imageUrl,
        references: {
          sceneRefIds: [referenceId],
        },
      }

      if (!currentProduction || !currentProduction.segments || currentProduction.segments.length === 0) {
        // No existing production data, create new with just this segment
        const newData: SceneProductionData = {
          sceneId,
          lastGenerated: Date.now(),
          segments: [newSegment],
          audioTracks: { dialogue: [], sfx: [], music: [], narration: [] },
        }
        await applySceneProductionUpdate(sceneId, newData)
      } else {
        // Shift existing segments and insert at beginning
        const updatedSegments = currentProduction.segments.map((seg, idx) => ({
          ...seg,
          sequenceIndex: idx + 1,
          startTime: seg.startTime + 5, // Shift by 5 seconds
          endTime: seg.endTime + 5,
        }))
        
        const updatedData: SceneProductionData = {
          ...currentProduction,
          segments: [newSegment, ...updatedSegments],
        }
        await applySceneProductionUpdate(sceneId, updatedData)
      }
      
      toast.success(`Added "${name}" to the beginning of the scene timeline`)
    },
    [sceneProductionState, applySceneProductionUpdate]
  )

  // Handler for inserting a backdrop VIDEO segment before a specified segment index
  const handleBackdropVideoGenerated = useCallback(
    async (sceneId: string, beforeSegmentIndex: number, result: {
      videoUrl: string
      prompt: string
      backdropMode: string
      duration: number
    }) => {
      const currentProduction = sceneProductionState[sceneId]
      
      const duration = result.duration || 5
      
      // Calculate insertion point
      let insertTime = 0
      if (currentProduction?.segments && beforeSegmentIndex > 0) {
        const prevSegment = currentProduction.segments[beforeSegmentIndex - 1]
        if (prevSegment) {
          insertTime = prevSegment.endTime
        }
      } else if (currentProduction?.segments && beforeSegmentIndex === 0 && currentProduction.segments.length > 0) {
        insertTime = 0 // Insert at the very beginning
      }
      
      // Create a new segment with the generated video
      const newSegment = {
        segmentId: `seg_${sceneId}_backdrop_video_${Date.now()}`,
        sequenceIndex: beforeSegmentIndex,
        startTime: insertTime,
        endTime: insertTime + duration,
        action: `Backdrop Video: ${result.backdropMode}`,
        shotType: 'establishing' as const,
        assetType: 'video' as const,
        activeAssetUrl: result.videoUrl,
        status: 'COMPLETE' as const,
        generatedPrompt: result.prompt,
        isEstablishingShot: true,
        establishingShotType: result.backdropMode,
      }

      if (!currentProduction || !currentProduction.segments || currentProduction.segments.length === 0) {
        // No existing production data, create new with just this segment
        const newData: SceneProductionData = {
          sceneId,
          lastGenerated: Date.now(),
          segments: [newSegment],
          audioTracks: { dialogue: [], sfx: [], music: [], narration: [] },
        }
        await applySceneProductionUpdate(sceneId, newData)
      } else {
        // Insert at the specified position and shift subsequent segments
        const segmentsBefore = currentProduction.segments.slice(0, beforeSegmentIndex)
        const segmentsAfter = currentProduction.segments.slice(beforeSegmentIndex)
        
        // Update sequence indices and times for segments after insertion point
        const updatedSegmentsAfter = segmentsAfter.map((seg, idx) => ({
          ...seg,
          sequenceIndex: beforeSegmentIndex + 1 + idx,
          startTime: seg.startTime + duration,
          endTime: seg.endTime + duration,
        }))
        
        const updatedData: SceneProductionData = {
          ...currentProduction,
          segments: [...segmentsBefore, newSegment, ...updatedSegmentsAfter],
        }
        await applySceneProductionUpdate(sceneId, updatedData)
      }
      
      toast.success(`Backdrop video added before segment #${beforeSegmentIndex + 1}`)
    },
    [sceneProductionState, applySceneProductionUpdate]
  )

  // Handler for generating an end frame for a segment using Imagen 3
  // This enables Frame-Anchored Video Production for better character consistency
  const handleGenerateEndFrame = useCallback(
    async (sceneId: string, segmentId: string, startFrameUrl: string, segmentPrompt: string): Promise<string | null> => {
      try {
        console.log('[VisionPage] Generating end frame for segment:', segmentId)
        
        const response = await fetch(`/api/segments/${segmentId}/generate-end-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startFrameUrl,
            segmentPrompt,
            segmentDuration: 8, // Standard Veo segment duration
            aspectRatio: '16:9'
          })
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.details || error.error || 'Failed to generate end frame')
        }
        
        const data = await response.json()
        console.log('[VisionPage] End frame generated:', data.endFrameUrl)
        
        toast.success('End frame generated successfully')
        return data.endFrameUrl
      } catch (error) {
        console.error('[VisionPage] Failed to generate end frame:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to generate end frame')
        return null
      }
    },
    []
  )

  // Handler for updating a segment's end frame URL in the production data
  const handleEndFrameGenerated = useCallback(
    async (sceneId: string, segmentId: string, endFrameUrl: string) => {
      const currentProduction = sceneProductionState[sceneId]
      if (!currentProduction?.segments) return
      
      const updatedSegments = currentProduction.segments.map(seg => {
        if (seg.segmentId === segmentId) {
          return {
            ...seg,
            references: {
              ...seg.references,
              endFrameUrl
            }
          }
        }
        return seg
      })
      
      const updatedData: SceneProductionData = {
        ...currentProduction,
        segments: updatedSegments
      }
      
      await applySceneProductionUpdate(sceneId, updatedData)
      console.log('[VisionPage] End frame URL saved for segment:', segmentId)
    },
    [sceneProductionState, applySceneProductionUpdate]
  )

  // Handler for updating a segment's frame URL after editing in ImageEditModal
  const handleEditFrame = useCallback(
    async (sceneId: string, segmentId: string, frameType: 'start' | 'end', newFrameUrl: string) => {
      const currentProduction = sceneProductionState[sceneId]
      if (!currentProduction?.segments) return
      
      const updatedSegments = currentProduction.segments.map(seg => {
        if (seg.segmentId === segmentId) {
          if (frameType === 'start') {
            return {
              ...seg,
              startFrameUrl: newFrameUrl,
              references: {
                ...seg.references,
                startFrameUrl: newFrameUrl
              }
            }
          } else {
            return {
              ...seg,
              endFrameUrl: newFrameUrl,
              references: {
                ...seg.references,
                endFrameUrl: newFrameUrl
              }
            }
          }
        }
        return seg
      })
      
      const updatedData: SceneProductionData = {
        ...currentProduction,
        segments: updatedSegments
      }
      
      applySceneProductionUpdate(sceneId, () => updatedData)
      toast.success(`${frameType === 'start' ? 'Start' : 'End'} frame updated`)
      console.log(`[VisionPage] ${frameType} frame edited for segment:`, segmentId)
    },
    [sceneProductionState, applySceneProductionUpdate]
  )

  // Handler for uploading a frame image from user's device
  const handleUploadFrame = useCallback(
    async (sceneId: string, segmentId: string, frameType: 'start' | 'end', file: File) => {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        const data = await response.json()
        const imageUrl = data.imageUrl

        // Update the segment with the uploaded frame URL
        await handleEditFrame(sceneId, segmentId, frameType, imageUrl)
        toast.success(`${frameType === 'start' ? 'Start' : 'End'} frame uploaded`)
        console.log(`[VisionPage] ${frameType} frame uploaded for segment:`, segmentId)
      } catch (error: any) {
        console.error('[VisionPage] Frame upload failed:', error)
        toast.error(`Failed to upload frame: ${error.message}`)
      }
    },
    [handleEditFrame]
  )

  // Keyframe State Machine: Generate frames for a specific segment
  // Uses the /api/production/generate-segment-frames endpoint
  const handleGenerateSegmentFrames = useCallback(
    async (sceneId: string, segmentId: string, frameType: 'start' | 'end' | 'both', options?: {
      customPrompt?: string
      negativePrompt?: string
      usePreviousEndFrame?: boolean
      previousEndFrameUrl?: string
    }) => {
      const scene = script?.script?.scenes?.find((s: any) => 
        (s.id || s.sceneId || `scene-${script?.script?.scenes?.indexOf(s)}`) === sceneId
      )
      const productionData = sceneProductionState[sceneId]
      const segment = productionData?.segments?.find(s => s.segmentId === segmentId)
      
      if (!segment) {
        toast.error('Segment not found')
        return
      }

      // Set generation state
      setGeneratingFrameForSegment(segmentId)
      setGeneratingFramePhase(frameType === 'both' ? 'start' : frameType)

      try {
        // Get previous segment's end frame for CONTINUE transitions
        const segmentIndex = productionData?.segments?.findIndex(s => s.segmentId === segmentId) ?? -1
        let previousEndFrameUrl: string | undefined = options?.previousEndFrameUrl
        if (!previousEndFrameUrl && segmentIndex > 0) {
          const prevSeg = productionData?.segments?.[segmentIndex - 1]
          previousEndFrameUrl = prevSeg?.endFrameUrl || prevSeg?.references?.endFrameUrl
        }
        
        // Auto-detect objects from segment text for prop consistency
        const segmentText = [
          segment.userEditedPrompt || segment.generatedPrompt || segment.action || '',
          scene?.action || '',
          scene?.visualDescription || ''
        ].join(' ')
        
        const detectedObjects = findSceneObjects(
          segmentText,
          objectReferences as any[],
          scene?.sceneNumber
        )

        const response = await fetch('/api/production/generate-segment-frames', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sceneId,
            segmentId,
            segmentIndex,
            actionPrompt: segment.userEditedPrompt || segment.generatedPrompt || segment.action,
            duration: segment.endTime - segment.startTime,
            frameType,
            transitionType: segment.transitionType || (segmentIndex === 0 ? 'CUT' : 'CONTINUE'),
            previousEndFrameUrl,
            sceneImageUrl: scene?.imageUrl,
            startFrameUrl: segment.startFrameUrl || segment.references?.startFrameUrl,
            // NEW: User customization options from FramePromptDialog
            customPrompt: options?.customPrompt,
            negativePrompt: options?.negativePrompt,
            usePreviousEndFrame: options?.usePreviousEndFrame,
            // Enhanced character data with all fields for identity lock
            // Priority: protagonist > main > supporting (sorted before API handles slicing)
            characters: [...characters]
              .filter(c => c.type === 'character' || !c.type) // Exclude narrator/description
              .sort((a, b) => {
                const roleOrder: Record<string, number> = { protagonist: 0, main: 1, supporting: 2 }
                return (roleOrder[a.role || 'supporting'] || 2) - (roleOrder[b.role || 'supporting'] || 2)
              })
              .map(c => ({
                name: c.name,
                appearance: c.appearanceDescription || c.description,
                referenceUrl: c.referenceImage,
                // Additional fields for enhanced identity lock
                ethnicity: (c as any).ethnicity,
                age: (c as any).age,
                wardrobe: (c as any).defaultWardrobe || (c as any).wardrobe,
              })),
            sceneContext: {
              heading: typeof scene?.heading === 'string' ? scene.heading : scene?.heading?.text,
              location: typeof scene?.heading === 'string' ? scene.heading : scene?.heading?.text,
              timeOfDay: typeof scene?.heading === 'string' 
                ? (scene.heading.includes('NIGHT') ? 'NIGHT' : scene.heading.includes('DAY') ? 'DAY' : undefined)
                : undefined
            },
            // Auto-detected object references for prop consistency
            objectReferences: detectedObjects.map(obj => ({
              name: obj.name,
              description: obj.description,
              category: obj.category,
              importance: obj.importance,
              imageUrl: obj.imageUrl
            }))
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate frames')
        }

        const data = await response.json()

        // Update segment with new frame URLs and metadata
        applySceneProductionUpdate(sceneId, (current) => {
          if (!current) return current
          return {
            ...current,
            segments: current.segments.map(seg => 
              seg.segmentId === segmentId 
                ? {
                    ...seg,
                    startFrameUrl: data.startFrameUrl || seg.startFrameUrl,
                    endFrameUrl: data.endFrameUrl || seg.endFrameUrl,
                    anchorStatus: data.anchorStatus || seg.anchorStatus,
                    actionType: data.actionType || seg.actionType,
                    transitionType: data.transitionType || seg.transitionType,
                    references: {
                      ...seg.references,
                      startFrameUrl: data.startFrameUrl || seg.references?.startFrameUrl,
                      endFrameUrl: data.endFrameUrl || seg.references?.endFrameUrl
                    }
                  }
                : seg
            )
          }
        })

        toast.success(`Frame${frameType === 'both' ? 's' : ''} generated successfully`)
      } catch (error) {
        console.error('[VisionPage] Failed to generate segment frames:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to generate frames')
      } finally {
        setGeneratingFrameForSegment(null)
        setGeneratingFramePhase(null)
      }
    },
    [script?.script?.scenes, sceneProductionState, characters, applySceneProductionUpdate]
  )

  // Keyframe State Machine: Batch generate all pending frames for a scene
  const handleGenerateAllSegmentFrames = useCallback(
    async (sceneId: string) => {
      const productionData = sceneProductionState[sceneId]
      if (!productionData?.segments?.length) {
        toast.error('No segments to generate frames for')
        return
      }

      // Find segments that need frame generation
      const pendingSegments = productionData.segments.filter(seg => {
        const hasStart = seg.startFrameUrl || seg.references?.startFrameUrl
        const hasEnd = seg.endFrameUrl || seg.references?.endFrameUrl
        return !hasStart || !hasEnd
      })

      if (pendingSegments.length === 0) {
        toast.success('All frames are already generated')
        return
      }

      toast.info(`Generating frames for ${pendingSegments.length} segments...`)

      // Generate frames sequentially to respect API rate limits
      for (const segment of pendingSegments) {
        const hasStart = segment.startFrameUrl || segment.references?.startFrameUrl
        const hasEnd = segment.endFrameUrl || segment.references?.endFrameUrl
        
        const frameType: 'start' | 'end' | 'both' = !hasStart && !hasEnd 
          ? 'both' 
          : !hasEnd 
            ? 'end' 
            : 'start'
        
        await handleGenerateSegmentFrames(sceneId, segment.segmentId, frameType)
        
        // Small delay between generations to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      toast.success('All segment frames generated!')
    },
    [sceneProductionState, handleGenerateSegmentFrames]
  )

  const handleInitializeSceneProduction = useCallback(
    async (sceneId: string, { targetDuration, generationOptions, segments: prePardsedSegments }: { targetDuration: number; generationOptions?: any; segments?: any[] }) => {
      if (!project?.id) {
        throw new Error('Project must be loaded before segmenting a scene.')
      }

      // If pre-parsed segments are provided (from Paste Results), skip API call
      if (prePardsedSegments && prePardsedSegments.length > 0) {
        console.log('[handleInitializeSceneProduction] Processing pasted segments:', {
          sceneId,
          segmentCount: prePardsedSegments.length,
          firstSegment: prePardsedSegments[0]?.segmentId,
          hasRequiredFields: {
            sequenceIndex: prePardsedSegments[0]?.sequenceIndex !== undefined,
            references: !!prePardsedSegments[0]?.references,
            takes: Array.isArray(prePardsedSegments[0]?.takes),
          }
        })
        
        const productionData: SceneProductionData = {
          isSegmented: true,
          targetSegmentDuration: targetDuration,
          segments: prePardsedSegments,
          lastGeneratedAt: new Date().toISOString(),
        }

        // Use applySceneProductionUpdate to update state and persist to DB
        console.log('[handleInitializeSceneProduction] Calling applySceneProductionUpdate for:', sceneId)
        applySceneProductionUpdate(sceneId, () => productionData)

        try {
          const { toast } = require('sonner')
          toast.success(`Scene segmented into ${productionData.segments.length} blocks.`)
        } catch {}
        return
      }

      const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          preferredDuration: targetDuration,
          // Pass establishing shot settings if provided
          establishingShot: generationOptions?.establishingShot,
          focusMode: generationOptions?.focusMode,
          customInstructions: generationOptions?.customInstructions,
          // Reference library integration options
          selectedCharacterIds: generationOptions?.selectedCharacterIds,
          includeReferencesInPrompts: generationOptions?.includeReferencesInPrompts,
          optimizeForTransitions: generationOptions?.optimizeForTransitions,
          // Narration-driven segmentation options
          narrationDriven: generationOptions?.narrationDriven,
          narrationText: generationOptions?.narrationText,
          narrationDuration: generationOptions?.narrationDuration,
          narrationAudioUrl: generationOptions?.narrationAudioUrl,
          // Audio-aware segmentation - ensures minimum segments for audio duration
          totalAudioDurationSeconds: generationOptions?.totalAudioDurationSeconds,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to segment scene')
      }

      const data = await response.json()
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to segment scene')
      }

      // Transform API response to SceneProductionData format
      const productionData: SceneProductionData = {
        isSegmented: true,
        targetSegmentDuration: data.targetSegmentDuration || targetDuration,
        segments: data.segments || [],
        lastGeneratedAt: new Date().toISOString(),
      }

      // Use applySceneProductionUpdate to update state and persist to DB
      applySceneProductionUpdate(sceneId, () => productionData)

      try {
        const { toast } = require('sonner')
        toast.success(`Scene segmented into ${productionData.segments.length} blocks.`)
      } catch {}
    },
    [project?.id, applySceneProductionUpdate]
  )

  const handleSegmentPromptChange = useCallback(
    (sceneId: string, segmentId: string, prompt: string) => {
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        const segments = current.segments.map((segment) =>
          segment.segmentId === segmentId
            ? {
                ...segment,
                userEditedPrompt: prompt,
                status: segment.status === 'DRAFT' ? 'READY' : segment.status,
              }
            : segment
        )
        return { ...current, segments }
      })
    },
    [applySceneProductionUpdate]
  )

  // Phase 5: Handle segment keyframe settings changes (persists to DB)
  const handleSegmentKeyframeChange = useCallback(
    (sceneId: string, segmentId: string, keyframeSettings: SegmentKeyframeSettings) => {
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        const segments = current.segments.map((segment) =>
          segment.segmentId === segmentId
            ? { ...segment, keyframeSettings }
            : segment
        )
        return { ...current, segments }
      })
    },
    [applySceneProductionUpdate]
  )

  // Phase 6: Handle segment dialogue assignment changes (persists to DB)
  const handleSegmentDialogueAssignmentChange = useCallback(
    (sceneId: string, segmentId: string, dialogueLineIds: string[]) => {
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        const segments = current.segments.map((segment) =>
          segment.segmentId === segmentId
            ? { ...segment, dialogueLineIds }
            : segment
        )
        return { ...current, segments }
      })
    },
    [applySceneProductionUpdate]
  )

  // Handle segment lock state changes (persists to DB for production lock)
  const handleLockSegment = useCallback(
    (sceneId: string, segmentId: string, locked: boolean) => {
      console.log('[handleLockSegment] Persisting lock state:', { sceneId, segmentId, locked })
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        const segments = current.segments.map((segment) =>
          segment.segmentId === segmentId
            ? { ...segment, lockedForProduction: locked }
            : segment
        )
        console.log('[handleLockSegment] Updated segments:', segments.map(s => ({ id: s.segmentId, locked: s.lockedForProduction })))
        return { ...current, segments }
      })
    },
    [applySceneProductionUpdate]
  )

  // Handle segment animatic settings changes for Screening Room player
  // Controls image duration
  const handleSegmentAnimaticSettingsChange = useCallback(
    (sceneId: string, segmentId: string, settings: { imageDuration?: number }) => {
      console.log('[handleSegmentAnimaticSettingsChange] Updating:', { sceneId, segmentId, settings })
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        const segments = current.segments.map((segment) =>
          segment.segmentId === segmentId
            ? { 
                ...segment, 
                ...(settings.imageDuration !== undefined && { imageDuration: settings.imageDuration })
              }
            : segment
        )
        return { ...current, segments }
      })
    },
    [applySceneProductionUpdate]
  )

  // Handle rendered scene URL changes (persists to DB for Play Scene button)
  const handleRenderedSceneUrlChange = useCallback(
    (sceneId: string, url: string | null) => {
      console.log('[handleRenderedSceneUrlChange] Persisting rendered URL:', { sceneId, url: url?.substring(0, 50) })
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        return { 
          ...current, 
          renderedSceneUrl: url,
          renderedAt: url ? new Date().toISOString() : null,
        }
      })
    },
    [applySceneProductionUpdate]
  )

  // Handle production data changes (persists production streams and other data)
  const handleProductionDataChange = useCallback(
    (sceneId: string, data: SceneProductionData) => {
      console.log('[handleProductionDataChange] Persisting production data:', { sceneId, hasStreams: !!data.productionStreams, streamCount: data.productionStreams?.length })
      applySceneProductionUpdate(sceneId, () => data)
    },
    [applySceneProductionUpdate]
  )

  // Phase 7: Handle segment reordering (drag-and-drop)
  const handleReorderSegments = useCallback(
    (sceneId: string, oldIndex: number, newIndex: number) => {
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        
        // Create new array with reordered segments
        const newSegments = [...current.segments]
        const [removed] = newSegments.splice(oldIndex, 1)
        newSegments.splice(newIndex, 0, removed)
        
        // Recalculate sequenceIndex and timing for all segments
        let currentTime = 0
        const updatedSegments = newSegments.map((segment, idx) => {
          const duration = segment.endTime - segment.startTime
          const updated = {
            ...segment,
            sequenceIndex: idx,
            startTime: currentTime,
            endTime: currentTime + duration,
          }
          currentTime += duration
          return updated
        })
        
        return { ...current, segments: updatedSegments }
      })
    },
    [applySceneProductionUpdate]
  )

  const handleSegmentGenerate = useCallback(
    async (
      sceneId: string,
      segmentId: string,
      mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD',
      options?: { 
        startFrameUrl?: string
        sourceVideoUrl?: string  // For EXT mode: Veo extends video directly (no FFmpeg needed)
        prompt?: string
        negativePrompt?: string
        duration?: number
        aspectRatio?: '16:9' | '9:16'
        resolution?: '720p' | '1080p'
        generationMethod?: 'T2V' | 'I2V' | 'FTV' | 'EXT' | 'REF'
        endFrameUrl?: string
        referenceImages?: Array<{ url: string; type: 'style' | 'character' }>
        guidePrompt?: string  // Voice/dialogue/SFX instructions for Veo 3.1 audio
      }
    ) => {
      if (!project?.id) {
        throw new Error('Project must be loaded before generating assets.')
      }

      // Update status to GENERATING
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        const segments = current.segments.map((segment) =>
          segment.segmentId === segmentId ? { ...segment, status: 'GENERATING' } : segment
        )
        return { ...current, segments }
      })

      try {
        const { toast } = require('sonner')
        toast.info(`Generating ${mode} for segment ${segmentId.slice(0, 6)}…`)
      } catch {}

      try {
        // Get the segment to get its prompt if not provided in options
        const currentProduction = sceneProductionState[sceneId]
        const segment = currentProduction?.segments.find((s) => s.segmentId === segmentId)
        if (!segment) {
          throw new Error('Segment not found')
        }

        // Use prompt from options (from prompt builder) or fall back to segment prompt
        const prompt = options?.prompt || segment.userEditedPrompt || segment.generatedPrompt || ''
        if (!prompt) {
          throw new Error('Segment prompt is required')
        }

        // Call the asset generation API with all prompt builder options
        const response = await fetch(`/api/segments/${encodeURIComponent(segmentId)}/generate-asset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Ensure cookies/session tokens are sent
          body: JSON.stringify({
            prompt,
            genType: mode,
            startFrameUrl: options?.startFrameUrl,
            sourceVideoUrl: options?.sourceVideoUrl,  // For EXT mode: Veo extends video directly
            endFrameUrl: options?.endFrameUrl,
            referenceImages: options?.referenceImages,
            generationMethod: options?.generationMethod,
            sceneId,
            projectId: project.id,
            // Pass video-specific options from prompt builder
            negativePrompt: options?.negativePrompt,
            duration: options?.duration,
            aspectRatio: options?.aspectRatio,
            resolution: options?.resolution,
            // Pass guidePrompt containing voice/dialogue/SFX for Veo 3.1 audio generation
            guidePrompt: options?.guidePrompt,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          // Handle specific error codes with user-friendly messages
          if (response.status === 401) {
            throw new Error('Session expired. Please refresh the page and sign in again.')
          }
          if (response.status === 403) {
            throw new Error('You do not have permission to generate assets.')
          }
          if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment and try again.')
          }
          throw new Error(errorText || 'Failed to generate asset')
        }

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Asset generation failed')
        }

        // SAFETY CHECK: If server returned base64 data, something is wrong
        // The server should always upload to blob storage and return a URL
        if (data.assetUrl?.startsWith('data:')) {
          console.error('[Segment Generate] ERROR: Server returned base64 data instead of URL!')
          console.error('[Segment Generate] assetUrl length:', data.assetUrl.length)
          throw new Error('Server returned base64 data instead of uploaded URL. Please try again.')
        }

        // If video was generated but server couldn't extract last frame (FFmpeg not available),
        // extract it client-side for continuity
        let lastFrameUrl = data.lastFrameUrl
        if (data.assetType === 'video' && data.assetUrl && !lastFrameUrl) {
          try {
            console.log('[Segment Generate] Server did not return lastFrameUrl, extracting client-side...')
            const { extractAndUploadLastFrame } = await import('@/lib/video/clientVideoUtils')
            lastFrameUrl = await extractAndUploadLastFrame(data.assetUrl, segmentId)
            console.log('[Segment Generate] Client-side frame extracted:', lastFrameUrl)
          } catch (frameError) {
            console.warn('[Segment Generate] Client-side frame extraction failed:', frameError)
            // Not critical - continue without last frame
          }
        }

        // Update segment with generated asset
        applySceneProductionUpdate(sceneId, (current) => {
          if (!current) return current
          const segments = current.segments.map((segment) => {
            if (segment.segmentId !== segmentId) return segment

            const newTake = {
              id: `${segmentId}-take-${Date.now()}`,
              createdAt: new Date().toISOString(),
              assetUrl: data.assetUrl,
              // For images, use the image itself as thumbnail. For videos, use the extracted last frame.
              thumbnailUrl: data.assetType === 'image' ? data.assetUrl : (lastFrameUrl || undefined),
              status: data.status === 'COMPLETE' ? 'COMPLETE' : 'GENERATING',
              durationSec: segment.endTime - segment.startTime,
              // Store Veo video reference for future video extension
              veoVideoRef: data.veoVideoRef,
            }

            return {
              ...segment,
              status: data.status === 'COMPLETE' ? 'COMPLETE' : 'GENERATING',
              assetType: data.assetType,
              activeAssetUrl: data.assetUrl,
              takes: [newTake, ...segment.takes],
              references: {
                ...segment.references,
                startFrameUrl: options?.startFrameUrl || segment.references.startFrameUrl,
                endFrameUrl: lastFrameUrl || segment.references.endFrameUrl,
              },
            }
          })
          return { ...current, segments }
        })

        try {
          const { toast } = require('sonner')
          toast.success(`Asset generated successfully for segment ${segmentId.slice(0, 6)}`)
        } catch {}
      } catch (error) {
        console.error('[Segment Generate] Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate asset'
        
        // Update status to ERROR and store error message
        applySceneProductionUpdate(sceneId, (current) => {
          if (!current) return current
          const segments = current.segments.map((segment) =>
            segment.segmentId === segmentId ? { ...segment, status: 'ERROR', errorMessage } : segment
          )
          return { ...current, segments }
        })

        // Show brief toast - detailed error is stored in segment
        try {
          const { toast } = require('sonner')
          const isContentFiltered = errorMessage.includes('Content Safety Filter')
          toast.error(isContentFiltered 
            ? 'Content filtered - click segment for details'
            : 'Generation failed - click segment for details'
          )
        } catch {}
      }
    },
    [applySceneProductionUpdate, project?.id, sceneProductionState]
  )

  const handleSegmentUpload = useCallback(
    async (sceneId: string, segmentId: string, file: File) => {
      // Show uploading state immediately
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        const segments = current.segments.map((segment) =>
          segment.segmentId === segmentId
            ? { ...segment, status: 'GENERATING' as const }
            : segment
        )
        return { ...current, segments }
      })

      try {
        // Upload to server (local storage for demo mode)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', project?.id || 'default')

        const response = await fetch(`/api/segments/${segmentId}/upload-video`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Upload failed: ${response.status}`)
        }

        const result = await response.json()
        const assetUrl = result.url || result.assetUrl

        // Update segment with uploaded asset
        applySceneProductionUpdate(sceneId, (current) => {
          if (!current) return current
          const segments = current.segments.map((segment) =>
            segment.segmentId === segmentId
              ? {
                  ...segment,
                  status: 'UPLOADED' as const,
                  assetType: file.type.startsWith('image') ? 'image' : 'video',
                  activeAssetUrl: assetUrl,
                  takes: [
                    {
                      id: `${segmentId}-take-${Date.now()}`,
                      createdAt: new Date().toISOString(),
                      assetUrl: assetUrl,
                      thumbnailUrl: file.type.startsWith('image') ? assetUrl : segment.activeAssetUrl,
                      status: 'UPLOADED' as const,
                      notes: 'User upload',
                    },
                    ...segment.takes,
                  ],
                }
              : segment
          )
          return { ...current, segments }
        })

        const { toast } = await import('sonner')
        toast.success(`Uploaded ${file.type.startsWith('image') ? 'image' : 'video'} to segment`)
      } catch (error: any) {
        console.error('[Segment Upload] Error:', error)
        
        // Revert to draft state on error
        applySceneProductionUpdate(sceneId, (current) => {
          if (!current) return current
          const segments = current.segments.map((segment) =>
            segment.segmentId === segmentId
              ? { ...segment, status: 'DRAFT' as const }
              : segment
          )
          return { ...current, segments }
        })

        const { toast } = await import('sonner')
        toast.error(error.message || 'Upload failed')
      }
    },
    [applySceneProductionUpdate, project?.id]
  )
  
  // Handle adding a new segment
  const handleAddSegment = useCallback(
    (sceneId: string, afterSegmentId: string | null, duration: number) => {
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        
        const segments = [...current.segments]
        const afterIndex = afterSegmentId 
          ? segments.findIndex(s => s.segmentId === afterSegmentId)
          : segments.length - 1
        
        // Calculate start time based on last segment
        const lastSegment = segments[afterIndex]
        const newStartTime = lastSegment ? lastSegment.endTime : 0
        
        // Create new segment
        const newSegmentId = `seg_${sceneId}_${segments.length + 1}_${Date.now()}`
        const newSegment = {
          segmentId: newSegmentId,
          sequenceIndex: segments.length,
          startTime: newStartTime,
          endTime: newStartTime + duration,
          status: 'DRAFT' as const,
          assetType: undefined,
          activeAssetUrl: undefined,
          generatedPrompt: 'New segment - add a prompt',
          userEditedPrompt: '',
          references: {
            sceneImageUrl: lastSegment?.references?.sceneImageUrl,
            thumbnailUrl: undefined,
            startFrameUrl: lastSegment?.references?.endFrameUrl,
            endFrameUrl: undefined,
          },
          takes: [],
        }
        
        segments.push(newSegment)
        
        return { 
          ...current, 
          segments,
          targetSegmentDuration: current.targetSegmentDuration 
        }
      })

      try {
        const { toast } = require('sonner')
        toast.success(`Added new ${duration}s segment`)
      } catch {}
    },
    [applySceneProductionUpdate]
  )
  
  // Handle adding a complete segment with full data (from AddSegmentDialog)
  const handleAddFullSegment = useCallback(
    (sceneId: string, newSegment: any) => {
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) {
          // Initialize production data if it doesn't exist
          const duration = newSegment.endTime - newSegment.startTime
          return {
            isSegmented: true,
            segments: [{
              ...newSegment,
              segmentId: newSegment.segmentId || `seg_${sceneId}_1_${Date.now()}`,
              sequenceIndex: 0,
              startTime: 0,
              endTime: duration,
            }],
            targetSegmentDuration: duration,
          }
        }
        
        const segments = [...current.segments]
        const lastSegment = segments[segments.length - 1]
        const newStartTime = lastSegment ? lastSegment.endTime : 0
        const duration = newSegment.endTime - newSegment.startTime
        
        // Append the new segment with correct timing
        const segmentToAdd = {
          ...newSegment,
          segmentId: newSegment.segmentId || `seg_${sceneId}_${segments.length + 1}_${Date.now()}`,
          sequenceIndex: segments.length,
          startTime: newStartTime,
          endTime: newStartTime + duration,
        }
        
        segments.push(segmentToAdd)
        
        return { 
          ...current, 
          isSegmented: true,
          segments,
        }
      })

      try {
        const { toast } = require('sonner')
        const duration = newSegment.endTime - newSegment.startTime
        toast.success(`Added ${duration.toFixed(1)}s segment with prompt`)
      } catch {}
    },
    [applySceneProductionUpdate]
  )
  
  // Handle adding establishing shot segment(s) at the beginning of the scene
  // Supports: single-shot, beat-matched (AI splits narration), and legacy modes
  const handleAddEstablishingShot = useCallback(
    async (sceneId: string, type: 'single-shot' | 'beat-matched' | 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => {
      // Find the scene to get image and heading for the establishing shot
      const scenes = script?.script?.scenes || []
      const scene = scenes.find((s: any) => (s.id || `scene-${scenes.indexOf(s)}`) === sceneId)
      if (!scene) {
        toast.error('Scene not found')
        return
      }
      
      const sceneImageUrl = scene.imageUrl || ''
      const heading = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text || 'Unknown Location'
      const narrationText = scene.narration || scene.action || ''
      const narrationDuration = scene.narrationAudio?.en?.duration || scene.narrationDuration || 0
      const sceneDescription = scene.description || scene.action || ''
      
      // For beat-matched mode, use AI to analyze narration
      if (type === 'beat-matched' && narrationText) {
        toast.info('Analyzing narration for visual beats...')
        
        try {
          // Get character descriptions for reference
          const characterDescriptions: Record<string, string> = {}
          if (script?.script?.characters) {
            for (const char of script.script.characters) {
              if (char.name && char.visualDescription) {
                characterDescriptions[char.name] = char.visualDescription
              }
            }
          }
          
          const response = await fetch('/api/vision/analyze-narration-beats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              narrationText,
              sceneHeading: heading,
              sceneDescription,
              sceneImageUrl,
              estimatedDuration: narrationDuration > 0 ? narrationDuration : undefined,
              mode: 'beat-matched',
              characterDescriptions,
            }),
          })
          
          if (!response.ok) {
            throw new Error('Failed to analyze narration')
          }
          
          const { analysis } = await response.json()
          
          // Create segments for each beat
          applySceneProductionUpdate(sceneId, (current) => {
            if (!current) return current
            
            if (current.segments.some(s => s.isEstablishingShot)) {
              toast.error('Scene already has an establishing shot')
              return current
            }
            
            const totalEstablishingDuration = analysis.narrationDurationEstimate || (analysis.beats.length * 5)
            const durationPerBeat = totalEstablishingDuration / analysis.beats.length
            
            // Create establishing shot segments for each beat
            const establishingSegments = analysis.beats.map((beat: any, idx: number) => {
              const startTime = idx * durationPerBeat
              const endTime = (idx + 1) * durationPerBeat
              
              return {
                segmentId: `seg_${sceneId}_establishing_beat${idx + 1}_${Date.now()}`,
                sequenceIndex: idx,
                startTime,
                endTime,
                status: 'DRAFT' as const,
                assetType: undefined,
                activeAssetUrl: undefined,
                isEstablishingShot: true,
                establishingShotType: 'beat-matched' as const,
                shotNumber: idx + 1,
                generatedPrompt: beat.videoPrompt,
                userEditedPrompt: '',
                cameraMovement: beat.cameraMotion,
                shotType: beat.shotType,
                emotionalBeat: beat.visualFocus,
                references: {
                  sceneImageUrl,
                  thumbnailUrl: sceneImageUrl,
                  startFrameUrl: sceneImageUrl,
                  endFrameUrl: undefined,
                  characterIds: [],
                  sceneRefIds: [],
                  objectRefIds: [],
                },
                takes: [],
              }
            })
            
            // Shift all existing segments forward in time
            const updatedSegments = current.segments.map((segment, idx) => ({
              ...segment,
              sequenceIndex: idx + establishingSegments.length,
              startTime: segment.startTime + totalEstablishingDuration,
              endTime: segment.endTime + totalEstablishingDuration,
            }))
            
            return {
              ...current,
              segments: [...establishingSegments, ...updatedSegments],
            }
          })
          
          toast.success(`Added ${analysis.beats.length} beat-matched establishing shot segments`)
          return
          
        } catch (error) {
          console.error('Failed to analyze narration beats:', error)
          toast.error('Failed to analyze narration, falling back to single shot')
          // Fall through to single-shot mode
        }
      }
      
      // Single-shot or legacy modes
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        
        // Don't add if already has an establishing shot
        if (current.segments.some(s => s.isEstablishingShot)) {
          toast.error('Scene already has an establishing shot')
          return current
        }
        
        // For single-shot, use narration duration if available, else 5 seconds
        // Cap at 8 seconds for video generation (Veo 3.1 model limit)
        // This is intentional for video - images edited later can have longer durations
        const establishingDuration = type === 'single-shot' && narrationDuration > 0 
          ? Math.min(narrationDuration, 8) // Veo 3.1 video limit
          : 5
        
        // Generate appropriate prompt based on type
        let generatedPrompt: string
        if (type === 'single-shot') {
          generatedPrompt = `Cinematic establishing shot of ${heading}. ${sceneDescription ? sceneDescription.substring(0, 100) + '. ' : ''}Slow, ambient camera motion revealing the environment. Atmospheric lighting, film grain. The camera slowly pushes in, capturing the mood and atmosphere of the scene.`
        } else {
          // Legacy prompts for backwards compatibility
          generatedPrompt = `Establishing shot of ${heading}. Camera ${
            type === 'scale-switch' ? 'slowly zooms out to reveal the full scene' 
            : type === 'living-painting' ? 'holds steady with subtle ambient motion' 
            : 'captures ambient details and atmosphere'
          }.`
        }
        
        const establishingSegmentId = `seg_${sceneId}_establishing_${Date.now()}`
        const establishingSegment = {
          segmentId: establishingSegmentId,
          sequenceIndex: 0,
          startTime: 0,
          endTime: establishingDuration,
          status: 'DRAFT' as const,
          assetType: undefined,
          activeAssetUrl: undefined,
          isEstablishingShot: true,
          establishingShotType: type,
          generatedPrompt,
          userEditedPrompt: '',
          cameraMovement: type === 'single-shot' ? 'slow-dolly-in' : undefined,
          references: {
            sceneImageUrl,
            thumbnailUrl: sceneImageUrl,
            startFrameUrl: sceneImageUrl,
            endFrameUrl: undefined,
            characterIds: [],
            sceneRefIds: [],
            objectRefIds: [],
          },
          takes: [],
        }
        
        // Shift all existing segments forward in time
        const updatedSegments = current.segments.map((segment, idx) => ({
          ...segment,
          sequenceIndex: idx + 1,
          startTime: segment.startTime + establishingDuration,
          endTime: segment.endTime + establishingDuration,
        }))
        
        return {
          ...current,
          segments: [establishingSegment, ...updatedSegments],
        }
      })
      
      toast.success(`Added ${type.replace('-', ' ')} establishing shot`)
    },
    [applySceneProductionUpdate, script?.script?.scenes, script?.script?.characters]
  )
  
  // Handle changing the establishing shot style/type
  const handleEstablishingShotStyleChange = useCallback(
    (sceneId: string, segmentId: string, style: 'single-shot' | 'beat-matched' | 'scale-switch' | 'living-painting' | 'b-roll-cutaway') => {
      // Find the scene to get heading for updated prompt
      const scenes = script?.script?.scenes || []
      const scene = scenes.find((s: any) => (s.id || `scene-${scenes.indexOf(s)}`) === sceneId)
      const heading = scene ? (typeof scene.heading === 'string' ? scene.heading : scene.heading?.text || 'Unknown Location') : 'Unknown Location'
      const sceneDescription = scene?.description || scene?.action || ''
      
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        
        const segments = current.segments.map((segment) => {
          if (segment.segmentId === segmentId && segment.isEstablishingShot) {
            // Generate new prompt based on style
            const stylePrompts: Record<string, string> = {
              'single-shot': `Cinematic establishing shot of ${heading}. ${sceneDescription ? sceneDescription.substring(0, 100) + '. ' : ''}Slow, ambient camera motion revealing the environment. Atmospheric lighting, film grain. The camera slowly pushes in, capturing the mood and atmosphere of the scene.`,
              'beat-matched': segment.generatedPrompt || `Establishing shot of ${heading}. Atmospheric, cinematic reveal.`,
              'scale-switch': `Establishing shot of ${heading}. Camera slowly zooms out to reveal the full scene, transitioning from detail to wide shot.`,
              'living-painting': `Establishing shot of ${heading}. Camera holds steady with subtle ambient motion - gentle wind, drifting clouds, or environmental details adding life to the frame.`,
              'b-roll-cutaway': `Establishing shot of ${heading}. Camera captures ambient details and atmosphere - environmental textures, lighting changes, or contextual elements that set the mood.`,
            }
            
            return {
              ...segment,
              establishingShotType: style,
              generatedPrompt: stylePrompts[style] || stylePrompts['single-shot'],
              // Clear user edited prompt so they see the new generated one
              userEditedPrompt: '',
              // Mark as draft since prompt changed
              status: 'DRAFT' as const,
            }
          }
          return segment
        })
        
        return { ...current, segments }
      })
      
      toast.success(`Changed establishing shot style to ${style.replace('-', ' ')}`)
    },
    [applySceneProductionUpdate, script?.script?.scenes]
  )

  // Handle selecting a take as the active asset for a segment
  const handleSelectTake = useCallback(
    (sceneId: string, segmentId: string, takeId: string, takeAssetUrl: string) => {
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        
        const segments = current.segments.map((segment) => {
          if (segment.segmentId === segmentId) {
            // Find the take to get its thumbnail
            const selectedTake = segment.takes?.find(t => t.id === takeId)
            
            return {
              ...segment,
              activeAssetUrl: takeAssetUrl,
              thumbnailUrl: selectedTake?.thumbnailUrl || segment.thumbnailUrl,
            }
          }
          return segment
        })
        
        return { ...current, segments }
      })
      
      toast.success('Take selected as active')
    },
    [applySceneProductionUpdate]
  )
  
  // Handle deleting a take from a segment
  const handleDeleteTake = useCallback(
    (sceneId: string, segmentId: string, takeId: string) => {
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        
        const segments = current.segments.map((segment) => {
          if (segment.segmentId === segmentId) {
            const updatedTakes = (segment.takes || []).filter(t => t.id !== takeId)
            return {
              ...segment,
              takes: updatedTakes,
            }
          }
          return segment
        })
        
        return { ...current, segments }
      })
      
      toast.success('Take deleted')
    },
    [applySceneProductionUpdate]
  )
  
  // Handle deleting a segment
  const handleDeleteSegment = useCallback(
    (sceneId: string, segmentId: string) => {
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        
        const segments = current.segments.filter(s => s.segmentId !== segmentId)
        
        // Recalculate times and indices
        let currentTime = 0
        const updatedSegments = segments.map((segment, idx) => {
          const duration = segment.endTime - segment.startTime
          const updated = {
            ...segment,
            sequenceIndex: idx,
            startTime: currentTime,
            endTime: currentTime + duration,
          }
          currentTime += duration
          return updated
        })
        
        return { ...current, segments: updatedSegments }
      })

      try {
        const { toast } = require('sonner')
        toast.success('Segment deleted')
      } catch {}
    },
    [applySceneProductionUpdate]
  )
  
  // Handle segment resize/move (visual clip changes)
  const handleSegmentResize = useCallback(
    (sceneId: string, segmentId: string, changes: { startTime?: number; duration?: number }) => {
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        
        const segmentIndex = current.segments.findIndex(s => s.segmentId === segmentId)
        if (segmentIndex === -1) return current
        
        const segment = current.segments[segmentIndex]
        const originalDuration = segment.endTime - segment.startTime
        
        // Calculate new values - enforce minimum 0.5s for all
        let newStartTime = changes.startTime ?? segment.startTime
        let newDuration = changes.duration ?? originalDuration
        
        // Enforce maximum 8 seconds ONLY for video assets (Veo 3.1 model limit)
        // Image-based keyframes have no upper duration limit
        const isVideoAsset = segment.assetType === 'video'
        newDuration = isVideoAsset 
          ? Math.min(8, Math.max(0.5, newDuration))
          : Math.max(0.5, newDuration)
        
        // Ensure start time is not negative and doesn't overlap with previous segment
        if (segmentIndex > 0) {
          const prevSegment = current.segments[segmentIndex - 1]
          newStartTime = Math.max(prevSegment.endTime, newStartTime)
        } else {
          newStartTime = Math.max(0, newStartTime)
        }
        
        const newEndTime = newStartTime + newDuration
        
        // Update the segment and cascade timing changes to subsequent segments
        let currentTime = 0
        const updatedSegments = current.segments.map((seg, idx) => {
          if (idx < segmentIndex) {
            currentTime = seg.endTime
            return seg
          } else if (idx === segmentIndex) {
            currentTime = newEndTime
            return {
              ...seg,
              startTime: newStartTime,
              endTime: newEndTime,
            }
          } else {
            // Cascade: subsequent segments shift based on new position
            const segDuration = seg.endTime - seg.startTime
            const updated = {
              ...seg,
              startTime: currentTime,
              endTime: currentTime + segDuration,
            }
            currentTime += segDuration
            return updated
          }
        })
        
        return { ...current, segments: updatedSegments }
      })
    },
    [applySceneProductionUpdate]
  )
  
  // Handle intelligent auto-alignment of keyframes to audio
  // This also adjusts segment count to match audio duration requirements
  const handleApplyIntelligentAlignment = useCallback(
    (sceneId: string, language: string = 'en') => {
      // Get the scene to access its audio tracks
      const sceneIndex = scenes.findIndex((s, i) => getSceneProductionKey(s, i) === sceneId)
      if (sceneIndex === -1) return
      
      const scene = scenes[sceneIndex]
      // Use baseline timing to ensure consistent positions across languages
      const baselineLanguage = determineBaselineLanguage(scene)
      const audioTracks = buildAudioTracksWithBaselineTiming(scene, language, baselineLanguage)
      
      // Calculate total audio duration from narration + dialogue
      let totalAudioDuration = 0
      
      // Get narration/voiceover duration
      const narrationDuration = audioTracks.voiceover?.duration || 0
      totalAudioDuration = Math.max(totalAudioDuration, narrationDuration)
      
      // Get dialogue end time (last dialogue clip end)
      if (audioTracks.dialogue && audioTracks.dialogue.length > 0) {
        const lastDialogue = audioTracks.dialogue.reduce((latest, clip) => {
          const clipEnd = clip.startTime + clip.duration
          return clipEnd > latest ? clipEnd : latest
        }, 0)
        totalAudioDuration = Math.max(totalAudioDuration, lastDialogue)
      }
      
      // Calculate minimum segments required (max 8s per video segment)
      const MAX_SEGMENT_SECONDS = 8
      const minimumSegmentsRequired = Math.max(1, Math.ceil(totalAudioDuration / MAX_SEGMENT_SECONDS))
      
      console.log(`[Auto-Align] Audio duration: ${totalAudioDuration.toFixed(1)}s, minimum segments: ${minimumSegmentsRequired}`)
      
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        
        let segments = [...current.segments]
        
        // If we need more segments, add them
        if (segments.length < minimumSegmentsRequired) {
          const segmentsToAdd = minimumSegmentsRequired - segments.length
          console.log(`[Auto-Align] Adding ${segmentsToAdd} segments to cover audio duration`)
          
          // Get the last segment's end time as starting point
          const lastSegment = segments[segments.length - 1]
          let nextStartTime = lastSegment ? lastSegment.endTime : 0
          
          // Calculate duration for new segments (split remaining time evenly)
          const remainingDuration = totalAudioDuration - nextStartTime
          const newSegmentDuration = Math.min(MAX_SEGMENT_SECONDS, remainingDuration / segmentsToAdd)
          
          for (let i = 0; i < segmentsToAdd; i++) {
            const newSegmentId = `segment-${Date.now()}-${segments.length + i}`
            const duration = Math.min(newSegmentDuration, MAX_SEGMENT_SECONDS)
            
            segments.push({
              segmentId: newSegmentId,
              sceneId: current.sceneId,
              sequenceIndex: segments.length,
              startTime: nextStartTime,
              endTime: nextStartTime + duration,
              status: 'DRAFT' as const,
              assetType: null,
              activeAssetUrl: null,
              references: {},
            })
            
            nextStartTime += duration
          }
          
          toast.success(`Added ${segmentsToAdd} segment${segmentsToAdd > 1 ? 's' : ''} to cover ${totalAudioDuration.toFixed(1)}s of audio`)
        }
        
        // Redistribute segment timing to cover audio duration evenly
        if (segments.length > 0 && totalAudioDuration > 0) {
          const segmentDuration = totalAudioDuration / segments.length
          segments = segments.map((seg, idx) => ({
            ...seg,
            sequenceIndex: idx,
            startTime: idx * segmentDuration,
            endTime: (idx + 1) * segmentDuration,
          }))
        }
        
        // Apply intelligent anchor defaults to segments
        const alignedSegments = applyIntelligentDefaults(segments, audioTracks)
        
        console.log('[Auto-Align] Applied intelligent alignment to', alignedSegments.length, 'keyframes')
        
        return { ...current, segments: alignedSegments }
      })
    },
    [applySceneProductionUpdate, scenes]
  )
  
  // Handle audio clip changes (start time, duration) with persistence
  const handleAudioClipChange = useCallback(
    (sceneIndex: number, trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => {
      // Validate scene index upfront
      if (typeof sceneIndex !== 'number' || sceneIndex < 0) {
        console.error('[Audio Clip Change] Invalid scene index:', sceneIndex)
        return
      }
      
      // Helper to update a scene with the changes
      const updateScene = (scene: any): any => {
        const updatedScene = { ...scene }
        
        if (trackType === 'voiceover') {
          if (clipId === 'description') {
            if (changes.startTime !== undefined) updatedScene.descriptionStartTime = changes.startTime
            if (changes.duration !== undefined) updatedScene.descriptionDuration = changes.duration
          } else if (clipId === 'narration') {
            if (changes.startTime !== undefined) updatedScene.narrationStartTime = changes.startTime
            if (changes.duration !== undefined) updatedScene.narrationDuration = changes.duration
          }
        } else if (trackType === 'dialogue') {
          if (updatedScene.dialogueAudio?.en) {
            const dialogueIdx = parseInt(clipId.replace('dialogue-', ''))
            if (!isNaN(dialogueIdx) && updatedScene.dialogueAudio.en[dialogueIdx]) {
              updatedScene.dialogueAudio = {
                ...updatedScene.dialogueAudio,
                en: updatedScene.dialogueAudio.en.map((d: any, i: number) => 
                  i === dialogueIdx 
                    ? { ...d, startTime: changes.startTime ?? d.startTime, duration: changes.duration ?? d.duration }
                    : d
                )
              }
            }
          }
        } else if (trackType === 'sfx') {
          const sfxIdx = parseInt(clipId.replace('sfx-', ''))
          if (!isNaN(sfxIdx) && updatedScene.sfx?.[sfxIdx]) {
            updatedScene.sfx = updatedScene.sfx.map((s: any, i: number) =>
              i === sfxIdx
                ? { ...s, time: changes.startTime ?? s.time, duration: changes.duration ?? s.duration }
                : s
            )
          }
        } else if (trackType === 'music') {
          if (changes.startTime !== undefined) updatedScene.musicStartTime = changes.startTime
          if (changes.duration !== undefined) updatedScene.musicDuration = changes.duration
        }
        
        return updatedScene
      }
      
      // Update scenes state
      setScenes((prevScenes) => {
        if (sceneIndex >= prevScenes.length) return prevScenes
        return prevScenes.map((scene, idx) => idx === sceneIndex ? updateScene(scene) : scene)
      })
      
      // Update script state separately to trigger ScriptPanel re-render
      setScript((prevScript: any) => {
        if (!prevScript?.script?.scenes) return prevScript
        const updatedScenes = prevScript.script.scenes.map((scene: any, idx: number) => 
          idx === sceneIndex ? updateScene(scene) : scene
        )
        return {
          ...prevScript,
          script: {
            ...prevScript.script,
            scenes: updatedScenes,
          },
        }
      })
      
      // Debounce persistence to database
      if (audioClipPersistDebounceRef.current) {
        clearTimeout(audioClipPersistDebounceRef.current)
      }
      
      if (project?.id) {
        audioClipPersistDebounceRef.current = setTimeout(async () => {
          try {
            // Get current scenes from state for persistence
            const currentScenes = (document as any).__sceneflowScenes || []
            const updatedScenes = currentScenes.map((scene: any, idx: number) => 
              idx === sceneIndex ? updateScene(scene) : scene
            )
            
            const currentMetadata = project.metadata ?? {}
            const currentVisionPhase = currentMetadata.visionPhase ?? {}
            
            const nextVisionPhase = {
              ...currentVisionPhase,
              scenes: updatedScenes,
              script: currentVisionPhase.script
                ? {
                    ...currentVisionPhase.script,
                    script: {
                      ...currentVisionPhase.script.script,
                      scenes: updatedScenes,
                    },
                  }
                : currentVisionPhase.script,
            }
            
            const nextMetadata = {
              ...currentMetadata,
              visionPhase: nextVisionPhase,
            }
            
            await fetch(`/api/projects/${project.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ metadata: nextMetadata }),
            })
            
            console.log('[Audio Clip Change] Persisted to database', { sceneIndex, trackType, clipId, changes })
          } catch (error) {
            console.error('[Audio Clip Change] Failed to persist', error)
          }
        }, 500)
      }
      
      console.log('[Audio Clip Change]', { sceneIndex, trackType, clipId, changes })
    },
    [project?.id, project?.metadata]
  )
  
  // Track stale URLs pending cleanup - used to avoid race conditions with regeneration
  const pendingStaleUrlCleanupRef = useRef<Map<string, Set<string>>>(new Map()) // sceneId -> Set<staleUrls>
  const staleCleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Handle cleanup of stale audio URLs (404 errors) - removes the URL from scene data and persists
  // Uses a ref-based approach to avoid race conditions with audio regeneration
  const handleCleanupStaleAudioUrl = useCallback(
    (sceneId: string, staleUrl: string) => {
      console.log('[Stale Audio Cleanup] Queuing stale URL for cleanup:', staleUrl)
      
      // Add to pending cleanup set
      if (!pendingStaleUrlCleanupRef.current.has(sceneId)) {
        pendingStaleUrlCleanupRef.current.set(sceneId, new Set())
      }
      pendingStaleUrlCleanupRef.current.get(sceneId)!.add(staleUrl)
      
      // Debounce the actual cleanup to batch multiple stale URL removals
      // and allow time for regeneration to complete first.
      // Use 10-second delay to prevent race conditions with audio regeneration.
      if (staleCleanupTimeoutRef.current) {
        clearTimeout(staleCleanupTimeoutRef.current)
      }
      
      staleCleanupTimeoutRef.current = setTimeout(() => {
        // Get the CURRENT scenes state (not a stale closure)
        setScenes((currentScenes) => {
          const urlsToClean = pendingStaleUrlCleanupRef.current
          if (urlsToClean.size === 0) return currentScenes
          
          let hasChanges = false
          const updatedScenes = currentScenes.map((scene, idx) => {
            const sceneKey = (scene as any).sceneId || (scene as any).id || `scene-${idx}`
            const staleUrlsForScene = urlsToClean.get(sceneKey)
            if (!staleUrlsForScene || staleUrlsForScene.size === 0) return scene
            
            const updatedScene = JSON.parse(JSON.stringify(scene)) // Deep clone
            
            for (const staleUrl of staleUrlsForScene) {
              // Check and clear narration audio if URL still matches (wasn't regenerated)
              if ((updatedScene as any).narrationAudioUrl === staleUrl) {
                delete (updatedScene as any).narrationAudioUrl
                hasChanges = true
              }
              if ((updatedScene as any).narrationAudio) {
                if (typeof (updatedScene as any).narrationAudio === 'object') {
                  for (const lang of Object.keys((updatedScene as any).narrationAudio)) {
                    if ((updatedScene as any).narrationAudio[lang]?.url === staleUrl) {
                      delete (updatedScene as any).narrationAudio[lang]
                      hasChanges = true
                    }
                  }
                  if (Object.keys((updatedScene as any).narrationAudio).length === 0) {
                    delete (updatedScene as any).narrationAudio
                  }
                }
              }
              
              // Check and clear description audio if URL still matches
              if ((updatedScene as any).descriptionAudioUrl === staleUrl) {
                delete (updatedScene as any).descriptionAudioUrl
                hasChanges = true
              }
              if ((updatedScene as any).descriptionAudio) {
                if (typeof (updatedScene as any).descriptionAudio === 'object') {
                  for (const lang of Object.keys((updatedScene as any).descriptionAudio)) {
                    if ((updatedScene as any).descriptionAudio[lang]?.url === staleUrl) {
                      delete (updatedScene as any).descriptionAudio[lang]
                      hasChanges = true
                    }
                  }
                  if (Object.keys((updatedScene as any).descriptionAudio).length === 0) {
                    delete (updatedScene as any).descriptionAudio
                  }
                }
              }
              
              // Check and clear dialogue audio if URL still matches
              if ((updatedScene as any).dialogueAudio) {
                for (const lang of Object.keys((updatedScene as any).dialogueAudio)) {
                  const dialogueArray = (updatedScene as any).dialogueAudio[lang]
                  if (Array.isArray(dialogueArray)) {
                    const before = dialogueArray.length
                    ;(updatedScene as any).dialogueAudio[lang] = dialogueArray.filter(
                      (d: any) => d?.url !== staleUrl
                    )
                    if ((updatedScene as any).dialogueAudio[lang].length !== before) {
                      hasChanges = true
                    }
                  }
                }
              }
              
              // Check and clear SFX if URL still matches
              if (Array.isArray((updatedScene as any).sfx)) {
                const before = (updatedScene as any).sfx.length
                ;(updatedScene as any).sfx = (updatedScene as any).sfx.filter(
                  (s: any) => s?.url !== staleUrl
                )
                if ((updatedScene as any).sfx.length !== before) {
                  hasChanges = true
                }
              }
              
              // Check and clear music if URL still matches
              if ((updatedScene as any).musicUrl === staleUrl) {
                delete (updatedScene as any).musicUrl
                hasChanges = true
              }
            }
            
            return updatedScene
          })
          
          // Clear the pending cleanup set
          pendingStaleUrlCleanupRef.current.clear()
          
          // Only persist if there were actual changes
          if (hasChanges && project?.id) {
            // Persist asynchronously (don't block state update)
            setTimeout(async () => {
              try {
                const currentMetadata = project.metadata ?? {}
                const currentVisionPhase = currentMetadata.visionPhase ?? {}
                
                const nextVisionPhase = {
                  ...currentVisionPhase,
                  scenes: updatedScenes,
                  script: currentVisionPhase.script
                    ? {
                        ...currentVisionPhase.script,
                        script: {
                          ...currentVisionPhase.script.script,
                          scenes: updatedScenes,
                        },
                      }
                    : currentVisionPhase.script,
                }
                
                const nextMetadata = {
                  ...currentMetadata,
                  visionPhase: nextVisionPhase,
                }
                
                await fetch(`/api/projects/${project.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ metadata: nextMetadata }),
                })
                
                console.log('[Stale Audio Cleanup] Persisted cleanup')
              } catch (error) {
                console.error('[Stale Audio Cleanup] Failed to persist', error)
              }
            }, 0)
          } else if (!hasChanges) {
            console.log('[Stale Audio Cleanup] No changes needed - URLs may have been regenerated')
          }
          
          return hasChanges ? updatedScenes : currentScenes
        })
      }, 10000) // Wait 10 seconds before cleanup to allow regeneration to complete and prevent 404s
    },
    [project?.id, project?.metadata]
  )
  
  // Revise script state
  const [reviseScriptInstruction, setReviseScriptInstruction] = useState<string>('')
  
  // Scene editor state
    const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null)                                                                               
  const [isSceneEditorOpen, setIsSceneEditorOpen] = useState(false)
  
  // Character deletion dialog state
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false)
  const [deletionCharacter, setDeletionCharacter] = useState<{id: string, name: string} | null>(null)
  const [affectedDialogueCount, setAffectedDialogueCount] = useState(0)
  const [deletionAction, setDeletionAction] = useState<'clear' | 'reassign' | null>(null)
  const [reassignmentCharacterId, setReassignmentCharacterId] = useState<string>('')
  
  // Character merge dialog state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [mergePrimaryCharId, setMergePrimaryCharId] = useState<string>('')
  const [mergeDuplicateCharIds, setMergeDuplicateCharIds] = useState<string[]>([])
  
  // Scene score generation state
  const [generatingScoreFor, setGeneratingScoreFor] = useState<number | null>(null)
  
  // Scene direction generation state
  const [generatingDirectionFor, setGeneratingDirectionFor] = useState<number | null>(null)
  const [generationProgress, setGenerationProgress] = useState({
    script: { 
      complete: false, 
      progress: 0,
      status: '',
      scenesGenerated: 0,
      totalScenes: 0,
      batch: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: 0
    },
    characters: { complete: false, progress: 0, total: 0 },
    scenes: { complete: false, progress: 0, total: 0 }
  })
  
  // Audio generation state
  const [narrationVoice, setNarrationVoice] = useState<VoiceConfig | null>(null)
  const [descriptionVoice, setDescriptionVoice] = useState<VoiceConfig | null>(null)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [audioProgress, setAudioProgress] = useState<{
    current: number
    total: number
    status: string
    dialogueCount?: number
  } | null>(null)
  
  // Generation lock mechanism to prevent race conditions
  const [generatingAudioLocks, setGeneratingAudioLocks] = useState<Set<string>>(new Set())
  
  // Share functionality state
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Image quality setting
  const [imageQuality, setImageQuality] = useState<'max' | 'auto'>('auto')
  const [ttsProvider, setTtsProvider] = useState<'google' | 'elevenlabs'>('elevenlabs')
  
  // BYOK Settings
  const [showBYOKSettings, setShowBYOKSettings] = useState(false)
  const [byokSettings, setBYOKSettings] = useState<BYOKSettings>({
    imageProvider: 'google',
    imageModel: 'imagen-3.0-generate-001',
    audioProvider: 'elevenlabs',
    audioModel: 'eleven_multilingual_v2',
    videoProvider: 'runway',
    videoModel: 'gen3-alpha'
  })
  
  // Batch image generation state
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false)
  const [imageProgress, setImageProgress] = useState<{
    scene: number
    total: number
    status: string
    sceneHeading?: string
  } | null>(null)

  // Single keyframe generation state (for global screen freeze)
  const [isGeneratingKeyframe, setIsGeneratingKeyframe] = useState(false)
  const [generatingKeyframeSceneNumber, setGeneratingKeyframeSceneNumber] = useState<number | null>(null)
  
  // Keyframe State Machine - Frame step generation state
  const [generatingFrameForSegment, setGeneratingFrameForSegment] = useState<string | null>(null)
  const [generatingFramePhase, setGeneratingFramePhase] = useState<'start' | 'end' | 'video' | null>(null)
  
  // Handle quality setting change
  const handleQualityChange = async (quality: 'max' | 'auto') => {
    setImageQuality(quality)
    
    // Update project metadata
    if (project) {
      const updatedProject = {
        ...project,
        metadata: {
          ...project.metadata,
          imageQuality: quality,
          visionPhase: {
            ...project.metadata?.visionPhase,
            script: script,
            characters: characters,
            scenes: scenes,
            narrationVoice: narrationVoice,
            descriptionVoice: descriptionVoice
          }
        }
      }
      setProject(updatedProject)
      
      // Save to database
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: updatedProject.metadata
          })
        })
        console.log(`[Quality] Updated to ${quality} quality`)
      } catch (error) {
        console.error('[Quality] Failed to save quality setting:', error)
      }
    }
  }
  
  // Handle narration voice change
  const handleNarrationVoiceChange = async (voiceConfig: VoiceConfig) => {
    console.log('[Narration Voice] Setting narration voice:', voiceConfig)
    setNarrationVoice(voiceConfig)
    
    // Sync to narrator character (single source of truth)
    const narratorIndex = characters.findIndex(c => c.type === 'narrator')
    let updatedCharacters = characters
    if (narratorIndex >= 0) {
      updatedCharacters = characters.map((c, i) => 
        i === narratorIndex ? { ...c, voiceConfig } : c
      )
      setCharacters(updatedCharacters)
      console.log('[Narration Voice] Synced to narrator character')
    }
    
    if (project) {
      const updatedProject = {
        ...project,
        metadata: {
          ...project.metadata,
          visionPhase: {
            ...project.metadata?.visionPhase,
            narrationVoice: voiceConfig,
            characters: updatedCharacters,
            script: script,
            scenes: scenes,
            descriptionVoice: descriptionVoice
          }
        }
      }
      setProject(updatedProject)
      
      // Save to database
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: updatedProject.metadata
          })
        })
        console.log('[Narration Voice] Updated narration voice:', voiceConfig)
      } catch (error) {
        console.error('[Narration Voice] Failed to save narration voice:', error)
      }
    }
  }
  
  // Handle character voice update
  const handleUpdateCharacterVoice = async (characterId: string, voiceConfig: VoiceConfig) => {
    console.log('[Character Voice] Updating:', { characterId, voiceConfig })
    console.log('[Character Voice] Current characters:', characters.map(c => ({ id: c.id, name: c.name })))
    
    // Find character by ID (not by index!)
    const characterIndex = characters.findIndex(c => c.id === characterId)
    
    if (characterIndex === -1) {
      console.error('[Character Voice] Character not found with ID:', characterId)
      try { 
        const { toast } = require('sonner')
        toast.error('Character not found')
      } catch {}
      return
    }
    
    console.log('[Character Voice] Found character at index:', characterIndex)
    
    const updatedCharacters = characters.map((char, idx) => 
      idx === characterIndex
        ? { ...char, voiceConfig }
        : char
    )
    
    console.log('[Character Voice] Updated character:', updatedCharacters[characterIndex])
    setCharacters(updatedCharacters)
    
    // If this is the narrator character, also update the narration voice
    const updatedCharacter = updatedCharacters[characterIndex]
    if (updatedCharacter.type === 'narrator') {
      console.log('[Character Voice] Updating narration voice from narrator character')
      setNarrationVoice(voiceConfig)
    } else if (updatedCharacter.type === 'description') {
      console.log('[Character Voice] Updating description voice from description character')
      setDescriptionVoice(voiceConfig)
    }
    
    if (project) {
      const updatedProject = {
        ...project,
        metadata: {
          ...project.metadata,
          visionPhase: {
            ...project.metadata?.visionPhase,
            characters: updatedCharacters,
            script: script,
            scenes: scenes,
            narrationVoice: updatedCharacter.type === 'narrator' ? voiceConfig : narrationVoice,
            descriptionVoice: updatedCharacter.type === 'description' ? voiceConfig : descriptionVoice
          }
        }
      }
      setProject(updatedProject)
      
      // Save to database
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: updatedProject.metadata
          })
        })
        console.log('[Character Voice] Updated character voice:', characterId, voiceConfig)
        
        // Add success toast
        try { 
          const { toast } = require('sonner')
          const char = updatedCharacters.find(c => c.id === characterId)
          toast.success(`Voice assigned to ${char?.name || 'character'}: ${voiceConfig.voiceName}`)
        } catch {}
      } catch (error) {
        console.error('[Character Voice] Failed to save character voice:', error)
        // Add error toast
        try { 
          const { toast } = require('sonner')
          toast.error('Failed to save voice assignment')
        } catch {}
      }
    }
  }
  
  // Handle character appearance description update
  const handleUpdateCharacterAppearance = async (characterId: string, newDescription: string) => {
    try {
      // Update local state first
      const updatedCharacters = characters.map(char => {
        const charId = char.id || characters.indexOf(char).toString()
        return charId === characterId 
          ? { ...char, appearanceDescription: newDescription }
          : char
      })
      
      setCharacters(updatedCharacters)
      
      // Save to database using existing projects API
      if (project) {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...project.metadata,
              visionPhase: {
                ...project.metadata?.visionPhase,
                characters: updatedCharacters,
                script: script,
                scenes: scenes,
                narrationVoice: narrationVoice,
                descriptionVoice: descriptionVoice
              }
            }
          })
        })
        
        if (!response.ok) throw new Error('Failed to update appearance')
        
        try { 
          const { toast } = require('sonner')
          toast.success('Appearance description updated')
        } catch {}
      }
    } catch (error) {
      console.error('[Update Appearance] Error:', error)
      try { 
        const { toast } = require('sonner')
        toast.error('Failed to update appearance description')
      } catch {}
    }
  }
  
  // Handle character name update
  const handleUpdateCharacterName = async (characterId: string, newName: string) => {
    try {
      // Update local state first
      const updatedCharacters = characters.map(char => {
        const charId = char.id || characters.indexOf(char).toString()
        return charId === characterId 
          ? { ...char, name: newName }
          : char
      })
      
      setCharacters(updatedCharacters)
      
      // Save to database using existing projects API
      if (project) {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...project.metadata,
              visionPhase: {
                ...project.metadata?.visionPhase,
                characters: updatedCharacters,
                script: script,
                scenes: scenes,
                narrationVoice: narrationVoice,
                descriptionVoice: descriptionVoice
              }
            }
          })
        })
        
        if (!response.ok) throw new Error('Failed to update name')
        
        try { 
          const { toast } = require('sonner')
          toast.success('Character name updated')
        } catch {}
      }
    } catch (error) {
      console.error('[Update Name] Error:', error)
      try { 
        const { toast } = require('sonner')
        toast.error('Failed to update character name')
      } catch {}
    }
  }
  
  // Handle character role update
  const handleUpdateCharacterRole = async (characterId: string, newRole: string) => {
    try {
      // Update local state first
      const updatedCharacters = characters.map(char => {
        const charId = char.id || characters.indexOf(char).toString()
        return charId === characterId 
          ? { ...char, role: newRole }
          : char
      })
      
      setCharacters(updatedCharacters)
      
      // Save to database using existing projects API
      if (project) {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...project.metadata,
              visionPhase: {
                ...project.metadata?.visionPhase,
                characters: updatedCharacters,
                script: script,
                scenes: scenes,
                narrationVoice: narrationVoice,
                descriptionVoice: descriptionVoice
              }
            }
          })
        })
        
        if (!response.ok) throw new Error('Failed to update role')
        
        try { 
          const { toast } = require('sonner')
          toast.success('Character role updated')
        } catch {}
      }
    } catch (error) {
      console.error('[Update Role] Error:', error)
      try { 
        const { toast } = require('sonner')
        toast.error('Failed to update character role')
      } catch {}
    }
  }
  
  // Handle character wardrobe update - supports both legacy single wardrobe and new collection format
  const handleUpdateCharacterWardrobe = async (characterId: string, wardrobe: { 
    defaultWardrobe?: string; 
    wardrobeAccessories?: string;
    // New collection-based fields
    wardrobeId?: string;
    wardrobeName?: string;
    previewImageUrl?: string;
    action?: 'add' | 'update' | 'delete' | 'setDefault';
  }) => {
    try {
      const updatedCharacters = characters.map(char => {
        const charId = char.id || characters.indexOf(char).toString()
        if (charId !== characterId) return char
        
        // Get or initialize wardrobes collection
        let wardrobes: CharacterWardrobe[] = char.wardrobes || []
        
        // Migrate legacy wardrobe to collection if exists and collection is empty
        if (wardrobes.length === 0 && (char.defaultWardrobe || wardrobe.defaultWardrobe)) {
          const legacyDescription = char.defaultWardrobe || wardrobe.defaultWardrobe || ''
          const legacyAccessories = char.wardrobeAccessories || wardrobe.wardrobeAccessories || ''
          if (legacyDescription) {
            wardrobes = [{
              id: `wardrobe-${Date.now()}`,
              name: 'Default Outfit',
              description: legacyDescription,
              accessories: legacyAccessories,
              isDefault: true,
              createdAt: new Date().toISOString()
            }]
          }
        }
        
        // Handle collection operations
        if (wardrobe.action === 'add' && wardrobe.wardrobeName && wardrobe.defaultWardrobe) {
          // Add new wardrobe to collection
          const newWardrobe: CharacterWardrobe = {
            id: `wardrobe-${Date.now()}`,
            name: wardrobe.wardrobeName,
            description: wardrobe.defaultWardrobe,
            accessories: wardrobe.wardrobeAccessories,
            isDefault: wardrobes.length === 0, // First wardrobe is default
            createdAt: new Date().toISOString()
          }
          wardrobes = [...wardrobes, newWardrobe]
        } else if (wardrobe.action === 'update' && wardrobe.wardrobeId) {
          // Update existing wardrobe
          wardrobes = wardrobes.map(w => 
            w.id === wardrobe.wardrobeId 
              ? { 
                  ...w, 
                  description: wardrobe.defaultWardrobe || w.description, 
                  accessories: wardrobe.wardrobeAccessories || w.accessories,
                  ...(wardrobe.previewImageUrl ? { previewImageUrl: wardrobe.previewImageUrl } : {})
                }
              : w
          )
        } else if (wardrobe.action === 'delete' && wardrobe.wardrobeId) {
          // Delete wardrobe
          const wasDefault = wardrobes.find(w => w.id === wardrobe.wardrobeId)?.isDefault
          wardrobes = wardrobes.filter(w => w.id !== wardrobe.wardrobeId)
          // If deleted wardrobe was default, make first remaining wardrobe default
          if (wasDefault && wardrobes.length > 0) {
            wardrobes[0].isDefault = true
          }
        } else if (wardrobe.action === 'setDefault' && wardrobe.wardrobeId) {
          // Set wardrobe as default
          wardrobes = wardrobes.map(w => ({
            ...w,
            isDefault: w.id === wardrobe.wardrobeId
          }))
        } else if (!wardrobe.action) {
          // Legacy behavior: update/add single wardrobe
          const defaultWardrobeObj = wardrobes.find(w => w.isDefault)
          if (defaultWardrobeObj) {
            wardrobes = wardrobes.map(w => 
              w.isDefault 
                ? { ...w, description: wardrobe.defaultWardrobe || w.description, accessories: wardrobe.wardrobeAccessories || w.accessories }
                : w
            )
          } else if (wardrobe.defaultWardrobe) {
            wardrobes = [{
              id: `wardrobe-${Date.now()}`,
              name: 'Default Outfit',
              description: wardrobe.defaultWardrobe,
              accessories: wardrobe.wardrobeAccessories,
              isDefault: true,
              createdAt: new Date().toISOString()
            }]
          }
        }
        
        // Get default wardrobe for legacy fields
        const defaultWdrb = wardrobes.find(w => w.isDefault)
        
        return { 
          ...char, 
          wardrobes,
          // Keep legacy fields in sync with default wardrobe for backwards compatibility
          defaultWardrobe: defaultWdrb?.description,
          wardrobeAccessories: defaultWdrb?.accessories
        }
      })
      
      setCharacters(updatedCharacters)
      
      // Save to database using existing projects API
      if (project) {
        // Build updated metadata with new character wardrobe
        const updatedVisionPhase = {
          ...project.metadata?.visionPhase,
          characters: updatedCharacters,
          script: script,
          scenes: scenes,
          narrationVoice: narrationVoice,
          descriptionVoice: descriptionVoice
        }
        
        const updatedMetadata = {
          ...project.metadata,
          visionPhase: updatedVisionPhase
        }
        
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: updatedMetadata
          })
        })
        
        if (!response.ok) throw new Error('Failed to update wardrobe')
        
        // CRITICAL: Also update the project state so subsequent operations 
        // (like scene generation) use the updated wardrobe, not stale metadata
        setProject({
          ...project,
          metadata: updatedMetadata
        })
        
        console.log('[Vision] Character wardrobe saved:', characterId, wardrobe)
      }
    } catch (error) {
      console.error('[Update Wardrobe] Error:', error)
      try { 
        const { toast } = require('sonner')
        toast.error('Failed to update character wardrobe')
      } catch {}
    }
  }
  
  // Handle scene wardrobe assignment - assigns specific wardrobe to character for a scene
  const handleUpdateSceneWardrobe = async (sceneIndex: number, characterId: string, wardrobeId: string | null) => {
    try {
      // Safety check: Don't save if scenes haven't loaded yet - prevents data corruption
      if (!scenes || scenes.length === 0) {
        console.warn('[Update Scene Wardrobe] Aborted: scenes not loaded yet, preventing empty save')
        return
      }
      
      const updatedScenes = scenes.map((scene, idx) => {
        if (idx !== sceneIndex) return scene
        
        let characterWardrobes = scene.characterWardrobes || []
        
        if (wardrobeId === null) {
          // Remove override - use default
          characterWardrobes = characterWardrobes.filter((cw: SceneCharacterWardrobe) => cw.characterId !== characterId)
        } else {
          // Set or update override
          const existingIdx = characterWardrobes.findIndex((cw: SceneCharacterWardrobe) => cw.characterId === characterId)
          if (existingIdx >= 0) {
            characterWardrobes[existingIdx] = { characterId, wardrobeId }
          } else {
            characterWardrobes = [...characterWardrobes, { characterId, wardrobeId }]
          }
        }
        
        return { ...scene, characterWardrobes }
      })
      
      setScenes(updatedScenes)
      
      // Save to database
      if (project) {
        const updatedVisionPhase = {
          ...project.metadata?.visionPhase,
          characters,
          script: {
            ...script,
            script: {
              ...(script?.script || {}),
              scenes: updatedScenes
            },
            scenes: updatedScenes
          },
          scenes: updatedScenes,
          narrationVoice: narrationVoice,
          descriptionVoice: descriptionVoice
        }
        
        const updatedMetadata = {
          ...project.metadata,
          visionPhase: updatedVisionPhase
        }
        
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: updatedMetadata
          })
        })
        
        if (!response.ok) throw new Error('Failed to update scene wardrobe')
        
        setProject({
          ...project,
          metadata: updatedMetadata
        })
        
        console.log('[Vision] Scene wardrobe saved:', sceneIndex, characterId, wardrobeId)
      }
    } catch (error) {
      console.error('[Update Scene Wardrobe] Error:', error)
      try { 
        const { toast } = require('sonner')
        toast.error('Failed to update scene wardrobe')
      } catch {}
    }
  }
  
  // Handle validation warning dismiss
  const handleDismissValidationWarning = (sceneIdx: number) => {
    setValidationInfo(prev => ({
      ...prev,
      [sceneIdx]: {
        ...prev[sceneIdx],
        dismissed: true
      }
    }))
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      // Guard against placeholder project IDs - redirect to studio for proper project creation
      if (!projectId || projectId.startsWith('new-project')) {
        console.warn('[VisionPage] Invalid projectId, redirecting to studio:', projectId)
        router.replace('/dashboard/studio/new-project')
        return
      }
      loadProject()
    }
  }, [projectId, mounted, router])

  // Script review functions
  const handleGenerateReviews = async () => {
    if (!script || !projectId) return
    
    setIsGeneratingReviews(true)
    useStore.getState().setIsGeneratingReviews(true)
    try {
      await execute(async () => {
        // Compute script hash for change detection
        const currentScriptHash = generateScriptHash(script)
        const previousScriptHash = project?.metadata?.visionPhase?.reviews?.scriptHash
        
        // Build previous scores for hysteresis smoothing
        const currentAudienceReview = audienceReview
        const previousScoresPayload = currentAudienceReview?.overallScore ? {
          overallScore: currentAudienceReview.overallScore,
          categories: currentAudienceReview.categories || []
        } : undefined
        
        const response = await fetch('/api/vision/review-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            script: {
              title: script.title,
              logline: script.logline,
              scenes: script.script?.scenes || [],
              characters: characters
            },
            previousScores: previousScoresPayload,
            scriptHash: currentScriptHash,
            previousScriptHash: previousScriptHash
          })
        })

        if (!response.ok) throw new Error('Failed to generate reviews')
        
        const data = await response.json()
        
        if (data.success) {
          // New API returns audienceResonance as primary review, director is deprecated (null)
          const audienceData = data.audienceResonance || data.audience
          console.log('[Script Review] Audience Resonance generated successfully:', {
            audienceScore: audienceData?.overallScore,
            showVsTellRatio: audienceData?.showVsTellRatio,
            deductionsCount: audienceData?.deductions?.length || 0
          })
          
          // Save reviews to project metadata BEFORE updating local state
          if (project) {
            // Get existing review history (keep last 5 reviews)
            const existingHistory = project.metadata?.visionPhase?.reviewHistory || []
            const currentReview = project.metadata?.visionPhase?.reviews?.audience
            
            // Add current review to history if it exists and is different
            let updatedHistory = [...existingHistory]
            if (currentReview?.overallScore !== undefined) {
              updatedHistory = [
                {
                  score: currentReview.overallScore,
                  generatedAt: currentReview.generatedAt || project.metadata?.visionPhase?.reviews?.lastUpdated,
                  dimensionalScores: currentReview.categories?.map((c: any) => ({ name: c.name, score: c.score })) || []
                },
                ...existingHistory
              ].slice(0, 5) // Keep only last 5 reviews
            }
            
            const updatedMetadata = {
              ...project.metadata,
              visionPhase: {
                ...project.metadata?.visionPhase,
                reviews: {
                  director: data.director,
                  audience: data.audience,
                  lastUpdated: data.generatedAt,
                  scriptHash: generateScriptHash(script)
                },
                reviewHistory: updatedHistory,
                script: script,
                scenes: scenes,
                characters: characters,
                narrationVoice: narrationVoice
              }
            }
            
            console.log('[Script Review] Saving reviews to database...')
            
            const saveResponse = await fetch(`/api/projects/${projectId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                metadata: updatedMetadata
              })
            })
            
            if (!saveResponse.ok) {
              const errorText = await saveResponse.text()
              console.error('[Script Review] Failed to save reviews:', errorText)
              throw new Error('Failed to save reviews to database')
            }
            
            const saveData = await saveResponse.json()
            console.log('[Script Review] Reviews saved successfully to database')
            
            // Update local state only after successful save
            // Director review is deprecated - user is the director
            setDirectorReview(null)
            setAudienceReview(data.audienceResonance || data.audience)
            setReviewsOutdated(false)
            
            console.log('[Script Review] State updated with Audience Resonance:', {
              audienceScore: (data.audienceResonance || data.audience)?.overallScore
            })
            
            // No need to reload project - reviews are already in state and saved to DB
          } else {
            // If no project in state, still update local state
            setDirectorReview(null)
            setAudienceReview(data.audienceResonance || data.audience)
            setReviewsOutdated(false)
          }
          
          try {
            const { toast } = require('sonner')
            toast.success('Script reviews generated and saved successfully!')
          } catch {}
        }
      }, { message: 'Analyzing audience resonance...', estimatedDuration: 25, operationType: 'script-review' })
    } catch (error) {
      console.error('[Script Review] Error:', error)
      try {
        const { toast } = require('sonner')
        toast.error(error instanceof Error ? error.message : 'Failed to generate script reviews')
      } catch {}
    } finally {
      setIsGeneratingReviews(false)
      useStore.getState().setIsGeneratingReviews(false)
    }
  }

  // Debounced save function for scene analysis persistence
  // Prevents rapid-fire API calls when multiple state updates occur
  const debouncedSaveSceneAnalysis = useMemo(
    () => debounce(async (scriptData: any, metadata: any, projId: string) => {
      try {
        await fetch(`/api/projects/${projId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...metadata,
              visionPhase: {
                ...metadata?.visionPhase,
                script: scriptData
              }
            }
          })
        })
      } catch (err) {
        console.error('[SceneAnalysis] Failed to persist scene analysis:', err)
      }
    }, 1000), // 1 second debounce
    []
  )

  // Memoized callback for persisting scene analysis from ScriptReviewModal
  // CRITICAL: This must be memoized to prevent infinite re-render loops
  // The callback is passed to ScriptReviewModal which has a useEffect dependency on it
  const handleSceneAnalysisComplete = useCallback((sceneAnalyses: Array<{
    sceneIndex: number
    analysis: {
      score: number
      pacing: 'slow' | 'moderate' | 'fast'
      tension: 'low' | 'medium' | 'high'
      characterDevelopment: 'minimal' | 'moderate' | 'strong'
      visualPotential: 'low' | 'medium' | 'high'
      notes: string
      recommendations: string[]
      analyzedAt: string
    }
  }>) => {
    // Persist scene-level analysis to each scene in the script
    if (!script?.script?.scenes || sceneAnalyses.length === 0) return
    
    const updatedScenes = [...script.script.scenes]
    let hasChanges = false
    
    for (const { sceneIndex, analysis } of sceneAnalyses) {
      if (sceneIndex >= 0 && sceneIndex < updatedScenes.length) {
        // Check if this is a score improvement (for delta display)
        const existingAnalysis = updatedScenes[sceneIndex].audienceAnalysis
        const previousScore = existingAnalysis?.score
        
        updatedScenes[sceneIndex] = {
          ...updatedScenes[sceneIndex],
          audienceAnalysis: {
            ...analysis,
            previousScore: previousScore !== undefined && previousScore !== analysis.score 
              ? previousScore 
              : undefined
          }
        }
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      const updatedScript = {
        ...script,
        script: {
          ...script.script,
          scenes: updatedScenes
        }
      }
      setScript(updatedScript)
      
      // Auto-save scene analysis to database with debounce (no toast - silent save)
      debouncedSaveSceneAnalysis(updatedScript, project?.metadata, projectId)
    }
  }, [script, projectId, project?.metadata, debouncedSaveSceneAnalysis])

  // ============================================================================
  // UNIFIED SIDEBAR DATA - Populate global sidebar with Production phase data
  // ============================================================================
  
  // Compute sidebar data for the unified GlobalSidebar
  // Director review removed - user is the director. Only Audience Resonance is shown.
  const sidebarReviewScores = useMemo(() => {
    if (!audienceReview?.overallScore) return null
    return {
      director: null, // Deprecated - user is the director
      audience: audienceReview?.overallScore ?? null
    }
  }, [audienceReview?.overallScore])
  
  // Compute audience review details for sidebar chart/demographic/emotional impact
  const sidebarAudienceReviewDetails = useMemo(() => {
    if (!audienceReview?.categories) return null
    return {
      categories: audienceReview.categories || [],
      targetDemographic: audienceReview.targetDemographic,
      emotionalImpact: audienceReview.emotionalImpact
    }
  }, [audienceReview?.categories, audienceReview?.targetDemographic, audienceReview?.emotionalImpact])
  
  const sidebarProjectStats = useMemo(() => {
    const scriptScenes = normalizeScenes(script)
    const sceneCount = scriptScenes.length
    const castCount = characters.length
    const durationMinutes = Math.round(scriptScenes.reduce((sum: number, s: any) => sum + (s.estimatedDuration || s.duration || 15), 0) / 60)
    const imageCredits = sceneCount * 5
    const charCredits = castCount * 2
    const audioCredits = sceneCount * 1
    const estimatedCredits = imageCredits + charCredits + audioCredits
    
    return { sceneCount, castCount, durationMinutes, estimatedCredits }
  }, [script, characters.length])
  
  const sidebarProgressData = useMemo(() => {
    const scriptScenes = normalizeScenes(script)
    const sceneCount = scriptScenes.length
    const hasFilmTreatment = !!(project?.metadata?.filmTreatment || project?.metadata?.filmTreatmentVariant)
    const hasScreenplay = sceneCount > 0
    const refLibraryCount = sceneReferences.length + objectReferences.length
    const scenesWithImages = scriptScenes.filter((s: any) => s.imageUrl).length
    const scenesWithAudio = scriptScenes.filter((s: any) => 
      s.narrationAudioUrl || s.dialogueAudio?.en?.length || (Array.isArray(s.dialogueAudio) && s.dialogueAudio.length)
    ).length
    const imageProgress = sceneCount > 0 ? Math.round((scenesWithImages / sceneCount) * 100) : 0
    const audioProgress = sceneCount > 0 ? Math.round((scenesWithAudio / sceneCount) * 100) : 0
    
    return { hasFilmTreatment, hasScreenplay, sceneCount, refLibraryCount, imageProgress, audioProgress }
  }, [script, project?.metadata, sceneReferences.length, objectReferences.length])
  
  // Push data to global sidebar via store
  useSidebarData({
    reviewScores: sidebarReviewScores,
    audienceReviewDetails: sidebarAudienceReviewDetails,
    projectStats: sidebarProjectStats,
    progressData: sidebarProgressData
  })
  
  // Register quick action handlers for the global sidebar
  // These handlers are called when user clicks quick action buttons in the sidebar
  useSidebarQuickActions(useMemo(() => ({
    'goto-bookmark': handleJumpToBookmark,
    'scene-gallery': () => setShowSceneGallery(prev => !prev),
    'screening-room': () => setIsPlayerOpen(true),
    'update-reviews': handleGenerateReviews,
    'review-analysis': () => setShowReviewModal(true),
    'review-treatment': () => setShowTreatmentReview(true),
  }), [handleJumpToBookmark, handleGenerateReviews]))
  
  // Refs to hold latest handlers for event listeners (avoids stale closures)
  const handlersRef = useRef({
    jumpToBookmark: handleJumpToBookmark,
    generateReviews: handleGenerateReviews,
  })
  
  // Keep refs updated with latest handlers
  useEffect(() => {
    handlersRef.current = {
      jumpToBookmark: handleJumpToBookmark,
      generateReviews: handleGenerateReviews,
    }
  }, [handleJumpToBookmark, handleGenerateReviews])
  
  // Listen for custom events from header dropdowns (Guide and Actions)
  // These events are dispatched by ScriptPanel dropdown menus
  useEffect(() => {
    const eventHandlers: Record<string, () => void> = {
      // Actions dropdown events
      'production:goto-bookmark': () => handlersRef.current.jumpToBookmark(),
      'production:scene-gallery': () => setShowSceneGallery(prev => !prev),
      'production:screening-room': () => setIsPlayerOpen(true),
      'production:update-reviews': () => handlersRef.current.generateReviews(),
      'production:review-analysis': () => setShowReviewModal(true),
      'production:review-treatment': () => setShowTreatmentReview(true),
      // Guide dropdown events
      'vision:scenes': () => {
        // Scroll to first scene
        const firstScene = document.getElementById('scene-0')
        if (firstScene) {
          firstScene.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      },
      'vision:characters': () => {
        // Open Reference Library Cast tab by dispatching event
        window.dispatchEvent(new CustomEvent('reference-library:open-tab', { detail: { tab: 'cast' } }))
      },
      'vision:script-preview': () => {
        // Toggle scene gallery as script preview
        setShowSceneGallery(prev => !prev)
      },
      'vision:gallery': () => {
        // Toggle scene gallery
        setShowSceneGallery(prev => !prev)
      },
      'vision:cost-estimate': () => {
        // Show cost calculator modal (dispatches event for ScriptPanel to handle)
        window.dispatchEvent(new CustomEvent('open-cost-calculator'))
      },
    }
    
    // Create event handler functions
    const eventListeners = Object.entries(eventHandlers).map(([eventName, handler]) => {
      const listener = () => handler()
      window.addEventListener(eventName, listener)
      return { eventName, listener }
    })
    
    // Cleanup
    return () => {
      eventListeners.forEach(({ eventName, listener }) => {
        window.removeEventListener(eventName, listener)
      })
    }
  }, [])
  // ============================================================================

  const generateScriptHash = (script: any): string => {
    // Simple hash based on script content for change detection
    const content = JSON.stringify({
      title: script?.title,
      logline: script?.logline,
      scenes: script?.script?.scenes?.map((s: any) => ({
        heading: s.heading,
        action: s.action,
        narration: s.narration,
        dialogue: s.dialogue
      }))
    })
    
    // Simple string hash function that works with Unicode
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).slice(0, 16)
  }

  const loadProject = async (skipAutoGeneration: boolean = false) => {
    try {
      // Add cache-busting to force fresh data from database
      const cacheBuster = `?_t=${Date.now()}`
      const res = await fetch(`/api/projects/${projectId}${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('[Load Project] Error response:', errorText)
        throw new Error(`Failed to load project: ${res.status} ${res.statusText}`)
      }
      
      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const text = await res.text()
        console.error('[Load Project] Non-JSON response:', text.substring(0, 500))
        throw new Error('Server returned non-JSON response')
      }
      
      const data = await res.json()
      
      const proj = data.project || data
      setProject(proj)
      
      // DEBUG: Log loaded scene assets from BOTH locations
      const loadedScenesFromVisionPhase = proj.metadata?.visionPhase?.scenes || []
      const loadedScenesFromScript = proj.metadata?.visionPhase?.script?.script?.scenes || []
      
      // Load image quality setting from project metadata
      if (proj.metadata?.imageQuality) {
        setImageQuality(proj.metadata.imageQuality)
      }
      
      // Load BYOK settings from project metadata
      if (proj.metadata?.byokSettings) {
        setBYOKSettings(proj.metadata.byokSettings)
        // Update ttsProvider from BYOK settings
        setTtsProvider(proj.metadata.byokSettings.audioProvider)
      }
      
      // Load existing Vision data if available
      const visionPhase = proj.metadata?.visionPhase
      console.log('[loadProject] visionPhase loaded:', {
        hasVisionPhase: !!visionPhase,
        hasScript: !!visionPhase?.script,
        hasScriptScriptScenes: !!visionPhase?.script?.script?.scenes,
        scriptScriptScenesLength: visionPhase?.script?.script?.scenes?.length,
        hasScenes: !!visionPhase?.scenes,
        scenesLength: visionPhase?.scenes?.length,
        hasCharacters: !!visionPhase?.characters,
        charactersLength: visionPhase?.characters?.length
      })
      if (visionPhase) {
        if (visionPhase.script) {
          // Migrate audio structure if needed
          const { migrateScriptAudio } = await import('@/lib/audio/audioMigration')
          const { script: migratedScript, needsMigration } = migrateScriptAudio(visionPhase.script)
          
          console.log('[loadProject] Script after migration:', {
            hasScript: !!migratedScript,
            hasScriptScenes: !!migratedScript?.script?.scenes,
            scriptScenesLength: migratedScript?.script?.scenes?.length,
            needsMigration
          })
          
          if (needsMigration) {
            // Save migrated script back to database
            try {
              await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  metadata: {
                    ...proj.metadata,
                    visionPhase: {
                      ...visionPhase,
                      script: migratedScript
                    }
                  }
                })
              })
            } catch (error) {
              console.warn('[loadProject] Failed to save audio migration:', error)
            }
          }
          
          setScript(migratedScript)
        }
        
        // Load existing reviews
        if (visionPhase.reviews) {
          setDirectorReview(visionPhase.reviews.director || null)
          setAudienceReview(visionPhase.reviews.audience || null)
          setReviewsOutdated(false)
        }
        
        // Process characters first (needed for dialogue migration)
        let charactersWithIds: any[] = []
        if (visionPhase.characters) {
          // Ensure character roles are preserved (default to supporting if not specified)
          const charactersWithRole = visionPhase.characters.map((c: any) => {
            const char = {
              ...c,
              role: c.role || 'supporting'
            }
            
            // FIX: Detect and correct provider mismatch
            if (char.voiceConfig && char.voiceConfig.provider === 'elevenlabs') {
              // Check if voiceId looks like a Google voice (contains "Studio" or starts with language code)
              const isGoogleVoice = char.voiceConfig.voiceId?.includes('Studio') || 
                                    /^[a-z]{2}-[A-Z]{2}/.test(char.voiceConfig.voiceId)
              
              if (isGoogleVoice) {
                console.warn(`[Load Project] Fixing provider mismatch for ${char.name}: ${char.voiceConfig.voiceId} is Google voice but marked as ElevenLabs`)
                char.voiceConfig = {
                  ...char.voiceConfig,
                  provider: 'google'
                }
              }
            }
            
            return char
          })
          
          // Check if any voice configs were auto-fixed and need saving
          const needsSaving = charactersWithRole.some((c: any) => 
            c.voiceConfig && 
            c.voiceConfig.provider === 'google' && 
            visionPhase.characters.find((orig: any) => 
              orig.name === c.name && 
              orig.voiceConfig?.provider === 'elevenlabs'
            )
          )

          if (needsSaving) {
            try {
              await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  metadata: {
                    ...proj.metadata,
                    visionPhase: {
                      ...visionPhase,
                      characters: charactersWithRole
                    }
                  }
                })
              })
            } catch (error) {
              console.warn('[Load Project] Failed to save voice configs:', error)
            }
          }

          // MIGRATION: Ensure all characters have UUIDs
          charactersWithIds = charactersWithRole.map((c: any) => ({
            ...c,
            id: c.id || uuidv4() // Assign UUID if missing
          }))
          
          // Check if any characters needed UUIDs
          const needsIdMigration = charactersWithIds.some((c: any, idx: number) => 
            c.id !== charactersWithRole[idx].id
          )
          
          if (needsIdMigration) {
            try {
              await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  metadata: {
                    ...proj.metadata,
                    visionPhase: {
                      ...visionPhase,
                      characters: charactersWithIds
                    }
                  }
                })
              })
            } catch (error) {
              console.warn('[Load Project] Failed to save character IDs:', error)
            }
          }

          // Ensure narrator character exists so voice can be configured independently
          const narratorCharacter = ensureNarratorCharacter(charactersWithIds, narrationVoice || undefined)
          const charactersWithNarrator = charactersWithIds.some(c => c.type === 'narrator') 
            ? charactersWithIds 
            : [...charactersWithIds, narratorCharacter]
          
          // Filter out deprecated description characters
          const charactersFiltered = charactersWithNarrator.filter(c => c.type !== 'description')
          
          setCharacters(charactersFiltered)
          
          // Sync narration voice from narrator character (single source of truth)
          const narratorChar = charactersFiltered.find(c => c.type === 'narrator')
          if (narratorChar?.voiceConfig) {
            const finalNarratorVoice = narratorChar.voiceConfig
            setNarrationVoice(finalNarratorVoice)
            
                        // Save to visionPhase.narrationVoice for backward compatibility
            if (!visionPhase.narrationVoice || visionPhase.narrationVoice.voiceId !== narratorChar.voiceConfig.voiceId) {                                       
              try {
                await fetch(`/api/projects/${projectId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    metadata: {
                      ...proj.metadata,
                      visionPhase: {
                        ...visionPhase,
                        narrationVoice: narratorChar.voiceConfig
                      }
                    }
                  })
                })
              } catch (error) {
                console.warn('[Load Project] Failed to sync narration voice:', error)
              }
            }
          }

          // Sync description voice from dedicated character
          const descriptionChar = charactersWithIds.find(c => c.type === 'description')
          if (descriptionChar?.voiceConfig) {
            const finalDescriptionVoice = descriptionChar.voiceConfig
            setDescriptionVoice(finalDescriptionVoice)

            if (!visionPhase.descriptionVoice || visionPhase.descriptionVoice.voiceId !== descriptionChar.voiceConfig.voiceId) {
              try {
                await fetch(`/api/projects/${projectId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    metadata: {
                      ...proj.metadata,
                      visionPhase: {
                        ...visionPhase,
                        descriptionVoice: descriptionChar.voiceConfig
                      }
                    }
                  })
                })
              } catch (error) {
                console.warn('[Load Project] Failed to sync description voice:', error)
              }
            }
          }
        }
        if (visionPhase.scenes) {
          // MIGRATION: Add characterId to dialogue if missing
          const scenesWithCharacterIds = visionPhase.scenes.map((scene: any) => ({
            ...scene,
            dialogue: scene.dialogue?.map((d: any) => {
              if (d.characterId) return d // Already has ID
              
              // Find character by name and add ID
              const matchedChar = charactersWithIds?.find((c: any) => 
                c.name.toLowerCase() === d.character.toLowerCase()
              )
              
              return {
                ...d,
                characterId: matchedChar?.id
              }
            })
          }))
          
          // Check if any dialogue needed characterId migration
          const needsDialogueMigration = scenesWithCharacterIds.some((scene: any, sceneIdx: number) => 
            scene.dialogue?.some((d: any, dIdx: number) => 
              d.characterId !== visionPhase.scenes[sceneIdx].dialogue?.[dIdx]?.characterId
            )
          )
          
          if (needsDialogueMigration) {
            try {
              await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  metadata: {
                    ...proj.metadata,
                    visionPhase: {
                      ...visionPhase,
                      scenes: scenesWithCharacterIds,
                      script: visionPhase.script ? {
                        ...visionPhase.script,
                        script: {
                          ...visionPhase.script.script,
                          scenes: scenesWithCharacterIds
                        }
                      } : undefined
                    }
                  }
                })
              })
            } catch (error) {
              console.warn('[Load Project] Failed to save dialogue characterId:', error)
            }
          }
          
          setScenes(scenesWithCharacterIds)
        }
        
        // Handle case where there are no characters but narrationVoice exists
        if (!visionPhase.characters && visionPhase.narrationVoice) {
          let correctedNarrationVoice = visionPhase.narrationVoice
          
          // FIX: Detect and correct provider mismatch for narration voice
          if (correctedNarrationVoice.provider === 'elevenlabs') {
            const isGoogleVoice = correctedNarrationVoice.voiceId?.includes('Studio') || 
                                  /^[a-z]{2}-[A-Z]{2}/.test(correctedNarrationVoice.voiceId)
            
            if (isGoogleVoice) {
              console.warn(`[Load Project] Fixing narration provider mismatch: ${correctedNarrationVoice.voiceId} is Google voice but marked as ElevenLabs`)
              correctedNarrationVoice = {
                ...correctedNarrationVoice,
                provider: 'google'
              }
              
              // Save the corrected narration voice back to database
              try {
                await fetch(`/api/projects/${projectId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    metadata: {
                      ...proj.metadata,
                      visionPhase: {
                        ...visionPhase,
                        narrationVoice: correctedNarrationVoice
                      }
                    }
                  })
                })
                // Narration voice config corrected and saved
              } catch (error) {
                console.warn('[Load Project] Failed to save narration voice config:', error)
              }
            }
          }
          
          setNarrationVoice(correctedNarrationVoice)
        }
        
        // Update generation progress to reflect saved state
        setGenerationProgress({
          script: { 
            complete: visionPhase.scriptGenerated || false, 
            progress: visionPhase.scriptGenerated ? 100 : 0,
            status: visionPhase.scriptGenerated ? 'Complete' : '',
            scenesGenerated: visionPhase.scriptGenerated ? (visionPhase.scenes?.length || 0) : 0,
            totalScenes: visionPhase.scenes?.length || 0,
            batch: 0
          },
          characters: { 
            complete: visionPhase.charactersGenerated || false, 
            progress: visionPhase.charactersGenerated ? 100 : 0,
            total: visionPhase.characters?.length || 0
          },
          scenes: { 
            complete: visionPhase.scenesGenerated || false, 
            progress: visionPhase.scenesGenerated ? 100 : 0,
            total: visionPhase.scenes?.length || 0
          }
        })
        
        // Check if generation is complete (skip if explicitly requested)
        if (!skipAutoGeneration && (!visionPhase.scriptGenerated || !visionPhase.charactersGenerated || !visionPhase.scenesGenerated)) {
          // Defer generation until after hydration to prevent hydration mismatch
          setTimeout(() => initiateGeneration(proj), 100)
        }
      } else {
        // No Vision data yet, start generation (skip if explicitly requested)
        if (!skipAutoGeneration) {
          // Defer generation until after hydration to prevent hydration mismatch
          setTimeout(() => initiateGeneration(proj), 100)
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error)
      console.error('Error type:', error instanceof TypeError ? 'TypeError' : error instanceof Error ? error.constructor.name : typeof error)
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      // Don't throw - just log and show user-friendly message
      try { const { toast } = require('sonner'); toast.error('Failed to reload project data') } catch {}
    }
  }

  const initiateGeneration = async (proj: Project) => {
    setIsGenerating(true)
    
    try {
      const visionPhase = proj.metadata?.visionPhase
      
      // ONLY generate script text (not images)
      if (!visionPhase?.scriptGenerated) {
        // Wrap with execute for blocking overlay
        await execute(
          async () => {
            await generateScript(proj)
          },
          { 
            message: 'Generating script... This may take 5-8 minutes for longer films.',
            estimatedDuration: 420  // 7 minutes conservative estimate (actual: 5-7 min for ~90 scenes)
          }
        )
        
        // Script data is now loaded via loadProject() in the complete handler
        // No need to set characters/scenes here as they're loaded from DB
      }
      
      // Mark progress complete (not generating images automatically)
      setGenerationProgress(prev => ({
        ...prev,
        characters: { complete: true, progress: 0, total: 0 },
        scenes: { complete: true, progress: 0, total: 0 }
      }))
    } catch (error) {
      console.error('[Vision] Generation error:', error)
      try { const { toast } = require('sonner'); toast.error('Generation failed: ' + (error as Error).message) } catch {}
    } finally {
      setIsGenerating(false)
    }
  }

  const generateScript = async (proj: Project): Promise<{ characters: any[], scenes: any[] } | null> => {
    try {
      console.log('[Vision] Generating script with progress tracking...')
      setGenerationProgress(prev => ({ 
        ...prev, 
        script: { complete: false, progress: 10, status: 'Starting...', scenesGenerated: 0, totalScenes: 0, batch: 0 }
      }))

      const response = await fetch('/api/vision/generate-script-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: proj.id }),
      })
      
      if (!response.ok) {
        throw new Error('Script generation failed')
      }
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response stream')
      }

      let scriptData: any = null

      // Read SSE stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'progress') {
                // Update progress based on scenes generated
                const progress = Math.min(90, 10 + (data.scenesGenerated / data.totalScenes) * 80)
                setGenerationProgress(prev => ({ 
                  ...prev, 
                  script: { 
                    complete: false, 
                    progress,
                    status: data.status,
                    scenesGenerated: data.scenesGenerated,
                    totalScenes: data.totalScenes,
                    batch: data.batch,
                    elapsedSeconds: data.elapsedSeconds || 0,
                    estimatedRemainingSeconds: data.estimatedRemainingSeconds || 0
                  }
                }))
                console.log(`[Vision] ${data.status} (${data.scenesGenerated}/${data.totalScenes})${data.estimatedRemainingSeconds ? ` ~${data.estimatedRemainingSeconds}s remaining` : ''}`)
              } else if (data.type === 'warning') {
                console.warn(`[Vision] Warning: ${data.message}`)
                try {
                  const { toast } = require('sonner')
                  toast.warning(data.message, { duration: 10000 })
                } catch {}
              } else if (data.type === 'complete') {
                // Don't use script data from SSE - reload from database instead
                console.log(`[Vision] Script generation complete: ${data.totalScenes} scenes`)
                
                // Show warning if partial generation
                if (data.partial) {
                  console.warn(`[Vision] Partial generation: ${data.totalScenes}/${data.expectedScenes} scenes`)
                  try {
                    const { toast } = require('sonner')
                    toast.warning(`Script generated with ${data.totalScenes} of ${data.expectedScenes} scenes. You can regenerate to get the remaining scenes.`, { duration: 12000 })
                  } catch {}
                } else {
                  try {
                    const { toast } = require('sonner')
                    toast.success(`Script generated with ${data.totalScenes} scenes!`)
                  } catch {}
                }
                
                setGenerationProgress(prev => ({ 
                  ...prev, 
                  script: { 
                    complete: true, 
                    progress: 100, 
                    status: data.partial ? 'Partial' : 'Complete',
                    scenesGenerated: data.totalScenes,
                    totalScenes: data.expectedScenes || data.totalScenes,
                    batch: 0
                  }
                }))
                
                // Reload project data from database with retry
                let retries = 3
                while (retries > 0) {
                  try {
                    await loadProject()
                    break
                  } catch (error) {
                    retries--
                    if (retries > 0) {
                      await new Promise(resolve => setTimeout(resolve, 1000))
                } else {
                  try { 
                    const { toast } = require('sonner')
                    toast.warning('Script generated but page reload failed. Please refresh manually.') 
                  } catch {}
                }
              }
            }
                
                // Return empty scriptData - not used anymore
                scriptData = { characters: [], scenes: [] }
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {
              console.error('[Vision] Parse error:', e)
            }
          }
        }
      }

      return scriptData
    } catch (error) {
      console.error('[Vision] Script error:', error)
      throw error
    }
  }

  const generateCharacters = async () => {
    if (characters.length === 0) {
      console.log('[Vision] No characters to generate images for, marking complete')
      setGenerationProgress(prev => ({
        ...prev,
        characters: { complete: true, progress: 0, total: 0 }
      }))
      return
    }
    
    try {
      console.log(`[Vision] Generating ${characters.length} character reference images...`)
      const userId = getUserId()
      
      const res = await fetch('/api/vision/generate-characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          characters,
          userId
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('[Vision] Character API error:', res.status, errorData)
        throw new Error(errorData.error || 'Character generation failed')
      }
      
      const data = await res.json()
      console.log(`[Vision] Generated ${data.characters?.length || 0} character images`)
      setCharacters(data.characters)
      
      setGenerationProgress(prev => ({ 
        ...prev, 
        characters: { complete: true, progress: data.characters.length, total: data.characters.length }
      }))
    } catch (error) {
      console.error('[Vision] Character generation error:', error)
      try { const { toast } = require('sonner'); toast.error('Character generation failed') } catch {}
      throw error
    }
  }

  const generateScenes = async () => {
    if (scenes.length === 0) {
      console.log('[Vision] No scenes to generate images for, marking complete')
      setGenerationProgress(prev => ({
        ...prev,
        scenes: { complete: true, progress: 0, total: 0 }
      }))
      return
    }
    
    try {
      console.log(`[Vision] Generating ${scenes.length} scene images...`)
      const userId = getUserId()
      
      const res = await fetch('/api/vision/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          scenes,
          characters,
          userId
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('[Vision] Scene API error:', res.status, errorData)
        throw new Error(errorData.error || 'Scene generation failed')
      }
      
      const data = await res.json()
      console.log(`[Vision] Generated ${data.scenes?.length || 0} scene images`)
      setScenes(data.scenes)
      
      setGenerationProgress(prev => ({ 
        ...prev, 
        scenes: { complete: true, progress: data.scenes.length, total: data.scenes.length }
      }))
    } catch (error) {
      console.error('[Vision] Scene generation error:', error)
      try { const { toast } = require('sonner'); toast.error('Scene generation failed') } catch {}
      throw error
    }
  }

  const expandScene = async (sceneNumber: number) => {
    try {
      console.log(`[Vision] Expanding scene ${sceneNumber}...`)
      
      const res = await fetch('/api/vision/expand-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sceneNumber })
      })
      
      if (!res.ok) {
        throw new Error('Failed to expand scene')
      }
      
      const data = await res.json()
      
      if (data.success) {
        // Update the specific scene in the scenes array
        setScenes(prevScenes => 
          prevScenes.map(s => 
            s.sceneNumber === sceneNumber ? data.scene : s
          )
        )
        
        // Also update in script object
        setScript((prevScript: any) => ({
          ...prevScript,
          script: {
            ...prevScript.script,
            scenes: prevScript.script.scenes.map((s: any) => 
              s.sceneNumber === sceneNumber ? data.scene : s
            )
          }
        }))
        
        try { const { toast } = require('sonner'); toast.success(`Scene ${sceneNumber} expanded!`) } catch {}
      }
    } catch (error) {
      console.error(`[Vision] Failed to expand scene ${sceneNumber}:`, error)
      try { const { toast } = require('sonner'); toast.error('Failed to expand scene') } catch {}
    }
  }

  const expandAllScenes = async () => {
    try {
      console.log('[Vision] Expanding all scenes...')
      const allScenes = script?.script?.scenes || []
      const unexpandedScenes = allScenes.filter((s: any) => !s.isExpanded)
      
      if (unexpandedScenes.length === 0) {
        try { const { toast } = require('sonner'); toast.info('All scenes already expanded') } catch {}
        return
      }
      
      setIsGenerating(true)
      
      // Expand scenes sequentially to avoid overwhelming the API
      for (const scene of unexpandedScenes) {
        await expandScene(scene.sceneNumber)
        // Small delay between expansions
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      try { const { toast } = require('sonner'); toast.success(`Expanded ${unexpandedScenes.length} scenes!`) } catch {}
    } catch (error) {
      console.error('[Vision] Failed to expand all scenes:', error)
      try { const { toast } = require('sonner'); toast.error('Failed to expand all scenes') } catch {}
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateCharacter = async (characterId: string) => {
    // Implement character regeneration
    console.log('Regenerate character:', characterId)
  }

  const handleUploadCharacter = async (characterId: string, file: File) => {
    try {
      setUploadingRef(prev => ({ ...prev, [characterId]: true }))
      
      const character = characters.find(c => {
        const charId = c.id || characters.indexOf(c).toString()
        return charId === characterId
      })
      
      // Step 1: Upload directly to Vercel Blob (client-side)
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/character/upload-url',
      })
      
      const blobUrl = newBlob.url
      
      // Step 2: Process upload and analyze with Gemini Vision
      const processRes = await fetch('/api/character/process-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobUrl,
          characterName: character?.name || 'character',
        }),
      })
      
      if (!processRes.ok) {
        throw new Error('Processing failed')
      }
      
      const { visionDescription } = await processRes.json()
      
      // Use visionDescription from process-upload (already includes AI analysis)
      const analysisData = visionDescription ? {
        success: true,
        appearanceDescription: visionDescription,
        // Parse individual attributes if needed in future
      } : null
      
      // Update character with the Blob URL and analysis results
        const updatedCharacters = characters.map(char => {
          const charId = char.id || characters.indexOf(char).toString()
          return charId === characterId 
          ? { 
              ...char, 
              referenceImage: blobUrl,  // Vercel Blob URL for both UI display and Imagen API
              imageApproved: false,
              // Add appearance description and attributes if analysis succeeded
              ...(analysisData?.success ? {
                appearanceDescription: analysisData.appearanceDescription,
                ethnicity: analysisData.ethnicity || char.ethnicity,
                hairStyle: analysisData.hairStyle || char.hairStyle,
                hairColor: analysisData.hairColor || char.hairColor,
                eyeColor: analysisData.eyeColor || char.eyeColor,
                expression: analysisData.expression || char.expression,
                build: analysisData.build || char.build,
                keyFeature: analysisData.keyFeature || char.keyFeature
              } : {})
            }
            : char
        })
        
        setCharacters(updatedCharacters)
        
        // Persist to project metadata
        try {
          const existingMetadata = project?.metadata || {}
          const existingVisionPhase = existingMetadata.visionPhase || {}
          
          console.log('[Character Upload] Saving to project:', projectId)
          console.log('[Character Upload] Updated characters:', updatedCharacters.map(c => ({ 
            name: c.name, 
            hasRefImage: !!c.referenceImage,
            refImageUrl: c.referenceImage?.substring(0, 50)
          })))
          
          const saveResponse = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metadata: {
                ...existingMetadata,
                visionPhase: {
                  ...existingVisionPhase,
                  script: script,
                  scenes: scenes,
                  characters: updatedCharacters
                }
              }
            })
          })
          
          if (!saveResponse.ok) {
            const errorText = await saveResponse.text()
            console.error('[Character Upload] Save failed:', saveResponse.status, errorText)
            throw new Error(`Failed to save: ${saveResponse.status}`)
          }
          
          console.log('[Character Upload] Save successful, reloading project...')
        
        // Reload project to ensure fresh character data is available for scene generation
        await loadProject()
        console.log('[Character Upload] Project reloaded successfully')
        } catch (saveError) {
          console.error('Failed to save uploaded character to project:', saveError)
          try { const { toast } = require('sonner'); toast.error('Failed to save character image') } catch {}
        }
        
      setUploadingRef(prev => ({ ...prev, [characterId]: false }))
      
      const successMessage = analysisData?.success 
        ? 'Character image uploaded and analyzed!'
        : 'Character image uploaded!'
      try { const { toast } = require('sonner'); toast.success(successMessage) } catch {}
    } catch (error) {
      console.error('Character image upload failed:', error)
      setUploadingRef(prev => ({ ...prev, [characterId]: false }))
      try { const { toast } = require('sonner'); toast.error('Failed to upload image') } catch {}
    }
  }

  const handleApproveCharacter = async (characterId: string) => {
    try {
      const updatedCharacters = characters.map(char => {
        const charId = char.id || characters.indexOf(char).toString()
        return charId === characterId 
          ? { ...char, imageApproved: !char.imageApproved } 
          : char
      })
      
      setCharacters(updatedCharacters)
      
      // Persist to project metadata
      try {
        const existingMetadata = project?.metadata || {}
        const existingVisionPhase = existingMetadata.visionPhase || {}
        
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...existingMetadata,
              visionPhase: {
                ...existingVisionPhase,
                script: script,
                scenes: scenes,
                characters: updatedCharacters
              }
            }
          })
        })
        
        const char = updatedCharacters.find(c => (c.id || characters.indexOf(c).toString()) === characterId)
        const msg = char?.imageApproved ? 'Character image approved!' : 'Character image unlocked for editing'
        try { toast.success(msg) } catch {}
      } catch (saveError) {
        console.error('Failed to save character approval to project:', saveError)
      }
    } catch (error) {
      console.error('Character approval failed:', error)
      try { const { toast } = require('sonner'); toast.error('Failed to update approval status') } catch {}
    }
  }

  const handleGenerateCharacter = async (characterId: string, promptOrPayload: any) => {
    const isObjectPayload = promptOrPayload && typeof promptOrPayload === 'object'
    const prompt: string = isObjectPayload ? (promptOrPayload.characterPrompt || '') : (promptOrPayload || '')
    if (!prompt?.trim()) return
    
    try {
      const res = await fetch('/api/character/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          // Use builder selections if provided; remove hard-coded defaults
          artStyle: isObjectPayload ? promptOrPayload.artStyle : undefined,
          shotType: isObjectPayload ? promptOrPayload.shotType : undefined,
          cameraAngle: isObjectPayload ? promptOrPayload.cameraAngle : undefined,
          lighting: isObjectPayload ? promptOrPayload.lighting : undefined,
          additionalDetails: isObjectPayload ? promptOrPayload.additionalDetails : undefined,
          quality: imageQuality
        })
      })
      
      const json = await res.json()
      
      if (json?.imageUrl) {
        // Update character with generated image and prompt
        const updatedCharacters = characters.map(char => {
          const charId = char.id || characters.indexOf(char).toString()
          return charId === characterId 
            ? { ...char, referenceImage: json.imageUrl, imagePrompt: prompt } 
            : char
        })
        
        setCharacters(updatedCharacters)
        
        // Persist to project metadata
        try {
          console.log('[Character Save] Saving character image to project:', {
            projectId,
            characterId,
            characterName: updatedCharacters.find(c => (c.id || characters.indexOf(c).toString()) === characterId)?.name,
            hasImageUrl: !!json.imageUrl,
            imageUrl: json.imageUrl?.substring(0, 50)
          })
          
          const existingMetadata = project?.metadata || {}
          const existingVisionPhase = existingMetadata.visionPhase || {}
          
          const saveResponse = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metadata: {
                ...existingMetadata,
                visionPhase: {
                  ...existingVisionPhase,
                  script: script,
                  scenes: scenes,
                  characters: updatedCharacters
                }
              }
            })
          })
          
          if (!saveResponse.ok) {
            const errorText = await saveResponse.text()
            console.error('[Character Save] Failed to save:', saveResponse.status, errorText)
            throw new Error(`Save failed: ${saveResponse.status}`)
          }
          
          console.log('[Character Save] Successfully saved character image to database')
        } catch (saveError) {
          console.error('[Character Save] Failed to save character to project:', saveError)
          try { toast.error('Character image generated but failed to save to project') } catch {}
        }
        
        try { toast.success('Character image generated!') } catch {}
      } else {
        const errorMsg = json?.error || 'Failed to generate image'
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('Character image generation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate character image'
      try { toast.error(errorMessage, { duration: Infinity }) } catch {}
    }
  }

  const handleGenerateScene = async (sceneIndex: number, prompt: string) => {
    if (!prompt?.trim()) return
    if (!script?.script?.scenes) return
    
    try {
      const scriptScenes = script.script.scenes
      const scene = scriptScenes[sceneIndex]
      const sceneContext = {
        visualStyle: project?.metadata?.filmTreatmentVariant?.visual_style || project?.metadata?.filmTreatmentVariant?.style,
        tone: project?.metadata?.filmTreatmentVariant?.tone_description || project?.metadata?.filmTreatmentVariant?.tone
      }
      
      const res = await fetch('/api/scene/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          scenePrompt: prompt
        })
      })
      
      const json = await res.json()
      
      if (json?.imageUrl) {
        // Update scene with generated image and prompt
        const updatedScenes = scriptScenes.map((s: any, idx: number) => 
          idx === sceneIndex 
            ? { ...s, imageUrl: json.imageUrl, imagePrompt: prompt } 
            : s
        )
        
        // Update script state (which is the source of truth)
        setScript((prev: any) => ({
          ...prev,
          script: {
            ...prev?.script,
            scenes: updatedScenes
          }
        }))
        
        // Persist to project metadata
        try {
          const existingMetadata = project?.metadata || {}
          const existingVisionPhase = existingMetadata.visionPhase || {}
          
          await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metadata: {
                ...existingMetadata,
                visionPhase: {
                  ...existingVisionPhase,
                  script: {
                    ...script,
                    script: {
                      ...script.script,
                      scenes: updatedScenes
                    }
                  },
                  characters: characters,
                  narrationVoice: narrationVoice,
                  descriptionVoice: descriptionVoice
                }
              }
            })
          })
        } catch (saveError) {
          console.error('Failed to save scene to project:', saveError)
        }
        
        try { const { toast } = require('sonner'); toast.success('Scene image generated!') } catch {}
      } else {
        const errorMsg = json?.error || 'Failed to generate image'
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('Scene image generation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate scene image'
      try { const { toast } = require('sonner'); toast.error(errorMessage, { duration: Infinity }) } catch {}
    }
  }

  const handleUploadScene = async (sceneIndex: number, file: File) => {
    if (!script?.script?.scenes) return
    
    try {
      const scriptScenes = script.script.scenes
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        
        const updatedScenes = scriptScenes.map((s: any, idx: number) => 
          idx === sceneIndex 
            ? { ...s, imageUrl: dataUrl } 
            : s
        )
        
        // Update script state (which is the source of truth)
        setScript((prev: any) => ({
          ...prev,
          script: {
            ...prev?.script,
            scenes: updatedScenes
          }
        }))
        
        // Persist to project metadata
        try {
          const existingMetadata = project?.metadata || {}
          const existingVisionPhase = existingMetadata.visionPhase || {}
          
          await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metadata: {
                ...existingMetadata,
                visionPhase: {
                  ...existingVisionPhase,
                  script: {
                    ...script,
                    script: {
                      ...script.script,
                      scenes: updatedScenes
                    }
                  },
                  characters: characters
                }
              }
            })
          })
        } catch (saveError) {
          console.error('Failed to save uploaded scene to project:', saveError)
        }
        
        try { const { toast } = require('sonner'); toast.success('Scene image uploaded!') } catch {}
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Scene image upload failed:', error)
      try { const { toast } = require('sonner'); toast.error('Failed to upload image') } catch {}
    }
  }

  const handleUpdateCharacterAttributes = async (characterId: string, attributes: any) => {
    try {
      console.log('[Vision] Updating character attributes:', characterId, attributes)
      
      // Find character name from characterId
      const char = characters.find((c, i) => (c.id || i.toString()) === characterId)
      const characterName = char?.name || attributes.name
      
      if (!characterName) {
        throw new Error('Character name not found')
      }
      
      // Update local state
      setCharacters(prevChars => 
        prevChars.map(char => {
          const id = char.id || characters.indexOf(char).toString()
          if (id === characterId) {
            return {
              ...char,
              ...attributes,
              // Preserve existing fields
              name: char.name,
              role: char.role || attributes.role,
              description: char.description,
              referenceImage: char.referenceImage
            }
          }
          return char
        })
      )
      
      // Save to database with correct format
      const res = await fetch('/api/character/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          characterName,  // ← Separate parameter
          attributes: {
            ...attributes,
            // Remove name from attributes (it's a separate param)
            name: undefined
          }
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save character attributes')
      }
      
      console.log('[Vision] Character attributes saved successfully')
      
      // Show success toast
      try {
        const { toast } = require('sonner')
        toast.success('Character attributes saved!')
      } catch {}
    } catch (error) {
      console.error('[Vision] Error updating character:', error)
      try {
        const { toast } = require('sonner')
        toast.error('Failed to save character attributes')
      } catch {}
    }
  }

  const handleAddCharacter = async (characterData: any) => {
    try {
      console.log('[Vision] Adding character:', characterData)
      
      // Ensure character has an ID
      const characterWithId = {
        ...characterData,
        id: characterData.id || uuidv4()
      }
      
      const response = await fetch('/api/vision/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          character: characterWithId
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add character')
      }
      
      const { toast } = require('sonner')
      toast.success('Character added successfully!')
      
      // Reload project to get updated characters
      await loadProject()
      
      console.log('[Vision] Character added and project reloaded')
    } catch (error: any) {
      console.error('[Vision] Error adding character:', error)
      try {
        const { toast } = require('sonner')
        toast.error(error.message || 'Failed to add character')
      } catch {}
    }
  }

    const handleRemoveCharacter = async (characterName: string) => {
    try {
      console.log('[Vision] Removing character:', characterName)
      
      // Find the character by name to get its ID
      const characterToDelete = characters.find(c => 
        toCanonicalName(c.name) === toCanonicalName(characterName) || c.name === characterName
      )
      
      if (!characterToDelete) {
        try { 
          const { toast } = require('sonner')
          toast.error('Character not found')
        } catch {}
        return
      }
      
      // Check for dialogue references
      const affectedScenes = script?.script?.scenes?.filter((scene: any) => 
        scene.dialogue?.some((d: any) => d.characterId === characterToDelete.id)
      ) || []
      
      const dialogueCount = affectedScenes.reduce((count: number, scene: any) => 
        count + (scene.dialogue?.filter((d: any) => d.characterId === characterToDelete.id).length || 0), 0
      )
      
      if (dialogueCount > 0) {
        // Show warning dialog with options
        setDeletionCharacter({ id: characterToDelete.id, name: characterToDelete.name })
        setAffectedDialogueCount(dialogueCount)
        setDeletionAction(null)
        setReassignmentCharacterId('')
        setDeletionDialogOpen(true)
        return
      }
      
      // No dialogue references - proceed with deletion directly
      await performCharacterDeletion(characterToDelete.id, null, null)
    } catch (error) {
      console.error('[Vision] Error removing character:', error)
      try {
        const { toast } = require('sonner')
        toast.error('Failed to remove character')
      } catch {}
    }
  }
  
  // Helper function to actually perform the character deletion
  const performCharacterDeletion = async (
    characterId: string, 
    action: 'clear' | 'reassign' | null,
    reassignmentCharId: string | null
  ) => {
    try {
      const characterToDelete = characters.find(c => c.id === characterId)
      if (!characterToDelete) return
      
      // If reassigning, update dialogue references first
      if (action === 'reassign' && reassignmentCharId) {
        const replacementChar = characters.find(c => c.id === reassignmentCharId)
        if (!replacementChar) {
          try { 
            const { toast } = require('sonner')
            toast.error('Replacement character not found')
          } catch {}
          return
        }
        
        // Update all dialogue references
        const updatedScenes = script.script.scenes.map((scene: any) => ({
          ...scene,
          dialogue: scene.dialogue?.map((d: any) => 
            d.characterId === characterId 
              ? { ...d, characterId: reassignmentCharId, character: replacementChar.name }
              : d
          )
        }))
        
        // Save updated scenes
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...project?.metadata,
              visionPhase: {
                ...project?.metadata?.visionPhase,
                scenes: updatedScenes,
                script: { ...script.script, scenes: updatedScenes }
              }
            }
          })
        })
          
          // Update local state
          setScript((prev: any) => ({
            ...prev,
            script: { ...prev.script, scenes: updatedScenes }
          }))
      } else if (action === 'clear') {
        // Clear characterId from affected dialogue lines
        const updatedScenes = script.script.scenes.map((scene: any) => ({
          ...scene,
          dialogue: scene.dialogue?.map((d: any) => 
            d.characterId === characterId 
              ? { ...d, characterId: undefined }
              : d
          )
        }))
        
        // Save updated scenes
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...project?.metadata,
              visionPhase: {
                ...project?.metadata?.visionPhase,
                scenes: updatedScenes,
                script: { ...script.script, scenes: updatedScenes }
              }
            }
          })
        })
          
          // Update local state
          setScript((prev: any) => ({
            ...prev,
            script: { ...prev.script, scenes: updatedScenes }
          }))
      }
      
      // Now delete the character
      const response = await fetch(`/api/vision/characters?projectId=${projectId}&characterName=${encodeURIComponent(characterToDelete.name)}`, {                        
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove character')
      }
      
      // Reload project to get updated characters
      await loadProject(true) // Skip auto-generation
      
      // Close dialog
      setDeletionDialogOpen(false)
      setDeletionCharacter(null)
      setAffectedDialogueCount(0)
      setDeletionAction(null)
      setReassignmentCharacterId('')
      
      try {
        const { toast } = require('sonner')
        toast.success(`Character removed successfully${action === 'reassign' ? ' and dialogue reassigned' : action === 'clear' ? ' - dialogue will match by name' : ''}!`)
      } catch {}
    } catch (error) {
      console.error('[Vision] Error performing character deletion:', error)
      try {
        const { toast } = require('sonner')
        toast.error('Failed to remove character')
      } catch {}
    }
  }
  
  // Handler for deletion dialog actions
  const handleDeletionDialogAction = async () => {
    if (!deletionCharacter) return
    
    if (deletionAction === null) {
      // User hasn't selected an action yet
      try { 
        const { toast } = require('sonner')
        toast.error('Please select an option')
      } catch {}
      return
    }
    
    if (deletionAction === 'reassign' && !reassignmentCharacterId) {
      try { 
        const { toast } = require('sonner')
        toast.error('Please select a character to reassign dialogue to')
      } catch {}
      return
    }
    
    await performCharacterDeletion(
      deletionCharacter.id,
      deletionAction,
      deletionAction === 'reassign' ? reassignmentCharacterId : null
    )
  }
  
  // Helper function to find potential duplicate characters
  const findPotentialDuplicates = (characters: any[]): any[][] => {
    const groups = new Map<string, any[]>()
    
    characters.forEach(char => {
      // Skip narrator characters
      if (char.type === 'narrator') return
      
      const canonical = toCanonicalName(char.name)
      if (!groups.has(canonical)) {
        groups.set(canonical, [])
      }
      groups.get(canonical)!.push(char)
    })
    
    // Return groups with 2+ characters (potential duplicates)
    return Array.from(groups.values()).filter(group => group.length > 1)
  }
  
  // Handler to merge duplicate characters
  const handleMergeCharacters = async (primaryCharId: string, duplicateCharIds: string[]) => {
    try {
      const primaryChar = characters.find(c => c.id === primaryCharId)
      if (!primaryChar) {
        try { 
          const { toast } = require('sonner')
          toast.error('Primary character not found')
        } catch {}
        return
      }
      
      // Update all dialogue references from duplicates to primary
      const updatedScenes = script?.script?.scenes?.map((scene: any) => ({
        ...scene,
        dialogue: scene.dialogue?.map((d: any) => 
          duplicateCharIds.includes(d.characterId)
            ? { ...d, characterId: primaryCharId, character: primaryChar.name }
            : d
        )
      })) || []
      
      // Remove duplicate characters
      const updatedCharacters = characters.filter(c => 
        !duplicateCharIds.includes(c.id)
      )
      
      // Save to project
      await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...project?.metadata,
            visionPhase: {
              ...project?.metadata?.visionPhase,
              characters: updatedCharacters,
              scenes: updatedScenes,
              script: { ...script.script, scenes: updatedScenes }
            }
          }
        })
      })
        
      // Update local state
      setCharacters(updatedCharacters)
      setScript((prev: any) => ({
        ...prev,
        script: { ...prev.script, scenes: updatedScenes }
      }))
      
      // Close merge dialog
      setMergeDialogOpen(false)
      setMergePrimaryCharId('')
      setMergeDuplicateCharIds([])
      
      try {
        const { toast } = require('sonner')
        toast.success(`Merged ${duplicateCharIds.length} duplicate(s) into ${primaryChar.name}`)
      } catch {}
    } catch (error) {
      console.error('[Vision] Error merging characters:', error)
      try {
        const { toast } = require('sonner')
        toast.error('Failed to merge characters')
      } catch {}
    }
  }

  const handleRegenerateScene = async (sceneIndex: number) => {
    // Implement scene regeneration
    console.log('Regenerate scene:', sceneIndex)
  }

  const handleGenerateSceneImage = async (sceneIdx: number, selectedCharacters?: any[] | any) => {
    console.log('[handleGenerateSceneImage] Called with sceneIdx:', sceneIdx)
    console.log('[handleGenerateSceneImage] selectedCharacters:', selectedCharacters)
    
    const scene = script?.script?.scenes?.[sceneIdx]
    console.log('[handleGenerateSceneImage] Scene found:', !!scene)
    console.log('[handleGenerateSceneImage] Scene fields:', scene ? {
      hasVisualDescription: !!scene.visualDescription,
      hasAction: !!scene.action,
      hasSummary: !!scene.summary,
      hasHeading: !!scene.heading
    } : 'no scene')
    
    // Accept any scene description field: visualDescription, action, summary, or heading
    const sceneDescription = scene?.visualDescription || scene?.action || scene?.summary || scene?.heading
    if (!scene || !sceneDescription) {
      console.warn('[handleGenerateSceneImage] No visual description available for scene', sceneIdx)
      try { const { toast } = require('sonner'); toast.error('Scene must have a description to generate image') } catch {}
      return
    }
    
    console.log('[handleGenerateSceneImage] Scene description found, proceeding with generation...')
    
    // Set global keyframe generation state for screen freeze
    setIsGeneratingKeyframe(true)
    setGeneratingKeyframeSceneNumber(sceneIdx + 1)
    
    try {
      // Check if we received prompt data object (from Scene Prompt Builder)
      let sceneCharacters: any[] = []
      let promptData: any = {}
      
      if (selectedCharacters && typeof selectedCharacters === 'object') {
        // Check if it's a prompt data object from Scene Prompt Builder
        if (selectedCharacters.characters && Array.isArray(selectedCharacters.characters)) {
          promptData = selectedCharacters  // Contains customPrompt, artStyle, shotType, etc.
          sceneCharacters = selectedCharacters.characters
        } else if (Array.isArray(selectedCharacters)) {
          // Legacy: Just character array
          sceneCharacters = selectedCharacters
        } else {
          // Single character object
          sceneCharacters = [selectedCharacters]
        }
      } else {
        // Auto-detect characters from scene using smart matching
        // Use smart matching to find characters in scene
        const sceneText = [
          scene.heading || '',
          scene.action || '',
          scene.visualDescription || '',
          ...(scene.dialogue || []).map((d: any) => d.character || '')
        ].join(' ')
        
        sceneCharacters = findSceneCharacters(sceneText, characters)
      }
      
      // DEBUG: Log character referenceImage status before sending to API
      console.log('[generateSceneImage] Characters state referenceImage status:', 
        characters.map(c => ({ name: c.name, hasReferenceImage: !!c.referenceImage })))
      console.log('[generateSceneImage] Scene characters being sent:', 
        sceneCharacters.map((c: any) => ({ 
          name: c.name, 
          hasReferenceImage: !!c.referenceImage,
          referenceImageUrl: c.referenceImage ? c.referenceImage.substring(0, 50) + '...' : 'none' 
        })))
      
      // Log object references if provided
      if (promptData.objectReferences?.length > 0) {
        console.log('[generateSceneImage] Object references being sent:', 
          promptData.objectReferences.map((o: any) => ({ 
            name: o.name, 
            hasImage: !!o.imageUrl,
            importance: o.importance 
          })))
      }
      
      console.log('[handleGenerateSceneImage] Making API call to /api/scene/generate-image...')
      const requestBody = { 
        projectId: projectId,
        sceneIndex: sceneIdx,
        // Use scenePrompt from prompt builder if provided, otherwise use scene description
        scenePrompt: promptData.scenePrompt || scene.visualDescription || scene.action || scene.heading,
        // Legacy support: customPrompt (if provided, will be used by API)
        customPrompt: promptData.customPrompt,
        artStyle: promptData.artStyle,
        shotType: promptData.shotType,
        cameraAngle: promptData.cameraAngle,
        lighting: promptData.lighting,
        // Reference library data
        sceneReferences: promptData.sceneReferences,
        objectReferences: promptData.objectReferences,
        characters: sceneCharacters,  // Characters array
        quality: imageQuality
      }
      console.log('[handleGenerateSceneImage] Request body:', JSON.stringify(requestBody).substring(0, 500))
      
      const response = await fetch('/api/scene/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      console.log('[handleGenerateSceneImage] Response status:', response.status)
      const data = await response.json()
      console.log('[handleGenerateSceneImage] Response data:', JSON.stringify(data).substring(0, 500))
      
      if (!response.ok) {
        const errorMsg = data?.error || 'Image generation failed'
        throw new Error(errorMsg)
      }
      
      // Handle validation info based on response
      if (data.validationPassed === false && data.validationWarning) {
        // Validation failed - show warning
        setValidationInfo(prev => ({
          ...prev,
          [sceneIdx]: {
            passed: false,
            confidence: data.validationConfidence,
            warning: data.validationWarning,
            dismissed: false
          }
        }))
        
        // Also set legacy warning for backward compatibility
        setValidationWarnings(prev => ({
          ...prev,
          [sceneIdx]: data.validationWarning
        }))
      } else if (data.validationPassed === true) {
        // Validation passed - clear any existing warning and set success info
        setValidationInfo(prev => ({
          ...prev,
          [sceneIdx]: {
            passed: true,
            confidence: data.validationConfidence,
            message: data.validationMessage,
            dismissed: false
          }
        }))
        
        // Clear legacy warning
        setValidationWarnings(prev => {
          const newWarnings = { ...prev }
          delete newWarnings[sceneIdx]
          return newWarnings
        })
      }
      
      // Update scene with image and workflow sync hashes
      const updatedScenes = [...(script.script.scenes || [])]
      updatedScenes[sceneIdx] = {
        ...updatedScenes[sceneIdx],
        imageUrl: data.imageUrl,
        imagePrompt: prompt,
        // Track which direction and references this image was based on (for workflow sync)
        basedOnDirectionHash: data.basedOnDirectionHash,
        basedOnReferencesHash: data.basedOnReferencesHash
      }
      
      // Update local state
      setScript({
        ...script,
        script: {
          ...script.script,
          scenes: updatedScenes
        }
      })
      
      // Persist to database
      // CRITICAL: Use current `characters` state instead of stale project.metadata.visionPhase.characters
      // This prevents wardrobe updates from being overwritten by stale project metadata
      const { characters: _staleCharacters, ...visionPhaseWithoutCharacters } = project?.metadata?.visionPhase || {}
      await fetch(`/api/projects/${project?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...project?.metadata,
            visionPhase: {
              ...visionPhaseWithoutCharacters,
              characters: characters, // Use current state, not stale project.metadata
              script: {
                ...script,
                script: {
                  ...script.script,
                  scenes: updatedScenes
                }
              }
            }
          }
        })
      })
      
      try { const { toast } = require('sonner'); toast.success('Scene image generated!') } catch {}
    } catch (error) {
      console.error('Failed to generate scene image:', error)
      
      // Check for quota error
      if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        try { 
          const { toast } = require('sonner')
          toast.error(
            <div className="space-y-2">
              <div className="font-semibold">Image Generation Quota Exceeded</div>
              <div className="text-sm">
                Google Cloud has rate limits on image generation. Please:
              </div>
              <ul className="text-sm list-disc pl-4 space-y-1">
                <li>Wait 30-60 seconds before trying again</li>
                <li>Generate one scene at a time</li>
                <li>Consider using Auto quality for faster generation</li>
              </ul>
              <button 
                onClick={() => handleGenerateSceneImage(sceneIdx)}
                className="mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
              >
                Retry Generation
              </button>
            </div>,
            { duration: 10000, position: 'top-center' }
          )
        } catch {}
      } else {
        try { const { toast } = require('sonner'); toast.error(`Failed to generate scene image: ${error.message}`, { duration: Infinity }) } catch {}
      }
    } finally {
      // Clear global keyframe generation state
      setIsGeneratingKeyframe(false)
      setGeneratingKeyframeSceneNumber(null)
    }
  }

  // Handle manual save project - forces save of all current state to database
  const handleSaveProject = async () => {
    if (!project || !script) {
      try { const { toast } = require('sonner'); toast.error('No project data to save') } catch {}
      return
    }

    setIsSaving(true)
    try {
      const currentScenes = script?.script?.scenes || []
      
      console.log('[SaveProject] Saving project with scenes:', currentScenes.map((s: any, idx: number) => ({
        idx,
        hasImage: !!s.imageUrl,
        hasNarration: !!s.narrationAudioUrl,
        hasSceneDirection: !!s.sceneDirection,
        sceneDirectionKeys: s.sceneDirection ? Object.keys(s.sceneDirection) : []
      })))

      const payload = {
        metadata: {
          ...project.metadata,
          visionPhase: {
            ...project.metadata?.visionPhase,
            script: script,
            characters: characters,
            scenes: currentScenes
          }
        }
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[SaveProject] Failed:', errorText)
        throw new Error(`Save failed: ${response.status}`)
      }

      console.log('[SaveProject] Successfully saved project')
      try { const { toast } = require('sonner'); toast.success('Project saved successfully!') } catch {}
    } catch (error: any) {
      console.error('[SaveProject] Error:', error)
      try { const { toast } = require('sonner'); toast.error(`Failed to save project: ${error.message}`) } catch {}
    } finally {
      setIsSaving(false)
    }
  }

  // Handle generate scene direction
  const handleGenerateSceneDirection = async (sceneIdx: number) => {
    const scene = script?.script?.scenes?.[sceneIdx]
    if (!scene) {
      console.warn('No scene data available for scene', sceneIdx)
      try { const { toast } = require('sonner'); toast.error('Scene data not found') } catch {}
      return
    }

    setGeneratingDirectionFor(sceneIdx)

    // Use the overlay to prevent navigation during generation
    await execute(
      async () => {
        try {
          const directionResponse = await fetch('/api/scene/generate-direction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            sceneIndex: sceneIdx,
            scene: {
              heading: scene.heading,
              action: scene.action,
              visualDescription: scene.visualDescription,
              narration: scene.narration,
              dialogue: scene.dialogue,
              characters: scene.characters  // Include character list for accurate talent blocking
            }
          })
        })

        if (!directionResponse.ok) {
          const errorData = await directionResponse.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || 'Failed to generate scene direction')
        }

        const data = await directionResponse.json()
        
        if (!data.success || !data.sceneDirection) {
          throw new Error(data.error || 'Failed to generate scene direction')
        }

        // Build updated scenes array with the new direction
        const updatedScenes = [...(script.script.scenes || [])]
        updatedScenes[sceneIdx] = {
          ...updatedScenes[sceneIdx],
          sceneDirection: data.sceneDirection
        }

        // Build the updated script object
        const updatedScript = {
        ...script,
        script: {
          ...script.script,
          scenes: updatedScenes
        }
      }

      // Update local state
      setScript(updatedScript)

      // Update project metadata and persist to DB
      if (project) {
        const updatedMetadata = {
          ...project.metadata,
          visionPhase: {
            ...project.metadata?.visionPhase,
            script: updatedScript
          }
        }
        
        console.log('[SceneDirection] Saving to DB:', {
          sceneIdx,
          hasSceneDirection: !!updatedScenes[sceneIdx]?.sceneDirection,
          sceneDirectionKeys: Object.keys(updatedScenes[sceneIdx]?.sceneDirection || {}),
          updatedMetadataPath: 'metadata.visionPhase.script.script.scenes[' + sceneIdx + '].sceneDirection'
        })
        
        setProject({
          ...project,
          metadata: updatedMetadata
        })

        // Persist to database
        const saveResponse = await fetch(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: updatedMetadata
          })
        })
        
        if (!saveResponse.ok) {
          const errorText = await saveResponse.text()
          console.error('[SceneDirection] Save failed:', errorText)
          throw new Error('Failed to save scene direction to database')
        } else {
          console.log('[SceneDirection] Save successful')
        }
      }

      try { const { toast } = require('sonner'); toast.success('Scene direction generated!') } catch {}
      } catch (error: any) {
        console.error('Failed to generate scene direction:', error)
        try { const { toast } = require('sonner'); toast.error(`Failed to generate scene direction: ${error.message}`) } catch {}
        throw error // Re-throw to let overlay know it failed
      }
    }, {
      message: `🎬 Generating Scene Direction for Scene ${sceneIdx + 1}... Please wait, do not navigate away.`,
      estimatedDuration: 30 // 30 seconds estimated (in seconds, not ms)
    }).finally(() => {
      setGeneratingDirectionFor(null)
    })
  }

  // Handle generate all audio
  const handleGenerateAllAudio = async () => {
    if (!narrationVoice) {
      try { const { toast } = require('sonner'); toast.error('Please select a narration voice first') } catch {}                                                
      return
    }

    // Check if all characters have voices (exclude narrator)
    const charactersWithoutVoice = characters.filter(c => c.type !== 'narrator' && !c.voiceConfig)
    if (charactersWithoutVoice.length > 0) {
      console.warn('[Generate All Audio] Characters without voices:', charactersWithoutVoice.map(c => c.name))                                                  
      try { 
        const { toast } = require('sonner')
        const charNames = charactersWithoutVoice.map(c => c.name).join(', ')
        toast.error(`🎤 Voice Assignment Required\n\n${charNames}\n\nPlease assign voices to all characters before generating audio. Click on each character card to select a voice.`, {                                                        
          duration: 15000, // Show for 15 seconds
          style: {
            background: '#dc2626',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500'
          }
        })
      } catch {}
      return
    }

    const sceneCount = script?.script?.scenes?.length || 0
    if (sceneCount === 0) {
      try { const { toast } = require('sonner'); toast.error('No scenes to generate audio for') } catch {}
      return
    }

    // Estimate duration: ~30 seconds per scene for all audio types (narration + dialogue + music + SFX)
    const estimatedDuration = Math.max(60, sceneCount * 30) // Minimum 60 seconds

    setIsGeneratingAudio(true)
    setAudioProgress({ current: 0, total: 0, status: 'Starting...' })
    
    await execute(
      async () => {
        const response = await fetch('/api/vision/generate-all-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectId,
            includeMusic: true,
            includeSFX: true,
          }),
        })

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        // Read SSE stream
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'progress') {
                  setAudioProgress({
                    current: data.scene,
                    total: data.total,
                    status: data.status === 'generating_narration' 
                      ? 'Generating narration...'
                      : data.status === 'generating_dialogue'
                      ? `Generating dialogue (${data.dialogueCount || 0} lines)...`
                      : data.status === 'generating_music'
                      ? 'Generating music...'
                      : data.status === 'generating_sfx'
                      ? `Generating SFX (${data.sfxCount || 0} sounds)...`
                      : 'Processing...',                                                                              
                    dialogueCount: data.dialogueCount
                  })
                } else if (data.type === 'complete') {
                  try { 
                    const { toast } = require('sonner')
                    const parts = []
                    if (data.narrationCount > 0) parts.push(`${data.narrationCount} narration`)
                    if (data.dialogueCount > 0) parts.push(`${data.dialogueCount} dialogue`)
                    if (data.musicCount > 0) parts.push(`${data.musicCount} music`)
                    if (data.sfxCount > 0) parts.push(`${data.sfxCount} SFX`)
                    const msg = `Generated ${parts.join(', ')} audio file${parts.length > 1 ? 's' : ''}!`                                        
                    
                    if (data.skipped && data.skipped.length > 0) {
                      const skippedChars = [...new Set(data.skipped.map((s: any) => s.character))].join(', ')                                                     
                      toast.warning(`${msg}\n\nSkipped dialogue for: ${skippedChars} (no voice assigned)`, {                                                      
                        duration: 8000
                      })
                    } else {
                      toast.success(msg)
                    }
                  } catch {}
                  
                  // Allow database writes to fully propagate before reloading
                  await new Promise(resolve => setTimeout(resolve, 2000))
                  
                  // Retry logic for project reload after batch audio generation (skip auto-generation to prevent script regeneration bug)
                  let retries = 3
                  while (retries > 0) {
                    try {
                      await loadProject(true) // Skip auto-generation to prevent accidental script regeneration
                      console.log('[Generate All Audio] Project reloaded successfully')
                      break // Success!
                    } catch (error) {
                      retries--
                      console.warn(`[Generate All Audio] Project reload failed, ${retries} retries left`)
                      if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 1500)) // Wait 1.5s before retry
                      } else {
                        console.error('[Generate All Audio] All retries exhausted')
                        try { const { toast } = require('sonner'); toast.warning('Audio generated but page reload failed. Please refresh manually.') } catch {}
                      }
                    }
                  }
                } else if (data.type === 'error') {
                  throw new Error(data.message)
                }
              } catch (e) {
                console.error('[Audio Progress] Parse error:', e)
              }
            }
          }
        }
      },
      {
        message: `Generating all audio for ${sceneCount} scenes (narration, dialogue, music, and SFX)`,
        estimatedDuration
      }
    )
    
    setIsGeneratingAudio(false)
    setAudioProgress(null)
  }

  // Handle generate scene audio
  // Optional sceneOverride parameter allows passing scene data directly (avoids stale state issues in sequential operations)
  // NOTE: 'description' audioType is deprecated - scene description is now read-only context, not an audio track
  const handleGenerateSceneAudio = async (sceneIdx: number, audioType: 'narration' | 'dialogue' | 'description', characterName?: string, dialogueIndex?: number, language?: string, sceneOverride?: any) => {
    // Debug logging for audio generation diagnostics
    console.log('[Generate Scene Audio] START:', {
      sceneIdx,
      audioType,
      characterName,
      dialogueIndex,
      language: language || 'en',
      hasSceneOverride: !!sceneOverride,
      hasNarrationVoice: !!narrationVoice,
      narrationVoiceId: narrationVoice?.voiceId,
      characterCount: characters?.length || 0
    })

    // Description audio generation is deprecated - scene description is for user context only
    if (audioType === 'description') {
      console.warn('[Generate Scene Audio] Description audio generation is deprecated. Use Enhance Details instead.')
      toast.info('Scene description is now read-only. Use "Enhance Details" for story context.')
      return
    }
    
    // Robust scene lookup using normalizeScenes helper that checks 6 different paths
    // Priority: sceneOverride > normalizeScenes(script)
    const scenes = normalizeScenes(script)
    const scene = sceneOverride ?? scenes[sceneIdx]
    if (!scene) {
      console.error('[Generate Scene Audio] Scene not found at index:', sceneIdx, 
        '| Total scenes:', scenes.length, 
        '| Script structure:', script ? Object.keys(script) : 'null',
        '| script.script:', script?.script ? Object.keys(script.script) : 'undefined')
      return
    }

    // Add a lock mechanism to prevent concurrent dialogue generations
    const lockKey = `${sceneIdx}-${audioType === 'dialogue' ? `${characterName}-${dialogueIndex}` : audioType}`
    if (generatingAudioLocks.has(lockKey)) {
      console.warn('[Generate Scene Audio] Already generating for:', lockKey)
      return
    }
    
    setGeneratingAudioLocks(prev => new Set(prev).add(lockKey))

    try {
      // Critical: Ensure character name is passed for dialogue
      if (audioType === 'dialogue' && !characterName) {
        console.error('[Generate Scene Audio] Character name required for dialogue')
        throw new Error('Character name required for dialogue generation')
      }
      
      // For dialogue, find the specific line by index if provided
      let dialogueLine = null
      if (audioType === 'dialogue') {
        if (dialogueIndex !== undefined) {
          // Find by index for precise matching
          dialogueLine = scene.dialogue?.[dialogueIndex]
        } else {
          // Fallback: find by character name (first match)
          dialogueLine = scene.dialogue?.find((d: any) => d.character === characterName)
        }
      }
      
      let text: string | undefined
      const targetLanguage = language || 'en'
      
      // PRIORITY: Check stored translations first for non-English languages
      // This allows audio generation to use imported translations (via ScriptPanel)
      const sceneTranslation = storedTranslations?.[targetLanguage]?.[sceneIdx]
      const useStoredTranslation = targetLanguage !== 'en' && sceneTranslation
      
      if (audioType === 'narration') {
        // Use stored translation if available, otherwise fall back to English
        if (useStoredTranslation && sceneTranslation?.narration) {
          text = sceneTranslation.narration
          console.log('[Generate Scene Audio] Using stored translation for narration:', {
            language: targetLanguage,
            sceneIdx,
            textPreview: text?.substring(0, 50)
          })
        } else {
          text = scene.narration || scene.action
          if (targetLanguage !== 'en') {
            console.warn('[Generate Scene Audio] No stored translation found for narration, falling back to English:', {
              language: targetLanguage,
              sceneIdx,
              hasStoredTranslations: !!storedTranslations,
              hasLanguage: !!storedTranslations?.[targetLanguage],
              hasScene: !!storedTranslations?.[targetLanguage]?.[sceneIdx]
            })
          }
        }
      } else if (audioType === 'description') {
        text = scene.visualDescription || scene.action || scene.summary || scene.heading
      } else {
        // Dialogue: use stored translation by dialogueIndex
        if (useStoredTranslation && sceneTranslation?.dialogue && dialogueIndex !== undefined) {
          const translatedLine = sceneTranslation.dialogue[dialogueIndex]
          if (translatedLine) {
            text = translatedLine
            console.log('[Generate Scene Audio] Using stored translation for dialogue:', {
              language: targetLanguage,
              sceneIdx,
              dialogueIndex,
              textPreview: text?.substring(0, 50)
            })
          } else {
            text = dialogueLine?.line
            console.warn('[Generate Scene Audio] No stored translation for dialogue line, falling back:', {
              language: targetLanguage,
              sceneIdx,
              dialogueIndex,
              availableTranslations: sceneTranslation?.dialogue?.length || 0
            })
          }
        } else {
          text = dialogueLine?.line
          if (targetLanguage !== 'en') {
            console.warn('[Generate Scene Audio] No stored translation for dialogue, falling back to English')
          }
        }
      }

      // Debug logging for text extraction
      console.log('[Generate Scene Audio] Text extraction:', {
        audioType,
        hasText: !!text,
        textLength: text?.length || 0,
        textPreview: text?.substring(0, 50) || 'EMPTY',
        sceneHasNarration: !!scene.narration,
        sceneHasAction: !!scene.action,
        dialogueLineFound: !!dialogueLine,
        dialogueLine: dialogueLine ? { character: dialogueLine.character, line: dialogueLine.line?.substring(0, 50) } : null
      })
      
      if (!text) {
        console.error('[Generate Scene Audio] No text found for audio generation:', {
          audioType,
          sceneNarration: scene.narration?.substring(0, 50),
          sceneAction: scene.action?.substring(0, 50),
          dialogueEntries: scene.dialogue?.length || 0
        })
        try { const { toast } = require('sonner'); toast.error('No text found to generate audio') } catch {}
        return
      }

            // Primary: Match by ID (most reliable)
      let character = audioType === 'dialogue'
        ? (dialogueLine?.characterId
            ? characters.find(c => c.id === dialogueLine.characterId)
            : null)
        : null
      
      // Enhanced fallback matching if ID lookup fails
      if (!character && audioType === 'dialogue' && characterName) {
        const canonicalSearchName = toCanonicalName(characterName)
        
        // Try exact canonical match first
        const exactMatch = characters.find(c => 
          toCanonicalName(c.name) === canonicalSearchName
        )
        
        if (exactMatch) {
          character = exactMatch
        } else {
          // Try alias matching
          character = characters.find(c => {
            const aliases = generateAliases(toCanonicalName(c.name))
            return aliases.some(alias => 
              toCanonicalName(alias) === canonicalSearchName
            )
          })
        }

        if (!character) {
          console.error('[Generate Scene Audio] Character not found after normalization:', {
            original: characterName,
            normalized: canonicalSearchName,
            availableCharacters: characters.map(c => ({ name: c.name, hasVoice: !!c.voiceConfig }))
          })
          try { 
            const { toast } = require('sonner')
            toast.error(`Character "${canonicalSearchName}" not found. Please check character names match in Character Library.`, {
              duration: 8000
            })
          } catch {}
          return
        }
      }
      
      const voiceConfig = audioType === 'dialogue'
        ? character?.voiceConfig
        : audioType === 'description'
          ? descriptionVoice
          : narrationVoice

      // Debug logging for voice config resolution
      console.log('[Generate Scene Audio] Voice config resolution:', {
        audioType,
        hasVoiceConfig: !!voiceConfig,
        voiceId: voiceConfig?.voiceId,
        provider: voiceConfig?.provider,
        characterName: character?.name,
        characterHasVoice: !!character?.voiceConfig,
        narrationVoiceConfigured: !!narrationVoice,
        descriptionVoiceConfigured: !!descriptionVoice
      })

      if (!voiceConfig) {
        // Show specific error message based on audio type
        if (audioType === 'narration') {
          console.error('[Generate Scene Audio] No narration voice configured')
          try { 
            const { toast } = require('sonner')
            toast.error('Please select a narration voice in the sidebar before generating audio')
          } catch {}
        } else if (audioType === 'description') {
          console.error('[Generate Scene Audio] No description voice configured')
          try {
            const { toast } = require('sonner')
            toast.error('Please select a scene description voice before generating audio')
          } catch {}
        } else {
          const normalizedName = normalizeCharacterName(characterName || '')
          console.error('[Generate Scene Audio] No voice configured for character:', normalizedName)
          try { 
            const { toast } = require('sonner')
            toast.error(`No voice assigned to ${normalizedName}. Please assign a voice in the Character Library.`, {
              duration: 8000
            })
          } catch {}
        }
        return
      }

      const response = await fetch('/api/vision/generate-scene-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex: sceneIdx,
          audioType,
          text,
          voiceConfig,
          characterName,
          dialogueIndex,
          language: language || 'en'
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Use functional update to ensure we're working with latest state
        // This is critical when multiple audio generations run sequentially
        // NOTE: We do NOT save to database here - the API's updateSceneAudio() already
        // persisted the Vercel Blob URL. Saving here would overwrite with stale state.
        
        setScript((prevScript: any) => {
          // Robust scene lookup using normalizeScenes helper
          const currentScenes = normalizeScenes(prevScript)
          if (!currentScenes[sceneIdx]) {
            console.error('[Generate Scene Audio] Scene not found in setScript callback at index:', sceneIdx,
              '| Total scenes:', currentScenes.length)
            return prevScript
          }
          
          const updatedScenes = [...currentScenes]
          const scene = { ...updatedScenes[sceneIdx] }
          
          // Use the language parameter for storing audio (default to 'en')
          const targetLanguage = language || 'en'
          
          if (audioType === 'narration') {
            // Initialize narrationAudio if it doesn't exist
            if (!scene.narrationAudio) {
              scene.narrationAudio = {}
            } else {
              scene.narrationAudio = { ...scene.narrationAudio }
            }
            
            // Store narration audio under the target language key
            scene.narrationAudio[targetLanguage] = {
              url: data.audioUrl,
              duration: data.duration || undefined,
              generatedAt: new Date().toISOString(),
              voiceId: voiceConfig.voiceId
            }
            
            // Maintain backward compatibility: set narrationAudioUrl only for English
            if (targetLanguage === 'en') {
              scene.narrationAudioUrl = data.audioUrl
              scene.narrationAudioGeneratedAt = new Date().toISOString()
            }
            
            updatedScenes[sceneIdx] = scene
          } else if (audioType === 'description') {
            if (!scene.descriptionAudio) {
              scene.descriptionAudio = {}
            } else {
              scene.descriptionAudio = { ...scene.descriptionAudio }
            }

            // Store description audio under the target language key
            scene.descriptionAudio[targetLanguage] = {
              url: data.audioUrl,
              duration: data.duration || undefined,
              generatedAt: new Date().toISOString(),
              voiceId: voiceConfig.voiceId
            }

            // Maintain backward compatibility: set descriptionAudioUrl only for English
            if (targetLanguage === 'en') {
              scene.descriptionAudioUrl = data.audioUrl
              scene.descriptionAudioGeneratedAt = new Date().toISOString()
            }

            updatedScenes[sceneIdx] = scene
          } else if (audioType === 'dialogue' && characterName) {
            // Initialize dialogueAudio object if needed
            if (!scene.dialogueAudio || Array.isArray(scene.dialogueAudio)) {
              // Migrate old array format if exists
              if (Array.isArray(scene.dialogueAudio) && scene.dialogueAudio.length > 0) {
                scene.dialogueAudio = { en: scene.dialogueAudio }
              } else {
                scene.dialogueAudio = {}
              }
            } else {
              scene.dialogueAudio = { ...scene.dialogueAudio }
            }
            
            // Initialize dialogue array for target language if it doesn't exist
            if (!scene.dialogueAudio[targetLanguage]) {
              scene.dialogueAudio[targetLanguage] = []
            }
            
            const dialogueArray = [...scene.dialogueAudio[targetLanguage]]
            const existingIndex = dialogueArray.findIndex((d: any) => 
              d.character === characterName && d.dialogueIndex === dialogueIndex
            )
            
            const dialogueEntry = {
              character: characterName,
              dialogueIndex: dialogueIndex!,
              audioUrl: data.audioUrl,
              duration: data.duration || undefined,
              voiceId: voiceConfig.voiceId
            }
            
            if (existingIndex >= 0) {
              dialogueArray[existingIndex] = dialogueEntry
            } else {
              dialogueArray.push(dialogueEntry)
            }
            
            scene.dialogueAudio[targetLanguage] = dialogueArray
            scene.dialogueAudioGeneratedAt = new Date().toISOString()
            
            updatedScenes[sceneIdx] = scene
          }
          
          // DEBUG: Log what we're about to set in state
          console.log('[Generate Scene Audio] Updating script state with new audio:', {
            sceneIdx,
            audioType,
            updatedScene: {
              narrationAudioUrl: updatedScenes[sceneIdx]?.narrationAudioUrl?.substring(0, 60),
              narrationAudioEn: updatedScenes[sceneIdx]?.narrationAudio?.en?.url?.substring(0, 60),
              dialogueAudioEnLength: updatedScenes[sceneIdx]?.dialogueAudio?.en?.length,
            }
          })
          
          // Preserve original script structure when updating
          // Check which path the original data used
          if (prevScript?.script?.scenes) {
            return {
              ...prevScript,
              script: {
                ...prevScript.script,
                scenes: updatedScenes
              }
            }
          } else if (prevScript?.scenes) {
            return {
              ...prevScript,
              scenes: updatedScenes
            }
          } else {
            // Fallback: create nested structure
            return {
              ...prevScript,
              script: {
                ...prevScript?.script,
                scenes: updatedScenes
              }
            }
          }
        })
        
        // NOTE: Database save is handled by the API's updateSceneAudio() function.
        // Do NOT call saveScenesToDatabase here - it would overwrite with stale state
        // and lose the Vercel Blob URLs that the API just persisted.
        
        try { const { toast } = require('sonner'); toast.success('Audio generated!') } catch {}
      } else {
        try { const { toast } = require('sonner'); toast.error(data.error || 'Failed to generate audio') } catch {}
      }
    } catch (error) {
      console.error('[Generate Scene Audio] Error:', error)
      try { const { toast } = require('sonner'); toast.error('Failed to generate audio') } catch {}
    } finally {
      // Clean up the lock
      setGeneratingAudioLocks(prev => {
        const newSet = new Set(prev)
        newSet.delete(lockKey)
        return newSet
      })
    }
  }

  // Handle generate all scene images
  const handleGenerateAllImages = async () => {
    if (!projectId || !script?.script?.scenes || script.script.scenes.length === 0) {
      try { const { toast } = require('sonner'); toast.error('No scenes to generate images for') } catch {}
      return
    }

    setIsGeneratingAllImages(true)
    setImageProgress({ scene: 0, total: script.script.scenes.length, status: 'starting' })

    try {
      const response = await fetch('/api/vision/generate-all-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          imageQuality
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start batch image generation')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response stream')
      }

      // Read SSE stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'progress') {
              setImageProgress({
                scene: data.scene,
                total: data.total,
                status: data.status,
                sceneHeading: data.sceneHeading
              })
            } else if (data.type === 'complete') {
              setImageProgress(null)
              
              // Handle quota errors in completion
              if (data.quotaErrorDetected) {
                const quotaErrorMsg = `⚠️ Google Cloud quota limit reached!\n\nGenerated ${data.generatedCount} of ${data.totalScenes} images before quota limit.\n\nFailed scenes: ${data.quotaErrorCount}\n\nSolutions:\n1. Wait and retry later\n2. Request quota increase from Google Cloud\n3. Use fewer images per batch\n\nDocumentation: https://cloud.google.com/vertex-ai/docs/quotas`
                
                try { 
                  const { toast } = require('sonner')
                  toast.error(quotaErrorMsg, {
                    duration: 20000,
                    style: {
                      background: '#dc2626',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      whiteSpace: 'pre-line'
                    }
                  })
                } catch {}
              } else {
                const skippedMsg = data.skipped?.length > 0
                  ? `\n\nSkipped ${data.skipped.length} scenes:\n${data.skipped.map((s: any) => `Scene ${s.scene}: ${s.reason}`).join('\n')}`
                  : ''
                
                try { 
                  const { toast } = require('sonner')
                  toast.success(`Generated ${data.generatedCount} of ${data.totalScenes} scene images!${skippedMsg}`, {
                    duration: 8000
                  })
                } catch {}
              }
              
              // Reload project to get updated image URLs
              let retries = 3
              while (retries > 0) {
                try {
                  await loadProject()
                  break
                } catch (error) {
                  retries--
                  if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000))
                  } else {
                    try { const { toast } = require('sonner'); toast.warning('Images generated but page reload failed. Please refresh manually.') } catch {}
                  }
                }
              }
            } else if (data.type === 'error') {
              // Handle quota errors in real-time
              if (data.errorType === 'quota') {
                const quotaErrorMsg = `⚠️ Google Cloud Quota Limit Reached!\n\nScene ${data.scene}: ${data.sceneHeading}\n\n${data.error}\n\nSolutions:\n1. Wait and retry later\n2. Request quota increase from Google Cloud\n3. Use fewer images per batch\n\nDocumentation: ${data.documentation}`
                
                try { 
                  const { toast } = require('sonner')
                  toast.error(quotaErrorMsg, {
                    duration: 20000,
                    style: {
                      background: '#dc2626',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      whiteSpace: 'pre-line'
                    }
                  })
                } catch {}
              } else {
                try { const { toast } = require('sonner'); toast.error(`Batch generation failed: ${data.error}`) } catch {}
              }
              setImageProgress(null)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Batch image generation error:', error)
      try { const { toast } = require('sonner'); toast.error('Failed to generate images') } catch {}
    } finally {
      setIsGeneratingAllImages(false)
      setImageProgress(null)
    }
  }

  const handleExport = () => {
    console.log('Export Vision')
  }

  const handleShare = async () => {
    if (!project) {
      console.error('[Share] No project available')
      return
    }
    
    setIsSharing(true)
    try {
      const response = await fetch('/api/vision/create-share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      })

      const data = await response.json()
      if (data.success) {
        setShareUrl(data.shareUrl)
        console.log('[Share] Share link created:', data.shareUrl)
      } else {
        throw new Error(data.error || 'Failed to create share link')
      }
    } catch (error) {
      console.error('[Share] Error:', error)
      try {
        const { toast } = require('sonner')
        toast.error('Failed to create share link. Please try again.')
      } catch {}
    } finally {
      setIsSharing(false)
    }
  }

  const copyToClipboard = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        try {
          const { toast } = require('sonner')
          toast.success('Link copied to clipboard!')
        } catch {}
      } catch (error) {
        console.error('[Copy] Error:', error)
        try {
          const { toast } = require('sonner')
          toast.error('Failed to copy link. Please copy manually.')
        } catch {}
      }
    }
  }

  // Scene management handlers
  const handleAddScene = async (afterIndex?: number) => {
    if (!script) return
    
    // Ensure we're working with the full scene objects from script.script.scenes
    const currentScenes = script?.script?.scenes || []
    
    // DEBUG: Log assets before adding
    console.log('[handleAddScene] Assets BEFORE:', currentScenes.slice(0, 3).map((s: any) => ({
      sceneNumber: s.sceneNumber,
      hasImage: !!s.imageUrl,
      imageUrl: s.imageUrl?.substring(0, 100)
    })))
    
    const newScene = {
      sceneNumber: (afterIndex !== undefined ? afterIndex + 2 : currentScenes.length + 1),
      heading: `INT. NEW LOCATION - DAY`,
      action: 'Description of what happens in this scene.',
      dialogue: [],
      narration: '',
      visualDescription: '',
      imagePrompt: '',
      isExpanded: true
    }
    
    // Use shallow copy to preserve object references and avoid breaking ORM
    const updatedScenes = [...currentScenes]
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : currentScenes.length
    updatedScenes.splice(insertIndex, 0, newScene)
    
    // Renumber scenes
    updatedScenes.forEach((scene: any, idx: number) => {
      scene.sceneNumber = idx + 1
    })
    
    // DEBUG: Log assets after adding and renumbering
    console.log('[handleAddScene] Assets AFTER:', updatedScenes.slice(0, 3).map((s: any) => ({
      sceneNumber: s.sceneNumber,
      hasImage: !!s.imageUrl,
      imageUrl: s.imageUrl?.substring(0, 100)
    })))
    
    try {
      // Save to database FIRST
      await saveScenesToDatabase(updatedScenes)
      
      // Reload project from database to ensure UI matches database state
      await loadProject()
      try {
        const { toast } = require('sonner')
        toast.success('Scene added!')
      } catch {}
    } catch (error) {
      console.error('[Vision] handleAddScene - Failed:', error)
      // Don't update local state if save failed
    }
  }

  const handleDeleteScene = async (sceneIndex: number) => {
    if (!script) return
    
    // Ensure we're working with the full scene objects from script.script.scenes
    const currentScenes = script?.script?.scenes || []
    
    if (currentScenes.length <= 1) {
      try {
        const { toast } = require('sonner')
        toast.error('Cannot delete the last scene')
      } catch {}
      return
    }
    
    // DEBUG: Log assets before deletion
    console.log('[handleDeleteScene] Assets BEFORE:', currentScenes.slice(0, 3).map((s: any) => ({
      sceneNumber: s.sceneNumber,
      hasImage: !!s.imageUrl,
      imageUrl: s.imageUrl?.substring(0, 100)
    })))
    
    // Use shallow copy to preserve object references and avoid breaking ORM
    const updatedScenes = currentScenes.filter((_: any, idx: number) => idx !== sceneIndex)
    
    // Renumber scenes
    updatedScenes.forEach((scene: any, idx: number) => {
      scene.sceneNumber = idx + 1
    })
    
    // DEBUG: Log assets after deletion and renumbering
    console.log('[handleDeleteScene] Assets AFTER:', updatedScenes.slice(0, 3).map((s: any) => ({
      sceneNumber: s.sceneNumber,
      hasImage: !!s.imageUrl,
      imageUrl: s.imageUrl?.substring(0, 100)
    })))
    
    try {
      // Save to database FIRST
      await saveScenesToDatabase(updatedScenes)
      
      // Reload project from database to ensure UI matches database state
      await loadProject()
      try {
        const { toast } = require('sonner')
        toast.success('Scene deleted')
      } catch {}
    } catch (error) {
      console.error('[Vision] handleDeleteScene - Failed:', error)
      // Don't update local state if save failed
    }
  }

  const handleReorderScenes = async (startIndex: number, endIndex: number) => {
    if (!script) return
    
    // Ensure we're working with the full scene objects from script.script.scenes
    const currentScenes = script?.script?.scenes || []
    
    // DEBUG: Log assets before reordering
    console.log('[handleReorderScenes] Assets BEFORE:', currentScenes.slice(0, 3).map((s: any) => ({
      sceneNumber: s.sceneNumber,
      hasImage: !!s.imageUrl,
      imageUrl: s.imageUrl?.substring(0, 100)
    })))
    
    // Use shallow copy to preserve object references and avoid breaking ORM
    const updatedScenes = [...currentScenes]
    const [movedScene] = updatedScenes.splice(startIndex, 1)
    updatedScenes.splice(endIndex, 0, movedScene)
    
    // Renumber scenes
    updatedScenes.forEach((scene: any, idx: number) => {
      scene.sceneNumber = idx + 1
    })
    
    // DEBUG: Log assets after reordering and renumbering
    console.log('[handleReorderScenes] Assets AFTER:', updatedScenes.slice(0, 3).map((s: any) => ({
      sceneNumber: s.sceneNumber,
      hasImage: !!s.imageUrl,
      imageUrl: s.imageUrl?.substring(0, 100)
    })))
    
    try {
      // Save to database FIRST
      await saveScenesToDatabase(updatedScenes)
      
      // Reload project from database to ensure UI matches database state
      await loadProject()
      try {
        const { toast } = require('sonner')
        toast.success('Scenes reordered')
      } catch {}
    } catch (error) {
      console.error('[Vision] handleReorderScenes - Failed:', error)
      // Don't update local state if save failed
    }
  }

  // Scene editor handlers
  const handleEditScene = (sceneIndex: number) => {
    setEditingSceneIndex(sceneIndex)
    setIsSceneEditorOpen(true)
  }

  // Handler for immediate score updates from dialog (without closing it)
  const handleUpdateSceneScores = async (sceneIndex: number, directorScore: number, audienceScore: number, dialogReviews: any) => {
    if (!script) return
    
    const updatedScenes = [...(script.script?.scenes || [])]
    const scene = updatedScenes[sceneIndex]
    
    // Update the scene's scoreAnalysis and dialogReviews
    updatedScenes[sceneIndex] = {
      ...scene,
      scoreAnalysis: {
        ...(scene.scoreAnalysis || {}),
        overallScore: Math.round((directorScore + audienceScore) / 2),
        directorScore,
        audienceScore,
        generatedAt: new Date().toISOString()
      },
      dialogReviews
    }
    
    // Update local state immediately
    setScript({
      ...script,
      script: {
        ...script.script,
        scenes: updatedScenes
      }
    })
    
    // Save to database in background
    try {
      await saveScenesToDatabase(updatedScenes)
      console.log(`[Vision] Updated scores for scene ${sceneIndex + 1}: Director ${directorScore}, Audience ${audienceScore}`)
    } catch (error) {
      console.error('[Vision] Failed to save scene scores:', error)
    }
  }

  const handleApplySceneChanges = async (sceneIndex: number, revisedScene: any) => {
    if (!script) return

    const updatedScenes = [...(script.script?.scenes || [])]
    const originalScene = updatedScenes[sceneIndex]
    
    // Clear ALL audio from BOTH original and revised scenes to catch all URLs
    // The revised scene may not have audio URLs (editor doesn't copy them)
    // So we need to get URLs from the original scene in the database
    const { deletedUrls: originalDeletedUrls } = clearAllSceneAudio(originalScene)
    const { cleanedScene, deletedUrls: revisedDeletedUrls } = clearAllSceneAudio(revisedScene)
    
    // Combine and dedupe URLs from both scenes
    const allDeletedUrls = [...new Set([...originalDeletedUrls, ...revisedDeletedUrls])]
    
    updatedScenes[sceneIndex] = cleanedScene

    // Save to database FIRST
    try {
      await saveScenesToDatabase(updatedScenes)
      
      // Delete orphaned audio blobs in background (don't block UI)
      if (allDeletedUrls.length > 0) {
        console.log(`[Vision] Deleting ${allDeletedUrls.length} scene audio blob(s)...`)
        fetch('/api/blobs/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: allDeletedUrls })
        }).then(res => res.json()).then(result => {
          if (result.success) {
            console.log(`[Vision] Deleted ${result.deleted} audio blob(s)`)
          } else {
            console.warn('[Vision] Failed to delete some audio blobs:', result.error)
          }
        }).catch(err => {
          console.warn('[Vision] Error deleting audio blobs:', err)
        })
      }
      
      // Then update local state
      setScript({
        ...script,
        script: {
          ...script.script,
          scenes: updatedScenes
        }
      })
      
      // Update script edit timestamp to force cache clear in ScreeningRoom
      setScriptEditedAt(Date.now())

      // Close the editor
      setIsSceneEditorOpen(false)
      setEditingSceneIndex(null)

      // Show success message
      try {
        const { toast } = require('sonner')
        toast.success('Scene changes applied - use Update Audio to regenerate audio')
      } catch {}
      
      // NOTE: Removed loadProject() call - it was causing race condition
      // where stale data would be reloaded before DB write completed.
      // Local state update above is sufficient since saveScenesToDatabase was awaited.
    } catch (error) {
      console.error('[Vision] Failed to save scene changes:', error)
      try {
        const { toast } = require('sonner')
        toast.error('Failed to save scene changes')
      } catch {}
    }
  }

  // Generate music for a scene (used by handleUpdateSceneAudio)
  const generateMusicForScene = async (sceneIndex: number, scene: any) => {
    const music = scene.music
    if (!music) return
    
    const description = typeof music === 'string' ? music : music.description
    const duration = scene.duration || 30
    
    console.log(`[Update Scene Audio] Generating music for Scene ${sceneIndex + 1}...`)
    
    const response = await fetch('/api/tts/elevenlabs/music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: description, duration })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.details || 'Music generation failed')
    }
    
    const blob = await response.blob()
    
    // Upload to blob storage
    const formData = new FormData()
    const fileName = `music-${projectId}-scene-${sceneIndex}-${Date.now()}.mp3`
    formData.append('file', blob, fileName)
    
    const uploadResponse = await fetch('/api/audio/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload music audio')
    }
    
    const uploadData = await uploadResponse.json()
    const audioUrl = uploadData.audioUrl
    
    // Update state with music URL
    setScript((prevScript: any) => {
      const updatedScenes = [...(prevScript?.script?.scenes || [])]
      if (updatedScenes[sceneIndex]) {
        updatedScenes[sceneIndex] = {
          ...updatedScenes[sceneIndex],
          musicAudio: audioUrl
        }
      }
      
      // Save to DB in background
      setTimeout(() => {
        saveScenesToDatabase(updatedScenes).catch(err => {
          console.error('[Update Scene Audio] Failed to save music to database:', err)
        })
      }, 100)
      
      return {
        ...prevScript,
        script: {
          ...prevScript?.script,
          scenes: updatedScenes
        }
      }
    })
    
    console.log(`[Update Scene Audio] Music generated for Scene ${sceneIndex + 1}`)
  }
  
  // Generate SFX for a scene (used by handleUpdateSceneAudio)
  const generateSFXForScene = async (sceneIndex: number, sfxIndex: number, scene: any) => {
    const sfx = scene.sfx?.[sfxIndex]
    if (!sfx) return
    
    const description = typeof sfx === 'string' ? sfx : sfx.description
    
    console.log(`[Update Scene Audio] Generating SFX ${sfxIndex + 1} for Scene ${sceneIndex + 1}...`)
    
    const response = await fetch('/api/tts/elevenlabs/sound-effects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: description, duration: 2.0 })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.details || 'SFX generation failed')
    }
    
    const blob = await response.blob()
    
    // Upload to blob storage
    const formData = new FormData()
    const fileName = `sfx-${projectId}-scene-${sceneIndex}-sfx-${sfxIndex}-${Date.now()}.mp3`
    formData.append('file', blob, fileName)
    
    const uploadResponse = await fetch('/api/audio/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload SFX audio')
    }
    
    const uploadData = await uploadResponse.json()
    const audioUrl = uploadData.audioUrl
    
    // Update state with SFX URL
    setScript((prevScript: any) => {
      const updatedScenes = [...(prevScript?.script?.scenes || [])]
      if (updatedScenes[sceneIndex]) {
        const updatedSfx = [...(updatedScenes[sceneIndex].sfx || [])]
        if (typeof updatedSfx[sfxIndex] === 'string') {
          // Convert string SFX to object with audioUrl
          updatedSfx[sfxIndex] = {
            description: updatedSfx[sfxIndex],
            audioUrl: audioUrl
          }
        } else {
          updatedSfx[sfxIndex] = {
            ...updatedSfx[sfxIndex],
            audioUrl: audioUrl
          }
        }
        updatedScenes[sceneIndex] = {
          ...updatedScenes[sceneIndex],
          sfx: updatedSfx,
          sfxAudio: updatedSfx.map((s: any) => typeof s === 'string' ? null : s.audioUrl).filter(Boolean)
        }
      }
      
      // Save to DB in background
      setTimeout(() => {
        saveScenesToDatabase(updatedScenes).catch(err => {
          console.error('[Update Scene Audio] Failed to save SFX to database:', err)
        })
      }, 100)
      
      return {
        ...prevScript,
        script: {
          ...prevScript?.script,
          scenes: updatedScenes
        }
      }
    })
    
    console.log(`[Update Scene Audio] SFX ${sfxIndex + 1} generated for Scene ${sceneIndex + 1}`)
  }

  // Update all scene audio - clears existing audio and regenerates sequentially
  const handleUpdateSceneAudio = async (sceneIndex: number) => {
    if (!script?.script?.scenes?.[sceneIndex]) {
      console.error('[Update Scene Audio] Scene not found')
      return
    }

    // Get the CURRENT scene from state (has all audio references)
    const currentScene = script.script.scenes[sceneIndex]
    
    // Use the standard freeze screen overlay pattern
    await execute(
      async () => {
        // First, clear ALL existing audio from the scene
        // This removes all audio URLs from the scene object AND from dialogue items
        const { cleanedScene, deletedUrls } = clearAllSceneAudio(currentScene)
        
        console.log(`[Update Scene Audio] Clearing ${deletedUrls.length} audio reference(s) from Scene ${sceneIndex + 1}`)
        
        // Update state with cleaned scene FIRST to stop any playback attempts
        const updatedScenes = [...script.script.scenes]
        updatedScenes[sceneIndex] = cleanedScene
        
        setScript({
          ...script,
          script: {
            ...script.script,
            scenes: updatedScenes
          }
        })
        
        // Force cache clear in ScreeningRoom
        setScriptEditedAt(Date.now())
        
        // Save cleaned scene to database BEFORE deleting blobs
        // This ensures no UI tries to load the old URLs
        await saveScenesToDatabase(updatedScenes)
        console.log(`[Update Scene Audio] Saved cleaned scene to database`)
        
        // Delete audio blobs from storage (in background, don't block)
        if (deletedUrls.length > 0) {
          console.log(`[Update Scene Audio] Deleting ${deletedUrls.length} audio blob(s) from storage...`)
          fetch('/api/blobs/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: deletedUrls })
          }).then(res => res.json()).then(result => {
            if (result.success) {
              console.log(`[Update Scene Audio] Deleted ${result.deleted} blob(s)`)
            }
          }).catch(err => {
            console.warn('[Update Scene Audio] Error deleting blobs:', err)
          })
        }
        
        // Now build list of audio to generate based on CLEANED scene content
        // Include TTS audio (description, narration, dialogue) and also music/SFX
        const generationTasks: Array<{type: 'description' | 'narration' | 'dialogue' | 'music' | 'sfx', character?: string, dialogueIndex?: number, sfxIndex?: number, label: string}> = []
        
        // Add description if scene has visual content
        if (cleanedScene.visualDescription || cleanedScene.action || cleanedScene.summary) {
          generationTasks.push({ type: 'description', label: 'description' })
        }
        
        // Add narration if scene has narration text
        if (cleanedScene.narration) {
          generationTasks.push({ type: 'narration', label: 'narration' })
        }
        
        // Add all dialogue lines
        if (cleanedScene.dialogue && cleanedScene.dialogue.length > 0) {
          cleanedScene.dialogue.forEach((d: any, idx: number) => {
            if (d.line && d.character) {
              generationTasks.push({ 
                type: 'dialogue', 
                character: d.character, 
                dialogueIndex: idx,
                label: `dialogue (${d.character})`
              })
            }
          })
        }
        
        // Add music if scene has music description
        const musicDescription = cleanedScene.music 
          ? (typeof cleanedScene.music === 'string' ? cleanedScene.music : cleanedScene.music.description)
          : null
        if (musicDescription) {
          generationTasks.push({ type: 'music', label: 'background music' })
        }
        
        // Add all SFX
        if (cleanedScene.sfx && cleanedScene.sfx.length > 0) {
          cleanedScene.sfx.forEach((sfx: any, idx: number) => {
            const sfxDescription = typeof sfx === 'string' ? sfx : sfx.description
            if (sfxDescription) {
              generationTasks.push({
                type: 'sfx',
                sfxIndex: idx,
                label: `SFX ${idx + 1}`
              })
            }
          })
        }
        
        if (generationTasks.length === 0) {
          toast.info(`No audio content to generate for Scene ${sceneIndex + 1}`)
          return
        }
        
        // Generate audio sequentially
        let successCount = 0
        for (let i = 0; i < generationTasks.length; i++) {
          const task = generationTasks[i]
          try {
            if (task.type === 'description' || task.type === 'narration' || task.type === 'dialogue') {
              // Pass cleanedScene directly to avoid stale state issues (language defaults to 'en')
              await handleGenerateSceneAudio(sceneIndex, task.type, task.character, task.dialogueIndex, undefined, cleanedScene)
            } else if (task.type === 'music') {
              await generateMusicForScene(sceneIndex, cleanedScene)
            } else if (task.type === 'sfx' && task.sfxIndex !== undefined) {
              await generateSFXForScene(sceneIndex, task.sfxIndex, cleanedScene)
            }
            successCount++
          } catch (error) {
            console.error(`[Update Scene Audio] Failed to generate ${task.label}:`, error)
          }
        }
        
        // Show completion message
        if (successCount === generationTasks.length) {
          toast.success(`All audio regenerated for Scene ${sceneIndex + 1}`)
        } else if (successCount > 0) {
          toast.warning(`Regenerated ${successCount}/${generationTasks.length} audio files for Scene ${sceneIndex + 1}`)
        } else {
          toast.error('Failed to regenerate audio')
        }
        
        // NOTE: Removed loadProject() - it was causing race condition where
        // state would be overwritten with stale data before all DB writes completed.
        // Each handleGenerateSceneAudio call updates state with functional updates.
      },
      {
        title: `Updating Audio for Scene ${sceneIndex + 1}`,
        estimatedDuration: 30, // Estimate 30 seconds for audio generation
      }
    )
  }

  // Delete specific audio from a scene
  const handleDeleteSceneAudio = async (
    sceneIndex: number, 
    audioType: 'description' | 'narration' | 'dialogue' | 'music' | 'sfx',
    dialogueIndex?: number,
    sfxIndex?: number
  ) => {
    if (!script?.script?.scenes?.[sceneIndex]) {
      console.error('[Delete Scene Audio] Scene not found')
      return
    }

    const currentScene = script.script.scenes[sceneIndex]
    const selectedLang = 'en' // Default language for now
    
    // Collect URLs to delete from blob storage
    const urlsToDelete: string[] = []
    
    // Create updated scene based on audio type
    const updatedScene = { ...currentScene }
    
    if (audioType === 'description') {
      if (updatedScene.descriptionAudioUrl) {
        urlsToDelete.push(updatedScene.descriptionAudioUrl)
        delete updatedScene.descriptionAudioUrl
      }
      if (updatedScene.descriptionAudio?.[selectedLang]?.url) {
        urlsToDelete.push(updatedScene.descriptionAudio[selectedLang].url)
        delete updatedScene.descriptionAudio
      }
    } else if (audioType === 'narration') {
      if (updatedScene.narrationAudioUrl) {
        urlsToDelete.push(updatedScene.narrationAudioUrl)
        delete updatedScene.narrationAudioUrl
      }
      if (updatedScene.narrationAudio?.[selectedLang]?.url) {
        urlsToDelete.push(updatedScene.narrationAudio[selectedLang].url)
        delete updatedScene.narrationAudio
      }
    } else if (audioType === 'dialogue' && dialogueIndex !== undefined) {
      // Get dialogue audio array
      let dialogueAudioArray: any[] = []
      if (Array.isArray(updatedScene.dialogueAudio)) {
        dialogueAudioArray = [...updatedScene.dialogueAudio]
      } else if (updatedScene.dialogueAudio && typeof updatedScene.dialogueAudio === 'object') {
        dialogueAudioArray = [...(updatedScene.dialogueAudio[selectedLang] || [])]
      }
      
      // Find and remove the matching dialogue audio
      const audioIdx = dialogueAudioArray.findIndex((a: any) => 
        a.dialogueIndex === dialogueIndex
      )
      if (audioIdx !== -1 && dialogueAudioArray[audioIdx]?.audioUrl) {
        urlsToDelete.push(dialogueAudioArray[audioIdx].audioUrl)
        dialogueAudioArray.splice(audioIdx, 1)
      }
      
      // Update the scene
      if (Array.isArray(updatedScene.dialogueAudio)) {
        updatedScene.dialogueAudio = dialogueAudioArray
      } else {
        updatedScene.dialogueAudio = { ...updatedScene.dialogueAudio, [selectedLang]: dialogueAudioArray }
      }
    } else if (audioType === 'music') {
      if (updatedScene.musicAudio?.url) {
        urlsToDelete.push(updatedScene.musicAudio.url)
      }
      delete updatedScene.musicAudio
    } else if (audioType === 'sfx' && sfxIndex !== undefined) {
      if (updatedScene.sfxAudio?.[sfxIndex]) {
        urlsToDelete.push(updatedScene.sfxAudio[sfxIndex])
        const newSfxAudio = [...(updatedScene.sfxAudio || [])]
        newSfxAudio[sfxIndex] = null
        updatedScene.sfxAudio = newSfxAudio
      }
      // Also clear from sfx object if it has audioUrl
      if (updatedScene.sfx?.[sfxIndex]?.audioUrl) {
        const newSfx = [...(updatedScene.sfx || [])]
        newSfx[sfxIndex] = { ...newSfx[sfxIndex], audioUrl: undefined }
        updatedScene.sfx = newSfx
      }
    }
    
    // Update state
    const updatedScenes = [...script.script.scenes]
    updatedScenes[sceneIndex] = updatedScene
    
    setScript({
      ...script,
      script: {
        ...script.script,
        scenes: updatedScenes
      }
    })
    
    // Force cache clear in ScreeningRoom
    setScriptEditedAt(Date.now())
    
    // Save to database
    try {
      await saveScenesToDatabase(updatedScenes)
      console.log(`[Delete Scene Audio] Deleted ${audioType} audio from Scene ${sceneIndex + 1}`)
      toast.success(`${audioType.charAt(0).toUpperCase() + audioType.slice(1)} audio deleted`)
    } catch (error) {
      console.error('[Delete Scene Audio] Failed to save:', error)
      toast.error('Failed to delete audio')
    }
    
    // Delete blobs in background
    if (urlsToDelete.length > 0) {
      fetch('/api/blobs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlsToDelete })
      }).catch(err => {
        console.warn('[Delete Scene Audio] Error deleting blobs:', err)
      })
    }
  }

  // Enhance scene context with AI-generated beat, character arc, and thematic context
  const handleEnhanceSceneContext = async (sceneIndex: number) => {
    if (!script?.script?.scenes?.[sceneIndex]) {
      console.error('[Enhance Scene Context] Scene not found')
      toast.error('Scene not found')
      return
    }

    const currentScene = script.script.scenes[sceneIndex]
    const allScenes = script.script.scenes

    try {
      const response = await fetch('/api/scene/generate-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          scene: currentScene,
          allScenes: allScenes.map((s: any) => ({
            heading: s.heading,
            action: s.action,
            visualDescription: s.visualDescription,
            narration: s.narration,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to enhance scene context')
      }

      const data = await response.json()
      
      if (data.success && data.sceneContext) {
        // Update local state with the new scene context
        const updatedScenes = [...script.script.scenes]
        updatedScenes[sceneIndex] = {
          ...currentScene,
          sceneContext: data.sceneContext,
        }

        const updatedScript = {
          ...script,
          script: {
            ...script.script,
            scenes: updatedScenes,
          },
        }

        setScript(updatedScript)

        // Persist to database
        try {
          const existingMetadata = project?.metadata || {}
          const existingVisionPhase = existingMetadata.visionPhase || {}
          
          await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metadata: {
                ...existingMetadata,
                visionPhase: {
                  ...existingVisionPhase,
                  script: updatedScript
                }
              }
            }),
          })
          
          console.log(`[Enhance Scene Context] Saved enhanced context for Scene ${sceneIndex + 1}`)
          toast.success('Scene details enhanced and saved')
        } catch (dbError) {
          console.error('[Enhance Scene Context] Database save error:', dbError)
          toast.error('Enhanced context generated but failed to save. Please try refreshing.')
        }

        console.log(`[Enhance Scene Context] Enhanced context for Scene ${sceneIndex + 1}`)
      }
    } catch (error) {
      console.error('[Enhance Scene Context] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to enhance scene context')
    }
  }

  // Update audio start time offset for playback timing
  const handleUpdateAudioStartTime = async (
    sceneIndex: number,
    audioType: 'description' | 'narration' | 'dialogue',
    startTime: number,
    dialogueIndex?: number
  ) => {
    if (!script?.script?.scenes?.[sceneIndex]) {
      console.error('[Update Audio Start Time] Scene not found')
      return
    }

    const currentScene = script.script.scenes[sceneIndex]
    const selectedLang = 'en' // Default language for now
    
    // Create updated scene based on audio type
    const updatedScene = { ...currentScene }
    
    if (audioType === 'description') {
      if (updatedScene.descriptionAudio?.[selectedLang]) {
        updatedScene.descriptionAudio = {
          ...updatedScene.descriptionAudio,
          [selectedLang]: {
            ...updatedScene.descriptionAudio[selectedLang],
            startTime
          }
        }
      }
    } else if (audioType === 'narration') {
      if (updatedScene.narrationAudio?.[selectedLang]) {
        updatedScene.narrationAudio = {
          ...updatedScene.narrationAudio,
          [selectedLang]: {
            ...updatedScene.narrationAudio[selectedLang],
            startTime
          }
        }
      }
    } else if (audioType === 'dialogue' && dialogueIndex !== undefined) {
      // Get dialogue audio array
      let dialogueAudioArray: any[] = []
      if (Array.isArray(updatedScene.dialogueAudio)) {
        dialogueAudioArray = [...updatedScene.dialogueAudio]
      } else if (updatedScene.dialogueAudio && typeof updatedScene.dialogueAudio === 'object') {
        dialogueAudioArray = [...(updatedScene.dialogueAudio[selectedLang] || [])]
      }
      
      // Find and update the matching dialogue audio
      const audioIdx = dialogueAudioArray.findIndex((a: any) => 
        a.dialogueIndex === dialogueIndex
      )
      if (audioIdx !== -1) {
        dialogueAudioArray[audioIdx] = {
          ...dialogueAudioArray[audioIdx],
          startTime
        }
      }
      
      // Update the scene
      if (Array.isArray(updatedScene.dialogueAudio)) {
        updatedScene.dialogueAudio = dialogueAudioArray
      } else {
        updatedScene.dialogueAudio = { ...updatedScene.dialogueAudio, [selectedLang]: dialogueAudioArray }
      }
    }
    
    // Update state
    const updatedScenes = [...script.script.scenes]
    updatedScenes[sceneIndex] = updatedScene
    
    setScript({
      ...script,
      script: {
        ...script.script,
        scenes: updatedScenes
      }
    })
    
    // Save to database (debounced - no toast for subtle updates)
    try {
      await saveScenesToDatabase(updatedScenes)
      console.log(`[Update Audio Start Time] Updated ${audioType} start time to ${startTime}s for Scene ${sceneIndex + 1}`)
    } catch (error) {
      console.error('[Update Audio Start Time] Failed to save:', error)
    }
  }

  // Scene score generation handler
  const handleGenerateSceneScore = async (sceneIndex: number) => {
    if (!script || !script.script?.scenes) return
    
    setGeneratingScoreFor(sceneIndex)
    try {
      const scene = script.script.scenes[sceneIndex]
      
      // Score stabilization: Get previous analysis with iteration tracking
      const currentIteration = scene.analysisIterationCount || scene.scoreAnalysis?.iterationCount || 0
      const appliedRecIds = scene.appliedRecommendationIds || scene.scoreAnalysis?.appliedRecommendationIds || []
      
      const previousAnalysis = scene.scoreAnalysis ? {
        score: scene.scoreAnalysis.overallScore || scene.scoreAnalysis.directorScore,
        directorScore: scene.scoreAnalysis.directorScore,
        audienceScore: scene.scoreAnalysis.audienceScore,
        appliedRecommendations: scene.appliedRecommendations || [],
        appliedRecommendationIds: appliedRecIds,
        iterationCount: currentIteration
      } : undefined
      
      console.log('[Vision] Score stabilization context:', { 
        sceneIndex, 
        currentIteration, 
        appliedRecIds: appliedRecIds.length,
        previousScore: previousAnalysis?.score 
      })
      
      const response = await fetch('/api/vision/analyze-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          scene,
          context: {
            previousScene: script.script.scenes[sceneIndex - 1],
            nextScene: script.script.scenes[sceneIndex + 1],
            characters,
            previousAnalysis  // Pass previous analysis context with iteration tracking
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze scene')
      }
      
      const data = await response.json()
      
      // Update scene with score and increment iteration count
      const updatedScenes = [...script.script.scenes]
      updatedScenes[sceneIndex] = {
        ...scene,
        scoreAnalysis: {
          overallScore: data.analysis.overallScore,
          directorScore: data.analysis.directorScore || data.analysis.overallScore,
          audienceScore: data.analysis.audienceScore || data.analysis.overallScore,
          generatedAt: new Date().toISOString(),
          recommendations: [
            ...data.analysis.directorRecommendations,
            ...data.analysis.audienceRecommendations
          ],
          iterationCount: currentIteration + 1,  // Increment iteration for score stabilization
          appliedRecommendationIds: appliedRecIds  // Preserve applied recommendations
        },
        analysisIterationCount: currentIteration + 1  // Also store at scene level
      }
      
      // Save to database
      await saveScenesToDatabase(updatedScenes)
      
      // Update local state
      setScript({
        ...script,
        script: {
          ...script.script,
          scenes: updatedScenes
        }
      })
      
      // Show success message
      try {
        const { toast } = require('sonner')
        toast.success('Scene score generated')
      } catch {}
      
    } catch (error) {
      console.error('[Vision] Failed to generate scene score:', error)
      try {
        const { toast } = require('sonner')
        toast.error('Failed to generate scene score')
      } catch {}
    } finally {
      setGeneratingScoreFor(null)
    }
  }

  // Helper function to get score color class
  const getScoreColorClass = (score: number): string => {
    if (score >= 85) {
      return 'bg-green-500 text-white dark:bg-green-600'
    } else if (score >= 75) {
      return 'bg-yellow-500 text-white dark:bg-yellow-600'
    } else {
      return 'bg-red-500 text-white dark:bg-red-600'
    }
  }

  // Helper function to get stoplight gradient colors for score cards
  const getScoreCardClasses = (score: number): { gradient: string; border: string; text: string; label: string } => {
    if (score >= 85) {
      return {
        gradient: 'bg-gradient-to-br from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10',
        border: 'border-green-200/50 dark:border-green-500/20',
        text: 'text-green-600 dark:text-green-400',
        label: 'text-green-500/70 dark:text-green-400/60'
      }
    } else if (score >= 75) {
      return {
        gradient: 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 dark:from-yellow-500/20 dark:to-yellow-600/10',
        border: 'border-yellow-200/50 dark:border-yellow-500/20',
        text: 'text-yellow-600 dark:text-yellow-400',
        label: 'text-yellow-500/70 dark:text-yellow-400/60'
      }
    } else {
      return {
        gradient: 'bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-red-600/10',
        border: 'border-red-200/50 dark:border-red-500/20',
        text: 'text-red-600 dark:text-red-400',
        label: 'text-red-500/70 dark:text-red-400/60'
      }
    }
  }
  const saveScenesToDatabase = async (updatedScenes: any[]) => {
    try {
      const existingMetadata = project?.metadata || {}
      const existingVisionPhase = existingMetadata.visionPhase || {}
      
      const payload = {
        metadata: {
          ...existingMetadata,
          visionPhase: {
            ...existingVisionPhase,
            script: {
              ...script,
              script: {
                ...script?.script,
                scenes: updatedScenes
              }
            },
            scenes: updatedScenes
          }
        }
      }
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[saveScenesToDatabase] Error response:', errorText)
        throw new Error(`Failed to save: ${response.status} ${errorText}`)
      }
      
      await response.json()
      
    } catch (error) {
      console.error('[saveScenesToDatabase] Failed to save scenes:', error)
      try {
        const { toast } = require('sonner')
        toast.error(`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } catch {}
      throw error // Re-throw to let caller know it failed
    }
  }

  const getUserId = () => {
    if (typeof window !== 'undefined') {
      let userId = localStorage.getItem('authUserId')
      if (!userId) {
        userId = crypto.randomUUID()
        localStorage.setItem('authUserId', userId)
      }
      return userId
    }
    return 'anonymous'
  }

  if (!mounted || !project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-sf-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{!mounted ? 'Initializing...' : 'Loading project...'}</p>
        </div>
      </div>
    )
  }

  // Extract Blueprint data for header display
  const filmTreatment = project?.metadata?.filmTreatmentVariant
  const projectTitle = filmTreatment?.title || project?.title || 'Untitled Project'
  const projectLogline = filmTreatment?.logline || project?.description
  const projectDuration = filmTreatment?.total_duration_seconds 
    ? `${Math.floor(filmTreatment.total_duration_seconds / 60)}:${String(filmTreatment.total_duration_seconds % 60).padStart(2, '0')}`
    : null

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-sf-background overflow-x-hidden max-w-full">
      
      {/* Workflow Navigation Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/studio/${projectId}`}>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Back to Blueprint</span>
              <span className="sm:hidden">Blueprint</span>
            </Button>
          </Link>
          
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-700" />
          
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-sf-primary" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Production</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/workflow/final-cut?projectId=${projectId}`}>
            <Button
              size="sm"
              className="bg-sf-primary hover:bg-sf-accent text-white"
            >
              <span className="hidden sm:inline">Continue to Final Cut</span>
              <span className="sm:hidden">Final Cut</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden overflow-x-hidden px-4 py-1 max-w-full min-w-0">
        <PanelGroup direction="horizontal" className="h-full max-w-full min-w-0 overflow-x-hidden">
          {/* Main Content: Script with Scene Cards */}
          <Panel defaultSize={65} minSize={40} maxSize={80} className="min-w-0 overflow-hidden overflow-x-hidden">
            <div className="h-full overflow-y-auto px-4 pt-2 min-w-0 w-full overflow-x-hidden">
              <ScriptPanel 
                script={script}
                onScriptChange={handleScriptChange}
                isGenerating={isGenerating}
                onExpandScene={expandScene}
                onExpandAllScenes={expandAllScenes}
                onGenerateSceneImage={handleGenerateSceneImage}
                characters={characters}
                projectId={projectId}
                visualStyle={project?.tone || project?.metadata?.filmTreatmentVariant?.tone}                                                                        
                validationWarnings={validationWarnings}
                validationInfo={validationInfo}
                onDismissValidationWarning={handleDismissValidationWarning}
                onGenerateSceneAudio={handleGenerateSceneAudio}
                onGenerateAllAudio={handleGenerateAllAudio}
                isGeneratingAudio={isGeneratingAudio}
                projectTitle={projectTitle}
                projectLogline={projectLogline}
                projectDuration={projectDuration || undefined}
                timelineSlot={
                  <SceneSelector
                    scenes={(script?.script?.scenes || []).map((scene: any, idx: number, allScenes: any[]) => {
                      const sceneId = scene.id || scene.sceneId || `scene-${idx}`
                      const isBookmarked = sceneBookmark?.sceneId === sceneId || sceneBookmark?.sceneNumber === idx + 1
                      const productionData = sceneProductionState[sceneId]
                      const segments = productionData?.segments || []
                      
                      // Calculate actual duration from segments if available
                      let actualDuration = 0
                      if (segments.length > 0) {
                        const lastSegment = segments[segments.length - 1]
                        if (lastSegment?.endTime) {
                          actualDuration = lastSegment.endTime
                        } else {
                          // Sum up segment durations
                          actualDuration = segments.reduce((sum: number, seg: any) => {
                            const segDuration = (seg.endTime || 0) - (seg.startTime || 0)
                            return sum + (segDuration > 0 ? segDuration : 0)
                          }, 0)
                        }
                      }
                      
                      // Calculate start time by summing previous scene durations
                      let startTime = 0
                      for (let i = 0; i < idx; i++) {
                        const prevScene = allScenes[i]
                        const prevSceneId = prevScene.id || prevScene.sceneId || `scene-${i}`
                        const prevProductionData = sceneProductionState[prevSceneId]
                        const prevSegments = prevProductionData?.segments || []
                        
                        if (prevSegments.length > 0) {
                          const lastPrevSeg = prevSegments[prevSegments.length - 1]
                          if (lastPrevSeg?.endTime) {
                            startTime += lastPrevSeg.endTime
                          }
                        } else {
                          // Use estimated duration for scenes without segments
                          startTime += prevScene.estimatedDuration || prevScene.duration || 15
                        }
                      }
                      
                      // Determine workflow status
                      const hasScript = !!(scene.content || scene.dialog || scene.narration || scene.description)
                      const hasDirection = !!(scene.direction || scene.sceneDirection || scene.cameraDirection)
                      const hasFrame = !!scene.imageUrl
                      const hasCallAction = segments.length > 0
                      
                      return {
                        id: sceneId,
                        sceneNumber: idx + 1,
                        name: typeof scene.heading === 'string' ? scene.heading : scene.heading?.text || `Scene ${idx + 1}`,
                        estimatedDuration: scene.estimatedDuration || scene.duration || 15,
                        actualDuration: actualDuration > 0 ? actualDuration : undefined,
                        startTime,
                        status: segments.every((s: any) => s.status === 'complete' || s.status === 'COMPLETE')
                          ? 'complete'
                          : segments.some((s: any) => s.status === 'complete' || s.status === 'COMPLETE' || s.status === 'generating' || s.status === 'GENERATING')
                          ? 'in-progress'
                          : 'not-started',
                        segmentCount: segments.length,
                        hasImage: !!scene.imageUrl,
                        hasAudio: !!(scene.narrationAudioUrl || scene.musicAudio),
                        isBookmarked,
                        hasScript,
                        hasDirection,
                        hasFrame,
                        hasCallAction,
                      }
                    })}
                    selectedSceneId={
                      selectedSceneIndex !== null
                        ? (script?.script?.scenes?.[selectedSceneIndex]?.id ||
                           script?.script?.scenes?.[selectedSceneIndex]?.sceneId ||
                           `scene-${selectedSceneIndex}`)
                        : undefined
                    }
                    onSelectScene={(sceneId) => {
                      const scenes = script?.script?.scenes || []
                      const idx = scenes.findIndex(
                        (s: any, i: number) =>
                          (s.id || s.sceneId || `scene-${i}`) === sceneId
                      )
                      if (idx !== -1) {
                        setSelectedSceneIndex(idx)
                      }
                    }}
                    onPrevScene={() => {
                      if (selectedSceneIndex !== null && selectedSceneIndex > 0) {
                        setSelectedSceneIndex(selectedSceneIndex - 1)
                      }
                    }}
                    onNextScene={() => {
                      const scenes = script?.script?.scenes || []
                      if (selectedSceneIndex !== null && selectedSceneIndex < scenes.length - 1) {
                        setSelectedSceneIndex(selectedSceneIndex + 1)
                      }
                    }}
                  />
                }
                onPlayScript={() => setIsPlayerOpen(true)}
                onAddScene={handleAddScene}
                onDeleteScene={handleDeleteScene}
                onReorderScenes={handleReorderScenes}
                onEditScene={handleEditScene}
                onUpdateSceneAudio={handleUpdateSceneAudio}
                onDeleteSceneAudio={handleDeleteSceneAudio}
                onEnhanceSceneContext={handleEnhanceSceneContext}
                onUpdateAudioStartTime={handleUpdateAudioStartTime}
                onGenerateSceneScore={handleGenerateSceneScore}
                generatingScoreFor={generatingScoreFor}
                getScoreColorClass={getScoreColorClass}
                directorScore={directorReview?.overallScore}
                audienceScore={audienceReview?.overallScore}
                onGenerateReviews={handleGenerateReviews}
                isGeneratingReviews={isGeneratingReviews}
                onShowReviews={() => setShowReviewModal(true)}
                onShowTreatmentReview={() => setShowTreatmentReview(true)}
                directorReview={directorReview}
                audienceReview={audienceReview}
                hasBYOK={!!byokSettings?.videoProvider}
                onOpenBYOK={() => setShowBYOKSettings(true)}
                onGenerateSceneDirection={handleGenerateSceneDirection}
                generatingDirectionFor={generatingDirectionFor}
                onGenerateAllCharacters={generateCharacters}
                sceneProductionData={sceneProductionState}
                sceneProductionReferences={(() => {
                  // Create a function that returns references for any scene ID
                  // References are project-wide, so they're the same for all scenes
                  const defaultReferences: SceneProductionReferences = {
                    characters,
                    sceneReferences,
                    objectReferences,
                  }
                  
                  // Build references object for all scenes in the script
                  const scriptScenes = script?.script?.scenes || scenes || []
                  const referencesMap: Record<string, SceneProductionReferences> = {}
                  
                  scriptScenes.forEach((scene: any, idx: number) => {
                    const sceneId = scene.id || `scene-${idx}`
                    referencesMap[sceneId] = defaultReferences
                  })
                  
                  // Also include any scenes that are in production state but might not be in script yet
                  Object.keys(sceneProductionState).forEach((sceneId) => {
                    if (!referencesMap[sceneId]) {
                      referencesMap[sceneId] = defaultReferences
                    }
                  })
                  
                  return referencesMap
                })()}
                onInitializeSceneProduction={handleInitializeSceneProduction}
                onSegmentPromptChange={handleSegmentPromptChange}
                onSegmentKeyframeChange={handleSegmentKeyframeChange}
                onSegmentDialogueAssignmentChange={handleSegmentDialogueAssignmentChange}
                onSegmentGenerate={handleSegmentGenerate}
                onSegmentUpload={handleSegmentUpload}
                onLockSegment={handleLockSegment}
                onSegmentAnimaticSettingsChange={handleSegmentAnimaticSettingsChange}
                onRenderedSceneUrlChange={handleRenderedSceneUrlChange}
                onProductionDataChange={handleProductionDataChange}
                onAddSegment={handleAddSegment}
                onAddFullSegment={handleAddFullSegment}
                onDeleteSegment={handleDeleteSegment}
                onSegmentResize={handleSegmentResize}
                onApplyIntelligentAlignment={handleApplyIntelligentAlignment}
                onReorderSegments={handleReorderSegments}
                onAudioClipChange={handleAudioClipChange}
                onCleanupStaleAudioUrl={handleCleanupStaleAudioUrl}
                onAddEstablishingShot={handleAddEstablishingShot}
                onEstablishingShotStyleChange={handleEstablishingShotStyleChange}
                onBackdropVideoGenerated={handleBackdropVideoGenerated}
                onGenerateEndFrame={handleGenerateEndFrame}
                onEndFrameGenerated={handleEndFrameGenerated}
                onSelectTake={handleSelectTake}
                onDeleteTake={handleDeleteTake}
                onGenerateSegmentFrames={handleGenerateSegmentFrames}
                onGenerateAllSegmentFrames={handleGenerateAllSegmentFrames}
                onEditFrame={handleEditFrame}
                onUploadFrame={handleUploadFrame}
                generatingFrameForSegment={generatingFrameForSegment}
                generatingFramePhase={generatingFramePhase}
                sceneAudioTracks={{}}
                  bookmarkedScene={sceneBookmark}
                  onBookmarkScene={handleBookmarkScene}
                  onJumpToBookmark={handleJumpToBookmark}
                  onMarkWorkflowComplete={handleMarkWorkflowComplete}
                  onDismissStaleWarning={handleDismissStaleWarning}
                sceneReferences={sceneReferences}
                objectReferences={objectReferences}
                showStoryboard={showSceneGallery}
                onToggleStoryboard={() => setShowSceneGallery(!showSceneGallery)}
                showDashboard={showDashboard}
                onToggleDashboard={() => setShowDashboard(!showDashboard)}
                isGeneratingKeyframe={isGeneratingKeyframe}
                generatingKeyframeSceneNumber={generatingKeyframeSceneNumber}
                selectedSceneIndex={selectedSceneIndex}
                onSelectSceneIndex={setSelectedSceneIndex}
                onAddToReferenceLibrary={async (imageUrl: string, name: string, sceneNumber: number) => {
                  // Add the scene frame to the scene references library
                  const newReference: VisualReference = {
                    id: crypto.randomUUID(),
                    type: 'scene',
                    name,
                    description: `Scene ${sceneNumber} keyframe`,
                    imageUrl,
                    createdAt: new Date().toISOString(),
                  }
                  const updatedSceneRefs = [...sceneReferences, newReference]
                  setSceneReferences(updatedSceneRefs)
                  
                  // Save to database
                  try {
                    const existingMetadata = project?.metadata || {}
                    const existingVisionPhase = existingMetadata.visionPhase || {}
                    
                    await fetch(`/api/projects/${projectId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        metadata: {
                          ...existingMetadata,
                          visionPhase: {
                            ...existingVisionPhase,
                            references: {
                              sceneReferences: updatedSceneRefs,
                              objectReferences
                            }
                          }
                        }
                      })
                    })
                  } catch (error) {
                    console.error('[onAddToReferenceLibrary] Error saving:', error)
                  }
                  
                  // Show success toast
                  toast.success(`Added "${name}" to Reference Library`)
                }}
                openScriptEditorWithInstruction={reviseScriptInstruction || null}
                onClearScriptEditorInstruction={() => setReviseScriptInstruction('')}
                storedTranslations={storedTranslations}
                onSaveTranslations={handleSaveTranslations}
              belowDashboardSlot={({ openGenerateAudio, openPromptBuilder }) => (
                <div className="rounded-2xl border border-white/10 bg-slate950/40 shadow-inner">
                  <div className="px-5 py-5">
                    {showSceneGallery && (
                      <div
                        id="scene-gallery-section"
                        className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-[0_15px_40px_rgba(8,8,20,0.35)]"
                      >
                          <SceneGallery
                            scenes={normalizeScenes(script)}
                            characters={characters}
                            projectTitle={project?.title}
                            onRegenerateScene={(index) => handleGenerateSceneImage(index)}
                            onOpenPromptBuilder={openPromptBuilder}
                            onGenerateScene={handleGenerateScene}
                            onUploadScene={handleUploadScene}
                            onClose={() => setShowSceneGallery(false)}
                            onAddToSceneLibrary={async (index, imageUrl) => {
                              const scenes = normalizeScenes(script)
                              const scene = scenes[index]
                              if (scene && imageUrl) {
                                const newReference: VisualReference = {
                                  id: crypto.randomUUID(),
                                  type: 'scene',
                                  name: `Scene ${index + 1} Frame`,
                                  description: scene.heading || scene.visualDescription || `Scene ${index + 1}`,
                                  imageUrl,
                                  createdAt: new Date().toISOString(),
                                }
                                const updatedSceneRefs = [...sceneReferences, newReference]
                                setSceneReferences(updatedSceneRefs)
                                
                                // Save to database
                                try {
                                  const existingMetadata = project?.metadata || {}
                                  const existingVisionPhase = existingMetadata.visionPhase || {}
                                  
                                  await fetch(`/api/projects/${projectId}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      metadata: {
                                        ...existingMetadata,
                                        visionPhase: {
                                          ...existingVisionPhase,
                                          references: {
                                            sceneReferences: updatedSceneRefs,
                                            objectReferences
                                          }
                                        }
                                      }
                                    })
                                  })
                                } catch (error) {
                                  console.error('[onAddToSceneLibrary] Error saving:', error)
                                }
                                
                                toast.success(`Added Scene ${index + 1} to Reference Library`)
                              }
                            }}
                            sceneProductionState={sceneProductionState}
                            productionReferences={{
                              characters,
                              sceneReferences,
                              objectReferences,
                            }}
                            onInitializeProduction={(sceneId, options) =>
                              handleInitializeSceneProduction(sceneId, options)
                            }
                            onSegmentPromptChange={(sceneId, segmentId, prompt) =>
                              handleSegmentPromptChange(sceneId, segmentId, prompt)
                            }
                            onSegmentGenerate={(sceneId, segmentId, mode) =>
                              handleSegmentGenerate(sceneId, segmentId, mode)
                            }
                            onSegmentUpload={(sceneId, segmentId, file) =>
                              handleSegmentUpload(sceneId, segmentId, file)
                            }
                            onOpenAssets={openGenerateAudio}
                            onOpenPreview={() => setIsPlayerOpen(true)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              />
            </div>
          </Panel>
          
          <PanelResizeHandle className="w-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-col-resize" />
          
          {/* Right Sidebar: Reference Library */}
          <Panel defaultSize={15} minSize={15} maxSize={40} className="min-w-0 overflow-x-hidden">
            <div className="h-full overflow-y-auto overflow-x-hidden pl-6 min-w-0">
              {/* Merge Duplicates Button */}
              {findPotentialDuplicates(characters).length > 0 && (
                <div className="mb-4 px-2">
                  <Button
                    onClick={() => {
                      const duplicates = findPotentialDuplicates(characters)
                      if (duplicates.length > 0) {
                        // Auto-select first group for merge
                        setMergePrimaryCharId(duplicates[0][0].id)
                        setMergeDuplicateCharIds(duplicates[0].slice(1).map((c: any) => c.id))
                        setMergeDialogOpen(true)
                      }
                    }}
                    variant="outline"
                    className="w-full text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Merge Duplicates ({findPotentialDuplicates(characters).reduce((sum, group) => sum + group.length - 1, 0)} duplicate{findPotentialDuplicates(characters).reduce((sum, group) => sum + group.length - 1, 0) !== 1 ? 's' : ''})
                  </Button>
                </div>
              )}
              
              {/* Narration Voice Selector */}
              
              <VisionReferencesSidebar
                projectId={projectId}
                characters={characters}
                onRegenerateCharacter={handleRegenerateCharacter}
                onGenerateCharacter={handleGenerateCharacter}
                onUploadCharacter={handleUploadCharacter}
                onApproveCharacter={handleApproveCharacter}
                onUpdateCharacterAttributes={handleUpdateCharacterAttributes}
                onUpdateCharacterVoice={handleUpdateCharacterVoice}
                onUpdateCharacterAppearance={handleUpdateCharacterAppearance}
                onUpdateCharacterName={handleUpdateCharacterName}
                onUpdateCharacterRole={handleUpdateCharacterRole}
                onUpdateCharacterWardrobe={handleUpdateCharacterWardrobe}
                onAddCharacter={handleAddCharacter}
                onRemoveCharacter={handleRemoveCharacter}
                ttsProvider={ttsProvider}
                uploadingRef={uploadingRef}
                setUploadingRef={setUploadingRef}
                sceneReferences={sceneReferences}
                objectReferences={objectReferences}
                onCreateReference={(type, payload) => handleCreateReference(type, payload)}
                onRemoveReference={(type, referenceId) => handleRemoveReference(type, referenceId)}
                onUpdateReferenceImage={handleUpdateReferenceImage}
                onEditCharacterImage={handleEditCharacterImage}
                scenes={script?.script?.scenes || []}
                backdropCharacters={characters.map(c => ({ id: c.id, name: c.name, description: c.description, appearance: c.appearance }))}
                onBackdropGenerated={handleBackdropGenerated}
                onInsertBackdropSegment={handleInsertBackdropSegment}
                onObjectGenerated={handleObjectGenerated}
                screenplayContext={{
                  genre: project?.genre,
                  tone: project?.tone || project?.metadata?.filmTreatmentVariant?.tone_description || project?.metadata?.filmTreatmentVariant?.tone,
                  setting: project?.metadata?.filmTreatmentVariant?.setting,
                  logline: script?.logline || project?.description,
                  visualStyle: project?.metadata?.filmTreatmentVariant?.visual_style || project?.metadata?.filmTreatmentVariant?.style,
                }}
              />
            </div>
          </Panel>
        </PanelGroup>
      </div>
      
      {/* Generation Progress Indicator */}
      <div suppressHydrationWarning>
        {isGenerating && (
          <GenerationProgress progress={generationProgress} />
        )}
      </div>

      {/* Screening Room V2 (Full-screen overlay) */}
      {isPlayerOpen && script && (
        <ScreeningRoomV2
          script={script}
          characters={characters}
          onClose={() => setIsPlayerOpen(false)}
          scriptEditedAt={scriptEditedAt}
          sceneProductionState={sceneProductionState}
          projectId={projectId}
          storedTranslations={storedTranslations}
        />
      )}

      {/* Navigation Warning Dialog */}
      <NavigationWarningDialog
        open={showNavigationWarning}
        onOpenChange={setShowNavigationWarning}
        targetHref={projectId ? `/dashboard/studio/${projectId}` : '/dashboard/studio/new-project'}
        targetLabel="The Blueprint"
      />

      {/* Film Treatment Review Modal */}
      <FilmTreatmentReviewModal
        open={showTreatmentReview}
        onOpenChange={setShowTreatmentReview}
        filmTreatmentVariant={project?.metadata?.filmTreatmentVariant}
        filmTreatmentHtml={project?.metadata?.filmTreatment}
        script={script}
        characters={characters}
      />

      {/* Script Review Modal */}
      <ScriptReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        directorReview={directorReview}
        audienceReview={audienceReview}
        onRegenerate={handleGenerateReviews}
        isGenerating={isGeneratingReviews}
        projectId={projectId}
        script={script?.script}
        characters={characters}
        scoreOutdated={reviewsOutdated}
        reviewHistory={project?.metadata?.visionPhase?.reviewHistory || []}
        onSceneAnalysisComplete={handleSceneAnalysisComplete}
        onScriptOptimized={async (optimizedScript) => {
          // Apply the optimized script directly
          if (optimizedScript?.scenes) {
            const updatedScript = {
              ...script,
              script: {
                ...script?.script,
                scenes: optimizedScript.scenes
              }
            }
            setScript(updatedScript)
            
            // Mark score as outdated since script has changed
            setReviewsOutdated(true)
            
            // Persist to database
            try {
              const existingMetadata = project?.metadata || {}
              const existingVisionPhase = existingMetadata.visionPhase || {}
              
              await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  metadata: {
                    ...existingMetadata,
                    visionPhase: {
                      ...existingVisionPhase,
                      script: updatedScript
                    }
                  }
                })
              })
            } catch (error) {
              console.error('[ScriptReview] Failed to save optimized script:', error)
              toast.error('Script revised but failed to save to database')
            }
          }
        }}
        onReviseScript={(recommendations: string[]) => {
          // Legacy fallback - opens Script Editor
          const instruction = recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n\n')
          setReviseScriptInstruction(instruction)
          setShowReviewModal(false)
          toast.success('Opening Script Editor with review recommendations...')
        }}
      />

      {/* Scene Editor Modal */}
      {editingSceneIndex !== null && script?.script?.scenes?.[editingSceneIndex] && (
        <SceneEditorModal
          isOpen={isSceneEditorOpen}
          onClose={() => {
            setIsSceneEditorOpen(false)
            setEditingSceneIndex(null)
          }}
          scene={script.script.scenes[editingSceneIndex]}
          sceneIndex={editingSceneIndex}
          projectId={projectId}
          characters={characters}
          previousScene={editingSceneIndex > 0 ? script.script.scenes[editingSceneIndex - 1] : undefined}
          nextScene={editingSceneIndex < script.script.scenes.length - 1 ? script.script.scenes[editingSceneIndex + 1] : undefined}
          script={{
            title: script.title,
            logline: script.logline,
            scenes: script.script.scenes,
            characters: characters
          }}
          onApplyChanges={handleApplySceneChanges}
          onUpdateSceneScores={handleUpdateSceneScores}
        />
      )}

      {/* Audio Generation Progress */}
      {audioProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">
              Generating Audio
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Scene {audioProgress.current} of {audioProgress.total}</span>
                <span className="text-gray-400">
                  {Math.round((audioProgress.current / audioProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(audioProgress.current / audioProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-400">{audioProgress.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* Image Generation Progress */}
      {imageProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">
              Generating Scene Images
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Scene {imageProgress.scene} of {imageProgress.total}</span>
                <span className="text-gray-400">
                  {Math.round((imageProgress.scene / imageProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(imageProgress.scene / imageProgress.total) * 100}%` }}
                />
              </div>
              {imageProgress.sceneHeading && (
                <p className="text-xs text-gray-400 truncate">
                  {imageProgress.sceneHeading}
                </p>
              )}
              <p className="text-sm text-gray-400">Status: {imageProgress.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Share Screening Room
              </h3>
              <button
                onClick={() => setShareUrl(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Anyone with this link can view your Screening Room presentation. 
              They won't need a Sceneflow account.
            </p>
            
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>• Viewers can watch with full audio and translations</p>
              <p>• They cannot edit or download your project</p>
              <p>• You can disable this link anytime</p>
            </div>
            
            <button
              onClick={() => setShareUrl(null)}
              className="w-full mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* BYOK Settings Panel */}
      <BYOKSettingsPanel
        isOpen={showBYOKSettings}
        onClose={() => setShowBYOKSettings(false)}
        settings={byokSettings}
        onUpdateSettings={setBYOKSettings}
        project={project}
        projectId={projectId}
      />
      
      {/* Character Deletion Warning Dialog */}
      <Dialog open={deletionDialogOpen} onOpenChange={setDeletionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Character with Dialogue</DialogTitle>
            <DialogDescription>
              The character "{deletionCharacter?.name}" has {affectedDialogueCount} dialogue line{affectedDialogueCount !== 1 ? 's' : ''} in the script. 
              What would you like to do with these dialogue lines?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Action Selection */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setDeletionAction('clear')
                  setReassignmentCharacterId('')
                }}
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                  deletionAction === 'clear'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Clear Character IDs
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Remove character IDs from dialogue lines. The dialogue will match characters by name using the improved fallback matching.
                </div>
              </button>
              
              <button
                onClick={() => setDeletionAction('reassign')}
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                  deletionAction === 'reassign'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Reassign to Another Character
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Assign all dialogue lines to a different character.
                </div>
              </button>
              
              {deletionAction === 'reassign' && (
                <div className="ml-4 mt-2">
                  <Select
                    value={reassignmentCharacterId}
                    onValueChange={setReassignmentCharacterId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select character to reassign to" />
                    </SelectTrigger>
                    <SelectContent>
                      {characters
                        .filter(c => c.id !== deletionCharacter?.id && c.type !== 'narrator')
                        .map(char => (
                          <SelectItem key={char.id} value={char.id}>
                            {char.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletionDialogOpen(false)
                setDeletionCharacter(null)
                setAffectedDialogueCount(0)
                setDeletionAction(null)
                setReassignmentCharacterId('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeletionDialogAction}
              disabled={!deletionAction || (deletionAction === 'reassign' && !reassignmentCharacterId)}
              className={
                deletionAction === 'clear' 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            >
              {deletionAction === 'reassign' ? 'Reassign & Delete' : deletionAction === 'clear' ? 'Clear IDs & Delete' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Character Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Merge Duplicate Characters</DialogTitle>
            <DialogDescription>
              Select which character to keep and which duplicates to merge into it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {(() => {
              const duplicates = findPotentialDuplicates(characters)
              const currentGroup = duplicates.find(group => 
                group.some(c => c.id === mergePrimaryCharId || mergeDuplicateCharIds.includes(c.id))
              ) || []
              
              if (currentGroup.length === 0) return null
              
              return (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Keep this character:
                    </label>
                    <Select
                      value={mergePrimaryCharId}
                      onValueChange={(value) => {
                        setMergePrimaryCharId(value)
                        // Update duplicates to be all others in the group
                        setMergeDuplicateCharIds(
                          currentGroup.filter(c => c.id !== value).map(c => c.id)
                        )
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentGroup.map(char => (
                          <SelectItem key={char.id} value={char.id}>
                            {char.name}
                            {char.voiceConfig && (
                              <span className="ml-2 text-xs text-gray-500">(has voice)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Will be merged (duplicates):
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      {mergeDuplicateCharIds.length === 0 ? (
                        <p className="text-sm text-gray-500">No duplicates to merge</p>
                      ) : (
                        <ul className="space-y-1">
                          {currentGroup
                            .filter(c => mergeDuplicateCharIds.includes(c.id))
                            .map(char => (
                              <li key={char.id} className="text-sm text-gray-700 dark:text-gray-300">
                                • {char.name}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      All dialogue lines from duplicate characters will be assigned to the primary character.
                    </p>
                  </div>
                </>
              )
            })()}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMergeDialogOpen(false)
                setMergePrimaryCharId('')
                setMergeDuplicateCharIds([])
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (mergePrimaryCharId && mergeDuplicateCharIds.length > 0) {
                  handleMergeCharacters(mergePrimaryCharId, mergeDuplicateCharIds)
                }
              }}
              disabled={!mergePrimaryCharId || mergeDuplicateCharIds.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Merge Characters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

