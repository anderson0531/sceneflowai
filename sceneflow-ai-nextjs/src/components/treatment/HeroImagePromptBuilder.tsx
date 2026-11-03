'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Input } from '../ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/textarea'
import { Copy, Check, Sparkles, Info, ChevronDown, ChevronUp, User, Box, Image as ImageIcon, Loader2, Film } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'
import {
  POSTER_SHOT_TYPES,
  deriveHeroPromptPreset,
  buildHeroImagePrompt,
  resolveCastRolesForHero,
  type PosterShotTypeId,
  type HeroPromptBlueprintInput,
  type HeroPromptCharacterInput,
  type HeroPromptSceneRefInput,
  type HeroPromptObjectRefInput,
  type HeroPromptStructure,
} from '@/lib/treatment/heroImagePrompts'

/**
 * HeroImagePromptBuilder - Poster/Billboard Image Prompt Builder
 * 
 * Specialized version of ScenePromptBuilder for creating promotional poster/hero images
 * for the Film Treatment. Features:
 * - Poster-specific shot types (Hero Portrait, Ensemble, Silhouette, Key Art, Environment Hero, Confrontation, Action Moment, Intimate Portrait)
 * - Live sync with current Blueprint (`treatment`)
 * - Continuity Library integration (Characters, Scenes/Locations, Objects/Props with reference images)
 * - Title safe zone awareness (keep lower 25% darker for title overlay)
 * - Aspect ratio locked to 2.39:1 (cinematic widescreen) or 16:9
 */

interface HeroImagePromptBuilderProps {
  open: boolean
  onClose: () => void
  treatment: HeroPromptBlueprintInput
  availableCharacters?: HeroPromptCharacterInput[]
  sceneReferences?: HeroPromptSceneRefInput[]
  objectReferences?: HeroPromptObjectRefInput[]
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
  
  // Reference Library selection state
  const [selectedSceneRefIds, setSelectedSceneRefIds] = useState<string[]>([])
  const [selectedObjectRefIds, setSelectedObjectRefIds] = useState<string[]>([])
  const [referenceLibraryOpen, setReferenceLibraryOpen] = useState(false)
  
  const [structure, setStructure] = useState<HeroPromptStructure>(() =>
    deriveHeroPromptPreset({
      treatment: treatment || {},
      posterType: 'hero-portrait',
      availableCharacters,
      sceneReferences,
      objectReferences,
    }).structure
  )
  
