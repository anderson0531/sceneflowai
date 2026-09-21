'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  MapPin,
  Sparkles,
  Upload,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  Check,
  X,
  Image as ImageIcon,
  Maximize2,
  Wand2,
  Sun,
  Moon,
  Sunrise,
  Camera,
  Zap,
  Settings2,
  Clapperboard,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { LocationReference, LocationVersion } from '@/types/visionReferences'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { LocationPromptBuilder, LocationPromptPayload } from './LocationPromptBuilder'
import { ReferenceStillDirectorDialog } from './ReferenceStillDirectorDialog'
import {
  seedLocationDirectorPrompt,
  seedLocationVersionDirectorPrompt,
} from '@/lib/intelligence/reference-still-director-fallback'
import {
  DirectedLocationVersionDialog,
  directedBeatOptionsFromScene,
  type DirectedLocationBeatOption,
} from './DirectedLocationVersionDialog'
import { appendDirectedLocationVersion, type LocationVersionSyncDiff } from '@/lib/vision/locationScriptSync'
import {
  applyLocationUpdateFromSyncDiff,
  collectMissingExtractedLocations,
  countLocationAgentItems,
  extractHeadingLocationsFromScenes,
  locationAgentCopyUnits,
  locationCameraStatus,
  toLocationReferenceFromExtracted,
} from '@/lib/vision/libraryKindAgents'
import type { ReferenceExpressScope, ReferenceExpressKind } from '@/lib/vision/referenceExpress/types'
import { LibraryKindToolbar } from './LibraryKindToolbar'
import { usePendingKindAgentRun } from './usePendingKindAgentRun'
import { patchLocationVersion } from '@/lib/vision/locationVersionResolve'
import {
  DeferredImageSkeleton,
  isDeferredImageUrl,
  isDisplayableImageUrl,
} from '@/components/vision/DeferredImageSkeleton'
import { ReferenceSplitPane } from './ReferenceSplitPane'
import { isDirectionStale } from '@/lib/utils/contentHash'
import {
  filterScenesForLocation,
  locationDescriptionWithMountedFixtures,
  mountedFixturesForLocation,
} from '@/lib/vision/mountedSetFixtures'

function buildScenesPayloadForLocationVersions(scenes: LocationLibraryProps['scenes']) {
  return scenes.map((s, idx) => ({
    sceneNumber: idx + 1,
    heading: typeof s.heading === 'string' ? s.heading : s.heading?.text,
    action: s.action,
    visualDescription: s.visualDescription,
    locationDescription: s.sceneDirection?.scene?.location,
    atmosphere: s.sceneDirection?.scene?.atmosphere,
    beats: (() => {
      const beats = getSceneBeats(s as Record<string, unknown>)
      return beats.length > 0
        ? beats.map((b) => ({
            beatId: b.beatId,
            kind: b.kind,
            actionDescription: b.actionDescription?.trim() || undefined,
            line: b.line?.trim() || undefined,
            frozenMoment: b.beatDirection?.frozenMoment,
            propInteraction: b.beatDirection?.propInteraction,
            lightingAccent: b.beatDirection?.lightingAccent,
            blocking: b.beatDirection?.blocking,
          }))
        : undefined
    })(),
  }))
}

function locationHasOutdatedDirection(
  loc: LocationReference,
  scenes: LocationLibraryProps['scenes']
): boolean {
  const sceneNumbers =
    loc.sceneNumbers && loc.sceneNumbers.length > 0
      ? loc.sceneNumbers
      : loc.sourceSceneIndex != null
        ? [loc.sourceSceneIndex + 1]
        : []

  for (const sceneNum of sceneNumbers) {
    const scene = scenes[sceneNum - 1]
    if (!scene?.sceneDirection || isDirectionStale(scene)) {
      return true
    }
  }
  return false
}

function locationVersionGeneratingId(locationId: string, versionId: string): string {
  return `${locationId}::${versionId}`
}

function scenesForLocation(
  location: LocationReference,
  scenes: LocationLibraryProps['scenes']
): LocationLibraryProps['scenes'] {
  const matched = filterScenesForLocation(location, scenes)
  return matched.length > 0 ? matched : scenes
}

interface LocationLibraryProps {
  /** Current location references */
  locationReferences: LocationReference[]
  /** All scenes from the script */
  scenes: Array<{
    heading?: string | { text?: string }
    action?: string
    visualDescription?: string
    dialogue?: Array<{ character?: string; line?: string }>
    beats?: unknown[]
    segments?: unknown[]
    sceneDirection?: {
      scene?: {
        location?: string
        atmosphere?: string
        keyProps?: string[]
      }
      lighting?: {
        overallMood?: string
        timeOfDay?: string
      }
    }
  }>
  /** Callback to update location references */
  onUpdateLocations: (locations: LocationReference[]) => void | Promise<void>
  /** Callback to remove a location reference */
  onRemoveLocation: (locationId: string) => void
  /** Callback to generate location reference image (legacy — simple) */
  onGenerateLocationImage?: (location: LocationReference) => void
  /** Callback to generate location reference image with prompt builder payload */
  onGenerateLocationImageWithPrompt?: (payload: LocationPromptPayload) => void
  /** Callback to open edit modal for existing location image (optional nested version). */
  onEditLocationImage?: (locationId: string, imageUrl: string, versionId?: string) => void
  /** Callback to upload location reference image */
  onUploadLocationImage?: (locationId: string, file: File) => void
  /** Generate a set-state version still from the base location image */
  onGenerateLocationVersion?: (location: LocationReference, version: LocationVersion) => void
  /** Upload an image onto a nested location version */
  onUploadLocationVersionImage?: (locationId: string, versionId: string, file: File) => void
  /** Whether a location image is currently generating */
  generatingLocationId?: string | null
  /** Screenplay context for prompt builder enrichment */
  screenplayContext?: {
    genre?: string
    tone?: string
    setting?: string
    visualStyle?: string
  }
  /** 50/50 image | controls layout for Reference Library dialog */
  splitLayout?: boolean
  projectId?: string
  onExpressGenerateReferences?: (
    scope?: ReferenceExpressScope,
    options?: { waitUntilDone?: boolean }
  ) => Promise<unknown>
  isExpressGeneratingReferences?: boolean
  getLatestLocations?: () => LocationReference[]
  pendingKindAgentRun?: ReferenceExpressKind | null
  onPendingKindAgentRunConsumed?: () => void
  /** Object-library names used to strip beat props from version image prompts. */
  catalogPropNames?: string[]
}

