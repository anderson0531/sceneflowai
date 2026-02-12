'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { toast } from 'sonner'
import { Loader2, Camera, Sun, Wind, Palette, Users, ChevronDown, ChevronUp, Sparkles, Image as ImageIcon } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { cn } from '@/lib/utils'
import { artStylePresets, type ArtStylePreset } from '@/constants/artStylePresets'

// Support both project-based and treatment-based usage
interface ThumbnailPromptDrawerProps {
  open: boolean
  onClose: () => void
  // Legacy project-based props
  project?: {
    id: string
    title: string
    description: string
    genre?: string
    metadata?: any
  }
  currentThumbnail?: string
  // New treatment-based props for Blueprint hero image
  treatmentVariant?: {
    title?: string
    logline?: string
    genre?: string
    tone?: string
    character_descriptions?: Array<{
      name: string
      description?: string
      role?: string
      appearance?: string
      ethnicity?: string
      age?: string
    }>
    heroImage?: { url?: string; status?: string }
    setting?: string
    visualStyle?: string
  }
  // Callback differs based on usage
  onThumbnailGenerated: (imageUrlOrPrompt: string) => void
}

// Visual setup options
const TIME_OF_DAY_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'golden-hour', label: 'Golden Hour' },
  { value: 'dawn', label: 'Dawn' },
  { value: 'dusk', label: 'Dusk' },
  { value: 'night', label: 'Night' },
  { value: 'blue-hour', label: 'Blue Hour' },
]

const WEATHER_OPTIONS = [
  { value: 'clear', label: 'Clear' },
  { value: 'cloudy', label: 'Cloudy' },
  { value: 'rainy', label: 'Rainy' },
  { value: 'foggy', label: 'Foggy' },
  { value: 'stormy', label: 'Stormy' },
  { value: 'snowy', label: 'Snowy' },
]

const ATMOSPHERE_OPTIONS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'tense', label: 'Tense' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'serene', label: 'Serene' },
  { value: 'melancholic', label: 'Melancholic' },
  { value: 'mysterious', label: 'Mysterious' },
  { value: 'hopeful', label: 'Hopeful' },
  { value: 'romantic', label: 'Romantic' },
]

const SHOT_TYPE_OPTIONS = [
  { value: 'wide-shot', label: 'Wide Shot' },
  { value: 'medium-shot', label: 'Medium Shot' },
  { value: 'medium-close-up', label: 'Medium Close-up' },
  { value: 'close-up', label: 'Close-up' },
  { value: 'extreme-close-up', label: 'Extreme Close-up' },
]

const CAMERA_ANGLE_OPTIONS = [
  { value: 'eye-level', label: 'Eye Level' },
  { value: 'low-angle', label: 'Low Angle' },
  { value: 'high-angle', label: 'High Angle' },
  { value: 'dutch-angle', label: 'Dutch Angle' },
  { value: 'aerial', label: 'Aerial' },
]

const LIGHTING_OPTIONS = [
  { value: 'natural', label: 'Natural' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'soft', label: 'Soft / High-key' },
  { value: 'harsh', label: 'Harsh' },
  { value: 'backlit', label: 'Backlit' },
  { value: 'neon', label: 'Neon' },
]

const DEFAULT_PROMPT_TEMPLATE = (title: string, genre: string, description: string) => `Create a cinematic billboard image for a film with the following details:

Film Title: ${title}
Genre: ${genre}
Concept: ${description}

Style Requirements:
- Professional film poster quality, suitable for billboard display
- Cinematic lighting with high contrast and dramatic shadows
- Visually striking composition with strong focal point
- Film marketing quality, eye-catching and memorable
- Wide angle cinematic framing
- Professional studio lighting with dramatic highlights
- 16:9 landscape aspect ratio
- No text, titles, or watermarks on the image
- Photorealistic or stylized based on genre appropriateness`

