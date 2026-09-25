'use client'

import { useMemo, useState } from 'react'
import { Clapperboard, ImageOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import type { StillDirectorPatch } from '@/lib/intelligence/beat-still-director-fallback'
import type { BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'
import {
  filterLocationReferences,
  filterObjectReferences,
  librarySceneOptions,
  type LibrarySceneFilter,
} from '@/lib/vision/referenceLibraryLookup'

export interface DirectorCharacter {
  id?: string
  name: string
  referenceImage?: string
  type?: string
}

export interface DirectorLocation {
  id: string
  location?: string
  name?: string
  imageUrl?: string
  sceneNumbers?: number[]
  versions?: Array<{ id: string; name: string; imageUrl?: string }>
}

export interface DirectorObject {
  id: string
  name: string
  imageUrl?: string
  sceneNumbers?: number[]
}

export interface BeatDirectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shot: SceneShot
  sceneNumber: number
  sceneIndex: number
  scenes: Array<Record<string, unknown>>
  projectId?: string
  readOnly?: boolean
  characters: DirectorCharacter[]
  locationReferences: DirectorLocation[]
  objectReferences: DirectorObject[]
  referenceSelection: BeatReferenceSelection
  onSaveDirection: (patch: StillDirectorPatch) => void
  onToggleObject: (object: DirectorObject, connect: boolean) => void
  onSelectLocation: (locationRefId: string | null, locationVersionId: string | null) => void
}

type ReferenceTab = 'cast' | 'locations' | 'objects'

function StillMark({ imageUrl }: { imageUrl?: string }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover bg-slate-800" />
    )
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-800 text-slate-500">
      <ImageOff className="h-3.5 w-3.5" />
    </span>
  )
}

const TRANSITION_LABEL: Record<string, string> = {
  CUT: 'Cut',
  CONTINUE: 'Continue',
  DISSOLVE: 'Dissolve',
  FADE: 'Fade',
  MATCH_CUT: 'Match cut',
}

function previewLines(patch: StillDirectorPatch): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = []
  const add = (label: string, value?: string) => {
    if (value?.trim()) rows.push({ label, value: value.trim() })
  }
  add('Frozen moment', patch.frozenMoment || patch.actionFraming)
  add('Shot', patch.shotType)
  add('Angle', patch.cameraAngle)
  add('Movement', patch.cameraMovement)
  add('Transition', patch.transition ? TRANSITION_LABEL[patch.transition] ?? patch.transition : undefined)
  add('Cast', patch.castInFrame?.join(', '))
  add('Blocking', patch.blocking)
  add('Emotion', patch.emotion)
  add('Gaze', patch.gaze)
  add('Lighting', patch.lightingAccent)
  add('Props', patch.keyProps?.join(', '))
  add('Interaction', patch.propInteraction)
  add('Audio', patch.audioCue)
  return rows
}

