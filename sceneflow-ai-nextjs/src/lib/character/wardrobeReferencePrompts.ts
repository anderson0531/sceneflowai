/**
 * Prompts and constants for wardrobe turnaround reference sheets used in Vision Production.
 */

export const WARDROBE_REFERENCE_ASPECT_RATIO = '4:3' as const

/** Downstream scene/frame generation: how to consume a 2-row turnaround ref image. */
export const WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION =
  'COSTUME TURNAROUND REFERENCE: The reference image is a 2-row turnaround sheet with eight views total. ' +
  'TOP ROW (headshots): use for facial identity — match face, hair, and expression exactly. ' +
  'BOTTOM ROW (full body): use for outfit, body proportions, and pose — use the FRONT full-body view for scene pose. ' +
  'Preserve outfit details (fabric, color, accessories) EXACTLY as shown. ' +
  'Do NOT reproduce the turnaround layout, multi-view sheet, or neutral gray studio background in the scene.'

export interface WardrobeTurnaroundPromptInput {
  characterName: string
  appearanceDescription?: string
  wardrobeDescription?: string
  accessories?: string
  gender?: string
}

function getPronouns(gender?: string): { pronoun: string; possessive: string } {
  const isFemale = gender?.toLowerCase() === 'female' || gender?.toLowerCase() === 'woman'
  return {
    pronoun: isFemale ? 'She' : 'He',
    possessive: isFemale ? 'Her' : 'His',
  }
}

export function buildWardrobeTurnaroundSubjectDescription(characterName: string): string {
  return (
    `[img-1] is ${characterName}. Generate an 8-view costume turnaround sheet (2 rows × 4 columns) of [img-1] wearing the described outfit. ` +
    'The TOP ROW headshots must match [img-1] face, hair, and identity exactly in every view. ' +
    'Face, body proportions, and identity must match [img-1] exactly across all eight views. ' +
    'The outfit must be identical across front, three-quarter, profile, and back views in both rows.'
  )
}

/** Parse outfit description into garment categories for structured prompts. */
export function parseOutfitDescription(description: string): {
  top?: string
  bottom?: string
  footwear?: string
  outerwear?: string
  other?: string
} {
  const result: {
    top?: string
    bottom?: string
    footwear?: string
    outerwear?: string
    other?: string
  } = {}

  const lower = description.toLowerCase()
  const parts = description.split(/[,;.]/).map((s) => s.trim()).filter(Boolean)

  const topKeywords = /shirt|blouse|top|tee|t-shirt|sweater|pullover|polo|tank|camisole|vest|cardigan/i
  const bottomKeywords = /pants|trousers|jeans|skirt|shorts|slacks|leggings|chinos|khakis/i
  const footwearKeywords = /shoes|boots|sneakers|heels|loafers|sandals|oxfords|flats|pumps|trainers|footwear/i
  const outerwearKeywords = /jacket|coat|blazer|overcoat|parka|windbreaker|hoodie|raincoat|cardigan|cape/i

  const topParts: string[] = []
  const bottomParts: string[] = []
  const footwearParts: string[] = []
  const outerwearParts: string[] = []
  const otherParts: string[] = []

  for (const part of parts) {
    if (footwearKeywords.test(part)) footwearParts.push(part)
    else if (outerwearKeywords.test(part)) outerwearParts.push(part)
    else if (bottomKeywords.test(part)) bottomParts.push(part)
    else if (topKeywords.test(part)) topParts.push(part)
    else otherParts.push(part)
  }

  if (topParts.length > 0) result.top = topParts.join(', ')
  if (bottomParts.length > 0) result.bottom = bottomParts.join(', ')
  if (footwearParts.length > 0) result.footwear = footwearParts.join(', ')
  if (outerwearParts.length > 0) result.outerwear = outerwearParts.join(', ')
  if (otherParts.length > 0) result.other = otherParts.join(', ')

  if (!result.footwear && !lower.includes('shoe') && !lower.includes('boot') && !lower.includes('foot')) {
    result.footwear = 'appropriate footwear matching the outfit'
  }

  return result
}

/** Build prompt for a 2-row (headshot + full body) wardrobe turnaround reference sheet. */
export function buildWardrobeTurnaroundPrompt(input: WardrobeTurnaroundPromptInput): string {
  const { characterName, appearanceDescription, wardrobeDescription, accessories, gender } = input
  const { pronoun } = getPronouns(gender)
  const parts: string[] = []

  parts.push(
    'Professional character costume turnaround reference sheet with TWO stacked horizontal rows and FOUR aligned columns'
  )
  parts.push(
    'Layout: TOP ROW (~30% of image height) = headshot turnaround; BOTTOM ROW (~70% of image height) = full-body turnaround'
  )
  parts.push(
    'Columns left to right in BOTH rows: (1) front facing camera, (2) three-quarter view facing camera-left, (3) profile side view, (4) back view'
  )
  parts.push(
    'Columns must be vertically aligned: front headshot directly above front full-body, same for three-quarter, profile, and back'
  )

  parts.push(
    'TOP ROW (headshots): chest-up shoulders-and-head framing, neutral calm expression, face fully visible and unobscured, collar and upper garment visible for costume continuity'
  )
  parts.push(
    'Headshot row: eyes, nose, and chin aligned at the same height across all four headshot views'
  )

  if (appearanceDescription) {
    const appearanceBrief = appearanceDescription.split('.').slice(0, 2).join('.').trim()
    parts.push(
      appearanceBrief
        ? `Character: ${characterName}, ${appearanceBrief}`
        : `Character: ${characterName}`
    )
  } else {
    parts.push(`Character: ${characterName}`)
  }

  if (wardrobeDescription) {
    const outfit = parseOutfitDescription(wardrobeDescription)
    const outfitItems: string[] = []
    if (outfit.outerwear) outfitItems.push(outfit.outerwear)
    if (outfit.top) outfitItems.push(outfit.top)
    if (outfit.bottom) outfitItems.push(outfit.bottom)
    if (outfit.footwear) outfitItems.push(outfit.footwear)
    if (outfit.other) outfitItems.push(outfit.other)

    if (outfitItems.length > 0) {
      parts.push(`${pronoun} is wearing ${outfitItems.join(', ')} in all eight views`)
    } else {
      parts.push(`${pronoun} is wearing ${wardrobeDescription} in all eight views`)
    }
  }

  if (accessories) {
    parts.push(`Accessories visible where appropriate: ${accessories}`)
  }

  parts.push(
    'BOTTOM ROW (full body): neutral upright standing A-pose, symmetrical relaxed posture, arms slightly away from body, feet shoulder-width apart, facing forward in front view'
  )
  parts.push(
    'Full-body row: eyes, shoulders, and waistline aligned at the same height across all four full-body views'
  )
  parts.push(
    'No dynamic action poses, no twisted torso, no dramatic foreshortening'
  )
  parts.push(
    'Lighting: flat diffuse neutral studio lighting, even illumination, no harsh shadows, no directional highlights, no colored rim lights'
  )
  parts.push(
    'Background: solid light gray (#D0D0D0), completely empty, no props, no environment, no clutter'
  )
  parts.push(
    'Image quality: ultra-sharp high resolution, no motion blur, no film grain, no compression artifacts, fabric textures and accessories clearly visible'
  )
  parts.push(
    'Hair parted or styled so the face is unobscured; limbs held slightly away from the body for clear silhouette and outfit readability in the full-body row'
  )

  return parts.join('. ') + '.'
}
