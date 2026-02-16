'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Check, Sparkles, Info, Loader2, ChevronDown, ChevronUp, Image as ImageIcon, Box } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'
import { findSceneCharacters, findSceneObjects } from '../../lib/character/matching'
import { DetailedSceneDirection } from '@/types/scene-direction'
import { VisualReference } from '@/types/visionReferences'

interface ScenePromptStructure {
  location: string
  timeOfDay: string
  weather: string
  atmosphere: string
  shotType: string
  cameraAngle: string
  cameraMovement: string
  lensChoice: string
  lighting: string
  lightingMood: string
  characters: string[]
  characterActions: string
  talentBlocking: string
  emotionalBeat: string
  keyProps: string
  artStyle: string
  additionalDetails: string
  negativePrompt: string
}

interface ScenePromptBuilderProps {
  open: boolean
  onClose: () => void
  scene: any
  availableCharacters?: Array<{ 
    name: string
    description: string
    referenceImage?: string
    appearanceDescription?: string
    ethnicity?: string
    subject?: string
  }>
  /** Scene backdrop references from the Reference Library */
  sceneReferences?: VisualReference[]
  /** Prop/object references from the Reference Library */
  objectReferences?: VisualReference[]
  onGenerateImage: (selectedCharacters: any[] | any) => void
  isGenerating?: boolean
}

/**
 * Extract static position from video-style blocking instructions.
 * Still images can only show a single frozen moment, so we extract
 * the initial position and remove temporal/sequential instructions.
 * 
 * Example input:  "Ben Anderson begins downstage left facing the mirror (back to camera/Alex). 
 *                  Alex Anderson is seated upstage right on the couch. Ben turns to face Alex 
 *                  on 'I don't want the algorithm fixing me'."
 * 
 * Example output: "Ben Anderson is downstage left facing the mirror (back to camera/Alex). 
 *                  Alex Anderson is seated upstage right on the couch."
 */
function extractStaticPositionFromBlocking(blocking: string): string {
  if (!blocking) return ''
  
  let cleaned = blocking
  
  // Remove dialogue cue timing: "on 'I don't want...'" or "at 'line here'"
  cleaned = cleaned.replace(/\b(on|at|during|after|before)\s+['"][^'"]+['"][^.]*\./gi, '.')
  cleaned = cleaned.replace(/\b(on|at|during|after|before)\s+['"][^'"]+['"]/gi, '')
  
  // Remove "until X where Y" patterns: "remains seated until 'line' where he stands"
  cleaned = cleaned.replace(/\buntil\s+['"][^'"]+['"]\s*,?\s*(where|when)?\s*[^,.]+/gi, '')
  cleaned = cleaned.replace(/\buntil\s+[^,.]+\s+(where|when)\s+[^,.]+/gi, '')
  
  // Remove future action cues: "X turns to face Y" -> remove (describes future motion)
  cleaned = cleaned.replace(/\b(\w+)\s+(turns?|moves?|walks?|rises?|stands?|sits?)\s+to\s+(face|approach|meet|join|leave|exit)\s+[^,.]+/gi, '')
  
  // Convert "begins" to static: "begins downstage left" -> "is downstage left"
  cleaned = cleaned.replace(/\bbegins\s+(downstage|upstage|stage\s+left|stage\s+right|center)/gi, 'is $1')
  
  // Remove temporal continuity verbs: "remains/continues/keeps [verb]ing until..."
  cleaned = cleaned.replace(/\b(remains|continues|keeps|stays)\s+\w+(ing|ed)?\s+(until|while|as|for|throughout)\s+[^,.]+/gi, '')
  
  // Clean up dangling punctuation and spaces
  cleaned = cleaned.replace(/\s*,\s*,/g, ',')
  cleaned = cleaned.replace(/\s*\.\s*\./g, '.')
  cleaned = cleaned.replace(/,\s*\./g, '.')
  cleaned = cleaned.replace(/\s{2,}/g, ' ')
  cleaned = cleaned.replace(/^\s*[,.]\s*/g, '')
  cleaned = cleaned.replace(/\s*[,]\s*$/g, '')
  
  return cleaned.trim()
}

/**
 * Extract primary action from key actions array for still image.
 * Takes the first action and removes motion/manner adverbs that imply continuous movement.
 * 
 * Example input:  ["Ben fumbles aggressively with the Windsor knot", 
 *                  "Alex swipes casually through the air (miming holographic interaction)",
 *                  "Ben shivers slightly"]
 * 
 * Example output: "Ben adjusts the Windsor knot"
 */
