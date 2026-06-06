/** Featured art style marketing overrides — keyed by artStylePresets id. */

export const FEATURED_ART_STYLE_IDS = [
  'photorealistic',
  'anime-90s',
  'pixar',
  'ghibli',
] as const

export type FeaturedArtStyleId = (typeof FEATURED_ART_STYLE_IDS)[number]

export const ART_STYLES_SECTION_COPY = {
  subsectionTitle: 'Choose Your Look',
  footnote:
    'Same art styles available in Beat Frame and image generation dialogs.',
  popularBadge: 'Popular',
} as const

/** Landing display titles + marketing body for featured styles */
export const ART_STYLE_MARKETING_OVERRIDES: Record<
  FeaturedArtStyleId,
  { displayTitle: string; marketingBody: string; tagline?: string }
> = {
  photorealistic: {
    displayTitle: 'Photorealism',
    tagline: 'Highest commercial conversion',
    marketingBody:
      'Photorealism holds the highest commercial conversion rate and mainstream appeal. The massive boom in AI-generated vertical short dramas relies entirely on realistic characters to drive emotional tension, hook casual scrollers instantly, and mimic traditional prestige TV.',
  },
  'anime-90s': {
    displayTitle: 'Anime',
    tagline: 'Internet-native engagement',
    marketingBody:
      'Anime possesses unparalleled internet-native fan engagement and cultural resonance, pulling in hundreds of millions of views globally. Because generative engines are heavily trained on this medium, models yield crisp line art, predictable framing, and clean cel-shading right out of the box.',
  },
  pixar: {
    displayTitle: '3D Cinematic / Pixar-Inspired',
    tagline: 'Warmth that converts',
    marketingBody:
      'The soft, rounded geometry and expressive, oversized eyes of this style create an immediate sense of emotional warmth and psychological safety. It boasts exceptional click-through-rates for thumbnails and video hooks, making it a favorite for creators targeting broad demographics.',
  },
  ghibli: {
    displayTitle: 'Hand-Drawn / Ghibli-Style',
    tagline: 'Craft as luxury',
    marketingBody:
      'This style taps directly into a major creative movement prioritizing "Craft as Luxury." Because watercolor textures, painterly backgrounds, and loose line work are inherently organic, minor AI glitches and structural fluidities look like deliberate artistic choices rather than machine errors.',
  },
}

/** Optional one-liners for non-featured presets on landing */
export const ART_STYLE_LANDING_TAGLINES: Partial<Record<string, string>> = {
  'concept-art': 'Game and film keyframes with moody, production-ready lighting.',
  'comic-book': 'Bold ink, halftone texture, and pop-art color for serial storytelling.',
  'oil-painting': 'Classical brushwork and rich pigment for timeless narrative weight.',
  'digital-art': 'Clean illustration lines and vibrant color for modern explainers.',
  watercolor: 'Soft edges and flowing pigment for gentle, emotive scenes.',
  sketch: 'Detailed linework and pencil texture for storyboard-ready frames.',
}
