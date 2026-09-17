'use client'

/**
 * Every reference this scene needs, and one button to draw the missing ones.
 *
 * The Reference Library is project-wide, which made it a detour: to shoot one
 * scene you first sat through the whole library. This panel asks the narrower
 * question — what does *this* scene need — and answers it where the work
 * actually happens, on the scene card, next to Beats and Frames.
 *
 * Two things make it more than a filtered list. The estimate is shown before
 * the click, so a just-in-time run is a decision rather than an open-ended
 * wait. And each row names the other scenes that need the same reference, so
 * drawing a character here reads as amortised investment instead of deferred
 * work — nothing a traditional editor has a model for.
 *
 * Cast wardrobe looks nest under the identity still; location set versions
 * nest under the base establishing shot. Gen/Regen is a quick default draw —
 * customise in the Reference Library.
 */

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlertTriangle,
  Image as ImageIcon,
  Library,
  Loader,
  MapPin,
  Maximize2,
  Package,
  Plus,
  RotateCcw,
  Shirt,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ReferenceLibraryTab } from '@/components/vision/ReferenceLibraryDialog'
import {
  estimateReferenceExpress,
  formatReferenceExpressEstimate,
} from '@/lib/vision/referenceExpress/estimate'
import {
  isLocationVersionRequirementId,
  locationVersionRequirementId,
  parseLocationVersionRequirementId,
} from '@/lib/vision/locationVersionResolve'
import {
  estimateItemForRequirement,
  expressKindForRequirement,
  requirementKey,
  type SceneReferenceBeatUse,
  type SceneReferenceOverrides,
  type SceneReferenceRequirement,
  type SceneReferenceRequirementKind,
  type SceneReferenceRequirementSource,
  type SceneRequirementCharacter,
  type SceneRequirementLocation,
  type SceneRequirementObject,
} from '@/lib/vision/sceneReferenceRequirements'
import {
  DirectedLocationVersionDialog,
  type DirectedLocationBeatOption,
} from './DirectedLocationVersionDialog'
import type { DirectedLocationVersionInput } from '@/lib/vision/locationScriptSync'

export interface SceneReferencesPanelProps {
  sceneNumber: number
  /** Already resolved by the caller, which owns the matchers and the overrides. */
  requirements: SceneReferenceRequirement[]
  overrides?: SceneReferenceOverrides | null
  onOverridesChange?: (next: SceneReferenceOverrides) => void
  /**
   * Run Reference Express over this scene. `itemKeys` narrows it to single
   * rows, so a one-off gap does not queue the whole scene again.
   */
  onExpressReferences?: (options?: { itemKeys?: string[] }) => void | Promise<unknown>
  isExpressRunning?: boolean
  onOpenReferenceLibrary?: (tab?: ReferenceLibraryTab) => void
  /** The full library, so a reference the matchers missed can be added by hand. */
  characters?: SceneRequirementCharacter[]
  locationReferences?: SceneRequirementLocation[]
  objectReferences?: SceneRequirementObject[]
  beats?: DirectedLocationBeatOption[]
  onAddDirectedLocationVersion?: (
    payload: DirectedLocationVersionInput & { locationId: string }
  ) => void | Promise<void>
}

type GroupConfig = {
  kind: SceneReferenceRequirementKind
  label: string
  Icon: typeof Users
}

const DISPLAY_GROUPS: GroupConfig[] = [
  { kind: 'cast', label: 'Cast', Icon: Users },
  { kind: 'location', label: 'Locations', Icon: MapPin },
  { kind: 'prop', label: 'Props', Icon: Package },
]

const ADD_GROUPS: GroupConfig[] = [
  { kind: 'cast', label: 'Cast', Icon: Users },
  { kind: 'wardrobe', label: 'Wardrobe', Icon: Shirt },
  { kind: 'location', label: 'Locations', Icon: MapPin },
  { kind: 'prop', label: 'Props', Icon: Package },
]

const SOURCE_LABEL: Record<SceneReferenceRequirementSource, string> = {
  'beat-plan': 'planned',
  'scene-assigned': 'assigned',
  detected: 'detected',
}

