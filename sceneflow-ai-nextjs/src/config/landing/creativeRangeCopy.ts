import { ART_STYLES_SECTION_COPY } from '@/config/landing/artStylesCopy'
import { OUTPUT_FORMATS, OUTPUT_FORMATS_SECTION_COPY } from '@/config/landing/outputFormatsCopy'
import { buildLandingArtStyleItems } from '@/config/landing/landingArtStyles'

export const CREATIVE_RANGE_COPY = {
  badge: 'Creative Range',
  title: 'Every Style, Every Screen',
  titleAccent: 'Your creative DNA, locked in Blueprint',
  subtitle:
    'Blueprint is where your creative DNA locks in—art style, aspect ratio, tone, and core narrative. SceneFlow feeds those choices into treatment, Audience Resonance, and script generation so scene directions match your frame and your look from beat one—not as last-minute export settings.',
  pillars: [
    {
      title: 'Form Follows Function (and Framing)',
      description:
        'Screen size dictates visual storytelling. A 9:16 vertical demands tighter blocking, faster hooks, and close-up-heavy direction—nothing like 16:9 widescreen staging. Lock aspect ratio in Blueprint so script generation writes scene directions that match the frame.',
    },
    {
      title: 'Art Style Dictates the Prose',
      description:
        'Noir anime and Pixar 3D need different dialogue, atmosphere, and pacing. Choose your look in Blueprint and the LLM weaves that texture into the script\'s DNA—not as a filter applied after the fact.',
    },
  ],
  blueprintTagline:
    'Tone and core narrative complete the lock—Blueprint is the brain; Production is the muscle.',
  ui: {
    expandImage: 'Expand Image',
    closePreview: 'Close Preview',
  },
  artStyles: {
    ...ART_STYLES_SECTION_COPY,
    items: buildLandingArtStyleItems().map((item) => ({
      id: item.id,
      name: item.name,
      displayTitle: item.displayTitle,
      description: item.description,
      tagline: item.tagline,
      marketingBody: item.marketingBody,
      featured: item.featured,
      thumbnail: item.thumbnail,
    })),
  },
  outputFormats: {
    ...OUTPUT_FORMATS_SECTION_COPY,
    items: OUTPUT_FORMATS.map((f) => ({
      id: f.id,
      label: f.label,
      ratio: f.ratio,
      description: f.description,
    })),
  },
} as const
