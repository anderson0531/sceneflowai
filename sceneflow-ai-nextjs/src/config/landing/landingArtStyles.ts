import { artStylePresets } from '@/constants/artStylePresets'
import {
  ART_STYLE_LANDING_TAGLINES,
  ART_STYLE_MARKETING_OVERRIDES,
  FEATURED_ART_STYLE_IDS,
  type FeaturedArtStyleId,
} from '@/config/landing/artStylesCopy'
import { getLandingArtStyleThumbnail } from '@/config/landing/landingVisualMedia'

export type LandingArtStyleItem = {
  id: string
  name: string
  displayTitle: string
  description: string
  thumbnail: string
  featured: boolean
  tagline?: string
  marketingBody?: string
}

function isFeaturedArtStyleId(id: string): id is FeaturedArtStyleId {
  return (FEATURED_ART_STYLE_IDS as readonly string[]).includes(id)
}

/** Merge studio presets with landing thumbnails and marketing overrides. */
export function buildLandingArtStyleItems(): LandingArtStyleItem[] {
  return artStylePresets.map((preset) => {
    const featured = isFeaturedArtStyleId(preset.id)
    const override = featured ? ART_STYLE_MARKETING_OVERRIDES[preset.id] : undefined
    const tagline =
      override?.tagline ??
      ART_STYLE_LANDING_TAGLINES[preset.id as keyof typeof ART_STYLE_LANDING_TAGLINES]

    return {
      id: preset.id,
      name: preset.name,
      displayTitle: override?.displayTitle ?? preset.name,
      description: preset.description,
      thumbnail: getLandingArtStyleThumbnail(preset.id) ?? preset.thumbnail,
      featured,
      tagline,
      marketingBody: override?.marketingBody,
    }
  })
}
