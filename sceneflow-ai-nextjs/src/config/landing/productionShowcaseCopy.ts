/** Production Examples section — display strings for landing i18n. */

export const PRODUCTION_SHOWCASE_COPY = {
  badge: 'Production Examples',
  title: 'From Concept to Screen:',
  titleAccent: 'Infinite Possibilities',
  subtitle:
    'With SceneFlow AI Studio, your vision is the only starting line you need. Simply define your concept, and let SceneFlow handle the heavy lifting—automating scriptwriting, character design, multi-language audio, scene visualization, video production, and final publishing.',
  subtitleTagline: 'One platform. Infinite possibilities.',
  workflowLabel: 'Solutions',
  startProduction: 'Start Your Production',
  cta: 'Start Your Production',
  continuityNote: 'Series Studio manages continuity',
  resonanceNote: 'Audience Resonance™ optimizes scripts',
  videoLanguagePrompt: 'Watch this production in your language',
  videoComingSoon: 'Dub coming soon',
  videoSoon: 'Soon',
  introVideoLabel: 'Solutions',
  screeningRoomLabel: 'Screening Room',
  frictionLabel: 'The Friction',
  solutionPillarLabel: 'The SceneFlow Solution',
  cards: [
    {
      id: 'drama',
      title: 'Cinematic AI Drama. Zero Character Drift.',
      subtitle:
        'Eliminate the morphing characters, broken dialogue, and endless rerolls. Build seamless, multi-character long-form stories with complete visual continuity.',
      badge: 'Series-Ready',
      solutionPillars: [
        {
          title: 'Visual & Character Consistency',
          frictionHeadline: 'Character Drift & Wobbly Sets.',
          friction:
            'Generative models reset with every shot—causing character faces, outfits, and lighting to morph continuously across scene cuts.',
          solutionHeadline: 'Locked Asset Blueprints.',
          solution:
            'Define master character profiles, environments, and visual styles up front in Blueprint Studio. SceneFlow enforces visual identity across every render to preserve narrative immersion.',
        },
        {
          title: 'Narrative Pacing & Scene Control',
          frictionHeadline: 'The 10-Second Clip Trap.',
          friction:
            'Building a film out of disconnected micro-prompts creates choppy pacing, flat emotion, and endless manual timeline editing.',
          solutionHeadline: 'Beat-First Storyboarding.',
          solution:
            'Direct at the scene level, not the prompt level. Structure dramatic beats, camera movements, and story arcs visually before generating a single frame of video.',
        },
        {
          title: 'Dialogue & Audio Alignment',
          frictionHeadline: 'Unconvincing Dialogue.',
          friction:
            'Mismatched lip-sync, floating mouth movements, and detached voice tracks immediately pull viewers out of the drama.',
          solutionHeadline: 'Integrated Voice & Sync Engine.',
          solution:
            'Dynamic voice performance and precise lip-sync are baked directly into the video pipeline—delivering believable dialogue without external post-production passes.',
        },
        {
          title: 'Workflow Friction & Reroll Fatigue',
          frictionHeadline: 'Asset Chaos & Endless Rerolls.',
          friction:
            'Generating a short film usually means juggling 200+ raw video files, manual upscaling, and dozens of wasted generations.',
          solutionHeadline: 'Automated Studio Pipeline.',
          solution:
            'From concept to final master MP4 in one unified platform. Blueprint Studio handles story setup, Production Studio automates rendering, and Screening Room delivers your final export.',
        },
      ],
      screeningRoomPreview: 'The Cinematic Drama — Screening Room Preview',
    },
    {
      id: 'animation',
      title: 'The Animated Comedy Pipeline',
      subtitle:
        'Deliver wild slapstick, perfect comedic timing, and rock-solid cartoon styles.',
      badge: 'Multi-Style',
      solutionPillars: [
        {
          title: 'Stylistic Consistency',
          frictionHeadline: 'Style Meltdown.',
          friction:
            'Cartoon and anime styles constantly warp between shots, shifting line art, breaking color palettes, and morphing characters into photorealistic uncanny slop.',
          solutionHeadline: 'Locked Art Style Engine.',
          solution:
            'Freeze your aesthetic from the first frame. SceneFlow locks character designs, line weights, and shading models across the entire episode so your characters stay uniquely yours.',
        },
        {
          title: 'Exaggerated Animation & Physics',
          frictionHeadline: 'Stiff & Glitchy Motion.',
          friction:
            'Generative models struggle with fast slapstick, double-takes, and squishy cartoon physics, turning high-energy gags into melting artifacts.',
          solutionHeadline: 'Action & Pose Anchoring.',
          solution:
            'Drive dynamic character movement and expressive poses without breaking geometry. Direct punchy physical comedy, sudden cutaways, and wild expressions with full motion control.',
        },
        {
          title: 'Comedic Timing & Rhythm',
          frictionHeadline: 'Ruined Punchlines.',
          friction:
            'Humor lives in the pauses and beat-cuts. Standard 5-second generative loops force awkward pacing that destroys joke delivery.',
          solutionHeadline: 'Beat-Precision Editing.',
          solution:
            'Control scene pacing down to the frame. Adjust dramatic pauses, setup-to-punchline timing, and quick reaction shots directly inside the beat-first timeline before final render.',
        },
        {
          title: 'High-Energy Dialogue & Vocal Sync',
          frictionHeadline: 'Lifeless Puppet Mouths.',
          friction:
            'Generic AI dialogue feels flat and mechanical, destroying the energy needed for snappy sitcom banter.',
          solutionHeadline: 'Dynamic Voice & Expression Sync.',
          solution:
            'Map vocal delivery directly to energetic facial performance. Dialogue, expressive mouth shapes, and comedic voice tracks match seamlessly for maximum comedic impact.',
        },
      ],
      screeningRoomPreview: 'The Animated Comedy — Screening Room Preview',
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
      benefit: 'One voice, 20 episodes, zero drift',
      screeningRoomPreview: 'The AI-First Podcast — Screening Room Preview',
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
      benefit: 'Train worldwide teams instantly',
      screeningRoomPreview: 'The Corporate Training — Screening Room Preview',
    },
  ],
} as const

export type ProductionShowcaseCardId =
  (typeof PRODUCTION_SHOWCASE_COPY)['cards'][number]['id']
