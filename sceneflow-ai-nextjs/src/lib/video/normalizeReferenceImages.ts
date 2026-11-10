import {
  MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
  type PrioritizedReferenceImage,
} from '@/lib/vision/referenceLimits'

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
  refRole?: PrioritizedReferenceImage['refRole']
  characterName?: string
  propName?: string
  locationName?: string
  promptToken?: string
  subjectOrdinal?: number
  wardrobeDescription?: string
  identityTraits?: string
}

export type VeoReferenceImageInput = {
  url: string
  type?: 'style' | 'character' | string
  name?: string
  role?: PrioritizedReferenceImage['role'] | string
  refRole?: PrioritizedReferenceImage['refRole'] | string
  characterName?: string
  propName?: string
  locationName?: string
  promptToken?: string
  subjectOrdinal?: number
  wardrobeDescription?: string
  identityTraits?: string
}

const VALID_PRIORITY_ROLES = new Set<PrioritizedReferenceImage['role']>([
  'identity',
  'wardrobe',
  'location',
  'prop-critical',
  'prop-important',
  'prop-other',
])

const VALID_CHARACTER_REF_ROLES = new Set<NonNullable<PrioritizedReferenceImage['refRole']>>([
  'identity',
  'wardrobe',
  'wardrobe-diptych',
])

function narrowPriorityRole(role?: string): PrioritizedReferenceImage['role'] | undefined {
  return role && VALID_PRIORITY_ROLES.has(role as PrioritizedReferenceImage['role'])
    ? (role as PrioritizedReferenceImage['role'])
    : undefined
}

function narrowCharacterRefRole(
  refRole?: string
): PrioritizedReferenceImage['refRole'] | undefined {
  return refRole &&
    VALID_CHARACTER_REF_ROLES.has(refRole as NonNullable<PrioritizedReferenceImage['refRole']>)
    ? (refRole as NonNullable<PrioritizedReferenceImage['refRole']>)
    : undefined
}

/** Accept string URLs (Director dialog) or structured labeled refs. */
export function normalizeReferenceImages(
  raw?: ReadonlyArray<VeoReferenceImageInput | string> | null,
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
        role: narrowPriorityRole(item.role),
        refRole: narrowCharacterRefRole(item.refRole),
        characterName: item.characterName,
        propName: item.propName,
        locationName: item.locationName,
        promptToken: item.promptToken,
        subjectOrdinal: item.subjectOrdinal,
        wardrobeDescription: item.wardrobeDescription,
        identityTraits: item.identityTraits,
      }
    })
    .filter((item): item is VeoReferenceImage => item !== null)
  return normalized.length > 0 ? normalized : undefined
}

export function veoRefsToPrioritized(
  refs: ReadonlyArray<VeoReferenceImageInput>
): PrioritizedReferenceImage[] {
  return refs.map((ref, i) => {
    const narrowedRole = narrowPriorityRole(ref.role)
    const narrowedRefRole = narrowCharacterRefRole(ref.refRole)
    return {
      imageUrl: ref.url,
      name: ref.name?.trim() || `Reference ${i + 1}`,
      role:
        narrowedRefRole === 'wardrobe-diptych'
          ? 'identity'
          : (narrowedRole ??
            (narrowedRefRole === 'wardrobe'
              ? 'wardrobe'
              : ref.type === 'style'
                ? 'location'
                : 'identity')),
      refRole: narrowedRefRole,
      characterName: ref.characterName,
      propName: ref.propName,
      locationName: ref.locationName,
      promptToken: ref.promptToken,
      subjectOrdinal: ref.subjectOrdinal,
      wardrobeDescription: ref.wardrobeDescription,
      identityTraits: ref.identityTraits,
    }
  })
}

/**
 * Priority rank for Omni video reference slots:
 * 0 = Character (identity portrait or PiP face+wardrobe)
 * 1 = Wardrobe (separate full-body outfit plate)
 * 2 = Location / Scene environment
 * 3 = Prop (critical)
 * 4 = Prop (important)
 * 5 = Prop (other)
 */