const SOURCE_HINT: Record<SceneReferenceRequirementSource, string> = {
  'beat-plan': "Locked in when this scene's beats were planned — this is what the frames will use.",
  'scene-assigned': 'Assigned to this scene in the Reference Library.',
  detected: 'Matched from the script. Worth a glance — remove it if this scene does not use it.',
}

const hasImage = (url?: string): boolean => Boolean(url && url.trim())

function formatSceneList(sceneNumbers: number[]): string {
  if (sceneNumbers.length <= 3) return sceneNumbers.join(', ')
  return `${sceneNumbers.slice(0, 3).join(', ')} +${sceneNumbers.length - 3} more`
}

function formatBeatList(beats: SceneReferenceBeatUse[]): string {
  const numbers = beats.map((beat) => beat.beatNumber)
  if (numbers.length === 1) return `Beat ${numbers[0]}`
  return `Beats ${numbers.join(', ')}`
}

function childLabel(requirement: SceneReferenceRequirement, parentName: string): string {
  const prefix = `${parentName} — `
  return requirement.name.startsWith(prefix)
    ? requirement.name.slice(prefix.length)
    : requirement.name
}

function isLocationBase(requirement: SceneReferenceRequirement): boolean {
  return requirement.kind === 'location' && !isLocationVersionRequirementId(requirement.id)
}

function locationParentId(requirement: SceneReferenceRequirement): string | null {
  if (requirement.kind !== 'location') return null
  return parseLocationVersionRequirementId(requirement.id)?.locationId ?? null
}

