/**
 * Decide which stored blueprint the Studio should restore.
 *
 * Several metadata fields can hold a blueprint. `treatmentVariants` is the
 * Studio working copy and the only field autosave writes, so it must win:
 * preferring `filmTreatmentVariant` meant every edit was saved and then
 * discarded on reload, because that snapshot is only refreshed when the
 * blueprint is synced to Production.
 */

export type BlueprintVariantSource =
  | 'treatmentVariants'
  | 'filmTreatmentVariant'
  | 'approvedTreatment'
  | 'filmTreatment'
  | 'none'

export type ResolvedBlueprintVariants = {
  variants: Array<Record<string, unknown>>
  source: BlueprintVariantSource
  /** Body text for updateTreatment(), when the chosen source carries one. */
  treatmentText: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function bodyText(variant: Record<string, unknown>): string {
  const content = variant.content ?? variant.synopsis
  return typeof content === 'string' ? content : ''
}

const EMPTY: ResolvedBlueprintVariants = {
  variants: [],
  source: 'none',
  treatmentText: '',
}

export function resolveLoadedBlueprintVariants(
  metadata: Record<string, unknown> | null | undefined,
  fallbackTitle?: string
): ResolvedBlueprintVariants {
  if (!metadata) return EMPTY

  const stored = metadata.treatmentVariants
  if (Array.isArray(stored) && stored.length > 0) {
    const variants = stored.filter((v): v is Record<string, unknown> => !!asRecord(v))
    if (variants.length > 0) {
      return {
        variants,
        source: 'treatmentVariants',
        treatmentText: bodyText(variants[0]),
      }
    }
  }

  for (const key of ['filmTreatmentVariant', 'approvedTreatment'] as const) {
    const variant = asRecord(metadata[key])
    if (variant) {
      const id = typeof variant.id === 'string' && variant.id ? variant.id : 'approved-treatment'
      return {
        variants: [{ ...variant, id }],
        source: key,
        treatmentText: bodyText(variant),
      }
    }
  }

  const legacy = metadata.filmTreatment
  if (typeof legacy === 'string' && legacy.trim()) {
    return {
      variants: [
        {
          id: 'legacy-treatment',
          label: fallbackTitle || 'Film Treatment',
          content: legacy,
          synopsis: legacy,
        },
      ],
      source: 'filmTreatment',
      treatmentText: legacy,
    }
  }

  return EMPTY
}
