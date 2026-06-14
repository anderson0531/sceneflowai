/**
 * Prompts and constants for location turnaround reference sheets used in Vision Production.
 */

export const LOCATION_REFERENCE_ASPECT_RATIO = '16:9' as const

/** Generation: 2x2 grid with 4 distinct camera angles of the same location. */
export const LOCATION_TURNAROUND_GENERATION_INSTRUCTION =
  '2x2 grid location turnaround reference sheet showing 4 distinct, separate camera angles ' +
  '(e.g., looking North, South, East, West) of the same location. ' +
  'Do NOT generate 4 identical images. Each of the 4 panels must show a different facing view of the identical set ' +
  'with consistent furniture, layout, and color palette. Empty scene with NO people or characters present.'

/** Downstream beat/frame generation: how to consume a location turnaround sheet. */
export const LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION =
  'LOCATION REFERENCE: The reference image shows 4 distinct angles of the same location ' +
  '(in a 2x2 grid, or legacy layouts). Use it as a layout aid only — extract architectural layout, ' +
  'furniture placement, and color palette. Choose the angle that best matches beat framing; infer unseen geometry ' +
  'consistently from the views. Render ONE unified full-frame cinematic shot — NEVER reproduce the 2x2 grid, ' +
  'multi-panel sheet, split-screen, diptych, collage, or reference layout in the output.'

/** Shorter hint for intelligence user prompts. */
export const LOCATION_TURNAROUND_USER_PROMPT_HINT =
  '4 distinct angles of same set (2x2 grid or legacy) — consumption is single cinematic frame only'
