/** Production Examples section — display strings for landing i18n. */

export const PRODUCTION_SHOWCASE_COPY = {
  badge: 'Production Examples',
  title: 'See the Full Pipeline',
  titleAccent: 'in Action',
  subtitle:
    'Each example below is a complete production — from Blueprint through Pre-Vis to final high-resolution video. Walk the Screening Room to compare animatics, individual scenes, and the finished master in multiple languages.',
  subtitleTagline: 'Long-form productions. Not clips.',
  screeningRoomInstruction:
    'Select Pre-Vis, Scenes, or Final to experience the pipeline. Select a language to hear the dub.',
  languagesBanner:
    'Public examples ship in 7 languages: English, Spanish, Portuguese, Hindi, Chinese, Arabic, and Thai.',
  explorePipelineCta: 'Explore a full production',
  explorePipelineHint:
    'Start with Cinematic Drama below to walk the full pipeline from concept to multi-language master.',
  workflowLabel: 'Solutions',
  startProduction: 'Start Your Production',
  cta: 'Start Your Production',
  continuityNote: 'Series Studio manages continuity',
  resonanceNote: 'Audience Resonance™ optimizes scripts',
  videoLanguagePrompt: 'Watch this production in your language',
  videoComingSoon: 'Dub coming soon',
  videoSoon: 'Soon',
  frictionLabel: 'The Friction',
  solutionPillarLabel: 'The SceneFlow Solution',
  showSolutionsSection: 'Show Solutions',
  hideSolutionsSection: 'Hide Solutions',
  cards: [
    {
      id: 'drama',
      title: 'Feature-Length Cinematic Drama. Zero Character Drift.',
      subtitle:
        'Hold character faces, wardrobe, and locations from scene 1 to scene 100. Walk the Screening Room to see the pre-vis animatic, individual scenes, and the final high-resolution master — then switch languages to hear the full dub.',
      badge: 'Series-Ready',
      solutionPillars: [
        {
          title: 'Visual & Character Consistency',
          frictionHeadline: 'Character Drift & Wobbly Sets.',
          friction:
            'Generative models reset with every shot — causing character faces, outfits, and lighting to morph continuously across scene cuts.',
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
            'Dynamic voice performance and precise lip-sync are baked directly into the video pipeline — delivering believable dialogue without external post-production passes.',
        },
        {
          title: 'Workflow Friction & Reroll Fatigue',
          frictionHeadline: 'Asset Chaos & Endless Rerolls.',
          friction:
            'Generating a short film usually means juggling 200+ raw video files, manual upscaling, and dozens of wasted generations.',
          solutionHeadline: 'Automated Studio Pipeline.',
          solution:
            "From concept to final master MP4 in one unified platform. Blueprint Studio handles story setup, the Writer's Room and Motion sections automate rendering, and Screening Room delivers your final export.",
        },
      ],
      screeningRoomPreview: 'The Cinematic Drama — Screening Room',
    },
    {
      id: 'animation',
      title: 'Full-Season Animated Series. One Consistent Art Style.',
      subtitle:
        'Lock character designs, line weights, and shading models across an entire season. Direct comedic timing beat by beat, then review the assembled episode in the Screening Room.',
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
      screeningRoomPreview: 'The Animated Comedy — Screening Room',
    },
    {
      id: 'documentary',
      title: 'Long-Form Documentaries. Sustained Period Accuracy.',
      subtitle:
        'Maintain era-specific detail, narrator pacing, and expert-witness continuity across a 40-minute episode or multi-part series. Review the full timeline in the Screening Room before committing to high-res renders.',
      badge: 'Period-Accurate',
      solutionPillars: [
        {
          title: 'Era-Specific Visual Accuracy',
          frictionHeadline: 'Anachronistic Artifacts',
          friction:
            'Standard generative models routinely bleed modern objects, smartphone screens, or incorrect period clothing into historical re-enactments.',
          solutionHeadline: 'Historical Style Guardrails',
          solution:
            'Set exact temporal parameters — from 1920s film grain to 18th-century wardrobe textures — so every generated scene stays historically authentic.',
        },
        {
          title: 'Archival Cutaways & B-Roll Engine',
          frictionHeadline: 'Visual Monotony in Long Voiceovers',
          friction:
            'Pairing long-form narrator audio with static stock images leads to rapid viewer drop-off during deep dives.',
          solutionHeadline: 'Transcript-Driven B-Roll Engine',
          solution:
            'As your narrator discusses historical facts, SceneFlow automatically generates timed cinematic re-enactments, document overlays, and archival-style cutaways tied directly to the audio transcript.',
        },
        {
          title: 'Interview & Talking-Head Realism',
          frictionHeadline: 'Uncanny Expert Witnesses',
          friction:
            'Generated historians, investigators, or witnesses often look artificial, with floating jaw movements and unnatural eye contact.',
          solutionHeadline: 'Locked Expert Profiles & Vocal Sync',
          solution:
            'Maintain realistic, trustworthy interview setups with natural micro-expressions, accurate lip-sync, and consistent expert identities across multi-part series.',
        },
        {
          title: 'Episodic Pacing & Narrative Continuity',
          frictionHeadline: 'Fragmented Timeline Editing',
          friction:
            'Balancing narrator audio, re-enactments, evidence reveals, and tension-building pauses across a 40-minute episode usually takes weeks in traditional NLEs.',
          solutionHeadline: 'Beat-First Documentary Pipeline',
          solution:
            'Structure dramatic tension, suspenseful pauses, and evidence reveals visually inside Blueprint Studio, delivering a fully assembled master file in one seamless pass.',
        },
      ],
      screeningRoomPreview: 'Documentary Production — Screening Room',
    },
    {
      id: 'localization',
      title: 'Beyond Dubbing. Fully Localized Productions.',
      subtitle:
        'Same storyline, two cities: Houston, Texas and São Paulo, Brazil. SceneFlow doesn\'t just dub the audio — it localizes settings, cultural references, and on-screen text so each audience sees a production made for them.',
      badge: 'Localized',
      localeToggle: true,
      locales: [
        { id: 'houston', label: 'Houston, TX', lang: 'en' },
        { id: 'saopaulo', label: 'São Paulo, BR', lang: 'pt' },
      ],
      solutionPillars: [
        {
          title: 'Cultural Adaptation, Not Translation',
          frictionHeadline: 'Dubbing Is Not Localization.',
          friction:
            'Swapping the audio track leaves every cultural reference, location shot, and on-screen graphic targeting the wrong audience.',
          solutionHeadline: 'Blueprint-Level Localization.',
          solution:
            'Start a new Blueprint from the original Film Treatment. Adapt settings, character wardrobes, signage, and cultural context in the Blueprint Studio before a single frame is rendered.',
        },
        {
          title: 'Parallel Production Pipelines',
          frictionHeadline: 'One Region at a Time.',
          friction:
            'Traditional localization is sequential — finish the original, then manually rebuild for each market. Months of delay per region.',
          solutionHeadline: 'Concurrent Regional Pipelines.',
          solution:
            'Run multiple localized Blueprints in parallel. Each region gets its own production pipeline sharing the same narrative structure but with fully adapted visuals and dialogue.',
        },
        {
          title: 'Region-Specific Audience Resonance',
          frictionHeadline: 'One Script for Every Culture.',
          friction:
            'Humor, pacing, and emotional beats that land in Houston may fall flat in São Paulo. A single script cannot carry both.',
          solutionHeadline: 'Per-Region Resonance Tuning.',
          solution:
            'Audience Resonance analyzes each localized script against regional demographic profiles, flagging cultural mismatches before production begins.',
        },
      ],
      screeningRoomPreview: 'Localized Production Comparison — Screening Room',
    },
  ],
} as const

export type ProductionShowcaseCardId =
  (typeof PRODUCTION_SHOWCASE_COPY)['cards'][number]['id']