export function BeatDirectorDialog({
  open,
  onOpenChange,
  beat,
  sceneNumber,
  sceneIndex,
  scenes,
  projectId,
  readOnly,
  characters,
  locationReferences,
  objectReferences,
  referenceSelection,
  onSaveDirection,
  onToggleObject,
  onSelectLocation,
}: BeatDirectorDialogProps) {
  const [instruction, setInstruction] = useState('')
  const [preview, setPreview] = useState<StillDirectorPatch | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<LibrarySceneFilter>(sceneNumber)
  const [tab, setTab] = useState<ReferenceTab>('locations')

  const sceneOptions = useMemo(() => librarySceneOptions(scenes), [scenes])
  const visibleLocations = useMemo(
    () => filterLocationReferences(locationReferences, query, scope),
    [locationReferences, query, scope]
  )
  const visibleObjects = useMemo(
    () => filterObjectReferences(objectReferences, scenes, query, scope),
    [objectReferences, scenes, query, scope]
  )

  const selectedLocation = locationReferences.find(
    (location) => location.id === referenceSelection.locationRefId
  )
  const cast = characters.filter(
    (character) =>
      character.type !== 'narrator' &&
      (referenceSelection.characterIds.includes(character.id || '') ||
        referenceSelection.characterIds.includes(character.name))
  )
  const connectedObjects = objectReferences.filter((object) =>
    referenceSelection.objectRefIds.includes(object.id)
  )
  const lines = preview ? previewLines(preview) : []

  const previewDirection = async () => {
    const note = instruction.trim()
    if (!note) {
      toast.error('Write or dictate a direction note first.')
      return
    }
    if (!projectId) {
      toast.error('Project is still loading.')
      return
    }
    setPreviewing(true)
    try {
      const response = await fetch('/api/scene/direct-beat-still', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          beatId: beat.beatId,
          mode: 'rewrite',
          userDirection: note,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Direction preview failed')
      setPreview((data.patch ?? {}) as StillDirectorPatch)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Direction preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  const saveDirection = () => {
    if (!preview) return
    onSaveDirection(preview)
    setInstruction('')
    setPreview(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[min(48rem,calc(100vw-2rem))] max-w-none min-w-0 max-h-[90vh] flex-col gap-3 overflow-x-hidden overflow-y-auto bg-slate-900 border-slate-700 text-slate-100">
        <DialogTitle className="flex min-w-0 items-center gap-2 break-words text-base font-semibold text-white">
          <Clapperboard className="h-4 w-4 shrink-0 text-teal-400" />
          Direct Shot · Scene {sceneNumber} · Shot {beat.sequenceIndex + 1}
        </DialogTitle>
        <DialogDescription className="min-w-0 break-words text-sm text-slate-400">
          Type or dictate how this shot should be directed. Preview the direction, then save it.
          Still and clip prompts update with the save.
        </DialogDescription>

        <label className="flex min-w-0 flex-col gap-1 text-xs">
          <span className="text-[10px] uppercase text-slate-500">Direction note</span>
          <DictationTextarea
            value={instruction}
            onChange={setInstruction}
            rows={4}
            disabled={readOnly || previewing}
            placeholder="Describe the shot, action, or change you want."
            className="min-w-0"
          />
        </label>
        <button
          type="button"
          className="inline-flex w-fit items-center gap-1 rounded border border-teal-800/80 px-3 py-1.5 text-xs text-teal-100 hover:bg-teal-950/40 disabled:opacity-50"
          disabled={readOnly || previewing}
          onClick={() => void previewDirection()}
        >
          {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Preview direction
        </button>

        {lines.length > 0 && (
          <div className="min-w-0 space-y-1 rounded border border-slate-700 bg-slate-950/70 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Direction preview</p>
            {lines.map((row) => (
              <p key={row.label} className="break-words text-xs text-slate-200">
                <span className="text-slate-500">{row.label}. </span>
                {row.value}
              </p>
            ))}
            <button
              type="button"
              className="mt-2 rounded bg-teal-700 px-3 py-1.5 text-xs text-white hover:bg-teal-600 disabled:opacity-50"
              disabled={readOnly}
              onClick={saveDirection}
            >
              Save direction
            </button>
          </div>
        )}

        <div className="min-w-0 space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Connected references</p>
          <div className="flex min-w-0 flex-wrap gap-2">
            {cast.map((character) => (
              <span
                key={character.id || character.name}
                className="flex max-w-full items-center gap-2 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs"
              >
                <StillMark imageUrl={character.referenceImage} />
                <span className="truncate">{character.name}</span>
              </span>
            ))}
            {selectedLocation && (
              <span className="flex max-w-full items-center gap-2 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs">
                <StillMark imageUrl={selectedLocation.imageUrl} />
                <span className="truncate">{selectedLocation.location || selectedLocation.name}</span>
              </span>
            )}
            {connectedObjects.map((object) => (
              <span
                key={object.id}
                className="flex max-w-full items-center gap-2 rounded-md border border-teal-800/70 bg-slate-800/60 px-2 py-1 text-xs"
              >
                <StillMark imageUrl={object.imageUrl} />
                <span className="truncate">{object.name}</span>
              </span>
            ))}
            {cast.length === 0 && !selectedLocation && connectedObjects.length === 0 && (
              <p className="text-xs text-slate-500">No references connected to this shot yet.</p>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Reference library</p>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search locations and objects"
              disabled={readOnly}
            />
            <select
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              value={scope === 'all' || scope === 'unassigned' ? scope : String(scope)}
              onChange={(event) => {
                const value = event.target.value
                if (value === 'all' || value === 'unassigned') setScope(value)
                else setScope(Number(value))
              }}
              disabled={readOnly}
            >
              <option value={String(sceneNumber)}>This scene</option>
              <option value="all">All scenes</option>
              {sceneOptions
                .filter((option) => option.sceneNumber !== sceneNumber)
                .map((option) => (
                  <option key={option.sceneNumber} value={option.sceneNumber}>
                    {option.label}
                  </option>
                ))}
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
          <div className="flex gap-1">
            {([
              ['cast', 'Cast'],
              ['locations', 'Locations'],
              ['objects', 'Objects'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`rounded px-2 py-1 text-xs ${
                  tab === id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-48 min-w-0 space-y-1 overflow-y-auto overflow-x-hidden rounded border border-slate-800 p-2">
            {tab === 'cast' &&
              (cast.length === 0 ? (
                <p className="text-xs text-slate-500">Cast comes from the shot direction.</p>
              ) : (
                cast.map((character) => (
                  <div key={character.id || character.name} className="flex min-w-0 items-center gap-2 text-xs">
                    <StillMark imageUrl={character.referenceImage} />
                    <span className="truncate">{character.name}</span>
                  </div>
                ))
              ))}
            {tab === 'locations' &&
              (visibleLocations.length === 0 ? (
                <p className="text-xs text-slate-500">No locations in this view.</p>
              ) : (
                visibleLocations.map((location) => {
                  const selected = referenceSelection.locationRefId === location.id
                  const versionId = selected ? referenceSelection.locationVersionId ?? '' : ''
                  return (
                    <div key={location.id} className="flex min-w-0 items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name={`beat-location-${beat.beatId}`}
                        checked={selected}
                        disabled={readOnly}
                        onChange={() => onSelectLocation(location.id, null)}
                      />
                      <StillMark imageUrl={location.imageUrl} />
                      <span className="min-w-0 truncate">{location.location || location.name}</span>
                      {(location.versions?.length ?? 0) > 0 && (
                        <select
                          className="ml-auto max-w-[40%] rounded border border-slate-700 bg-slate-950 px-1 py-0.5"
                          value={versionId}
                          disabled={readOnly}
                          onChange={(event) =>
                            onSelectLocation(location.id, event.target.value || null)
                          }
                        >
                          <option value="">Base</option>
                          {location.versions?.map((version) => (
                            <option key={version.id} value={version.id}>
                              {version.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )
                })
              ))}
            {tab === 'objects' &&
              (visibleObjects.length === 0 ? (
                <p className="text-xs text-slate-500">No objects in this view.</p>
              ) : (
                visibleObjects.map((object) => {
                  const checked = referenceSelection.objectRefIds.includes(object.id)
                  return (
                    <label key={object.id} className="flex min-w-0 items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly}
                        onChange={(event) => onToggleObject(object, event.target.checked)}
                      />
                      <StillMark imageUrl={object.imageUrl} />
                      <span className="min-w-0 truncate">{object.name}</span>
                    </label>
                  )
                })
              ))}
            {tab === 'locations' && selectedLocation && (
              <button
                type="button"
                className="text-[11px] text-slate-400 underline"
                disabled={readOnly}
                onClick={() => onSelectLocation(null, null)}
              >
                Clear location
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
