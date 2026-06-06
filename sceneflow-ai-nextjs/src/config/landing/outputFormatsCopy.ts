/** Output format / aspect ratio cards for Creative Range landing section. */

export type OutputFormatId = '16x9' | '9x16' | '1x1' | '4x3'

export const OUTPUT_FORMATS_SECTION_COPY = {
  subsectionTitle: 'Ship Every Screen',
  resolutionFootnote:
    'Export at 720p or 1080p where your project supports it — lock aspect ratio before you render.',
} as const

export const OUTPUT_FORMATS: Array<{
  id: OutputFormatId
  label: string
  ratio: string
  description: string
}> = [
  {
    id: '16x9',
    label: '16:9 Widescreen',
    ratio: '16:9',
    description:
      'YouTube main, connected TV (35%+ of watch time), and episodic series — the format indie hits use to sit beside premium streaming apps.',
  },
  {
    id: '9x16',
    label: '9:16 Vertical',
    ratio: '9:16',
    description:
      'Shorts, Reels, TikTok, and vertical short-drama formats — scroll-stopping hooks built for mobile-first audiences.',
  },
  {
    id: '1x1',
    label: '1:1 Square',
    ratio: '1:1',
    description:
      'Feed-native hooks, carousel posts, and thumbnail-first compositions that stop the scroll in square grids.',
  },
  {
    id: '4x3',
    label: '4:3 Classic',
    ratio: '4:3',
    description:
      'Training modules, legacy displays, and presentation-friendly frames when your audience expects a classic aspect.',
  },
]
