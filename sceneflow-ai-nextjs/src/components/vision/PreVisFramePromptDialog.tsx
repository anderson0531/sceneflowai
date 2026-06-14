'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, Check, ChevronDown, ChevronUp } from 'lucide-react'
import {
  LocationSettingSection,
  CharacterSelectionSection,
  PropSelectionSection,
  CameraCompositionSection,
  ArtStyleGrid,
  QualityModeSection,
  TalentDirectionSection,
  type ModelTier,
  type ThinkingLevel,
} from '@/components/image-gen'
import type { StoryboardFrameSlot } from '@/lib/storyboard/types'
import type { BeatReferenceSelection } from '@/lib/script/segmentTypes'
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import {
  resolvePreVisFramePromptContext,
  type PreVisFramePromptContext,
} from '@/lib/vision/resolvePreVisFramePromptContext'
import { cn } from '@/lib/utils'

export interface PreVisDirectGenerationOptions {
  slot: StoryboardFrameSlot
  sceneIndex: number
  customPrompt?: string
  visualSetup: PreVisFramePromptContext['visualSetup']
  talentDirection: PreVisFramePromptContext['talentDirection']
  artStyle: string
  negativePrompt?: string
  modelTier: ModelTier
  thinkingLevel: ThinkingLevel
  selectedCharacterNames: string[]
  characterWardrobes: Array<{ characterId: string; wardrobeId: string }>
  wardrobeTextOverrides: Record<string, string>
  locationRefId: string | null
  objectRefIds: string[]
  beatReferenceSelection?: BeatReferenceSelection
  fromDialog: true
}

export interface PreVisFramePromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slot: StoryboardFrameSlot | null
  scene: Record<string, unknown> | null
  sceneIndex: number
  characters: any[]
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  filmTitle?: string
  lockedArtStyle?: string
  isGenerating?: boolean
  onGenerate: (options: PreVisDirectGenerationOptions) => void
}

