import type { PrioritizedReferenceImage } from '@/lib/vision/referenceLimits'

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
