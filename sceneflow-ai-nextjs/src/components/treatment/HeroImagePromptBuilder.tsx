'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Check, Sparkles, Info, Loader2, ChevronDown, ChevronUp, Image as ImageIcon, Box, Film, User, Eye } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'
import { VisualReference } from '@/types/visionReferences'

/**
 * HeroImagePromptBuilder - Poster/Billboard Image Prompt Builder
 * 
 * Adapted from ScenePromptBuilder for creating cinematic hero/poster images
 * with production bible integration (characters, scenes, objects).
 * 
 * Features:
 * - Poster-specific composition types (hero portrait, ensemble, silhouette, key art)
 * - Title overlay preview for text placement awareness
 * - Auto-extraction of key elements from treatment data
 * - Character reference image support for identity consistency
 * - Scene/object reference library integration
 */

// Poster-specific shot types optimized for billboard/poster compositions
const POSTER_SHOT_TYPES = [
  { id: 'hero-portrait', name: 'Hero Portrait', description: 'Single character dominant, dramatic pose' },
  { id: 'ensemble', name: 'Ensemble Shot', description: 'Multiple characters arranged cinematically' },
  { id: 'dramatic-silhouette', name: 'Dramatic Silhouette', description: 'Backlit figure, mysterious mood' },
  { id: 'key-art', name: 'Key Art', description: 'Iconic imagery representing the story' },
  { id: 'environment-hero', name: 'Environment Hero', description: 'Setting as main focus with character integration' },
  { id: 'confrontation', name: 'Confrontation', description: 'Hero vs antagonist visual tension' },
  { id: 'action-moment', name: 'Action Moment', description: 'Frozen peak action sequence' },
  { id: 'intimate-portrait', name: 'Intimate Portrait', description: 'Close emotional character study' }
]

interface HeroPromptStructure {
  posterType: string
  setting: string
  timeOfDay: string
  atmosphere: string
  cameraAngle: string
  lighting: string
  lightingMood: string
  characters: string[]
  characterPoses: string
  emotionalTone: string
  keyProps: string
  artStyle: string
  additionalDetails: string
  negativePrompt: string
}

interface HeroImagePromptBuilderProps {
  open: boolean
  onClose: () => void
  treatment: {
    title: string
    logline?: string
    synopsis?: string
    genre?: string
    setting?: string
    tone?: string
    themes?: string[] | string
    visual_style?: string
  }
  availableCharacters?: Array<{ 
    name: string
    description?: string
    referenceImage?: string
    appearanceDescription?: string
    ethnicity?: string
    role?: string
  }>
  /** Scene backdrop references from the Reference Library */
  sceneReferences?: VisualReference[]
  /** Prop/object references from the Reference Library */
  objectReferences?: VisualReference[]
  onGenerateImage: (promptData: any) => void
  isGenerating?: boolean
}

