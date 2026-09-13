/**
 * Prompts and constants for location reference images used in Vision Production.
 */

export const LOCATION_REFERENCE_ASPECT_RATIO = '16:9' as const

/** Generation: single extreme-wide establishing shot of the location. */
export const LOCATION_TURNAROUND_GENERATION_INSTRUCTION =
  'Single unified cinematic frame — extreme wide establishing shot of the location. ' +
  'One photograph capturing the full room/environment layout, furniture placement, and architectural features. ' +
  'NOT a 2x2 grid, NOT a multi-panel sheet, NOT split-screen, NOT a collage, NOT multiple camera angles. ' +
  'Empty scene with NO people or characters present.'

/** Downstream beat/frame generation: how to consume a location reference image. */
export const LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION =
  'LOCATION REFERENCE: Single wide-angle establishing shot of the environment. ' +
  'Match architectural layout, furniture placement, color palette, and spatial geometry from this reference. ' +
  'Render ONE unified full-frame cinematic shot for this beat. Match lighting to Global Style Anchor. ' +
  'Do NOT reproduce any multi-panel reference layout, 2x2 grid, split-screen, or collage in the output.'

/** Extra lock when the attached still is a post-change version, not the intact base. */
export const LOCATION_VERSION_CONSUMPTION_SUFFIX =
  'This image is the CURRENT set state. Match damaged, missing, or redressed elements exactly. ' +
  'Do not restore features that are absent from this reference.'

/** Generation: version still from the base establishing shot. */
export const LOCATION_VERSION_GENERATION_INSTRUCTION =
  'Same location as the attached base reference photograph — match architecture, layout, ' +
  'materials, palette, and any furniture that is NOT listed as changed, exactly. ' +
  'Paint the listed set-state changes as the new source of truth. ' +
  'Do not restore pre-change dressing that the state notes say is gone, destroyed, or redressed.'

export interface LocationVersionPromptInput {
  locationName: string
  stateNotes: string
  intExt?: string
  timeOfDay?: string
  description?: string
}

export function buildLocationVersionPrompt(input: LocationVersionPromptInput): string {
  const lines = [
    LOCATION_TURNAROUND_GENERATION_INSTRUCTION,
    LOCATION_VERSION_GENERATION_INSTRUCTION,
    `Location: ${input.locationName}.`,
  ]
  if (input.description?.trim()) {
    lines.push(`Base set description: ${input.description.trim()}.`)
  }
  if (input.intExt) {
    lines.push(`Setting type: ${input.intExt}.`)
  }
  if (input.timeOfDay) {
    lines.push(`Time of day: ${input.timeOfDay}.`)
  }
  lines.push(
    `Current set state (source of truth — bake into this establishing shot): ${input.stateNotes.trim()}.`,
    'Empty scene with NO people or characters present.',
    'Cinematic production design, professional film set quality. High resolution, sharp focus, detailed textures.'
  )
  return lines.join(' ')
}

/** Shorter hint for intelligence user prompts. */
export const LOCATION_TURNAROUND_USER_PROMPT_HINT =
  'single extreme-wide establishing shot — match layout and palette'

export function buildLocationReferenceLabel(
  locationName: string,
  referenceIndex: number
): string {
  return `Location reference ${referenceIndex}: ${locationName} (extreme-wide establishing shot)`
}

/**
 * `label` lets the caller reuse the exact label attached to the image part, so
 * the wrapper line and the image name the reference identically.
 */
export function buildLocationReferencePromptLine(
  locationName: string,
  referenceIndex: number,
  label?: string,
  options?: { currentSetState?: boolean }
): string {
  const heading = label ?? `Reference image ${referenceIndex}: LOCATION REFERENCE for "${locationName}"`
  const suffix = options?.currentSetState ? `\n  ${LOCATION_VERSION_CONSUMPTION_SUFFIX}` : ''
  return `- ${heading}\n  ${LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION}${suffix}`
}
