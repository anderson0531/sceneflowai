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
  Settings2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { LocationReference, LocationVersion } from '@/types/visionReferences'
import { extractLocation } from '@/lib/script/formatSceneHeading'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { LocationPromptBuilder, LocationPromptPayload } from './LocationPromptBuilder'
import { type LocationVersionSyncDiff } from '@/lib/vision/locationScriptSync'
import {
  applyLocationUpdateFromSyncDiff,
  collectMissingExtractedLocations,
  countLocationAgentItems,
  idsMissingLocationBase,
  locationVersionNeedsGeneration,
  locationsThatGainedBase,
  toLocationReferenceFromExtracted,
} from '@/lib/vision/libraryKindAgents'
import { LibraryKindToolbar } from './LibraryKindToolbar'
import { patchLocationVersion } from '@/lib/vision/locationVersionResolve'
import { runWithConcurrencyLimit } from '@/lib/utils/concurrency'
import type { ReferenceExpressScope } from '@/lib/vision/referenceExpress/types'
import {
  DeferredImageSkeleton,
  isDeferredImageUrl,
  isDisplayableImageUrl,
} from '@/components/vision/DeferredImageSkeleton'
import { ReferenceSplitPane } from './ReferenceSplitPane'
import { isDirectionStale } from '@/lib/utils/contentHash'

// Scene heading regex for INT/EXT extraction
const SCENE_CODE_REGEX = /^(INT\.\/EXT\.|EXT\.\/INT\.|INT\.\/EXT|EXT\.\/INT|INT\. |EXT\. |INT\/EXT|EXT\/INT|INT\.|EXT\.|INT|EXT)\s*(.*)$/i

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
  const matched = scenes.filter((scene, idx) => {
    const sceneNumber = idx + 1
    if (location.sceneNumbers?.includes(sceneNumber)) return true
    const heading = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text
    if (!heading) return false
    return extractLocation(heading) === location.location
  })
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
  /** Callback to open edit modal for existing location image */
  onEditLocationImage?: (locationId: string, imageUrl: string) => void
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
}

/**
 * Extract INT/EXT and time of day from a scene heading
 */