export function SceneReferencesPanel({
  sceneNumber,
  requirements,
  overrides,
  onOverridesChange,
  onExpressReferences,
  isExpressRunning = false,
  onOpenReferenceLibrary,
  characters = [],
  locationReferences = [],
  objectReferences = [],
  beats = [],
  onAddDirectedLocationVersion,
}: SceneReferencesPanelProps) {
  const tLocation = useTranslations('production.direction.locationLibrary')
  const [addOpen, setAddOpen] = useState(false)
  const [expanded, setExpanded] = useState<{ url: string; name: string } | null>(null)
  const [directedOpen, setDirectedOpen] = useState(false)
  const [directedSubmitting, setDirectedSubmitting] = useState(false)

  const pending = useMemo(
    () =>
      requirements.filter(
        (requirement) => !hasImage(requirement.imageUrl) || requirement.stale === true
      ),
    [requirements]
  )

  const expressable = useMemo(
    () =>
      pending
        .map((requirement) => estimateItemForRequirement(requirement))
        .filter((item): item is NonNullable<typeof item> => !!item),
    [pending]
  )
  const estimate = useMemo(() => estimateReferenceExpress(expressable), [expressable])

  const removed = useMemo(() => new Set(overrides?.removed ?? []), [overrides?.removed])

  const setOverrides = (mutate: (draft: { added: string[]; removed: string[] }) => void) => {
    if (!onOverridesChange) return
    const draft = {
      added: [...(overrides?.added ?? [])],
      removed: [...(overrides?.removed ?? [])],
    }
    mutate(draft)
    onOverridesChange({
      added: draft.added.length ? draft.added : undefined,
      removed: draft.removed.length ? draft.removed : undefined,
    })
  }

  const removeRequirement = (key: string) =>
    setOverrides((draft) => {
      draft.added = draft.added.filter((entry) => entry !== key)
      if (!draft.removed.includes(key)) draft.removed.push(key)
    })

  const addRequirement = (key: string) =>
    setOverrides((draft) => {
      draft.removed = draft.removed.filter((entry) => entry !== key)
      if (!draft.added.includes(key)) draft.added.push(key)
    })

  const nestedByCast = useMemo(() => {
    const byCast = new Map<string, SceneReferenceRequirement[]>()
    for (const requirement of requirements) {
      if (requirement.kind !== 'wardrobe' || !requirement.characterId) continue
      const list = byCast.get(requirement.characterId) ?? []
      list.push(requirement)
      byCast.set(requirement.characterId, list)
    }
    return byCast
  }, [requirements])

  const nestedByLocation = useMemo(() => {
    const byLocation = new Map<string, SceneReferenceRequirement[]>()
    for (const requirement of requirements) {
      const parentId = locationParentId(requirement)
      if (!parentId) continue
      const list = byLocation.get(parentId) ?? []
      list.push(requirement)
      byLocation.set(parentId, list)
    }
    return byLocation
  }, [requirements])

  const orphanWardrobes = useMemo(() => {
    const castIds = new Set(
      requirements.filter((requirement) => requirement.kind === 'cast').map((requirement) => requirement.id)
    )
    return requirements.filter(
      (requirement) =>
        requirement.kind === 'wardrobe' &&
        (!requirement.characterId || !castIds.has(requirement.characterId))
    )
  }, [requirements])

  const orphanVersions = useMemo(() => {
    const baseIds = new Set(
      requirements.filter(isLocationBase).map((requirement) => requirement.id)
    )
    return requirements.filter((requirement) => {
      const parentId = locationParentId(requirement)
      if (!parentId) return false
      return !baseIds.has(parentId)
    })
  }, [requirements])

  /** Library rows this scene is not asking for, offered as a manual correction. */
  const addable = useMemo(() => {
    const required = new Set(requirements.map(requirementKey))
    const rows: Array<{ key: string; kind: SceneReferenceRequirementKind; name: string }> = []

    const requiredCastIds = new Set(
      requirements.filter((r) => r.kind === 'cast').map((r) => r.id)
    )

    for (const character of characters) {
      if (character?.type === 'narrator' || character?.type === 'description') continue
      const id = String(character?.id ?? character?.name ?? '')
      if (!id) continue
      const name = character?.name?.trim() || id
      if (!required.has(`cast:${id}`)) rows.push({ key: `cast:${id}`, kind: 'cast', name })
      // A wardrobe only makes sense once its wearer is in the scene.
      if (!requiredCastIds.has(id)) continue
      for (const wardrobe of Array.isArray(character.wardrobes) ? character.wardrobes : []) {
        const wardrobeId = typeof wardrobe?.id === 'string' ? wardrobe.id : ''
        if (!wardrobeId || required.has(`wardrobe:${wardrobeId}`)) continue
        const wardrobeName =
          typeof wardrobe.name === 'string' && wardrobe.name.trim() ? wardrobe.name.trim() : 'Wardrobe'
        rows.push({
          key: `wardrobe:${wardrobeId}`,
          kind: 'wardrobe',
          name: `${name} — ${wardrobeName}`,
        })
      }
    }

    const locationIdsOnScene = new Set(
      requirements
        .filter((requirement) => requirement.kind === 'location')
        .map((requirement) => locationParentId(requirement) ?? requirement.id)
    )

    for (const ref of locationReferences) {
      if (!ref?.id) continue
      const locationName = ref.location?.trim() || ref.locationDisplay?.trim() || 'Location'
      if (!required.has(`location:${ref.id}`)) {
        rows.push({
          key: `location:${ref.id}`,
          kind: 'location',
          name: locationName,
        })
      }
      if (!locationIdsOnScene.has(ref.id) && !required.has(`location:${ref.id}`)) continue
      for (const version of Array.isArray(ref.versions) ? ref.versions : []) {
        const versionId = typeof version?.id === 'string' ? version.id : ''
        if (!versionId) continue
        const key = `location:${locationVersionRequirementId(ref.id, versionId)}`
        if (required.has(key)) continue
        const versionName =
          typeof version.name === 'string' && version.name.trim() ? version.name.trim() : 'Set version'
        rows.push({
          key,
          kind: 'location',
          name: `${locationName} — ${versionName}`,
        })
      }
    }

    for (const ref of objectReferences) {
      if (!ref?.id || required.has(`prop:${ref.id}`)) continue
      rows.push({ key: `prop:${ref.id}`, kind: 'prop', name: ref.name?.trim() || 'Prop' })
    }

    return rows
  }, [requirements, characters, locationReferences, objectReferences])

  const directedLocations = useMemo(() => {
    const fromScene = requirements
      .filter(isLocationBase)
      .map((requirement) => {
        const library = locationReferences.find((ref) => ref.id === requirement.id)
        return {
          id: requirement.id,
          name:
            library?.location?.trim() ||
            library?.locationDisplay?.trim() ||
            requirement.name,
        }
      })
    if (fromScene.length > 0) return fromScene
    return locationReferences
      .filter((ref) => ref?.id)
      .map((ref) => ({
        id: ref.id,
        name: ref.location?.trim() || ref.locationDisplay?.trim() || 'Location',
      }))
  }, [requirements, locationReferences])

  const drawnCount = requirements.filter((requirement) => hasImage(requirement.imageUrl)).length
  const busy = isExpressRunning

  const renderRow = (
    requirement: SceneReferenceRequirement,
    options?: { nested?: boolean; displayName?: string; variant?: 'wardrobe' | 'base' | 'version' }
  ) => {
    const key = requirementKey(requirement)
    const drawn = hasImage(requirement.imageUrl)
    const needsDraw = !drawn || requirement.stale === true
    const expressKind = expressKindForRequirement(requirement.kind)
    const displayName = options?.displayName ?? requirement.name
    const genLabel = drawn ? 'Regen' : 'Gen'

    return (
      <div
        key={key}
        className={`flex items-center gap-2.5 p-2 rounded-md bg-white/70 dark:bg-gray-900/40 border border-cyan-200/70 dark:border-cyan-800/60 ${
          options?.nested ? 'ml-6' : ''
        }`}
      >
        <ReferenceThumb
          requirement={requirement}
          displayName={displayName}
          onExpand={
            drawn
              ? () => setExpanded({ url: requirement.imageUrl!.trim(), name: displayName })
              : undefined
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
              {displayName}
            </span>
            {options?.variant && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-800 dark:text-cyan-300">
                {options.variant}
              </span>
            )}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/15 text-gray-600 dark:text-gray-400"
              title={SOURCE_HINT[requirement.source]}
            >
              {SOURCE_LABEL[requirement.source]}
            </span>
            {requirement.stale && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-1"
                title="The script changed after this image was drawn — redraw it to match."
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                outdated
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            {!needsDraw ? 'Reference ready' : drawn ? 'Needs a new still' : 'Not drawn yet'}
            {requirement.usedInBeats?.length ? ` · ${formatBeatList(requirement.usedInBeats)}` : ''}
            {requirement.alsoUsedInScenes?.length
              ? ` · also needed by ${requirement.alsoUsedInScenes.length === 1 ? 'scene' : 'scenes'} ${formatSceneList(requirement.alsoUsedInScenes)}`
              : ''}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {drawn && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded({ url: requirement.imageUrl!.trim(), name: displayName })
              }}
              className="p-1 rounded hover:bg-cyan-200/60 dark:hover:bg-cyan-800/60 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              title="Expand image"
              aria-label={`Expand ${displayName}`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          {expressKind && onExpressReferences && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void onExpressReferences({ itemKeys: [key] })
              }}
              disabled={busy}
              className="text-[11px] px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded disabled:opacity-50"
              title={
                drawn
                  ? `Redraw this reference with the default prompt (${formatReferenceExpressEstimate(estimateReferenceExpress([{ kind: expressKind }]))}). Customise in the Reference Library.`
                  : `Draw just this reference (${formatReferenceExpressEstimate(estimateReferenceExpress([{ kind: expressKind }]))})`
              }
            >
              {genLabel}
            </button>
          )}
          {onOverridesChange && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeRequirement(key)
              }}
              className="p-1 rounded hover:bg-cyan-200/60 dark:hover:bg-cyan-800/60 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              title="This scene does not use it — stop waiting on it"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800"
      aria-label={`References for scene ${sceneNumber}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-800 dark:text-cyan-200">
            <Library className="w-4 h-4" />
            References
            <span className="text-xs font-normal text-gray-600 dark:text-gray-400">
              {drawnCount} of {requirements.length} drawn
            </span>
          </div>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
            What this scene needs, read from its beats and script. Frames wait on these — a
            reference that gets named but has no image is drawn differently in every frame.
            Gen draws a default still; customise looks in the Reference Library.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {pending.length > 0 && onExpressReferences && expressable.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void onExpressReferences()
              }}
              disabled={busy}
              className="text-xs px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded disabled:opacity-50 flex items-center gap-1.5"
              title={`Draw the ${expressable.length} missing reference${expressable.length === 1 ? '' : 's'} this scene needs`}
            >
              {busy ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Scene Ref Agent
              <span className="opacity-80">({formatReferenceExpressEstimate(estimate)})</span>
            </button>
          )}
          {onOpenReferenceLibrary && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenReferenceLibrary()
              }}
              className="text-xs px-2.5 py-1.5 rounded border border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 flex items-center gap-1.5"
              title="Customise references, upload your own, or adjust a description"
            >
              <Library className="w-3 h-3" />
              Reference Library
            </button>
          )}
        </div>
      </div>

      {requirements.length === 0 ? (
        <p className="text-xs text-gray-600 dark:text-gray-400 italic">
          Nothing detected for this scene yet. References sharpen once the scene has beats — until
          then this reads from the heading and action. Add one by hand if you already know.
        </p>
      ) : (
        <div className="space-y-3">
          {DISPLAY_GROUPS.map(({ kind, label, Icon }) => {
            const rows =
              kind === 'cast'
                ? requirements.filter((requirement) => requirement.kind === 'cast')
                : kind === 'location'
                  ? requirements.filter(isLocationBase)
                  : requirements.filter((requirement) => requirement.kind === kind)
            if (rows.length === 0) return null
            const nestedRows =
              kind === 'cast'
                ? rows.flatMap((row) => nestedByCast.get(row.id) ?? [])
                : kind === 'location'
                  ? rows.flatMap((row) => nestedByLocation.get(row.id) ?? [])
                  : []
            const groupMissing = [...rows, ...nestedRows].filter(
              (row) => !hasImage(row.imageUrl) || row.stale === true
            ).length

            return (
              <div key={kind}>
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider text-cyan-700/80 dark:text-cyan-400/80 font-semibold">
                  <Icon className="w-3 h-3" />
                  {label}
                  <span className="font-normal normal-case tracking-normal text-gray-500">
                    {groupMissing > 0 ? `${groupMissing} to draw` : 'ready'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {rows.map((requirement) => {
                    const children =
                      kind === 'cast'
                        ? nestedByCast.get(requirement.id) ?? []
                        : kind === 'location'
                          ? nestedByLocation.get(requirement.id) ?? []
                          : []
                    return (
                      <div key={requirementKey(requirement)} className="space-y-1.5">
                        {renderRow(requirement, {
                          variant: kind === 'location' && children.length > 0 ? 'base' : undefined,
                        })}
                        {children.map((child) =>
                          renderRow(child, {
                            nested: true,
                            displayName: childLabel(child, requirement.name),
                            variant: kind === 'cast' ? 'wardrobe' : 'version',
                          })
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {orphanWardrobes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider text-cyan-700/80 dark:text-cyan-400/80 font-semibold">
                <Shirt className="w-3 h-3" />
                Wardrobe
              </div>
              <div className="space-y-1.5">
                {orphanWardrobes.map((requirement) =>
                  renderRow(requirement, { variant: 'wardrobe' })
                )}
              </div>
            </div>
          )}

          {orphanVersions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider text-cyan-700/80 dark:text-cyan-400/80 font-semibold">
                <MapPin className="w-3 h-3" />
                Location versions
              </div>
              <div className="space-y-1.5">
                {orphanVersions.map((requirement) =>
                  renderRow(requirement, { variant: 'version' })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {(onAddDirectedLocationVersion && directedLocations.length > 0) ||
      (onOverridesChange && (removed.size > 0 || addable.length > 0)) ? (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {onAddDirectedLocationVersion && directedLocations.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setDirectedOpen(true)
              }}
              className="text-[11px] px-2 py-1 rounded border border-dashed border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 flex items-center gap-1"
              title={tLocation('directedVersionHint')}
            >
              <Plus className="w-3 h-3" />
              {tLocation('addDirectedVersion')}
            </button>
          )}
          {onOverridesChange && addable.length > 0 && (
            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] px-2 py-1 rounded border border-dashed border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 flex items-center gap-1"
                  title="The matchers read the script — add anything they missed"
                >
                  <Plus className="w-3 h-3" />
                  Add reference
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-72 p-0 max-h-72 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-[11px] text-gray-500 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                  Anything in the library this scene is not already asking for.
                </p>
                {ADD_GROUPS.map(({ kind, label }) => {
                  const rows = addable.filter((row) => row.kind === kind)
                  if (rows.length === 0) return null
                  return (
                    <div key={kind} className="py-1">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 px-3 py-1">
                        {label}
                      </div>
                      {rows.map((row) => (
                        <button
                          key={row.key}
                          type="button"
                          onClick={() => {
                            addRequirement(row.key)
                            setAddOpen(false)
                          }}
                          className="w-full text-left text-xs px-3 py-1.5 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 truncate"
                        >
                          {row.name}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </PopoverContent>
            </Popover>
          )}

          {removed.size > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOverrides((draft) => {
                  draft.removed = []
                })
              }}
              className="text-[11px] px-2 py-1 rounded text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1"
              title="Put the references you removed back in this scene's list"
            >
              <RotateCcw className="w-3 h-3" />
              Restore {removed.size} removed
            </button>
          )}
        </div>
      ) : null}

      {onAddDirectedLocationVersion && (
        <DirectedLocationVersionDialog
          open={directedOpen}
          onOpenChange={setDirectedOpen}
          locations={directedLocations}
          defaultLocationId={directedLocations[0]?.id}
          beats={beats}
          isSubmitting={directedSubmitting}
          onConfirm={async (payload) => {
            setDirectedSubmitting(true)
            try {
              await onAddDirectedLocationVersion(payload)
              setDirectedOpen(false)
            } finally {
              setDirectedSubmitting(false)
            }
          }}
        />
      )}

      <Dialog open={!!expanded} onOpenChange={(open) => !open && setExpanded(null)}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-black"
          aria-describedby={undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <DialogTitle className="sr-only">{expanded?.name ?? 'Reference'}</DialogTitle>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(null)
            }}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close expanded image"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {expanded && (
            <div className="flex flex-col items-center justify-center w-full min-h-[50vh] p-4 pt-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={expanded.url}
                alt={expanded.name}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
              <p className="mt-3 text-sm text-slate-300 text-center">
                {expanded.name}
                <span className="text-slate-500 ml-2">· Scene {sceneNumber}</span>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReferenceThumb({
  requirement,
  displayName,
  onExpand,
}: {
  requirement: SceneReferenceRequirement
  displayName: string
  onExpand?: () => void
}) {
  if (hasImage(requirement.imageUrl)) {
    return (
      <div className="relative w-10 h-10 shrink-0 group/thumb">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onExpand?.()
          }}
          className="w-10 h-10 rounded overflow-hidden border border-cyan-200/60 dark:border-cyan-800/60 block"
          title="Expand image"
          aria-label={`Expand ${displayName}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={requirement.imageUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        </button>
        {onExpand && (
          <span className="pointer-events-none absolute inset-0 rounded bg-black/0 group-hover/thumb:bg-black/35 flex items-center justify-center">
            <Maximize2 className="w-3.5 h-3.5 text-white opacity-0 group-hover/thumb:opacity-100" />
          </span>
        )}
      </div>
    )
  }
  return (
    <div
      className="w-10 h-10 rounded border border-dashed border-amber-400/60 flex items-center justify-center shrink-0 bg-amber-50/40 dark:bg-amber-900/10"
      title="Not drawn yet"
    >
      <ImageIcon className="w-4 h-4 text-amber-500/70" />
    </div>
  )
}
