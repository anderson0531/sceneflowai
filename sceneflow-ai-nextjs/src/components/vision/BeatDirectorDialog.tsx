'use client'

import { useMemo, useState } from 'react'
import { Clapperboard, ImageOff } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'
import {
  filterLocationReferences,
  filterObjectReferences,
  librarySceneOptions,
  type LibrarySceneFilter,
} from '@/lib/vision/referenceLibraryLookup'
import { findBeatsMentioningObject } from '@/lib/vision/beatReferenceConnections'

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
  beat: SceneBeat
  sceneNumber: number
  scenes: Array<Record<string, unknown>>
  readOnly?: boolean
  characters: DirectorCharacter[]
  locationReferences: DirectorLocation[]
  objectReferences: DirectorObject[]
  referenceSelection: BeatReferenceSelection
  frameDraft: string
  videoDraft: string
  onFrameDraft: (value: string) => void
  onVideoDraft: (value: string) => void
  onCommitFrame: () => void
  onCommitVideo: () => void
  onToggleObject: (object: DirectorObject, connect: boolean) => void
  onToggleObjectOnBeat: (
    object: DirectorObject,
    target: { sceneIndex: number; beatId: string },
    connect: boolean
  ) => void
  onSelectLocation: (locationRefId: string | null, locationVersionId: string | null) => void
}

function StillMark({ imageUrl }: { imageUrl?: string }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className="h-8 w-8 rounded object-cover bg-slate-800" />
    )
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-500">
      <ImageOff className="h-3.5 w-3.5" />
    </span>
  )
}

