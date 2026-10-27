/**
 * Client-safe character-reference consumption copy.
 *
 * Kept separate from sceneCharacterHeadshot so a still-prompt rewriter can
 * reuse these lines without pulling Gemini / GCS / Vertex into the browser
 * bundle. That import path is what failed the Vercel build on
 * cursor/provider-still-emit-e066 (Turbopack: Can't resolve 'child_process').
 *
 * Combined character refs are a full-body canvas with a face badge. Do not
 * mention panels, insets, circles, or coordinates — the still model copies
 * layout language into the frame.
 */

import { isFaceCloseUpShot, isInsertOrExtremeCloseUp } from '@/lib/imagen/stillFramingNormalize'

export const COMBINED_CHARACTER_REFERENCE_INSTRUCTION =
  'CHARACTER REFERENCE: same person — this reference card combines a full-body standing figure with a face close-up of the same person. Match exact facial bone structure, features, skin tone, hair, and likeness from the face close-up (do not drift into a generic or celebrity face) and match head-to-toe outfit, fabric, fit, and footwear from the standing figure. Render one unbroken camera frame and do not copy the character-card layout or headshot overlay into the scene.'

export const COMBINED_CHARACTER_INSERT_INSTRUCTION =
  'CHARACTER REFERENCE: same person — match the visible skin, fabric, and likeness of the specified limb or hand; do not pull a full body into the frame.'

export const COMBINED_CHARACTER_FACE_CLOSE_UP_INSTRUCTION =
  'CHARACTER REFERENCE: same person — match exact facial bone structure, features, skin tone, hair, and likeness from the face close-up in this photo (do not drift into a generic or celebrity face). Do not copy a standing figure, character-card layout, or headshot overlay into the scene. Outfit is garments at the collar and shoulders only.'

/** @deprecated Combined character refs no longer use panel routing. */
export const WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION = COMBINED_CHARACTER_REFERENCE_INSTRUCTION

export function combinedCharacterReferenceInstruction(shotType?: string | null): string {
  if (isInsertOrExtremeCloseUp(shotType)) return COMBINED_CHARACTER_INSERT_INSTRUCTION
  if (isFaceCloseUpShot(shotType)) return COMBINED_CHARACTER_FACE_CLOSE_UP_INSTRUCTION
  return COMBINED_CHARACTER_REFERENCE_INSTRUCTION
}

export function buildCombinedCharacterConsumptionLine(
  characterName: string,
  personTokenIndex?: number,
  shotType?: string | null
): string {
  const personPart = personTokenIndex != null ? `person [${personTokenIndex}]` : characterName
  if (isInsertOrExtremeCloseUp(shotType)) {
    return (
      `${characterName} (${personPart}): same person — match the visible skin, fabric, and likeness ` +
      `of the specified limb or hand from the character reference — only what enters the composition.`
    )
  }
  if (isFaceCloseUpShot(shotType)) {
    return (
      `${characterName} (${personPart}): same person — match exact facial bone structure, features, hair, and likeness from the face close-up (never substitute a generic or celebrity face); ` +
      `do not copy a standing figure, character-card layout, or headshot overlay — garments at the collar and shoulders only, on ${personPart} only.`
    )
  }
  return (
    `${characterName} (${personPart}): same person — match exact facial bone structure, features, hair, and likeness from the face close-up (never substitute a generic or celebrity face) and the standing figure; ` +
    `match head-to-toe outfit, fabric, fit, and footwear — outfit applies to ${personPart} only. Do not copy the character-card layout or headshot overlay into the scene.`
  )
}

/** @deprecated Use buildCombinedCharacterConsumptionLine. */
export const buildWardrobeDiptychCharacterConsumptionLine = buildCombinedCharacterConsumptionLine