/**
 * Get time of day icon
 */
function TimeIcon({ time }: { time?: string }) {
  if (!time) return null
  const t = time.toUpperCase()
  if (t.includes('NIGHT') || t.includes('DUSK')) return <Moon className="w-3 h-3 text-indigo-400" />
  if (t.includes('SUNRISE') || t.includes('DAWN') || t.includes('MORNING')) return <Sunrise className="w-3 h-3 text-amber-400" />
  if (t.includes('SUNSET') || t.includes('EVENING')) return <Sunrise className="w-3 h-3 text-orange-400" />
  return <Sun className="w-3 h-3 text-yellow-400" />
}

type PromptBuilderTarget = { locationId: string; versionId?: string }

function LocationStillOverlay({
  isGenerating,
  isUploading,
  showQuickGenerate,
  showEdit,
  alwaysVisible = false,
  onQuickGenerate,
  onPromptBuilder,
  onDirector,
  onEdit,
  onUpload,
}: {
  isGenerating: boolean
  isUploading: boolean
  showQuickGenerate: boolean
  showEdit: boolean
  alwaysVisible?: boolean
  onQuickGenerate?: () => void
  onPromptBuilder?: () => void
  onDirector?: () => void
  onEdit?: () => void
  onUpload?: () => void
}) {
  return (
    <div
      className={`absolute inset-0 z-10 bg-black/40 flex items-center justify-center gap-3 ${
        alwaysVisible ? '' : 'transition-opacity opacity-0 group-hover:opacity-100'
      }`}
    >
      {showQuickGenerate && onQuickGenerate && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onQuickGenerate()
              }}
              disabled={isGenerating}
              className="p-3 bg-indigo-600/80 hover:bg-indigo-600 rounded-full transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Zap className="w-5 h-5 text-white" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Quick Regenerate Image</TooltipContent>
        </Tooltip>
      )}
      {onPromptBuilder && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPromptBuilder()
              }}
              disabled={isGenerating}
              className="p-3 bg-amber-600/80 hover:bg-amber-600 rounded-full transition-colors disabled:opacity-50"
            >
              <Wand2 className="w-5 h-5 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Open Prompt Builder</TooltipContent>
        </Tooltip>
      )}
      {onDirector && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDirector()
              }}
              disabled={isGenerating}
              className="p-3 bg-teal-600/90 hover:bg-teal-500 rounded-full transition-colors disabled:opacity-50"
            >
              <Clapperboard className="w-5 h-5 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Director</TooltipContent>
        </Tooltip>
      )}
      {showEdit && onEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-3 bg-purple-600/80 hover:bg-purple-600 rounded-full transition-colors"
            >
              <Settings2 className="w-5 h-5 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Edit Image</TooltipContent>
        </Tooltip>
      )}
      {onUpload && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onUpload()
              }}
              disabled={isUploading}
              className="p-3 bg-emerald-600/80 hover:bg-emerald-600 rounded-full transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-white" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Upload Image</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

/**
 * LocationLibrary - Intelligent location management for Reference Library
 * 
 * Auto-extracts unique locations from script scene headings, showing INT/EXT,
 * time of day, scene count, and reference images with generate/upload/edit controls.
 */
