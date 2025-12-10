/**
 * Vision Page - Main workflow page for script and visual development
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 * @see /CONTRIBUTING.md for development guidelines
 * 
 * CRITICAL: Scene data source of truth is `script.script.scenes`
 * Do NOT create separate `scenes` state - this causes sync bugs.
 * 
 * Key handlers:
 * - handleGenerateScene: Updates script.script.scenes, not separate state
 * - handleUploadScene: Updates script.script.scenes, not separate state
 */
'use client'
// Force rebuild: 2024-11-01

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
 import { upload } from '@vercel/blob/client'
import { toast } from 'sonner'
import { ContextBar } from '@/components/layout/ContextBar'
import { ScriptPanel } from '@/components/vision/ScriptPanel'
import { SceneSelector } from '@/components/vision/SceneSelector'
import { SceneGallery } from '@/components/vision/SceneGallery'
import { GenerationProgress } from '@/components/vision/GenerationProgress'
import { ScreeningRoom } from '@/components/vision/ScriptPlayer'
import { ImageQualitySelector } from '@/components/vision/ImageQualitySelector'
import { VoiceSelector } from '@/components/tts/VoiceSelector'
import { Button, buttonVariants } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Share2, ArrowRight, ArrowLeft, Play, Volume2, Image as ImageIcon, Copy, Check, X, Settings, Info, Users, ChevronDown, ChevronUp, Eye, Sparkles, BarChart3, Save, Home, FolderOpen, Key, CreditCard, User, Bookmark, FileText } from 'lucide-react'

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
import { SceneEditorModal } from '@/components/vision/SceneEditorModal'
import { NavigationWarningDialog } from '@/components/workflow/NavigationWarningDialog'
import { findSceneCharacters } from '../../../../../lib/character/matching'
import { toCanonicalName, generateAliases } from '@/lib/character/canonical'
import { v4 as uuidv4 } from 'uuid'
import { useProcessWithOverlay } from '@/hooks/useProcessWithOverlay'
import { DetailedSceneDirection } from '@/types/scene-direction'
import { cn } from '@/lib/utils'
import { VisionReferencesSidebar } from '@/components/vision/VisionReferencesSidebar'
import { VisualReference, VisualReferenceType, VisionReferencesPayload } from '@/types/visionReferences'
import { uploadAssetToBlob } from '@/lib/storage/upload'
import { SceneProductionData, SceneProductionReferences } from '@/components/vision/scene-production'

// Scene Analysis interface for score generation
interface SceneAnalysis {
  overallScore: number
  directorScore: number
  audienceScore: number
  generatedAt: string
  recommendations: any[]
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
  [key: string]: any
}

