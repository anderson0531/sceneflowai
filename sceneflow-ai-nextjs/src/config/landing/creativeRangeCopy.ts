import { ART_STYLES_SECTION_COPY } from '@/config/landing/artStylesCopy'
import { OUTPUT_FORMATS, OUTPUT_FORMATS_SECTION_COPY } from '@/config/landing/outputFormatsCopy'
import { buildLandingArtStyleItems } from '@/config/landing/landingArtStyles'

export const CREATIVE_RANGE_COPY = {
  badge: 'Creative Range',
  title: 'Every Style, Every Screen',
  titleAccent: 'Total creative flexibility',
  subtitle:
    'Lock your art direction and aspect ratio before you render—from photoreal vertical drama to painterly series, widescreen epics to 9:16 Shorts.',
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
