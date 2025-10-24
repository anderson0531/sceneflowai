'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ContextBar } from '@/components/layout/ContextBar'
import { ScriptPanel } from '@/components/vision/ScriptPanel'
import { CharacterLibrary } from '@/components/vision/CharacterLibrary'
import { SceneGallery } from '@/components/vision/SceneGallery'
import { GenerationProgress } from '@/components/vision/GenerationProgress'
import { ScriptPlayer } from '@/components/vision/ScriptPlayer'
import { ImageQualitySelector } from '@/components/vision/ImageQualitySelector'
import { VoiceSelector } from '@/components/tts/VoiceSelector'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Save, Share2, ArrowRight, Play, Volume2, Image as ImageIcon } from 'lucide-react'
import { findSceneCharacters } from '../../../../../lib/character/matching'
import { v4 as uuidv4 } from 'uuid'

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
  referenceImage?: string
  appearanceDescription?: string
  // NEW: Voice assignment
  voiceConfig?: VoiceConfig
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

export default function VisionPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [project, setProject] = useState<Project | null>(null)
  const [script, setScript] = useState<any>(null)
  const [characters, setCharacters] = useState<any[]>([])
  const [scenes, setScenes] = useState<any[]>([])
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
  
  // Image quality setting
  const [imageQuality, setImageQuality] = useState<'max' | 'auto'>('auto')
  const [ttsProvider, setTtsProvider] = useState<'google' | 'elevenlabs'>('google')
  
  // Batch image generation state
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false)
  const [imageProgress, setImageProgress] = useState<{
    scene: number
    total: number
    status: string
    sceneHeading?: string
  } | null>(null)

  // Script generation progress modal state
  const [scriptProgress, setScriptProgress] = useState<{
    status: string
    scenesGenerated: number
    totalScenes: number
    batch?: number
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

  const loadProject = async () => {
    try {
      const res = await fetch(`/api/projects?id=${projectId}`)
      
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
      
      // Load image quality setting from project metadata
      if (proj.metadata?.imageQuality) {
        setImageQuality(proj.metadata.imageQuality)
      }
      
      // Load existing Vision data if available
      const visionPhase = proj.metadata?.visionPhase
      if (visionPhase) {
        if (visionPhase.script) {
          setScript(visionPhase.script)
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

          setCharacters(charactersWithIds)
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
        // Generate script (returns empty data, reloads from DB)
        await generateScript(proj)
        
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
      setScriptProgress({
        status: 'Starting script generation...',
        scenesGenerated: 0,
        totalScenes: 0
      })

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
                setScriptProgress({
                  status: data.status,
                  scenesGenerated: data.scenesGenerated,
                  totalScenes: data.totalScenes,
                  batch: data.batch
                })
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
                setScriptProgress(null)
                
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
                setScriptProgress(null) // Hide modal on error
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
      setScriptProgress(null) // Hide modal on error
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

  const handleRegenerateScene = async (sceneIndex: number) => {
    // Implement scene regeneration
    console.log('Regenerate scene:', sceneIndex)
  }

  const handleGenerateSceneImage = async (sceneIdx: number, selectedCharacters?: any[]) => {
    const scene = script?.script?.scenes?.[sceneIdx]
    if (!scene || !scene.visualDescription) {
      console.warn('No visual description available for scene', sceneIdx)
      try { const { toast } = require('sonner'); toast.error('Scene must be expanded first to generate image') } catch {}
      return
    }
    
    try {
      // Check if selectedCharacters are already full objects (from Scene Prompt Builder)
      let sceneCharacters: any[] = []
      
      if (selectedCharacters && selectedCharacters.length > 0) {
        // Check if they're already full character objects
        if (typeof selectedCharacters[0] === 'object' && selectedCharacters[0].name) {
          sceneCharacters = selectedCharacters
        } else {
          // They're character names (strings), need to map to full objects
          sceneCharacters = selectedCharacters.map((charName: string) => {
        const char = characters.find((c: any) => c.name === charName)
            return char || null
          }).filter(Boolean)
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
          projectId: projectId,           // ✅ ADD THIS
          sceneIndex: sceneIdx,           // ✅ ADD THIS
          scenePrompt: scene.visualDescription || scene.action || scene.heading,  // ✅ ADD THIS as fallback
          selectedCharacters: sceneCharacters,  // Send full character objects
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
  const handleGenerateSceneAudio = async (sceneIdx: number, audioType: 'narration' | 'dialogue', characterName?: string) => {
    console.log('[Generate Scene Audio] Button clicked!', { sceneIdx, audioType, characterName })
    console.log('[Generate Scene Audio] Called with:', { sceneIdx, audioType, characterName })
    console.log('[Generate Scene Audio] Current narrationVoice:', narrationVoice)
    console.log('[Generate Scene Audio] Current characters:', characters.map(c => ({ name: c.name, hasVoice: !!c.voiceConfig })))
    
    const scene = script?.script?.scenes?.[sceneIdx]
    if (!scene) return

    try {
      const dialogueLine = audioType === 'dialogue' ? 
        scene.dialogue?.find((d: any) => d.character === characterName) : null
      
      const text = audioType === 'narration' ? scene.narration : dialogueLine?.line
      
      if (!text) {
        try { const { toast } = require('sonner'); toast.error('No text found to generate audio') } catch {}
        return
      }

      // Primary: Match by ID (most reliable)
      // Fallback: Case-insensitive name (for legacy projects)
      const character = audioType === 'narration' ? null :
        (dialogueLine?.characterId ? 
          characters.find(c => c.id === dialogueLine.characterId) :
          characters.find(c => c.name.toLowerCase() === characterName?.toLowerCase())
        )
      
      const voiceConfig = audioType === 'narration' ? narrationVoice : character?.voiceConfig

      console.log('[Generate Scene Audio] Voice config determined:', { voiceConfig, audioType })

      if (!voiceConfig) {
        // Show specific error message based on audio type
        if (audioType === 'narration') {
          console.log('[Generate Scene Audio] No narration voice found - showing error toast')
          try { const { toast } = require('sonner'); toast.error('Please select a narration voice first') } catch {}
        } else {
          console.log('[Generate Scene Audio] No character voice found - showing error toast')
          try { const { toast } = require('sonner'); toast.error(`Please assign a voice to character "${characterName}" in the Character Library`) } catch {}
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
          characterName
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
              // Handle dialogue audio
              const dialogueAudio = updated.script.scenes[sceneIdx].dialogueAudio || []
              const existingIndex = dialogueAudio.findIndex((d: any) => d.character === characterName)
              
              if (existingIndex >= 0) {
                dialogueAudio[existingIndex] = { character: characterName, audioUrl: data.audioUrl }
              } else {
                dialogueAudio.push({ character: characterName, audioUrl: data.audioUrl })
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

  const handleShare = () => {
    console.log('Share Vision')
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
            <ImageQualitySelector
              value={imageQuality}
              onChange={handleQualityChange}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
            <Button 
                    onClick={handleGenerateAllAudio}
                    disabled={isGeneratingAudio}
                    size="icon"
              variant="outline" 
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isGeneratingAudio ? 'Generating Audio...' : 'Generate All Audio'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleGenerateAllImages}
                    disabled={isGeneratingAllImages || !script?.script?.scenes}
                    size="icon"
                    variant="outline"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isGeneratingAllImages ? 'Generating Images...' : 'Generate All Images'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setIsPlayerOpen(true)}
                    disabled={!script || !script.script?.scenes || script.script.scenes.length === 0}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Play Full Script</p>
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
                  >
              <Share2 className="w-4 h-4" />
            </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share Project</p>
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
          />
        </div>
        
        {/* Right Sidebar: Characters */}
        <div className="overflow-y-auto">
          {/* Narration Voice Selector */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-300">Narration Voice</label>
            </div>
            
            {/* Provider Toggle */}
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs text-gray-400">Provider:</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setTtsProvider('google')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    ttsProvider === 'google' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Google TTS
                </button>
                <button
                  onClick={() => setTtsProvider('elevenlabs')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    ttsProvider === 'elevenlabs' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  ElevenLabs
                </button>
              </div>
            </div>
            
            <VoiceSelector
              provider={ttsProvider}
              selectedVoiceId={narrationVoice?.voiceId || ''}
              onSelectVoice={(voiceId, voiceName) =>
                handleNarrationVoiceChange({ 
                  provider: ttsProvider,
                  voiceId, 
                  voiceName 
                })
              }
              compact={true}
            />
            {narrationVoice && (
              <div className="text-xs text-green-400 mt-1">
                ✓ {narrationVoice.voiceName}
              </div>
            )}
          </div>
          
          <CharacterLibrary 
            characters={characters}
            onRegenerateCharacter={handleRegenerateCharacter}
            onGenerateCharacter={handleGenerateCharacter}
            onUploadCharacter={handleUploadCharacter}
            onApproveCharacter={handleApproveCharacter}
            onUpdateCharacterAttributes={handleUpdateCharacterAttributes}
            onUpdateCharacterVoice={handleUpdateCharacterVoice}
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

      {/* Script Player (Full-screen overlay) */}
      {isPlayerOpen && script && (
        <ScriptPlayer
          script={script}
          characters={characters}
          onClose={() => setIsPlayerOpen(false)}
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

      {/* Script Generation Progress - Full Screen Blocking Modal */}
      {scriptProgress && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-lg w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4">
                <div className="w-full h-full border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-200 mb-2">
                Generating Script
              </h3>
              <p className="text-gray-400">
                This may take 60+ seconds. Please don't close this window.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  Scene {scriptProgress.scenesGenerated} of {scriptProgress.totalScenes}
                </span>
                <span className="text-gray-400">
                  {scriptProgress.totalScenes > 0 ? Math.round((scriptProgress.scenesGenerated / scriptProgress.totalScenes) * 100) : 0}%
                </span>
              </div>
              
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: scriptProgress.totalScenes > 0 
                      ? `${(scriptProgress.scenesGenerated / scriptProgress.totalScenes) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-300 mb-1">{scriptProgress.status}</p>
                {scriptProgress.batch && (
                  <p className="text-xs text-gray-500">Batch {scriptProgress.batch}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

