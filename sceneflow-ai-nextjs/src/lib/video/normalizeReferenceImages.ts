import type { PrioritizedReferenceImage } from '@/lib/vision/referenceLimits'

export const VEO_PREDICT_MAX_ASSET_REFS = 3
export const VEO_PREDICT_MAX_STYLE_REFS = 1

const VEO_PREDICT_ROLE_PRIORITY: Record<PrioritizedReferenceImage['role'], number> = {
  identity: 0,
  wardrobe: 1,
  location: 2,
  'prop-critical': 3,
  'prop-important': 4,
  'prop-other': 5,
}

export type VeoPredictReferenceInput = {
  url?: string
  imageUrl?: string
  base64Image?: string
  type?: 'style' | 'character'
  referenceType?: 'asset' | 'style'
  name?: string
  label?: string
  role?: PrioritizedReferenceImage['role']
}

/** Infer Veo predictLongRunning referenceType from SceneFlow ref fields. */
export function inferVeoPredictReferenceType(ref: VeoPredictReferenceInput): 'asset' | 'style' {
  if (ref.referenceType === 'asset' || ref.referenceType === 'style') {
    return ref.referenceType
  }
  return ref.type === 'style' ? 'style' : 'asset'
}

function veoPredictRefPriority(ref: VeoPredictReferenceInput): number {
  if (ref.role) return VEO_PREDICT_ROLE_PRIORITY[ref.role]
  return inferVeoPredictReferenceType(ref) === 'style' ? 2 : 5
}

export type VeoPredictReferenceNormalization<T extends VeoPredictReferenceInput> = {
  referenceType: 'asset' | 'style'
  refs: T[]
}

/**
 * Veo predictLongRunning allows up to 3 asset refs OR 1 style ref — never mixed.
 * Beat REF payloads often include character (asset) + location/prop (style); coerce to asset-only.
 */
export function normalizeRefsForVeoPredictLongRunning<T extends VeoPredictReferenceInput>(
  refs: T[] | undefined
): VeoPredictReferenceNormalization<T> | undefined {
  if (!refs?.length) return undefined

  const hasAsset = refs.some((ref) => inferVeoPredictReferenceType(ref) === 'asset')
  const hasStyle = refs.some((ref) => inferVeoPredictReferenceType(ref) === 'style')

  if (hasAsset) {
    const sorted = [...refs].sort((a, b) => veoPredictRefPriority(a) - veoPredictRefPriority(b))
    return {
      referenceType: 'asset',
      refs: sorted.slice(0, VEO_PREDICT_MAX_ASSET_REFS),
    }
  }

  if (hasStyle) {
    return {
      referenceType: 'style',
      refs: refs.slice(0, VEO_PREDICT_MAX_STYLE_REFS),
    }
  }

  return {
    referenceType: 'asset',
    refs: refs.slice(0, VEO_PREDICT_MAX_ASSET_REFS),
  }
}

export type VeoReferenceImage = {
  url: string
  type: 'style' | 'character'
  name?: string
  role?: PrioritizedReferenceImage['role']
}

/** Accept string URLs (Director dialog) or structured labeled refs. */
export function normalizeReferenceImages(
  raw?: VeoReferenceImage[] | string[] | null,
): VeoReferenceImage[] | undefined {
  if (!raw?.length) return undefined
  const normalized = raw
    .map((item): VeoReferenceImage | null => {
      if (typeof item === 'string') {
        const url = item.trim()
        return url ? { url, type: 'character' } : null
      }
      const url = item?.url?.trim()
      if (!url) return null
      return {
        url,
        type: item.type === 'style' ? 'style' : 'character',
        name: item.name,
        role: item.role,
      }
    })
    .filter((item): item is VeoReferenceImage => item !== null)
  return normalized.length > 0 ? normalized : undefined
}

export function veoRefsToPrioritized(
  refs: VeoReferenceImage[]
): PrioritizedReferenceImage[] {
  return refs.map((ref, i) => ({
    imageUrl: ref.url,
    name: ref.name?.trim() || `Reference ${i + 1}`,
    role:
      ref.role ??
      (ref.type === 'style' ? 'location' : 'identity'),
  }))
}

/** True when refs are empty or every entry lacks a non-empty name (bare URLs). */
export function shouldRelabelRefs(
  refs?: VeoReferenceImage[] | string[] | null,
): boolean {
  if (!refs?.length) return true
  return refs.every((ref) => {
    if (typeof ref === 'string') return true
    return !ref.name?.trim()
  })
}

const CORE_REF_ROLES = new Set<PrioritizedReferenceImage['role']>([
  'identity',
  'wardrobe',
  'location',
])

type RefWithRole = {
  url?: string
  imageUrl?: string
  label?: string
  role?: PrioritizedReferenceImage['role']
  type?: 'style' | 'character'
}

function inferRoleFromRefLabel(ref: RefWithRole): PrioritizedReferenceImage['role'] | undefined {
  const label = ref.label?.trim().toLowerCase() ?? ''
  if (label.includes('identity reference')) return 'identity'
  if (label.includes('location reference')) return 'location'
  if (label.includes('prop reference')) return 'prop-other'
  if (label.includes('wardrobe') || label.includes('diptych ref')) return 'wardrobe'
  if (ref.type === 'style') return 'location'
  if (ref.type === 'character' && label && !label.includes('prop')) return 'wardrobe'
  return undefined
}

/** Keep identity/wardrobe/location refs on policy retry; drop props when mode is core. */
export function filterRefsForPolicyRetry<T extends RefWithRole>(
  refs: T[] | undefined,
  mode: 'core' | 'all',
): T[] | undefined {
  if (!refs?.length || mode === 'all') return refs
  const filtered = refs.filter((ref) => {
    const role = ref.role ?? inferRoleFromRefLabel(ref)
    return role ? CORE_REF_ROLES.has(role) : false
  })
  return filtered.length > 0 ? filtered : refs
}
