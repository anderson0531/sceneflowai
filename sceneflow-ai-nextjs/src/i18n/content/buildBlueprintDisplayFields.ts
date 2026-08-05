/**
 * Flatten a treatment variant into registry paths for content MT on the
 * Blueprint read view. Paths match `CONTENT_FIELDS` in fieldRegistry.
 */

type LooseRecord = Record<string, any>

export function treatmentVariantPathPrefix(variantId: string): string {
  return `treatmentVariants[${variantId}]`
}

export function buildTreatmentVariantDisplayFields(
  variant: LooseRecord | null | undefined
): Record<string, string | undefined> {
  if (!variant?.id) return {}

  const prefix = treatmentVariantPathPrefix(String(variant.id))
  const fields: Record<string, string | undefined> = {
    [`${prefix}.title`]: variant.title,
    [`${prefix}.label`]: variant.label,
    [`${prefix}.logline`]: variant.logline,
    [`${prefix}.synopsis`]: variant.synopsis || variant.content,
    [`${prefix}.genre`]: variant.genre,
    [`${prefix}.target_audience`]: variant.target_audience,
    [`${prefix}.setting`]: variant.setting,
    [`${prefix}.protagonist`]: variant.protagonist,
    [`${prefix}.antagonist`]: variant.antagonist,
    [`${prefix}.tone`]: variant.tone,
    [`${prefix}.tone_description`]: variant.tone_description,
  }

  if (Array.isArray(variant.themes)) {
    variant.themes.forEach((theme: unknown, index: number) => {
      if (typeof theme === 'string' && theme.trim()) {
        fields[`${prefix}.themes[${index}]`] = theme
      }
    })
  } else if (typeof variant.themes === 'string' && variant.themes.trim()) {
    fields[`${prefix}.themes`] = variant.themes
  }

  if (Array.isArray(variant.mood_references)) {
    variant.mood_references.forEach((mood: unknown, index: number) => {
      if (typeof mood === 'string' && mood.trim()) {
        fields[`${prefix}.mood_references[${index}]`] = mood
      }
    })
  }

  if (Array.isArray(variant.beats)) {
    variant.beats.forEach((beat: LooseRecord, index: number) => {
      fields[`${prefix}.beats[${index}].title`] = beat?.title
      fields[`${prefix}.beats[${index}].intent`] = beat?.intent
      fields[`${prefix}.beats[${index}].synopsis`] = beat?.synopsis
    })
  }

  if (Array.isArray(variant.character_descriptions)) {
    variant.character_descriptions.forEach((character: LooseRecord, index: number) => {
      const base = `${prefix}.character_descriptions[${index}]`
      fields[`${base}.description`] = character?.description
      fields[`${base}.externalGoal`] = character?.externalGoal
      fields[`${base}.internalNeed`] = character?.internalNeed
      fields[`${base}.fatalFlaw`] = character?.fatalFlaw
      fields[`${base}.arcStartingState`] = character?.arcStartingState
      fields[`${base}.arcShift`] = character?.arcShift
      fields[`${base}.arcEndingState`] = character?.arcEndingState
    })
  }

  return fields
}

/**
 * Flatten an Audience Resonance analysis into registry paths for content MT.
 */
export function buildAudienceResonanceDisplayFields(
  analysis: {
    summary?: string
    strengths?: string[]
    deductions?: Array<{ reason?: string }>
    recommendations?: Array<{ id?: string; title?: string; text?: string }>
    categories?: Array<{ name?: string }>
  } | null | undefined
): Record<string, string | undefined> {
  if (!analysis) return {}

  const fields: Record<string, string | undefined> = {
    'audienceResonance.summary': analysis.summary,
  }

  ;(analysis.strengths ?? []).forEach((strength, index) => {
    if (typeof strength === 'string' && strength.trim()) {
      fields[`audienceResonance.strengths[${index}]`] = strength
    }
  })

  ;(analysis.deductions ?? []).forEach((deduction, index) => {
    if (deduction?.reason) {
      fields[`audienceResonance.deductions[${index}].reason`] = deduction.reason
    }
  })

  ;(analysis.recommendations ?? []).forEach((rec, index) => {
    const key = rec.id ?? String(index)
    if (rec?.title) {
      fields[`audienceResonance.recommendations[${key}].title`] = rec.title
    }
    if (rec?.text) {
      fields[`audienceResonance.recommendations[${key}].text`] = rec.text
    }
  })

  ;(analysis.categories ?? []).forEach((category, index) => {
    if (category?.name) {
      fields[`audienceResonance.categories[${index}].name`] = category.name
    }
  })

  return fields
}
