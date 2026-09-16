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

export const COMBINED_CHARACTER_REFERENCE_INSTRUCTION =
  'CHARACTER REFERENCE: same person — match face, hair, and likeness; match head-to-toe outfit, fabric, fit, and footwear.'

/** @deprecated Combined character refs no longer use panel routing. */
export const WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION = COMBINED_CHARACTER_REFERENCE_INSTRUCTION

export function buildCombinedCharacterConsumptionLine(
  characterName: string,
  personTokenIndex?: number
): string {
  const personPart = personTokenIndex != null ? `person [${personTokenIndex}]` : characterName
  return (
    `${characterName} (${personPart}): same person — match face, hair, and likeness; ` +
    `match head-to-toe outfit, fabric, fit, and footwear — outfit applies to ${personPart} only.`
  )
}

/** @deprecated Use buildCombinedCharacterConsumptionLine. */
export const buildWardrobeDiptychCharacterConsumptionLine = buildCombinedCharacterConsumptionLine
