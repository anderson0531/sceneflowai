/** Production Examples section — display strings for landing i18n. */

export const PRODUCTION_SHOWCASE_COPY = {
  badge: 'Production Examples',
  title: 'From Concept to Screen:',
  titleAccent: 'Infinite Possibilities',
  subtitle:
    'With SceneFlow AI Studio, your vision is the only starting line you need. Simply define your concept, and let SceneFlow handle the heavy lifting—automating scriptwriting, character design, multi-language audio, scene visualization, video production, and final publishing.',
  subtitleTagline: 'One platform. Infinite possibilities.',
  workflowLabel: 'Production Workflow',
  toolsLabel: 'Tools',
  startProduction: 'Start This Production',
  cta: 'Start Your Production',
  continuityNote: 'Series Studio manages continuity',
  resonanceNote: 'Audience Resonance™ optimizes scripts',
  videoLanguagePrompt: 'Watch this production in your language',
  videoComingSoon: 'Dub coming soon',
  videoSoon: 'Soon',
  cards: [
    {
      id: 'drama',
      title: 'The Cinematic Drama',
      subtitle: '10-episode thriller with locked characters',
      badge: 'Series-Ready',
      workflow: [
        'Series Studio locks protagonist across 10 episodes',
        'Designer Mode: Photorealistic or Cinematic Noir',
        'Reference Library ensures visual continuity',
        'Export 4K Widescreen or 9:16 Social Thrillers',
      ],
      tools: "Series Studio → Writer's Room → Visualizer",
      benefit: 'No character drift across episodes',
    },
    {
      id: 'animation',
      title: 'The Animated Comedy',
      subtitle: 'Stylized art with perfect face recognition',
      badge: 'Multi-Style',
      workflow: [
        "Writer's Room: Genre-aware script with dialogue polishing",
        'Select any art style (SceneFlow recommends): Anime (90s), Ghibli-esque, Comic Book',
        'Reference Library: Character consistency across all art styles',
        'Audience Resonance™ optimizes comedic timing',
        'Screening Room: Animatic pre-vis, then premiere the full video',
      ],
      tools: "Writer's Room → Visualizer → Screening Room",
      benefit: 'Consistent characters in any style',
    },
    {
      id: 'podcast',
      title: 'The AI-First Podcast',
      subtitle: '20-episode educational series',
      badge: 'Multi-Episode',
      workflow: [
        'Shared Reference Library for 20 episodes',
        'Resonance tool identifies pacing issues',
        'Concept Art or Digital Illustration backgrounds',
        '800+ voices with cloning for your host',
      ],
      tools: 'Series Studio → Smart Editor → Screening Room',
      benefit: 'One voice, 20 episodes, zero drift',
    },
    {
      id: 'training',
      title: 'The Corporate Training',
      subtitle: 'Research outline to 15-part series',
      badge: 'Global Deploy',
      workflow: [
        'Convert research outline into training modules',
        'Series Studio manages 15-part curriculum',
        '70+ language dubbing with automated lip-sync',
        'One-click global deployment',
      ],
      tools: 'Series Studio → Smart Editor → Export',
      benefit: 'Train worldwide teams instantly',
    },
  ],
} as const

export type ProductionShowcaseCardId =
  (typeof PRODUCTION_SHOWCASE_COPY)['cards'][number]['id']