export function BeatDirectorDialog({
  open,
  onOpenChange,
  beat,
  sceneNumber,
  scenes,
  readOnly,
  characters,
  locationReferences,
  objectReferences,
  referenceSelection,
  frameDraft,
  videoDraft,
  onFrameDraft,
  onVideoDraft,
  onCommitFrame,
  onCommitVideo,
  onToggleObject,
  onToggleObjectOnBeat,
  onSelectLocation,
}: BeatDirectorDialogProps) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<LibrarySceneFilter>(sceneNumber)
  const [focusObjectId, setFocusObjectId] = useState<string | null>(null)

  const sceneOptions = useMemo(() => librarySceneOptions(scenes), [scenes])
  const lookupScenes = scenes
  const visibleLocations = useMemo(
    () => filterLocationReferences(locationReferences, query, scope),
    [locationReferences, query, scope]
  )
  const visibleObjects = useMemo(
    () => filterObjectReferences(objectReferences, lookupScenes, query, scope),
    [objectReferences, lookupScenes, query, scope]
  )

  const selectedLocation = locationReferences.find(
    (location) => location.id === referenceSelection.locationRefId
  )
  const focusObject =
    objectReferences.find((object) => object.id === focusObjectId) ??
    objectReferences.find((object) => referenceSelection.objectRefIds.includes(object.id))
  const otherBeats = useMemo(() => {
    if (!focusObject) return []
    return findBeatsMentioningObject(scenes, focusObject.id, focusObject.name, beat.beatId)
  }, [focusObject, scenes, beat.beatId])

  const prose = (beat.line || beat.actionDescription || '').trim()
  const cast = characters.filter(
    (character) =>
      character.type !== 'narrator' &&
      (referenceSelection.characterIds.includes(character.id || '') ||
        referenceSelection.characterIds.includes(character.name))
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-100">
        <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-teal-400" />
          Direct Scene {sceneNumber}
        </DialogTitle>
        <DialogDescription className="text-slate-400">
          {beat.kind ? `${beat.kind} · ` : ''}
          {prose || 'Connect library references so this beat’s direction, still, and clip stay consistent.'}
        </DialogDescription>

        <section className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-wide text-slate-500">Connected references</h3>
          <div className="flex flex-wrap gap-2">
            {cast.map((character) => (
              <span
                key={character.id || character.name}
                className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs"
              >
                <StillMark imageUrl={character.referenceImage} />
                <span>{character.name}</span>
                <span className="text-[10px] text-slate-500">
                  {character.referenceImage ? 'still' : 'no still'}
                </span>
              </span>
            ))}
            {selectedLocation && (
              <span className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs">
                <StillMark
                  imageUrl={
                    selectedLocation.versions?.find(
                      (version) => version.id === referenceSelection.locationVersionId
                    )?.imageUrl || selectedLocation.imageUrl
                  }
                />
                <span>{selectedLocation.location || selectedLocation.name}</span>
                <span className="text-[10px] text-slate-500">location</span>
              </span>
            )}
            {objectReferences
              .filter((object) => referenceSelection.objectRefIds.includes(object.id))
              .map((object) => (
                <button
                  key={object.id}
                  type="button"
                  onClick={() => setFocusObjectId(object.id)}
                  className="flex items-center gap-2 rounded-md border border-teal-800/70 bg-slate-800/60 px-2 py-1 text-xs"
                >
                  <StillMark imageUrl={object.imageUrl} />
                  <span>{object.name}</span>
                  <span className="text-[10px] text-slate-500">
                    {object.imageUrl ? 'still' : 'no still'}
                  </span>
                </button>
              ))}
            {cast.length === 0 && !selectedLocation && referenceSelection.objectRefIds.length === 0 && (
              <p className="text-xs text-slate-500">No references connected to this beat yet.</p>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search locations and objects"
              disabled={readOnly}
            />
            <select
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm"
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[10px] uppercase text-slate-500">Locations</p>
              {visibleLocations.length === 0 ? (
                <p className="text-xs text-slate-500">No locations in this view.</p>
              ) : (
                visibleLocations.map((location) => {
                  const selected = referenceSelection.locationRefId === location.id
                  const versionId = selected ? referenceSelection.locationVersionId ?? '' : ''
                  return (
                    <div key={location.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name={`beat-location-${beat.beatId}`}
                        checked={selected}
                        disabled={readOnly}
                        onChange={() => onSelectLocation(location.id, null)}
                      />
                      <StillMark imageUrl={location.imageUrl} />
                      <span className="truncate">{location.location || location.name}</span>
                      {(location.versions?.length ?? 0) > 0 && (
                        <select
                          className="ml-auto bg-slate-950 border border-slate-700 rounded px-1 py-0.5"
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
              )}
              {selectedLocation && (
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
            <div className="space-y-1">
              <p className="text-[10px] uppercase text-slate-500">Objects</p>
              {visibleObjects.length === 0 ? (
                <p className="text-xs text-slate-500">No objects in this view.</p>
              ) : (
                visibleObjects.map((object) => {
                  const checked = referenceSelection.objectRefIds.includes(object.id)
                  return (
                    <label key={object.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly}
                        onChange={(event) => {
                          setFocusObjectId(object.id)
                          onToggleObject(object, event.target.checked)
                        }}
                      />
                      <StillMark imageUrl={object.imageUrl} />
                      <span className="truncate">{object.name}</span>
                    </label>
                  )
                })
              )}
            </div>
          </div>
        </section>

        {focusObject && otherBeats.length > 0 && (
          <section className="space-y-1">
            <h3 className="text-[11px] uppercase tracking-wide text-slate-500">
              Other beats that name {focusObject.name}
            </h3>
            {otherBeats.map((row) => (
              <label key={`${row.sceneIndex}-${row.beatId}`} className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={row.connected}
                  disabled={readOnly}
                  onChange={(event) =>
                    onToggleObjectOnBeat(
                      focusObject,
                      { sceneIndex: row.sceneIndex, beatId: row.beatId },
                      event.target.checked
                    )
                  }
                />
                <span>
                  <span className="text-slate-400">Scene {row.sceneNumber} · </span>
                  {row.label}
                </span>
              </label>
            ))}
          </section>
        )}

        <section className="grid gap-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[10px] uppercase text-slate-500">Still prompt</span>
            <textarea
              className="min-h-[88px] rounded border border-slate-700 bg-slate-950 px-2 py-1"
              value={frameDraft}
              disabled={readOnly}
              onChange={(event) => onFrameDraft(event.target.value)}
              onBlur={onCommitFrame}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[10px] uppercase text-slate-500">Clip prompt</span>
            <textarea
              className="min-h-[88px] rounded border border-slate-700 bg-slate-950 px-2 py-1"
              value={videoDraft}
              disabled={readOnly}
              onChange={(event) => onVideoDraft(event.target.value)}
              onBlur={onCommitVideo}
            />
          </label>
        </section>
      </DialogContent>
    </Dialog>
  )
}
