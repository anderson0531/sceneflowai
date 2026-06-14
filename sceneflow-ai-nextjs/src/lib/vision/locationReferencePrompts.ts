/**
 * Prompts and constants for location turnaround reference sheets used in Vision Production.
 */

export const LOCATION_REFERENCE_ASPECT_RATIO = '16:9' as const

/** Panel → camera perspective map for 2x2 location turnaround sheets. */
export const LOCATION_TURNAROUND_GRID_LAYOUT =
  'Top-left: Forward-facing shot. Top-right: Left side of the location shot. ' +
  'Bottom-left: Back side of the location shot. Bottom-right: Right side of the location shot.'

/** Generation: 2x2 grid with 4 distinct camera perspectives of the same location. */
export const LOCATION_TURNAROUND_GENERATION_INSTRUCTION =
  '2x2 grid location turnaround reference sheet of the same location with 4 distinct, separate camera perspectives. ' +
  `${LOCATION_TURNAROUND_GRID_LAYOUT} ` +
  'Each panel MUST show a completely different perspective of the room/environment — forward, left side, back, and right side. ' +
  'Do NOT generate 4 identical images of the same wall or same camera angle. ' +
  'Same furniture, layout, and color palette across all 4 panels. Empty scene with NO people or characters present.'

/** Downstream beat/frame generation: how to consume a location turnaround sheet. */
export const LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION =
  'LOCATION REFERENCE: The reference image is a 2x2 turnaround sheet with Forward, Left side, Back side, and Right side views ' +
  `(or legacy layouts). ${LOCATION_TURNAROUND_GRID_LAYOUT} ` +
  'Use it as a layout aid only — extract architectural layout, furniture placement, and color palette. ' +
  'Select EXACTLY ONE panel/angle for the beat background — pick the camera perspective (Forward, Left, Back, or Right) ' +
  'that best matches beat framing and shot type. Use NO MORE THAN ONE angle — never composite, stitch, or show multiple panels. ' +
  'Do NOT use the reference sheet itself as the output background. Render ONE unified full-frame cinematic shot — ' +
  'NEVER reproduce the 2x2 grid, multi-panel sheet, split-screen, diptych, collage, or reference layout in the output. ' +
  'Infer unseen geometry consistently from the chosen single angle only.'

/** Shorter hint for intelligence user prompts. */
export const LOCATION_TURNAROUND_USER_PROMPT_HINT =
  '2x2 Forward/Left/Back/Right turnaround — pick exactly 1 panel; never use the full sheet'

export function buildLocationReferenceLabel(
  locationName: string,
  referenceIndex: number
): string {
  return `Location reference ${referenceIndex}: ${locationName} (2x2 Forward/Left/Back/Right turnaround — use exactly one panel)`
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