export function HeroImagePromptBuilder({
  open,
  onClose,
  treatment,
  availableCharacters = [],
  sceneReferences = [],
  objectReferences = [],
  onGenerateImage,
  isGenerating = false
}: HeroImagePromptBuilderProps) {
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')
  
  // Reference Library state
  const [selectedSceneRefIds, setSelectedSceneRefIds] = useState<string[]>([])
  const [selectedObjectRefIds, setSelectedObjectRefIds] = useState<string[]>([])
  const [referenceLibraryOpen, setReferenceLibraryOpen] = useState(false)
  
  // Title preview toggle
  const [showTitlePreview, setShowTitlePreview] = useState(true)
  
  const [structure, setStructure] = useState<HeroPromptStructure>({
    posterType: 'hero-portrait',
    setting: '',
    timeOfDay: 'golden-hour',
    atmosphere: 'dramatic',
    cameraAngle: 'eye-level',
    lighting: 'dramatic',
    lightingMood: 'cinematic',
    characters: [],
    characterPoses: '',
    emotionalTone: '',
    keyProps: '',
    artStyle: 'photorealistic',
    additionalDetails: '',
    negativePrompt: 'blurry, low quality, distorted, poor composition, amateur, text, watermark, logo'
  })
  
  const [advancedPrompt, setAdvancedPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const [isPromptEdited, setIsPromptEdited] = useState(false)

  // Auto-populate from treatment data
  useEffect(() => {
    if (!open || !treatment) return
    
    const updates: Partial<HeroPromptStructure> = {}
    
    // Extract setting from treatment
    if (treatment.setting) {
      updates.setting = treatment.setting
    }
    
    // Extract atmosphere from genre/tone
    if (treatment.tone) {
      const tone = treatment.tone.toLowerCase()
      if (tone.includes('dark') || tone.includes('gritty') || tone.includes('noir')) {
        updates.atmosphere = 'tense'
        updates.lighting = 'dramatic'
      } else if (tone.includes('light') || tone.includes('comedy') || tone.includes('warm')) {
        updates.atmosphere = 'hopeful'
        updates.lighting = 'golden-hour'
      } else if (tone.includes('mystery') || tone.includes('suspense')) {
        updates.atmosphere = 'mysterious'
        updates.lighting = 'dramatic'
      }
    }
    
    // Auto-select protagonist if available
    if (availableCharacters && availableCharacters.length > 0) {
      const protagonist = availableCharacters.find(c => 
        c.role?.toLowerCase()?.includes('protagonist') || 
        c.role?.toLowerCase()?.includes('lead') ||
        c.role?.toLowerCase()?.includes('main')
      ) || availableCharacters[0]
      
      if (protagonist) {
        updates.characters = [protagonist.name]
      }
    }
    
    // Extract emotional tone from logline
    if (treatment.logline) {
      const logline = treatment.logline.toLowerCase()
      if (logline.includes('revenge') || logline.includes('justice')) {
        updates.emotionalTone = 'Steely determination, simmering intensity'
      } else if (logline.includes('love') || logline.includes('romance')) {
        updates.emotionalTone = 'Vulnerable longing, guarded hope'
      } else if (logline.includes('discover') || logline.includes('uncover')) {
        updates.emotionalTone = 'Searching gaze, restless curiosity'
      } else if (logline.includes('survive') || logline.includes('escape')) {
        updates.emotionalTone = 'Haunted vigilance, survival instinct'
      } else if (logline.includes('fight') || logline.includes('battle')) {
        updates.emotionalTone = 'Fierce resolve, warrior spirit'
      }
    }
    
    // Apply visual style from treatment
    if (treatment.visual_style) {
      const style = treatment.visual_style.toLowerCase()
      if (style.includes('noir') || style.includes('dark')) {
        updates.artStyle = 'photorealistic'
        updates.lighting = 'dramatic'
      } else if (style.includes('stylized') || style.includes('graphic')) {
        updates.artStyle = 'concept-art'
      }
    }
    
    setStructure(prev => ({ ...prev, ...updates }))
  }, [open, treatment, availableCharacters])

  // Sync to advanced mode
  useEffect(() => {
    if (mode === 'advanced' && !advancedPrompt) {
      setAdvancedPrompt(constructPrompt())
    }
  }, [mode])

  // Reset on dialog close
  useEffect(() => {
    if (!open) {
      setIsPromptEdited(false)
      setAdvancedPrompt('')
    }
  }, [open])

  // Construct the poster prompt
  const constructPrompt = (): string => {
    const parts: string[] = []
    
    // Poster type description
    const posterType = POSTER_SHOT_TYPES.find(p => p.id === structure.posterType)
    if (posterType) {
      parts.push(`Cinematic movie poster, ${posterType.name.toLowerCase()}`)
    }
    
    // Genre context
    if (treatment.genre) {
      parts.push(`${treatment.genre} film`)
    }
    
    // Setting/location
    if (structure.setting) {
      parts.push(`set in ${structure.setting}`)
    }
    
    // Time of day
    const timeLabels: Record<string, string> = {
      'dawn': 'at dawn',
      'day': 'in daylight',
      'dusk': 'at dusk',
      'night': 'at night',
      'golden-hour': 'during golden hour'
    }
    if (structure.timeOfDay) parts.push(timeLabels[structure.timeOfDay] || structure.timeOfDay)
    
    // Characters with detailed descriptions
    if (structure.characters.length > 0) {
      const charDescriptions = structure.characters.map(charName => {
        const char = availableCharacters.find(c => c.name === charName)
        if (char) {
          const descParts: string[] = [char.name]
          if (char.ethnicity) descParts.push(`${char.ethnicity} ethnicity`)
          if (char.appearanceDescription) descParts.push(char.appearanceDescription)
          else if (char.description) descParts.push(char.description)
          return descParts.join(', ')
        }
        return charName
      })
      parts.push(`featuring ${charDescriptions.join(' and ')}`)
    }
    
    // Character poses/positioning
    if (structure.characterPoses) {
      parts.push(structure.characterPoses)
    }
    
    // Emotional tone
    if (structure.emotionalTone) {
      parts.push(`conveying ${structure.emotionalTone}`)
    }
    
    // Atmosphere
    const atmosphereLabels: Record<string, string> = {
      'neutral': '',
      'serene': 'serene and peaceful',
      'tense': 'tense and foreboding',
      'mysterious': 'mysterious and enigmatic',
      'energetic': 'dynamic and energetic',
      'melancholic': 'melancholic and somber',
      'hopeful': 'hopeful and optimistic',
      'dramatic': 'dramatic and cinematic'
    }
    if (structure.atmosphere && structure.atmosphere !== 'neutral') {
      parts.push(`${atmosphereLabels[structure.atmosphere] || structure.atmosphere} atmosphere`)
    }
    
    // Camera angle
    const angleLabels: Record<string, string> = {
      'eye-level': '',
      'low-angle': 'heroic low angle perspective',
      'high-angle': 'high angle shot',
      'birds-eye': "dramatic bird's eye view",
      'dutch-angle': 'dynamic dutch angle'
    }
    if (structure.cameraAngle && structure.cameraAngle !== 'eye-level') {
      parts.push(angleLabels[structure.cameraAngle] || structure.cameraAngle)
    }
    
    // Lighting
    const lightingLabels: Record<string, string> = {
      'natural': 'natural lighting',
      'golden-hour': 'warm golden hour lighting',
      'dramatic': 'dramatic cinematic lighting with deep shadows',
      'soft': 'soft diffused lighting',
      'harsh': 'harsh contrast lighting',
      'backlit': 'dramatic backlighting with rim light'
    }
    if (structure.lighting) parts.push(lightingLabels[structure.lighting] || structure.lighting)
    
    // Lighting mood
    if (structure.lightingMood && structure.lightingMood !== 'neutral') {
      parts.push(`${structure.lightingMood} mood`)
    }
    
    // Key props
    if (structure.keyProps) {
      parts.push(`with ${structure.keyProps}`)
    }
    
    // Scene references
    const selectedSceneRefs = sceneReferences.filter(r => selectedSceneRefIds.includes(r.id))
    if (selectedSceneRefs.length > 0) {
      const descriptions = selectedSceneRefs.map(r => r.description || r.name).join(', ')
      parts.push(`matching the visual style of ${descriptions}`)
    }
    
    // Object references
    const selectedObjectRefs = objectReferences.filter(r => selectedObjectRefIds.includes(r.id))
    if (selectedObjectRefs.length > 0) {
      const objNames = selectedObjectRefs.map(r => r.name).join(', ')
      parts.push(`featuring ${objNames}`)
    }
    
    // Additional details
    if (structure.additionalDetails) parts.push(structure.additionalDetails)
    
    // Art style
    const stylePreset = artStylePresets.find(s => s.id === structure.artStyle)
    if (stylePreset) parts.push(stylePreset.promptSuffix)
    
    // Poster-specific additions
    parts.push('theatrical movie poster composition, high production value, professional key art')
    
    return parts.filter(Boolean).join(', ')
  }

  const getRawPrompt = (): string => {
    return mode === 'advanced' ? advancedPrompt : constructPrompt()
  }

  const constructedPrompt = getRawPrompt()

  const handleGenerateImage = () => {
    // Collect selected character objects with reference images
    const selectedCharacterObjects = structure.characters
      .map(charName => availableCharacters.find(c => c.name === charName))
      .filter(Boolean)
    
    // Collect selected references
    const selectedSceneRefs = sceneReferences.filter(r => selectedSceneRefIds.includes(r.id))
    const selectedObjectRefs = objectReferences.filter(r => selectedObjectRefIds.includes(r.id))
    
    const promptData = {
      characters: selectedCharacterObjects,
      prompt: getRawPrompt(),
      artStyle: structure.artStyle,
      posterType: structure.posterType,
      cameraAngle: structure.cameraAngle,
      lighting: structure.lighting,
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
        type: 'object' as const
      }))
    }
    
    onGenerateImage(promptData)
    onClose()
  }

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(constructedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] bg-gray-900 text-white border-gray-700 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-400" />
            Hero Image — {treatment.title || 'Untitled'}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'guided' | 'advanced')}>
            <TabsList className="w-full">
              <TabsTrigger value="guided" className="flex-1">
                Visual Setup
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">
                Custom Prompt
              </TabsTrigger>
            </TabsList>

            {/* Title Overlay Preview Toggle */}
            <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <button
                onClick={() => setShowTitlePreview(!showTitlePreview)}
                className="w-full flex items-center justify-between text-sm font-medium text-slate-200 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  Title Placement Preview
                </span>
                {showTitlePreview ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              {showTitlePreview && (
                <div className="mt-3 relative aspect-[2.39/1] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden border border-slate-600">
                  {/* Mock image area */}
                  <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                  
                  {/* Title overlay simulation */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {treatment.genre && (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 rounded-full mb-2 border border-amber-400/20">
                        {treatment.genre}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-white drop-shadow-lg">
                      {treatment.title || 'Your Title Here'}
                    </h3>
                    {treatment.logline && (
                      <p className="mt-1 text-xs text-slate-300 drop-shadow-md line-clamp-2">
                        {treatment.logline}
                      </p>
                    )}
                  </div>
                  
                  {/* Composition guide overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 border-t border-dashed border-amber-500/30" />
                    <p className="absolute bottom-1/3 left-2 text-[9px] text-amber-500/50 -translate-y-1">
                      Title safe zone
                    </p>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-500 mt-2">
                💡 Keep main subject above the title zone for best poster composition
              </p>
            </div>

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
                      Selected characters have reference images. For best results, use{' '}
                      <span className="font-medium">Hero Portrait</span> or{' '}
                      <span className="font-medium">Intimate Portrait</span> compositions 
                      where characters are prominent.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Guided Mode */}
            <TabsContent value="guided" className="space-y-4 mt-4">
              {/* Poster Type */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Poster Composition 🎬</h3>
                <div className="grid grid-cols-4 gap-2">
                  {POSTER_SHOT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setStructure(prev => ({ ...prev, posterType: type.id }))}
                      className={`p-2 rounded border text-left transition-all ${
                        structure.posterType === type.id
                          ? 'border-amber-500 bg-amber-500/20 ring-2 ring-amber-500'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                      title={type.description}
                    >
                      <div className="text-xs font-medium text-gray-200">{type.name}</div>
                      <div className="text-[9px] text-gray-400 mt-0.5 line-clamp-2">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting & Atmosphere */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Setting & Atmosphere</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-400">Setting/Location</label>
                    <Input
                      value={structure.setting}
                      onChange={(e) => setStructure(prev => ({ ...prev, setting: e.target.value }))}
                      placeholder="e.g., neon-lit cyberpunk city, ancient temple ruins"
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
                          <SelectItem value="golden-hour">Golden Hour ✨</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Atmosphere</label>
                      <Select value={structure.atmosphere} onValueChange={(v) => setStructure(prev => ({ ...prev, atmosphere: v }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dramatic">Dramatic 🎭</SelectItem>
                          <SelectItem value="tense">Tense</SelectItem>
                          <SelectItem value="mysterious">Mysterious</SelectItem>
                          <SelectItem value="hopeful">Hopeful</SelectItem>
                          <SelectItem value="melancholic">Melancholic</SelectItem>
                          <SelectItem value="energetic">Energetic</SelectItem>
                          <SelectItem value="serene">Serene</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Characters */}
              {availableCharacters.length > 0 && (
                <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                  <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Characters
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-400">Select Characters</label>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        {availableCharacters.map(char => (
                          <label 
                            key={char.name} 
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              structure.characters.includes(char.name)
                                ? 'border-amber-500 bg-amber-500/10'
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
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-200 truncate">{char.name}</div>
                              {char.role && (
                                <div className="text-[10px] text-gray-500 truncate">{char.role}</div>
                              )}
                              {char.referenceImage && (
                                <div className="text-[10px] text-green-400">✓ Has reference</div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Character Pose/Action</label>
                      <Input
                        value={structure.characterPoses}
                        onChange={(e) => setStructure(prev => ({ ...prev, characterPoses: e.target.value }))}
                        placeholder="e.g., standing heroically against the wind, weapons drawn"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Emotional Tone</label>
                      <Input
                        value={structure.emotionalTone}
                        onChange={(e) => setStructure(prev => ({ ...prev, emotionalTone: e.target.value }))}
                        placeholder="e.g., steely determination, haunted resolve"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reference Library */}
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
                                    ? 'border-amber-500 ring-2 ring-amber-500/50'
                                    : 'border-gray-700 hover:border-gray-500'
                                }`}
                                title={ref.description || ref.name}
                              >
                                {ref.imageUrl ? (
                                  <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4 text-gray-500" />
                                  </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                  <div className="text-[9px] text-white truncate">{ref.name}</div>
                                </div>
                                {selectedSceneRefIds.includes(ref.id) && (
                                  <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
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
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {objectReferences.map(ref => (
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
                                  selectedObjectRefIds.includes(ref.id)
                                    ? 'border-purple-500 ring-2 ring-purple-500/50'
                                    : 'border-gray-700 hover:border-gray-500'
                                }`}
                                title={ref.description || ref.name}
                              >
                                {ref.imageUrl ? (
                                  <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                    <Box className="w-4 h-4 text-gray-500" />
                                  </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                  <div className="text-[9px] text-white truncate">{ref.name}</div>
                                </div>
                                {selectedObjectRefIds.includes(ref.id) && (
                                  <div className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Camera & Lighting */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Camera & Lighting 🎥</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Camera Angle</label>
                    <Select value={structure.cameraAngle} onValueChange={(v) => setStructure(prev => ({ ...prev, cameraAngle: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eye-level">Eye Level</SelectItem>
                        <SelectItem value="low-angle">Low Angle (Heroic) ⬆️</SelectItem>
                        <SelectItem value="high-angle">High Angle</SelectItem>
                        <SelectItem value="birds-eye">Bird's Eye</SelectItem>
                        <SelectItem value="dutch-angle">Dutch Angle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Lighting Style</label>
                    <Select value={structure.lighting} onValueChange={(v) => setStructure(prev => ({ ...prev, lighting: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dramatic">Dramatic 🎭</SelectItem>
                        <SelectItem value="golden-hour">Golden Hour ✨</SelectItem>
                        <SelectItem value="backlit">Backlit/Silhouette</SelectItem>
                        <SelectItem value="natural">Natural</SelectItem>
                        <SelectItem value="soft">Soft Diffused</SelectItem>
                        <SelectItem value="harsh">Harsh Contrast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Lighting Mood</label>
                  <Input
                    value={structure.lightingMood}
                    onChange={(e) => setStructure(prev => ({ ...prev, lightingMood: e.target.value }))}
                    placeholder="e.g., cinematic, film noir, high contrast"
                    className="mt-1"
                  />
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
                          ? 'border-amber-500 bg-amber-500/20 ring-2 ring-amber-500'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                      title={style.description}
                    >
                      <div className="aspect-square bg-gray-700 rounded mb-1 flex items-center justify-center overflow-hidden">
                        {style.thumbnail ? (
                          <img src={style.thumbnail} alt={style.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl text-gray-400">{style.name[0]}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-300 truncate">{style.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Details & Props */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Additional Details</h3>
                <div>
                  <label className="text-xs text-gray-400">Key Props</label>
                  <Input
                    value={structure.keyProps}
                    onChange={(e) => setStructure(prev => ({ ...prev, keyProps: e.target.value }))}
                    placeholder="e.g., glowing sword, ancient artifact"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Additional Details</label>
                  <Textarea
                    value={structure.additionalDetails}
                    onChange={(e) => setStructure(prev => ({ ...prev, additionalDetails: e.target.value }))}
                    placeholder="Add any specific details for the poster image..."
                    rows={3}
                    className="resize-none mt-1"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Advanced Mode */}
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400">Custom Hero Image Prompt</label>
                </div>
                <Textarea
                  value={advancedPrompt}
                  onChange={(e) => {
                    setAdvancedPrompt(e.target.value)
                    setIsPromptEdited(true)
                  }}
                  rows={12}
                  placeholder="Enter your custom poster prompt here..."
                  className="resize-vertical"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Tip: Include composition type, character details, atmosphere, and lighting for best results.
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Negative Prompt</label>
                <Textarea
                  value={structure.negativePrompt}
                  onChange={(e) => setStructure(prev => ({ ...prev, negativePrompt: e.target.value }))}
                  rows={3}
                  placeholder="blurry, low quality, text, watermark..."
                  className="resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">
              {mode === 'guided' ? 'Prompt Preview' : 'Custom Prompt'}
            </label>
          </div>
          <div className="text-sm text-gray-200 p-2 bg-gray-800 rounded border border-gray-700 max-h-32 overflow-y-auto leading-relaxed">
            {constructedPrompt || <span className="text-gray-500 italic">Fill in the fields above to build your prompt...</span>}
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              onClick={handleGenerateImage} 
              disabled={isGenerating}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Hero Image
                </>
              )}
            </Button>
            <Button onClick={handleCopy} variant="outline" className="px-3">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center rounded-lg">
            <div className="bg-gray-900 border-2 border-amber-500 rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-sm">
              <div className="relative mb-4">
                <Loader2 className="w-16 h-16 animate-spin text-amber-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-amber-300 animate-pulse"></div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Creating Hero Image</h3>
              <p className="text-sm text-gray-300 text-center">
                Generating your cinematic poster...
              </p>
              <p className="text-xs text-gray-400 mt-2">
                This may take 15-20 seconds
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default HeroImagePromptBuilder
