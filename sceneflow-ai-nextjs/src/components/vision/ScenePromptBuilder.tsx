'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Check, Sparkles, Info, Loader2, ChevronDown, ChevronUp, Image as ImageIcon, Box, Wand2, Shirt, MapPin } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { artStylePresets } from '@/constants/artStylePresets'
import { findSceneCharacters, findSceneObjects } from '../../lib/character/matching'
import { DetailedSceneDirection } from '@/types/scene-direction'
import { VisualReference, LocationReference } from '@/types/visionReferences'
import { cn } from '@/lib/utils'
import {
  LocationSettingSection,
  CharacterSelectionSection,
  PropSelectionSection,
  CameraCompositionSection,
  ArtStyleGrid,
  QualityModeSection,
  TalentDirectionSection,
} from '@/components/image-gen'
import type { ModelTier, ThinkingLevel } from '@/components/image-gen'

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
    wardrobes?: Array<{
      id: string
      name: string
      description: string
    }>
  }>
  /** Scene backdrop references from the Reference Library */
  sceneReferences?: VisualReference[]
  /** Prop/object references from the Reference Library */
  objectReferences?: VisualReference[]
  /** Location references for environment/setting consistency */
  locationReferences?: LocationReference[]
  /** Wardrobe assignments for this scene { characterName: wardrobeId } */
  sceneWardrobes?: Record<string, string>
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
  locationReferences = [],
  sceneWardrobes = {},
  onGenerateImage,
  isGenerating = false
}: ScenePromptBuilderProps) {
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')
  // Default to 'eco' (Draft) — scene images are visual-only storyboard previews, not reference images
  // Users can select 'designer' (Final) for production-quality scene visuals
  const [modelTier, setModelTier] = useState<ModelTier>('eco')
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('low')
  
  // Reference Library state
  const [selectedSceneRefIds, setSelectedSceneRefIds] = useState<string[]>([])
  const [selectedObjectRefIds, setSelectedObjectRefIds] = useState<string[]>([])
  const [autoDetectedObjectIds, setAutoDetectedObjectIds] = useState<string[]>([])  // Track auto-detected objects
  const [referenceLibraryOpen, setReferenceLibraryOpen] = useState(false)
  
  // Location reference state
  const [selectedLocationRefIds, setSelectedLocationRefIds] = useState<string[]>([])
  const [autoMatchedLocationRefIds, setAutoMatchedLocationRefIds] = useState<Set<string>>(new Set())
  const [locationSectionCollapsed, setLocationSectionCollapsed] = useState(true)
  
  // Local wardrobe selections (can override sceneWardrobes prop)
  const [localWardrobes, setLocalWardrobes] = useState<Record<string, string>>({})
  
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
  const [isOptimizing, setIsOptimizing] = useState(false)

  // Parse scene description to auto-populate fields
  // PRIORITY: Use Scene Direction data (camera, lighting, scene, talent) if available
  useEffect(() => {
    if (!open || !scene) return
    
    const updates: Partial<ScenePromptStructure> = {}
    const sceneDirection: DetailedSceneDirection | undefined = scene.sceneDirection
    
    // Build comprehensive text for character/prop detection
    // Include: visualDescription, Scene Direction main text, and keyProps
    const visualDescriptionText = scene.visualDescription || ''
    const sceneDirectionText = scene.sceneDirectionText || ''
    const keyPropsText = sceneDirection?.scene?.keyProps?.join(' ') || ''
    const fullDetectionText = [visualDescriptionText, sceneDirectionText, keyPropsText].filter(Boolean).join(' ')
    
    // AUTO-DETECT AND PRE-SELECT CHARACTERS using intelligent nickname matching
    // (e.g., "Ben" in scene direction will match "Dr. Benjamin Anderson")
    // CRITICAL: Skip character detection for no-talent scenes (title sequences, VFX-only, etc.)
    const talentText = sceneDirection?.talent?.blocking || sceneDirection?.talent?.emotionalBeat || ''
    const isNoTalentScene = talentText.toLowerCase().match(/\b(n\/a|no\s+(live\s+)?actors?|no\s+talent|no\s+performers?)\b/)
    
    if (!isNoTalentScene && availableCharacters && availableCharacters.length > 0) {
      const detectedChars = findSceneCharacters(fullDetectionText, availableCharacters)
      
      if (detectedChars.length > 0) {
        updates.characters = detectedChars.map((c: any) => c.name)
        console.log('[ScenePromptBuilder] Auto-selected characters (with nickname matching):', detectedChars.map((c: any) => c.name))
      }
    } else if (isNoTalentScene) {
      updates.characters = []
      console.log('[ScenePromptBuilder] No-talent scene detected — skipping character auto-selection')
    }
    
    // AUTO-DETECT AND PRE-SELECT OBJECTS from scene text + keyProps
    // Matches against both scene text and Scene Direction keyProps for comprehensive detection
    if (objectReferences && objectReferences.length > 0) {
      const detectedObjects = findSceneObjects(
        fullDetectionText, 
        objectReferences as any[], 
        scene.sceneNumber
      )
      
      // Also match against keyProps names directly
      const keyProps = sceneDirection?.scene?.keyProps || []
      const additionalMatches: any[] = []
      
      keyProps.forEach((propName: string) => {
        const propNameLower = propName.toLowerCase()
        objectReferences.forEach((ref: any) => {
          const refNameLower = ref.name.toLowerCase()
          // Check if keyProp name matches or is contained in reference name
          if (refNameLower.includes(propNameLower) || propNameLower.includes(refNameLower)) {
            if (!detectedObjects.find(d => d.id === ref.id) && !additionalMatches.find(a => a.id === ref.id)) {
              additionalMatches.push(ref)
            }
          }
        })
      })
      
      const allDetected = [...detectedObjects, ...additionalMatches]
      
      if (allDetected.length > 0) {
        // Sort by importance and limit to top 5
        const sorted = allDetected.sort((a: any, b: any) => {
          const order: Record<string, number> = { critical: 0, important: 1, background: 2 }
          return (order[a.importance || 'background'] ?? 3) - (order[b.importance || 'background'] ?? 3)
        })
        
        const topObjects = sorted.slice(0, 5)
        const allDetectedIds = sorted.map((obj: any) => obj.id)
        
        // DO NOT pre-select props by default - effective scene illustration > prop consistency
        // Users can manually select props to enhance the image if needed
        setSelectedObjectRefIds([])  // Start with no props selected
        setAutoDetectedObjectIds(allDetectedIds)  // Track for "suggested" hints in UI
        console.log('[ScenePromptBuilder] Detected props (not auto-selected):', topObjects.map((o: any) => o.name))
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
          else if (moodStr.includes('stylized') || moodStr.includes('digital') || moodStr.includes('neon') || moodStr.includes('self-illuminat') || moodStr.includes('ethereal')) updates.lighting = 'stylized'
        }
        
        // Time of Day from lighting
        if (sceneDirection.lighting.timeOfDay) {
          const timeStr = sceneDirection.lighting.timeOfDay.toLowerCase()
          if (timeStr.includes('n/a') || timeStr.includes('not applicable') || timeStr.includes('continuous') || timeStr.includes('stylized') || timeStr.includes('digital')) {
            updates.timeOfDay = 'ambient'
          } else if (timeStr.includes('golden') || timeStr.includes('sunset')) updates.timeOfDay = 'golden-hour'
          else if (timeStr.includes('night')) updates.timeOfDay = 'night'
          else if (timeStr.includes('dawn') || timeStr.includes('morning')) updates.timeOfDay = 'dawn'
          else if (timeStr.includes('twilight') || timeStr.includes('dusk')) updates.timeOfDay = 'dusk'
          else if (timeStr.includes('mid-day') || timeStr.includes('midday') || timeStr.includes('noon') || timeStr.includes('afternoon')) updates.timeOfDay = 'day'
          else updates.timeOfDay = 'day'
        }
      }
      
      // SCENE DIRECTION (Location & Props)
      if (sceneDirection.scene) {
        // Location
        if (sceneDirection.scene.location) {
          updates.location = sceneDirection.scene.location
        }
        
        // Atmosphere — map to closest enum, or 'custom' with raw text preserved
        if (sceneDirection.scene.atmosphere) {
          const atmoStr = sceneDirection.scene.atmosphere.toLowerCase()
          if (atmoStr.includes('tense') || atmoStr.includes('suspense') || atmoStr.includes('urgent')) {
            updates.atmosphere = 'tense'
          } else if (atmoStr.includes('mysterious') || atmoStr.includes('hazy') || atmoStr.includes('eerie')) {
            updates.atmosphere = 'mysterious'
          } else if (atmoStr.includes('chaotic') || atmoStr.includes('energetic') || atmoStr.includes('frenetic')) {
            updates.atmosphere = 'energetic'
          } else if (atmoStr.includes('serene') || atmoStr.includes('peaceful') || atmoStr.includes('tranquil')) {
            updates.atmosphere = 'serene'
          } else if (atmoStr.includes('melancholic') || atmoStr.includes('sad') || atmoStr.includes('somber') || atmoStr.includes('mournful')) {
            updates.atmosphere = 'melancholic'
          } else if (atmoStr.includes('hopeful') || atmoStr.includes('bright') || atmoStr.includes('uplifting') || atmoStr.includes('optimistic')) {
            updates.atmosphere = 'hopeful'
          } else if (atmoStr.includes('futuristic') || atmoStr.includes('high-tech') || atmoStr.includes('hi-tech') || atmoStr.includes('sleek') || atmoStr.includes('sci-fi') || atmoStr.includes('digital') || atmoStr.includes('cyber') || atmoStr.includes('tech')) {
            updates.atmosphere = 'futuristic'
          } else if (atmoStr.includes('intimate') || atmoStr.includes('warm') || atmoStr.includes('cozy') || atmoStr.includes('domestic') || atmoStr.includes('personal')) {
            updates.atmosphere = 'intimate'
          } else {
            // No keyword match — preserve the rich Scene Direction description as custom
            updates.atmosphere = 'custom'
            updates.additionalDetails = `Atmosphere: ${sceneDirection.scene.atmosphere}`
            console.log('[ScenePromptBuilder] Custom atmosphere preserved:', sceneDirection.scene.atmosphere)
          }
        }
        
        // Key Props
        if (sceneDirection.scene.keyProps && sceneDirection.scene.keyProps.length > 0) {
          updates.keyProps = sceneDirection.scene.keyProps.join(', ')
        }
        
        // Weather — extract from atmosphere/location, or set 'none' for interior/abstract scenes
        const locationStr = (sceneDirection.scene.location || '').toLowerCase()
        const atmoWeatherStr = (sceneDirection.scene.atmosphere || '').toLowerCase()
        const isAbstractOrInterior = locationStr.match(/\b(abstract|digital|virtual|cyber|interior|int\.|studio|office|room|apartment|house|lab|indoor|inside|stage|set)\b/)
        
        if (isAbstractOrInterior) {
          updates.weather = 'none'
        } else if (atmoWeatherStr.includes('overcast') || atmoWeatherStr.includes('cloudy') || atmoWeatherStr.includes('grey sky')) {
          updates.weather = 'overcast'
        } else if (atmoWeatherStr.includes('rain') || atmoWeatherStr.includes('wet') || atmoWeatherStr.includes('drizzle')) {
          updates.weather = 'rainy'
        } else if (atmoWeatherStr.includes('storm') || atmoWeatherStr.includes('thunder') || atmoWeatherStr.includes('lightning')) {
          updates.weather = 'stormy'
        } else if (atmoWeatherStr.includes('fog') || atmoWeatherStr.includes('mist') || atmoWeatherStr.includes('haze')) {
          updates.weather = 'foggy'
        } else if (atmoWeatherStr.includes('snow') || atmoWeatherStr.includes('frost') || atmoWeatherStr.includes('ice') || atmoWeatherStr.includes('winter')) {
          updates.weather = 'snowy'
        }
        // Otherwise keep default 'clear' for outdoor scenes without weather indication
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
    
    // Auto-match location references from scene heading
    if (locationReferences.length > 0 && scene?.heading) {
      const headingStr = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text || ''
      const headingLower = headingStr.toLowerCase()
      const matchedIds: string[] = []
      const matchedIdSet = new Set<string>()
      
      for (const loc of locationReferences) {
        if (!loc.imageUrl) continue
        const locLower = loc.location.toLowerCase()
        const strippedHeading = headingLower
          .replace(/^(int|ext)\.?\s*/i, '')
          .replace(/\s*-\s*(day|night|dawn|dusk|evening|morning).*$/i, '')
          .trim()
        if (headingLower.includes(locLower) || locLower.includes(strippedHeading)) {
          matchedIds.push(loc.id)
          matchedIdSet.add(loc.id)
        }
      }
      setAutoMatchedLocationRefIds(matchedIdSet)
      if (matchedIds.length > 0) {
        setSelectedLocationRefIds(matchedIds)
        setLocationSectionCollapsed(false)
      } else {
        setSelectedLocationRefIds([])
        setLocationSectionCollapsed(true)
      }
    } else {
      setAutoMatchedLocationRefIds(new Set())
      setSelectedLocationRefIds([])
      setLocationSectionCollapsed(true)
    }
  }, [open, scene, availableCharacters, objectReferences, locationReferences])

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

  // Construct prompt from structure
  // STRATEGY: Use the Scene Direction main description as the base prompt for storyboard visualization.
  // The goal is quick visual playback - good enough description, not perfect.
  // Character and prop references are passed separately to the API for visual consistency.
  const constructPrompt = (): string => {
    const hasSceneDirection = !!scene?.sceneDirection
    const sceneDirection = scene?.sceneDirection as DetailedSceneDirection | undefined
    
    // Get the main Scene Direction description (the italicized prose at the top)
    // This is more concise and cinematically focused than visualDescription
    const mainDescription = scene?.sceneDirectionText || scene?.visualDescription || ''
    
    // If we have Scene Direction data, build a focused storyboard prompt
    if (hasSceneDirection && mainDescription && mainDescription.length > 50) {
      const parts: string[] = []
      
      // 1. Main Scene Direction description (the key visual prose)
      // e.g., "Dutch angles emphasize Ben's disorientation. Anya's composed posture contrasts..."
      parts.push(mainDescription)
      
      // 2. Add selected character wardrobes for visual consistency
      // e.g., "Dr. Benjamin Anderson wearing Obsessed Scientist Lab Attire"
      // Merge sceneWardrobes with localWardrobes (local takes priority)
      const effectiveWardrobes = { ...sceneWardrobes, ...localWardrobes }
      if (structure.characters.length > 0 && Object.keys(effectiveWardrobes).length > 0) {
        const wardrobeDescriptions: string[] = []
        
        structure.characters.forEach(charName => {
          const wardrobeId = effectiveWardrobes[charName]
          if (wardrobeId) {
            // Find the character to get their wardrobe details
            const character = availableCharacters.find(c => c.name === charName)
            if (character?.wardrobes) {
              const wardrobe = character.wardrobes.find(w => w.id === wardrobeId)
              if (wardrobe) {
                // Skip wardrobe text if costume reference exists (model sees outfit in image)
                if (wardrobe.fullBodyUrl) {
                  wardrobeDescriptions.push(`${charName} in their costume reference outfit`)
                } else {
                  // Use description if available, otherwise just name
                  const wardrobeText = wardrobe.description || wardrobe.name
                  wardrobeDescriptions.push(`${charName} wearing ${wardrobeText}`)
                }
              }
            }
          }
        })
        
        if (wardrobeDescriptions.length > 0) {
          parts.push(wardrobeDescriptions.join(', '))
        }
      }
      
      // 3. Guided-mode overrides: incorporate user-adjusted values that Scene Direction
      //    prose may not capture (e.g., custom atmosphere, talent blocking, emotional beat)
      if (structure.atmosphere === 'custom' && structure.additionalDetails) {
        parts.push(structure.additionalDetails)
      } else if (structure.atmosphere && structure.atmosphere !== 'neutral') {
        // Only add atmosphere if it differs from what the prose already describes
        const atmoLabels: Record<string, string> = {
          'tense': 'tense atmosphere',
          'mysterious': 'mysterious atmosphere',
          'energetic': 'energetic atmosphere',
          'serene': 'serene atmosphere',
          'melancholic': 'melancholic atmosphere',
          'hopeful': 'hopeful atmosphere',
          'futuristic': 'futuristic high-tech atmosphere',
          'intimate': 'intimate warm atmosphere',
        }
        if (atmoLabels[structure.atmosphere]) {
          parts.push(atmoLabels[structure.atmosphere])
        }
      }
      
      // 4. Talent direction from guided mode (blocking + emotional beat)
      if (structure.talentBlocking) {
        parts.push(structure.talentBlocking)
      }
      if (structure.emotionalBeat) {
        parts.push(`conveying ${structure.emotionalBeat}`)
      }
      
      // 5. Art style suffix (from dialog controls)
      const stylePreset = artStylePresets.find(s => s.id === structure.artStyle)
      if (stylePreset) parts.push(stylePreset.promptSuffix)
      
      return parts.filter(Boolean).join('. ')
    }
    
    // ============================================
    // FALLBACK: No Scene Direction - build from individual fields
    // ============================================
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
    if (structure.timeOfDay && structure.timeOfDay !== 'day' && structure.timeOfDay !== 'ambient') {
      const timeLabels: Record<string, string> = {
        'dawn': 'at dawn',
        'day': 'during the day',
        'dusk': 'at dusk',
        'night': 'at night',
        'golden-hour': 'during golden hour'
      }
      timeWeather.push(timeLabels[structure.timeOfDay] || structure.timeOfDay)
    }
    if (structure.weather && structure.weather !== 'clear' && structure.weather !== 'none') timeWeather.push(structure.weather)
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
      if (structure.atmosphere === 'custom' && structure.additionalDetails) {
        // Custom atmosphere from Scene Direction — already included via additionalDetails below
      } else if (structure.atmosphere === 'futuristic') {
        parts.push('futuristic high-tech atmosphere')
      } else if (structure.atmosphere === 'intimate') {
        parts.push('intimate warm atmosphere')
      } else {
        parts.push(`${structure.atmosphere} atmosphere`)
      }
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
      'backlit': 'backlit scene',
      'stylized': 'stylized digital lighting',
      'neon': 'neon stylized lighting',
      'silhouette': 'silhouette lighting',
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
    
    // Collect selected scene/object/location references for style matching
    const selectedSceneRefs = sceneReferences.filter(r => selectedSceneRefIds.includes(r.id))
    const selectedObjectRefs = objectReferences.filter(r => selectedObjectRefIds.includes(r.id))
    const selectedLocationRefs = locationReferences.filter(r => selectedLocationRefIds.includes(r.id))
    
    // Pass prompt builder selections to API
    // Send raw prompt as scenePrompt (API will handle optimization)
    const rawPrompt = getRawPrompt()
    // Build characterWardrobes array for API — maps character IDs to selected wardrobe IDs
    // Merges scene-level assignments with local prompt builder overrides (local takes priority)
    const effectiveWardrobes = { ...sceneWardrobes, ...localWardrobes }
    const characterWardrobesList = Object.entries(effectiveWardrobes)
      .map(([charName, wardrobeId]) => {
        const char = availableCharacters.find(c => c.name === charName)
        // Resolve character ID (prefer .id if available, fallback to name)
        const charId = (char as any)?.id || charName
        // Look up the wardrobe object to include costume reference URL if available
        const wardrobeObj = (char as any)?.wardrobes?.find((w: any) => w.id === wardrobeId)
        return { 
          characterId: charId, 
          wardrobeId,
          // Include costume reference URL so route.ts can use it without separate lookup
          costumeReferenceUrl: wardrobeObj?.fullBodyUrl || undefined,
        }
      })
      .filter(cw => cw.wardrobeId)  // Only include if a wardrobe was actually selected

    const promptData = {
      characters: selectedCharacterObjects,
      scenePrompt: rawPrompt,              // Raw prompt - API will optimize with character references
      artStyle: structure.artStyle,         // Selected art style
      shotType: structure.shotType,        // Camera framing
      cameraAngle: structure.cameraAngle,   // Camera angle
      lighting: structure.lighting,         // Lighting selection
      // Wardrobe selections from prompt builder (merged scene-level + local overrides)
      characterWardrobes: characterWardrobesList,
      // Include reference images for style matching
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
      })),
      // Location references for environment/setting consistency
      locationReferences: selectedLocationRefs.map(ref => ({
        id: ref.id,
        location: ref.location,
        locationDisplay: ref.locationDisplay,
        imageUrl: ref.imageUrl,
        description: ref.description,
      })),
      // Quality tier selection — eco (Draft) = fast/cheap, designer (Final) = production quality
      modelTier,
      thinkingLevel,
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

  // Optimize prompt with AI - restructures verbose prompts into hierarchical format
  const handleOptimizePrompt = async () => {
    if (!advancedPrompt.trim() || isOptimizing) return
    
    setIsOptimizing(true)
    try {
      const sceneHeading = typeof scene?.heading === 'string' 
        ? scene.heading 
        : scene?.heading?.text || ''
      
      const response = await fetch('/api/prompt/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: advancedPrompt,
          sceneHeading,
          preserveCharacterNames: true
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.optimizedPrompt) {
        setAdvancedPrompt(data.optimizedPrompt)
        setIsPromptEdited(true)
        console.log('[ScenePromptBuilder] Prompt optimized successfully')
      } else {
        console.error('[ScenePromptBuilder] Optimization failed:', data.error)
      }
    } catch (error) {
      console.error('[ScenePromptBuilder] Failed to optimize prompt:', error)
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] bg-slate-900 text-white border-slate-700 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white">Scene Image — {scene?.heading || `Scene ${scene?.sceneNumber || ''}`}</DialogTitle>
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
            {/* Location & Setting — Shared Component */}
            <LocationSettingSection
              visualSetup={{
                location: structure.location,
                timeOfDay: structure.timeOfDay,
                weather: structure.weather,
                atmosphere: structure.atmosphere,
                shotType: structure.shotType,
                cameraAngle: structure.cameraAngle,
                lighting: structure.lighting,
                lensChoice: structure.lensChoice,
                lightingMood: structure.lightingMood,
              }}
              onVisualSetupChange={(update) => setStructure(prev => ({ ...prev, ...update }))}
            />

            {/* Characters — Shared Component */}
            <CharacterSelectionSection
              characters={availableCharacters.map(c => ({
                name: c.name,
                referenceImage: c.referenceImage,
                appearance: c.appearanceDescription,
                description: c.description,
                ethnicity: c.ethnicity,
                subject: c.subject,
                wardrobes: c.wardrobes?.map(w => ({
                  id: w.id,
                  name: w.name,
                  description: w.description,
                  fullBodyUrl: w.fullBodyUrl,  // Costume reference indicator
                })),
              }))}
              selectedCharacterNames={structure.characters}
              onSelectionChange={(names) => setStructure(prev => ({ ...prev, characters: names }))}
              selectedWardrobes={localWardrobes}
              onWardrobeChange={(name, wardrobeId) => setLocalWardrobes(prev => ({...prev, [name]: wardrobeId}))}
              sceneWardrobes={sceneWardrobes}
              hasCharacterReferences={structure.characters.some(charName => {
                const char = availableCharacters.find(c => c.name === charName)
                return !!char?.referenceImage
              })}
            />

            {/* Character Actions — kept inline (no equivalent in FramePromptDialog) */}
            {structure.characters.length > 0 && (
              <div className="space-y-2 p-3 rounded border border-slate-700 bg-slate-800/50">
                <label className="text-xs text-slate-400">What are they doing?</label>
                <Input
                  value={structure.characterActions}
                  onChange={(e) => setStructure(prev => ({ ...prev, characterActions: e.target.value }))}
                  placeholder="walking along the shore, engaged in conversation"
                  className="bg-slate-900 border-slate-700 text-sm"
                />
              </div>
            )}

            {/* Location References — visual selector for environment consistency */}
            {locationReferences.filter(l => l.imageUrl).length > 0 && (
              <div className="space-y-3 p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                <button
                  type="button"
                  onClick={() => setLocationSectionCollapsed(prev => !prev)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-medium text-slate-200 flex-1">Location References</h4>
                  {selectedLocationRefIds.length > 0 && (
                    <span className="text-xs bg-cyan-500/20 text-cyan-200 px-2 py-0.5 rounded-full font-normal">
                      {selectedLocationRefIds.length} selected
                    </span>
                  )}
                  {locationSectionCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {!locationSectionCollapsed && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">Select location images for environment/setting consistency</p>
                      <div className="flex items-center gap-2">
                        {autoMatchedLocationRefIds.size > 0 && (
                          <button
                            onClick={() => setSelectedLocationRefIds(
                              locationReferences.filter(l => autoMatchedLocationRefIds.has(l.id)).map(l => l.id)
                            )}
                            className="h-6 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 px-2 rounded"
                          >
                            Select Matched
                          </button>
                        )}
                        {selectedLocationRefIds.length > 0 && (
                          <button
                            onClick={() => setSelectedLocationRefIds([])}
                            className="h-6 text-[10px] text-slate-400 hover:text-slate-300 px-2 rounded"
                          >
                            Unselect All
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {locationReferences.filter(l => l.imageUrl).map((loc) => {
                        const isSelected = selectedLocationRefIds.includes(loc.id)
                        const isMatched = autoMatchedLocationRefIds.has(loc.id)
                        return (
                          <button
                            key={loc.id}
                            onClick={() => {
                              setSelectedLocationRefIds(prev =>
                                prev.includes(loc.id)
                                  ? prev.filter(id => id !== loc.id)
                                  : [...prev, loc.id]
                              )
                            }}
                            className={cn(
                              'relative rounded-lg overflow-hidden border-2 transition-all aspect-video',
                              isSelected
                                ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                                : 'border-slate-700 hover:border-slate-500'
                            )}
                          >
                            <img
                              src={loc.imageUrl}
                              alt={loc.location}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {isMatched && !isSelected && (
                              <div className="absolute top-1 left-1">
                                <span className="text-[8px] bg-cyan-500/80 text-white px-1 py-0 rounded">
                                  Match
                                </span>
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                              <p className="text-[10px] text-white font-medium truncate">{loc.location}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Selected locations will be included as reference images for visual consistency.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Prop References */}
            {(sceneReferences.length > 0 || objectReferences.length > 0) && (
              <div className="space-y-3 p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                <button
                  onClick={() => setReferenceLibraryOpen(!referenceLibraryOpen)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-slate-200 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-cyan-400" />
                    Prop References
                    {(selectedSceneRefIds.length > 0 || selectedObjectRefIds.length > 0) && (
                      <span className="text-xs bg-cyan-500/20 text-cyan-200 px-2 py-0.5 rounded-full font-normal">
                        {selectedSceneRefIds.length + selectedObjectRefIds.length} selected
                      </span>
                    )}
                  </span>
                  {referenceLibraryOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                
                {referenceLibraryOpen && (
                  <div className="space-y-4 pt-2">
                    {/* Scenes */}
                    {sceneReferences.length > 0 && (
                      <div>
                        <label className="text-xs text-slate-400 flex items-center gap-1 mb-2">
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
                              className={cn(
                                'relative aspect-video rounded overflow-hidden border-2 transition-all',
                                selectedSceneRefIds.includes(ref.id)
                                  ? 'border-cyan-500 ring-2 ring-cyan-500/50'
                                  : 'border-slate-700 hover:border-slate-500'
                              )}
                              title={ref.description || ref.name}
                            >
                              {ref.imageUrl ? (
                                <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-slate-500" />
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                <div className="text-[9px] text-white truncate">{ref.name}</div>
                              </div>
                              {selectedSceneRefIds.includes(ref.id) && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Props — Shared Component */}
                    {objectReferences.length > 0 && (
                      <PropSelectionSection
                        objectReferences={objectReferences.map(ref => ({
                          id: ref.id,
                          name: ref.name,
                          imageUrl: ref.imageUrl,
                          description: ref.description,
                          importance: ref.importance,
                        }))}
                        selectedObjectIds={selectedObjectRefIds}
                        onSelectionChange={setSelectedObjectRefIds}
                        autoDetectedObjectIds={new Set(autoDetectedObjectIds)}
                      />
                    )}

                    <p className="text-[10px] text-slate-500">
                      Selected references will be used for visual style consistency in the generated image.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Camera & Composition — Shared Component with extended options */}
            <CameraCompositionSection
              visualSetup={{
                location: structure.location,
                timeOfDay: structure.timeOfDay,
                weather: structure.weather,
                atmosphere: structure.atmosphere,
                shotType: structure.shotType,
                cameraAngle: structure.cameraAngle,
                lighting: structure.lighting,
                lensChoice: structure.lensChoice,
                lightingMood: structure.lightingMood,
              }}
              onVisualSetupChange={(update) => setStructure(prev => ({ ...prev, ...update }))}
              hasCharacterReferences={structure.characters.some(charName => {
                const char = availableCharacters.find(c => c.name === charName)
                return !!char?.referenceImage
              })}
              showExtendedOptions={true}
            />

            {/* Talent Direction — Shared Component */}
            <TalentDirectionSection
              talentDirection={{
                talentBlocking: structure.talentBlocking,
                emotionalBeat: structure.emotionalBeat,
                keyProps: structure.keyProps,
              }}
              onTalentDirectionChange={(update) => setStructure(prev => ({ ...prev, ...update }))}
              defaultCollapsed={false}
            />

            {/* Art Style — Shared Component */}
            <ArtStyleGrid
              artStyle={structure.artStyle}
              onArtStyleChange={(styleId) => setStructure(prev => ({ ...prev, artStyle: styleId }))}
            />

            {/* Quality Mode — Shared Component (NEW for ScenePromptBuilder) */}
            <QualityModeSection
              modelTier={modelTier}
              onModelTierChange={setModelTier}
              thinkingLevel={thinkingLevel}
              onThinkingLevelChange={setThinkingLevel}
            />

            {/* Additional Details */}
            <div className="space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50">
              <h3 className="text-sm font-semibold text-slate-200">Additional Details</h3>
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
                <label className="text-xs text-slate-400">Custom Scene Prompt</label>
                <Button
                  onClick={handleOptimizePrompt}
                  disabled={isOptimizing || !advancedPrompt.trim()}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2 border-purple-500/50 hover:bg-purple-500/20 hover:border-purple-500"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 mr-1" />
                      Optimize Prompt
                    </>
                  )}
                </Button>
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
              <p className="text-xs text-slate-500 mt-1">
                💡 Tip: Use &quot;Optimize Prompt&quot; to restructure verbose prompts into a hierarchical format that AI models follow more effectively.
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Negative Prompt</label>
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
        <div className="border-t border-slate-700 p-4 bg-slate-900">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">
              {mode === 'guided' 
                ? 'Prompt Preview'
                : 'Custom Prompt'
              }
            </label>
          </div>
          <div className="text-sm text-slate-200 p-2 bg-slate-800 rounded border border-slate-700 max-h-32 overflow-y-auto leading-relaxed">
            {constructedPrompt || <span className="text-slate-500 italic">Fill in the fields above to build your prompt...</span>}
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
            <div className="bg-slate-900 border-2 border-purple-500 rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-sm">
              <div className="relative mb-4">
                <Loader2 className="w-16 h-16 animate-spin text-purple-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-purple-300 animate-pulse"></div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Generating Scene Image</h3>
              <p className="text-sm text-slate-300 text-center">
                Creating your scene visualization...
              </p>
              <p className="text-xs text-slate-400 mt-2">
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

