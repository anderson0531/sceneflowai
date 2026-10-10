/** Production Examples section — display strings for landing i18n. */

export const PRODUCTION_SHOWCASE_COPY = {
  badge: 'Production Examples',
  title: 'See the Full Pipeline',
  titleAccent: 'in Action',
  subtitle:
    'Each example opens on a short trailer. The longform master — a complete production from Blueprint through Pre-Vis to the final cut — plays in the Screening Room.',
  subtitleTagline: 'Long-form productions. Not clips.',
  screeningRoomInstruction:
    'Select Pre-Vis, Rough Cut, Scenes, Trailer, or Final to experience the pipeline. Choose English, Spanish, Chinese, or Arabic to hear the dub.',
  trailerLabel: 'Trailer',
  watchLongform: 'Watch the longform',
  blueprintDoor: 'Blueprint',
  scriptArDoor: 'Audience Resonance',
  screeningRoomGroup: 'Screening Room',
  previsDoor: 'Pre-Vis',
  roughDoor: 'Rough Cut',
  scenesDoor: 'Scenes',
  finalDoor: 'Final',
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  explorerHandoff:
    'These links are a finished production. Explorer is where you make your own.',
  languagesBanner:
    'Public examples ship in 4 languages: English, Spanish, Chinese, and Arabic.',
  workflowLabel: 'Solutions',
  startProduction: 'Start Your Production',
  cta: 'Start Your Production',
  continuityNote: 'Series Room manages continuity',
  resonanceNote: 'Audience Resonance™ optimizes scripts',
  videoLanguagePrompt: 'Watch in English, Spanish, Chinese, or Arabic',
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
        'Hold character faces, wardrobe, and locations from scene 1 to scene 100. Walk the Screening Room to see the Pre-Vis, per-scene motion video, and the final ProRes 4K master — then switch languages to hear the full dub.',
      badge: 'Series-Ready',
      solutionPillars: [
        {
          title: 'Visual & Character Consistency',
          frictionHeadline: 'Character Drift & Wobbly Sets.',
          friction:
            'Generative models reset with every shot — causing character faces, outfits, and lighting to morph continuously across scene cuts.',
          solutionHeadline: 'Locked Asset Blueprints.',
          solution:
            'Define master character profiles, environments, and visual styles up front in Blueprint Room. SceneFlow enforces visual identity across every render to preserve narrative immersion.',
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
            'From concept to final master MP4 in one unified platform. Blueprint Room handles story setup, Production Stage runs Direction through Streams, and Screening Room delivers your final export.',
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
            'Structure dramatic tension, suspenseful pauses, and evidence reveals visually inside Blueprint Room, delivering a fully assembled master file in one seamless pass.',
        },
      ],
      screeningRoomPreview: 'Documentary Production — Screening Room',
    },
    {
      id: 'training',
      title: 'Multi-Module Training Series. One Locked Instructor.',
      subtitle:
        'Hold the instructor, classroom, and lesson graphics from the first module to the last quiz. Walk Blueprint, Audience Resonance, and the Screening Room — Pre-Vis, rough cut, scenes, and the finished course — then switch languages to hear the localized version.',
      badge: 'Curriculum-Ready',
      solutionPillars: [
        {
          title: 'Instructor & Setting Consistency',
          frictionHeadline: 'A Different Teacher Every Module.',
          friction:
            'Generative clips reset the instructor face, wardrobe, and classroom between lessons, so a course feels like a pile of unrelated videos.',
          solutionHeadline: 'Locked Instructor Blueprints.',
          solution:
            'Define the instructor, set, and visual system once in Blueprint Room. SceneFlow keeps that identity locked across every module.',
        },
        {
          title: 'Curriculum Pacing',
          frictionHeadline: 'Slides Chopped into Clips.',
          friction:
            'Turning a syllabus into disconnected prompts loses the lesson arc, the worked example, and the pause before a quiz.',
          solutionHeadline: 'Module-First Storyboarding.',
          solution:
            'Direct each module as a sequence of teaching beats — setup, demonstration, and check — before a frame is rendered.',
        },
        {
          title: 'Narration & On-Screen Teaching',
          frictionHeadline: 'Voice That Misses the Graphic.',
          friction:
            'Narration, captions, and diagrams drift apart, so learners hear one step while the picture shows another.',
          solutionHeadline: 'Synced Lesson Tracks.',
          solution:
            'Voice, captions, and on-screen teaching stay on the same beat, so each explanation lands with the visual that proves it.',
        },
        {
          title: 'Course Assembly',
          frictionHeadline: 'Weeks in an Editor.',
          friction:
            'Stitching modules, retakes, and localized versions in a traditional timeline turns a curriculum update into a production delay.',
          solutionHeadline: 'One Studio Pipeline.',
          solution:
            'Blueprint, Audience Resonance, and the Screening Room carry a module from outline to Pre-Vis, rough cut, scenes, and the finished course.',
        },
      ],
      screeningRoomPreview: 'The Training Series — Screening Room',
    },
  ],
} as const

export type ProductionShowcaseCardId =
  (typeof PRODUCTION_SHOWCASE_COPY)['cards'][number]['id']
