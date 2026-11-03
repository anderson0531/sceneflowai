/** Production Examples section — display strings for landing i18n. */
import { EXAMPLE_SERIES_INPUTS } from '@/config/landing/exampleSeriesInputs'

export const PRODUCTION_SHOWCASE_COPY = {
  badge: 'Production Examples',
  title: 'See the Full Pipeline',
  titleAccent: 'in Action',
  subtitle:
    'Each example opens on a short trailer. The longform master — a complete production from Blueprint through Pre-Vis to the final cut — plays in the Screening Room.',
  subtitleTagline: 'Long-form productions. Not clips.',
  screeningRoomInstruction:
    'Open the Screening Room first to experience the production the way a reviewer would — switch across Pre-Vis, Clips, Scenes, Chapters, Master, and Promo — then inspect the Series Room, Blueprint Room, and Production Stage underneath.',
  trailerLabel: 'Trailer',
  watchLongform: 'Watch the longform',
  seriesDoor: 'Series Room',
  blueprintDoor: 'Blueprint Room',
  scriptArDoor: 'Production Stage',
  screeningDoor: 'Screening Room',
  screeningRoomGroup: 'Screening Room',
  previsDoor: 'Pre-Vis',
  roughDoor: 'Rough Cut',
  scenesDoor: 'Scenes',
  finalDoor: 'Final',
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  showDetail: 'Show more detail',
  hideDetail: 'Hide detail',
  featuredPlayer: 'Featured Player',
  openPlayer: 'Open Player',
  featureModes: ['Pre-Vis', 'Clips', 'Scenes', 'Chapters', 'Master', 'Promo'],
  seriesPanel: {
    headerLabel: 'Series Bible & Episode 1',
    bibleTab: 'Series Bible',
    castTab: 'Locked Cast',
    episode1Tab: 'Ep. 1 & Ch. 1',
    seasonTab: 'Season',
    formatLabel: 'Format',
    durationLabel: 'Duration',
    artStyleLabel: 'Art Style',
    continuityLockLabel: 'Continuity Lock',
    loglineLabel: 'Logline',
    synopsisLabel: 'Series Synopsis & Visual Bible',
    lockedCastHeading: 'Locked Cast & Principal Continuity',
    inputs: Object.fromEntries(
      EXAMPLE_SERIES_INPUTS.map((series) => [
        series.cardId,
        {
          showTitle: series.showTitle,
          format: series.format,
          genre: series.genre,
          artStyle: series.artStyle,
          duration: series.duration,
          continuityLock: series.continuityLock,
          unitLabel: series.unitLabel,
          artLock: series.artLock,
          logline: series.logline,
          seriesSynopsis: series.seriesSynopsis,
          cast: series.cast.map((member) => ({
            name: member.name,
            role: member.role,
            descriptor: member.descriptor,
          })),
          episode1Synopsis: {
            episodeLabel: series.episode1Synopsis.episodeLabel,
            title: series.episode1Synopsis.title,
            duration: series.episode1Synopsis.duration,
            logline: series.episode1Synopsis.logline,
            synopsis: series.episode1Synopsis.synopsis,
            chapter1Title: series.episode1Synopsis.chapter1Title,
            chapter1Duration: series.episode1Synopsis.chapter1Duration,
            chapter1Synopsis: series.episode1Synopsis.chapter1Synopsis,
          },
          episodes: series.episodes.map((ep) => ({
            number: String(ep.number),
            title: ep.title,
            duration: ep.duration,
            synopsis: ep.synopsis,
          })),
        },
      ])
    ),
  },
  explorerHandoff:
    'These links are a finished production. Explorer is where you make your own.',
  languagesBanner:
    'Public examples ship in 7 languages: English, Spanish, Portuguese, Hindi, Chinese, Arabic, and Thai.',
  workflowLabel: 'Solutions',
  startProduction: 'Start Your Production',
  cta: 'Start Your Production',
  continuityNote: 'Series Room manages continuity',
  resonanceNote: 'Audience Resonance™ optimizes scripts',
  videoLanguagePrompt:
    'Watch in English, Spanish, Portuguese, Hindi, Chinese, Arabic, or Thai',
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
      title: 'Multi-Style Full-Season Animated Series. One Consistent Art Style.',
      subtitle:
        'Lock one flat-cel style, the Hart family, and the town of Millwick from the first episode to the last. Direct the joke beat by beat, then review the episode in the Screening Room.',
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
      screeningRoomPreview: 'Hart House — Screening Room',
    },
    {
      id: 'documentary',
      title: 'Long-Form Documentaries. The Rise of Intelligence.',
      subtitle:
        'Follow the rise of AI and superintelligence across continents. Each chapter looks like its own year — no modern objects in an early lab, no 1950s sets in the present.',
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
      screeningRoomPreview: 'The Long Thought — Screening Room',
    },
    {
      id: 'training',
      title: 'Curriculum-Ready Multi-Module Training Series. One Locked Chef.',
      subtitle:
        'One chef, one kitchen, five meals. The face, the coat, and the tiles stay locked from the broth to the last dessert.',
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
      screeningRoomPreview: 'Five Plates — Screening Room',
    },
    {
      id: 'podcast',
      title: 'Creator Channels & Video Podcasts. Upload Live Host Clips, Generate the World.',
      subtitle:
        'Pair your recorded studio camera feed with a locked desk co-host and cinema-grade historical or sci-fi reconstructions—then publish multi-language YouTube and Spotify Video streams in one click.',
      badge: 'Creator & Podcasts',
      solutionPillars: [
        {
          title: 'Hybrid Live Upload + AI Cinema',
          frictionHeadline: '40 Hours of Stock B-Roll Hunting.',
          friction:
            'Recording a 30-minute investigative podcast or lore episode takes an hour, but illustrating the story with repetitive stock clips or custom animation takes weeks.',
          solutionHeadline: 'Seamless Studio-to-Story Cutaways.',
          solution:
            'Upload your live on-camera host segments and intercut directly into SceneFlow-generated historical, scientific, or thriller reconstructions timed to your voice track.',
        },
        {
          title: 'Recurring Desk Co-Hosts & Set Continuity',
          frictionHeadline: 'Talking-Head Fatigue.',
          friction:
            'Static single-camera podcasts lose viewer retention during complex explanations without visual chemistry or dynamic desk staging.',
          solutionHeadline: 'Locked Sidekick & Studio Blueprints.',
          solution:
            'Anchor a recurring animated or photoreal desk companion—like The Why Files—alongside your live studio feed with consistent lighting, banter, and reaction beats.',
        },
        {
          title: 'Automated Pacing & Visual Evidence',
          frictionHeadline: 'Manual Timeline Assembly.',
          friction:
            'Syncing declassified documents, maps, sound effects, and dramatic music swells across a weekly 30-minute show creates unsustainable editing bottlenecks.',
          solutionHeadline: 'FlowDirector & Mixer Automation.',
          solution:
            'FlowDirector polishes visual continuity across every cutaway while Mixer and Streams balance voice, atmospheric SFX, and score automatically.',
        },
        {
          title: 'Global Multi-Language Channel Scaling',
          frictionHeadline: 'Single-Language Ceiling.',
          friction:
            'Hiring voice actors and re-editing timelines for Spanish, Portuguese, Hindi, or Arabic audio tracks is too expensive for independent channels.',
          solutionHeadline: 'One-Click Multi-Language Streams.',
          solution:
            'Generate localized audio and lip-synced cutaways across dozens of languages to multiply global YouTube AdSense and podcast sponsorship reach.',
        },
      ],
      screeningRoomPreview: 'The Midnight Frequency — Screening Room',
    },
    {
      id: 'memoir',
      title: 'Video Memoirs & Bespoke Client Studios. Turn Spoken Memories into Cinema.',
      subtitle:
        'Combine uploaded family interviews and vintage photos with age-locked period reenactments to launch a high-margin video memoir, reunion, and biography production service.',
      badge: 'New Business Model',
      solutionPillars: [
        {
          title: 'Unfilmed Memories Brought to Life',
          frictionHeadline: 'The Missing Footage Problem.',
          friction:
            'Families have hours of spoken stories from grandparents and a handful of faded photos, but zero video of the moments that defined their lives.',
          solutionHeadline: 'Age-Locked Period Reenactments.',
          solution:
            'Upload a real living-room interview and reference photos; SceneFlow locks the subject’s young likeness to recreate 1960s harbors, hometown streets, and milestone moments.',
        },
        {
          title: 'Turnkey Studio-in-a-Box Economics',
          frictionHeadline: '$25,000 Crew & Cast Costs.',
          friction:
            'Traditional biographical documentaries require actors, period wardrobe, location permits, and weeks of post-production—pricing out 99% of families and small businesses.',
          solutionHeadline: 'Solo-Operator Client Production.',
          solution:
            'Deliver broadcast-grade 20-to-30-minute legacy films, wedding/reunion tributes, and founder biographies in a single afternoon with high client margins.',
        },
        {
          title: 'Authentic Era & Keepsake Continuity',
          frictionHeadline: 'Generic Stock Footage Disconnect.',
          friction:
            'Generic stock clips feel impersonal and break the emotional truth of a family’s specific heritage, heirloom objects, and hometown.',
          solutionHeadline: 'Keepsake & Prop Reference Locks.',
          solution:
            'Lock real family heirlooms—a 1966 leather recipe book, a wedding ring, or a first storefront—so the exact object passes from the present-day interview into the historical reenactment.',
        },
        {
          title: 'Multi-Generational Language Sharing',
          frictionHeadline: 'Language Barriers Across Generations.',
          friction:
            'When grandparents speak one language and grandchildren speak another, recorded oral histories often go unwatched by the younger generation.',
          solutionHeadline: 'Multilingual Family Editions.',
          solution:
            'Deliver the finished memoir in both the storyteller’s native voice and localized editions so every branch of a global family can experience the story together.',
        },
      ],
      screeningRoomPreview: 'Letters Across the Water — Screening Room',
    },
  ],
} as const

export type ProductionShowcaseCardId =
  (typeof PRODUCTION_SHOWCASE_COPY)['cards'][number]['id']