  const [advancedPrompt, setAdvancedPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const [isPromptEdited, setIsPromptEdited] = useState(false)

  // Merge availableCharacters with treatment.character_descriptions so cast list is always complete
  const resolvedCharacters = useMemo(
    () => resolveCastRolesForHero(treatment || {}, availableCharacters).allCharacters,
    [treatment, availableCharacters]
  )

  // Merge sceneReferences with treatment.scene_descriptions if not already represented
  const resolvedSceneReferences = useMemo<HeroPromptSceneRefInput[]>(() => {
    const list: HeroPromptSceneRefInput[] = [...sceneReferences]
    if (Array.isArray(treatment?.scene_descriptions)) {
      treatment.scene_descriptions.forEach((s: any, idx: number) => {
        const name = (s?.name || s?.location || '').trim()
        if (!name) return
        const exists = list.some((r) => r.name.toLowerCase() === name.toLowerCase())
        if (!exists) {
          list.push({
            id: s.id || `bp-scene-${idx}`,
            name,
            description: [s.location, s.atmosphere, s.furniture_props].filter(Boolean).join('. '),
            location: s.location,
            atmosphere: s.atmosphere,
            furniture_props: s.furniture_props,
            imageUrl: s.referenceImage || s.imageUrl || undefined,
            type: 'scene',
          })
        }
      })
    }
    return list
  }, [sceneReferences, treatment?.scene_descriptions])

  // Merge objectReferences with treatment.prop_descriptions if not already represented
  const resolvedObjectReferences = useMemo<HeroPromptObjectRefInput[]>(() => {
    const list: HeroPromptObjectRefInput[] = [...objectReferences]
    if (Array.isArray(treatment?.prop_descriptions)) {
      treatment.prop_descriptions.forEach((p: any, idx: number) => {
        const name = (p?.name || '').trim()
        if (!name) return
        const exists = list.some((r) => r.name.toLowerCase() === name.toLowerCase())
        if (!exists) {
          list.push({
            id: p.id || `bp-prop-${idx}`,
            name,
            description: p.description,
            significance: p.significance,
            importance: p.importance,
            category: p.category,
            imageUrl: p.referenceImage || p.imageUrl || undefined,
            type: 'object',
          })
        }
      })
    }
    return list
  }, [objectReferences, treatment?.prop_descriptions])

  // Apply a poster preset and sync with the current Blueprint + Continuity Library
  const applyPosterPreset = useCallback(
    (posterType: PosterShotTypeId) => {
      const derived = deriveHeroPromptPreset({
        treatment: treatment || {},
        posterType,
        availableCharacters: resolvedCharacters,
        sceneReferences: resolvedSceneReferences,
        objectReferences: resolvedObjectReferences,
      })
      setStructure(derived.structure)
      setSelectedSceneRefIds(derived.selectedSceneRefIds)
      setSelectedObjectRefIds(derived.selectedObjectRefIds)
      if (!isPromptEdited) {
        setAdvancedPrompt(
          buildHeroImagePrompt({
            treatment: treatment || {},
            structure: derived.structure,
            availableCharacters: resolvedCharacters,
            sceneReferences: resolvedSceneReferences,
            selectedSceneRefIds: derived.selectedSceneRefIds,
            objectReferences: resolvedObjectReferences,
            selectedObjectRefIds: derived.selectedObjectRefIds,
          })
        )
      }
    },
    [
      treatment,
      resolvedCharacters,
      resolvedSceneReferences,
      resolvedObjectReferences,
      isPromptEdited,
    ]
  )

  // Auto-populate and keep in sync when dialog opens or current Blueprint changes
  useEffect(() => {
    if (!open || !treatment) return
    const derived = deriveHeroPromptPreset({
      treatment,
      posterType: structure.posterType || 'hero-portrait',
      availableCharacters: resolvedCharacters,
      sceneReferences: resolvedSceneReferences,
      objectReferences: resolvedObjectReferences,
    })
    setStructure(derived.structure)
    setSelectedSceneRefIds(derived.selectedSceneRefIds)
    setSelectedObjectRefIds(derived.selectedObjectRefIds)
  }, [
    open,
    treatment?.title,
    treatment?.logline,
    treatment?.synopsis,
    treatment?.genre,
    treatment?.setting,
    treatment?.tone,
    treatment?.visual_style,
    treatment?.artStyle,
    treatment?.opening_hook,
    resolvedCharacters,
    resolvedSceneReferences,
    resolvedObjectReferences,
  ])

  // Construct the poster prompt from current structure + Blueprint + selected references
  const constructPrompt = useCallback((): string => {
    return buildHeroImagePrompt({
      treatment: treatment || {},
      structure,
      availableCharacters: resolvedCharacters,
      sceneReferences: resolvedSceneReferences,
      selectedSceneRefIds,
      objectReferences: resolvedObjectReferences,
      selectedObjectRefIds,
    })
  }, [
    treatment,
    structure,
    resolvedCharacters,
    resolvedSceneReferences,
    selectedSceneRefIds,
    resolvedObjectReferences,
    selectedObjectRefIds,
  ])

  // Sync to advanced mode when not manually edited
  useEffect(() => {
    if (mode === 'advanced' && !isPromptEdited) {
      setAdvancedPrompt(constructPrompt())
    }
  }, [mode, isPromptEdited, constructPrompt])

  // Reset on dialog close
  useEffect(() => {
    if (!open) {
      setIsPromptEdited(false)
      setAdvancedPrompt('')
    }
  }, [open])

  const getRawPrompt = (): string => {
    return mode === 'advanced' && isPromptEdited ? advancedPrompt : constructPrompt()
  }

  const constructedPrompt = getRawPrompt()

  // Count active Continuity Library reference images that will be attached to generation
  const activeReferenceSummary = useMemo(() => {
    const charRefs = structure.characters
      .map((name) => resolvedCharacters.find((c) => c.name === name))
      .filter((c): c is HeroPromptCharacterInput => Boolean(c?.referenceImage))
    const sceneRefs = resolvedSceneReferences.filter(
      (r) => selectedSceneRefIds.includes(r.id) && Boolean(r.imageUrl || r.referenceImage)
    )
    const objRefs = resolvedObjectReferences.filter(
      (r) => selectedObjectRefIds.includes(r.id) && Boolean(r.imageUrl || r.referenceImage)
    )
    return {
      charRefs,
      sceneRefs,
      objRefs,
      totalImages: charRefs.length + sceneRefs.length + objRefs.length,
    }
  }, [
    structure.characters,
    resolvedCharacters,
    resolvedSceneReferences,
    selectedSceneRefIds,
    resolvedObjectReferences,
    selectedObjectRefIds,
  ])

  const handleGenerateImage = () => {
    // Collect selected character objects with reference images
    const selectedCharacterObjects = structure.characters
      .map((charName) => resolvedCharacters.find((c) => c.name === charName))
      .filter(Boolean)
    
    // Collect selected references
    const selectedSceneRefs = resolvedSceneReferences.filter((r) =>
      selectedSceneRefIds.includes(r.id)
    )
    const selectedObjectRefs = resolvedObjectReferences.filter((r) =>
      selectedObjectRefIds.includes(r.id)
    )
    
    const promptData = {
      characters: selectedCharacterObjects,
      prompt: getRawPrompt(),
      negativePrompt: structure.negativePrompt,
      artStyle: structure.artStyle,
      posterType: structure.posterType,
      cameraAngle: structure.cameraAngle,
      lighting: structure.lighting,
      sceneReferences: selectedSceneRefs.map((ref) => ({
        id: ref.id,
        name: ref.name,
        description: ref.description,
        imageUrl: ref.imageUrl || ref.referenceImage,
        type: 'scene' as const,
      })),
      objectReferences: selectedObjectRefs.map((ref) => ({
        id: ref.id,
        name: ref.name,
        description: ref.description,
        imageUrl: ref.imageUrl || ref.referenceImage,
        type: 'object' as const,
      })),
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
          <DialogDescription className="sr-only">
            Form to build a prompt and generate a hero image for this treatment.
          </DialogDescription>
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

            {/* Continuity Library Reference Guidance Banner */}
            {activeReferenceSummary.totalImages > 0 && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-300">
                    <p className="font-medium mb-1">
                      Continuity Library References Active ({activeReferenceSummary.totalImages} reference image{activeReferenceSummary.totalImages === 1 ? '' : 's'})
                    </p>
                    <p className="text-blue-400/80">
                      {[
                        activeReferenceSummary.charRefs.length > 0
                          ? `Cast: ${activeReferenceSummary.charRefs.map((c) => c.name).join(', ')}`
                          : '',
                        activeReferenceSummary.sceneRefs.length > 0
                          ? `Setting: ${activeReferenceSummary.sceneRefs.map((s) => s.name).join(', ')}`
                          : '',
                        activeReferenceSummary.objRefs.length > 0
                          ? `Props: ${activeReferenceSummary.objRefs.map((o) => o.name).join(', ')}`
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' • ')}{' '}
                      will be attached as visual references during generation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Guided Mode */}
            <TabsContent value="guided" className="space-y-4 mt-4">
              {/* Poster Type */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-200">Poster Composition 🎬</h3>
                  <span className="text-[11px] text-amber-400/90">
                    Selecting a preset tailors cast, framing & lighting to your Blueprint
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {POSTER_SHOT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => applyPosterPreset(type.id)}
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
              {resolvedCharacters.length > 0 && (
                <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                  <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Characters
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-400">Select Characters</label>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        {resolvedCharacters.map(char => (
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
                                <div className="text-[10px] text-green-400">✓ Continuity Reference</div>
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
              {(resolvedSceneReferences.length > 0 || resolvedObjectReferences.length > 0) && (
                <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                  <button
                    type="button"
                    onClick={() => setReferenceLibraryOpen(!referenceLibraryOpen)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-gray-200 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      Continuity Reference Library 📚
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
                      {resolvedSceneReferences.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                            <ImageIcon className="w-3 h-3" />
                            Locations / Scenes
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {resolvedSceneReferences.map(ref => (
                              <button
                                key={ref.id}
                                type="button"
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
                                {ref.imageUrl || ref.referenceImage ? (
                                  <img src={(ref.imageUrl || ref.referenceImage)!} alt={ref.name} className="w-full h-full object-cover" />
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
                      {resolvedObjectReferences.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                            <Box className="w-3 h-3" />
                            Props / Objects
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {resolvedObjectReferences.map(ref => (
                              <button
                                key={ref.id}
                                type="button"
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
                                {ref.imageUrl || ref.referenceImage ? (
                                  <img src={(ref.imageUrl || ref.referenceImage)!} alt={ref.name} className="w-full h-full object-cover" />
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
                      type="button"
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
                  <label className="text-xs text-gray-400">Key Objects</label>
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
