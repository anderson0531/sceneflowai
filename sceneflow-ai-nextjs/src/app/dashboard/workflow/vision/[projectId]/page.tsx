'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ContextBar } from '@/components/layout/ContextBar'
import { ScriptPanel } from '@/components/vision/ScriptPanel'
import { CharacterLibrary } from '@/components/vision/CharacterLibrary'
import { SceneGallery } from '@/components/vision/SceneGallery'
import { GenerationProgress } from '@/components/vision/GenerationProgress'
import { ScreeningRoom } from '@/components/vision/ScriptPlayer'
import { ImageQualitySelector } from '@/components/vision/ImageQualitySelector'
import { VoiceSelector } from '@/components/tts/VoiceSelector'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, Share2, ArrowRight, Play, Volume2, Image as ImageIcon, Copy, Check, X, Settings, Info } from 'lucide-react'
import ScriptReviewModal from '@/components/vision/ScriptReviewModal'
import { SceneEditorModal } from '@/components/vision/SceneEditorModal'
import { findSceneCharacters } from '../../../../../lib/character/matching'
import { v4 as uuidv4 } from 'uuid'
import { useProcessWithOverlay } from '@/hooks/useProcessWithOverlay'

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
  [key: string]: any
}

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
      provider: 'google',
      voiceName: 'Marcus (Studio)',
      voiceId: 'en-US-Studio-M'
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
  type?: 'character' | 'narrator' // NEW: character type
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
  const [isGenerating, setIsGenerating] = useState(false)
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
  const [voiceAssignments, setVoiceAssignments] = useState<Record<string, any>>({})
  
  // Script review state
  const [directorReview, setDirectorReview] = useState<any>(null)
  const [audienceReview, setAudienceReview] = useState<any>(null)
  const [isGeneratingReviews, setIsGeneratingReviews] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewsOutdated, setReviewsOutdated] = useState(false)
  
  // Scene editor state
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null)
  const [isSceneEditorOpen, setIsSceneEditorOpen] = useState(false)
  
  // Scene score generation state
  const [generatingScoreFor, setGeneratingScoreFor] = useState<number | null>(null)
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
  const [ttsProvider, setTtsProvider] = useState<'google' | 'elevenlabs'>('google')
  
  // BYOK Settings
  const [showBYOKSettings, setShowBYOKSettings] = useState(false)
  const [byokSettings, setBYOKSettings] = useState<BYOKSettings>({
    imageProvider: 'google',
    imageModel: 'imagen-3.0-generate-001',
    audioProvider: 'google',
    audioModel: 'studio',
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

  
  // Handle quality setting change
  const handleQualityChange = async (quality: 'max' | 'auto') => {
    setImageQuality(quality)
    
    // Update project metadata
    if (project) {
      const updatedProject = {
        ...project,
        metadata: {
          ...project.metadata,
          imageQuality: quality
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
    
    if (project) {
      const updatedProject = {
        ...project,
        metadata: {
          ...project.metadata,
          visionPhase: {
            ...project.metadata?.visionPhase,
            narrationVoice: voiceConfig
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
    }
    
    if (project) {
      const updatedProject = {
        ...project,
        metadata: {
          ...project.metadata,
          visionPhase: {
            ...project.metadata?.visionPhase,
            characters: updatedCharacters
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
                characters: updatedCharacters
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
                characters: updatedCharacters
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
                characters: updatedCharacters
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
                }
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

  const loadProject = async () => {
    try {
      // Add cache-busting to force fresh data from database
      const cacheBuster = `?id=${projectId}&_t=${Date.now()}`
      const res = await fetch(`/api/projects${cacheBuster}`, {
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

      console.log('[loadProject] Scenes from visionPhase.scenes:', loadedScenesFromVisionPhase.slice(0, 3).map((s: any) => ({
        sceneNumber: s.sceneNumber,
        hasImage: !!s.imageUrl,
        hasNarration: !!s.narrationAudioUrl,
        imageUrl: s.imageUrl?.substring(0, 50)
      })))

      console.log('[loadProject] Scenes from visionPhase.script.script.scenes:', loadedScenesFromScript.slice(0, 3).map((s: any) => ({
        sceneNumber: s.sceneNumber,
        hasImage: !!s.imageUrl,
        hasNarration: !!s.narrationAudioUrl,
        imageUrl: s.imageUrl?.substring(0, 50)
      })))
      
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
          console.log('[loadProject] Setting script with structure:', {
            hasTitle: !!visionPhase.script.title,
            hasNestedScript: !!visionPhase.script.script,
            nestedScenesCount: visionPhase.script.script?.scenes?.length || 0,
            firstSceneHasImage: !!visionPhase.script.script?.scenes?.[0]?.imageUrl,
            firstSceneImageUrl: visionPhase.script.script?.scenes?.[0]?.imageUrl?.substring(0, 100)
          })
          setScript(visionPhase.script)
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
              await fetch('/api/projects', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: projectId,
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
            console.log('[Load Project] Migrating characters to add UUIDs')
            try {
              await fetch('/api/projects', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: projectId,
                  metadata: {
                    ...proj.metadata,
                    visionPhase: {
                      ...visionPhase,
                      characters: charactersWithIds
                    }
                  }
                })
              })
              console.log('[Load Project] Character IDs migrated successfully')
            } catch (error) {
              console.warn('[Load Project] Failed to save character IDs:', error)
            }
          }

          // Ensure narrator character exists
          const narratorCharacter = ensureNarratorCharacter(charactersWithIds, narrationVoice || undefined)
          const charactersWithNarrator = charactersWithIds.some(c => c.type === 'narrator') 
            ? charactersWithIds 
            : [...charactersWithIds, narratorCharacter]
          
          setCharacters(charactersWithNarrator)
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
            console.log('[Load Project] Migrating dialogue to add characterId')
            try {
              await fetch('/api/projects', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: projectId,
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
              console.log('[Load Project] Dialogue characterId migrated successfully')
            } catch (error) {
              console.warn('[Load Project] Failed to save dialogue characterId:', error)
            }
          }
          
          setScenes(scenesWithCharacterIds)
        }
        
        // Load narration voice setting
        if (visionPhase.narrationVoice) {
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
                await fetch('/api/projects', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: projectId,
                    metadata: {
                      ...proj.metadata,
                      visionPhase: {
                        ...visionPhase,
                        narrationVoice: correctedNarrationVoice
                      }
                    }
                  })
                })
                console.log('[Load Project] Narration voice config saved successfully')
              } catch (error) {
                console.warn('[Load Project] Failed to save narration voice config:', error)
              }
            }
          }
          
          setNarrationVoice(correctedNarrationVoice)
        } else {
          setNarrationVoice(null)
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
        
        // Check if generation is complete
        if (!visionPhase.scriptGenerated || !visionPhase.charactersGenerated || !visionPhase.scenesGenerated) {
          // Defer generation until after hydration to prevent hydration mismatch
          setTimeout(() => initiateGeneration(proj), 100)
        }
      } else {
        // No Vision data yet, start generation
        // Defer generation until after hydration to prevent hydration mismatch
        setTimeout(() => initiateGeneration(proj), 100)
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
      
      // Upload to both Vercel Blob and GCS
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      const character = characters.find(c => {
        const charId = c.id || characters.indexOf(c).toString()
        return charId === characterId
      })
      formData.append('characterName', character?.name || 'character')
      
      const uploadRes = await fetch('/api/character/upload-reference', {
        method: 'POST',
        body: formData
      })
      
      if (!uploadRes.ok) {
        throw new Error('Upload failed')
      }
      
      const { url: blobUrl, gcsUrl } = await uploadRes.json()
      console.log('[Character Upload] Vercel Blob URL:', blobUrl)
      console.log('[Character Upload] GCS URL:', gcsUrl)
      
      // Auto-analyze to generate appearance description
      let analysisData: any = null
      try {
        const analyzeRes = await fetch('/api/character/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: blobUrl, characterName: character?.name })
        })
        
        if (analyzeRes.ok) {
          analysisData = await analyzeRes.json()
          console.log('[Character Upload] Auto-analyzed appearance:', analysisData.appearanceDescription)
        }
      } catch (analyzeError) {
        console.error('[Character Upload] Auto-analysis failed:', analyzeError)
        // Continue with upload even if analysis fails
      }
      
      // Update character with the Blob URL and analysis results
        const updatedCharacters = characters.map(char => {
          const charId = char.id || characters.indexOf(char).toString()
          return charId === characterId 
          ? { 
              ...char, 
              referenceImage: blobUrl,  // Vercel Blob URL for UI display
              referenceImageGCS: gcsUrl,  // GCS URL for Imagen API
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
      
      console.log('[Character Upload] Updated character details:', updatedCharacters.map(c => ({
        name: c.name,
        hasReferenceImage: !!c.referenceImage,
        hasReferenceImageGCS: !!c.referenceImageGCS,
        gcsUrl: c.referenceImageGCS?.substring(0, 50) || 'none',
        hasAppearanceDesc: !!c.appearanceDescription
      })))
        
        // Persist to project metadata
        try {
          const existingMetadata = project?.metadata || {}
          const existingVisionPhase = existingMetadata.visionPhase || {}
          
          await fetch(`/api/projects`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: projectId,
              metadata: {
                ...existingMetadata,
                visionPhase: {
                  ...existingVisionPhase,
                  characters: updatedCharacters
                }
              }
            })
          })
        console.log('[Character Upload] ✓ Saved to project metadata with GCS URL')
        
        // Reload project to ensure fresh character data is available for scene generation
        console.log('[Character Upload] Reloading project to refresh character data...')
        await loadProject()
        console.log('[Character Upload] ✓ Project reloaded with fresh character data')
        } catch (saveError) {
          console.error('Failed to save uploaded character to project:', saveError)
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
        
        await fetch(`/api/projects`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: projectId,
            metadata: {
              ...existingMetadata,
              visionPhase: {
                ...existingVisionPhase,
                characters: updatedCharacters
              }
            }
          })
        })
        
        const char = updatedCharacters.find(c => (c.id || characters.indexOf(c).toString()) === characterId)
        const msg = char?.imageApproved ? 'Character image approved!' : 'Character image unlocked for editing'
        try { const { toast } = require('sonner'); toast.success(msg) } catch {}
      } catch (saveError) {
        console.error('Failed to save character approval to project:', saveError)
      }
    } catch (error) {
      console.error('Character approval failed:', error)
      try { const { toast } = require('sonner'); toast.error('Failed to update approval status') } catch {}
    }
  }

  const handleGenerateCharacter = async (characterId: string, prompt: string) => {
    if (!prompt?.trim()) return
    
    try {
      const res = await fetch('/api/character/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          quality: imageQuality // Pass quality setting
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
          const existingMetadata = project?.metadata || {}
          const existingVisionPhase = existingMetadata.visionPhase || {}
          
          await fetch(`/api/projects`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: projectId,
              metadata: {
                ...existingMetadata,
                visionPhase: {
                  ...existingVisionPhase,
                  characters: updatedCharacters
                }
              }
            })
          })
          console.log('[Character Image] Saved to project metadata')
        } catch (saveError) {
          console.error('Failed to save character to project:', saveError)
        }
        
        try { const { toast } = require('sonner'); toast.success('Character image generated!') } catch {}
      } else {
        const errorMsg = json?.error || 'Failed to generate image'
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('Character image generation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate character image'
      try { const { toast } = require('sonner'); toast.error(errorMessage) } catch {}
    }
  }

  const handleGenerateScene = async (sceneIndex: number, prompt: string) => {
    if (!prompt?.trim()) return
    
    try {
      const scene = scenes[sceneIndex]
      const sceneContext = {
        visualStyle: project?.metadata?.filmTreatmentVariant?.visual_style || project?.metadata?.filmTreatmentVariant?.style,
        tone: project?.metadata?.filmTreatmentVariant?.tone_description || project?.metadata?.filmTreatmentVariant?.tone
      }
      
      const res = await fetch('/api/scene/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sceneContext })
      })
      
      const json = await res.json()
      
      if (json?.imageUrl) {
        // Update scene with generated image and prompt
        const updatedScenes = scenes.map((s, idx) => 
          idx === sceneIndex 
            ? { ...s, imageUrl: json.imageUrl, imagePrompt: prompt } 
            : s
        )
        
        setScenes(updatedScenes)
        
        // Persist to project metadata
        try {
          const existingMetadata = project?.metadata || {}
          const existingVisionPhase = existingMetadata.visionPhase || {}
          
          await fetch(`/api/projects`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: projectId,
              metadata: {
                ...existingMetadata,
                visionPhase: {
                  ...existingVisionPhase,
                  scenes: updatedScenes
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
      try { const { toast } = require('sonner'); toast.error(errorMessage) } catch {}
    }
  }

  const handleUploadScene = async (sceneIndex: number, file: File) => {
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        
        const updatedScenes = scenes.map((s, idx) => 
          idx === sceneIndex 
            ? { ...s, imageUrl: dataUrl } 
            : s
        )
        
        setScenes(updatedScenes)
        
        // Persist to project metadata
        try {
          const existingMetadata = project?.metadata || {}
          const existingVisionPhase = existingMetadata.visionPhase || {}
          
          await fetch(`/api/projects`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: projectId,
              metadata: {
                ...existingMetadata,
                visionPhase: {
                  ...existingVisionPhase,
                  scenes: updatedScenes
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
      
      const response = await fetch(`/api/vision/characters?projectId=${projectId}&characterName=${encodeURIComponent(characterName)}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove character')
      }
      
      // Reload project to get updated characters
      await loadProject()
      
      try {
        const { toast } = require('sonner')
        toast.success('Character removed successfully!')
      } catch {}
    } catch (error) {
      console.error('[Vision] Error removing character:', error)
      try {
        const { toast } = require('sonner')
        toast.error('Failed to remove character')
      } catch {}
    }
  }

  const handleRegenerateScene = async (sceneIndex: number) => {
    // Implement scene regeneration
    console.log('Regenerate scene:', sceneIndex)
  }

  const handleGenerateSceneImage = async (sceneIdx: number, selectedCharacters?: any[] | any) => {
    const scene = script?.script?.scenes?.[sceneIdx]
    if (!scene || !scene.visualDescription) {
      console.warn('No visual description available for scene', sceneIdx)
      try { const { toast } = require('sonner'); toast.error('Scene must be expanded first to generate image') } catch {}
      return
    }
    
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
      
      const response = await fetch('/api/scene/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: projectId,
          sceneIndex: sceneIdx,
          scenePrompt: scene.visualDescription || scene.action || scene.heading,
          // NEW: Pass prompt builder data
          customPrompt: promptData.customPrompt,
          artStyle: promptData.artStyle,
          shotType: promptData.shotType,
          cameraAngle: promptData.cameraAngle,
          lighting: promptData.lighting,
          characters: sceneCharacters,  // Characters array
          quality: imageQuality
        })
      })
      
      if (!response.ok) throw new Error('Image generation failed')
      
      const data = await response.json()
      
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
      await fetch(`/api/projects/${project?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...project?.metadata,
            visionPhase: {
              ...project?.metadata?.visionPhase,
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
    } catch (error: any) {
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
        try { const { toast } = require('sonner'); toast.error(`Failed to generate scene image: ${error.message}`) } catch {}
      }
    }
  }

  // Handle generate all audio
  const handleGenerateAllAudio = async () => {
    if (!narrationVoice) {
      try { const { toast } = require('sonner'); toast.error('Please select a narration voice first') } catch {}
      return
    }

    // Check if all characters have voices
    const charactersWithoutVoice = characters.filter(c => !c.voiceConfig)
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

    setIsGeneratingAudio(true)
    setAudioProgress({ current: 0, total: 0, status: 'Starting...' })
    
    try {
      const response = await fetch('/api/vision/generate-all-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

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
                    : `Generating dialogue (${data.dialogueCount || 0} lines)...`,
                  dialogueCount: data.dialogueCount
                })
              } else if (data.type === 'complete') {
                try { 
                  const { toast } = require('sonner')
                  const msg = `Generated ${data.narrationCount} narration + ${data.dialogueCount} dialogue audio files!`
                  
                  if (data.skipped && data.skipped.length > 0) {
                    const skippedChars = [...new Set(data.skipped.map((s: any) => s.character))].join(', ')
                    toast.warning(`${msg}\n\nSkipped dialogue for: ${skippedChars} (no voice assigned)`, {
                      duration: 8000
                    })
                  } else {
                    toast.success(msg)
                  }
                } catch {}
                
                // Retry logic for project reload after batch audio generation
                let retries = 3
                while (retries > 0) {
                  try {
                    await loadProject()
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
    } catch (error) {
      console.error('[Generate All Audio] Error:', error)
      try { const { toast } = require('sonner'); toast.error('Audio generation failed') } catch {}
    } finally {
      setIsGeneratingAudio(false)
      setAudioProgress(null)
    }
  }

  // Handle generate scene audio
  const handleGenerateSceneAudio = async (sceneIdx: number, audioType: 'narration' | 'dialogue', characterName?: string, dialogueIndex?: number) => {
    console.log('[Generate Scene Audio] START:', { sceneIdx, audioType, characterName, dialogueIndex })
    
    const scene = script?.script?.scenes?.[sceneIdx]
    if (!scene) {
      console.error('[Generate Scene Audio] Scene not found')
      return
    }

    // Add a lock mechanism to prevent concurrent dialogue generations
    const lockKey = `${sceneIdx}-${audioType === 'dialogue' ? `${characterName}-${dialogueIndex}` : 'narration'}`
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
      
      const text = audioType === 'narration' ? scene.narration : dialogueLine?.line
      
      if (!text) {
        try { const { toast } = require('sonner'); toast.error('No text found to generate audio') } catch {}
        return
      }

      // Primary: Match by ID (most reliable)
      // Fallback: Case-insensitive name with normalization (for legacy projects)
      const character = audioType === 'narration' ? null :
        (dialogueLine?.characterId ? 
          characters.find(c => c.id === dialogueLine.characterId) :
          // Use normalized names for matching
          characters.find(c => 
            normalizeCharacterName(c.name.toLowerCase()) === normalizeCharacterName(characterName?.toLowerCase() || '')
          )
        )

      // ADD: Debug logging with normalized names
      if (audioType === 'dialogue') {
        const normalizedSearchName = normalizeCharacterName(characterName || '')
        console.log('[Generate Scene Audio] Character lookup:', {
          originalName: characterName,
          normalizedName: normalizedSearchName,
          dialogueCharacterId: dialogueLine?.characterId,
          foundCharacter: character ? { id: character.id, name: character.name } : null,
          hasVoiceConfig: !!character?.voiceConfig,
          allCharacters: characters.map(c => ({ 
            id: c.id, 
            name: c.name, 
            normalizedName: normalizeCharacterName(c.name),
            hasVoice: !!c.voiceConfig 
          }))
        })
        
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
      
      const voiceConfig = audioType === 'narration' ? narrationVoice : character?.voiceConfig

      console.log('[Generate Scene Audio] Voice config determined:', { voiceConfig, audioType })

      if (!voiceConfig) {
        // Show specific error message based on audio type
        if (audioType === 'narration') {
          console.error('[Generate Scene Audio] No narration voice configured')
          try { 
            const { toast } = require('sonner')
            toast.error('Please select a narration voice in the sidebar before generating audio')
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

      console.log('[Generate Scene Audio] API Request:', {
        projectId,
        sceneIndex: sceneIdx,
        audioType,
        text: text.substring(0, 50),
        voiceId: voiceConfig.voiceId,
        characterName, // CRITICAL: Must be passed
        dialogueIndex
      })

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
          dialogueIndex
        }),
      })

      const data = await response.json()
      if (data.success) {
        console.log('[Audio] Audio generated successfully:', data)
        
        // Update script state immediately with audio URL
        setScript((prevScript: any) => {
          const updated = { ...prevScript }
          if (updated.script?.scenes?.[sceneIdx]) {
            if (audioType === 'narration') {
              updated.script.scenes[sceneIdx] = {
                ...updated.script.scenes[sceneIdx],
                narrationAudioUrl: data.audioUrl
              }
            } else if (audioType === 'dialogue' && characterName) {
              // Handle dialogue audio - match by both character and dialogueIndex
              const dialogueAudio = updated.script.scenes[sceneIdx].dialogueAudio || []
              const existingIndex = dialogueAudio.findIndex((d: any) => 
                d.character === characterName && d.dialogueIndex === dialogueIndex
              )
              
              if (existingIndex >= 0) {
                dialogueAudio[existingIndex] = { character: characterName, dialogueIndex, audioUrl: data.audioUrl }
              } else {
                dialogueAudio.push({ character: characterName, dialogueIndex, audioUrl: data.audioUrl })
              }
              
              updated.script.scenes[sceneIdx] = {
                ...updated.script.scenes[sceneIdx],
                dialogueAudio
              }
            }
          }
          return updated
        })
        
        try { const { toast } = require('sonner'); toast.success('Audio generated!') } catch {}
        
        // Retry logic for project reload
        let retries = 3
        while (retries > 0) {
          try {
            await loadProject()
            break // Success!
          } catch (error) {
            retries--
            console.warn(`[Audio] Project reload failed, ${retries} retries left`)
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s before retry
            } else {
              console.error('[Audio] All retries exhausted')
              try { const { toast } = require('sonner'); toast.warning('Audio saved but page reload failed. Please refresh manually.') } catch {}
            }
          }
        }
        
        // Debug logging after reload
        console.log('[Audio] Reloaded project, checking scene audio URLs:')
        console.log('[Audio] Scene', sceneIdx, 'narrationAudioUrl:', script?.script?.scenes?.[sceneIdx]?.narrationAudioUrl)
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

  const handleSaveProject = async () => {
    try {
      if (!project) return
      
      // Vision data is already saved during generation
      // This just forces a manual save/refresh
      await loadProject()
      
      try {
        const { toast } = require('sonner')
        toast.success('Project saved!')
      } catch {}
    } catch (error) {
      console.error('Save failed:', error)
      try {
        const { toast } = require('sonner')
        toast.error('Failed to save project')
      } catch {}
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

  const handleApplySceneChanges = async (sceneIndex: number, revisedScene: any) => {
    if (!script) return

    const updatedScenes = [...(script.script?.scenes || [])]
    updatedScenes[sceneIndex] = revisedScene

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
  const saveScenesToDatabase = async (updatedScenes: any[]) => {
    try {
      // DEBUG: Log what we're about to save
      console.log('[saveScenesToDatabase] Saving scenes with assets:', updatedScenes.map((s, idx) => ({
        idx,
        sceneNumber: s.sceneNumber,
        hasImage: !!s.imageUrl,
        hasNarration: !!s.narrationAudioUrl,
        hasMusic: !!s.musicAudio,
        imageUrl: s.imageUrl?.substring(0, 50) + '...',
        narrationUrl: s.narrationAudioUrl?.substring(0, 50) + '...'
      })))
      
      const existingMetadata = project?.metadata || {}
      const existingVisionPhase = existingMetadata.visionPhase || {}
      
      const payload = {
        id: projectId,
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
      
      const response = await fetch(`/api/projects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[saveScenesToDatabase] Error response:', errorText)
        throw new Error(`Failed to save: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      
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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-sf-background">
      <ContextBar
        title="Vision"
        titleVariant="page"
        emphasis
        primaryActions={
          <Button className="bg-sf-primary text-white hover:bg-sf-accent flex items-center gap-2">
            <span>Continue to Direction</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        }
        secondaryActions={
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
              onClick={handleSaveProject}
            >
              <Save className="w-4 h-4" />
            </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save Project</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
              <Share2 className="w-4 h-4" />
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
                    onClick={() => setShowBYOKSettings(true)}
                  >
                    <Settings className="w-4 h-4" />
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
      
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 px-6 py-4">
        {/* Main: Script with Scene Cards */}
        <div className="overflow-y-auto">
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
          />
        </div>
        
        {/* Right Sidebar: Characters */}
        <div className="overflow-y-auto">
          {/* Narration Voice Selector */}
          
          <CharacterLibrary 
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
            onAddCharacter={handleAddCharacter}
            onRemoveCharacter={handleRemoveCharacter}
            ttsProvider={ttsProvider}
            compact={true}
          />
        </div>
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

      {/* Script Review Modal */}
      <ScriptReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        directorReview={directorReview}
        audienceReview={audienceReview}
        onRegenerate={handleGenerateReviews}
        isGenerating={isGeneratingReviews}
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
    </div>
  )
}