function extractPrimaryAction(keyActions: string[]): string {
  if (!keyActions || keyActions.length === 0) return ''
  
  // Take only the first action for a still image
  let primaryAction = keyActions[0]
  
  // Remove manner adverbs that imply continuous motion
  primaryAction = primaryAction.replace(/\b(aggressively|nervously|repeatedly|continuously|frantically|vigorously)\s+/gi, '')
  
  // Convert continuous motion verbs to static poses where possible
  primaryAction = primaryAction.replace(/\bfumbles\s+(with)?/gi, 'adjusts ')
  primaryAction = primaryAction.replace(/\bpaces\b/gi, 'stands')
  primaryAction = primaryAction.replace(/\bfidgets\s+(with)?/gi, 'touches ')
  primaryAction = primaryAction.replace(/\bshivers\b/gi, 'appears cold')
  primaryAction = primaryAction.replace(/\bswipes\s+/gi, 'gestures ')
  
  // Clean up double spaces
  primaryAction = primaryAction.replace(/\s{2,}/g, ' ').trim()
  
  return primaryAction
}

export function ScenePromptBuilder({
  open,
  onClose,
  scene,
  availableCharacters = [],
  sceneReferences = [],
  objectReferences = [],
  onGenerateImage,
  isGenerating = false
}: ScenePromptBuilderProps) {
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')
  
  // Reference Library state
  const [selectedSceneRefIds, setSelectedSceneRefIds] = useState<string[]>([])
  const [selectedObjectRefIds, setSelectedObjectRefIds] = useState<string[]>([])
  const [autoDetectedObjectIds, setAutoDetectedObjectIds] = useState<string[]>([])  // Track auto-detected objects
  const [referenceLibraryOpen, setReferenceLibraryOpen] = useState(false)
  const [structure, setStructure] = useState<ScenePromptStructure>({
    location: '',
    timeOfDay: 'day',
    weather: 'clear',
    atmosphere: 'neutral',
    shotType: 'medium-close-up',
    cameraAngle: 'eye-level',
    cameraMovement: 'static',
    lensChoice: 'standard',
    lighting: 'natural',
    lightingMood: 'neutral',
    characters: [],
    characterActions: '',
    talentBlocking: '',
    emotionalBeat: '',
    keyProps: '',
    artStyle: 'photorealistic',
    additionalDetails: '',
    negativePrompt: 'blurry, low quality, distorted, poor composition'
  })
  
  const [advancedPrompt, setAdvancedPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  
  // State for advanced mode edits only
  const [isPromptEdited, setIsPromptEdited] = useState(false)

  // Parse scene description to auto-populate fields
  // PRIORITY: Use Scene Direction data (camera, lighting, scene, talent) if available
  useEffect(() => {
    if (!open || !scene) return
    
    const updates: Partial<ScenePromptStructure> = {}
    const sceneDirection: DetailedSceneDirection | undefined = scene.sceneDirection
    
    // AUTO-DETECT AND PRE-SELECT CHARACTERS using smart matching
    if (availableCharacters && availableCharacters.length > 0) {
      const sceneText = [
        scene.heading || '',
        scene.action || '',
        scene.visualDescription || '',
        ...(scene.dialogue || []).map((d: any) => d.character || '')
      ].join(' ')
      
      const detectedChars = findSceneCharacters(sceneText, availableCharacters)
      
      if (detectedChars.length > 0) {
        updates.characters = detectedChars.map((c: any) => c.name)
      }
    }
    
    // AUTO-DETECT AND PRE-SELECT OBJECTS using smart matching
    if (objectReferences && objectReferences.length > 0) {
      const sceneText = [
        scene.heading || '',
        scene.action || '',
        scene.visualDescription || '',
        scene.sceneDirection?.scene?.keyProps?.join(' ') || ''
      ].join(' ')
      
      const detectedObjects = findSceneObjects(
        sceneText, 
        objectReferences as any[], 
        scene.sceneNumber
      )
      
      if (detectedObjects.length > 0) {
        const detectedIds = detectedObjects.map((obj: any) => obj.id)
        setSelectedObjectRefIds(detectedIds)
        setAutoDetectedObjectIds(detectedIds)  // Track which were auto-detected
        console.log('[ScenePromptBuilder] Auto-detected objects:', detectedObjects.map((o: any) => o.name))
      }
    }
    
    // ============================================
    // SCENE DIRECTION DATA (Priority Source)
    // ============================================
    if (sceneDirection) {
      // Scene Direction data loaded
      
      // CAMERA DIRECTION
      if (sceneDirection.camera) {
        // Shot Type - extract from shots array
        if (sceneDirection.camera.shots && sceneDirection.camera.shots.length > 0) {
          const shotStr = sceneDirection.camera.shots[0].toLowerCase()
          if (shotStr.includes('extreme close')) updates.shotType = 'extreme-close-up'
          else if (shotStr.includes('close-up') || shotStr.includes('close up')) updates.shotType = 'close-up'
          else if (shotStr.includes('medium close') || shotStr.includes('mcu')) updates.shotType = 'medium-close-up'
          else if (shotStr.includes('medium shot') || shotStr.includes('ms')) updates.shotType = 'medium-shot'
          else if (shotStr.includes('extreme wide')) updates.shotType = 'extreme-wide'
          else if (shotStr.includes('wide') || shotStr.includes('establishing')) updates.shotType = 'wide-shot'
          else if (shotStr.includes('over') && shotStr.includes('shoulder')) updates.shotType = 'over-shoulder'
        }
        
        // Camera Angle
        if (sceneDirection.camera.angle) {
          const angleStr = sceneDirection.camera.angle.toLowerCase()
          if (angleStr.includes('low')) updates.cameraAngle = 'low-angle'
          else if (angleStr.includes('high')) updates.cameraAngle = 'high-angle'
          else if (angleStr.includes('bird')) updates.cameraAngle = 'birds-eye'
          else if (angleStr.includes('dutch')) updates.cameraAngle = 'dutch-angle'
          else updates.cameraAngle = 'eye-level'
        }
        
        // Camera Movement
        if (sceneDirection.camera.movement) {
          updates.cameraMovement = sceneDirection.camera.movement
        }
        
        // Lens Choice
        if (sceneDirection.camera.lensChoice) {
          updates.lensChoice = sceneDirection.camera.lensChoice
        }
      }
      
      // LIGHTING DIRECTION
      if (sceneDirection.lighting) {
        // Overall Mood
        if (sceneDirection.lighting.overallMood) {
          const moodStr = sceneDirection.lighting.overallMood.toLowerCase()
          updates.lightingMood = sceneDirection.lighting.overallMood
          
          if (moodStr.includes('high-key') || moodStr.includes('high key')) updates.lighting = 'soft'
          else if (moodStr.includes('low-key') || moodStr.includes('low key') || moodStr.includes('noir')) updates.lighting = 'dramatic'
          else if (moodStr.includes('natural') || moodStr.includes('soft')) updates.lighting = 'natural'
          else if (moodStr.includes('harsh') || moodStr.includes('hard')) updates.lighting = 'harsh'
        }
        
        // Time of Day from lighting
        if (sceneDirection.lighting.timeOfDay) {
          const timeStr = sceneDirection.lighting.timeOfDay.toLowerCase()
          if (timeStr.includes('golden') || timeStr.includes('sunset')) updates.timeOfDay = 'golden-hour'
          else if (timeStr.includes('night')) updates.timeOfDay = 'night'
          else if (timeStr.includes('dawn') || timeStr.includes('morning')) updates.timeOfDay = 'dawn'
          else if (timeStr.includes('twilight') || timeStr.includes('dusk')) updates.timeOfDay = 'dusk'
          else updates.timeOfDay = 'day'
        }
      }
      
      // SCENE DIRECTION (Location & Props)
      if (sceneDirection.scene) {
        // Location
        if (sceneDirection.scene.location) {
          updates.location = sceneDirection.scene.location
        }
        
        // Atmosphere
        if (sceneDirection.scene.atmosphere) {
          const atmoStr = sceneDirection.scene.atmosphere.toLowerCase()
          if (atmoStr.includes('tense')) updates.atmosphere = 'tense'
          else if (atmoStr.includes('mysterious') || atmoStr.includes('hazy')) updates.atmosphere = 'mysterious'
          else if (atmoStr.includes('chaotic') || atmoStr.includes('energetic')) updates.atmosphere = 'energetic'
          else if (atmoStr.includes('serene') || atmoStr.includes('peaceful') || atmoStr.includes('minimalist')) updates.atmosphere = 'serene'
          else if (atmoStr.includes('melancholic') || atmoStr.includes('sad')) updates.atmosphere = 'melancholic'
          else if (atmoStr.includes('hopeful') || atmoStr.includes('bright')) updates.atmosphere = 'hopeful'
        }
        
        // Key Props
        if (sceneDirection.scene.keyProps && sceneDirection.scene.keyProps.length > 0) {
          updates.keyProps = sceneDirection.scene.keyProps.join(', ')
        }
      }
      
      // TALENT DIRECTION (Blocking & Actions)
      // CRITICAL: Filter for still image generation - extract static positions only
      // Video-style blocking contains temporal sequences that can't be shown in one frame
      if (sceneDirection.talent) {
        // Blocking - extract static positions, remove temporal/dialogue cues
        if (sceneDirection.talent.blocking) {
          const staticBlocking = extractStaticPositionFromBlocking(sceneDirection.talent.blocking)
          if (staticBlocking) {
            updates.talentBlocking = staticBlocking
            console.log('[ScenePromptBuilder] Extracted static blocking:', {
              original: sceneDirection.talent.blocking.substring(0, 100) + '...',
              static: staticBlocking.substring(0, 100) + '...'
            })
          }
        }
        
        // Key Actions -> Primary Action (first action only, motion adverbs stripped)
        if (sceneDirection.talent.keyActions && sceneDirection.talent.keyActions.length > 0) {
          const primaryAction = extractPrimaryAction(sceneDirection.talent.keyActions)
          if (primaryAction) {
            updates.characterActions = primaryAction
            console.log('[ScenePromptBuilder] Extracted primary action:', {
              original: sceneDirection.talent.keyActions,
              primary: primaryAction
            })
          }
        }
        
        // Emotional Beat
        if (sceneDirection.talent.emotionalBeat) {
          updates.emotionalBeat = sceneDirection.talent.emotionalBeat
        }
      }
    } else {
      // ============================================
      // FALLBACK: Parse from heading & description
      // ============================================
      console.log('[ScenePromptBuilder] No Scene Direction, falling back to description parsing')
      
      // Parse heading: "INT./EXT. LOCATION - TIME"
      if (scene.heading) {
        const headingMatch = scene.heading.match(/(INT|EXT)\.\s+(.+?)\s+-\s+(.+)/i)
        if (headingMatch) {
          updates.location = headingMatch[2].trim()
          const time = headingMatch[3].trim().toLowerCase()
          if (time.includes('night') || time.includes('evening')) updates.timeOfDay = 'night'
          else if (time.includes('morning') || time.includes('dawn')) updates.timeOfDay = 'dawn'
          else if (time.includes('afternoon')) updates.timeOfDay = 'day'
          else if (time.includes('dusk') || time.includes('sunset')) updates.timeOfDay = 'dusk'
          else updates.timeOfDay = 'day'
        }
      }
      
      // Parse visual description for atmosphere, lighting, camera
      const desc = (scene.visualDescription || scene.action || '').toLowerCase()
      
      // Atmosphere
      if (desc.includes('dark') || desc.includes('moody') || desc.includes('ominous')) {
        updates.atmosphere = 'tense'
      } else if (desc.includes('bright') || desc.includes('vibrant') || desc.includes('cheerful')) {
        updates.atmosphere = 'hopeful'
      } else if (desc.includes('tense') || desc.includes('suspenseful')) {
        updates.atmosphere = 'tense'
      }
      
      // Camera angles
      if (desc.includes('close up') || desc.includes('close-up')) {
        if (desc.includes('medium close') || desc.includes('medium-close')) {
          updates.shotType = 'medium-close-up'
        } else {
          updates.shotType = 'close-up'
        }
      } else if (desc.includes('wide shot') || desc.includes('wide angle') || desc.includes('establishing')) {
        updates.shotType = 'wide-shot'
      } else if (desc.includes('medium')) {
        updates.shotType = 'medium-close-up'
      }
      
      if (desc.includes('high angle') || desc.includes('high-angle')) {
        updates.cameraAngle = 'high-angle'
      } else if (desc.includes('low angle') || desc.includes('low-angle')) {
        updates.cameraAngle = 'low-angle'
      }
      
      // Lighting
      if (desc.includes('dramatic lighting') || desc.includes('side lighting')) {
        updates.lighting = 'dramatic'
      } else if (desc.includes('soft') || desc.includes('diffused')) {
        updates.lighting = 'soft'
      } else if (desc.includes('backlight') || desc.includes('silhouette')) {
        updates.lighting = 'backlit'
      }
    }
    
    setStructure(prev => ({ ...prev, ...updates }))
  }, [open, scene, availableCharacters, objectReferences])

  // Sync to advanced mode when switching
  useEffect(() => {
    if (mode === 'advanced' && !advancedPrompt) {
      // Populate with constructed prompt from guided mode
      const constructed = constructPrompt()
      if (constructed) {
        setAdvancedPrompt(constructed)
      }
    }
  }, [mode, advancedPrompt])

  // Reset editing state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset editing state when dialog closes
      setIsPromptEdited(false)
      setAdvancedPrompt('')
    }
  }, [open])

  // Construct prompt from structure (using Scene Direction data when available)
  const constructPrompt = (): string => {
    const parts: string[] = []
    
    // Shot type
    const shotTypes: Record<string, string> = {
      'wide-shot': 'Wide establishing shot',
      'medium-shot': 'Medium shot',
      'medium-close-up': 'Medium close-up shot',
      'close-up': 'Close-up shot',
      'extreme-close-up': 'Extreme close-up shot',
      'extreme-wide': 'Extreme wide shot',
      'over-shoulder': 'Over the shoulder shot'
    }
    if (structure.shotType) parts.push(shotTypes[structure.shotType] || structure.shotType)
    
    // Location
    if (structure.location) parts.push(`of ${structure.location}`)
    
    // Time and weather
    const timeWeather: string[] = []
    if (structure.timeOfDay && structure.timeOfDay !== 'day') {
      const timeLabels: Record<string, string> = {
        'dawn': 'at dawn',
        'day': 'during the day',
        'dusk': 'at dusk',
        'night': 'at night',
        'golden-hour': 'during golden hour'
      }
      timeWeather.push(timeLabels[structure.timeOfDay] || structure.timeOfDay)
    }
    if (structure.weather && structure.weather !== 'clear') timeWeather.push(structure.weather)
    if (timeWeather.length) parts.push(timeWeather.join(', '))
    
    // Characters, actions, and talent blocking
    if (structure.characters.length > 0) {
      const charList = structure.characters.join(', ')
      const actionParts: string[] = []
      
      // Add talent blocking if available
      if (structure.talentBlocking) {
        actionParts.push(structure.talentBlocking)
      }
      
      // Add character actions
      if (structure.characterActions) {
        actionParts.push(structure.characterActions)
      }
      
      if (actionParts.length > 0) {
        parts.push(`featuring ${charList} - ${actionParts.join(', ')}`)
      } else {
        parts.push(`featuring ${charList}`)
      }
    }
    
    // Emotional beat (from talent direction)
    if (structure.emotionalBeat) {
      parts.push(`conveying ${structure.emotionalBeat}`)
    }
    
    // Atmosphere
    if (structure.atmosphere && structure.atmosphere !== 'neutral') {
      parts.push(`${structure.atmosphere} atmosphere`)
    }
    
    // Camera angle
    const angles: Record<string, string> = {
      'eye-level': 'eye level camera angle',
      'low-angle': 'low angle camera',
      'high-angle': 'high angle camera',
      'birds-eye': "bird's eye view",
      'dutch-angle': 'dutch angle'
    }
    if (structure.cameraAngle && structure.cameraAngle !== 'eye-level') {
      parts.push(angles[structure.cameraAngle] || structure.cameraAngle)
    }
    
    // Camera movement - EXCLUDED for static image generation
    // Video-specific movements like "Dolly In", "Pan Left" confuse image models
    // Images capture a single frozen moment, not motion
    
    // Lens choice (from Scene Direction)
    if (structure.lensChoice && structure.lensChoice !== 'standard') {
      parts.push(`shot with ${structure.lensChoice}`)
    }
    
    // Lighting
    const lightingTypes: Record<string, string> = {
      'natural': 'natural lighting',
      'golden-hour': 'golden hour lighting',
      'dramatic': 'dramatic cinematic lighting',
      'soft': 'soft diffused lighting',
      'harsh': 'harsh contrast lighting',
      'backlit': 'backlit scene'
    }
    if (structure.lighting) parts.push(lightingTypes[structure.lighting] || structure.lighting)
    
    // Lighting mood (from Scene Direction)
    if (structure.lightingMood && structure.lightingMood !== 'neutral') {
      parts.push(`${structure.lightingMood} mood`)
    }
    
    // Key props (from Scene Direction)
    if (structure.keyProps) {
      parts.push(`with ${structure.keyProps}`)
    }
    
    // Scene backdrop references (from Reference Library)
    const selectedSceneRefs = sceneReferences.filter(r => selectedSceneRefIds.includes(r.id))
    if (selectedSceneRefs.length > 0) {
      const backdropDescriptions = selectedSceneRefs
        .map(r => r.description || r.name)
        .join(', ')
      parts.push(`matching the visual style of ${backdropDescriptions}`)
    }
    
    // Object/prop references (from Reference Library)
    const selectedObjectRefs = objectReferences.filter(r => selectedObjectRefIds.includes(r.id))
    if (selectedObjectRefs.length > 0) {
      // Sort by importance: critical first, then important, then background
      const sortedObjects = [...selectedObjectRefs].sort((a, b) => {
        const order: Record<string, number> = { critical: 0, important: 1, background: 2 }
        return (order[a.importance || 'background'] ?? 3) - (order[b.importance || 'background'] ?? 3)
      })
      
      // Build object descriptions - include description for critical/important objects
      const objectDescriptions = sortedObjects.map(obj => {
        if ((obj.importance === 'critical' || obj.importance === 'important') && obj.description) {
          return `${obj.name} (${obj.description})`
        }
        return obj.name
      })
      
      if (objectDescriptions.length === 1) {
        parts.push(`featuring the ${objectDescriptions[0]}`)
      } else {
        parts.push(`featuring props: ${objectDescriptions.join(', ')}`)
      }
    }
    
    // Additional details
    if (structure.additionalDetails) parts.push(structure.additionalDetails)
    
    // Art style
    const stylePreset = artStylePresets.find(s => s.id === structure.artStyle)
    if (stylePreset) parts.push(stylePreset.promptSuffix)
    
    return parts.filter(Boolean).join(', ')
  }

  // Get the raw constructed prompt (no optimization)
  const getRawPrompt = (): string => {
    if (mode === 'advanced') {
      return advancedPrompt
    } else {
      return constructPrompt()
    }
  }

  const constructedPrompt = getRawPrompt()

  const handleGenerateScene = () => {
    // Pass full character objects (not just names) so API gets referenceImage URLs
    const selectedCharacterObjects = structure.characters
      .map(charName => {
        const found = availableCharacters.find(c => c.name === charName)
        return found
      })
      .filter(Boolean)
    
    // Collect selected scene/object references for style matching
    const selectedSceneRefs = sceneReferences.filter(r => selectedSceneRefIds.includes(r.id))
    const selectedObjectRefs = objectReferences.filter(r => selectedObjectRefIds.includes(r.id))
    
    // Pass prompt builder selections to API
    // Send raw prompt as scenePrompt (API will handle optimization)
    const rawPrompt = getRawPrompt()
    const promptData = {
      characters: selectedCharacterObjects,
      scenePrompt: rawPrompt,              // Raw prompt - API will optimize with character references
      artStyle: structure.artStyle,         // Selected art style
      shotType: structure.shotType,        // Camera framing
      cameraAngle: structure.cameraAngle,   // Camera angle
      lighting: structure.lighting,         // Lighting selection
      // NEW: Include reference images for style matching
      sceneReferences: selectedSceneRefs.map(ref => ({
        id: ref.id,
        name: ref.name,
        description: ref.description,
        imageUrl: ref.imageUrl,
        type: 'scene' as const
      })),
      objectReferences: selectedObjectRefs.map(ref => ({
        id: ref.id,
        name: ref.name,
        description: ref.description,
        imageUrl: ref.imageUrl,
        type: 'object' as const,
        category: ref.category,      // prop, vehicle, set-piece, etc.
        importance: ref.importance   // critical, important, background
      }))
    }
    
    // Call parent handler - it will update isGenerating prop
    onGenerateImage(promptData)
    
    // Close the dialog immediately after triggering generation
    onClose()
  }

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(constructedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleModeChange = (newMode: string) => {
    const mode = newMode as 'guided' | 'advanced'
    if (mode === 'advanced' && !advancedPrompt) {
      // When switching to advanced, populate with constructed prompt from guided mode
      const currentPrompt = constructPrompt()
      setAdvancedPrompt(currentPrompt)
    }
    setMode(mode)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] bg-gray-900 text-white border-gray-700 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white">Opening Frame — {scene?.heading || `Scene ${scene?.sceneNumber || ''}`}</DialogTitle>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="w-full">
            <TabsTrigger value="guided" className="flex-1">
              Visual Setup
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex-1">
              Custom Prompt
            </TabsTrigger>
          </TabsList>

          {/* Character Reference Guidance Banner */}
          {structure.characters.length > 0 && structure.characters.some(charName => {
            const char = availableCharacters.find(c => c.name === charName)
            return char?.referenceImage
          }) && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-300">
                  <p className="font-medium mb-1">Character References Active</p>
                  <p className="text-blue-400/80">
                    For best results with character references, use <span className="font-medium">Close-Up</span> or{' '}
                    <span className="font-medium">Medium Shot</span> framing. Wide shots make characters too small 
                    for facial recognition.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Guided Mode */}
          <TabsContent value="guided" className="space-y-4 mt-4">
            {/* Location & Setting */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Location & Setting</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-400">Location/Setting</label>
                  <Input
                    value={structure.location}
                    onChange={(e) => setStructure(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="beach at sunrise, urban street, mountain peak"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Time of Day</label>
                    <Select value={structure.timeOfDay} onValueChange={(v) => setStructure(prev => ({ ...prev, timeOfDay: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dawn">Dawn</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="dusk">Dusk</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                        <SelectItem value="golden-hour">Golden Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Weather</label>
                    <Select value={structure.weather} onValueChange={(v) => setStructure(prev => ({ ...prev, weather: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clear">Clear</SelectItem>
                        <SelectItem value="overcast">Overcast</SelectItem>
                        <SelectItem value="rainy">Rainy</SelectItem>
                        <SelectItem value="stormy">Stormy</SelectItem>
                        <SelectItem value="foggy">Foggy</SelectItem>
                        <SelectItem value="snowy">Snowy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Atmosphere/Mood</label>
                  <Select value={structure.atmosphere} onValueChange={(v) => setStructure(prev => ({ ...prev, atmosphere: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="serene">Serene</SelectItem>
                      <SelectItem value="tense">Tense</SelectItem>
                      <SelectItem value="mysterious">Mysterious</SelectItem>
                      <SelectItem value="energetic">Energetic</SelectItem>
                      <SelectItem value="melancholic">Melancholic</SelectItem>
                      <SelectItem value="hopeful">Hopeful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Characters */}
            {availableCharacters.length > 0 && (
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Characters in Scene</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-400">Select Characters</label>
                    <div className="mt-1 space-y-2">
                      {availableCharacters.map(char => (
                        <label 
                          key={char.name} 
                          className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                            structure.characters.includes(char.name)
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={structure.characters.includes(char.name)}
                            onChange={(e) => {
                              setStructure(prev => ({
                                ...prev,
                                characters: e.target.checked
                                  ? [...prev.characters, char.name]
                                  : prev.characters.filter(n => n !== char.name)
                              }))
                            }}
                            className="rounded"
                          />
                          {char.referenceImage && (
                            <img
                              src={char.referenceImage}
                              alt={char.name}
                              className="w-8 h-8 rounded-full object-cover border border-gray-600"
                            />
                          )}
                          <div className="flex-1">
                            <div className="text-sm text-gray-200">{char.name}</div>
                            {char.referenceImage && (
                              <div className="text-[10px] text-green-400">✓ Has reference image</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">What are they doing?</label>
                    <Input
                      value={structure.characterActions}
                      onChange={(e) => setStructure(prev => ({ ...prev, characterActions: e.target.value }))}
                      placeholder="walking along the shore, engaged in conversation"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reference Library - Scene Backdrops & Props */}
            {(sceneReferences.length > 0 || objectReferences.length > 0) && (
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <button
                  onClick={() => setReferenceLibraryOpen(!referenceLibraryOpen)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-200 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    Reference Library 📚
                    {(selectedSceneRefIds.length > 0 || selectedObjectRefIds.length > 0) && (
                      <span className="text-xs text-green-400 font-normal">
                        ({selectedSceneRefIds.length + selectedObjectRefIds.length} selected)
                      </span>
                    )}
                  </span>
                  {referenceLibraryOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                {referenceLibraryOpen && (
                  <div className="space-y-4 pt-2">
                    {/* Scenes */}
                    {sceneReferences.length > 0 && (
                      <div>
                        <label className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                          <ImageIcon className="w-3 h-3" />
                          Scenes
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {sceneReferences.map(ref => (
                            <button
                              key={ref.id}
                              onClick={() => {
                                setSelectedSceneRefIds(prev => 
                                  prev.includes(ref.id) 
                                    ? prev.filter(id => id !== ref.id)
                                    : [...prev, ref.id]
                                )
                              }}
                              className={`relative aspect-video rounded overflow-hidden border-2 transition-all ${
                                selectedSceneRefIds.includes(ref.id)
                                  ? 'border-blue-500 ring-2 ring-blue-500/50'
                                  : 'border-gray-700 hover:border-gray-500'
                              }`}
                              title={ref.description || ref.name}
                            >
                              {ref.imageUrl ? (
                                <img
                                  src={ref.imageUrl}
                                  alt={ref.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-gray-500" />
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                <div className="text-[9px] text-white truncate">{ref.name}</div>
                              </div>
                              {selectedSceneRefIds.includes(ref.id) && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Props */}
                    {objectReferences.length > 0 && (
                      <div>
                        <label className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                          <Box className="w-3 h-3" />
                          Props
                          {autoDetectedObjectIds.length > 0 && (
                            <span className="text-green-400 ml-2">
                              ({autoDetectedObjectIds.length} auto-detected)
                            </span>
                          )}
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {objectReferences.map(ref => {
                            const isSelected = selectedObjectRefIds.includes(ref.id)
                            const isAutoDetected = autoDetectedObjectIds.includes(ref.id)
                            return (
                              <button
                                key={ref.id}
                                onClick={() => {
                                  setSelectedObjectRefIds(prev => 
                                    prev.includes(ref.id) 
                                      ? prev.filter(id => id !== ref.id)
                                      : [...prev, ref.id]
                                  )
                                }}
                                className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                                  isSelected
                                    ? 'border-purple-500 ring-2 ring-purple-500/50'
                                    : 'border-gray-700 hover:border-gray-500'
                                }`}
                                title={ref.description || ref.name}
                              >
                                {ref.imageUrl ? (
                                  <img
                                    src={ref.imageUrl}
                                    alt={ref.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                    <Box className="w-4 h-4 text-gray-500" />
                                  </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                  <div className="text-[9px] text-white truncate">{ref.name}</div>
                                  {isAutoDetected && isSelected && (
                                    <div className="text-[8px] text-green-400">✓ Auto-detected</div>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                                {/* Show importance badge for critical objects */}
                                {ref.importance === 'critical' && (
                                  <div className="absolute top-1 left-1 px-1 py-0.5 bg-red-500/80 rounded text-[8px] text-white">
                                    Critical
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-500">
                      Selected references will be used for visual style consistency in the generated image.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Camera & Composition */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Camera & Composition 🎬</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Shot Type</label>
                  <Select value={structure.shotType} onValueChange={(v) => setStructure(prev => ({ ...prev, shotType: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const hasReferences = structure.characters.some(charName => {
                          const char = availableCharacters.find(c => c.name === charName)
                          return char?.referenceImage
                        })
                        
                        return (
                          <>
                            <SelectItem value="extreme-close-up">
                              Extreme Close-Up (ECU) {hasReferences && '✓'}
                            </SelectItem>
                            <SelectItem value="close-up">
                              Close-Up (CU) {hasReferences && '✓ Recommended'}
                            </SelectItem>
                            <SelectItem value="medium-close-up">
                              Medium Close-Up (MCU) {hasReferences && '✓'}
                            </SelectItem>
                            <SelectItem value="medium-shot">
                              Medium Shot (MS) {hasReferences && '✓'}
                            </SelectItem>
                            <SelectItem value="over-shoulder">
                              Over Shoulder {hasReferences && '✓'}
                            </SelectItem>
                            <SelectItem value="wide-shot" className={hasReferences ? 'text-yellow-400' : ''}>
                              Wide Shot (WS) {hasReferences && '⚠️ Limited'}
                            </SelectItem>
                            <SelectItem value="extreme-wide" className={hasReferences ? 'text-red-400' : ''}>
                              Extreme Wide {hasReferences && '❌ Too small'}
                            </SelectItem>
                          </>
                        )
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Camera Angle</label>
                  <Select value={structure.cameraAngle} onValueChange={(v) => setStructure(prev => ({ ...prev, cameraAngle: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eye-level">Eye Level</SelectItem>
                      <SelectItem value="low-angle">Low Angle</SelectItem>
                      <SelectItem value="high-angle">High Angle</SelectItem>
                      <SelectItem value="birds-eye">Bird's Eye</SelectItem>
                      <SelectItem value="dutch-angle">Dutch Angle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Lens Choice</label>
                  <Select value={structure.lensChoice} onValueChange={(v) => setStructure(prev => ({ ...prev, lensChoice: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (50mm)</SelectItem>
                      <SelectItem value="wide-angle">Wide-Angle (24mm)</SelectItem>
                      <SelectItem value="telephoto">Telephoto (85mm+)</SelectItem>
                      <SelectItem value="macro">Macro</SelectItem>
                      <SelectItem value="anamorphic">Anamorphic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Lighting</label>
                  <Select value={structure.lighting} onValueChange={(v) => setStructure(prev => ({ ...prev, lighting: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="golden-hour">Golden Hour</SelectItem>
                      <SelectItem value="dramatic">Dramatic</SelectItem>
                      <SelectItem value="soft">Soft Diffused</SelectItem>
                      <SelectItem value="harsh">Harsh Contrast</SelectItem>
                      <SelectItem value="backlit">Backlit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Lighting Mood</label>
                  <Input
                    value={structure.lightingMood}
                    onChange={(e) => setStructure(prev => ({ ...prev, lightingMood: e.target.value }))}
                    placeholder="e.g., High-Key, Low-Key, Film Noir"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Talent Direction (from Scene Direction) */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Talent Direction 🎭</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-400">Blocking/Positioning</label>
                  <Input
                    value={structure.talentBlocking}
                    onChange={(e) => setStructure(prev => ({ ...prev, talentBlocking: e.target.value }))}
                    placeholder="e.g., Actor A at window, Actor B enters from left"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Emotional Beat</label>
                  <Input
                    value={structure.emotionalBeat}
                    onChange={(e) => setStructure(prev => ({ ...prev, emotionalBeat: e.target.value }))}
                    placeholder="e.g., Convey anxiety, Moment of realization"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Key Props</label>
                  <Input
                    value={structure.keyProps}
                    onChange={(e) => setStructure(prev => ({ ...prev, keyProps: e.target.value }))}
                    placeholder="e.g., steaming coffee mug, flickering neon sign"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Art Style */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Art Style 🎨</h3>
              <div className="grid grid-cols-5 gap-2">
                {artStylePresets.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setStructure(prev => ({ ...prev, artStyle: style.id }))}
                    className={`p-2 rounded border transition-all ${
                      structure.artStyle === style.id
                        ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                    title={style.description}
                  >
                    <div className="aspect-square bg-gray-700 rounded mb-1 flex items-center justify-center overflow-hidden">
                      {style.thumbnail ? (
                        <img 
                          src={style.thumbnail} 
                          alt={style.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl text-gray-400">{style.name[0]}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-300 truncate">{style.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Additional Details</h3>
              <Textarea
                value={structure.additionalDetails}
                onChange={(e) => setStructure(prev => ({ ...prev, additionalDetails: e.target.value }))}
                placeholder="Add any specific details: props, visual effects, special elements..."
                rows={3}
                className="resize-none"
              />
            </div>
          </TabsContent>

          {/* Advanced Mode */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* Custom Prompt - Editable */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400">Custom Scene Prompt</label>
              </div>
              <Textarea
                value={advancedPrompt}
                onChange={(e) => {
                  setAdvancedPrompt(e.target.value)
                  setIsPromptEdited(true)
                }}
                rows={12}
                placeholder="Enter your custom prompt here. The API will optimize it with character references and safety filters..."
                className="resize-vertical"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Tip: Write your scene description here. The API will automatically optimize it with character references, safety filters, and art style settings when you generate.
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Negative Prompt</label>
              <Textarea
                value={structure.negativePrompt}
                onChange={(e) => setStructure(prev => ({ ...prev, negativePrompt: e.target.value }))}
                rows={3}
                placeholder="blurry, low quality, distorted, poor composition..."
                className="resize-none"
              />
            </div>
          </TabsContent>
        </Tabs>
        </div>

        {/* Fixed Footer - Always Visible */}
        <div className="border-t border-gray-700 p-4 bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">
              {mode === 'guided' 
                ? 'Prompt Preview'
                : 'Custom Prompt'
              }
            </label>
          </div>
          <div className="text-sm text-gray-200 p-2 bg-gray-800 rounded border border-gray-700 max-h-32 overflow-y-auto leading-relaxed">
            {constructedPrompt || <span className="text-gray-500 italic">Fill in the fields above to build your prompt...</span>}
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              onClick={handleGenerateScene} 
              disabled={isGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Scene Image
                </>
              )}
            </Button>
            <Button onClick={handleCopy} variant="outline" className="px-3">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Loading Overlay - Freeze screen during generation */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center rounded-lg">
            <div className="bg-gray-900 border-2 border-purple-500 rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-sm">
              <div className="relative mb-4">
                <Loader2 className="w-16 h-16 animate-spin text-purple-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-purple-300 animate-pulse"></div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Generating Scene Image</h3>
              <p className="text-sm text-gray-300 text-center">
                Creating your scene visualization...
              </p>
              <p className="text-xs text-gray-400 mt-2">
                This may take 10-15 seconds
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

