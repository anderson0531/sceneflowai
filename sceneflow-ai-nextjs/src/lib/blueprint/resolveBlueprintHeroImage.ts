function normalizeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function isPublicBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}

/** Prefer public Blob URLs over GCS or other sources when multiple candidates exist. */
export function pickBestHeroImageUrl(...candidates: Array<string | undefined>): string | undefined {
  const urls = candidates.map(normalizeUrl).filter(Boolean) as string[]
  if (urls.length === 0) return undefined
  return urls.find(isPublicBlobUrl) ?? urls[0]
}

/** Resolve hero image URL from blueprint variant / share payload shapes. */
export function resolveBlueprintHeroImageUrl(
  source?: Record<string, unknown> | null
): string | undefined {
  if (!source || typeof source !== 'object') return undefined

  const flat = normalizeUrl(source.heroImageUrl ?? source.hero_image_url)
  const heroImage = source.heroImage
  const nested =
    heroImage && typeof heroImage === 'object' && heroImage !== null
      ? normalizeUrl((heroImage as { url?: unknown }).url)
      : undefined

  return pickBestHeroImageUrl(flat, nested)
}
