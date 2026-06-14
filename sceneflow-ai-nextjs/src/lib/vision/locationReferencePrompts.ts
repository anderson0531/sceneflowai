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

/** Shorter hint for intelligence user prompts. */
export const LOCATION_TURNAROUND_USER_PROMPT_HINT =
  'single extreme-wide establishing shot — match layout and palette'

export function buildLocationReferenceLabel(
  locationName: string,
  referenceIndex: number
): string {
  return `Location reference ${referenceIndex}: ${locationName} (extreme-wide establishing shot)`
}

export function buildLocationReferencePromptLine(
  locationName: string,
  referenceIndex: number
): string {
  return (
    `- Reference image ${referenceIndex}: LOCATION REFERENCE for "${locationName}"\n` +
    `  ${LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION}`
  )
}
