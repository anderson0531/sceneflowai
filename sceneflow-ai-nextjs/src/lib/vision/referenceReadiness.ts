/**
 * Is the Reference Library complete enough to generate frames from?
 *
 * A reference row with no generated image is worse than no row at all. The
 * planner is told the catalog "has reference images", so it names the prop or
 * the location; nothing is attached because there is nothing to attach; and
 * the image model answers the missing appearance by inventing one — a
 * different one in every frame that names it. Generating frames before the
 * library is drawn is therefore how a production ends up with a prop that
 * changes shape from beat to beat.
 *
 * Pure and client-safe: the same counts drive the Reference Library's batch
 * generate button, the client-side generate gates, and the server-side checks.
 */

import type { SceneReferenceRequirement } from '@/lib/vision/sceneReferenceRequirements'

export type ReferenceReadinessCharacter = {
  name?: string
  type?: string
  /** Vision characters use `referenceImage`; some callers pass `referenceImageUrl`. */
  referenceImage?: string
  referenceImageUrl?: string
}

export type ReferenceReadinessLocation = {
  location?: string
  locationDisplay?: string
  name?: string
  imageUrl?: string
}

export type ReferenceReadinessObject = {
  name?: string
  imageUrl?: string
}

export type ReferenceReadinessInput = {
  characters?: ReferenceReadinessCharacter[] | null
  locationReferences?: ReferenceReadinessLocation[] | null
  objectReferences?: ReferenceReadinessObject[] | null
}

export type ReferenceReadiness = {
  ready: boolean
  /** Display names, for telling the user what to go and generate. */
  missingCast: string[]
  missingLocations: string[]
  missingObjects: string[]
  /** Wardrobe is only ever scene-scoped; the project gate leaves this empty. */
  missingWardrobe: string[]
  missingTotal: number
}

const hasImage = (url?: string): boolean => Boolean(url && url.trim())

/** Narrators have no on-screen appearance, so they are never missing one. */
const needsAppearance = (character: ReferenceReadinessCharacter): boolean =>
  character?.type !== 'narrator'

export function resolveReferenceReadiness(
  input: ReferenceReadinessInput
): ReferenceReadiness {
  const missingCast = (input.characters ?? [])
    .filter(
      (character) =>
        needsAppearance(character) &&
        !hasImage(character?.referenceImage) &&
        !hasImage(character?.referenceImageUrl)
    )
    .map((character, index) => character?.name?.trim() || `Character ${index + 1}`)

  const missingLocations = (input.locationReferences ?? [])
    .filter((location) => !hasImage(location?.imageUrl))
    .map(
      (location, index) =>
        location?.location?.trim() ||
        location?.locationDisplay?.trim() ||
        location?.name?.trim() ||
        `Location ${index + 1}`
    )

  const missingObjects = (input.objectReferences ?? [])
    .filter((object) => !hasImage(object?.imageUrl))
    .map((object, index) => object?.name?.trim() || `Object ${index + 1}`)

  const missingTotal = missingCast.length + missingLocations.length + missingObjects.length

  return {
    ready: missingTotal === 0,
    missingCast,
    missingLocations,
    missingObjects,
    missingWardrobe: [],
    missingTotal,
  }
}

/**
 * The same question asked of one scene: are the references *this* scene needs
 * drawn? A gate's scope should equal its run's scope, so a scene-level action
 * waits only on the scene's own requirements — but on the identical rule, so a
 * reference that clears one gate clears the other.
 */
export function resolveSceneReferenceReadiness(
  requirements: SceneReferenceRequirement[]
): ReferenceReadiness {
  const undrawn = requirements.filter((requirement) => !hasImage(requirement.imageUrl))
  const namesOf = (kind: SceneReferenceRequirement['kind']): string[] =>
    undrawn.filter((requirement) => requirement.kind === kind).map((requirement) => requirement.name)

  const missingCast = namesOf('cast')
  const missingWardrobe = namesOf('wardrobe')
  const missingLocations = namesOf('location')
  const missingObjects = namesOf('prop')

  return {
    ready: undrawn.length === 0,
    missingCast,
    missingLocations,
    missingObjects,
    missingWardrobe,
    missingTotal: undrawn.length,
  }
}

/** Read the reference slices out of a project's metadata blob. */
export function resolveProjectReferenceReadiness(project: unknown): ReferenceReadiness {
  const metadata = (project as { metadata?: Record<string, any> })?.metadata ?? {}
  const visionPhase: Record<string, any> = metadata.visionPhase ?? {}
  const references: Record<string, any> = visionPhase.references ?? {}
  return resolveReferenceReadiness({
    characters: Array.isArray(visionPhase.characters) ? visionPhase.characters : [],
    locationReferences: Array.isArray(references.locationReferences)
      ? references.locationReferences
      : [],
    objectReferences: Array.isArray(references.objectReferences)
      ? references.objectReferences
      : [],
  })
}

const MAX_NAMED = 3

function namedList(labels: string[]): string {
  if (labels.length <= MAX_NAMED) return labels.join(', ')
  return `${labels.slice(0, MAX_NAMED).join(', ')} +${labels.length - MAX_NAMED} more`
}

/**
 * One sentence naming what is missing, for a tooltip, a toast, or an API error.
 * Empty when the library is complete.
 *
 * `scope` only changes the wording — a scene-level action that says "generate
 * all reference images" sends the user to do far more work than it needs.
 */
export function formatReferenceReadinessMessage(
  readiness: ReferenceReadiness,
  scope: 'project' | 'scene' = 'project'
): string {
  if (readiness.ready) return ''
  const groups: string[] = []
  if (readiness.missingCast.length > 0) {
    groups.push(`${readiness.missingCast.length} cast (${namedList(readiness.missingCast)})`)
  }
  if (readiness.missingWardrobe.length > 0) {
    groups.push(
      `${readiness.missingWardrobe.length} wardrobe (${namedList(readiness.missingWardrobe)})`
    )
  }
  if (readiness.missingLocations.length > 0) {
    groups.push(
      `${readiness.missingLocations.length} location${readiness.missingLocations.length === 1 ? '' : 's'} (${namedList(readiness.missingLocations)})`
    )
  }
  if (readiness.missingObjects.length > 0) {
    groups.push(
      `${readiness.missingObjects.length} object${readiness.missingObjects.length === 1 ? '' : 's'} (${namedList(readiness.missingObjects)})`
    )
  }
  const lead =
    scope === 'scene'
      ? 'This scene needs its references drawn first'
      : 'Generate all reference images first'
  return `${lead} — missing ${groups.join(', ')}. Frames drawn without a reference invent their own appearance.`
}
