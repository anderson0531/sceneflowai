/** Resolve hero image URL from blueprint variant / share payload shapes. */
export function resolveBlueprintHeroImageUrl(
  source?: Record<string, unknown> | null
): string | undefined {
  if (!source || typeof source !== 'object') return undefined

  const flat = source.heroImageUrl ?? source.hero_image_url
  if (typeof flat === 'string' && flat.trim()) return flat.trim()

  const heroImage = source.heroImage
  if (heroImage && typeof heroImage === 'object' && heroImage !== null) {
    const url = (heroImage as { url?: unknown }).url
    if (typeof url === 'string' && url.trim()) return url.trim()
  }

  return undefined
}