export function LocationLibrary({
  locationReferences,
  scenes,
  onUpdateLocations,
  onRemoveLocation,
  onGenerateLocationImage,
  onGenerateLocationImageWithPrompt,
  onEditLocationImage,
  onUploadLocationImage,
  onGenerateLocationVersion,
  onUploadLocationVersionImage,
  generatingLocationId,
  screenplayContext,
  splitLayout = false,
  projectId,
  onExpressGenerateReferences,
  isExpressGeneratingReferences = false,
  getLatestLocations,
  pendingKindAgentRun = null,
  onPendingKindAgentRunConsumed,
  catalogPropNames: catalogPropNamesProp = [],
}: LocationLibraryProps) {
  const t = useTranslations('production.direction.locationLibrary')
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null)
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null)
  const [descriptionText, setDescriptionText] = useState('')
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null)
  const [expandedImageName, setExpandedImageName] = useState<string>('')
  const [uploadingForId, setUploadingForId] = useState<string | null>(null)
  const [promptBuilderOpenFor, setPromptBuilderOpenFor] = useState<PromptBuilderTarget | null>(null)
  const [directorTarget, setDirectorTarget] = useState<PromptBuilderTarget | null>(null)
  const [analyzingLocationId, setAnalyzingLocationId] = useState<string | null>(null)
  const [isUpdatingLocations, setIsUpdatingLocations] = useState(false)
  const [expandedVersionTarget, setExpandedVersionTarget] = useState<{
    locationId: string
    versionId: string
  } | null>(null)
  const [directedLocation, setDirectedLocation] = useState<LocationReference | null>(null)
  const [directedSubmitting, setDirectedSubmitting] = useState(false)

  const extractedLocations = useMemo(
    () => extractHeadingLocationsFromScenes(scenes),
    [scenes]
  )

  const extractMissingLocations = useCallback((): LocationReference[] => {
    const missing = collectMissingExtractedLocations(
      extractedLocations.map((loc) => ({
        ...loc,
        description: loc.description || '',
      })),
      locationReferences
    )
    return missing.map((loc, index) =>
      toLocationReferenceFromExtracted(
        loc,
        `loc-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`
      )
    )
  }, [extractedLocations, locationReferences])

  const syncLocationVersions = async (
    location: LocationReference
  ): Promise<{
    location: LocationReference
    created: number
    updated: number
    stale: number
  } | null> => {
    if (scenes.length === 0) return null
    const response = await fetch('/api/vision/sync-location-versions-from-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: {
          id: location.id,
          location: location.location,
          description: location.description,
          versions: location.versions || [],
        },
        scenes: buildScenesPayloadForLocationVersions(scenesForLocation(location, scenes)),
        screenplayContext,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to sync location versions')
    return applyLocationUpdateFromSyncDiff(location, data.diff as LocationVersionSyncDiff)
  }

  const handleUpdateLocations = useCallback(async (): Promise<LocationReference[] | null> => {
    if (scenes.length === 0) {
      toast.error('No scenes available for analysis')
      return null
    }
    setIsUpdatingLocations(true)
    try {
      const newLocations = extractMissingLocations()
      let working: LocationReference[] = [...locationReferences, ...newLocations]
      let created = 0
      let updated = 0
      let stale = 0

      for (const loc of working) {
        const result = await syncLocationVersions(loc)
        if (!result) continue
        working = working.map((row) => (row.id === loc.id ? result.location : row))
        created += result.created
        updated += result.updated
        stale += result.stale
      }

      await onUpdateLocations(working)
      toast.success(
        t('updateSummary', {
          extracted: newLocations.length,
          created,
          updated,
          stale,
        })
      )
      return working
    } catch (error: any) {
      toast.error(error.message || 'Failed to update locations')
      return null
    } finally {
      setIsUpdatingLocations(false)
    }
  }, [extractMissingLocations, locationReferences, onUpdateLocations, scenes, screenplayContext, t])

  /**
   * Merge: update existing refs with latest scene numbers from extraction
   */
  const mergedLocations = useMemo(() => {
    // Merge extracted scene info into existing location references
    const extractedMap = new Map(extractedLocations.map(e => [e.location, e]))

    return locationReferences.map(ref => {
      const extracted = extractedMap.get(ref.location)
      if (extracted) {
        return {
          ...ref,
          sceneNumbers: extracted.sceneNumbers,
          intExt: ref.intExt || extracted.intExt,
          timeOfDay: ref.timeOfDay || extracted.timeOfDay,
          description: ref.description || extracted.description
        }
      }
      return ref
    })
  }, [locationReferences, extractedLocations])

  const catalogPropNames = useMemo(() => {
    const names = new Set<string>()
    for (const name of catalogPropNamesProp) {
      if (name.trim()) names.add(name.trim())
    }
    for (const scene of scenes) {
      for (const prop of scene.sceneDirection?.scene?.keyProps || []) {
        if (prop?.trim()) names.add(prop.trim())
      }
    }
    return [...names]
  }, [catalogPropNamesProp, scenes])

  const expandedVersionLocation = expandedVersionTarget
    ? mergedLocations.find((loc) => loc.id === expandedVersionTarget.locationId)
    : undefined
  const expandedVersion = expandedVersionLocation?.versions?.find(
    (version) => version.id === expandedVersionTarget?.versionId
  )

  const handleSaveDescription = (locationId: string) => {
    const updated = mergedLocations.map(loc =>
      loc.id === locationId ? { ...loc, description: descriptionText.trim() } : loc
    )
    onUpdateLocations(updated)
    setEditingDescriptionId(null)
    setDescriptionText('')
    toast.success('Location description updated')
  }

  const handleFileUpload = async (locationId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (onUploadLocationImage) {
      setUploadingForId(locationId)
      try {
        await onUploadLocationImage(locationId, file)
      } finally {
        setUploadingForId(null)
      }
    }
    e.target.value = ''
  }

  const openVersionPreview = (locationId: string, versionId: string) => {
    setExpandedVersionTarget({ locationId, versionId })
  }

  const handleGenerateVersionFromPreview = (
    location: LocationReference,
    version: LocationVersion
  ) => {
    if (!isDisplayableImageUrl(location.imageUrl)) {
      toast.info(t('baseImageRequired'))
      return
    }
    onGenerateLocationVersion?.(location, version)
  }

  const handleVersionFileUpload = async (
    locationId: string,
    versionId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (onUploadLocationVersionImage) {
      setUploadingForId(locationVersionGeneratingId(locationId, versionId))
      try {
        await onUploadLocationVersionImage(locationId, versionId, file)
      } finally {
        setUploadingForId(null)
      }
    }
    e.target.value = ''
  }

  const handleUpdateOneLocation = async (location: LocationReference) => {
    if (!isDisplayableImageUrl(location.imageUrl)) {
      toast.info(t('baseImageRequired'))
      return
    }
    if (scenes.length === 0) {
      toast.error('No scenes available for analysis')
      return
    }
    setAnalyzingLocationId(location.id)
    try {
      const result = await syncLocationVersions(location)
      if (!result) return
      await onUpdateLocations(
        mergedLocations.map((loc) => (loc.id === location.id ? result.location : loc))
      )
      toast.success(
        t('updateSummary', {
          extracted: 0,
          created: result.created,
          updated: result.updated,
          stale: result.stale,
        })
      )
    } catch (error: any) {
      toast.error(error.message || 'Failed to update location')
    } finally {
      setAnalyzingLocationId(null)
    }
  }

  const directedBeats = useMemo((): DirectedLocationBeatOption[] => {
    if (!directedLocation) return []
    const scoped = scenesForLocation(directedLocation, scenes)
    return scoped.flatMap((scene) => {
      const sceneNumber = scenes.indexOf(scene) + 1
      return directedBeatOptionsFromScene(scene as Record<string, unknown>, sceneNumber || 1)
    })
  }, [directedLocation, scenes])

  const handleDirectedVersionConfirm = async (payload: {
    locationId: string
    name: string
    stateNotes: string
    appliesFrom: { sceneNumber: number; beatIndex: number; beatId?: string }
  }) => {
    const loc = locationReferences.find((item) => item.id === payload.locationId)
    if (!loc) return
    setDirectedSubmitting(true)
    try {
      const { location: nextLoc, version } = appendDirectedLocationVersion(loc, payload)
      const updated = locationReferences.map((item) => (item.id === loc.id ? nextLoc : item))
      await onUpdateLocations(updated)
      setDirectedLocation(null)
      if (isDisplayableImageUrl(loc.imageUrl)) {
        onGenerateLocationVersion?.(nextLoc, version)
      } else {
        toast.info(t('baseImageRequired'))
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add directed set version')
    } finally {
      setDirectedSubmitting(false)
    }
  }

  const handleLocationAgent = async () => {
    if (!onExpressGenerateReferences) return
    await onExpressGenerateReferences({ kinds: ['location'] })
  }

  usePendingKindAgentRun(
    pendingKindAgentRun,
    'location',
    handleLocationAgent,
    onPendingKindAgentRunConsumed
  )

  const locationAgentCount = countLocationAgentItems(mergedLocations)
  const locationAgentUnits = locationAgentCopyUnits(mergedLocations)
  const locationAgentLabel =
    locationAgentCount === 0
      ? t('locationAgent', { count: 0 })
      : locationAgentUnits.bases === 0
        ? t('runLocationAgentSetStills', { count: locationAgentUnits.versions })
        : locationAgentUnits.versions === 0
          ? t('runLocationAgentLocationStills', { count: locationAgentUnits.bases })
          : t('runLocationAgentMixed', {
              bases: locationAgentUnits.bases,
              versions: locationAgentUnits.versions,
            })

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-3">
      {scenes.length > 0 && (
        <LibraryKindToolbar
          updateLabel={t('updateLocations')}
          agentLabel={locationAgentLabel}
          onUpdate={() => void handleUpdateLocations()}
          onAgent={
            onExpressGenerateReferences ? () => void handleLocationAgent() : undefined
          }
          isUpdating={isUpdatingLocations}
          isAgentRunning={isExpressGeneratingReferences}
          agentHasWork={locationAgentCount > 0}
          updateTitle="Extract missing locations from scene headings and sync set versions from the script"
          agentTitle="Update locations from the script, draw missing bases, then generate set-version stills from those bases"
        />
      )}

      {/* Location Cards */}
      {mergedLocations.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-6 text-center">
          <MapPin className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p className="font-medium">No locations yet</p>
          <p className="text-xs mt-1">Click &quot;Update Locations&quot; to extract locations from scene headings</p>
          <p className="text-xs text-gray-400 mt-2">Location references ensure visual consistency<br />across scenes at the same location</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mergedLocations.map((loc) => {
            const isExpanded = expandedLocationId === loc.id
            const isGenerating = generatingLocationId === loc.id
            const isUploading = uploadingForId === loc.id
            const hasImage = isDisplayableImageUrl(loc.imageUrl)
            const isDeferredImage = isDeferredImageUrl(loc.imageUrl)
            const directionOutdated = locationHasOutdatedDirection(loc, scenes)

            return (
              <div
                key={loc.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden group"
              >
                {/* Header - always visible */}
                <button
                  onClick={() => setExpandedLocationId(isExpanded ? null : loc.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* INT/EXT badge */}
                    {loc.intExt && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        loc.intExt === 'INT' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        loc.intExt === 'EXT' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}>
                        {loc.intExt}
                      </span>
                    )}
                    {/* Location name */}
                    <span className="font-medium text-sm text-white truncate">{loc.location}</span>
                    {/* Time of day */}
                    <TimeIcon time={loc.timeOfDay} />
                    {/* Scene count */}
                    {loc.sceneNumbers && loc.sceneNumbers.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded flex-shrink-0">
                        {loc.sceneNumbers.length} scene{loc.sceneNumbers.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {directionOutdated && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Scene direction missing or outdated for mapped scene(s)
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {(() => {
                      const camera = locationCameraStatus(loc)
                      const cameraClass =
                        camera.status === 'ready'
                          ? 'text-green-400'
                          : camera.status === 'versions-pending'
                            ? 'text-amber-400'
                            : 'text-gray-500'
                      const cameraTitle =
                        camera.status === 'ready'
                          ? t('cameraReady')
                          : camera.status === 'versions-pending'
                            ? t('cameraVersionsPending', { count: camera.pendingVersionCount })
                            : t('cameraNoBase')
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex" title={cameraTitle}>
                              <Camera className={`w-3.5 h-3.5 ${cameraClass}`} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{cameraTitle}</TooltipContent>
                        </Tooltip>
                      )
                    })()}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (() => {
                  const locationImagePanel = isDeferredImage ? (
                    <DeferredImageSkeleton className="w-full h-full rounded-md" label={`Loading ${loc.location}`} />
                  ) : hasImage ? (
                    <div className={`relative rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 group ${splitLayout ? 'h-full w-full' : 'aspect-video'}`}>
                      <img
                        src={loc.imageUrl}
                        alt={loc.location}
                        className={`w-full h-full ${splitLayout ? 'object-contain' : 'object-cover'}`}
                        loading="lazy"
                        decoding="async"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedImageUrl(loc.imageUrl)
                          setExpandedImageName(loc.location)
                        }}
                        className="absolute top-2 right-2 z-20 p-1.5 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        title="View full size"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <input
                        id={`location-upload-${loc.id}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(loc.id, e)}
                      />
                      <div className="absolute inset-0 z-10 bg-black/40 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3">
                        {onGenerateLocationImage && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onGenerateLocationImage(loc)
                                }}
                                disabled={isGenerating}
                                className="p-3 bg-indigo-600/80 hover:bg-indigo-600 rounded-full transition-colors disabled:opacity-50"
                              >
                                {isGenerating ? (
                                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                                ) : (
                                  <Zap className="w-5 h-5 text-white" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Quick Regenerate Image</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPromptBuilderOpenFor({ locationId: loc.id })
                              }}
                              disabled={isGenerating}
                              className="p-3 bg-amber-600/80 hover:bg-amber-600 rounded-full transition-colors disabled:opacity-50"
                            >
                              <Wand2 className="w-5 h-5 text-white" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Open Prompt Builder</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDirectorTarget({ locationId: loc.id })
                              }}
                              disabled={isGenerating}
                              className="p-3 bg-teal-600/90 hover:bg-teal-500 rounded-full transition-colors disabled:opacity-50"
                            >
                              <Clapperboard className="w-5 h-5 text-white" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Director</TooltipContent>
                        </Tooltip>
                        {onEditLocationImage && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditLocationImage(loc.id, loc.imageUrl)
                                }}
                                className="p-3 bg-purple-600/80 hover:bg-purple-600 rounded-full transition-colors"
                              >
                                <Settings2 className="w-5 h-5 text-white" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Image</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                document.getElementById(`location-upload-${loc.id}`)?.click()
                              }}
                              disabled={isUploading}
                              className="p-3 bg-emerald-600/80 hover:bg-emerald-600 rounded-full transition-colors disabled:opacity-50"
                            >
                              {isUploading ? (
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                              ) : (
                                <Upload className="w-5 h-5 text-white" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Upload Image</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ) : (
                    <div className={`relative rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 group ${splitLayout ? 'h-full w-full' : 'aspect-video'}`}>
                      {isGenerating || isUploading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                          <span className="text-xs text-gray-400">{isUploading ? 'Uploading...' : 'Generating...'}</span>
                        </div>
                      ) : (
                        <>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 pointer-events-none">
                            <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                            <span className="text-xs">No reference image</span>
                          </div>
                          <input
                            id={`location-upload-empty-${loc.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(loc.id, e)}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3">
                            {onGenerateLocationImage && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onGenerateLocationImage(loc)
                                    }}
                                    disabled={isGenerating}
                                    className="p-3 bg-indigo-600/80 hover:bg-indigo-600 rounded-full transition-colors disabled:opacity-50"
                                  >
                                    <Zap className="w-5 h-5 text-white" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Quick Generate Image</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPromptBuilderOpenFor({ locationId: loc.id })
                                  }}
                                  disabled={isGenerating}
                                  className="p-3 bg-amber-600/80 hover:bg-amber-600 rounded-full transition-colors disabled:opacity-50"
                                >
                                  <Wand2 className="w-5 h-5 text-white" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Open Prompt Builder</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDirectorTarget({ locationId: loc.id })
                                  }}
                                  disabled={isGenerating}
                                  className="p-3 bg-teal-600/90 hover:bg-teal-500 rounded-full transition-colors disabled:opacity-50"
                                >
                                  <Clapperboard className="w-5 h-5 text-white" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Director</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    document.getElementById(`location-upload-empty-${loc.id}`)?.click()
                                  }}
                                  disabled={isUploading}
                                  className="p-3 bg-emerald-600/80 hover:bg-emerald-600 rounded-full transition-colors disabled:opacity-50"
                                >
                                  <Upload className="w-5 h-5 text-white" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Upload Image</TooltipContent>
                            </Tooltip>
                          </div>
                        </>
                      )}
                    </div>
                  )

                  const locationDetailsPanel = (
                    <div className="space-y-2">
                      {loc.sceneNumbers && loc.sceneNumbers.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                          {loc.sceneNumbers.map(n => (
                            <span key={n} className="text-[10px] px-1.5 py-0.5 bg-slate-700/50 text-slate-300 rounded">
                              Scene {n}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-1">
                        {editingDescriptionId === loc.id ? (
                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <textarea
                              value={descriptionText}
                              onChange={(e) => setDescriptionText(e.target.value)}
                              placeholder="Describe this location (e.g., Modern podcast studio with acoustic panels, professional lighting rig...)"
                              className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => { setEditingDescriptionId(null); setDescriptionText('') }}
                                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveDescription(loc.id)}
                                className="px-2 py-1 text-xs bg-cyan-500 hover:bg-cyan-600 text-white rounded flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <p className="text-xs text-gray-400 italic flex-1">
                              {loc.description || 'No description — click edit to add'}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingDescriptionId(loc.id)
                                setDescriptionText(loc.description || '')
                              }}
                              className="p-1 text-gray-400 hover:text-cyan-400 transition-colors flex-shrink-0"
                              title="Edit description"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {!splitLayout && locationImagePanel}

                      <div className="pt-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium text-slate-300">{t('versions')}</p>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDirectedLocation(loc)
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded text-cyan-300 hover:bg-cyan-500/10"
                            >
                              {t('addDirectedVersion')}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleUpdateOneLocation(loc)
                              }}
                              disabled={
                                analyzingLocationId === loc.id ||
                                scenes.length === 0 ||
                                !hasImage
                              }
                              className="text-[10px] px-1.5 py-0.5 rounded text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50"
                            >
                              {analyzingLocationId === loc.id ? t('analyzing') : t('update')}
                            </button>
                          </div>
                        </div>
                        {(loc.versions || []).length === 0 ? (
                          <p className="text-[10px] text-slate-500">{t('noVersions')}</p>
                        ) : (
                          <div className="space-y-2">
                            {(loc.versions || []).map((version) => {
                              const versionGenerating =
                                generatingLocationId === locationVersionGeneratingId(loc.id, version.id)
                              const versionUploading =
                                uploadingForId === locationVersionGeneratingId(loc.id, version.id)
                              const versionHasImage = isDisplayableImageUrl(version.imageUrl)
                              const versionUploadId = `location-version-upload-${version.id}`
                              const openVersionPromptBuilder = () =>
                                setPromptBuilderOpenFor({ locationId: loc.id, versionId: version.id })
                              const quickGenerateVersion = () => {
                                if (!isDisplayableImageUrl(loc.imageUrl)) {
                                  toast.info(t('baseImageRequired'))
                                  return
                                }
                                onGenerateLocationVersion?.(loc, version)
                              }
                              return (
                                <div
                                  key={version.id}
                                  className="rounded border border-slate-700 bg-slate-900/40 p-2 space-y-1.5"
                                >
                                  <div className="flex items-start gap-1">
                                    <p className="text-[11px] font-medium text-white truncate flex-1">
                                      {version.name}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openVersionPreview(loc.id, version.id)
                                      }}
                                      className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-700 flex-shrink-0"
                                      title={t('expandVersion')}
                                    >
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-slate-400 line-clamp-2">
                                    {version.stateNotes}
                                  </p>
                                  {version.appliesFrom && (
                                    <p className="text-[10px] text-slate-500">
                                      {t('appliesFrom', {
                                        scene: version.appliesFrom.sceneNumber,
                                        beat: version.appliesFrom.beatIndex + 1,
                                      })}
                                    </p>
                                  )}
                                  {version.needsImageRegen && (
                                    <span className="text-[9px] text-amber-300">{t('needsRegen')}</span>
                                  )}
                                  <input
                                    id={versionUploadId}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleVersionFileUpload(loc.id, version.id, e)}
                                  />
                                  {/* version overlay: Prompt Builder + Edit */}
                                  {versionHasImage ? (
                                    <div className="relative rounded-md overflow-hidden bg-slate-800 group aspect-video">
                                      <img
                                        src={version.imageUrl}
                                        alt={version.name}
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openVersionPreview(loc.id, version.id)
                                        }}
                                        className="absolute top-2 right-2 z-20 p-1.5 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                        title={t('expandVersion')}
                                      >
                                        <Maximize2 className="w-4 h-4" />
                                      </button>
                                      <LocationStillOverlay
                                        isGenerating={versionGenerating}
                                        isUploading={versionUploading}
                                        showQuickGenerate={!!onGenerateLocationVersion}
                                        showEdit={!!onEditLocationImage && !!version.imageUrl}
                                        onQuickGenerate={quickGenerateVersion}
                                        onPromptBuilder={openVersionPromptBuilder}
                                        onDirector={() =>
                                          setDirectorTarget({ locationId: loc.id, versionId: version.id })
                                        }
                                        onEdit={() =>
                                          onEditLocationImage?.(loc.id, version.imageUrl!, version.id)
                                        }
                                        onUpload={() =>
                                          document.getElementById(versionUploadId)?.click()
                                        }
                                      />
                                    </div>
                                  ) : versionGenerating || versionUploading ? (
                                    <div className="relative rounded-md overflow-hidden bg-slate-800 aspect-video flex flex-col items-center justify-center gap-2">
                                      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                                      <span className="text-xs text-gray-400">
                                        {versionUploading ? 'Uploading...' : 'Generating...'}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="relative rounded-md overflow-hidden bg-slate-800 group aspect-video">
                                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 pointer-events-none">
                                        <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                                        <span className="text-xs">{t('noVersionImage')}</span>
                                      </div>
                                      <LocationStillOverlay
                                        alwaysVisible
                                        isGenerating={versionGenerating}
                                        isUploading={versionUploading}
                                        showQuickGenerate={!!onGenerateLocationVersion}
                                        showEdit={false}
                                        onQuickGenerate={quickGenerateVersion}
                                        onPromptBuilder={openVersionPromptBuilder}
                                        onDirector={() =>
                                          setDirectorTarget({ locationId: loc.id, versionId: version.id })
                                        }
                                        onUpload={() =>
                                          document.getElementById(versionUploadId)?.click()
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onRemoveLocation(loc.id)
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  )

                  return (
                    <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700">
                      {splitLayout ? (
                        <ReferenceSplitPane
                          image={locationImagePanel}
                          controls={locationDetailsPanel}
                        />
                      ) : (
                        locationDetailsPanel
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}

      {/* Location Prompt Builder Dialog */}
      {promptBuilderOpenFor && (
        <LocationPromptBuilder
          open={!!promptBuilderOpenFor}
          onClose={() => setPromptBuilderOpenFor(null)}
          location={mergedLocations.find((l) => l.id === promptBuilderOpenFor.locationId) || null}
          version={
            promptBuilderOpenFor.versionId
              ? mergedLocations
                  .find((l) => l.id === promptBuilderOpenFor.locationId)
                  ?.versions?.find((v) => v.id === promptBuilderOpenFor.versionId) || null
              : null
          }
          catalogPropNames={catalogPropNames}
          mountedFixtures={
            promptBuilderOpenFor
              ? mountedFixturesForLocation(
                  mergedLocations.find((l) => l.id === promptBuilderOpenFor.locationId) || {
                    location: '',
                  },
                  scenes
                )
              : []
          }
          isGenerating={
            generatingLocationId ===
            (promptBuilderOpenFor.versionId
              ? locationVersionGeneratingId(
                  promptBuilderOpenFor.locationId,
                  promptBuilderOpenFor.versionId
                )
              : promptBuilderOpenFor.locationId)
          }
          screenplayContext={screenplayContext}
          onGenerateImage={(payload) => {
            setPromptBuilderOpenFor(null)
            if (onGenerateLocationImageWithPrompt) {
              onGenerateLocationImageWithPrompt(payload)
            } else if (onGenerateLocationImage) {
              onGenerateLocationImage(payload.location)
            }
          }}
        />
      )}

      {directorTarget && (() => {
        const location =
          mergedLocations.find((l) => l.id === directorTarget.locationId) || null
        const version = directorTarget.versionId
          ? location?.versions?.find((v) => v.id === directorTarget.versionId) || null
          : null
        if (!location) return null
        const generatingId = version
          ? locationVersionGeneratingId(location.id, version.id)
          : location.id
        return (
          <ReferenceStillDirectorDialog
            open
            onOpenChange={(next) => {
              if (!next) setDirectorTarget(null)
            }}
            projectId={projectId}
            kind={version ? 'locationVersion' : 'location'}
            label={version ? `${location.location} — ${version.name}` : location.location}
            currentPrompt={
              version
                ? seedLocationVersionDirectorPrompt({
                    storedPrompt: version.generationPrompt,
                    locationName: location.location,
                    stateNotes: version.stateNotes,
                    intExt: location.intExt,
                    timeOfDay: location.timeOfDay,
                    description: locationDescriptionWithMountedFixtures(location, scenes),
                    catalogPropNames,
                  })
                : seedLocationDirectorPrompt({
                    storedPrompt: location.generationPrompt,
                    locationName: location.location,
                    intExt: location.intExt,
                    timeOfDay: location.timeOfDay,
                    description: locationDescriptionWithMountedFixtures(location, scenes),
                  })
            }
            context={{
              locationName: location.location,
              intExt: location.intExt,
              timeOfDay: location.timeOfDay,
              description: locationDescriptionWithMountedFixtures(location, scenes),
              stateNotes: version?.stateNotes,
            }}
            isGenerating={generatingLocationId === generatingId}
            onSave={async ({ prompt, generate }) => {
              const next = mergedLocations.map((ref) => {
                if (ref.id !== location.id) return ref
                if (version) {
                  return patchLocationVersion(ref, version.id, { generationPrompt: prompt })
                }
                return { ...ref, generationPrompt: prompt }
              })
              await onUpdateLocations(next)
              if (!generate) return
              const patched = next.find((ref) => ref.id === location.id)
              if (!patched) return
              if (onGenerateLocationImageWithPrompt) {
                onGenerateLocationImageWithPrompt({
                  location: patched,
                  locationPrompt: prompt,
                  versionId: version?.id,
                })
              } else if (version) {
                onGenerateLocationVersion?.(patched, {
                  ...version,
                  generationPrompt: prompt,
                })
              } else {
                onGenerateLocationImage?.(patched)
              }
            }}
          />
        )
      })()}

      {/* Expanded Image Dialog */}
      <Dialog open={!!expandedImageUrl} onOpenChange={() => { setExpandedImageUrl(null); setExpandedImageName('') }}>
        <DialogContent className={`${splitLayout ? 'max-w-[50vw]' : 'max-w-[90vw]'} max-h-[90vh] p-0 bg-black border-none`}>
          <DialogHeader className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10">
            <DialogTitle className="text-white">{expandedImageName}</DialogTitle>
            <DialogDescription className="text-gray-300">
              Location reference image
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center w-full h-full p-4">
            {expandedImageUrl && (
              <img
                src={expandedImageUrl}
                alt={expandedImageName}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!expandedVersion && !!expandedVersionLocation}
        onOpenChange={(open) => {
          if (!open) setExpandedVersionTarget(null)
        }}
      >
        <DialogContent
          className={`${splitLayout ? 'max-w-[50vw]' : 'max-w-[90vw]'} max-h-[90vh] overflow-y-auto`}
        >
          {expandedVersion && expandedVersionLocation && (() => {
            const versionGenerating =
              generatingLocationId ===
              locationVersionGeneratingId(expandedVersionLocation.id, expandedVersion.id)
            const versionUploading =
              uploadingForId ===
              locationVersionGeneratingId(expandedVersionLocation.id, expandedVersion.id)
            const versionHasImage = isDisplayableImageUrl(expandedVersion.imageUrl)
            const dialogUploadId = `location-version-preview-upload-${expandedVersion.id}`
            const openVersionPromptBuilder = () =>
              setPromptBuilderOpenFor({
                locationId: expandedVersionLocation.id,
                versionId: expandedVersion.id,
              })
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-cyan-500" />
                    <span className="truncate">{expandedVersion.name}</span>
                    {expandedVersion.needsImageRegen && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">
                        {t('needsRegen')}
                      </span>
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {t('versionDetails', { location: expandedVersionLocation.location })}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col lg:flex-row gap-4 py-4 items-start">
                  <div className="relative flex-1 min-w-0 w-full group rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {versionHasImage ? (
                      <img
                        src={expandedVersion.imageUrl}
                        alt={expandedVersion.name}
                        className="w-full max-h-[75vh] object-contain"
                      />
                    ) : (
                      <div className="w-full min-h-[40vh] max-h-[75vh] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs">{t('noVersionImage')}</span>
                      </div>
                    )}
                    {versionGenerating && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
                        <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
                        <span className="text-xs text-white">{t('generating')}</span>
                      </div>
                    )}
                    {!versionGenerating && (
                      <LocationStillOverlay
                        alwaysVisible={!versionHasImage}
                        isGenerating={versionGenerating}
                        isUploading={versionUploading}
                        showQuickGenerate={!!onGenerateLocationVersion}
                        showEdit={!!onEditLocationImage && versionHasImage}
                        onQuickGenerate={() =>
                          handleGenerateVersionFromPreview(
                            expandedVersionLocation,
                            expandedVersion
                          )
                        }
                        onPromptBuilder={openVersionPromptBuilder}
                        onDirector={() =>
                          setDirectorTarget({
                            locationId: expandedVersionLocation.id,
                            versionId: expandedVersion.id,
                          })
                        }
                        onEdit={() =>
                          onEditLocationImage?.(
                            expandedVersionLocation.id,
                            expandedVersion.imageUrl!,
                            expandedVersion.id
                          )
                        }
                        onUpload={() => document.getElementById(dialogUploadId)?.click()}
                      />
                    )}
                  </div>

                  <div className="space-y-4 min-w-0 lg:w-80 flex-shrink-0 overflow-y-auto max-h-[75vh]">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('stateNotes')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 whitespace-pre-wrap">
                        {expandedVersion.stateNotes || '—'}
                      </p>
                    </div>

                    {expandedVersion.appliesFrom && (
                      <p className="text-xs text-gray-500">
                        {t('appliesFrom', {
                          scene: expandedVersion.appliesFrom.sceneNumber,
                          beat: expandedVersion.appliesFrom.beatIndex + 1,
                        })}
                      </p>
                    )}

                    {expandedVersion.reason && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          {t('analysis')}
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 italic">
                          {expandedVersion.reason}
                        </p>
                      </div>
                    )}

                    {expandedVersion.sceneNumbers && expandedVersion.sceneNumbers.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('usedInScenes')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {expandedVersion.sceneNumbers.map((num) => (
                            <span
                              key={num}
                              className="text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded"
                            >
                              {t('sceneChip', { number: num })}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="flex flex-wrap gap-2">
                  <input
                    id={dialogUploadId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleVersionFileUpload(expandedVersionLocation.id, expandedVersion.id, e)
                    }
                  />
                  <Button variant="outline" onClick={() => setExpandedVersionTarget(null)}>
                    {t('close')}
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
      <DirectedLocationVersionDialog
        open={!!directedLocation}
        onOpenChange={(open) => {
          if (!open) setDirectedLocation(null)
        }}
        locations={
          directedLocation
            ? [{ id: directedLocation.id, name: directedLocation.location }]
            : []
        }
        defaultLocationId={directedLocation?.id}
        beats={directedBeats}
        isSubmitting={directedSubmitting}
        onConfirm={handleDirectedVersionConfirm}
      />
    </div>
    </TooltipProvider>
  )
}
