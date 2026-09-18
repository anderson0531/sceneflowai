import type { VisualReference } from '@/types/visionReferences'
import { buildCharacterIdentityReferencePromptFromCharacter } from '@/lib/character/characterReferencePrompts'
import { withObjectReferenceInstruction } from '@/lib/vision/objectReferencePrompts'

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
  return withObjectReferenceInstruction(base)
}
