'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Copy,
  ImageOff,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  applyPolicyComplianceToPatch,
  type StillDirectorPatch,
} from '@/lib/intelligence/beat-still-director-fallback'
import type { BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'
import {
  filterLocationReferences,
  filterObjectReferences,
  librarySceneOptions,
  type LibrarySceneFilter,
} from '@/lib/vision/referenceLibraryLookup'
import {
  appendUseTheseReferencesClause,
  buildFrameEditReferenceImages,
  defaultFrameEditReferenceKeys,
  type FrameEditCharacterReference,
  type FrameEditLocationStill,
  type FrameEditReferenceSelectionKey,
} from '@/lib/vision/resolveFrameEditCharacterReferences'
import { MAX_REFERENCE_IMAGES_ECO } from '@/lib/vision/referenceLimits'

export type ShotDirectorTargetSurface = 'still' | 'action-start' | 'end' | 'clip'

export interface DirectorCharacterWardrobe {
  id: string
  name: string
  description?: string
  accessories?: string
  previewImageUrl?: string
  fullBodyUrl?: string
  headshotUrl?: string
  combinedCharacterRefUrl?: string
  sceneNumbers?: number[]
  isDefault?: boolean
}

export interface DirectorCharacter {
  id?: string
  name: string
  referenceImage?: string
  type?: string
  defaultWardrobe?: string
  wardrobes?: DirectorCharacterWardrobe[]
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
  sceneIndex: number
  scenes: Array<Record<string, unknown>>
  projectId?: string
  readOnly?: boolean
  /** Open with Safety already checked, for a content-policy failure. */
  initialSafety?: boolean
  /** Pre-fill the direction note (e.g. from Scene Video Reviewer recommendation). */
  initialInstruction?: string
  /** Pre-load a proposed StillDirectorPatch preview (e.g. from Scene Video Reviewer). */
  initialPatch?: StillDirectorPatch | null
  characters: DirectorCharacter[]
  locationReferences: DirectorLocation[]
  objectReferences: DirectorObject[]
  referenceSelection: BeatReferenceSelection
  onSaveDirection: (
    patch: StillDirectorPatch,
    options?: { allowUnboundReferences?: boolean }
  ) => void | Promise<void>
  /** Save direction and immediately shoot the frame or render the clip. */
  onSaveAndGenerate?: () => void | Promise<void>
  /** Which stage surface opened Shot Director. */
  targetSurface?: ShotDirectorTargetSurface
  /** Current rendered frame image URL when opened on a Still / Start Frame / End Frame. */
  currentFrameImageUrl?: string | null
  /** Persist a surgically refined frame image as a new version without slot-machine regeneration. */
  onSaveEditedFrame?: (newImageUrl: string) => void | Promise<void>
  /** Aspect ratio for surgical frame refinement. */
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4'
  /** Optional continuity references for surgical frame refinement. */
  frameEditCharacterReferences?: FrameEditCharacterReference[]
  defaultSelectedCharRefKeys?: FrameEditReferenceSelectionKey[]
  frameEditLocationStills?: FrameEditLocationStill[]
  defaultSelectedLocationIds?: string[]
  defaultSelectedPropIds?: string[]
  /** Compiled still & clip prompts for transparent inspection / copy inside Shot Director. */
  compiledStillPrompt?: string
  compiledClipPrompt?: string
  /** Optional per-shot clip duration control when opened from Clips. */
  clipDurationSeconds?: number
  clipDurationOptions?: number[]
  onChangeClipDuration?: (seconds: number) => void
  onToggleCharacter?: (character: DirectorCharacter, connect: boolean) => void
  onSelectCharacterWardrobe?: (
    character: DirectorCharacter,
    wardrobeId: string | null
  ) => void
  onToggleObject: (object: DirectorObject, connect: boolean) => void
  onSelectLocation: (locationRefId: string | null, locationVersionId: string | null) => void
}

type ReferenceTab = 'cast' | 'locations' | 'objects'
type DirectorModeTab = 'direct' | 'refine'

function appendRefinementChip(current: string, addition: string): string {
  const trimmed = current.trim()
  if (!trimmed) return addition
  if (trimmed.includes(addition)) return trimmed
  return `${trimmed.replace(/[. ]*$/, '')}. ${addition}`
}

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
  add('Frozen moment', patch.frozenMoment || patch.startFrame || patch.actionFraming)
  add('Start frame', patch.startFrame)
  add('Clip action (10s)', patch.clipAction)
  add('End frame', patch.endFrame)
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
  add('Voice direction', patch.voiceDirection)
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
  onSaveAndGenerate,
  targetSurface = 'still',
  currentFrameImageUrl,
  onSaveEditedFrame,
  aspectRatio = '16:9',
  frameEditCharacterReferences,
  defaultSelectedCharRefKeys,
  frameEditLocationStills,
  defaultSelectedLocationIds,
  defaultSelectedPropIds,
  compiledStillPrompt,
  compiledClipPrompt,
  clipDurationSeconds,
  clipDurationOptions,
  onChangeClipDuration,
  onToggleCharacter,
  onSelectCharacterWardrobe,
  onToggleObject,
  onSelectLocation,
  initialSafety = false,
  initialInstruction = '',
  initialPatch = null,
}: BeatDirectorDialogProps) {
  const t = useTranslations('production.direction.beatDirector')
  const [modeTab, setModeTab] = useState<DirectorModeTab>('direct')
  const [instruction, setInstruction] = useState(initialInstruction)
  const [preview, setPreview] = useState<StillDirectorPatch | null>(initialPatch)
  const [previewing, setPreviewing] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [safety, setSafety] = useState(initialSafety)
  const [allowUnboundReferences, setAllowUnboundReferences] = useState(false)
  const [showCompiledPrompts, setShowCompiledPrompts] = useState(false)

  // Surgical frame refinement state (non-slot-machine pixel-conditioned fix)
  const canRefineCurrentFrame = Boolean(currentFrameImageUrl?.trim() && onSaveEditedFrame)
  const [refineInstruction, setRefineInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [workingFrameUrl, setWorkingFrameUrl] = useState<string>(currentFrameImageUrl ?? '')
  const [editedFrameUrl, setEditedFrameUrl] = useState<string | null>(null)
  const [showOriginalCompare, setShowOriginalCompare] = useState(false)
  const [selectedCharRefKeys, setSelectedCharRefKeys] = useState<FrameEditReferenceSelectionKey[]>(
    []
  )
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([])

  const fallbackCharRefKeys = useMemo(
    () => defaultFrameEditReferenceKeys(frameEditCharacterReferences ?? []),
    [frameEditCharacterReferences]
  )

  const busy = previewing || optimizing || saving || isRefining

  useEffect(() => {
    if (!open) return
    setModeTab('direct')
    setInstruction(initialInstruction || '')
    setPreview(initialPatch ?? null)
    setSafety(initialSafety)
    setAllowUnboundReferences(false)
    setRefineInstruction('')
    setWorkingFrameUrl(currentFrameImageUrl ?? '')
    setEditedFrameUrl(null)
    setShowOriginalCompare(false)
    setSelectedCharRefKeys(defaultSelectedCharRefKeys ?? fallbackCharRefKeys)
    setSelectedLocationIds(defaultSelectedLocationIds ?? [])
    setSelectedPropIds(
      defaultSelectedPropIds ?? referenceSelection.objectRefIds.filter(Boolean)
    )
  }, [
    open,
    initialSafety,
    initialInstruction,
    initialPatch,
    currentFrameImageUrl,
    defaultSelectedCharRefKeys,
    fallbackCharRefKeys,
    defaultSelectedLocationIds,
    defaultSelectedPropIds,
    referenceSelection.objectRefIds,
  ])
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<LibrarySceneFilter>(sceneNumber)
  const [tab, setTab] = useState<ReferenceTab>('cast')

  const sceneOptions = useMemo(() => librarySceneOptions(scenes), [scenes])
  const visibleCharacters = useMemo(() => {
    const q = query.trim().toLowerCase()
    return characters.filter(
      (character) =>
        character.type !== 'narrator' &&
        (!q ||
          character.name.toLowerCase().includes(q) ||
          character.wardrobes?.some(
            (w) =>
              w.name.toLowerCase().includes(q) ||
              (w.description?.toLowerCase().includes(q) ?? false)
          ))
    )
  }, [characters, query])
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
  const isCharacterConnected = (character: DirectorCharacter): boolean =>
    referenceSelection.characterIds.includes(character.id || '') ||
    referenceSelection.characterIds.includes(character.name)
  const resolveExplicitWardrobeId = (character: DirectorCharacter): string => {
    if (referenceSelection.source !== 'user') return ''
    const charIdLower = (character.id || '').trim().toLowerCase()
    const charNameLower = character.name.trim().toLowerCase()
    const entry = referenceSelection.characterWardrobes?.find((cw) => {
      const k = cw.characterId.trim().toLowerCase()
      return (Boolean(charIdLower) && k === charIdLower) || k === charNameLower
    })
    return entry?.wardrobeId ?? ''
  }
  const resolveSceneDefaultWardrobe = (
    character: DirectorCharacter
  ): DirectorCharacterWardrobe | undefined => {
    const wardrobes = character.wardrobes ?? []
    if (wardrobes.length === 0) return undefined
    const sceneRecord = scenes[sceneIndex] as
      | { characterWardrobes?: Array<{ characterId?: string; wardrobeId?: string }> }
      | undefined
    const bySceneNumber = wardrobes.find(
      (w) => Array.isArray(w.sceneNumbers) && w.sceneNumbers.includes(sceneNumber)
    )
    if (bySceneNumber) return bySceneNumber
    const charIdLower = (character.id || '').trim().toLowerCase()
    const charNameLower = character.name.trim().toLowerCase()
    const sceneOverrideId = sceneRecord?.characterWardrobes?.find((cw) => {
      const k = (cw.characterId || '').trim().toLowerCase()
      return (Boolean(charIdLower) && k === charIdLower) || k === charNameLower
    })?.wardrobeId
    if (sceneOverrideId) {
      const bySceneOverride = wardrobes.find((w) => w.id === sceneOverrideId)
      if (bySceneOverride) return bySceneOverride
    }
    return wardrobes.find((w) => w.isDefault) ?? wardrobes[0]
  }
  const resolveEffectiveWardrobe = (
    character: DirectorCharacter
  ): DirectorCharacterWardrobe | undefined => {
    const explicitId = resolveExplicitWardrobeId(character)
    if (explicitId) {
      const explicitMatch = character.wardrobes?.find((w) => w.id === explicitId)
      if (explicitMatch) return explicitMatch
    }
    return resolveSceneDefaultWardrobe(character)
  }
  const resolveCharacterThumbUrl = (character: DirectorCharacter): string | undefined => {
    const activeWardrobe = resolveEffectiveWardrobe(character)
    return (
      activeWardrobe?.previewImageUrl ||
      activeWardrobe?.fullBodyUrl ||
      activeWardrobe?.headshotUrl ||
      activeWardrobe?.combinedCharacterRefUrl ||
      character.referenceImage
    )
  }
  const cast = characters.filter(
    (character) => character.type !== 'narrator' && isCharacterConnected(character)
  )
  const connectedObjects = objectReferences.filter((object) =>
    referenceSelection.objectRefIds.includes(object.id)
  )
  const displayedPreview = preview
    ? safety
      ? applyPolicyComplianceToPatch(preview)
      : preview
    : null
  const lines = displayedPreview ? previewLines(displayedPreview) : []

  const surfaceBadgeLabel =
    targetSurface === 'action-start'
      ? 'Start Frame'
      : targetSurface === 'end'
        ? 'End Frame'
        : targetSurface === 'clip'
          ? 'Video Clip'
          : 'Shot Still'

  const saveAndGenerateLabel =
    targetSurface === 'clip'
      ? 'Save & Render Clip'
      : targetSurface === 'action-start'
        ? 'Save & Shoot Start Frame'
        : targetSurface === 'end'
          ? 'Save & Shoot End Frame'
          : 'Save & Shoot Still'

  const directGenerateLabel =
    targetSurface === 'clip'
      ? 'Render Clip'
      : targetSurface === 'action-start'
        ? 'Shoot Start Frame'
        : targetSurface === 'end'
          ? 'Shoot End Frame'
          : 'Shoot Still'

  const previewDirection = async () => {
    const note = instruction.trim()
    if (!note && !safety) {
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
          mode: note ? 'rewrite' : 'optimize',
          userDirection: note || undefined,
          policyCompliance: safety || undefined,
          allowUnboundReferences: allowUnboundReferences || undefined,
          referenceSelection,
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

  const optimizeDirection = async () => {
    if (!projectId) {
      toast.error('Project is still loading.')
      return
    }
    setInstruction('')
    setOptimizing(true)
    try {
      const response = await fetch('/api/scene/direct-beat-still', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          beatId: beat.beatId,
          mode: 'optimize',
          policyCompliance: safety || undefined,
          allowUnboundReferences: allowUnboundReferences || undefined,
          referenceSelection,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Direction optimize failed')
      setPreview((data.patch ?? {}) as StillDirectorPatch)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Direction optimize failed')
    } finally {
      setOptimizing(false)
    }
  }

  const saveDirection = async (andGenerate = false) => {
    if (!preview || saving) return
    setSaving(true)
    try {
      await onSaveDirection(safety ? applyPolicyComplianceToPatch(preview) : preview, {
        allowUnboundReferences,
      })
      setInstruction('')
      setPreview(null)
      onOpenChange(false)
      if (andGenerate && onSaveAndGenerate) {
        await onSaveAndGenerate()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save direction')
    } finally {
      setSaving(false)
    }
  }

  const refineChips = useMemo(
    () => [
      {
        id: 'remove-object',
        label: 'Remove extra object',
        text: 'Remove the unwanted object from the frame, restoring the background naturally while keeping subjects and lighting identical.',
      },
      {
        id: 'remove-people',
        label: 'Remove extra people',
        text: 'Remove extra background people who are not in the connected character references while keeping main subjects untouched.',
      },
      {
        id: 'ground',
        label: 'Ground subjects',
        text: 'Ground subjects naturally on the floor with realistic contact shadows and perspective.',
      },
      {
        id: 'lighting',
        label: 'Fix lighting',
        text: 'Balance lighting and exposure for natural cinematic continuity without changing pose or framing.',
      },
      {
        id: 'sharpen',
        label: 'Crisp facial & prop detail',
        text: 'Refine facial likeness and prop detail to match continuity references while preserving exact composition.',
      },
    ],
    []
  )

  const runFrameRefinement = useCallback(async () => {
    const sourceImage = workingFrameUrl || currentFrameImageUrl
    if (!sourceImage) return
    if (!refineInstruction.trim()) {
      toast.error('Write or dictate what to adjust on this frame.')
      return
    }
    setIsRefining(true)
    try {
      const objectRefsWithImages = objectReferences
        .filter((obj): obj is DirectorObject & { imageUrl: string } => Boolean(obj.imageUrl?.trim()))
        .map((obj) => ({ id: obj.id, name: obj.name, imageUrl: obj.imageUrl }))
      const prioritizedRefs = buildFrameEditReferenceImages({
        characterReferences: frameEditCharacterReferences ?? [],
        selectedKeys: new Set(selectedCharRefKeys),
        objectReferences: objectRefsWithImages,
        selectedPropIds,
        locationStills: frameEditLocationStills,
        selectedLocationIds,
      })
      const referenceImages = prioritizedRefs.map((ref) => ({
        imageUrl: ref.imageUrl,
        name: ref.name,
      }))
      const fallbackConnectedRefs =
        referenceImages.length > 0
          ? referenceImages
          : [
              ...cast
                .filter((c) => Boolean(c.referenceImage?.trim()))
                .map((c) => ({ imageUrl: c.referenceImage!, name: c.name })),
              ...(selectedLocation?.imageUrl
                ? [
                    {
                      imageUrl: selectedLocation.imageUrl,
                      name: selectedLocation.location || selectedLocation.name,
                    },
                  ]
                : []),
              ...connectedObjects
                .filter((o) => Boolean(o.imageUrl?.trim()))
                .map((o) => ({ imageUrl: o.imageUrl!, name: o.name })),
            ].slice(0, 4)

      const instructionWithRefs = appendUseTheseReferencesClause(
        refineInstruction.trim(),
        fallbackConnectedRefs
      )
      const totalRefs = 1 + fallbackConnectedRefs.length
      const modelTier = totalRefs > MAX_REFERENCE_IMAGES_ECO ? 'designer' : 'eco'

      const response = await fetch('/api/image/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'instruction',
          sourceImage,
          instruction: instructionWithRefs,
          referenceImages: fallbackConnectedRefs.length > 0 ? fallbackConnectedRefs : undefined,
          aspectRatio,
          imageSize: '1K',
          modelTier,
          saveToBlob: true,
          blobPrefix: 'edited-scene',
        }),
      })
      const data = await response.json()
      if (!response.ok || typeof data.imageUrl !== 'string' || !data.imageUrl) {
        throw new Error(data.error || 'Frame refinement failed')
      }
      setWorkingFrameUrl(data.imageUrl)
      setEditedFrameUrl(data.imageUrl)
      setShowOriginalCompare(false)
      toast.success('Frame refined — review and click Save Refined Frame to keep it.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Frame refinement failed')
    } finally {
      setIsRefining(false)
    }
  }, [
    workingFrameUrl,
    currentFrameImageUrl,
    refineInstruction,
    objectReferences,
    frameEditCharacterReferences,
    selectedCharRefKeys,
    selectedPropIds,
    frameEditLocationStills,
    selectedLocationIds,
    cast,
    selectedLocation,
    connectedObjects,
    aspectRatio,
  ])

  const saveRefinedFrame = async () => {
    if (!editedFrameUrl || !onSaveEditedFrame || saving) return
    setSaving(true)
    try {
      await onSaveEditedFrame(editedFrameUrl)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save refined frame')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[min(50rem,calc(100vw-2rem))] max-w-none min-w-0 max-h-[90vh] flex-col gap-3 overflow-x-hidden overflow-y-auto bg-slate-900 border-slate-700 text-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
          <DialogTitle className="flex min-w-0 items-center gap-2 break-words text-base font-semibold text-white">
            <Clapperboard className="h-4 w-4 shrink-0 text-teal-400" />
            Shot Director · Scene {sceneNumber} · Shot {beat.sequenceIndex + 1}
          </DialogTitle>
          <span className="rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-200">
            {surfaceBadgeLabel}
          </span>
        </div>
        <DialogDescription className="min-w-0 break-words text-sm text-slate-400">
          {modeTab === 'refine'
            ? 'Make precise pixel-conditioned adjustments to the current rendered frame while preserving composition, framing, and pose — no slot-machine re-roll.'
            : 'Speak or type how this shot should be directed and preview it, or click Optimize to auto-generate intelligent direction. Saving updates audio, still, and clip prompts together.'}
        </DialogDescription>

        {canRefineCurrentFrame && (
          <div
            role="tablist"
            aria-label="Shot Director mode"
            className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-950/80 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={modeTab === 'direct'}
              onClick={() => setModeTab('direct')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                modeTab === 'direct'
                  ? 'bg-teal-600/90 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Clapperboard className="h-3.5 w-3.5" />
              Direct Shot
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modeTab === 'refine'}
              onClick={() => setModeTab('refine')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                modeTab === 'refine'
                  ? 'bg-purple-600/90 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Wand2 className="h-3.5 w-3.5" />
              Refine Current Frame
            </button>
          </div>
        )}

        {modeTab === 'refine' && canRefineCurrentFrame ? (
          <div className="min-w-0 space-y-3">
            <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-lg border border-slate-700 bg-black aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  showOriginalCompare
                    ? (currentFrameImageUrl ?? '')
                    : (editedFrameUrl || workingFrameUrl || currentFrameImageUrl || '')
                }
                alt="Frame preview"
                className="h-full w-full object-contain"
              />
              <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-medium text-slate-200">
                {showOriginalCompare
                  ? 'Original Frame'
                  : editedFrameUrl
                    ? 'Refined Preview'
                    : 'Current Frame'}
              </span>
              {editedFrameUrl && (
                <div className="absolute right-2 top-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowOriginalCompare((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-[10px] font-medium text-white hover:bg-black/90"
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                    {showOriginalCompare ? 'Show Refined' : 'Compare Original'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedFrameUrl(null)
                      setWorkingFrameUrl(currentFrameImageUrl ?? '')
                      setShowOriginalCompare(false)
                    }}
                    className="inline-flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-[10px] font-medium text-slate-200 hover:bg-black/90"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                </div>
              )}
              {isRefining && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
                  <Loader2 className="h-7 w-7 animate-spin text-purple-400" />
                  <span className="text-xs text-slate-200">Applying surgical frame refinement…</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {refineChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  disabled={readOnly || busy}
                  onClick={() =>
                    setRefineInstruction((prev) => appendRefinementChip(prev, chip.text))
                  }
                  className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-200 hover:border-purple-500/60 hover:bg-purple-950/30 disabled:opacity-50"
                >
                  + {chip.label}
                </button>
              ))}
            </div>

            <label className="flex min-w-0 flex-col gap-1 text-xs">
              <span className="text-[10px] uppercase text-slate-500">
                Surgical adjustment instruction (spoken or typed)
              </span>
              <DictationTextarea
                value={refineInstruction}
                onChange={setRefineInstruction}
                rows={3}
                disabled={readOnly || busy}
                placeholder="e.g., Remove the extra coffee cup on the desk, or soften the rim light on her shoulder while keeping everything else identical."
                className="min-w-0"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={readOnly || busy || !refineInstruction.trim()}
                onClick={() => void runFrameRefinement()}
                className="inline-flex items-center gap-1.5 rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
              >
                {isRefining ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                {editedFrameUrl ? 'Refine Further' : 'Apply Refinement'}
              </button>
              {editedFrameUrl && (
                <button
                  type="button"
                  disabled={readOnly || busy}
                  onClick={() => void saveRefinedFrame()}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Refined Frame
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {onChangeClipDuration && clipDurationOptions && clipDurationOptions.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
                <span className="text-[11px] font-medium text-slate-300">Clip duration</span>
                <div className="inline-flex items-center gap-1">
                  {clipDurationOptions.map((sec) => {
                    const active = clipDurationSeconds === sec
                    return (
                      <button
                        key={sec}
                        type="button"
                        disabled={readOnly || busy}
                        onClick={() => onChangeClipDuration(sec)}
                        className={`rounded px-2 py-0.5 text-xs font-medium tabular-nums transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {sec}s
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <label className="flex min-w-0 flex-col gap-1 text-xs">
              <span className="text-[10px] uppercase text-slate-500">Direction note</span>
              <DictationTextarea
                value={instruction}
                onChange={setInstruction}
                rows={4}
                disabled={readOnly || busy}
                placeholder="Describe the shot, action, camera framing, or change you want, or click Optimize below."
                className="min-w-0"
              />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-300">
                      <Checkbox
                        checked={safety}
                        onCheckedChange={(checked) => setSafety(checked === true)}
                        disabled={readOnly || busy}
                      />
                      {t('safetyOption')}
                    </label>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{t('safetyOptionTooltip')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-300">
                      <Checkbox
                        checked={allowUnboundReferences}
                        onCheckedChange={(checked) => setAllowUnboundReferences(checked === true)}
                        disabled={readOnly || busy}
                      />
                      Optimize beyond current continuity references
                    </label>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    By default, Shot Direction stays aligned with this shot&apos;s connected Cast,
                    Wardrobe, Location, and Props. Check this only when you intentionally want the
                    director to introduce new continuity references or state changes.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {safety && <p className="text-[11px] text-slate-500">{t('safetyHint')}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex w-fit items-center gap-1 rounded border border-teal-800/80 px-3 py-1.5 text-xs text-teal-100 hover:bg-teal-950/40 disabled:opacity-50"
                disabled={readOnly || busy}
                onClick={() => void previewDirection()}
              >
                {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Preview direction
              </button>
              <button
                type="button"
                className="inline-flex w-fit items-center gap-1 rounded border border-amber-700/80 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-900/40 disabled:opacity-50"
                disabled={readOnly || busy}
                onClick={() => void optimizeDirection()}
                title="Auto-generate an optimized direction preview for this shot without typing a note"
              >
                {optimizing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                )}
                Optimize
              </button>
              {onSaveAndGenerate && lines.length === 0 && (
                <button
                  type="button"
                  className="inline-flex w-fit items-center gap-1.5 rounded border border-indigo-500/60 bg-indigo-950/40 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:bg-indigo-900/50 disabled:opacity-50"
                  disabled={readOnly || busy}
                  title="Generate using the currently connected cast, wardrobe, location, and prop references"
                  onClick={async () => {
                    onOpenChange(false)
                    await onSaveAndGenerate()
                  }}
                >
                  <Play className="h-3 w-3 fill-current" />
                  {directGenerateLabel}
                </button>
              )}
            </div>

            {lines.length > 0 && (
              <div className="min-w-0 space-y-1 rounded border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  {safety ? t('safetyPreview') : 'Direction preview'}
                </p>
                {lines.map((row) => (
                  <p key={row.label} className="break-words text-xs text-slate-200">
                    <span className="text-slate-500">{row.label}. </span>
                    {row.value}
                  </p>
                ))}
                <div className="mt-2 flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded bg-teal-700 px-3 py-1.5 text-xs text-white hover:bg-teal-600 disabled:opacity-50"
                    disabled={readOnly || busy}
                    onClick={() => void saveDirection(false)}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {saving ? 'Updating prompts…' : 'Save direction'}
                  </button>
                  {onSaveAndGenerate && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                      disabled={readOnly || busy}
                      onClick={() => void saveDirection(true)}
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3 fill-current" />
                      )}
                      {saveAndGenerateLabel}
                    </button>
                  )}
                </div>
              </div>
            )}

            {(compiledStillPrompt?.trim() || compiledClipPrompt?.trim()) && (
              <div className="min-w-0 rounded border border-slate-800 bg-slate-950/50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setShowCompiledPrompts((prev) => !prev)}
                  className="flex w-full items-center justify-between text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-200"
                >
                  <span className="inline-flex items-center gap-1">
                    {showCompiledPrompts ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    Active compiled prompts (Still &amp; Clip)
                  </span>
                  <span className="text-[10px] font-normal normal-case text-slate-500">
                    Auto-derived from Shot Direction
                  </span>
                </button>
                {showCompiledPrompts && (
                  <div className="mt-2 space-y-2 border-t border-slate-800/80 pt-2">
                    {compiledStillPrompt?.trim() && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase text-cyan-300">
                            Still Prompt
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard
                                .writeText(compiledStillPrompt.trim())
                                .then(() => toast.success('Still prompt copied'))
                            }}
                            className="inline-flex items-center gap-1 rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                          >
                            <Copy className="h-2.5 w-2.5" />
                            Copy
                          </button>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-300">
                          {compiledStillPrompt.trim()}
                        </p>
                      </div>
                    )}
                    {compiledClipPrompt?.trim() && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase text-sky-300">
                            Clip Prompt
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard
                                .writeText(compiledClipPrompt.trim())
                                .then(() => toast.success('Clip prompt copied'))
                            }}
                            className="inline-flex items-center gap-1 rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                          >
                            <Copy className="h-2.5 w-2.5" />
                            Copy
                          </button>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-300">
                          {compiledClipPrompt.trim()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="min-w-0 space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Connected references</p>
          <div className="flex min-w-0 flex-wrap gap-2">
            {cast.map((character) => {
              const wardrobes = character.wardrobes ?? []
              const explicitWardrobeId = resolveExplicitWardrobeId(character)
              const sceneDefaultWardrobe = resolveSceneDefaultWardrobe(character)
              const activeWardrobe = resolveEffectiveWardrobe(character)
              const thumbUrl = resolveCharacterThumbUrl(character)
              return (
                <span
                  key={character.id || character.name}
                  className="flex max-w-full flex-wrap items-center gap-2 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs"
                >
                  <StillMark imageUrl={thumbUrl} />
                  <span className="truncate font-medium text-slate-100">{character.name}</span>
                  {wardrobes.length > 0 && onSelectCharacterWardrobe && !readOnly ? (
                    <select
                      aria-label={`Wardrobe for ${character.name}`}
                      title={
                        activeWardrobe?.description
                          ? `${activeWardrobe.name}: ${activeWardrobe.description}`
                          : activeWardrobe?.name || `Select wardrobe for ${character.name}`
                      }
                      className="max-w-[200px] rounded border border-violet-500/40 bg-slate-950 px-1.5 py-0.5 text-[11px] text-violet-100 focus:border-violet-400 focus:outline-none"
                      value={explicitWardrobeId}
                      onChange={(event) => {
                        const nextWardrobeId = event.target.value || null
                        onSelectCharacterWardrobe(character, nextWardrobeId)
                      }}
                    >
                      <option value="">
                        {sceneDefaultWardrobe
                          ? `Scene default (${sceneDefaultWardrobe.name})`
                          : 'Scene default'}
                      </option>
                      {wardrobes.map((wardrobe) => (
                        <option key={wardrobe.id} value={wardrobe.id}>
                          {wardrobe.name}
                        </option>
                      ))}
                    </select>
                  ) : activeWardrobe?.name ? (
                    <span className="truncate rounded bg-violet-950/60 px-1.5 py-0.5 text-[10px] text-violet-200">
                      {activeWardrobe.name}
                    </span>
                  ) : null}
                </span>
              )
            })}
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
              placeholder="Search cast, wardrobes, locations, and props"
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
              ['objects', 'Props'],
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
              (visibleCharacters.length === 0 ? (
                <p className="text-xs text-slate-500">No cast members in this view.</p>
              ) : (
                visibleCharacters.map((character) => {
                  const checked = isCharacterConnected(character)
                  const wardrobes = character.wardrobes ?? []
                  const explicitWardrobeId = resolveExplicitWardrobeId(character)
                  const sceneDefaultWardrobe = resolveSceneDefaultWardrobe(character)
                  const activeWardrobe = resolveEffectiveWardrobe(character)
                  const thumbUrl = resolveCharacterThumbUrl(character)
                  return (
                    <div
                      key={character.id || character.name}
                      className="flex min-w-0 items-center gap-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly || !onToggleCharacter}
                        onChange={(event) => {
                          const nextChecked = event.target.checked
                          onToggleCharacter?.(character, nextChecked)
                          setPreview((prev) => {
                            if (!prev) return prev
                            const baseCast = Array.isArray(prev.castInFrame)
                              ? prev.castInFrame
                              : cast.map((entry) => entry.name)
                            const nextCast = nextChecked
                              ? baseCast.some(
                                  (name) =>
                                    name.trim().toLowerCase() ===
                                    character.name.trim().toLowerCase()
                                )
                                ? baseCast
                                : [...baseCast, character.name]
                              : baseCast.filter(
                                  (name) =>
                                    name.trim().toLowerCase() !==
                                    character.name.trim().toLowerCase()
                                )
                            return { ...prev, castInFrame: nextCast }
                          })
                        }}
                      />
                      <StillMark imageUrl={thumbUrl} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-slate-100">{character.name}</span>
                        {(activeWardrobe?.description || character.defaultWardrobe) && (
                          <span className="block truncate text-[10px] text-slate-400">
                            {activeWardrobe?.description || character.defaultWardrobe}
                          </span>
                        )}
                      </div>
                      {wardrobes.length > 0 && (
                        <select
                          aria-label={`Select wardrobe for ${character.name}`}
                          title={
                            activeWardrobe?.description
                              ? `${activeWardrobe.name}: ${activeWardrobe.description}`
                              : `Select wardrobe for ${character.name}`
                          }
                          className="ml-auto max-w-[44%] shrink-0 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-xs text-slate-200"
                          value={checked ? explicitWardrobeId : ''}
                          disabled={readOnly || !onSelectCharacterWardrobe}
                          onChange={(event) => {
                            const nextWardrobeId = event.target.value || null
                            onSelectCharacterWardrobe?.(character, nextWardrobeId)
                            if (nextWardrobeId && !checked) {
                              setPreview((prev) => {
                                if (!prev) return prev
                                const baseCast = Array.isArray(prev.castInFrame)
                                  ? prev.castInFrame
                                  : cast.map((entry) => entry.name)
                                if (
                                  baseCast.some(
                                    (name) =>
                                      name.trim().toLowerCase() ===
                                      character.name.trim().toLowerCase()
                                  )
                                ) {
                                  return prev
                                }
                                return { ...prev, castInFrame: [...baseCast, character.name] }
                              })
                            }
                          }}
                        >
                          <option value="">
                            {sceneDefaultWardrobe
                              ? `Default (${sceneDefaultWardrobe.name})`
                              : 'Scene default'}
                          </option>
                          {wardrobes.map((wardrobe) => (
                            <option key={wardrobe.id} value={wardrobe.id}>
                              {wardrobe.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )
                })
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
                <p className="text-xs text-slate-500">No props in this view.</p>
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
