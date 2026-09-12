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
 */

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Image as ImageIcon,
  Library,
  Loader,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Shirt,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ReferenceLibraryTab } from '@/components/vision/ReferenceLibraryDialog'
import {
  estimateReferenceExpress,
  formatReferenceExpressEstimate,
} from '@/lib/vision/referenceExpress/estimate'
import type { ReferenceExpressKind } from '@/lib/vision/referenceExpress/types'
import {
  requirementKey,
  type SceneReferenceOverrides,
  type SceneReferenceRequirement,
  type SceneReferenceRequirementKind,
  type SceneReferenceRequirementSource,
  type SceneRequirementCharacter,
  type SceneRequirementLocation,
  type SceneRequirementObject,
} from '@/lib/vision/sceneReferenceRequirements'

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
  onExpressReferences?: (options?: { itemKeys?: string[] }) => void | Promise<void>
  isExpressRunning?: boolean
  onOpenReferenceLibrary?: (tab?: ReferenceLibraryTab) => void
  /** The full library, so a reference the matchers missed can be added by hand. */
  characters?: SceneRequirementCharacter[]
  locationReferences?: SceneRequirementLocation[]
  objectReferences?: SceneRequirementObject[]
}

type GroupConfig = {
  kind: SceneReferenceRequirementKind
  label: string
  Icon: typeof Users
  libraryTab: ReferenceLibraryTab
}

const GROUPS: GroupConfig[] = [
  { kind: 'cast', label: 'Cast', Icon: Users, libraryTab: 'cast' },
  { kind: 'wardrobe', label: 'Wardrobe', Icon: Shirt, libraryTab: 'cast' },
  { kind: 'location', label: 'Locations', Icon: MapPin, libraryTab: 'locations' },
  { kind: 'prop', label: 'Props', Icon: Package, libraryTab: 'object' },
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

/**
 * Reference Express draws cast, locations and props. Wardrobe images come from
 * the character's own wardrobe pass, so they are listed here but not queued.
 */
const EXPRESS_KIND: Partial<Record<SceneReferenceRequirementKind, ReferenceExpressKind>> = {
  cast: 'cast',
  location: 'location',
  prop: 'prop',
}

const hasImage = (url?: string): boolean => Boolean(url && url.trim())

function formatSceneList(sceneNumbers: number[]): string {
  if (sceneNumbers.length <= 3) return sceneNumbers.join(', ')
  return `${sceneNumbers.slice(0, 3).join(', ')} +${sceneNumbers.length - 3} more`
}

function ReferenceThumb({ requirement }: { requirement: SceneReferenceRequirement }) {
  if (hasImage(requirement.imageUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={requirement.imageUrl}
        alt={requirement.name}
        className="w-10 h-10 rounded object-cover border border-cyan-200/60 dark:border-cyan-800/60 shrink-0"
      />
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
}: SceneReferencesPanelProps) {
  const [addOpen, setAddOpen] = useState(false)

  const missing = useMemo(
    () => requirements.filter((requirement) => !hasImage(requirement.imageUrl)),
    [requirements]
  )

  /** Only the kinds Express can draw are quotable; wardrobe is called out separately. */
  const expressable = useMemo(
    () =>
      missing
        .map((requirement) => EXPRESS_KIND[requirement.kind])
        .filter((kind): kind is ReferenceExpressKind => !!kind)
        .map((kind) => ({ kind })),
    [missing]
  )
  const estimate = useMemo(() => estimateReferenceExpress(expressable), [expressable])
  const missingWardrobeCount = missing.length - expressable.length

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

    for (const ref of locationReferences) {
      if (!ref?.id || required.has(`location:${ref.id}`)) continue
      rows.push({
        key: `location:${ref.id}`,
        kind: 'location',
        name: ref.location?.trim() || ref.locationDisplay?.trim() || 'Location',
      })
    }

    for (const ref of objectReferences) {
      if (!ref?.id || required.has(`prop:${ref.id}`)) continue
      rows.push({ key: `prop:${ref.id}`, kind: 'prop', name: ref.name?.trim() || 'Prop' })
    }

    return rows
  }, [requirements, characters, locationReferences, objectReferences])

  const drawnCount = requirements.length - missing.length
  const busy = isExpressRunning

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
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {missing.length > 0 && onExpressReferences && expressable.length > 0 && (
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
              Express References
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
          {GROUPS.map(({ kind, label, Icon, libraryTab }) => {
            const rows = requirements.filter((requirement) => requirement.kind === kind)
            if (rows.length === 0) return null
            const groupMissing = rows.filter((row) => !hasImage(row.imageUrl)).length

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
                    const key = requirementKey(requirement)
                    const drawn = hasImage(requirement.imageUrl)
                    const canExpress = !!EXPRESS_KIND[requirement.kind]

                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2.5 p-2 rounded-md bg-white/70 dark:bg-gray-900/40 border border-cyan-200/70 dark:border-cyan-800/60"
                      >
                        <ReferenceThumb requirement={requirement} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                              {requirement.name}
                            </span>
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
                            {drawn ? 'Reference ready' : 'Not drawn yet'}
                            {requirement.alsoUsedInScenes?.length
                              ? ` · also needed by ${requirement.alsoUsedInScenes.length === 1 ? 'scene' : 'scenes'} ${formatSceneList(requirement.alsoUsedInScenes)}`
                              : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!drawn && canExpress && onExpressReferences && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void onExpressReferences({ itemKeys: [key] })
                              }}
                              disabled={busy}
                              className="text-[11px] px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded disabled:opacity-50"
                              title={`Draw just this reference (${formatReferenceExpressEstimate(estimateReferenceExpress([{ kind: EXPRESS_KIND[requirement.kind]! }]))})`}
                            >
                              Draw
                            </button>
                          )}
                          {!drawn && !canExpress && onOpenReferenceLibrary && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenReferenceLibrary(libraryTab)
                              }}
                              className="text-[11px] px-2 py-1 rounded border border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-900/40"
                              title="Wardrobe images are drawn with the character in the Reference Library"
                            >
                              Draw in Library
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
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {missingWardrobeCount > 0 && (
        <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-2.5 flex items-start gap-1.5">
          <Shirt className="w-3 h-3 mt-0.5 shrink-0" />
          {missingWardrobeCount} wardrobe{missingWardrobeCount === 1 ? '' : 's'} still to draw.
          Express References covers cast, locations and props; wardrobe is drawn with its character
          in the Reference Library.
        </p>
      )}

      {onOverridesChange && (removed.size > 0 || addable.length > 0) && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {addable.length > 0 && (
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
                {GROUPS.map(({ kind, label }) => {
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
      )}
    </div>
  )
}
