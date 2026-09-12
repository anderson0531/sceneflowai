/**
 * Client-safe wardrobe-diptych consumption copy.
 *
 * Kept separate from sceneCharacterHeadshot so provider still emit can rewrite
 * these lines without pulling Gemini / GCS / Vertex into the browser bundle.
 */

/** How beat frame generation should consume a wardrobe diptych reference image. */
export const WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION =
  'CRITICAL — WARDROBE CHARACTER REFERENCE (diptych): ' +
  'LEFT half = identity source of truth (face, hair, skin tone, age, ethnicity, makeup, injuries). ' +
  'RIGHT half = wardrobe source of truth (garments, footwear, accessories, fit, fabric, color). ' +
  'NEVER derive face or identity from the RIGHT panel. NEVER derive clothing or outfit from the LEFT panel. ' +
  'Render one seamless cinematic scene — do NOT reproduce the two-panel split, diptych layout, or reference sheet collage.'

/** Per-character consumption line appended to beat frame prompts. */
export function buildWardrobeDiptychCharacterConsumptionLine(
  characterName: string,
  personTokenIndex?: number
): string {
  const personPart = personTokenIndex != null ? `person [${personTokenIndex}]` : characterName
  return `${characterName} (${personPart}): use LEFT panel for face/identity only, RIGHT panel for outfit/wardrobe only — outfit applies to ${personPart} only.`
}
