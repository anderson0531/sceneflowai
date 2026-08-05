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

/**
 * Flatten narrative reasoning prose for content MT.
 */
export function buildNarrativeReasoningDisplayFields(
  reasoning: {
    character_focus?: string
    story_strengths?: string
    user_adjustments?: string
    key_decisions?: Array<{ decision?: string; why?: string; impact?: string }>
  } | null | undefined
): Record<string, string | undefined> {
  if (!reasoning) return {}

  const fields: Record<string, string | undefined> = {
    'narrativeReasoning.character_focus': reasoning.character_focus,
    'narrativeReasoning.story_strengths': reasoning.story_strengths,
    'narrativeReasoning.user_adjustments': reasoning.user_adjustments,
  }

  ;(reasoning.key_decisions ?? []).forEach((decision, index) => {
    if (decision?.decision) {
      fields[`narrativeReasoning.key_decisions[${index}].decision`] = decision.decision
    }
    if (decision?.why) {
      fields[`narrativeReasoning.key_decisions[${index}].why`] = decision.why
    }
    if (decision?.impact) {
      fields[`narrativeReasoning.key_decisions[${index}].impact`] = decision.impact
    }
  })

  return fields
}

/**
 * Flatten audience-definition setup copy for content MT (collapsed summary).
 */
export function buildAudienceDefinitionDisplayFields(
  definition: {
    description?: string
    customDirection?: string
  } | null | undefined
): Record<string, string | undefined> {
  if (!definition) return {}
  return {
    'audienceDefinition.description': definition.description,
    'audienceDefinition.customDirection': definition.customDirection,
  }
}

/**
 * Flatten refine-diff before/after snippets for content MT.
 */
export function buildRefineDiffDisplayFields(
  diffs: Array<{ before?: string; after?: string }> | null | undefined
): Record<string, string | undefined> {
  if (!diffs?.length) return {}
  const fields: Record<string, string | undefined> = {}
  diffs.forEach((diff, index) => {
    if (diff.before) fields[`refineDiff[${index}].before`] = diff.before
    if (diff.after) fields[`refineDiff[${index}].after`] = diff.after
  })
  return fields
}

type ResolveText = (path: string) => { text: string } | string

function resolvedText(resolve: ResolveText, path: string, fallback = ''): string {
  const result = resolve(path)
  if (typeof result === 'string') return result || fallback
  return result.text || fallback
}

/**
 * Apply content-MT resolutions onto a treatment variant for read views
 * (Share/Review, refine snapshot). Opaque fields (names, roles) stay source.
 */
export function applyTreatmentVariantTranslations(
  variant: LooseRecord | null | undefined,
  resolve: ResolveText
): LooseRecord | null {
  if (!variant?.id) return variant ?? null

  const prefix = treatmentVariantPathPrefix(String(variant.id))
  const localized: LooseRecord = { ...variant }

  const scalarKeys = [
    'title',
    'label',
    'logline',
    'synopsis',
    'genre',
    'target_audience',
    'setting',
    'protagonist',
    'antagonist',
    'tone',
    'tone_description',
  ] as const

  for (const key of scalarKeys) {
    const path = `${prefix}.${key}`
    const source =
      key === 'synopsis'
        ? String(variant.synopsis || variant.content || '')
        : String(variant[key] || '')
    if (source) localized[key] = resolvedText(resolve, path, source)
  }
  if (localized.synopsis && !variant.synopsis && variant.content) {
    localized.content = localized.synopsis
  }

  if (Array.isArray(variant.themes)) {
    localized.themes = variant.themes.map((theme: unknown, index: number) => {
      if (typeof theme !== 'string') return theme
      return resolvedText(resolve, `${prefix}.themes[${index}]`, theme)
    })
  } else if (typeof variant.themes === 'string' && variant.themes.trim()) {
    localized.themes = resolvedText(resolve, `${prefix}.themes`, variant.themes)
  }

  if (Array.isArray(variant.mood_references)) {
    localized.mood_references = variant.mood_references.map(
      (mood: unknown, index: number) => {
        if (typeof mood !== 'string') return mood
        return resolvedText(resolve, `${prefix}.mood_references[${index}]`, mood)
      }
    )
  }

  if (Array.isArray(variant.beats)) {
    localized.beats = variant.beats.map((beat: LooseRecord, index: number) => ({
      ...beat,
      title: resolvedText(
        resolve,
        `${prefix}.beats[${index}].title`,
        String(beat?.title || '')
      ),
      intent: resolvedText(
        resolve,
        `${prefix}.beats[${index}].intent`,
        String(beat?.intent || '')
      ),
      synopsis: resolvedText(
        resolve,
        `${prefix}.beats[${index}].synopsis`,
        String(beat?.synopsis || '')
      ),
    }))
  }

  if (Array.isArray(variant.character_descriptions)) {
    localized.character_descriptions = variant.character_descriptions.map(
      (character: LooseRecord, index: number) => {
        const base = `${prefix}.character_descriptions[${index}]`
        return {
          ...character,
          description: resolvedText(
            resolve,
            `${base}.description`,
            String(character?.description || '')
          ),
          externalGoal: resolvedText(
            resolve,
            `${base}.externalGoal`,
            String(character?.externalGoal || '')
          ),
          internalNeed: resolvedText(
            resolve,
            `${base}.internalNeed`,
            String(character?.internalNeed || '')
          ),
          fatalFlaw: resolvedText(
            resolve,
            `${base}.fatalFlaw`,
            String(character?.fatalFlaw || '')
          ),
          arcStartingState: resolvedText(
            resolve,
            `${base}.arcStartingState`,
            String(character?.arcStartingState || '')
          ),
          arcShift: resolvedText(
            resolve,
            `${base}.arcShift`,
            String(character?.arcShift || '')
          ),
          arcEndingState: resolvedText(
            resolve,
            `${base}.arcEndingState`,
            String(character?.arcEndingState || '')
          ),
        }
      }
    )
  }

  return localized
}