type SceneBookmark = {
  sceneId: string
  sceneNumber: number
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

const ensureDescriptionCharacter = (characters: Character[], descriptionVoice?: VoiceConfig): Character => {
  const existingDescription = characters.find(char => char.type === 'description')

  if (existingDescription) {
    return existingDescription
  }

  return {
    id: 'scene-description-voice',
    name: 'Scene Description',
    description: 'Voiceover that introduces the scene before narration begins',
    type: 'description',
    voiceConfig: descriptionVoice || {
      provider: 'elevenlabs',
      voiceName: 'Allison',
      voiceId: 'EXAVITQu4vr4xnSDxMaL'
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
  // NEW: Voice assignment
  voiceConfig?: VoiceConfig
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
  const [characters, setCharacters] = useState<any[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingRef, setUploadingRef] = useState<Record<string, boolean>>({})
  const [validationWarnings, setValidationWarnings] = useState<Record<number, string>>({})
  
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
  const [voiceAssignments, setVoiceAssignments] = useState<Record<string, any>>({})
  const [sceneReferences, setSceneReferences] = useState<VisualReference[]>([])
  const [objectReferences, setObjectReferences] = useState<VisualReference[]>([])
  const [sceneProductionState, setSceneProductionState] = useState<Record<string, SceneProductionData>>({})
  const [sceneBookmark, setSceneBookmark] = useState<SceneBookmark | null>(null)
  useEffect(() => {
    const productionScenes =
      project?.metadata?.visionPhase?.production?.scenes as Record<string, SceneProductionData> | undefined
    if (productionScenes && typeof productionScenes === 'object') {
      try {
        const cloned = JSON.parse(JSON.stringify(productionScenes)) as Record<string, SceneProductionData>
        setSceneProductionState(cloned)
      } catch {
        setSceneProductionState(productionScenes)
      }
    }
  }, [project?.metadata?.visionPhase?.production?.scenes])


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
    const scriptScenes = script?.script?.scenes || []
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
  }, [sceneBookmark, script?.script?.scenes])

  // Handler to jump to bookmarked scene
  const handleJumpToBookmark = useCallback(() => {
    if (bookmarkedSceneIndex === -1) return
    setSelectedSceneIndex(bookmarkedSceneIndex)
    // Scroll to scene
    const sceneElement = document.getElementById(`scene-card-${bookmarkedSceneIndex}`)
    sceneElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [bookmarkedSceneIndex])

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

  // Scene production handlers
  const persistSceneProduction = useCallback(
    async (nextState: Record<string, SceneProductionData>, nextScenes: Scene[]) => {
      if (!project?.id) return
      try {
        const currentMetadata = project.metadata ?? {}
        const currentVisionPhase = currentMetadata.visionPhase ?? {}
        const safeScenes =
          typeof (globalThis as any).structuredClone === 'function'
            ? (globalThis as any).structuredClone(nextScenes)
            : JSON.parse(JSON.stringify(nextScenes))

        const nextVisionPhase = {
          ...currentVisionPhase,
          references: {
            sceneReferences,
            objectReferences,
          },
          scenes: safeScenes,
          script: currentVisionPhase.script
            ? {
                ...currentVisionPhase.script,
                script: {
                  ...currentVisionPhase.script.script,
                  scenes: safeScenes,
                },
              }
            : currentVisionPhase.script,
          production: {
            ...(currentVisionPhase.production ?? {}),
            lastUpdated: new Date().toISOString(),
            scenes: nextState,
          },
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

        setProject((prev) => (prev ? { ...prev, metadata: nextMetadata } : prev))
      } catch (error) {
        console.error('[SceneProduction] Failed to persist production data', error)
      }
    },
    [project?.id, project?.metadata, sceneReferences, objectReferences, setProject]
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

        void persistSceneProduction(nextState, nextScenesRef)
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
        imageUrl = await uploadAssetToBlob(payload.file, filename, project.id)
      }

      const newReference: VisualReference = {
        id: crypto.randomUUID(),
        type,
        name: payload.name,
        description: payload.description,
        imageUrl,
        createdAt: new Date().toISOString(),
      }

      if (type === 'scene') {
        setSceneReferences((prev) => [...prev, newReference])
      } else {
        setObjectReferences((prev) => [...prev, newReference])
      }
    },
    [project?.id]
  )

  const handleRemoveReference = useCallback(
    (type: VisualReferenceType, referenceId: string) => {
      if (type === 'scene') {
        setSceneReferences((prev) => prev.filter((reference) => reference.id !== referenceId))
      } else {
        setObjectReferences((prev) => prev.filter((reference) => reference.id !== referenceId))
      }
    },
    []
  )

  const handleInitializeSceneProduction = useCallback(
    async (sceneId: string, { targetDuration }: { targetDuration: number }) => {
      if (!project?.id) {
        throw new Error('Project must be loaded before segmenting a scene.')
      }

      const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          preferredDuration: targetDuration,
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

  const handleSegmentGenerate = useCallback(
    async (
      sceneId: string,
      segmentId: string,
      mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD',
      options?: { 
        startFrameUrl?: string
        prompt?: string
        negativePrompt?: string
        duration?: number
        aspectRatio?: '16:9' | '9:16'
        resolution?: '720p' | '1080p'
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
          body: JSON.stringify({
            prompt,
            genType: mode,
            startFrameUrl: options?.startFrameUrl,
            sceneId,
            projectId: project.id,
            // Pass video-specific options from prompt builder
            negativePrompt: options?.negativePrompt,
            duration: options?.duration,
            aspectRatio: options?.aspectRatio,
            resolution: options?.resolution,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(errorText || 'Failed to generate asset')
        }

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Asset generation failed')
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
              thumbnailUrl: data.assetType === 'image' ? data.assetUrl : (data.lastFrameUrl || undefined),
              status: data.status === 'COMPLETE' ? 'COMPLETE' : 'GENERATING',
              durationSec: segment.endTime - segment.startTime,
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
                endFrameUrl: data.lastFrameUrl || segment.references.endFrameUrl,
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
        // Update status to ERROR
        applySceneProductionUpdate(sceneId, (current) => {
          if (!current) return current
          const segments = current.segments.map((segment) =>
            segment.segmentId === segmentId ? { ...segment, status: 'ERROR' } : segment
          )
          return { ...current, segments }
        })

        try {
          const { toast } = require('sonner')
          toast.error(error instanceof Error ? error.message : 'Failed to generate asset')
        } catch {}
      }
    },
    [applySceneProductionUpdate, project?.id, sceneProductionState]
  )

  const handleSegmentUpload = useCallback(
    async (sceneId: string, segmentId: string, file: File) => {
      const objectUrl = URL.createObjectURL(file)
      applySceneProductionUpdate(sceneId, (current) => {
        if (!current) return current
        const segments = current.segments.map((segment) =>
          segment.segmentId === segmentId
            ? {
                ...segment,
                status: 'UPLOADED',
                assetType: file.type.startsWith('image') ? 'image' : 'video',
                activeAssetUrl: objectUrl,
                takes: [
                  {
                    id: `${segmentId}-take-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    assetUrl: objectUrl,
                    thumbnailUrl: file.type.startsWith('image') ? objectUrl : segment.activeAssetUrl,
                    status: 'UPLOADED',
                    notes: 'User upload',
                  },
                  ...segment.takes,
                ],
              }
            : segment
        )
        return { ...current, segments }
      })

      try {
        const { toast } = require('sonner')
        toast.success('Uploaded media linked to segment.')
      } catch {}
    },
    [applySceneProductionUpdate]
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
  
  // Handle audio clip changes (start time, duration)
  const handleAudioClipChange = useCallback(
    (sceneId: string, trackType: string, clipId: string, changes: { startTime?: number; duration?: number }) => {
      // Update the scene's audio track data
      setScenes((prevScenes) => {
        return prevScenes.map((scene, idx) => {
          // Match by sceneId
          const sceneKey = (scene as any).sceneId || (scene as any).id || `scene-${idx}`
          if (sceneKey !== sceneId) return scene
          
          const updatedScene = { ...scene } as any
          
          // Update the appropriate audio track based on trackType
          if (trackType === 'voiceover' && changes.startTime !== undefined) {
            // Store the start time offset for narration
            updatedScene.narrationStartTime = changes.startTime
          } else if (trackType === 'dialogue') {
            // Update dialogue start times
            if (updatedScene.dialogueAudio?.en) {
              const dialogueIdx = parseInt(clipId.replace('dialogue-', ''))
              if (!isNaN(dialogueIdx) && updatedScene.dialogueAudio.en[dialogueIdx]) {
                updatedScene.dialogueAudio = {
                  ...updatedScene.dialogueAudio,
                  en: updatedScene.dialogueAudio.en.map((d: any, i: number) => 
                    i === dialogueIdx 
                      ? { ...d, startTime: changes.startTime ?? d.startTime }
                      : d
                  )
                }
              }
            }
          } else if (trackType === 'sfx') {
            // Update SFX start times
            const sfxIdx = parseInt(clipId.replace('sfx-', ''))
            if (!isNaN(sfxIdx) && updatedScene.sfx?.[sfxIdx]) {
              updatedScene.sfx = updatedScene.sfx.map((s: any, i: number) =>
                i === sfxIdx
                  ? { ...s, startTime: changes.startTime ?? s.startTime }
                  : s
              )
            }
          }
          
          return updatedScene
        })
      })
      
      console.log('[Audio Clip Change]', { sceneId, trackType, clipId, changes })
    },
    []
  )
  
  // Script review state
  const [directorReview, setDirectorReview] = useState<any>(null)
  const [audienceReview, setAudienceReview] = useState<any>(null)
  const [isGeneratingReviews, setIsGeneratingReviews] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewsOutdated, setReviewsOutdated] = useState(false)
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
      batch: 0
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
  
  // Handle character wardrobe update
  const handleUpdateCharacterWardrobe = async (characterId: string, wardrobe: { defaultWardrobe?: string; wardrobeAccessories?: string }) => {
    try {
      // Update local state first
      const updatedCharacters = characters.map(char => {
        const charId = char.id || characters.indexOf(char).toString()
        return charId === characterId 
          ? { ...char, defaultWardrobe: wardrobe.defaultWardrobe, wardrobeAccessories: wardrobe.wardrobeAccessories }
          : char
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
      loadProject()
    }
  }, [projectId, mounted])

  // Script review functions
  const handleGenerateReviews = async () => {
    if (!script || !projectId) return
    
    setIsGeneratingReviews(true)
    try {
      await execute(async () => {
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
            }
          })
        })

        if (!response.ok) throw new Error('Failed to generate reviews')
        
        const data = await response.json()
        
        if (data.success) {
          console.log('[Script Review] Reviews generated successfully:', {
            directorScore: data.director?.overallScore,
            audienceScore: data.audience?.overallScore
          })
          
          // Save reviews to project metadata BEFORE updating local state
          if (project) {
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
            setDirectorReview(data.director)
            setAudienceReview(data.audience)
            setReviewsOutdated(false)
            
            console.log('[Script Review] State updated with new reviews:', {
              directorScore: data.director?.overallScore,
              audienceScore: data.audience?.overallScore
            })
            
            // No need to reload project - reviews are already in state and saved to DB
          } else {
            // If no project in state, still update local state
            setDirectorReview(data.director)
            setAudienceReview(data.audience)
            setReviewsOutdated(false)
          }
          
          try {
            const { toast } = require('sonner')
            toast.success('Script reviews generated and saved successfully!')
          } catch {}
        }
      }, { message: 'Generating director and audience reviews...', estimatedDuration: 25 })
    } catch (error) {
      console.error('[Script Review] Error:', error)
      try {
        const { toast } = require('sonner')
        toast.error(error instanceof Error ? error.message : 'Failed to generate script reviews')
      } catch {}
    } finally {
      setIsGeneratingReviews(false)
    }
  }

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
      if (visionPhase) {
        if (visionPhase.script) {
          // Migrate audio structure if needed
          const { migrateScriptAudio } = await import('@/lib/audio/audioMigration')
          const { script: migratedScript, needsMigration } = migrateScriptAudio(visionPhase.script)
          
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

          // Ensure narrator/description characters exist so voices can be configured independently
          const narratorCharacter = ensureNarratorCharacter(charactersWithIds, narrationVoice || undefined)
          const charactersWithNarrator = charactersWithIds.some(c => c.type === 'narrator') 
            ? charactersWithIds 
            : [...charactersWithIds, narratorCharacter]

          const descriptionCharacter = ensureDescriptionCharacter(charactersWithNarrator, visionPhase.descriptionVoice || undefined)
          const charactersWithDescription = charactersWithNarrator.some(c => c.type === 'description')
            ? charactersWithNarrator
            : [...charactersWithNarrator, descriptionCharacter]
          
          setCharacters(charactersWithDescription)
          
          // Sync narration voice from narrator character (single source of truth)
          const narratorChar = charactersWithDescription.find(c => c.type === 'narrator')
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
          const descriptionChar = charactersWithDescription.find(c => c.type === 'description')
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
            message: 'Generating script... This may take 2-3 minutes.',
            estimatedDuration: 120 
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
                    batch: data.batch
                  }
                }))
                console.log(`[Vision] ${data.status} (${data.scenesGenerated}/${data.totalScenes})`)
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
    const scene = script?.script?.scenes?.[sceneIdx]
    // Accept any scene description field: visualDescription, action, summary, or heading
    const sceneDescription = scene?.visualDescription || scene?.action || scene?.summary || scene?.heading
    if (!scene || !sceneDescription) {
      console.warn('No visual description available for scene', sceneIdx)
      try { const { toast } = require('sonner'); toast.error('Scene must have a description to generate image') } catch {}
      return
    }
    
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
      
      const response = await fetch('/api/scene/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
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
          characters: sceneCharacters,  // Characters array
          quality: imageQuality
        })
      })
      
      const data = await response.json()
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
      
      // Update scene with image
      const updatedScenes = [...(script.script.scenes || [])]
      updatedScenes[sceneIdx] = {
        ...updatedScenes[sceneIdx],
        imageUrl: data.imageUrl,
        imagePrompt: prompt
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
            includeSFX: true
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
                  
                  // Retry logic for project reload after batch audio generation (skip auto-generation to prevent script regeneration bug)                        
                  let retries = 3
                  while (retries > 0) {
                    try {
                      await loadProject(true) // Skip auto-generation to prevent accidental script regeneration                                                   
                      break // Success!
                    } catch (error) {
                      retries--
                      console.warn(`[Generate All Audio] Project reload failed, ${retries} retries left`)                                                         
                      if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s before retry                                                           
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
  const handleGenerateSceneAudio = async (sceneIdx: number, audioType: 'narration' | 'dialogue' | 'description', characterName?: string, dialogueIndex?: number, language: string = 'en') => {
    const scene = script?.script?.scenes?.[sceneIdx]
    if (!scene) {
      console.error('[Generate Scene Audio] Scene not found')
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
      if (audioType === 'narration') {
        text = scene.narration
      } else if (audioType === 'description') {
        text = scene.visualDescription || scene.action || scene.summary || scene.heading
      } else {
        text = dialogueLine?.line
      }
      
      if (!text) {
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
            normalized: normalizedSearchName
          })
          try { 
            const { toast } = require('sonner')
            toast.error(`Character "${normalizedSearchName}" not found. Please check character names match in Character Library.`, {
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
          language,
          characterName,
          dialogueIndex
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Update script state immediately with audio URL (multi-language structure)
        // Create a new object reference to ensure React detects the change
        setScript((prevScript: any) => {
          const updated = { ...prevScript }
          if (updated.script?.scenes?.[sceneIdx]) {
            // Create a new scenes array to ensure reference change
            const updatedScenes = [...updated.script.scenes]
            const scene = { ...updatedScenes[sceneIdx] }
            
            if (audioType === 'narration') {
              // Initialize narrationAudio if it doesn't exist
              if (!scene.narrationAudio) {
                scene.narrationAudio = {}
              } else {
                // Create a new object to ensure reference change
                scene.narrationAudio = { ...scene.narrationAudio }
              }
              
              // Store language-specific narration audio
              scene.narrationAudio[language] = {
                url: data.audioUrl,
                duration: data.duration || undefined,
                generatedAt: new Date().toISOString(),
                voiceId: voiceConfig.voiceId
              }
              
              // Maintain backward compatibility: set narrationAudioUrl for English
              if (language === 'en') {
                scene.narrationAudioUrl = data.audioUrl
                scene.narrationAudioGeneratedAt = new Date().toISOString()
              }
              
              updatedScenes[sceneIdx] = scene
              updated.script = { ...updated.script, scenes: updatedScenes }
            } else if (audioType === 'description') {
              if (!scene.descriptionAudio) {
                scene.descriptionAudio = {}
              } else {
                scene.descriptionAudio = { ...scene.descriptionAudio }
              }

              scene.descriptionAudio[language] = {
                url: data.audioUrl,
                duration: data.duration || undefined,
                generatedAt: new Date().toISOString(),
                voiceId: voiceConfig.voiceId
              }

              // Maintain backward compatibility: set descriptionAudioUrl for English
              if (language === 'en') {
                scene.descriptionAudioUrl = data.audioUrl
                scene.descriptionAudioGeneratedAt = new Date().toISOString()
              }

              updatedScenes[sceneIdx] = scene
              updated.script = { ...updated.script, scenes: updatedScenes }
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
                // Create a new object to ensure reference change
                scene.dialogueAudio = { ...scene.dialogueAudio }
              }
              
              // Initialize language array if it doesn't exist
              if (!scene.dialogueAudio[language]) {
                scene.dialogueAudio[language] = []
              }
              
              const dialogueArray = [...scene.dialogueAudio[language]]
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
              
              scene.dialogueAudio[language] = dialogueArray
              
              // Maintain backward compatibility: DO NOT overwrite the object structure
              // The object structure { en: [...], th: [...], es: [...] } must be preserved
              // Setting scene.dialogueAudio = dialogueArray would delete all other languages!
              scene.dialogueAudioGeneratedAt = new Date().toISOString()
              
              updatedScenes[sceneIdx] = scene
              updated.script = { ...updated.script, scenes: updatedScenes }
            }
          }
          return updated
        })
        
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

  // Helper: Clean up audio assets when scene content changes
  // This ensures stale audio doesn't play after edits
  const cleanupRemovedDialogueAudio = (originalScene: any, revisedScene: any) => {
    const cleanedScene = { ...revisedScene }
    
    // Get dialogue lines from both scenes for comparison
    const originalDialogueLines = (originalScene?.dialogue || []).map((d: any, idx: number) => ({
      character: d.character,
      line: d.line || d.text || '',
      index: idx
    }))
    
    const revisedDialogueLines = (revisedScene.dialogue || []).map((d: any, idx: number) => ({
      character: d.character,
      line: d.line || d.text || '',
      index: idx
    }))

    // Check if narration text changed - if so, clear narration audio
    const originalNarration = originalScene?.narration || ''
    const revisedNarration = revisedScene.narration || ''
    if (originalNarration !== revisedNarration && originalScene?.narrationAudio) {
      delete cleanedScene.narrationAudio
      delete cleanedScene.narrationAudioUrl
    }
    
    // Check if description text changed - if so, clear description audio
    const originalDescription = originalScene?.description || originalScene?.action || ''
    const revisedDescription = revisedScene.description || revisedScene.action || ''
    if (originalDescription !== revisedDescription && originalScene?.descriptionAudio) {
      delete cleanedScene.descriptionAudio
      delete cleanedScene.descriptionAudioUrl
    }

    // If no dialogue audio exists, we're done
    if (!originalScene?.dialogueAudio) {
      return cleanedScene
    }

    // Handle multi-language audio format (object with language keys)
    if (typeof originalScene.dialogueAudio === 'object' && !Array.isArray(originalScene.dialogueAudio)) {
      cleanedScene.dialogueAudio = {}
      
      // Process each language
      for (const [language, audioArray] of Object.entries(originalScene.dialogueAudio)) {
        if (Array.isArray(audioArray)) {
          // Filter audio: keep only if character+index exists AND text hasn't changed
          const filteredAudio = audioArray.filter((audio: any) => {
            const dialogueIdx = audio.dialogueIndex
            const originalLine = originalDialogueLines[dialogueIdx]
            const revisedLine = revisedDialogueLines[dialogueIdx]
            
            // Remove if: dialogue was removed, character changed, or text changed
            const shouldKeep = (
              revisedLine && 
              originalLine &&
              revisedLine.character === audio.character &&
              originalLine.line === revisedLine.line  // Text must match
            )
            
            return shouldKeep
          })
          
          if (filteredAudio.length > 0) {
            cleanedScene.dialogueAudio[language] = filteredAudio
          }
        }
      }
      
      // Clean up empty dialogueAudio object
      if (Object.keys(cleanedScene.dialogueAudio).length === 0) {
        delete cleanedScene.dialogueAudio
      }
    }
    // Handle legacy array format
    else if (Array.isArray(originalScene.dialogueAudio)) {
      const filteredAudio = originalScene.dialogueAudio.filter((audio: any) => {
        const dialogueIdx = audio.dialogueIndex
        const originalLine = originalDialogueLines[dialogueIdx]
        const revisedLine = revisedDialogueLines[dialogueIdx]
        
        const shouldKeep = (
          revisedLine && 
          originalLine &&
          revisedLine.character === audio.character &&
          originalLine.line === revisedLine.line
        )
        
        return shouldKeep
      })
      
      if (filteredAudio.length > 0) {
        cleanedScene.dialogueAudio = filteredAudio
      } else {
        delete cleanedScene.dialogueAudio
      }
    }

    return cleanedScene
  }

  // Scene editor handlers
  const handleEditScene = (sceneIndex: number) => {
    setEditingSceneIndex(sceneIndex)
    setIsSceneEditorOpen(true)
  }

  const handleApplySceneChanges = async (sceneIndex: number, revisedScene: any) => {
    if (!script) return

    const updatedScenes = [...(script.script?.scenes || [])]
    const originalScene = updatedScenes[sceneIndex]
    
    // Clean up dialogue audio for removed dialogue lines
    const cleanedScene = cleanupRemovedDialogueAudio(originalScene, revisedScene)
    updatedScenes[sceneIndex] = cleanedScene

    // Save to database FIRST
    try {
      await saveScenesToDatabase(updatedScenes)
      
      // Then update local state
      setScript({
        ...script,
        script: {
          ...script.script,
          scenes: updatedScenes
        }
      })

      // Close the editor
      setIsSceneEditorOpen(false)
      setEditingSceneIndex(null)

      // Show success message
      try {
        const { toast } = require('sonner')
        toast.success('Scene changes applied successfully')
      } catch {}
      
      // Reload project to ensure consistency
      await loadProject()
    } catch (error) {
      console.error('[Vision] Failed to save scene changes:', error)
      try {
        const { toast } = require('sonner')
        toast.error('Failed to save scene changes')
      } catch {}
    }
  }

  // Scene score generation handler
  const handleGenerateSceneScore = async (sceneIndex: number) => {
    if (!script || !script.script?.scenes) return
    
    setGeneratingScoreFor(sceneIndex)
    try {
      const scene = script.script.scenes[sceneIndex]
      
      // Get previous analysis if it exists
      const previousAnalysis = scene.scoreAnalysis ? {
        score: scene.scoreAnalysis.overallScore || scene.scoreAnalysis.directorScore,
        appliedRecommendations: scene.appliedRecommendations || []
      } : undefined
      
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
            previousAnalysis  // Pass previous analysis context
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze scene')
      }
      
      const data = await response.json()
      
      // Update scene with score
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
          ]
        }
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

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-sf-background overflow-x-hidden max-w-full">
      <ContextBar
        title="Production"
        titleIcon={
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-sf-primary/20 via-cyan-400/15 to-fuchsia-500/15 border-2 border-sf-primary/60 shadow-xl flex items-center justify-center">
            <DirectorChairIcon className="w-6 h-6 md:w-8 md:h-8 text-sf-primary flex-shrink-0" />
          </div>
        }
        titleVariant="page"
        emphasis
        primaryActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNavigationWarning(true)}
              className="flex items-center gap-2"
              aria-label="Return to The Blueprint phase"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>The Blueprint</span>
            </Button>
            <Link
              href={
                project?.id
                  ? `/dashboard/workflow/generation/${project.id}`
                  : typeof projectId === 'string'
                    ? `/dashboard/workflow/generation/${projectId}`
                    : '/dashboard/workflow/generation'
              }
              prefetch={false}
              className={cn(buttonVariants({ variant: 'primary' }), 'flex items-center gap-2')}
              aria-label="Continue to Final Cut phase"
            >
              <span>Final Cut</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
          </div>
        }
        secondaryActions={
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleShare}
                    disabled={isSharing}
                    className={isSharing ? 'opacity-50' : ''}
                  >
              <Share2 className="w-4 h-4 text-purple-400" />
            </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share Project</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleSaveProject}
                    disabled={isSaving}
                    className={isSaving ? 'opacity-50' : ''}
                  >
                    <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''} text-green-400`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isSaving ? 'Saving...' : 'Save Project'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowBYOKSettings(true)}
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>BYOK Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        }
      />
      
      <div className="flex-1 overflow-hidden overflow-x-hidden px-4 py-3 max-w-full min-w-0">
        <PanelGroup direction="horizontal" className="h-full max-w-full min-w-0 overflow-x-hidden">
          {/* Left Panel: Workflow Navigation & Tools */}
          <Panel defaultSize={12} minSize={12} maxSize={25} className="min-w-0 overflow-hidden">
            <div className="h-full overflow-y-auto pr-2 min-w-0">
              <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 h-full flex flex-col">
                {/* Main Navigation */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Main</h3>
                  <nav className="space-y-1">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      href="/dashboard/projects"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>Projects</span>
                    </Link>
                    <Link
                      href="/dashboard/studio/new-project"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Start Project</span>
                    </Link>
                  </nav>
                </div>
                
                {/* Workflow Steps */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Workflow</h3>
                  <nav className="space-y-1">
                    <Link
                      href={`/dashboard/studio/${projectId}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>The Blueprint</span>
                    </Link>
                    <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-sf-primary/10 text-sf-primary font-medium">
                      <DirectorChairIcon size={16} className="flex-shrink-0" />
                      <span>Production</span>
                    </div>
                    <Link
                      href={`/dashboard/workflow/generation/${projectId}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      <span>Final Cut</span>
                    </Link>
                  </nav>
                </div>
                
                {/* Quick Actions */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={handleJumpToBookmark}
                      disabled={bookmarkedSceneIndex === -1}
                    >
                      <Bookmark className={`w-3 h-3 mr-2 ${bookmarkedSceneIndex !== -1 ? 'text-amber-500' : 'text-amber-400'}`} />
                      {bookmarkedSceneIndex !== -1 ? `Go to Scene ${bookmarkedSceneIndex + 1}` : 'No Bookmark'}
                    </Button>
                    <Button
                      variant={showSceneGallery ? 'default' : 'outline'}
                      size="sm"
                      className={`w-full justify-start text-xs ${showSceneGallery ? 'bg-cyan-500/90 hover:bg-cyan-500 text-white' : ''}`}
                      onClick={() => setShowSceneGallery(!showSceneGallery)}
                    >
                      <ImageIcon className={`w-3 h-3 mr-2 ${showSceneGallery ? 'text-white' : 'text-cyan-400'}`} />
                      {showSceneGallery ? 'Close Scene Gallery' : 'Open Scene Gallery'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => setIsPlayerOpen(true)}
                    >
                      <Play className="w-3 h-3 mr-2 text-green-500" />
                      Screening Room
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={handleGenerateReviews}
                      disabled={isGeneratingReviews}
                    >
                      <BarChart3 className="w-3 h-3 mr-2 text-purple-500" />
                      Update Review Scores
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-xs",
                        reviewsOutdated && (directorReview?.overallScore || audienceReview?.overallScore) && "border-amber-400 dark:border-amber-500 text-amber-600 dark:text-amber-400"
                      )}
                      onClick={() => setShowReviewModal(true)}
                      disabled={!directorReview?.overallScore && !audienceReview?.overallScore}
                    >
                      <FileText className={cn(
                        "w-3 h-3 mr-2",
                        reviewsOutdated && (directorReview?.overallScore || audienceReview?.overallScore) ? "text-amber-500" : "text-blue-500"
                      )} />
                      Review Analysis
                      {reviewsOutdated && (directorReview?.overallScore || audienceReview?.overallScore) && (
                        <span className="ml-auto text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">Outdated</span>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Project Stats - Mini Dashboard */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Project Stats</h3>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10 rounded-lg p-2.5 border border-purple-200/50 dark:border-purple-500/20 text-center">
                      <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{script?.script?.scenes?.length || 0}</div>
                      <div className="text-xs text-purple-500/80 dark:text-purple-400/70 uppercase tracking-wide font-medium">Scenes</div>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/20 dark:to-cyan-600/10 rounded-lg p-2.5 border border-cyan-200/50 dark:border-cyan-500/20 text-center">
                      <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{characters.length}</div>
                      <div className="text-xs text-cyan-500/80 dark:text-cyan-400/70 uppercase tracking-wide font-medium">Cast</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10 rounded-lg p-2.5 border border-green-200/50 dark:border-green-500/20 text-center">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {Math.round((script?.script?.scenes || []).reduce((sum: number, s: any) => sum + (s.estimatedDuration || s.duration || 15), 0) / 60)}m
                      </div>
                      <div className="text-xs text-green-500/80 dark:text-green-400/70 uppercase tracking-wide font-medium">Duration</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10 rounded-lg p-2.5 border border-amber-200/50 dark:border-amber-500/20 text-center">
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {(() => {
                          const sceneCount = script?.script?.scenes?.length || 0;
                          const charCount = characters.length;
                          const imageCredits = sceneCount * 5;
                          const charCredits = charCount * 2;
                          const audioCredits = sceneCount * 1;
                          return imageCredits + charCredits + audioCredits;
                        })()}
                      </div>
                      <div className="text-xs text-amber-500/80 dark:text-amber-400/70 uppercase tracking-wide font-medium">Credits</div>
                    </div>
                  </div>
                </div>
                
                {/* Review Scores - Stoplight Cards */}
                {(directorReview?.overallScore || audienceReview?.overallScore) && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Review Scores</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(() => {
                        const directorColors = getScoreCardClasses(directorReview?.overallScore || 0)
                        return (
                          <div className={cn("rounded-lg p-2.5 border text-center", directorColors.gradient, directorColors.border)}>
                            <div className={cn("text-xl font-bold", directorColors.text)}>
                              {directorReview?.overallScore || '-'}
                            </div>
                            <div className={cn("text-xs uppercase tracking-wide font-medium", directorColors.label)}>Director</div>
                          </div>
                        )
                      })()}
                      {(() => {
                        const audienceColors = getScoreCardClasses(audienceReview?.overallScore || 0)
                        return (
                          <div className={cn("rounded-lg p-2.5 border text-center", audienceColors.gradient, audienceColors.border)}>
                            <div className={cn("text-xl font-bold", audienceColors.text)}>
                              {audienceReview?.overallScore || '-'}
                            </div>
                            <div className={cn("text-xs uppercase tracking-wide font-medium", audienceColors.label)}>Audience</div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
                
                {/* Settings */}
                <div className="p-4 mt-auto">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Settings</h3>
                  <nav className="space-y-1">
                    <Link
                      href="/dashboard/settings/profile"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      href="/dashboard/settings/byok"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Key className="w-4 h-4" />
                      <span>BYOK Settings</span>
                    </Link>
                    <Link
                      href="/dashboard/settings/billing"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Billing & Credits</span>
                    </Link>
                  </nav>
                </div>
              </div>
            </div>
          </Panel>
          
          <PanelResizeHandle className="w-2 bg-transparent hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-col-resize" />
          
          {/* Center: Script with Scene Cards */}
          <Panel defaultSize={57} minSize={40} maxSize={70} className="min-w-0 overflow-hidden overflow-x-hidden">
            <div className="h-full overflow-y-auto px-4 pt-4 min-w-0 w-full overflow-x-hidden">
              <ScriptPanel 
                script={script}
                onScriptChange={setScript}
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
                  />
                }
                onPlayScript={() => setIsPlayerOpen(true)}
                onAddScene={handleAddScene}
                onDeleteScene={handleDeleteScene}
                onReorderScenes={handleReorderScenes}
                onEditScene={handleEditScene}
                onGenerateSceneScore={handleGenerateSceneScore}
                generatingScoreFor={generatingScoreFor}
                getScoreColorClass={getScoreColorClass}
                directorScore={directorReview?.overallScore}
                audienceScore={audienceReview?.overallScore}
                onGenerateReviews={handleGenerateReviews}
                isGeneratingReviews={isGeneratingReviews}
                onShowReviews={() => setShowReviewModal(true)}
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
                onSegmentGenerate={handleSegmentGenerate}
                onSegmentUpload={handleSegmentUpload}
                onAddSegment={handleAddSegment}
                onDeleteSegment={handleDeleteSegment}
                onAudioClipChange={handleAudioClipChange}
                sceneAudioTracks={{}}
                  bookmarkedScene={sceneBookmark}
                  onBookmarkScene={handleBookmarkScene}
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
                  setSceneReferences((prev) => [...prev, newReference])
                  // Show success toast
                  toast.success(`Added "${name}" to Reference Library`)
                }}
                openScriptEditorWithInstruction={reviseScriptInstruction || null}
                onClearScriptEditorInstruction={() => setReviseScriptInstruction('')}
              belowDashboardSlot={({ openGenerateAudio, openPromptBuilder }) => (
                <div className="rounded-2xl border border-white/10 bg-slate950/40 shadow-inner">
                  <div className="px-5 py-5">
                    {showSceneGallery && (
                      <div
                        id="scene-gallery-section"
                        className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-[0_15px_40px_rgba(8,8,20,0.35)]"
                      >
                          <SceneGallery
                            scenes={script?.script?.scenes || []}
                            characters={characters}
                            projectTitle={project?.title}
                            onRegenerateScene={(index) => handleGenerateSceneImage(index)}
                            onOpenPromptBuilder={openPromptBuilder}
                            onGenerateScene={handleGenerateScene}
                            onUploadScene={handleUploadScene}
                            onClose={() => setShowSceneGallery(false)}
                            onAddToSceneLibrary={(index, imageUrl) => {
                              const scenes = script?.script?.scenes || []
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
                                setSceneReferences((prev) => [...prev, newReference])
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

      {/* Screening Room (Full-screen overlay) */}
      {isPlayerOpen && script && (
        <ScreeningRoom
          script={script}
          characters={characters}
          onClose={() => setIsPlayerOpen(false)}
        />
      )}

      {/* Navigation Warning Dialog */}
      <NavigationWarningDialog
        open={showNavigationWarning}
        onOpenChange={setShowNavigationWarning}
        targetHref={projectId ? `/dashboard/studio/${projectId}` : '/dashboard/studio/new-project'}
        targetLabel="The Blueprint"
      />

      {/* Script Review Modal */}
      <ScriptReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        directorReview={directorReview}
        audienceReview={audienceReview}
        onRegenerate={handleGenerateReviews}
        isGenerating={isGeneratingReviews}
        onReviseScript={(recommendations: string[]) => {
          // Format recommendations as instruction text
          const instruction = recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n\n')
          setReviseScriptInstruction(instruction)
          setShowReviewModal(false)
          // Script editor will open automatically via openScriptEditorWithInstruction prop
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
          onApplyChanges={handleApplySceneChanges}
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

