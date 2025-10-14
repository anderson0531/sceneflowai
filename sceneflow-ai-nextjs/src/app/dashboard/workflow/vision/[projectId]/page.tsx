'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ContextBar } from '@/components/layout/ContextBar'
import { ScriptPanel } from '@/components/vision/ScriptPanel'
import { CharacterLibrary } from '@/components/vision/CharacterLibrary'
import { SceneGallery } from '@/components/vision/SceneGallery'
import { GenerationProgress } from '@/components/vision/GenerationProgress'
import { Button } from '@/components/ui/Button'
import { Save, Share2, ArrowRight } from 'lucide-react'

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
    visionPhase?: {
      script?: any
      characters?: any[]
      scenes?: any[]
      scriptGenerated?: boolean
      charactersGenerated?: boolean
      scenesGenerated?: boolean
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
  const [activePanel, setActivePanel] = useState<'script' | 'characters' | 'scenes'>('script')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({
    script: { complete: false, progress: 0 },
    characters: { complete: false, progress: 0, total: 0 },
    scenes: { complete: false, progress: 0, total: 0 }
  })

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
      if (!res.ok) throw new Error('Failed to load project')
      
      const data = await res.json()
      const proj = data.project || data
      
      // LOG PROJECT DURATION
      console.log('[Vision] Loaded project duration:', {
        projectId: projectId,
        duration: proj.duration,
        durationMinutes: proj.duration ? Math.floor(proj.duration / 60) : 0,
        metadata_has_filmTreatmentVariant: !!proj.metadata?.filmTreatmentVariant,
        metadata_total_duration_seconds: proj.metadata?.filmTreatmentVariant?.total_duration_seconds,
        metadata_beats_count: proj.metadata?.filmTreatmentVariant?.beats?.length
      })
      
      setProject(proj)
      
      // Load existing Vision data if available
      const visionPhase = proj.metadata?.visionPhase
      if (visionPhase) {
        console.log('[Vision] Loading saved data:', {
          scriptGenerated: visionPhase.scriptGenerated,
          charactersGenerated: visionPhase.charactersGenerated,
          scenesGenerated: visionPhase.scenesGenerated,
          hasScript: !!visionPhase.script,
          characterCount: visionPhase.characters?.length,
          sceneCount: visionPhase.scenes?.length
        })
        
        if (visionPhase.script) {
          console.log('[Vision] Setting script state:', {
            hasTitle: !!visionPhase.script.title,
            hasNestedScript: !!visionPhase.script.script,
            nestedSceneCount: visionPhase.script.script?.scenes?.length || 0,
            firstScenePreview: visionPhase.script.script?.scenes?.[0] 
              ? JSON.stringify(visionPhase.script.script.scenes[0]).slice(0, 200)
              : 'NO SCENE DATA'
          })
          setScript(visionPhase.script)
        }
        if (visionPhase.characters) setCharacters(visionPhase.characters)
        if (visionPhase.scenes) setScenes(visionPhase.scenes)
        
        // Update generation progress to reflect saved state
        setGenerationProgress({
          script: { 
            complete: visionPhase.scriptGenerated || false, 
            progress: visionPhase.scriptGenerated ? 100 : 0 
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
          console.log('[Vision] Initiating generation for incomplete items...')
          // Defer generation until after hydration to prevent hydration mismatch
          setTimeout(() => initiateGeneration(proj), 100)
        } else {
          console.log('[Vision] All generation already complete')
        }
      } else {
        // No Vision data yet, start generation
        console.log('[Vision] No existing data, starting fresh generation')
        // Defer generation until after hydration to prevent hydration mismatch
        setTimeout(() => initiateGeneration(proj), 100)
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    }
  }

  const initiateGeneration = async (proj: Project) => {
    console.log('[Vision] Starting generation process...')
    setIsGenerating(true)
    
    try {
      const visionPhase = proj.metadata?.visionPhase
      let freshCharacters = characters
      let freshScenes = scenes
      
      // Step 1: Generate script (only if not already done)
      if (!visionPhase?.scriptGenerated) {
        console.log('[Vision] Step 1: Generating script...')
        const scriptData = await generateScript(proj)
        if (scriptData) {
          freshCharacters = scriptData.characters
          freshScenes = scriptData.scenes
          console.log('[Vision] Using fresh data:', {
            characterCount: freshCharacters.length,
            sceneCount: freshScenes.length
          })
        }
        console.log('[Vision] Step 1: Script generation complete')
      } else {
        console.log('[Vision] Step 1: Script already generated, skipping')
      }
      
      // Step 2: Generate character references (use fresh data!)
      if (!visionPhase?.charactersGenerated) {
        console.log('[Vision] Step 2: Generating characters...')
        if (freshCharacters.length > 0) {
          // Update state with fresh data before API call
          setCharacters(freshCharacters)
          await new Promise(resolve => setTimeout(resolve, 50)) // Let state update
          await generateCharacters()
        } else {
          console.log('[Vision] No characters to generate images for, marking complete')
          setGenerationProgress(prev => ({
            ...prev,
            characters: { complete: true, progress: 0, total: 0 }
          }))
        }
        console.log('[Vision] Step 2: Character generation complete')
      } else {
        console.log('[Vision] Step 2: Characters already generated, skipping')
      }
      
      // Step 3: Generate scene images (use fresh data!)
      if (!visionPhase?.scenesGenerated) {
        console.log('[Vision] Step 3: Generating scene images...')
        if (freshScenes.length > 0) {
          // Update state with fresh data before API call
          setScenes(freshScenes)
          await new Promise(resolve => setTimeout(resolve, 50)) // Let state update
          await generateScenes()
        } else {
          console.log('[Vision] No scenes to generate images for, marking complete')
          setGenerationProgress(prev => ({
            ...prev,
            scenes: { complete: true, progress: 0, total: 0 }
          }))
        }
        console.log('[Vision] Step 3: Scene generation complete')
      } else {
        console.log('[Vision] Step 3: Scenes already generated, skipping')
      }
      
      console.log('[Vision] All generation complete!')
    } catch (error) {
      console.error('[Vision] Generation error:', error)
      try { const { toast } = require('sonner'); toast.error('Generation failed: ' + (error as Error).message) } catch {}
    } finally {
      setIsGenerating(false)
    }
  }

  const generateScript = async (proj: Project): Promise<{ characters: any[], scenes: any[] } | null> => {
    try {
      console.log('[Vision] Calling script generation API...')
      setGenerationProgress(prev => ({ ...prev, script: { complete: false, progress: 10 } }))
      
      const res = await fetch('/api/vision/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: proj.id
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('[Vision] Script API error:', res.status, errorData)
        throw new Error(errorData.error || 'Script generation failed')
      }
      
      const data = await res.json()
      const freshCharacters = data.script?.characters || []
      const freshScenes = data.script?.script?.scenes || []
      
      console.log('[Vision] Script API response:', {
        hasScript: !!data.script,
        sceneCount: freshScenes.length,
        characterCount: freshCharacters.length
      })
      
      setScript(data.script)
      setCharacters(freshCharacters)
      setScenes(freshScenes)
      
      setGenerationProgress(prev => ({ 
        ...prev, 
        script: { complete: true, progress: 100 },
        characters: { complete: false, progress: 0, total: freshCharacters.length },
        scenes: { complete: false, progress: 0, total: freshScenes.length }
      }))
      
      // Return fresh data for immediate use
      return { characters: freshCharacters, scenes: freshScenes }
    } catch (error) {
      console.error('[Vision] Script generation error:', error)
      try { const { toast } = require('sonner'); toast.error('Script generation failed') } catch {}
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
      // Convert to base64 data URL
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        
        // Update character with uploaded image
        const updatedCharacters = characters.map(char => {
          const charId = char.id || characters.indexOf(char).toString()
          return charId === characterId 
            ? { ...char, referenceImage: dataUrl, imageApproved: false } 
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
          console.log('[Character Upload] Saved to project metadata')
        } catch (saveError) {
          console.error('Failed to save uploaded character to project:', saveError)
        }
        
        try { const { toast } = require('sonner'); toast.success('Character image uploaded!') } catch {}
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Character image upload failed:', error)
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
        body: JSON.stringify({ prompt })
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
          console.log('[Scene Image] Saved to project metadata')
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

  const handleRegenerateScene = async (sceneIndex: number) => {
    // Implement scene regeneration
    console.log('Regenerate scene:', sceneIndex)
  }

  const handleGenerateSceneImage = async (sceneIdx: number, customPrompt?: string) => {
    const scene = script?.script?.scenes?.[sceneIdx]
    if (!scene || !scene.visualDescription) {
      console.warn('No visual description available for scene', sceneIdx)
      try { const { toast } = require('sonner'); toast.error('Scene must be expanded first to generate image') } catch {}
      return
    }
    
    try {
      // Use custom prompt if provided, otherwise use visual description
      const prompt = customPrompt || scene.visualDescription
      
      // Get characters in this scene and their details
      const sceneCharacters = scene.characters?.map((charName: string) => {
        const char = characters.find((c: any) => c.name === charName)
        return char ? {
          name: char.name,
          description: char.description,
          referenceImage: char.referenceImage // Link to character image for consistency
        } : null
      }).filter(Boolean) || []
      
      const response = await fetch('/api/scene/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          sceneContext: {
            heading: scene.heading,
            characters: sceneCharacters,
            visualStyle: project?.metadata?.filmTreatmentVariant?.visual_style,
            tone: project?.metadata?.filmTreatmentVariant?.tone_description
          }
        })
      })
      
      if (!response.ok) throw new Error('Image generation failed')
      
      const data = await response.json()
      
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
    } catch (error) {
      console.error('Failed to generate scene image:', error)
      try { const { toast } = require('sonner'); toast.error('Failed to generate image') } catch {}
    }
  }

  const handleExport = () => {
    console.log('Export Vision')
  }

  const handleShare = () => {
    console.log('Share Vision')
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
        tabs={[
          { id: 'script', label: 'Script' },
          { id: 'characters', label: 'Characters' },
          { id: 'scenes', label: 'Scenes' }
        ]}
        activeTab={activePanel}
        onTabChange={(tab) => setActivePanel(tab as 'script' | 'characters' | 'scenes')}
        primaryActions={
          <Button className="bg-sf-primary text-white hover:bg-sf-accent flex items-center gap-2">
            <span>Continue to Direction</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        }
        secondaryActions={
          <>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save Draft</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </>
        }
      />
      
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 p-4">
        {/* Main Content Area */}
        <div className="space-y-4 overflow-hidden">
          {activePanel === 'script' && (
            <ScriptPanel 
              script={script}
              onScriptChange={setScript}
              isGenerating={isGenerating}
              onExpandScene={expandScene}
              onExpandAllScenes={expandAllScenes}
              onGenerateSceneImage={handleGenerateSceneImage}
              characters={characters}
            />
          )}
          
          {activePanel === 'characters' && (
            <CharacterLibrary 
              characters={characters}
              onRegenerateCharacter={handleRegenerateCharacter}
              onGenerateCharacter={handleGenerateCharacter}
              onUploadCharacter={handleUploadCharacter}
              onApproveCharacter={handleApproveCharacter}
            />
          )}
          
          {activePanel === 'scenes' && (
            <SceneGallery 
              scenes={scenes}
              characters={characters}
              onRegenerateScene={handleRegenerateScene}
              onGenerateScene={handleGenerateScene}
              onUploadScene={handleUploadScene}
            />
          )}
        </div>
        
        {/* Sidebar: Context & Tools */}
        <div className="space-y-4 overflow-y-auto">
          {/* Quick character reference for consistency */}
          {characters.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">Character Quick Reference</h3>
              <div className="space-y-2">
                {characters.slice(0, 5).map((char, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                      {char.referenceImage ? (
                        <img src={char.referenceImage} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                          {char.name?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div className="text-sm min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{char.name}</div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs truncate">{char.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Project Info */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">Project Details</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Duration</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {(() => {
                    const dur = project.duration || project.metadata?.filmTreatmentVariant?.total_duration_seconds || 60
                    return `${Math.floor(dur / 60)}m ${dur % 60}s`
                  })()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Scenes</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {script?.script?.scenes?.length || 0} {script?.script?.scenes?.length === 1 ? 'scene' : 'scenes'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Genre</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100 capitalize">{project.genre || (project.metadata as any)?.parsedMetadata?.genre || 'General'}</dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Tone</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100 capitalize">{project.tone || (project.metadata as any)?.parsedMetadata?.tone || 'Neutral'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      
      {/* Generation Progress Indicator */}
      <div suppressHydrationWarning>
        {isGenerating && (
          <GenerationProgress progress={generationProgress} />
        )}
      </div>
    </div>
  )
}