export function omniVideoReferencePriorityRank(ref: {
  type?: string
  name?: string
  role?: string
  refRole?: string
  characterName?: string
  propName?: string
  locationName?: string
}): number {
  const name = (ref.name || '').trim()
  const role = (ref.role || '').trim().toLowerCase()
  const refRole = (ref.refRole || '').trim().toLowerCase()

  if (
    refRole === 'identity' ||
    refRole === 'wardrobe-diptych' ||
    role === 'identity' ||
    /^the next image is the (?:identity|identity and wardrobe) of\b/i.test(name)
  ) {
    return 0
  }
  if (
    refRole === 'wardrobe' ||
    role === 'wardrobe' ||
    /^the next image is the wardrobe of\b/i.test(name)
  ) {
    return 1
  }
  if (Boolean(ref.characterName?.trim())) {
    return 0
  }
  if (
    role === 'location' ||
    Boolean(ref.locationName?.trim()) ||
    /^the next image is location\b/i.test(name) ||
    ref.type === 'location' ||
    ref.type === 'scene'
  ) {
    return 2
  }
  if (role === 'prop-critical') return 3
  if (role === 'prop-important') return 4
  if (
    role === 'prop-other' ||
    role.startsWith('prop') ||
    Boolean(ref.propName?.trim()) ||
    /^the next image is prop\b/i.test(name) ||
    ref.type === 'object'
  ) {
    return 5
  }
  return ref.type === 'style' ? 2 : 0
}

/**
 * Sort and cap video reference images to Omni's reference image limit
 * (`MAX_VERTEX_GEMINI_REFERENCE_IMAGES` = 8) in strict priority order:
 * Character -> Wardrobe -> Location -> Props (critical -> important -> other).
 * Also renumbers surviving `prop [1..K]` and `location [1..M]` tokens contiguously.
 */
export function prioritizeAndCapOmniVideoReferences<T extends VeoReferenceImageInput>(
  refs?: ReadonlyArray<T> | null,
  maxCount: number = MAX_VERTEX_GEMINI_REFERENCE_IMAGES
): T[] | undefined {
  if (!refs?.length) return undefined
  const indexed = refs.map((ref, idx) => ({
    ref,
    idx,
    rank: omniVideoReferencePriorityRank(ref),
  }))
  indexed.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.idx - b.idx))
  const capped = indexed.slice(0, Math.max(0, maxCount)).map((entry) => entry.ref)

  let nextLocation = 1
  let nextProp = 1
  return capped.map((ref) => {
    const rank = omniVideoReferencePriorityRank(ref)
    if (rank === 2) {
      const token = `location [${nextLocation++}]`
      const updatedName = ref.name
        ? ref.name.replace(/^The next image is location \[\d+\]\./i, `The next image is ${token}.`)
        : ref.name
      return {
        ...ref,
        ...(ref.promptToken ? { promptToken: token } : {}),
        ...(updatedName !== ref.name ? { name: updatedName } : {}),
      }
    }
    if (rank >= 3) {
      const token = `prop [${nextProp++}]`
      const updatedName = ref.name
        ? ref.name.replace(/^The next image is prop \[\d+\]\./i, `The next image is ${token}.`)
        : ref.name
      return {
        ...ref,
        ...(ref.promptToken ? { promptToken: token } : {}),
        ...(updatedName !== ref.name ? { name: updatedName } : {}),
      }
    }
    return ref
  })
}

/** True when refs are empty or every entry lacks a non-empty name (bare URLs). */
export function shouldRelabelRefs(
  refs?: ReadonlyArray<VeoReferenceImageInput | string> | null,
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
  if (label.includes('identity and wardrobe')) return 'wardrobe'
  if (label.includes('the next image is the identity') || label.includes('identity reference')) {
    return 'identity'
  }
  if (label.includes('the next image is location') || label.includes('location reference')) {
    return 'location'
  }
  if (label.includes('the next image is prop') || label.includes('prop reference')) {
    return 'prop-other'
  }
  if (label.includes('the next image is the wardrobe') || label.includes('wardrobe') || label.includes('diptych ref')) {
    return 'wardrobe'
  }
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
