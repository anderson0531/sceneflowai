'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { Loader2, MapPin, Check, ChevronDown, ChevronUp, AlertTriangle, Sparkles } from 'lucide-react'
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
import { composeBeatActionFraming } from '@/lib/intelligence/beat-sequence-planner-fallback'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface PreVisDirectGenerationOptions {
  slot: StoryboardFrameSlot
  sceneIndex: number
  userDirection?: string
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
  locationVersionId?: string | null
  objectRefIds: string[]
  beatReferenceSelection?: BeatReferenceSelection
  fromDialog: true
}

export interface PreVisFramePromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
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
  projectId,
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
  const t = useTranslations('production.direction.preVis')
  const tc = useTranslations('common.actions')
  const [modelTier, setModelTier] = useState<ModelTier>('eco')
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('low')
  const [userDirection, setUserDirection] = useState('')
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
  const [selectedCharacterNames, setSelectedCharacterNames] = useState<string[]>([])
  const [selectedWardrobes, setSelectedWardrobes] = useState<Record<string, string>>({})
  const [wardrobeTextOverrides, setWardrobeTextOverrides] = useState<Record<string, string>>({})
  const [locationRefId, setLocationRefId] = useState<string | null>(null)
  const [locationVersionId, setLocationVersionId] = useState<string | null>(null)
  const [objectRefIds, setObjectRefIds] = useState<string[]>([])
  const [locationSectionCollapsed, setLocationSectionCollapsed] = useState(false)
  const [propsSectionCollapsed, setPropsSectionCollapsed] = useState(true)
  const [talentSectionCollapsed, setTalentSectionCollapsed] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)

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
    setUserDirection('')
    setSelectedCharacterNames(initialContext.selectedCharacterNames)
    setSelectedWardrobes(initialContext.selectedWardrobes)
    setWardrobeTextOverrides(initialContext.wardrobeTextOverrides)
    setLocationRefId(initialContext.locationRefId)
    setLocationVersionId(initialContext.locationVersionId)
    setObjectRefIds(initialContext.objectRefIds)
  }, [open, initialContext])

  const compiledActionFraming = useMemo(() => {
    if (initialContext?.beat) return composeBeatActionFraming(initialContext.beat)
    return initialContext?.seedPrompt?.trim() || ''
  }, [initialContext])

  const handleSuggestRevisions = async () => {
    if (!projectId || !slot?.beatId) {
      toast.error('Suggestions are available on beat frames')
      return
    }
    setIsSuggesting(true)
    try {
      const response = await fetch('/api/scene/direct-beat-still', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          beatId: slot.beatId,
          mode: 'suggest',
          visualSetup,
          talentDirection,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Suggest failed')
      const notes =
        typeof data.suggestedNotes === 'string' && data.suggestedNotes.trim()
          ? data.suggestedNotes.trim()
          : typeof data.actionFraming === 'string'
            ? data.actionFraming.trim()
            : ''
      if (!notes) throw new Error('No suggestions returned')
      setUserDirection(notes)
      toast.success('Suggested revisions added to Direction')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Suggest failed')
    } finally {
      setIsSuggesting(false)
    }
  }

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
      locationVersionId,
      objectRefIds,
      characterWardrobes,
      resolvedAt: new Date().toISOString(),
      source: 'user',
    }
  }, [slot?.beatId, selectedCharacterNames, selectedWardrobes, locationRefId, locationVersionId, objectRefIds, characters])

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
      userDirection: userDirection.trim() || undefined,
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
      locationVersionId,
      objectRefIds,
      beatReferenceSelection: buildBeatReferenceSelection(),
      fromDialog: true,
    })
  }

  const locationsWithImages = locationReferences.filter((l) => l.imageUrl)

  if (!slot || !scene) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('title', { label: slot.label })}</DialogTitle>
          <DialogDescription>
            {t('description', { number: sceneIndex + 1 })}
          </DialogDescription>
        </DialogHeader>

        {initialContext?.warnings && initialContext.warnings.length > 0 && (
          <div className="flex-shrink-0 rounded-lg border border-amber-700/40 bg-amber-900/15 px-3 py-2 space-y-1">
            <div className="flex items-center gap-2 text-amber-200 text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {t('matchingNotes')}
            </div>
            <ul className="text-[11px] text-amber-100/80 list-disc list-inside space-y-0.5">
              {initialContext.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-3 mt-3 space-y-3">
          {compiledActionFraming && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 space-y-1">
              <p className="text-sm font-medium text-slate-200">{t('compiledFramingTitle')}</p>
              <p className="text-[11px] text-slate-400">{t('compiledFramingHint')}</p>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {compiledActionFraming}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-amber-100">{t('directionTitle')}</p>
                <p className="text-[11px] text-amber-100/70">{t('directionHint')}</p>
              </div>
              {slot.beatId && projectId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSuggestRevisions()}
                  disabled={isSuggesting || isGenerating}
                  className="shrink-0 h-8 text-[11px]"
                >
                  {isSuggesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                  )}
                  {isSuggesting ? t('suggesting') : t('suggestRevisions')}
                </Button>
              )}
            </div>
            <DictationTextarea
              value={userDirection}
              onChange={setUserDirection}
              placeholder={t('directionPlaceholder')}
              rows={3}
              className="text-sm"
            />
          </div>

          <CharacterSelectionSection
            characters={characters}
            selectedCharacterNames={selectedCharacterNames}
            onSelectionChange={setSelectedCharacterNames}
            selectedWardrobes={selectedWardrobes}
            onWardrobeChange={(name, wardrobeId) =>
              setSelectedWardrobes((prev) => ({ ...prev, [name]: wardrobeId }))
            }
            scene={scene}
            sceneIndex={sceneIndex}
            layout="grouped"
            isCollapsed={talentSectionCollapsed}
            onToggleCollapsed={() => setTalentSectionCollapsed((p) => !p)}
          />

          {selectedCharacterNames.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 space-y-2">
              <p className="text-xs font-medium text-slate-300">
                {t('wardrobeOverride')}
              </p>
              {selectedCharacterNames.map((name) => (
                <div key={name}>
                  <label className="text-[10px] text-slate-500">{name}</label>
                  <Textarea
                    translate="no"
                    value={wardrobeTextOverrides[name] || ''}
                    onChange={(e) =>
                      setWardrobeTextOverrides((prev) => ({ ...prev, [name]: e.target.value }))
                    }
                    rows={2}
                    className="mt-1 text-xs"
                    placeholder={t('wardrobePlaceholder')}
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
                <h4 className="text-sm font-medium text-slate-200 flex-1">{t('locationReference')}</h4>
                {locationRefId && (
                  <Badge variant="secondary" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-0">
                    {t('oneSelected')}
                  </Badge>
                )}
                {locationSectionCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {!locationSectionCollapsed && (
                <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {locationsWithImages.map((loc) => {
                    const isSelected = locationRefId === loc.id
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setLocationRefId(null)
                            setLocationVersionId(null)
                          } else {
                            setLocationRefId(loc.id)
                            setLocationVersionId(
                              initialContext?.locationRefId === loc.id
                                ? initialContext.locationVersionId
                                : null
                            )
                          }
                        }}
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
                {locationRefId && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400">{t('locationVersion')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLocationVersionId(null)}
                        className={cn(
                          'text-[10px] px-2 py-1 rounded border',
                          !locationVersionId
                            ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200'
                            : 'border-slate-600 text-slate-400 hover:border-slate-400'
                        )}
                      >
                        {t('locationVersionBase')}
                      </button>
                      {(locationReferences.find((l) => l.id === locationRefId)?.versions || []).map(
                        (version) => (
                          <button
                            key={version.id}
                            type="button"
                            onClick={() => setLocationVersionId(version.id)}
                            className={cn(
                              'text-[10px] px-2 py-1 rounded border max-w-[140px] truncate',
                              locationVersionId === version.id
                                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200'
                                : 'border-slate-600 text-slate-400 hover:border-slate-400'
                            )}
                            title={version.stateNotes}
                          >
                            {version.name}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
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
        </div>

        <DialogFooter className="gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleGenerateClick} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                {t('generating')}
              </>
            ) : (
              t('generateWithDirect')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
