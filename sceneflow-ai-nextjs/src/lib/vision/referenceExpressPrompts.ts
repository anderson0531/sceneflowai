import type { VisualReference } from '@/types/visionReferences'

export function buildCharacterReferencePrompt(character: {
  description?: string
  appearance?: string
  appearanceDescription?: string
  age?: string
  personality?: string
}): string {
  const baseDescription =
    character.appearanceDescription?.trim() ||
    character.appearance?.trim() ||
    character.description?.trim() ||
    ''
  const age = character.age ? `, ${character.age}` : ''
  const personality = character.personality ? `, ${character.personality} expression` : ''
  return `Professional portrait photography, full body portrait, ${baseDescription}${age}${personality}, neutral studio background, high detail, consistent lighting, front facing view, photorealistic, 8k quality`
}

export function buildObjectReferencePrompt(ref: VisualReference): string {
  const base = ref.generationPrompt?.trim() || ref.description?.trim() || ref.name
  const studioStyle =
    'Professional product photography, clean studio lighting with soft shadows, centered composition, high resolution, sharp focus, 8K quality, production reference image.'
  if (base.includes('Professional product')) return base
  return `${base}. ${studioStyle}`
}