export default function ThumbnailPromptDrawer({
  open,
  onClose,
  project,
  currentThumbnail,
  treatmentVariant,
  onThumbnailGenerated
}: ThumbnailPromptDrawerProps) {
  // Determine if we're in treatment mode (Blueprint hero image) or project mode
  const isTreatmentMode = !!treatmentVariant && !project
  
  // Derived values from either source
  const title = treatmentVariant?.title || project?.title || 'Untitled'
  const genre = treatmentVariant?.genre || project?.genre || 'General'
  const description = treatmentVariant?.logline || project?.description || ''
  const characters = treatmentVariant?.character_descriptions || []
  const currentImage = treatmentVariant?.heroImage?.url || currentThumbnail
  
  // Mode: Visual Setup (guided) or Custom Prompt (advanced)
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')
  
  const [tab, setTab] = useState<'edit' | 'ai' | 'review'>('edit')
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [editedPrompt, setEditedPrompt] = useState('')
  const [aiInstructions, setAiInstructions] = useState('')
  const [refinedPrompt, setRefinedPrompt] = useState('')
  const [newThumbnail, setNewThumbnail] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  
  // Visual Setup state
  const [visualSetup, setVisualSetup] = useState({
    location: '',
    timeOfDay: 'golden-hour',
    weather: 'clear',
    atmosphere: 'neutral',
    shotType: 'wide-shot',
    cameraAngle: 'eye-level',
    lighting: 'dramatic',
  })
  
  // Art style state
  const [artStyle, setArtStyle] = useState<string>('photorealistic')
  
  // Character selection state
  const [selectedCharacterNames, setSelectedCharacterNames] = useState<string[]>([])
  const [showCharacters, setShowCharacters] = useState(false)
  
  // Get selected art style preset
  const selectedArtStyle = useMemo(() => 
    artStylePresets.find(s => s.id === artStyle) || artStylePresets[0],
    [artStyle]
  )

  useEffect(() => {
    if (!open) return
    
    // Initialize prompts
    const storedPrompt = project?.metadata?.thumbnailPrompt
    const defaultPrompt = DEFAULT_PROMPT_TEMPLATE(title, genre, description)
    
    setOriginalPrompt(storedPrompt || defaultPrompt)
    setEditedPrompt(storedPrompt || defaultPrompt)
    setAiInstructions('')
    setRefinedPrompt('')
    setNewThumbnail(null)
    setTab('edit')
    setMode('guided')
    
    // Initialize visual setup from treatment if available
    if (treatmentVariant) {
      const setup = { ...visualSetup }
      if (treatmentVariant.setting) {
        setup.location = treatmentVariant.setting
      }
      // Infer atmosphere from tone
      if (treatmentVariant.tone) {
        const toneLower = treatmentVariant.tone.toLowerCase()
        if (toneLower.includes('dark') || toneLower.includes('thriller')) setup.atmosphere = 'tense'
        else if (toneLower.includes('comedy') || toneLower.includes('upbeat')) setup.atmosphere = 'energetic'
        else if (toneLower.includes('romantic')) setup.atmosphere = 'romantic'
        else if (toneLower.includes('mystery')) setup.atmosphere = 'mysterious'
        else if (toneLower.includes('hopeful') || toneLower.includes('inspiring')) setup.atmosphere = 'hopeful'
      }
      setVisualSetup(setup)
      
      // Auto-select main characters (first 3)
      if (characters.length > 0) {
        const mainChars = characters
          .filter(c => c.role?.toLowerCase() === 'protagonist' || c.role?.toLowerCase() === 'main')
          .map(c => c.name)
        setSelectedCharacterNames(mainChars.slice(0, 3) || characters.slice(0, 2).map(c => c.name))
      }
    }
  }, [open, project, treatmentVariant, title, genre, description, characters])
  
  // Build the final prompt from visual setup
  const buildPromptFromSetup = () => {
    const parts: string[] = []
    
    // Base scene description
    parts.push(`Create a cinematic billboard image for "${title}", a ${genre} film.`)
    parts.push('')
    
    // Story context
    if (description) {
      parts.push(`Story: ${description}`)
      parts.push('')
    }
    
    // Visual setup
    parts.push('Visual Setup:')
    if (visualSetup.location) {
      parts.push(`- Location: ${visualSetup.location}`)
    }
    parts.push(`- Time of day: ${TIME_OF_DAY_OPTIONS.find(o => o.value === visualSetup.timeOfDay)?.label || visualSetup.timeOfDay}`)
    if (visualSetup.weather !== 'clear') {
      parts.push(`- Weather: ${WEATHER_OPTIONS.find(o => o.value === visualSetup.weather)?.label || visualSetup.weather}`)
    }
    parts.push(`- Atmosphere: ${ATMOSPHERE_OPTIONS.find(o => o.value === visualSetup.atmosphere)?.label || visualSetup.atmosphere}`)
    parts.push('')
    
    // Camera
    parts.push('Camera:')
    parts.push(`- Shot type: ${SHOT_TYPE_OPTIONS.find(o => o.value === visualSetup.shotType)?.label || visualSetup.shotType}`)
    parts.push(`- Angle: ${CAMERA_ANGLE_OPTIONS.find(o => o.value === visualSetup.cameraAngle)?.label || visualSetup.cameraAngle}`)
    parts.push(`- Lighting: ${LIGHTING_OPTIONS.find(o => o.value === visualSetup.lighting)?.label || visualSetup.lighting}`)
    parts.push('')
    
    // Characters
    if (selectedCharacterNames.length > 0) {
      parts.push('Characters in scene:')
      selectedCharacterNames.forEach(name => {
        const char = characters.find(c => c.name === name)
        if (char) {
          let charDesc = `- ${char.name}`
          if (char.appearance) charDesc += `: ${char.appearance}`
          else if (char.description) charDesc += `: ${char.description}`
          if (char.age) charDesc += `, ${char.age}`
          if (char.ethnicity) charDesc += `, ${char.ethnicity}`
          parts.push(charDesc)
        }
      })
      parts.push('')
    }
    
    // Art style
    parts.push(`Style: ${selectedArtStyle.promptSuffix}`)
    parts.push('')
    
    // Technical requirements
    parts.push('Technical Requirements:')
    parts.push('- Professional film poster quality, suitable for billboard display')
    parts.push('- Visually striking composition with strong focal point')
    parts.push('- 2.39:1 cinematic aspect ratio')
    parts.push('- No text, titles, or watermarks')
    
    return parts.join('\n')
  }

  const appendToPrompt = (text: string) => {
    setEditedPrompt(prev => prev + '\n' + text)
  }

  const handleAIRefine = async () => {
    if (!aiInstructions.trim()) {
      toast.error('Please provide instructions for AI refinement')
      return
    }

    setIsRefining(true)
    try {
      const res = await fetch('/api/prompts/refine-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt: editedPrompt,
          instructions: aiInstructions
        })
      })

      const data = await res.json()

      if (data.success && data.refinedPrompt) {
        setRefinedPrompt(data.refinedPrompt)
        toast.success('AI refinement complete')
      } else {
        toast.error(data.error || 'AI refinement failed')
      }
    } catch (error) {
      console.error('AI refinement error:', error)
      toast.error('Failed to refine prompt')
    } finally {
      setIsRefining(false)
    }
  }

  const handleRegenerate = async () => {
    // In treatment mode, we return the prompt for the parent to handle generation
    if (isTreatmentMode) {
      const finalPrompt = mode === 'guided' ? buildPromptFromSetup() : editedPrompt
      onThumbnailGenerated(finalPrompt)
      onClose()
      return
    }
    
    // Legacy project mode - generate directly
    if (!project) return
    
    setIsGenerating(true)
    try {
      const res = await fetch('/api/projects/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          customPrompt: mode === 'guided' ? buildPromptFromSetup() : editedPrompt,
          title: project.title,
          genre: project.genre,
          description: project.description
        })
      })

      const data = await res.json()

      if (data.success) {
        setNewThumbnail(data.imageUrl)
        setTab('review')
        toast.success('Thumbnail generated successfully')
      } else {
        toast.error(data.error || 'Generation failed')
      }
    } catch (error) {
      console.error('Thumbnail generation error:', error)
      toast.error('Failed to generate thumbnail')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = () => {
    if (newThumbnail) {
      onThumbnailGenerated(newThumbnail)
      toast.success('Thumbnail applied')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="fixed right-0 left-auto top-0 bottom-0 translate-x-0 translate-y-0 ml-auto w-[min(100vw,700px)] max-w-full overflow-hidden rounded-none border-l bg-gray-950 pr-[env(safe-area-inset-right)]">
        <DialogHeader className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/60">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-cyan-400" />
            {isTreatmentMode ? 'Hero Image Prompt Builder' : 'Edit Thumbnail Prompt'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[calc(100dvh-56px)]">
          {/* Mode Toggle - Only show in treatment mode */}
          {isTreatmentMode && (
            <div className="px-6 sm:px-8 py-3 border-b border-gray-800 flex items-center gap-2">
              <button
                onClick={() => setMode('guided')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  mode === 'guided'
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Visual Setup
              </button>
              <button
                onClick={() => {
                  // When switching to advanced, populate with current built prompt
                  if (mode === 'guided') {
                    setEditedPrompt(buildPromptFromSetup())
                  }
                  setMode('advanced')
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  mode === 'advanced'
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                )}
              >
                <Camera className="w-4 h-4" />
                Custom Prompt
              </button>
            </div>
          )}
          
          {/* Legacy Tabs - Only show in project mode */}
          {!isTreatmentMode && (
            <div className="px-6 sm:px-8 pb-2 border-b border-gray-800 flex items-center gap-2">
              {(['edit', 'ai', 'review'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`text-sm px-3 py-1.5 rounded ${
                    tab === k
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800/60'
                  }`}
                >
                  {k === 'edit' ? 'Direct Edit' : k === 'ai' ? 'AI Assist' : 'Review'}
                </button>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 space-y-6">
            {/* GUIDED MODE - Visual Setup */}
            {(isTreatmentMode && mode === 'guided') && (
              <>
                {/* Art Style Selection */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm text-gray-300">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Art Style
                  </Label>
                  <div className="grid grid-cols-5 gap-2">
                    {artStylePresets.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setArtStyle(style.id)}
                        className={cn(
                          "relative p-2 rounded-lg border transition-all text-center",
                          artStyle === style.id
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-gray-700 hover:border-gray-600 bg-gray-900"
                        )}
                      >
                        <div className="text-xs text-gray-300 truncate">{style.name}</div>
                        {artStyle === style.id && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[8px]">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Visual Setup Grid */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm text-gray-300">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    Visual Setup
                  </Label>
                  
                  {/* Location */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Location</div>
                    <input
                      type="text"
                      value={visualSetup.location}
                      onChange={(e) => setVisualSetup(s => ({ ...s, location: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-cyan-500"
                      placeholder="e.g., Modern city skyline, abandoned warehouse, tropical beach..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Time of Day */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <Sun className="w-3 h-3" /> Time of Day
                      </div>
                      <Select
                        value={visualSetup.timeOfDay}
                        onValueChange={(v) => setVisualSetup(s => ({ ...s, timeOfDay: v }))}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OF_DAY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Weather */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <Wind className="w-3 h-3" /> Weather
                      </div>
                      <Select
                        value={visualSetup.weather}
                        onValueChange={(v) => setVisualSetup(s => ({ ...s, weather: v }))}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEATHER_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Atmosphere */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Atmosphere</div>
                      <Select
                        value={visualSetup.atmosphere}
                        onValueChange={(v) => setVisualSetup(s => ({ ...s, atmosphere: v }))}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ATMOSPHERE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Lighting */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Lighting</div>
                      <Select
                        value={visualSetup.lighting}
                        onValueChange={(v) => setVisualSetup(s => ({ ...s, lighting: v }))}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LIGHTING_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Shot Type */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Shot Type</div>
                      <Select
                        value={visualSetup.shotType}
                        onValueChange={(v) => setVisualSetup(s => ({ ...s, shotType: v }))}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SHOT_TYPE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Camera Angle */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Camera Angle</div>
                      <Select
                        value={visualSetup.cameraAngle}
                        onValueChange={(v) => setVisualSetup(s => ({ ...s, cameraAngle: v }))}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CAMERA_ANGLE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Character Selection */}
                {characters.length > 0 && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowCharacters(!showCharacters)}
                      className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
                    >
                      <Users className="w-4 h-4 text-emerald-400" />
                      Characters in Scene
                      {selectedCharacterNames.length > 0 && (
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 text-xs">
                          {selectedCharacterNames.length} selected
                        </Badge>
                      )}
                      {showCharacters ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                    </button>
                    
                    {showCharacters && (
                      <div className="space-y-2 pl-6 border-l-2 border-emerald-500/20">
                        {characters.map(char => (
                          <label
                            key={char.name}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedCharacterNames.includes(char.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCharacterNames(prev => [...prev, char.name].slice(0, 4))
                                } else {
                                  setSelectedCharacterNames(prev => prev.filter(n => n !== char.name))
                                }
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-200 font-medium">{char.name}</div>
                              {char.role && (
                                <div className="text-xs text-gray-500">{char.role}</div>
                              )}
                              {(char.appearance || char.description) && (
                                <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                                  {char.appearance || char.description}
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                        <div className="text-xs text-gray-500 mt-2">
                          Select up to 4 characters to include in the hero image
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Preview of built prompt */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-400">Generated Prompt Preview</div>
                  <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg text-xs text-gray-400 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {buildPromptFromSetup()}
                  </div>
                </div>
              </>
            )}

            {/* ADVANCED MODE - Custom Prompt (also used for legacy project mode) */}
            {((isTreatmentMode && mode === 'advanced') || (!isTreatmentMode && tab === 'edit')) && (
              <>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-2">Original Prompt</div>
                    <div className="w-full p-3 bg-gray-900 border border-gray-800 rounded text-gray-300 whitespace-pre-wrap text-sm min-h-[150px] max-h-[200px] overflow-y-auto">
                      {originalPrompt}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-2">Your Prompt</div>
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-gray-100 text-sm min-h-[200px] focus:outline-none focus:border-cyan-500"
                      placeholder="Edit the image generation prompt..."
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {editedPrompt.length} characters
                    </div>
                  </div>
                </div>

                {/* Quick Additions */}
                <div>
                  <div className="text-xs text-gray-400 mb-2">Quick Additions</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => appendToPrompt('- Cinematic color grading with teal and orange tones')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      + Color Grading
                    </button>
                    <button
                      onClick={() => appendToPrompt('- Golden hour lighting with warm sunset glow')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      + Golden Hour
                    </button>
                    <button
                      onClick={() => appendToPrompt('- Film noir style with high contrast shadows')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      + Noir Style
                    </button>
                    <button
                      onClick={() => appendToPrompt('- Moody atmospheric lighting with fog and haze')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      + Atmospheric
                    </button>
                    <button
                      onClick={() => setEditedPrompt(originalPrompt)}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      ↺ Reset
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Legacy AI Tab */}
            {!isTreatmentMode && tab === 'ai' && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-400 mb-2">Current Prompt</div>
                  <div className="p-3 bg-gray-900 border border-gray-800 rounded text-gray-300 text-sm whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                    {editedPrompt}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-2">What should change?</div>
                  <textarea
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-gray-100 text-sm"
                    rows={5}
                    placeholder="E.g., 'Make it more dramatic', 'Focus on the main character', 'Add sunset lighting', 'More vibrant colors'"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAIRefine}
                    disabled={isRefining || !aiInstructions.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isRefining ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Refining...
                      </>
                    ) : (
                      'Refine with AI'
                    )}
                  </Button>
                </div>

                {refinedPrompt && (
                  <div>
                    <div className="text-xs text-gray-400 mb-2">AI Suggestion</div>
                    <div className="p-3 bg-emerald-900/20 border border-emerald-800 rounded text-gray-200 text-sm whitespace-pre-wrap">
                      {refinedPrompt}
                    </div>
                    <button
                      onClick={() => {
                        setEditedPrompt(refinedPrompt)
                        toast.success('AI suggestion applied to prompt')
                      }}
                      className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                      Use This Prompt →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Legacy Review Tab */}
            {!isTreatmentMode && tab === 'review' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Current Thumbnail */}
                  <div>
                    <div className="text-xs text-gray-400 mb-2">Current Thumbnail</div>
                    {currentImage ? (
                      <img
                        src={currentImage}
                        alt="Current"
                        className="w-full aspect-video object-cover rounded border border-gray-800"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-gray-900 border border-gray-800 rounded flex items-center justify-center text-gray-500 text-sm">
                        No thumbnail yet
                      </div>
                    )}
                  </div>

                  {/* New Thumbnail */}
                  <div>
                    <div className="text-xs text-gray-400 mb-2">New Thumbnail</div>
                    {newThumbnail ? (
                      <img
                        src={newThumbnail}
                        alt="New"
                        className="w-full aspect-video object-cover rounded border border-green-600"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-gray-900 border border-gray-800 rounded flex items-center justify-center text-gray-500 text-sm">
                        Click "Regenerate" to preview
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-2">Edited Prompt</div>
                  <div className="p-3 bg-gray-900 border border-gray-800 rounded text-gray-300 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {editedPrompt}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-4 border-t border-gray-800 flex items-center justify-between sticky bottom-0 bg-gray-950">
            <div className="text-xs text-gray-400">
              {isGenerating && 'Generating image...'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-200">
                Cancel
              </Button>
              {!isTreatmentMode && tab === 'review' && newThumbnail && (
                <Button
                  onClick={handleApply}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Apply Thumbnail
                </Button>
              )}
              <Button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isTreatmentMode ? 'Generate Hero Image' : 'Regenerate Thumbnail'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

