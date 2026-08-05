/**
 * Strip heavy fields from blueprint variants before guided-revise LLM calls.
 * Preserves character image assets in a side map for reattachment after merge.
 */

const CHARACTER_HEAVY_FIELDS = [
  'referenceImage',
  'imagePrompt',
  'headshotUrl',
  'fullBodyUrl',
  'previewImageUrl',
  'wardrobePreviewUrl',
] as const

export type PreservedCharacterAssets = Record<
  string,
  Partial<Record<(typeof CHARACTER_HEAVY_FIELDS)[number], string>>
>

export interface StripVariantResult {
  variant: Record<string, unknown>
  preservedCharacterAssets: PreservedCharacterAssets
}

function isDataUri(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:')
}

function characterAssetKey(char: Record<string, unknown>, index: number): string {
  const id = typeof char.id === 'string' ? char.id.trim() : ''
  const name = typeof char.name === 'string' ? char.name.trim() : ''
  return id || name || `char-${index}`
}

function stripHeavyStringField(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  if (isDataUri(value) || value.length > 2048) return undefined
  return value
}

function trimNarrativeReasoning(
  value: unknown
): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const nr = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  if (typeof nr.user_adjustments === 'string') {
    out.user_adjustments =
      nr.user_adjustments.length > 2000
        ? `${nr.user_adjustments.slice(0, 2000)}…`
        : nr.user_adjustments
  }
  if (Array.isArray(nr.key_decisions)) {
    out.key_decisions = (nr.key_decisions as unknown[]).slice(0, 5)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** Remove base64 blobs and duplicate giant text; preserve assets for response reattachment. */
export function stripHeavyFieldsFromVariant(
  raw: Record<string, unknown>
): StripVariantResult {
  const variant: Record<string, unknown> = { ...raw }
  const preservedCharacterAssets: PreservedCharacterAssets = {}

  if (
    typeof variant.content === 'string' &&
    typeof variant.synopsis === 'string' &&
    variant.content === variant.synopsis
  ) {
    delete variant.content
  } else if (
    typeof variant.content === 'string' &&
    typeof variant.synopsis === 'string' &&
    variant.content.length > variant.synopsis.length
  ) {
    delete variant.content
  } else if (typeof variant.content === 'string' && !variant.synopsis) {
    variant.synopsis = variant.content
    delete variant.content
  }

  const trimmedNr = trimNarrativeReasoning(variant.narrative_reasoning)
  if (trimmedNr) variant.narrative_reasoning = trimmedNr
  else delete variant.narrative_reasoning

  if (Array.isArray(variant.character_descriptions)) {
    variant.character_descriptions = (
      variant.character_descriptions as Array<Record<string, unknown>>
    ).map((char, index) => {
      const key = characterAssetKey(char, index)
      const preserved: Partial<
        Record<(typeof CHARACTER_HEAVY_FIELDS)[number], string>
      > = {}

      for (const field of CHARACTER_HEAVY_FIELDS) {
        const value = char[field]
        if (typeof value === 'string' && value.trim()) {
          preserved[field] = value
        }
      }

      if (Object.keys(preserved).length > 0) {
        preservedCharacterAssets[key] = preserved
      }

      const cleaned: Record<string, unknown> = { ...char }
      for (const field of CHARACTER_HEAVY_FIELDS) {
        const value = cleaned[field]
        if (isDataUri(value) || (typeof value === 'string' && value.length > 2048)) {
          delete cleaned[field]
        }
      }

      const imagePrompt = stripHeavyStringField(cleaned.imagePrompt)
      if (imagePrompt) cleaned.imagePrompt = imagePrompt
      else delete cleaned.imagePrompt

      return cleaned
    })
  }

  return { variant, preservedCharacterAssets }
}

/** Reattach stripped character image fields after mergeRevisionIntoVariant. */
export function reattachPreservedAssets(
  merged: Record<string, unknown>,
  preservedCharacterAssets: PreservedCharacterAssets
): Record<string, unknown> {
  if (
    !Object.keys(preservedCharacterAssets).length ||
    !Array.isArray(merged.character_descriptions)
  ) {
    return merged
  }

  const characters = (
    merged.character_descriptions as Array<Record<string, unknown>>
  ).map((char, index) => {
    const key = characterAssetKey(char, index)
    const preserved = preservedCharacterAssets[key]
    if (!preserved) return char

    const next = { ...char }
    for (const [field, value] of Object.entries(preserved)) {
      if (value && !next[field]) {
        next[field] = value
      }
    }
    return next
  })

  return { ...merged, character_descriptions: characters }
}