export function PreVisFramePromptDialog({
  open,
  onOpenChange,
  slot,
  scene,
  sceneIndex,
  characters,
  locationReferences,
  objectReferences,
  filmTitle,
  lockedArtStyle,
  isGenerating = false,
  onGenerate,
}: PreVisFramePromptDialogProps) {
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')
  const [modelTier, setModelTier] = useState<ModelTier>('eco')
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('low')
  const [visualSetup, setVisualSetup] = useState<PreVisFramePromptContext['visualSetup']>({
    location: '',
    timeOfDay: 'day',
    weather: 'clear',
    atmosphere: 'neutral',
    shotType: 'medium-shot',
    cameraAngle: 'eye-level',
    lighting: 'natural',
  })
  const [talentDirection, setTalentDirection] = useState<PreVisFramePromptContext['talentDirection']>({
    talentBlocking: '',
    emotionalBeat: '',
    keyProps: '',
  })
  const [artStyle, setArtStyle] = useState('photorealistic')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [advancedPrompt, setAdvancedPrompt] = useState('')
  const [selectedCharacterNames, setSelectedCharacterNames] = useState<string[]>([])
  const [selectedWardrobes, setSelectedWardrobes] = useState<Record<string, string>>({})
  const [wardrobeTextOverrides, setWardrobeTextOverrides] = useState<Record<string, string>>({})
  const [locationRefId, setLocationRefId] = useState<string | null>(null)
  const [objectRefIds, setObjectRefIds] = useState<string[]>([])
  const [locationSectionCollapsed, setLocationSectionCollapsed] = useState(false)
  const [propsSectionCollapsed, setPropsSectionCollapsed] = useState(true)
  const [talentSectionCollapsed, setTalentSectionCollapsed] = useState(false)

  const initialContext = useMemo(() => {
    if (!open || !slot || !scene) return null
    return resolvePreVisFramePromptContext({
      slot,
      scene,
      sceneIndex,
      projectCharacters: characters,
      locationReferences,
      objectReferences,
      filmTitle,
      lockedArtStyle,
    })
  }, [open, slot, scene, sceneIndex, characters, locationReferences, objectReferences, filmTitle, lockedArtStyle])

  useEffect(() => {
    if (!open || !initialContext) return
    setVisualSetup(initialContext.visualSetup)
    setTalentDirection(initialContext.talentDirection)
    setArtStyle(initialContext.artStyle)
    setNegativePrompt(initialContext.negativePrompt)
    setAdvancedPrompt(initialContext.seedPrompt)
    setSelectedCharacterNames(initialContext.selectedCharacterNames)
    setSelectedWardrobes(initialContext.selectedWardrobes)
    setWardrobeTextOverrides(initialContext.wardrobeTextOverrides)
    setLocationRefId(initialContext.locationRefId)
    setObjectRefIds(initialContext.objectRefIds)
    setMode('guided')
  }, [open, initialContext])

  const buildBeatReferenceSelection = useCallback((): BeatReferenceSelection | undefined => {
    if (!slot?.beatId) return undefined
    const characterIds = selectedCharacterNames
      .map((name) => {
        const char = characters.find((c) => c.name === name)
        return char?.id || char?.name
      })
      .filter(Boolean) as string[]
    const characterWardrobes = selectedCharacterNames
      .map((name) => {
        const char = characters.find((c) => c.name === name)
        const wardrobeId = selectedWardrobes[name]
        if (!char?.id || !wardrobeId) return null
        return { characterId: char.id, wardrobeId }
      })
      .filter(Boolean) as Array<{ characterId: string; wardrobeId: string }>
    return {
      characterIds,
      locationRefId,
      objectRefIds,
      characterWardrobes,
      resolvedAt: new Date().toISOString(),
    }
  }, [slot?.beatId, selectedCharacterNames, selectedWardrobes, locationRefId, objectRefIds, characters])

  const handleGenerateClick = () => {
    if (!slot) return
    const characterWardrobes = selectedCharacterNames
      .map((name) => {
        const char = characters.find((c) => c.name === name)
        const wardrobeId = selectedWardrobes[name]
        if (!char?.id || !wardrobeId) return null
        return { characterId: char.id, wardrobeId }
      })
      .filter(Boolean) as Array<{ characterId: string; wardrobeId: string }>

    onGenerate({
      slot,
      sceneIndex,
      customPrompt: mode === 'advanced' ? advancedPrompt.trim() : undefined,
      visualSetup,
      talentDirection,
      artStyle,
      negativePrompt,
      modelTier,
      thinkingLevel,
      selectedCharacterNames,
      characterWardrobes,
      wardrobeTextOverrides,
      locationRefId,
      objectRefIds,
      beatReferenceSelection: buildBeatReferenceSelection(),
      fromDialog: true,
    })
  }

  const locationsWithImages = locationReferences.filter((l) => l.imageUrl)

  if (!slot || !scene) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Direct — {slot.label}</DialogTitle>
          <DialogDescription>
            Scene {sceneIndex + 1} · Guided prompt builder with text-first wardrobe descriptions.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'guided' | 'advanced')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guided">Visual Setup</TabsTrigger>
            <TabsTrigger value="advanced">Custom Prompt</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 max-h-[55vh] pr-3 mt-3">
            <TabsContent value="guided" className="space-y-3 mt-0">
              <CharacterSelectionSection
                characters={characters}
                selectedCharacterNames={selectedCharacterNames}
                onSelectionChange={setSelectedCharacterNames}
                selectedWardrobes={selectedWardrobes}
                onWardrobeChange={(name, wardrobeId) =>
                  setSelectedWardrobes((prev) => ({ ...prev, [name]: wardrobeId }))
                }
                sceneWardrobes={Array.isArray(scene.characterWardrobes) ? scene.characterWardrobes : []}
                isCollapsed={talentSectionCollapsed}
                onToggleCollapsed={() => setTalentSectionCollapsed((p) => !p)}
              />

              {selectedCharacterNames.length > 0 && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 space-y-2">
                  <p className="text-xs font-medium text-slate-300">
                    Wardrobe text override (optional — diptych ref image is sent when available)
                  </p>
                  {selectedCharacterNames.map((name) => (
                    <div key={name}>
                      <label className="text-[10px] text-slate-500">{name}</label>
                      <Textarea
                        value={wardrobeTextOverrides[name] || ''}
                        onChange={(e) =>
                          setWardrobeTextOverrides((prev) => ({ ...prev, [name]: e.target.value }))
                        }
                        rows={2}
                        className="mt-1 text-xs"
                        placeholder="Full wardrobe description from reference library…"
                      />
                    </div>
                  ))}
                </div>
              )}

              {locationsWithImages.length > 0 && (
                <div className="space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50">
                  <button
                    type="button"
                    onClick={() => setLocationSectionCollapsed((p) => !p)}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-medium text-slate-200 flex-1">Location reference</h4>
                    {locationRefId && (
                      <Badge variant="secondary" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-0">
                        1 selected
                      </Badge>
                    )}
                    {locationSectionCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {!locationSectionCollapsed && (
                    <div className="grid grid-cols-4 gap-2">
                      {locationsWithImages.map((loc) => {
                        const isSelected = locationRefId === loc.id
                        return (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => setLocationRefId(isSelected ? null : loc.id)}
                            className={cn(
                              'relative rounded-lg overflow-hidden border-2 transition-all aspect-video',
                              isSelected
                                ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                                : 'border-slate-700 hover:border-slate-500'
                            )}
                          >
                            <img src={loc.imageUrl} alt={loc.location} className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <PropSelectionSection
                objectReferences={objectReferences}
                selectedObjectIds={objectRefIds}
                onSelectionChange={setObjectRefIds}
                autoDetectedObjectIds={new Set(objectRefIds)}
                isCollapsed={propsSectionCollapsed}
                onToggleCollapsed={() => setPropsSectionCollapsed((p) => !p)}
              />

              <LocationSettingSection
                visualSetup={visualSetup}
                onVisualSetupChange={(update) => setVisualSetup((prev) => ({ ...prev, ...update }))}
              />
              <CameraCompositionSection
                visualSetup={visualSetup}
                onVisualSetupChange={(update) => setVisualSetup((prev) => ({ ...prev, ...update }))}
                showExtendedOptions
              />
              <TalentDirectionSection
                talentDirection={talentDirection}
                onTalentDirectionChange={(update) =>
                  setTalentDirection((prev) => ({ ...prev, ...update }))
                }
              />
              <ArtStyleGrid artStyle={artStyle} onArtStyleChange={setArtStyle} />
              <QualityModeSection
                modelTier={modelTier}
                thinkingLevel={thinkingLevel}
                onModelTierChange={setModelTier}
                onThinkingLevelChange={setThinkingLevel}
              />
            </TabsContent>

            <TabsContent value="advanced" className="space-y-3 mt-0">
              <Textarea
                value={advancedPrompt}
                onChange={(e) => setAdvancedPrompt(e.target.value)}
                rows={10}
                placeholder="Full image generation prompt…"
                className="font-mono text-sm"
              />
              <Textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                rows={2}
                placeholder="Negative prompt…"
                className="text-xs"
              />
              <QualityModeSection
                modelTier={modelTier}
                thinkingLevel={thinkingLevel}
                onModelTierChange={setModelTier}
                onThinkingLevelChange={setThinkingLevel}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerateClick} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Generating…
              </>
            ) : (
              'Generate with Direct'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
