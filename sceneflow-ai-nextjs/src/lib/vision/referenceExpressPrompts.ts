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
  if (base.includes('Professional product')) return base
  return `${base}. ${studioStyle}`
}