function parseSceneHeadingMeta(heading: string): { intExt?: 'INT' | 'EXT' | 'INT/EXT' | 'EXT/INT'; timeOfDay?: string } {
  const match = heading.trim().toUpperCase().match(SCENE_CODE_REGEX)
  if (!match) return {}

  const codeRaw = match[1]?.toUpperCase().replace(/[\.\s]/g, '') || ''
  const intExt = (['INT', 'EXT', 'INTEXT', 'EXTINT'].includes(codeRaw.replace('/', ''))
    ? codeRaw.replace(/\./g, '').replace('INTEXT', 'INT/EXT').replace('EXTINT', 'EXT/INT') as 'INT' | 'EXT' | 'INT/EXT' | 'EXT/INT'
    : undefined)

  const remainder = match[2]?.trim() || ''
  const parts = remainder.split(/\s+-\s+/)
  let timeOfDay: string | undefined
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1]?.trim()
    if (lastPart) {
      const isModifier = 
        /^(DAY|NIGHT|MORNING|EVENING|SUNSET|SUNRISE|DUSK|DAWN|CONTINUOUS|LATER|SAME|MOMENTS LATER)$/.test(lastPart) ||
        /\bTO\b/.test(lastPart) || // e.g. DAY TO NIGHT
        /LATER$/.test(lastPart) || // e.g. MONTHS LATER, YEARS LATER
        /^(FLASHBACK|DREAM|MONTAGE)/.test(lastPart) || // sequence types
        /^(19|20)\d{2}$/.test(lastPart); // Years like 1999, 2024
      
      if (isModifier) {
        timeOfDay = lastPart
      }
    }
  }

  return { intExt, timeOfDay }
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
}: LocationLibraryProps) {
  const t = useTranslations('production.direction.locationLibrary')
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null)
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null)
  const [descriptionText, setDescriptionText] = useState('')
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null)
  const [expandedImageName, setExpandedImageName] = useState<string>('')
  const [uploadingForId, setUploadingForId] = useState<string | null>(null)
  const [promptBuilderOpenFor, setPromptBuilderOpenFor] = useState<string | null>(null)
  const [analyzingLocationId, setAnalyzingLocationId] = useState<string | null>(null)
  const [isUpdatingLocations, setIsUpdatingLocations] = useState(false)
  const [isLocationAgentRunning, setIsLocationAgentRunning] = useState(false)
  const [expandedVersionTarget, setExpandedVersionTarget] = useState<{
    locationId: string
    versionId: string
  } | null>(null)

  /**
   * Extract unique locations from all scene headings.
   * Deduplicates by normalized location name and tracks scene numbers.
   */
  const extractedLocations = useMemo(() => {
    const locationMap = new Map<string, {
      location: string
      intExt?: 'INT' | 'EXT' | 'INT/EXT' | 'EXT/INT'
      timeOfDay?: string
      headings: string[]
      sceneNumbers: number[]
      description?: string
    }>()

    scenes.forEach((scene, idx) => {
      const headingText = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text
      if (!headingText) return

      const location = extractLocation(headingText)
      if (!location) return

      const existing = locationMap.get(location)
      if (existing) {
        existing.sceneNumbers.push(idx + 1)
        if (!existing.headings.includes(headingText)) {
          existing.headings.push(headingText)
        }
      } else {
        const meta = parseSceneHeadingMeta(headingText)
        // Try to build a description from scene direction
        let description: string | undefined
        if (scene.sceneDirection?.scene?.location) {
          description = scene.sceneDirection.scene.location
          if (scene.sceneDirection.scene.atmosphere) {
            description += `. ${scene.sceneDirection.scene.atmosphere}`
          }
        }

        locationMap.set(location, {
          location,
          intExt: meta.intExt,
          timeOfDay: meta.timeOfDay,
          headings: [headingText],
          sceneNumbers: [idx + 1],
          description
        })
      }
    })

    return Array.from(locationMap.values())
  }, [scenes])

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
    if (!isDisplayableImageUrl(location.imageUrl)) return null
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
        if (!isDisplayableImageUrl(loc.imageUrl)) continue
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

  const generatePendingLocationVersions = async (locations: LocationReference[]) => {
    if (!projectId) return
    const targets: Array<{ location: LocationReference; version: LocationVersion }> = []
    for (const location of locations) {
      for (const version of location.versions || []) {
        if (locationVersionNeedsGeneration(location, version)) {
          targets.push({ location, version })
        }
      }
    }
    if (targets.length === 0) return

    const results = await runWithConcurrencyLimit(targets, 2, async ({ location, version }) => {
      try {
        const response = await fetch('/api/vision/generate-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            locationName: location.location,
            intExt: location.intExt,
            timeOfDay: location.timeOfDay,
            description: location.description,
            baseImageUrl: location.imageUrl,
            stateNotes: version.stateNotes,
            versionId: version.id,
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error || `Failed to generate ${location.location} — ${version.name}`)
        }
        return {
          ok: true as const,
          locationId: location.id,
          versionId: version.id,
          imageUrl: data.imageUrl as string,
          prompt: data.prompt as string | undefined,
        }
      } catch (error) {
        console.error('[Location Agent] version generate:', error)
        return { ok: false as const }
      }
    })

    let next = [...locations]
    let succeeded = 0
    let failed = 0
    for (const result of results) {
      if (!result.ok) {
        failed++
        continue
      }
      next = next.map((loc) =>
        loc.id === result.locationId
          ? patchLocationVersion(loc, result.versionId, {
              imageUrl: result.imageUrl,
              generationPrompt: result.prompt,
              needsImageRegen: false,
            })
          : loc
      )
      succeeded++
    }
    await onUpdateLocations(next)
    if (succeeded > 0) {
      toast.success(`Generated ${succeeded} set version still${succeeded === 1 ? '' : 's'}`)
    }
    if (failed > 0) {
      toast.error(`${failed} set version still${failed === 1 ? '' : 's'} failed to generate`)
    }
  }

  const handleLocationAgent = async () => {
    if (!onExpressGenerateReferences) return
    if (isExpressGeneratingReferences) {
      await onExpressGenerateReferences({ kinds: ['location'] })
      return
    }
    setIsLocationAgentRunning(true)
    try {
      const updated = await handleUpdateLocations()
      if (!updated) return
      // Snapshot *after* extract so newly added heading locations are included.
      const idsMissingBase = idsMissingLocationBase(updated)
      const result = (await onExpressGenerateReferences(
        { kinds: ['location'] },
        { waitUntilDone: true }
      )) as { outcome?: string } | undefined
      if (result && (result.outcome === 'already-running' || result.outcome === 'error')) {
        return
      }
      let latest = getLatestLocations?.() ?? updated
      const newlyBased = locationsThatGainedBase(latest, idsMissingBase)
      if (newlyBased.length > 0) {
        let working = [...latest]
        for (const loc of newlyBased) {
          try {
            const synced = await syncLocationVersions(loc)
            if (!synced) continue
            working = working.map((row) => (row.id === loc.id ? synced.location : row))
          } catch (error) {
            console.error('[Location Agent] version sync after bases:', error)
          }
        }
        await onUpdateLocations(working)
        latest = working
      }
      await generatePendingLocationVersions(latest)
    } finally {
      setIsLocationAgentRunning(false)
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-3">
      {scenes.length > 0 && (
        <LibraryKindToolbar
          updateLabel={t('updateLocations')}
          agentLabel={t('locationAgent', { count: countLocationAgentItems(mergedLocations) })}
          onUpdate={() => void handleUpdateLocations()}
          onAgent={
            onExpressGenerateReferences ? () => void handleLocationAgent() : undefined
          }
          isUpdating={isUpdatingLocations}
          isAgentRunning={isLocationAgentRunning || isExpressGeneratingReferences}
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
                    {/* Image status indicator */}
                    {hasImage ? (
                      <Camera className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-gray-500" />
                    )}
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
                                setPromptBuilderOpenFor(loc.id)
                              }}
                              disabled={isGenerating}
                              className="p-3 bg-amber-600/80 hover:bg-amber-600 rounded-full transition-colors disabled:opacity-50"
                            >
                              <Wand2 className="w-5 h-5 text-white" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Open Prompt Builder</TooltipContent>
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
                                    setPromptBuilderOpenFor(loc.id)
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
                              return (
                                <div
                                  key={version.id}
                                  className="rounded border border-slate-700 bg-slate-900/40 p-2 space-y-1.5"
                                >
                                  <div className="flex items-start gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openVersionPreview(loc.id, version.id)
                                      }}
                                      className="relative w-16 h-10 rounded overflow-hidden bg-slate-800 flex-shrink-0 group/thumb"
                                      title={t('expandVersion')}
                                    >
                                      {versionHasImage ? (
                                        <img
                                          src={version.imageUrl}
                                          alt={version.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <ImageIcon className="w-4 h-4 text-slate-500" />
                                        </div>
                                      )}
                                      <span className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                        <Maximize2 className="w-3.5 h-3.5 text-white" />
                                      </span>
                                    </button>
                                    <div className="min-w-0 flex-1">
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
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <input
                                      id={`location-version-upload-${version.id}`}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleVersionFileUpload(loc.id, version.id, e)}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (!isDisplayableImageUrl(loc.imageUrl)) {
                                          toast.info(t('baseImageRequired'))
                                          return
                                        }
                                        onGenerateLocationVersion?.(loc, version)
                                      }}
                                      disabled={versionGenerating || !onGenerateLocationVersion}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/40 text-indigo-100 hover:bg-indigo-600/70 disabled:opacity-50 flex items-center gap-1"
                                    >
                                      {versionGenerating ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Zap className="w-3 h-3" />
                                      )}
                                      {t('generateFromBase')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        document
                                          .getElementById(`location-version-upload-${version.id}`)
                                          ?.click()
                                      }}
                                      disabled={versionUploading || !onUploadLocationVersionImage}
                                      className="text-[10px] px-1.5 py-0.5 rounded text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 flex items-center gap-1"
                                    >
                                      {versionUploading ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Upload className="w-3 h-3" />
                                      )}
                                      {t('uploadVersion')}
                                    </button>
                                  </div>
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
          location={mergedLocations.find(l => l.id === promptBuilderOpenFor) || null}
          isGenerating={generatingLocationId === promptBuilderOpenFor}
          screenplayContext={screenplayContext}
          onGenerateImage={(payload) => {
            setPromptBuilderOpenFor(null)
            if (onGenerateLocationImageWithPrompt) {
              onGenerateLocationImageWithPrompt(payload)
            } else if (onGenerateLocationImage) {
              // Fallback to legacy handler
              onGenerateLocationImage(payload.location)
            }
          }}
        />
      )}

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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {expandedVersion && expandedVersionLocation && (() => {
            const versionGenerating =
              generatingLocationId ===
              locationVersionGeneratingId(expandedVersionLocation.id, expandedVersion.id)
            const versionUploading =
              uploadingForId ===
              locationVersionGeneratingId(expandedVersionLocation.id, expandedVersion.id)
            const versionHasImage = isDisplayableImageUrl(expandedVersion.imageUrl)
            const dialogUploadId = `location-version-preview-upload-${expandedVersion.id}`
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 items-start">
                  <div className="relative aspect-video rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {versionHasImage ? (
                      <img
                        src={expandedVersion.imageUrl}
                        alt={expandedVersion.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs">{t('noVersionImage')}</span>
                      </div>
                    )}
                    {versionGenerating && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
                        <span className="text-xs text-white">{t('generating')}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 min-w-0 overflow-y-auto max-h-[50vh]">
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
                  <Button
                    onClick={() =>
                      handleGenerateVersionFromPreview(expandedVersionLocation, expandedVersion)
                    }
                    disabled={versionGenerating || !onGenerateLocationVersion}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    {versionGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    {versionHasImage ? t('regenerateFromBase') : t('generateFromBase')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById(dialogUploadId)?.click()}
                    disabled={versionUploading || !onUploadLocationVersionImage}
                  >
                    {versionUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {t('uploadVersion')}
                  </Button>
                  <Button variant="outline" onClick={() => setExpandedVersionTarget(null)}>
                    {t('close')}
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  )
}
