'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Check, Sparkles, Info, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'
import { findSceneCharacters } from '../../lib/character/matching'
import { optimizePromptForImagen, type OptimizedPromptResult } from '@/lib/imagen/promptOptimizer'

interface ScenePromptStructure {
  location: string
  timeOfDay: string
  weather: string
  atmosphere: string
  shotType: string
  cameraAngle: string
  lighting: string
  characters: string[]
  characterActions: string
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
    referenceImageGCS?: string
    appearanceDescription?: string
    ethnicity?: string
    subject?: string
  }>
  onGenerateImage: (selectedCharacters: any[] | any) => void
  isGenerating?: boolean
}

export function ScenePromptBuilder({
  open,
  onClose,
  scene,
  availableCharacters = [],
  onGenerateImage,
  isGenerating = false
}: ScenePromptBuilderProps) {
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')
  // Local loading state for immediate feedback (before parent updates)
  const [localIsGenerating, setLocalIsGenerating] = useState(false)
  const [structure, setStructure] = useState<ScenePromptStructure>({
    location: '',
    timeOfDay: 'day',
    weather: 'clear',
    atmosphere: 'neutral',
    shotType: 'wide-shot',
    cameraAngle: 'eye-level',
    lighting: 'natural',
    characters: [],
    characterActions: '',
    artStyle: 'concept-art',
    additionalDetails: '',
    negativePrompt: 'blurry, low quality, distorted, poor composition'
  })
  
  const [advancedPrompt, setAdvancedPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  
  // New state for optimized prompts and sanitization
  const [optimizedPrompt, setOptimizedPrompt] = useState('')
  const [optimizedPromptDetails, setOptimizedPromptDetails] = useState<OptimizedPromptResult | null>(null)
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [sanitizationChanges, setSanitizationChanges] = useState<Array<{ original: string; sanitized: string; reason: string }>>([])
  const [showPreview, setShowPreview] = useState(false)
  const [editedOptimizedPrompt, setEditedOptimizedPrompt] = useState('')
  const [isOptimizedPromptEdited, setIsOptimizedPromptEdited] = useState(false)
  
  // Legacy state for backward compatibility
  const [editedPrompt, setEditedPrompt] = useState('')
  const [isPromptEdited, setIsPromptEdited] = useState(false)

  // Parse scene description to auto-populate fields
  useEffect(() => {
    if (!open || !scene) return
    
    const updates: Partial<ScenePromptStructure> = {}
    
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
    
    // Parse heading: "INT./EXT. LOCATION - TIME"
    if (scene.heading) {
      const headingMatch = scene.heading.match(/(INT|EXT)\.\s+(.+?)\s+-\s+(.+)/i)
      if (headingMatch) {
        updates.location = headingMatch[2].trim()
        const time = headingMatch[3].trim().toLowerCase()
        if (time.includes('night') || time.includes('evening')) updates.timeOfDay = 'night'
        else if (time.includes('morning') || time.includes('dawn')) updates.timeOfDay = 'morning'
        else if (time.includes('afternoon')) updates.timeOfDay = 'afternoon'
        else if (time.includes('dusk') || time.includes('sunset')) updates.timeOfDay = 'dusk'
        else updates.timeOfDay = 'day'
      }
    }
    
    // Parse visual description for atmosphere, lighting, camera
    const desc = (scene.visualDescription || scene.action || '').toLowerCase()
    
    // Atmosphere
    if (desc.includes('dark') || desc.includes('moody') || desc.includes('ominous')) {
      updates.atmosphere = 'dark and moody'
    } else if (desc.includes('bright') || desc.includes('vibrant') || desc.includes('cheerful')) {
      updates.atmosphere = 'bright and vibrant'
    } else if (desc.includes('tense') || desc.includes('suspenseful')) {
      updates.atmosphere = 'tense and suspenseful'
    }
    
    // Camera angles
    if (desc.includes('close up') || desc.includes('close-up')) {
      updates.shotType = 'close-up'
    } else if (desc.includes('wide shot') || desc.includes('wide angle') || desc.includes('establishing')) {
      updates.shotType = 'wide-shot'
    } else if (desc.includes('medium')) {
      updates.shotType = 'medium-shot'
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
    
    setStructure(prev => ({ ...prev, ...updates }))
  }, [open, scene, availableCharacters])

  // Sync optimized prompt to advanced mode when switching
  useEffect(() => {
    if (mode === 'advanced') {
      // If switching to advanced, populate with optimized prompt (from guided) or current advancedPrompt
      if (!advancedPrompt && optimizedPrompt) {
        setAdvancedPrompt(isOptimizedPromptEdited ? editedOptimizedPrompt : optimizedPrompt)
      } else if (!advancedPrompt) {
        // Fallback to constructed prompt
        const guidedPrompt = isPromptEdited ? editedPrompt : constructPrompt()
        if (guidedPrompt) {
          setAdvancedPrompt(guidedPrompt)
        }
      }
    }
  }, [mode, optimizedPrompt, advancedPrompt, isOptimizedPromptEdited, editedOptimizedPrompt, isPromptEdited, editedPrompt])

  // Reset editing state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset editing state when dialog closes
      setIsPromptEdited(false)
      setEditedPrompt('')
      setAdvancedPrompt('')
      setOptimizedPrompt('')
      setOptimizedPromptDetails(null)
      setSanitizationChanges([])
      setEditedOptimizedPrompt('')
      setIsOptimizedPromptEdited(false)
    }
  }, [open])

  // Optimize prompt when structure changes (Guided Mode)
  useEffect(() => {
    if (!open || mode !== 'guided') return
    
    const basePrompt = isPromptEdited ? editedPrompt : constructPrompt()
    if (!basePrompt.trim()) return
    
    // Build character references for optimization
    const selectedCharacterObjects = structure.characters
      .map(charName => availableCharacters.find(c => c.name === charName))
      .filter(Boolean)
    
    const characterReferences = selectedCharacterObjects.map((char, idx) => {
      const keyFeatures: string[] = []
      
      // Extract key features similar to API route
      if (char?.appearanceDescription) {
        // Try to extract hair style, key features from description
        if (char.appearanceDescription.toLowerCase().includes('bald')) {
          keyFeatures.push('bald head')
        }
        if (char.appearanceDescription.toLowerCase().includes('beard')) {
          keyFeatures.push(char.appearanceDescription.match(/[\w\s]+beard/i)?.[0] || 'beard')
        }
      }
      
      return {
        referenceId: idx + 1,
        name: char?.name || '',
        description: char?.appearanceDescription || char?.description || '',
        gcsUri: char?.referenceImageGCS,
        imageUrl: char?.referenceImage,
        ethnicity: char?.ethnicity,
        keyFeatures: keyFeatures.length > 0 ? keyFeatures : undefined
      }
    })
    
    // Optimize the prompt
    try {
      const result = optimizePromptForImagen({
        sceneAction: basePrompt,
        visualDescription: basePrompt,
        characterReferences: characterReferences.length > 0 ? characterReferences : undefined,
        artStyle: structure.artStyle
      }, true) as OptimizedPromptResult
      
      setOptimizedPrompt(result.prompt)
      setOptimizedPromptDetails(result)
      setOriginalPrompt(result.originalPrompt || basePrompt)
      setSanitizationChanges(result.sanitizationChanges || [])
      
      // Reset edited optimized prompt when prompt regenerates
      if (!isOptimizedPromptEdited) {
        setEditedOptimizedPrompt(result.prompt)
      }
    } catch (error) {
      console.error('[Scene Prompt Builder] Failed to optimize prompt:', error)
      // Fallback to base prompt
      setOptimizedPrompt(basePrompt)
      setOriginalPrompt(basePrompt)
      setSanitizationChanges([])
    }
  }, [structure, mode, open, isPromptEdited, editedPrompt, availableCharacters, isOptimizedPromptEdited])

  // Construct prompt from structure
  const constructPrompt = (): string => {
    const parts: string[] = []
    
    // Shot type
    const shotTypes: Record<string, string> = {
      'wide-shot': 'Wide establishing shot',
      'medium-shot': 'Medium shot',
      'close-up': 'Close-up shot',
      'extreme-wide': 'Extreme wide shot',
      'over-shoulder': 'Over the shoulder shot'
    }
    if (structure.shotType) parts.push(shotTypes[structure.shotType] || structure.shotType)
    
    // Location
    if (structure.location) parts.push(`of ${structure.location}`)
    
    // Time and weather
    const timeWeather: string[] = []
    if (structure.timeOfDay) timeWeather.push(structure.timeOfDay)
    if (structure.weather && structure.weather !== 'clear') timeWeather.push(structure.weather)
    if (timeWeather.length) parts.push(timeWeather.join(', '))
    
    // Characters and actions
    if (structure.characters.length > 0) {
      const charList = structure.characters.join(', ')
      if (structure.characterActions) {
        parts.push(`featuring ${charList} ${structure.characterActions}`)
      } else {
        parts.push(`featuring ${charList}`)
      }
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
    
    // Additional details
    if (structure.additionalDetails) parts.push(structure.additionalDetails)
    
    // Art style
    const stylePreset = artStylePresets.find(s => s.id === structure.artStyle)
    if (stylePreset) parts.push(stylePreset.promptSuffix)
    
    return parts.filter(Boolean).join(', ')
  }

  // Get the final prompt to use for generation
  const getFinalPrompt = (): string => {
    if (mode === 'advanced') {
      return advancedPrompt
    } else {
      // In guided mode, use optimized prompt (edited if user modified it)
      return isOptimizedPromptEdited ? editedOptimizedPrompt : optimizedPrompt || (isPromptEdited ? editedPrompt : constructPrompt())
    }
  }

  const constructedPrompt = getFinalPrompt()

  const handleGenerateScene = () => {
    // Set local loading state immediately for instant feedback
    setLocalIsGenerating(true)
    
    // Pass full character objects (not just names) so API gets referenceImageGCS
    const selectedCharacterObjects = structure.characters
      .map(charName => {
        const found = availableCharacters.find(c => c.name === charName)
        return found
      })
      .filter(Boolean)
    
    // Pass prompt builder selections to API
    // Use optimized prompt, but allow user edits
    const finalPrompt = getFinalPrompt()
    const promptData = {
      characters: selectedCharacterObjects,
      customPrompt: finalPrompt,           // Final prompt (optimized + user edits)
      artStyle: structure.artStyle,         // Selected art style
      shotType: structure.shotType,        // Camera framing
      cameraAngle: structure.cameraAngle,   // Camera angle
      lighting: structure.lighting          // Lighting selection
    }
    
    // Call parent handler - it will update isGenerating prop
    onGenerateImage(promptData)
    
    // Don't close - let the loading overlay show while generating
    // Modal will close when parent updates the isGenerating prop to false
  }
  
  // Combine local and prop loading states for immediate feedback
  const isActuallyGenerating = localIsGenerating || isGenerating
  
  // Reset local loading state when parent stops generating
  useEffect(() => {
    if (!isGenerating && localIsGenerating) {
      // Small delay to ensure smooth transition
      setTimeout(() => setLocalIsGenerating(false), 100)
    }
  }, [isGenerating, localIsGenerating])

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(constructedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleModeChange = (newMode: string) => {
    const mode = newMode as 'guided' | 'advanced'
    if (mode === 'advanced') {
      // When switching to advanced, populate with optimized prompt if available
      if (optimizedPrompt) {
        setAdvancedPrompt(isOptimizedPromptEdited ? editedOptimizedPrompt : optimizedPrompt)
      } else {
        // Fallback to current crafted prompt
        const currentPrompt = isPromptEdited ? editedPrompt : constructPrompt()
        setAdvancedPrompt(currentPrompt)
      }
    }
    setMode(mode)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] bg-gray-900 text-white border-gray-700 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white">Scene Prompt Builder - {scene?.heading || `Scene ${scene?.sceneNumber || ''}`}</DialogTitle>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="w-full">
            <TabsTrigger value="guided" className="flex-1 relative">
              Guided Mode
              {isPromptEdited && (
                <span className="ml-1 text-xs text-amber-400">✏️</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex-1">
              Advanced Mode
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
              </div>
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

            {/* Optimized Prompt Preview - Editable */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-200">Optimized Prompt</h3>
                  {sanitizationChanges.length > 0 && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                      {sanitizationChanges.length} sanitization change{sanitizationChanges.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {optimizedPrompt && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                      Auto-optimized
                    </span>
                  )}
                </div>
                {isOptimizedPromptEdited && (
                  <button
                    onClick={() => {
                      setEditedOptimizedPrompt(optimizedPrompt)
                      setIsOptimizedPromptEdited(false)
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Reset to Auto-Optimized
                  </button>
                )}
              </div>
              
              {/* Sanitization Changes Indicator */}
              {sanitizationChanges.length > 0 && (
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
                  <div className="flex items-start gap-2 mb-1">
                    <AlertCircle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-yellow-400 font-medium mb-1">Sanitization Applied:</p>
                      {sanitizationChanges.map((change, idx) => (
                        <div key={idx} className="text-yellow-300/80 mb-1">
                          • <span className="line-through">{change.original}</span> → <span className="font-medium">{change.sanitized}</span>
                          <span className="text-yellow-400/60 ml-1">({change.reason})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <Textarea
                value={isOptimizedPromptEdited ? editedOptimizedPrompt : optimizedPrompt || (isPromptEdited ? editedPrompt : constructPrompt())}
                onChange={(e) => {
                  setEditedOptimizedPrompt(e.target.value)
                  setIsOptimizedPromptEdited(true)
                }}
                rows={6}
                className="resize-vertical text-sm"
                placeholder="Optimized prompt will appear here..."
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {isOptimizedPromptEdited ? (
                    <span className="text-amber-400">✏️ Optimized prompt manually edited</span>
                  ) : optimizedPrompt ? (
                    <span>✅ Auto-optimized from your settings (sanitized for safety + character references)</span>
                  ) : (
                    <span>💡 Auto-crafted from selections above. Will be optimized when you select characters.</span>
                  )}
                </p>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showPreview ? 'Hide' : 'Show'} Preview
                </button>
              </div>
              
              {/* Collapsible Preview Section */}
              {showPreview && (
                <div className="mt-2 p-3 bg-gray-900/50 rounded border border-gray-600 space-y-2">
                  <div className="text-xs">
                    <p className="text-gray-400 mb-1">Original Scene:</p>
                    <p className="text-gray-300 text-xs bg-gray-800 p-2 rounded">{originalPrompt || 'N/A'}</p>
                  </div>
                  {optimizedPromptDetails && (
                    <div className="text-xs">
                      <p className="text-gray-400 mb-1">Applied Settings:</p>
                      <ul className="text-gray-300 text-xs space-y-0.5 ml-2">
                        <li>• Art Style: {artStylePresets.find(s => s.id === structure.artStyle)?.name || structure.artStyle}</li>
                        <li>• Shot Type: {structure.shotType}</li>
                        <li>• Camera Angle: {structure.cameraAngle}</li>
                        <li>• Lighting: {structure.lighting}</li>
                        {structure.characters.length > 0 && (
                          <li>• Characters: {structure.characters.length} selected with reference matching</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Advanced Mode */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* Preview Section - Collapsible */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-200">Preview & Settings</h3>
                  {sanitizationChanges.length > 0 && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                      {sanitizationChanges.length} change{sanitizationChanges.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {showPreview ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              
              {showPreview && (
                <div className="space-y-3 pt-2 border-t border-gray-700">
                  {originalPrompt && (
                    <div className="text-xs">
                      <p className="text-gray-400 mb-1">Original Scene Description:</p>
                      <p className="text-gray-300 text-xs bg-gray-900 p-2 rounded whitespace-pre-wrap">{originalPrompt}</p>
                    </div>
                  )}
                  
                  {sanitizationChanges.length > 0 && (
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
                      <div className="flex items-start gap-2 mb-1">
                        <AlertCircle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-yellow-400 font-medium mb-1">Sanitization Changes:</p>
                          {sanitizationChanges.map((change, idx) => (
                            <div key={idx} className="text-yellow-300/80 mb-1">
                              • <span className="line-through">{change.original}</span> → <span className="font-medium">{change.sanitized}</span>
                              <span className="text-yellow-400/60 ml-1">({change.reason})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {optimizedPromptDetails && (
                    <div className="text-xs">
                      <p className="text-gray-400 mb-1">Applied Settings:</p>
                      <ul className="text-gray-300 text-xs space-y-0.5 ml-2 bg-gray-900 p-2 rounded">
                        <li>• Art Style: {artStylePresets.find(s => s.id === structure.artStyle)?.name || structure.artStyle}</li>
                        <li>• Shot Type: {structure.shotType}</li>
                        <li>• Camera Angle: {structure.cameraAngle}</li>
                        <li>• Lighting: {structure.lighting}</li>
                        <li>• Location: {structure.location || 'Not specified'}</li>
                        <li>• Time of Day: {structure.timeOfDay}</li>
                        {structure.characters.length > 0 && (
                          <li>• Characters: {structure.characters.length} selected {structure.characters.some(c => availableCharacters.find(ac => ac.name === c)?.referenceImage) ? 'with reference images' : ''}</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Optimized Prompt - Editable */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400">Optimized Scene Prompt (Editable)</label>
                {optimizedPrompt && advancedPrompt === optimizedPrompt && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                    Using optimized version
                  </span>
                )}
              </div>
              <Textarea
                value={advancedPrompt}
                onChange={(e) => setAdvancedPrompt(e.target.value)}
                rows={12}
                placeholder="Optimized prompt will appear here. You can edit it to add details like ethnicity in framed photos (e.g., 'four young African American men, his sons')..."
                className="resize-vertical"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Tip: This is the final prompt that will be sent to the image generator. You can edit details like ethnicity in framed photos here.
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
                ? (isPromptEdited ? 'Edited Prompt' : 'Auto-Crafted Prompt')
                : 'Custom Prompt'
              }
            </label>
            {mode === 'guided' && isPromptEdited && (
              <button
                onClick={() => {
                  setEditedPrompt(constructPrompt())
                  setIsPromptEdited(false)
                }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Reset
              </button>
            )}
          </div>
          <div className="text-sm text-gray-200 p-2 bg-gray-800 rounded border border-gray-700 max-h-32 overflow-y-auto leading-relaxed">
            {constructedPrompt || <span className="text-gray-500 italic">Fill in the fields above to build your prompt...</span>}
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              onClick={handleGenerateScene} 
              disabled={isActuallyGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActuallyGenerating ? (
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
        {isActuallyGenerating && (
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

