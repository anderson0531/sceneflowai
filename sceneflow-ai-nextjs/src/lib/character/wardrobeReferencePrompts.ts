/**
 * Prompts and constants for wardrobe turnaround reference sheets used in Vision Production.
 */

export const WARDROBE_REFERENCE_ASPECT_RATIO = '16:9' as const

/** Downstream scene/frame generation: how to consume a 1-row mannequin outfit sheet. */
export const WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION =
  'COSTUME REFERENCE: The reference image is a single-row mannequin outfit turnaround (four full-body views). ' +
  'Use the FRONT full-body view for fabric, color, fit, and accessories ONLY. ' +
  'Do NOT derive face, hair, skin tone, or identity from this sheet — identity comes from the separate identity reference. ' +
  'Do NOT reproduce the turnaround layout, mannequin form, multi-view sheet, or neutral gray studio background in the scene.'

export interface WardrobeTurnaroundPromptInput {
  characterName?: string
  appearanceDescription?: string
  wardrobeDescription?: string
  accessories?: string
  gender?: string
}

function getPronouns(gender?: string): { pronoun: string; possessive: string } {
  const g = gender?.toLowerCase()
  if (g === 'female' || g === 'woman' || g === 'f') {
    return { pronoun: 'She', possessive: 'Her' }
  }
  if (g === 'non-binary' || g === 'nonbinary' || g === 'nb') {
    return { pronoun: 'They', possessive: 'Their' }
  }
  return { pronoun: 'He', possessive: 'His' }
}

/** Opening line for mannequin-only wardrobe sheet generation (no character portrait input). */
export function buildWardrobeTurnaroundSubjectDescription(): string {
  return (
    'Generate a professional costume turnaround reference sheet showing ONLY the outfit on a faceless neutral mannequin. ' +
    'No human face, no hair, no skin details, no character identity — outfit and garment construction only.'
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

/** Build prompt for a 1-row faceless mannequin wardrobe turnaround reference sheet. */
export function buildWardrobeTurnaroundPrompt(input: WardrobeTurnaroundPromptInput): string {
  const { wardrobeDescription, accessories, gender } = input
  const { pronoun } = getPronouns(gender)
  const parts: string[] = []

  parts.push(
    'Professional costume turnaround reference sheet with ONE horizontal row and FOUR aligned columns on a faceless neutral mannequin'
  )
  parts.push(
    'Layout: single row only — front facing camera, three-quarter view facing camera-left, profile side view, back view'
  )
  parts.push(
    'Mannequin: dull neutral gray featureless form with NO face, NO hair, NO skin texture, NO recognizable human identity'
  )
  parts.push(
    'Full-body framing in all four views: neutral upright standing A-pose, arms slightly away from body, feet shoulder-width apart'
  )

  if (wardrobeDescription) {
    const outfit = parseOutfitDescription(wardrobeDescription)
    const outfitItems: string[] = []
    if (outfit.outerwear) outfitItems.push(outfit.outerwear)
    if (outfit.top) outfitItems.push(outfit.top)
    if (outfit.bottom) outfitItems.push(outfit.bottom)
    if (outfit.footwear) outfitItems.push(outfit.footwear)
    if (outfit.other) outfitItems.push(outfit.other)

    if (outfitItems.length > 0) {
      parts.push(`The mannequin wears ${outfitItems.join(', ')} in all four views`)
    } else {
      parts.push(`The mannequin wears ${wardrobeDescription} in all four views`)
    }
  }

  if (accessories) {
    parts.push(`Accessories visible where appropriate: ${accessories}`)
  }

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
    `${pronoun} outfit must be identical across front, three-quarter, profile, and back views`
  )

  return parts.join('. ') + '.'
}
