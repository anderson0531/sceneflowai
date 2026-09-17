import type { VisualReference } from '@/types/visionReferences'
import { buildCharacterIdentityReferencePromptFromCharacter } from '@/lib/character/characterReferencePrompts'

export function buildCharacterReferencePrompt(character: {
  description?: string
  appearance?: string
  appearanceDescription?: string
  age?: string
  personality?: string
  defaultWardrobe?: string
  wardrobeAccessories?: string
  wardrobes?: Array<{ description?: string; accessories?: string; isDefault?: boolean }>
}): string {
  return buildCharacterIdentityReferencePromptFromCharacter(character)
}

export function buildObjectReferencePrompt(ref: VisualReference): string {
  const base = ref.generationPrompt?.trim() || ref.description?.trim() || ref.name
  const studioStyle =
    'Professional product photography, clean studio lighting with soft shadows, centered composition, high resolution, sharp focus, 8K quality, production reference image.'
  const scale =
    'Show true real-world scale: handheld items stay handheld (include inches when known); set-pieces stay set-piece size. Do not crop so the object fills the frame as if it were larger.'
  const withStudio = base.includes('Professional product') ? base : `${base}. ${studioStyle}`
  return /true real-world scale/i.test(withStudio) ? withStudio : `${withStudio} ${scale}`
}
