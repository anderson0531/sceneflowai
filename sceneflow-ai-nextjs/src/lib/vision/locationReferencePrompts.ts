/**
 * Prompts and constants for location turnaround reference sheets used in Vision Production.
 */

export const LOCATION_REFERENCE_ASPECT_RATIO = '16:9' as const

/** Generation: vertical two-panel sheet with opposite wide views (not side-by-side). */
export const LOCATION_TURNAROUND_GENERATION_INSTRUCTION =
  'Vertical two-panel location turnaround reference sheet stacked top and bottom, NOT side-by-side. ' +
  'TOP panel: wide cinematic establishing shot of the location from one angle. ' +
  'BOTTOM panel: wide cinematic establishing shot of the same location from the opposite facing angle (180-degree reverse view). ' +
  'Both panels show the identical set with consistent furniture, layout, and color palette. ' +
  'Empty scene with NO people or characters present.'

/** Downstream beat/frame generation: how to consume a location turnaround sheet. */
export const LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION =
  'LOCATION REFERENCE: The reference image shows two opposite wide views of the same location ' +
  '(stacked top/bottom, or legacy side-by-side). Use it as a layout aid only — extract architectural layout, ' +
  'furniture placement, and color palette. Choose the angle that best matches beat framing; infer unseen geometry ' +
  'consistently from both views. Render ONE unified full-frame cinematic shot — NEVER reproduce the two-panel sheet, ' +
  'split-screen, diptych, collage, or multi-panel reference layout in the output.'

/** Shorter hint for intelligence user prompts. */
export const LOCATION_TURNAROUND_USER_PROMPT_HINT =
  'top/bottom opposite wide views of same set (or legacy side-by-side) — consumption is single cinematic frame only'
