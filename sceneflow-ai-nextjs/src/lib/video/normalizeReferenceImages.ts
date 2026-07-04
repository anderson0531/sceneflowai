export type VeoReferenceImage = { url: string; type: 'style' | 'character' }

/** Accept string URLs (Director dialog) or structured refs (prompt builder). */
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
      return { url, type: item.type === 'style' ? 'style' : 'character' }
    })
    .filter((item): item is VeoReferenceImage => item !== null)
  return normalized.length > 0 ? normalized : undefined
}
