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
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, Check, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { CharacterSelectionSection } from '@/components/image-gen/CharacterSelectionSection'
import { PropSelectionSection } from '@/components/image-gen/PropSelectionSection'
import { cn } from '@/lib/utils'
import type { BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import {
  resolveBeatFrameGenerationContext,
  type LocationMatchConfidence,
} from '@/lib/vision/beatFrameGenerationContext'

export type BeatReferenceConfirmMode = 'save' | 'generate'

export interface BeatReferenceSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scene: Record<string, unknown>
  beat: SceneBeat
  sceneIndex: number
  characters: any[]
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  filmTitle?: string
  initialSelection?: BeatReferenceSelection | null
  isGenerating?: boolean
  onConfirm: (selection: BeatReferenceSelection, mode: BeatReferenceConfirmMode) => void
}

function selectionSummaryParts(
  characterNames: string[],
  locationName: string | undefined,
  objectNames: string[]
): string {
  const parts: string[] = []
  if (characterNames.length) parts.push(characterNames.join(', '))
  if (locationName) parts.push(locationName)
  if (objectNames.length) parts.push(objectNames.join(', '))
  return parts.length ? parts.join(' · ') : 'None selected'
}

export function BeatReferenceSelectionDialog({
  open,
  onOpenChange,
  scene,
  beat,
  sceneIndex,
  characters,
  locationReferences,
  objectReferences,
  filmTitle,
  initialSelection,
  isGenerating = false,
  onConfirm,
}: BeatReferenceSelectionDialogProps) {
  const autoResolved = useMemo(
    () =>
      resolveBeatFrameGenerationContext({
        scene,
        beat,
        projectCharacters: characters,
        locationReferences,
        objectReferences,
        filmTitle,
      }),
    [scene, beat, characters, locationReferences, objectReferences, filmTitle]
  )

  const [selectedCharacterNames, setSelectedCharacterNames] = useState<string[]>([])
  const [selectedWardrobes, setSelectedWardrobes] = useState<Record<string, string>>({})
  const [selectedLocationRefId, setSelectedLocationRefId] = useState<string | null>(null)
  const [selectedObjectRefIds, setSelectedObjectRefIds] = useState<string[]>([])
  const [locationSectionCollapsed, setLocationSectionCollapsed] = useState(false)
  const [propsSectionCollapsed, setPropsSectionCollapsed] = useState(true)
  const [talentSectionCollapsed, setTalentSectionCollapsed] = useState(false)
  const [autoMatchedLocationId, setAutoMatchedLocationId] = useState<string | null>(null)
  const [autoDetectedObjectIds, setAutoDetectedObjectIds] = useState<Set<string>>(new Set())
  const [matchConfidence, setMatchConfidence] = useState<LocationMatchConfidence>('none')
  const [warnings, setWarnings] = useState<string[]>([])

  const resetFromSelection = useCallback(
    (selection: BeatReferenceSelection | null | undefined, auto: typeof autoResolved) => {
      if (selection?.resolvedAt) {
        const names = selection.characterIds
          .map((id) => characters.find((c) => c.id === id || c.name === id)?.name)
          .filter(Boolean) as string[]
        setSelectedCharacterNames(names)
        setSelectedLocationRefId(selection.locationRefId ?? null)
        setSelectedObjectRefIds(selection.objectRefIds || [])
        const wardrobes: Record<string, string> = {}
        for (const cw of selection.characterWardrobes || []) {
          const char = characters.find((c) => c.id === cw.characterId)
          if (char?.name) wardrobes[char.name] = cw.wardrobeId
        }
        setSelectedWardrobes(wardrobes)
        setAutoMatchedLocationId(selection.locationRefId ?? null)
        setAutoDetectedObjectIds(new Set(selection.objectRefIds || []))
        setMatchConfidence(auto.locationMatchConfidence)
        setWarnings(auto.warnings)
        return
      }

      setSelectedCharacterNames(auto.characterNames)
      setSelectedLocationRefId(auto.locationRefId ?? null)
      setSelectedObjectRefIds(auto.objectRefIds)
      setAutoMatchedLocationId(auto.locationRefId ?? null)
      setAutoDetectedObjectIds(new Set(auto.objectRefIds))
      setMatchConfidence(auto.locationMatchConfidence)
      setWarnings(auto.warnings)
      const wardrobes: Record<string, string> = {}
      for (const cw of auto.characterWardrobes || []) {
        const char = characters.find((c) => c.id === cw.characterId)
        if (char?.name) wardrobes[char.name] = cw.wardrobeId
      }
      setSelectedWardrobes(wardrobes)
    },
    [characters]
  )

  useEffect(() => {
    if (open) {
      resetFromSelection(initialSelection, autoResolved)
    }
  }, [open, initialSelection, autoResolved, resetFromSelection])

  const buildSelection = useCallback((): BeatReferenceSelection => {
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
      locationRefId: selectedLocationRefId,
      objectRefIds: selectedObjectRefIds,
      characterWardrobes,
      resolvedAt: new Date().toISOString(),
    }
  }, [
    selectedCharacterNames,
    selectedLocationRefId,
    selectedObjectRefIds,
    selectedWardrobes,
    characters,
  ])

  const summaryLocationName = locationReferences.find((l) => l.id === selectedLocationRefId)?.location
  const summaryObjectNames = objectReferences
    .filter((o) => selectedObjectRefIds.includes(o.id))
    .map((o) => o.name)

  const locationsWithImages = locationReferences.filter((l) => l.imageUrl)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review references — Scene {sceneIndex + 1}</DialogTitle>
          <DialogDescription>
            SceneFlow auto-selected references for this beat. Confirm or adjust before generating.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 max-h-[60vh]">
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 space-y-2">
              <p className="text-xs text-slate-400">
                Beat: {beat.kind === 'action' ? 'Action' : beat.kind === 'narration' ? 'Narration' : 'Dialogue'}
                {beat.beatRole ? ` · ${beat.beatRole.replace(/_/g, ' ')}` : ''}
              </p>
              <p className="text-sm text-slate-200">
                Auto-selected:{' '}
                {selectionSummaryParts(selectedCharacterNames, summaryLocationName, summaryObjectNames)}
              </p>
              {warnings.map((warning) => (
                <p key={warning} className="text-xs text-amber-400 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {warning}
                </p>
              ))}
              {matchConfidence === 'heading' && selectedLocationRefId && (
                <Badge variant="secondary" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-0">
                  Location matched from scene heading
                </Badge>
              )}
            </div>

            <CharacterSelectionSection
              characters={characters}
              selectedCharacterNames={selectedCharacterNames}
              onSelectionChange={setSelectedCharacterNames}
              selectedWardrobes={selectedWardrobes}
              onWardrobeChange={(name, wardrobeId) =>
                setSelectedWardrobes((prev) => ({ ...prev, [name]: wardrobeId }))
              }
              sceneWardrobes={Array.isArray(scene?.characterWardrobes) ? scene.characterWardrobes : []}
              isCollapsed={talentSectionCollapsed}
              onToggleCollapsed={() => setTalentSectionCollapsed((prev) => !prev)}
            />

            {locationsWithImages.length > 0 && (
              <div className="space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50">
                <button
                  type="button"
                  onClick={() => setLocationSectionCollapsed((prev) => !prev)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-medium text-slate-200 flex-1">Location reference</h4>
                  {selectedLocationRefId && (
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
                  <>
                    <p className="text-xs text-slate-400">
                      Pick one environment reference for this beat (used for visual consistency).
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {locationsWithImages.map((loc) => {
                        const isSelected = selectedLocationRefId === loc.id
                        const isAuto = autoMatchedLocationId === loc.id
                        return (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() =>
                              setSelectedLocationRefId(isSelected ? null : loc.id)
                            }
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
                            {isAuto && !isSelected && (
                              <div className="absolute top-1 left-1">
                                <Badge
                                  variant="secondary"
                                  className="text-[8px] bg-cyan-500/80 text-white border-0 px-1 py-0"
                                >
                                  Match
                                </Badge>
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                              <p className="text-[10px] text-white font-medium truncate">{loc.location}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            <PropSelectionSection
              objectReferences={objectReferences}
              selectedObjectIds={selectedObjectRefIds}
              onSelectionChange={setSelectedObjectRefIds}
              autoDetectedObjectIds={autoDetectedObjectIds}
              isCollapsed={propsSectionCollapsed}
              onToggleCollapsed={() => setPropsSectionCollapsed((prev) => !prev)}
            />
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => onConfirm(buildSelection(), 'save')}
            disabled={isGenerating}
          >
            Save selection
          </Button>
          <Button
            onClick={() => onConfirm(buildSelection(), 'generate')}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating…' : 'Generate frame'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
