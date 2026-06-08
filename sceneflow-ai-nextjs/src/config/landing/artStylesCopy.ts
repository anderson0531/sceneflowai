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
  subsectionIntro:
    'Your look is not a render preset—it is the voice of the script. Lock art style in Blueprint and every beat inherits that aesthetic.',
  footnote:
    'Locked in Blueprint Visual Foundation—carried through script, pre-vis, and final render.',
  popularBadge: 'Popular',
} as const

/** Landing display titles + marketing body for featured styles */
export const ART_STYLE_MARKETING_OVERRIDES: Record<
  FeaturedArtStyleId,
  { displayTitle: string; marketingBody: string; tagline?: string }
> = {
  photorealistic: {
    displayTitle: 'Photorealism',
    tagline: 'Prestige longform realism',
    marketingBody:
      'Photorealism delivers the mainstream appeal prestige TV and documentary audiences expect. Lock realistic characters and lighting across chained beats so episodic drama and docuseries maintain emotional continuity from opener to finale.',
  },
  'anime-90s': {
    displayTitle: 'Anime',
    tagline: 'Serialized narrative arcs',
    marketingBody:
      'Anime-style cel shading carries deep fan engagement across multi-episode web series and longform narrative arcs. Generative engines trained on this medium yield crisp line art and predictable framing — ideal for serialized production at scale.',
  },
  pixar: {
    displayTitle: '3D Cinematic / Pixar-Inspired',
    tagline: 'Emotional continuity across episodes',
    marketingBody:
      'Soft, rounded geometry and expressive character design create emotional warmth that sustains viewers across a full season. Perfect for animated series, family longform, and branded storytelling where character consistency matters beat to beat.',
  },
  ghibli: {
    displayTitle: 'Hand-Drawn / Ghibli-Style',
    tagline: 'Craft as luxury',
    marketingBody:
      'This style taps directly into a major creative movement prioritizing "Craft as Luxury." Watercolor textures and painterly backgrounds build handcrafted episodic worlds where organic imperfection reads as deliberate artistry across a longform series.',
  },
}

/** Optional one-liners for non-featured presets on landing */
export const ART_STYLE_LANDING_TAGLINES: Partial<Record<string, string>> = {
  'concept-art': 'Film and series pre-vis keyframes with moody, production-ready lighting.',
  'comic-book': 'Bold ink, halftone texture, and pop-art color for multi-episode serial storytelling.',
  'oil-painting': 'Classical brushwork and rich pigment for documentary and historical longform.',
  'digital-art': 'Stylized illustration for animated documentary and episodic explainer series.',
  watercolor: 'Soft pigment washes for memoir, documentary, and contemplative longform.',
  sketch: 'Detailed linework and pencil texture for pre-vis-to-production longform beats.',
}
