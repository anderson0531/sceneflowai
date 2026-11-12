/**
 * Cinematic 60s–90s Trailer Scripts for the six global SceneFlow example productions.
 * Powers the top "Imagine the Possibilities" cinematic video header and the
 * Production Examples trailer showcase.
 *
 * Shot prompts are engineered with explicit single-shot spatial blocking and
 * chronological physical action (0s–3s, 3s–7s, 7s–10s) to prevent generative
 * video model hallucinations, morphing, or unintended internal cuts.
 */

import {
  ANIMATED_SERIES_TRAILER_MP4,
  ANIMATED_SERIES_TRAILER_WEBM,
  CINEMATIC_DRAMA_TRAILER_MP4,
  CINEMATIC_DRAMA_TRAILER_WEBM,
  CREATOR_PODCAST_TRAILER_MP4,
  CREATOR_PODCAST_TRAILER_WEBM,
  DOCUMENTARY_TRAILER_MP4,
  DOCUMENTARY_TRAILER_WEBM,
  TRAINING_SERIES_TRAILER_MP4,
  TRAINING_SERIES_TRAILER_WEBM,
  VIDEO_MEMOIR_TRAILER_MP4,
  VIDEO_MEMOIR_TRAILER_WEBM,
  type ProductionWalkId,
} from '@/config/landing/productionPipelineDemo'

export type PossibilitiesCategoryButtonLabel =
  | 'Cinematic Drama'
  | 'Animated Series'
  | 'Documentaries'
  | 'Training Series'
  | 'Creator & Podcasts'
  | 'Video Memoirs'

export type TrailerBackgroundMusicSpec = {
  title: string
  styleAndMood: string
  bpmAndKey: string
  instrumentation: string
  mixLevel: string
  generationPrompt: string
}

export type TrailerShotBlock = {
  blockNumber: number
  title: string
  timecode: string
  timing: string
  inSceneDialogue?: string
  narrationVo?: string
  videoPrompt: string
  cameraAndLighting: string
  sfxAndMusic: string
  settleOn: string
}

export type ExampleTrailerReferenceLock = {
  token: string
  name: string
  role: string
  description: string
}

export type ExampleTrailerScript = {
  id: ProductionWalkId
  buttonLabel: PossibilitiesCategoryButtonLabel
  showTitle: string
  formatBadge: string
  runtimeLabel: string
  durationSeconds: number
  tagline: string
  logline: string
  artStyleLock: string
  continuityBadge: string
  webmSrc: string
  mp4Src: string
  backgroundMusic: TrailerBackgroundMusicSpec
  referenceLocks: readonly ExampleTrailerReferenceLock[]
  blocks: readonly TrailerShotBlock[]
}

export const IMAGINE_POSSIBILITIES_COPY = {
  headline: 'Imagine the Possibilities',
  subheadline: 'with SceneFlow Studio',
  categoriesAriaLabel: 'Imagine the Possibilities production categories',
  categories: {
    drama: 'Cinematic Drama',
    animation: 'Animated Series',
    documentary: 'Documentaries',
    training: 'Training Series',
    podcast: 'Creator & Podcasts',
    memoir: 'Video Memoirs',
  },
} as const

export const EXAMPLE_TRAILER_SCRIPTS: readonly ExampleTrailerScript[] = [
  // ============================================================================
  // 1. CINEMATIC DRAMA — "The White City Current" (90s · Completed Trailer)
  // ============================================================================
  {
    id: 'drama',
    buttonLabel: 'Cinematic Drama',
    showTitle: 'The White City Current',
    formatBadge: '6-Episode Sci-Fi Thriller · 90s Official Trailer',
    runtimeLabel: '1:30',
    durationSeconds: 90,
    tagline: 'Feature-Length Cinematic Drama. Zero Character Drift.',
    logline:
      'Forty feet beneath a frozen Chicago blackout, an isolated infrastructure archivist and a hunted reporter ignite a suppressed 1893 wireless energy manifold—and fight through two miles of sub-lakebed tunnels to liberate the city’s grid.',
    artStyleLock:
      'Anamorphic 2.39:1 Photorealism · 3200K Warm Tungsten vs Sub-Zero Slate & Violet-Teal Electromagnetic Induction Glow',
    continuityBadge: '4 Locked Cast Sheets · 4 Subterranean & Lakefront Sets · 1893 Copper Manifold',
    webmSrc: CINEMATIC_DRAMA_TRAILER_WEBM,
    mp4Src: CINEMATIC_DRAMA_TRAILER_MP4,
    backgroundMusic: {
      title: 'Subterranean Current (90s Hybrid Orchestral Thriller Score)',
      styleAndMood:
        'Tense neo-noir sci-fi thriller building from solitary subterranean mystery to a soaring, emotional heroic resolution.',
      bpmAndKey: '96 BPM · D Minor resolving to D Major at 1:20',
      instrumentation:
        'Solo close-mic cello, sub-bass heartbeat pulse, prepared felt piano, analog brass swells, and driving taiko/industrial percussion.',
      mixLevel: '25% volume (-12 dB) under dialogue and narration VO',
      generationPrompt:
        'Instrumental cinematic sci-fi drama trailer score, 90 seconds, 96 BPM, D minor. 0:00-0:20 intimate dark solo cello and felt piano notes with a slow sub-bass heartbeat pulse. 0:20-0:50 rising analog synth arpeggio, tense string tremolos, and metallic industrial percussion building urgency. 0:50-1:00 brief emotional solo piano breathing space. 1:00-1:20 relentless driving orchestral strings and brass horn blasts. 1:20-1:30 triumphant emotional resolution in D major fading into a warm, lingering piano and cello chord. Instrumental only, no vocals.',
    },
    referenceLocks: [
      {
        token: 'REF: CHAR_GIDEON',
        name: 'Gideon Croft (58)',
        role: 'Protagonist · Former Municipal Archivist',
        description:
          'African American man in his late 50s, grey hair and close-cropped beard, wire-rimmed spectacles, weathered charcoal wool archivist smock, calloused draftsman hands.',
      },
      {
        token: 'REF: CHAR_PIPER',
        name: 'Piper Hayes (32)',
        role: 'Co-Lead · Blacklisted Investigative Reporter',
        description:
          'Asian American woman in her early 30s, snow-dusted olive field parka, canvas messenger satchel, fierce eyes under violet-teal induction spill.',
      },
      {
        token: 'REF: CHAR_WARD',
        name: 'Julian Ward (46)',
        role: 'Antagonist · Senior Director of Corporate Risk',
        description:
          'Tailored matte-black tactical overcoat, bone-conduction earpiece, surgical calm under sterile high-contrast institutional lighting.',
      },
      {
        token: 'REF: CHAR_CLARA',
        name: 'Dr. Clara Vance-Croft (52)',
        role: 'Memory Anchor · Late Resonance Physicist',
        description:
          'Asian American woman in her 50s, slate lab coat beside copper-wound 1893 calibration rig in warm amber archival projections.',
      },
      {
        token: 'REF: PROP_MANIFOLD',
        name: '1893 Resonant Induction Manifold',
        role: 'Hero Prop Lock',
        description:
          'Victorian brass-and-copper toroidal coil assembly with glass vacuum tubes that emit a deep violet-teal electromagnetic corona when keyed.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'The Subterranean Vault & The Blackout Above',
        timecode: '0:00–0:10',
        timing: 'Motion 0:00–0:07 · Settle 0:07–0:10',
        narrationVo:
          'When a city is engineered to freeze in the dark, the truth hides forty feet beneath the ice.',
        videoPrompt:
          'Single continuous shot inside a 1906 brick freight-tunnel vault beneath Chicago. At 0.0s, REF: CHAR_GIDEON stands center-left in his charcoal wool archivist smock before a slate blackboard covered in differential equations, his right hand writing a final chalk symbol under a warm 3200K tungsten desk lamp. From 0.5s to 4.5s, overhead tunnel work-lights flicker twice as frost crystals shimmer along the vaulted brick ceiling and a brass perimeter bell mounted on the right wall begins vibrating. From 4.5s to 7.0s, Gideon stops writing, lowers the chalk to his side, and turns his head 60 degrees toward the dark tunnel archway at frame right. From 7.0s to 10.0s, he holds still in medium close-up, breath visible in the freezing air.',
        cameraAndLighting:
          'Slow 35mm anamorphic dolly push-in from medium wide to medium close-up; warm 3200K tungsten key light against cold blue-slate tunnel shadows. Single continuous take.',
        sfxAndMusic:
          'Distant subterranean rumble and metallic tripwire chime; background score at 25% volume opens with a low solo cello pulse.',
        settleOn:
          'Medium close-up of Gideon looking sharply toward the dark tunnel archway as his breath condenses in the cold air.',
      },
      {
        blockNumber: 2,
        title: 'The Intrusion & The Cipher',
        timecode: '0:10–0:20',
        timing: 'Motion 0:10–0:17 · Settle 0:17–0:20',
        inSceneDialogue:
          'PIPER HAYES: "Your wife didn’t die in a lab fire, Gideon. Vane-Calhoun killed her to bury this."',
        videoPrompt:
          'Single continuous over-the-shoulder two-shot in the brick tunnel vault. At 0.0s, REF: CHAR_PIPER stands center-right in her snow-dusted olive parka facing REF: CHAR_GIDEON in the left foreground across an oak drafting table. From 0.0s to 3.5s, Piper reaches into her canvas satchel with her right hand, pulls out an engraved 1893 brass cipher cylinder, and sets it firmly upright in the center of the oak table. From 3.5s to 7.0s, she slides a red-stamped corporate folder forward with her left hand while delivering her line directly to Gideon with urgent, steady eye contact. From 7.0s to 10.0s, Gideon’s right hand reaches into frame and touches the brass cylinder.',
        cameraAndLighting:
          '50mm anamorphic over-the-shoulder framing at T2.0 with a slow 10% push-in on Piper and the brass cylinder. Warm tungsten practical light on oak.',
        sfxAndMusic:
          'Solid metallic clink of brass on oak and crisp paper slide; tense string tremolos at 25% volume.',
        settleOn:
          'Tight framing on Piper’s fierce gaze and Gideon’s calloused hand resting on the 1893 brass cipher cylinder.',
      },
      {
        blockNumber: 3,
        title: 'Igniting the Faraday Protocol',
        timecode: '0:20–0:30',
        timing: 'Motion 0:20–0:27 · Settle 0:27–0:30',
        narrationVo:
          'In 1893, they built a wireless current for everyone. Tonight, it wakes up.',
        videoPrompt:
          'Single continuous medium shot at the oak workbench. At 0.0s, REF: CHAR_GIDEON stands center-left with both hands poised over REF: PROP_MANIFOLD while REF: CHAR_PIPER watches from center-right. From 0.0s to 3.5s, Gideon inserts the brass cipher cylinder vertically into the central copper core of REF: PROP_MANIFOLD and twists the heavy brass locking collar 90 degrees clockwise. From 3.5s to 7.0s, the glass vacuum tubes inside the manifold ignite with a bright violet-teal electromagnetic glow that casts shimmering cyan light across both of their faces while small iron washers on the table lift two inches into the air. From 7.0s to 10.0s, both characters hold still in awe as the violet corona stabilizes.',
        cameraAndLighting:
          'Low-angle 40mm anamorphic slow arc from left to right; interactive violet-teal plasma light illuminating Gideon’s spectacles and Piper’s face.',
        sfxAndMusic:
          'Mechanical brass lock click followed by a resonant electromagnetic hum; score swells at 25% volume with analog synth and strings.',
        settleOn:
          'Violet-teal induction light reflecting clearly in Gideon’s wire-rimmed spectacles.',
      },
      {
        blockNumber: 4,
        title: 'The Corporate Hunter',
        timecode: '0:30–0:40',
        timing: 'Motion 0:30–0:37 · Settle 0:37–0:40',
        inSceneDialogue:
          'JULIAN WARD: "An 1893 harmonic spike under Sector Four. Seal the sluices—nothing leaves those tunnels breathing."',
        videoPrompt:
          'Single continuous medium shot inside a dark glass operations center overlooking a blacked-out city skyline at night. At 0.0s, REF: CHAR_WARD stands centered in his tailored matte-black overcoat behind a transparent glass console glowing with a red subterranean grid map. From 0.0s to 3.5s, Ward leans forward slightly, places his left hand flat on the edge of the glass console, and watches a pulsing red circular beacon expand on the map. From 3.5s to 7.0s, he raises his right hand to touch his bone-conduction earpiece and speaks his command with cold, measured precision. From 7.0s to 10.0s, he lowers his hand and stares unblinking into the camera.',
        cameraAndLighting:
          '65mm anamorphic slow dolly push-in; cold steel-blue overhead institutional light with crimson map reflections on Ward’s cheekbones.',
        sfxAndMusic:
          'Low sonar-like telemetry alarm ping; low brass horn pulse in the background score at 25% volume.',
        settleOn:
          'Close medium shot of Julian Ward in surgical stillness against the dark skyline.',
      },
      {
        blockNumber: 5,
        title: 'Breach in the Freight Tunnels',
        timecode: '0:40–0:50',
        timing: 'Motion 0:40–0:47 · Settle 0:47–0:50',
        narrationVo:
          'Hunted by a private containment directorate across forgotten subterranean corridors.',
        videoPrompt:
          'Single continuous medium-wide tracking shot in a narrow brick service corridor. At 0.0s, orange sparks and white steam billow from the far background archway while REF: CHAR_GIDEON grips a large red cast-iron pressure wheel on the left brick wall and REF: CHAR_PIPER crouches beside him clutching the glowing manifold satchel. From 0.0s to 4.0s, Gideon pulls downward with both arms to wrench the cast-iron wheel counterclockwise, releasing a thick horizontal jet of white industrial steam across the corridor behind them as red tactical laser beams slice through the vapor. From 4.0s to 7.0s, Gideon grabs Piper’s right arm and guides her forward toward the camera. From 7.0s to 10.0s, they brace beside a heavy steel hatch in the foreground.',
        cameraAndLighting:
          '28mm anamorphic handheld backward tracking shot; backlit industrial steam pierced by crimson laser beams and violet satchel glow.',
        sfxAndMusic:
          'Roaring high-pressure steam valve release and distant breach thud; driving taiko percussion at 25% volume.',
        settleOn:
          'Gideon and Piper braced beside the foreground steel hatch as laser beams cut through the billowing steam behind them.',
      },
      {
        blockNumber: 6,
        title: 'Memory & Resolve in the Sub-Station',
        timecode: '0:50–1:00',
        timing: 'Motion 0:50–0:57 · Settle 0:57–1:00',
        inSceneDialogue:
          'GIDEON CROFT: "Two miles of pack ice between us and the Crib. We couple her manifold to the lake array—or the city dies in the dark."',
        videoPrompt:
          'Single continuous intimate two-shot inside a quiet derelict pneumatic mail station. At 0.0s, REF: CHAR_PIPER sits on a wooden crate at center-right while REF: CHAR_GIDEON kneels at center-left beside REF: PROP_MANIFOLD, which rests on the floor projecting a warm amber cone of light upward. From 0.0s to 3.5s, Gideon finishes securing a white gauze bandage over the left shoulder of Piper’s olive parka with both hands. From 3.5s to 7.0s, Gideon looks up into Piper’s eyes and delivers his line in a calm, resolute tone. From 7.0s to 10.0s, Piper nods firmly and grips the canvas strap of the manifold case with her right hand.',
        cameraAndLighting:
          '50mm anamorphic profile two-shot on a locked tripod; warm 3200K amber glow from the manifold contrasting with deep slate shadows.',
        sfxAndMusic:
          'Percussion drops out for an emotional solo piano motif at 25% volume over quiet subterranean drips.',
        settleOn:
          'Piper nodding to Gideon with her hand locked on the glowing manifold strap.',
      },
      {
        blockNumber: 7,
        title: 'The Sub-Lacustrine Traverse',
        timecode: '1:00–1:10',
        timing: 'Motion 1:00–1:07 · Settle 1:07–1:10',
        narrationVo:
          'Two miles beneath Lake Michigan’s pack ice, every frame holds its cast, its wardrobe, and its light.',
        videoPrompt:
          'Single continuous low-angle tracking shot inside a flooded 1890s cylindrical brick water-intake tunnel. At 0.0s, REF: CHAR_GIDEON and REF: CHAR_PIPER stand waist-deep in dark freezing water at center frame, holding the waterproofed violet-glowing manifold case between them as icicles hang from the curved brick ceiling. From 0.0s to 4.5s, both characters wade three deliberate steps forward toward the camera against chest-high ripples, lifting the glowing case ten inches above the water surface. From 4.5s to 7.0s, Gideon reaches out with his left hand to grip the rusted iron rungs of a vertical shaft ladder on the left wall. From 7.0s to 10.0s, both look upward toward the frost-covered hatch above.',
        cameraAndLighting:
          '35mm anamorphic water-level backward tracking shot; bioluminescent violet-teal spill from the case reflecting on dark rippling water.',
        sfxAndMusic:
          'Heavy water sloshing and groaning overhead lake ice; accelerating string ostinato at 25% volume.',
        settleOn:
          'Gideon and Piper at the base of the iron ladder looking up as frost falls from the shaft above.',
      },
      {
        blockNumber: 8,
        title: 'Stand on the Gale-Swept Gantry',
        timecode: '1:10–1:20',
        timing: 'Motion 1:10–1:17 · Settle 1:17–1:20',
        inSceneDialogue:
          'PIPER HAYES: "Broadcast is live! Light it, Gideon—now!"',
        videoPrompt:
          'Single continuous medium-wide shot on the exterior iron gantry of the offshore Two-Mile Crib in a night blizzard. At 0.0s, REF: CHAR_PIPER kneels at center-left locking a brass cable into REF: PROP_MANIFOLD while REF: CHAR_GIDEON stands at center-right gripping a tall Victorian iron flood-gate lever with both hands. From 0.0s to 3.5s, Piper looks up through blowing snow and shouts her line to Gideon. From 3.5s to 7.0s, Gideon throws his full body weight forward to pull the iron lever down 45 degrees into its locked slot, triggering a brilliant vertical column of violet-white electrical light from the manifold behind them. From 7.0s to 10.0s, both shield their eyes slightly as the tower hums with steady golden-violet light.',
        cameraAndLighting:
          '35mm anamorphic low-angle frame in driving snow; intense violet-white arc lighting illuminating both characters against the dark lake.',
        sfxAndMusic:
          'Metallic lever clank, thunderous harmonic discharge, and full orchestral brass climax at 25% volume.',
        settleOn:
          'Gideon and Piper illuminated by the steady violet-gold resonance column on the icy gantry.',
      },
      {
        blockNumber: 9,
        title: 'The Harmonic Transmission & SceneFlow Signature',
        timecode: '1:20–1:30',
        timing: 'Motion 1:20–1:26 · Settle 1:26–1:30',
        narrationVo:
          'The White City Current. Six episodes, zero character drift—directed from script to master in SceneFlow. Imagine the possibilities.',
        videoPrompt:
          'Single continuous wide shot from behind REF: CHAR_GIDEON and REF: CHAR_PIPER on the offshore crib at dawn. At 0.0s, REF: CHAR_GIDEON and REF: CHAR_PIPER stand side by side at the icy iron railing facing the dark frozen expanse of Lake Michigan. From 0.0s to 4.5s, a luminous ring of violet-gold light expands smoothly across the frozen surface of Lake Michigan toward the distant Chicago skyline, where rows of dark skyscrapers and shoreline streetlamps progressively light up in warm golden waves from left to right. From 4.5s to 7.0s, Piper rests her gloved right hand on Gideon’s shoulder as both watch the illuminated city horizon. From 7.0s to 10.0s, the camera holds steady on their silhouettes against the glowing golden skyline. Single continuous take, no cuts.',
        cameraAndLighting:
          'Wide 35mm anamorphic slow pullback; breaking golden dawn light over the Newly lit skyline and soft violet rim light on both silhouettes.',
        sfxAndMusic:
          'Triumphant D-major orchestral resolution at 25% volume fading into a single warm piano chord.',
        settleOn:
          'Wide silhouette of Gideon and Piper facing the illuminated Chicago skyline at dawn.',
      },
    ],
  },

  // ============================================================================
  // 2. ANIMATED SERIES — "The Silt Line" (90s · Explicit Shot-Action Direction)
  // ============================================================================
  {
    id: 'animation',
    buttonLabel: 'Animated Series',
    showTitle: 'The Silt Line',
    formatBadge: 'Stylized 3D Maritime Cyber-Thriller · 90s Official Trailer',
    runtimeLabel: '1:30',
    durationSeconds: 90,
    tagline: 'Full-Season Animated Series. One Consistent Art Style.',
    logline:
      "When a predatory municipal councilor stages an automated floodgate failure to collect recovery bonds and seize Port Marrow's worker-owned waterfront collective, a sensory-strained 23-year-old technician and her sound-engineer partner infiltrate an offshore auction to secure her missing mother's black-box telemetry before their district is submerged.",
    artStyleLock:
      'Tactile Stylized 3D Animation · Heavy Industrial Dieselpunk Maritime Grit · Bioluminescent Cybernetic Accents & Chromatic Monocle Telemetry',
    continuityBadge:
      '5 Locked 3D Character Sheets · Port Marrow North Quay Workshop & Pier 14 Auction Barge · 3 Story Beats (32m)',
    webmSrc: ANIMATED_SERIES_TRAILER_WEBM,
    mp4Src: ANIMATED_SERIES_TRAILER_MP4,
    backgroundMusic: {
      title: 'North Quay Surge & Acoustic Anchor (90s Dieselpunk Cyber-Thriller Score)',
      styleAndMood:
        'Propulsive maritime industrial pulse blending bowed brass resonances, sub-bass tidal pressure, and crystalline cybernetic synth arpeggios into an emotionally grounded heroic crescendo.',
      bpmAndKey: '116 BPM · C Minor (shifting to F Dorian at 0:50, surging to Eb Major defiance at 1:10)',
      instrumentation:
        'Bowed iron percussion, deep sub-bass pulse, muted maritime French horns, warm analog vacuum-tube synth leads, and urgent chamber strings.',
      mixLevel: '25% volume (-12 dB) under dialogue and narration VO',
      generationPrompt:
        'Instrumental stylized 3D maritime cyber-thriller trailer score, 90 seconds, 116 BPM, C minor. 0:00-0:30 tense atmospheric bowed iron textures, deep tidal sub-bass pulse, and flickering analog vacuum-tube synth arpeggios. 0:30-0:60 escalating procedural infiltration rhythm with crisp industrial percussion and tense staccato strings. 0:60-1:10 emotional cello and warm acoustic resonance motif before building tension. 1:10-1:30 soaring heroic brass and kinetic synth crescendo ending on a resonant harbor horn and crisp cutoff. Instrumental only, no vocals.',
    },
    referenceLocks: [
      {
        token: 'REF: CHAR_JUNIPER',
        name: 'Juniper Finch (23)',
        role: 'Lead Diagnostic Technician · North Quay Collective',
        description:
          'Stylized 3D character sheet: grease-stained oilskin utility jacket, brass-and-cyan augmented optical monocle over right eye, salt-swept dark hair, calloused technician gloves.',
      },
      {
        token: 'REF: CHAR_TOBIAS',
        name: 'Tobias Wu (24)',
        role: 'Acoustic Telemetry Specialist · Co-Op Sound Engineer',
        description:
          'Stylized 3D character sheet: teal knit beanie, ochre weatherproof harbor jacket over hoodie, walnut-cup studio headphones around neck, canvas satchel packed with microphones and resonance rigs.',
      },
      {
        token: 'REF: CHAR_CRANE',
        name: 'Orville Crane',
        role: 'Municipal Councilor & Infrastructure Developer',
        description:
          'Stylized 3D character sheet: swept silver-white hair, tinted blue rectangular spectacles, impeccably tailored slate three-piece suit, silver cane glowing with a bioluminescent cyan key emblem.',
      },
      {
        token: 'REF: CHAR_ANDERSON',
        name: 'John Anderson',
        role: 'Chief Maritime Inspector',
        description:
          'Stylized 3D character sheet: weathered maritime authority coat with tarnished brass insignia, heavy-lidded cynical expression, gripping a rain-slicked harbor ledger.',
      },
      {
        token: 'REF: CHAR_HALLOWAY',
        name: 'Inspector Bram Halloway',
        role: 'Harbor District Investigator · Undercover Mentor',
        description:
          'Stylized 3D character sheet: salt-crusted Harbor District trench coat, honest weathered features, brass precinct badge, carrying a waterproof signal lantern.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'Submerged Floodgates of Port Marrow',
        timecode: '0:00–0:10',
        timing: 'Motion 0:00–0:07 · Settle 0:07–0:10',
        narrationVo:
          'In Port Marrow, the tides are automated—and someone just priced the working waterfront to drown.',
        videoPrompt:
          'Single continuous wide underwater-to-surface shot of Port Marrow’s salt-corroded cast-iron tidal surge gates in tactile stylized 3D animation. At 0.0s, massive riveted floodgates loom in bioluminescent cyan harbor water while swirling silt ribbons drift across the foreground. From 0.0s to 3.5s, amber warning beacons along the submerged iron crossbeams flicker twice and power down in sequence. From 3.5s to 7.0s, the camera cranes smoothly upward above the waterline to reveal neon salt-crusted docks and 1920s brass harbor towers under storm clouds. From 7.0s to 10.0s, heavy ocean swell surges against the North Quay seawall. Single continuous take, no camera cuts, locked stylized 3D dieselpunk textures.',
        cameraAndLighting:
          'Smooth vertical crane from submerged bioluminescent cyan depths to neon amber-and-teal storm light across Port Marrow.',
        sfxAndMusic:
          'Deep hydraulic groan and muffled underwater surge; bowed iron pulse and sub-bass score enter at 25% volume.',
        settleOn:
          'Wide establishing view of Port Marrow’s neon salt-crusted North Quay docks braced against rising dark tidewater.',
      },
      {
        blockNumber: 2,
        title: 'Decoding the Eviction Writ at North Quay',
        timecode: '0:10–0:20',
        timing: 'Motion 0:10–0:17 · Settle 0:17–0:20',
        inSceneDialogue:
          'JUNIPER FINCH: "This isn’t a storm warning—the surge gate failure is pre-scheduled inside the eviction code."',
        videoPrompt:
          'Single continuous medium close-up inside the North Quay worker-owned workshop cluttered with water-stained blueprints and flickering amber vacuum tubes. At 0.0s, REF: CHAR_JUNIPER leans over a cast-iron drafting table with a municipal eviction writ pinned beneath brass calipers. From 0.0s to 3.5s, Juniper rotates the brass dial of her augmented optical monocle, projecting cyan holographic stress lines above the paper. From 3.5s to 7.0s, she looks up toward the camera and delivers her line with razor-sharp intensity as chromatic telemetry waveforms reflect across her lens. From 7.0s to 10.0s, she winces briefly from sensory strain and steadies her gloved hand on the table edge. Single continuous take, no cuts.',
        cameraAndLighting:
          'Slow 50mm push-in on Juniper; warm 2800K vacuum-tube glow contrasted against crisp cyan holographic monocle light.',
        sfxAndMusic:
          'Precision brass lens clicks and crystalline telemetry hum; pulsing analog synth arpeggio at 25% volume.',
        settleOn:
          'Juniper’s determined gaze framed behind floating cyan floodgate telemetry projections.',
      },
      {
        blockNumber: 3,
        title: 'Tobias’s Neuro-Acoustic Anchor',
        timecode: '0:20–0:30',
        timing: 'Motion 0:20–0:27 · Settle 0:27–0:30',
        inSceneDialogue:
          'TOBIAS WU: "Breathe on the low frequency, June—lock onto Pier Fourteen and drop the noise."',
        videoPrompt:
          'Single continuous medium two-shot in the North Quay workshop. At 0.0s, REF: CHAR_JUNIPER presses two fingers to her temple beside the drafting table while REF: CHAR_TOBIAS stands at her left in his ochre jacket with his microphone satchel slung across his chest. From 0.0s to 3.5s, Tobias lifts a brass-and-walnut acoustic resonance tuner from his satchel and turns its knurled frequency dial, emitting a warm golden harmonic ring on his oscilloscope. From 3.5s to 7.0s, Tobias speaks calmly while resting a steadying hand on Juniper’s shoulder as the jagged chromatic distortion around the frame settles into crisp focus. From 7.0s to 10.0s, Juniper nods sharply and points to Pier 14 on the harbor blueprint. Single continuous take, no cuts.',
        cameraAndLighting:
          'Eye-level stylized 3D two-shot; flickering chromatic edge glow smoothing into warm amber workshop key light.',
        sfxAndMusic:
          'Warm low-frequency acoustic resonance tone clearing high-pitched static; steady percussion groove at 25% volume.',
        settleOn:
          'Tobias holding the glowing resonance tuner while Juniper locks onto Pier 14 on the stained blueprint.',
      },
      {
        blockNumber: 4,
        title: 'Councilman Crane’s Offshore Auction Gallery',
        timecode: '0:30–0:40',
        timing: 'Motion 0:30–0:37 · Settle 0:37–0:40',
        inSceneDialogue:
          'ORVILLE CRANE: "When the lower quay floods tonight, those parcels reopen tomorrow as sovereign luxury charters."',
        videoPrompt:
          'Single continuous medium shot inside the opulent brass-and-glass observation gallery of the Pier 14 offshore auction barge. At 0.0s, REF: CHAR_CRANE stands poised at center frame in his tailored slate three-piece suit and tinted blue spectacles, resting both hands atop his silver cane with its glowing cyan key emblem. From 0.0s to 3.5s, Crane turns slightly toward a holographic harbor zoning map showing North Quay highlighted in red default zones. From 3.5s to 7.0s, Crane delivers his line smoothly with a cold, measured half-smile while tapping his cane tip once against the polished brass floor plate. From 7.0s to 10.0s, storm lightning outside the panoramic window silhouettes his silver hair. Single continuous take, no cuts.',
        cameraAndLighting:
          'Slightly low-angle anamorphic 3D framing; cold cyan architectural uplighting against storm-lashed panoramic glass.',
        sfxAndMusic:
          'Sharp metallic cane tap and distant thunder; ominous low brass chord swells at 25% volume.',
        settleOn:
          'Orville Crane framed before the red-zoned Port Marrow hologram with his cyan key-cane gleaming.',
      },
      {
        blockNumber: 5,
        title: 'Oilskin Infiltration on Pier 14',
        timecode: '0:40–0:50',
        timing: 'Motion 0:40–0:47 · Settle 0:47–0:50',
        narrationVo:
          'Lock tactile 3D worlds, five principal characters, and signature visual mechanics across every storm-lashed beat.',
        videoPrompt:
          'Single continuous tracking shot along the rain-swept iron catwalks of the Pier 14 offshore auction barge at night. At 0.0s, REF: CHAR_JUNIPER and REF: CHAR_TOBIAS crouch in dark dockers’ oilskins behind a salt-corroded steam winch as rain lashes the grated deck. From 0.0s to 4.0s, Inspector REF: CHAR_HALLOWAY steps briefly into the amber bulkhead doorway ahead, flashes two discreet lantern signals toward the upper gantry, and draws patrol guards down the opposite corridor. From 4.0s to 7.0s, Juniper and Tobias sprint silently across the wet iron catwalk toward the lower-hold hatch. From 7.0s to 10.0s, Tobias braces the heavy iron wheel while Juniper couples her monocle lead to the junction box. Single continuous take, no cuts.',
        cameraAndLighting:
          'Dynamic lateral tracking shot following Juniper and Tobias; Volumetric rain streaks lit by neon harbor signage and amber bulkhead lamps.',
        sfxAndMusic:
          'Driving rain on cast iron and muffled bootsteps; escalating industrial percussion and strings at 25% volume.',
        settleOn:
          'Juniper splicing into the bulkhead junction box beside Tobias on the rain-slicked catwalk.',
      },
      {
        blockNumber: 6,
        title: 'The Moral Crucible in the Lower Hold',
        timecode: '0:50–1:00',
        timing: 'Motion 0:50–0:57 · Settle 0:57–1:00',
        inSceneDialogue:
          'JOHN ANDERSON: "Ten years I kept your perimeter, Crane—I won’t torch Eleanor’s archives with kids in the slipway."',
        videoPrompt:
          'Single continuous medium two-shot in the dim lower archive hold stacked with brass telemetry canisters and water-stained ledgers. At 0.0s, REF: CHAR_CRANE extends an unlit red incendiary flare toward REF: CHAR_ANDERSON beside an open vault of flood-baseline reels. From 0.0s to 3.5s, Anderson stares down at the flare in his weathered gloved hand, jaw tightening under decades of bureaucratic weariness. From 3.5s to 7.0s, Anderson looks up at Crane and speaks his line in a gravelly, defiant voice while lowering the flare away from the open archive shelf. From 7.0s to 10.0s, Crane’s expression hardens behind his tinted blue glasses as bilge water ripples across the iron floor. Single continuous take, no cuts.',
        cameraAndLighting:
          'Tight dramatic two-shot with slow dolly-in; harsh overhead cage-lamp shadows and bioluminescent cyan bilge reflections.',
        sfxAndMusic:
          'Metallic clink of archive canisters and rising bilge creak; tense Dorian cello line at 25% volume.',
        settleOn:
          'Anderson holding the lowered flare in quiet defiance opposite Crane’s cold stare.',
      },
      {
        blockNumber: 7,
        title: 'Eleanor’s Black-Box Telemetry Revealed',
        timecode: '1:00–1:10',
        timing: 'Motion 1:00–1:07 · Settle 1:07–1:10',
        narrationVo:
          'Experience true in-scene dialogue sync across seven global languages—without losing an ounce of emotional performance.',
        videoPrompt:
          'Single continuous close-to-medium shot on the upper iron catwalk overlooking the lower hold. At 0.0s, REF: CHAR_JUNIPER kneels beside an open brass telemetry terminal holding her vanished mother Eleanor’s black-box ledger module wired into her monocle. From 0.0s to 4.0s, Juniper slots the brass cipher key home; bioluminescent cyan waveforms blossom around her head as fractured holographic stress lines pulse across her monocle lens. From 4.0s to 7.0s, Juniper gasps in recognition as the decrypted floodgate override ledger illuminates her tear-streaked face while REF: CHAR_TOBIAS steadies her elbow from behind. From 7.0s to 10.0s, Juniper clutches the black-box ledger tightly to her chest. Single continuous take, no cuts.',
        cameraAndLighting:
          'Intimate handheld-feel 3D close-up pulling back slightly; intense cyan holographic data spill with chromatic aberration highlights.',
        sfxAndMusic:
          'Decryption chime and resonant vocal harmonic pulse; emotional chamber strings swell at 25% volume.',
        settleOn:
          'Juniper clutching Eleanor’s glowing black-box ledger with Tobias braced beside her.',
      },
      {
        blockNumber: 8,
        title: 'Sacrificial Sonic Blast in the Gallery',
        timecode: '1:10–1:20',
        timing: 'Motion 1:10–1:17 · Settle 1:17–1:20',
        inSceneDialogue:
          'TOBIAS WU: "Keep your buyout, Councilman—let’s hear how this glass handles resonant frequency!"',
        videoPrompt:
          'Single continuous wide action shot inside Crane’s panoramic auction gallery. At 0.0s, REF: CHAR_JUNIPER and REF: CHAR_TOBIAS stand cornered near the curved harbor windows while security enforcers advance from the left doorway behind REF: CHAR_CRANE. From 0.0s to 3.5s, Tobias plants his custom acoustic resonance rig onto the brass rail, cranks the gain dial into the red zone, and shouts his line. From 3.5s to 7.0s, a visible concentric shockwave ripples from the speaker horn and shatters the panoramic glass outward into glittering storm-lit shards as wind whips into the gallery. From 7.0s to 10.0s, Juniper and Tobias vault cleanly onto the exterior slipway deck with the black-box ledger. Single continuous take, no cuts.',
        cameraAndLighting:
          'Dynamic wide 3D cinema framing; explosive cyan-and-amber lighting contrast as storm spray bursts through the shattered gallery.',
        sfxAndMusic:
          'Sub-bass sonic boom and crystalline glass shatter; heroic brass and kinetic percussion surge at 25% volume.',
        settleOn:
          'Juniper and Tobias landing on the storm-swept exterior slipway outside the shattered panoramic gallery.',
      },
      {
        blockNumber: 9,
        title: 'Blast-Gate Redemption & Escape into the Storm',
        timecode: '1:20–1:30',
        timing: 'Motion 1:20–1:26 · Settle 1:26–1:30',
        narrationVo:
          'The Silt Line. Tactile 3D animation, directed from story bible to global release in SceneFlow. Imagine the possibilities.',
        videoPrompt:
          'Single continuous wide shot at the Pier 14 hydraulic slipway blast gates during the height of the harbor storm. At 0.0s, REF: CHAR_HALLOWAY stands on the inner iron platform gripping the manual hydraulic lock lever while REF: CHAR_JUNIPER and REF: CHAR_TOBIAS board a launch skiff in the foreground slipway channel. From 0.0s to 4.0s, Halloway hauls the heavy brass lever downward with both arms, driving twin cast-iron blast gates shut between himself and the pursuing security enforcers while offering Juniper one final nod through the narrowing gap. From 4.0s to 7.0s, Juniper gun-starts the skiff’s bioluminescent turbine and speeds out into Port Marrow harbor clutching the glowing ledger. From 7.0s to 10.0s, the camera holds on the skiff cutting toward the neon North Quay skyline. Single continuous take, no cuts.',
        cameraAndLighting:
          'Sweeping 35mm crane pullback from the locking hydraulic gates to the harbor channel; neon cyan-and-amber dock lights piercing dark storm spray.',
        sfxAndMusic:
          'Heavy hydraulic gate slam and turbine roar; triumphant brass finale chord at 25% volume resolving into a resonant harbor horn.',
        settleOn:
          'Juniper and Tobias racing across the neon-lit harbor waters toward North Quay with the black-box ledger.',
      },
    ],
  },

  // ============================================================================
  // 3. DOCUMENTARIES — "The Long Thought" (90s · Explicit Shot-Action Direction)
  // ============================================================================
  {
    id: 'documentary',
    buttonLabel: 'Documentaries',
    showTitle: 'The Long Thought',
    formatBadge: '5-Part Global Archival Documentary · 90s Official Trailer',
    runtimeLabel: '1:30',
    durationSeconds: 90,
    tagline: 'Long-Form Documentaries. Seventy Years, Twelve Cities, Zero Anachronisms.',
    logline:
      'Spanning seven decades and five continents, two recurring witnesses trace humanity’s quest to externalize reasoning—from 1956 electromagnetic relay rooms to the governance horizon of superintelligence.',
    artStyleLock:
      'Era-Guarded Archival Realism · 1956 16mm Grain → 1989 CRT Phosphor → Present-Day 4K Cinema Primes',
    continuityBadge: '2 Multi-Era Locked Witnesses · 12 Global Cities · Strict Temporal Guardrails',
    webmSrc: DOCUMENTARY_TRAILER_WEBM,
    mp4Src: DOCUMENTARY_TRAILER_MP4,
    backgroundMusic: {
      title: 'Seventy Years of Signal (90s Minimalist Chamber & Glass-Marimba Documentary Score)',
      styleAndMood:
        'Contemplative, intellectually hypnotic minimalist orchestral score (in the tradition of Philip Glass and Max Richter) evolving from intimate mechanical pulse to vast human wonder.',
      bpmAndKey: '108 BPM · A Minor to C Major modal shift',
      instrumentation:
        'Glass marimba, solo cello, muted felt piano arpeggios, warm analog modular pulse, and chamber string quartet.',
      mixLevel: '25% volume (-12 dB) under dialogue and narration VO',
      generationPrompt:
        'Instrumental prestige documentary trailer score, 90 seconds, 108 BPM, A minor. 0:00-0:20 hypnotic glass marimba and felt piano arpeggio with a single warm solo cello line. 0:20-0:50 subtle analog pulse and rhythmic pizzicato strings joining the marimba, evoking decades of scientific discovery. 0:50-1:15 soaring, emotional chamber string quartet counter-melody with rich harmonic warmth and human wonder. 1:15-1:30 orchestra strips back to a quiet, profound solo cello and single resonant piano note hanging in silence. Instrumental only, no vocals.',
    },
    referenceLocks: [
      {
        token: 'REF: CHAR_AMIRA_NOW',
        name: 'Dr. Amira Hassan (Age 64, Present Day)',
        role: 'Lead Witness · Mathematical Logician (London Archive)',
        description:
          'Egyptian-British woman (64), silver-streaked dark hair in a low twist, charcoal linen blazer over ivory blouse, warm intelligent eyes, contemporary 4K cinema interview framing.',
      },
      {
        token: 'REF: CHAR_AMIRA_1989',
        name: 'Dr. Amira Hassan (Age 28, 1989)',
        role: 'Young Lead Witness · 1989 Nairobi Hospital Records Lab',
        description:
          'Same facial structure at age 28; shoulder-length dark hair, 1980s cream cotton lab blouse, holding tractor-feed dot-matrix printout under 35mm archival film grain.',
      },
      {
        token: 'REF: CHAR_KENJI_NOW',
        name: 'Kenji Sato (Age 66, Present Day)',
        role: 'Co-Lead Witness · Control Systems Engineer (Tokyo Archive)',
        description:
          'Japanese man (66), silver hair, titanium rimless glasses, dark navy structured jacket, calm reflective presence in 4K interview framing.',
      },
      {
        token: 'REF: CHAR_KENJI_1991',
        name: 'Kenji Sato (Age 31, 1991)',
        role: 'Young Co-Lead Witness · 1991 Osaka Cleanroom',
        description:
          'Same facial structure at age 31; black hair, white 1991 lint-free anti-static smock and cap in amber sodium-vapor cleanroom light.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'The Room with the Switches (Manchester, 1956)',
        timecode: '0:00–0:10',
        timing: 'Motion 0:00–0:07 · Settle 0:07–0:10',
        narrationVo:
          'Before intelligence was a cloud, it was a room the size of a gymnasium—and a single switch left on through the night.',
        videoPrompt:
          'Single continuous medium shot inside a period-accurate 1956 electromagnetic relay computer room rendered in authentic 16mm Kodachrome film grain with zero modern objects. At 0.0s, a male engineer in a grey wool waistcoat and rolled white shirt sleeves stands center-right in profile beside a seven-foot steel rack of brass telephone relays and cloth-braided cables. From 0.0s to 3.5s, the engineer feeds a perforated 5-hole beige paper tape with his left hand through a brass optical reader guide on the rack. From 3.5s to 7.0s, he reaches up with his right hand and flips a heavy black Bakelite toggle switch upward into the ON position, causing a row of small amber vacuum-tube indicator bulbs along the panel to glow warmly. From 7.0s to 10.0s, he holds his hand beside the switch while the paper tape advances steadily. Single continuous take, no scene cuts.',
        cameraAndLighting:
          '50mm vintage 16mm lens with slow dolly push-in toward the Bakelite switch and amber indicator bulbs; warm 3200K tungsten work-lamp key.',
        sfxAndMusic:
          'Rhythmic mechanical relay clicks and a crisp toggle switch snap; glass marimba and solo cello score enters at 25% volume.',
        settleOn:
          'Tight framing on the illuminated amber vacuum-tube bulbs and the flipped 1956 Bakelite toggle switch.',
      },
      {
        blockNumber: 2,
        title: 'The Witness in the London Archive (Present Day)',
        timecode: '0:10–0:20',
        timing: 'Motion 0:10–0:17 · Settle 0:17–0:20',
        inSceneDialogue:
          'DR. AMIRA HASSAN: "We didn’t set out to build a mind. We set out to test whether a machine could hold a rule—and change its own next step."',
        videoPrompt:
          'Single continuous medium close-up interview shot in a sunlit present-day London university archive room in razor-sharp 4K digital cinema. At 0.0s, REF: CHAR_AMIRA_NOW sits centered at an oak reading table in her charcoal linen blazer, holding a small brass spool of original 1956 5-hole punched paper tape in both hands. From 0.0s to 3.5s, she gently unrolls six inches of the perforated paper tape between her thumb and forefinger, looking down at the punched holes. From 3.5s to 7.0s, she raises her gaze directly toward the camera lens and delivers her line with calm, natural lip-sync and subtle expressive brow movement. From 7.0s to 10.0s, she rests the brass spool on the oak table and holds steady eye contact with the lens. Single continuous take, no cuts.',
        cameraAndLighting:
          '85mm cinema prime at T1.8 with shallow depth of field blurring the mahogany bookshelves behind her; soft 5200K window key light.',
        sfxAndMusic:
          'Subtle dry paper rustle in a quiet archive room; minimal felt piano and cello underscore at 25% volume.',
        settleOn:
          'Present-day Dr. Amira Hassan holding calm eye contact with the camera beside the 1956 paper tape spool.',
      },
      {
        blockNumber: 3,
        title: 'The Diagnostic Tree (Nairobi, 1989)',
        timecode: '0:20–0:30',
        timing: 'Motion 0:20–0:27 · Settle 0:27–0:30',
        narrationVo:
          'By the late eighties, the rule left the laboratory—and began arguing with the experts beside it.',
        videoPrompt:
          'Single continuous medium two-shot inside a period-locked 1989 Nairobi hospital records room shot on 35mm documentary film stock with zero flatscreens or modern props. At 0.0s, REF: CHAR_AMIRA_1989 sits on the left before a boxy beige CRT monitor glowing with green monochrome text, while an older male clinician in a white coat stands on the right beside a beige dot-matrix printer. From 0.0s to 3.5s, the dot-matrix printer feeds up a sheet of green-bar tractor-feed paper; young Amira tears the perforated strip cleanly along the acrylic edge with her right hand. From 3.5s to 7.0s, she places the printout on the desk between them and circles a diagnostic line with a red uncapped pen while the clinician leans in to inspect it. From 7.0s to 10.0s, both look from the circled paper back to the glowing green CRT screen. Single continuous take, no cuts.',
        cameraAndLighting:
          '35mm documentary prime with gentle handheld breathing; green CRT phosphor glow on their faces balanced with warm overhead fluorescent tubes.',
        sfxAndMusic:
          'Short dot-matrix printer buzz, paper tear, and felt-pen stroke; pulsing analog bass joins the marimba at 25% volume.',
        settleOn:
          'Young Amira and the clinician studying the red-circled line illuminated by green CRT phosphor light.',
      },
      {
        blockNumber: 4,
        title: 'The Silicon Floor (Osaka, 1991)',
        timecode: '0:30–0:40',
        timing: 'Motion 0:30–0:37 · Settle 0:37–0:40',
        inSceneDialogue:
          'KENJI SATO: "The line stopped itself at 3 A.M. For the first time, the sensor trusted its own threshold over the foreman."',
        videoPrompt:
          'Single continuous medium shot inside a 1991 Osaka semiconductor cleanroom corridor lit by amber sodium-vapor light. At 0.0s, REF: CHAR_KENJI_1991 stands center-left in his white lint-free anti-static smock looking through an interior glass partition at a stationary yellow robotic wafer arm on the right whose status beacon blinks amber. From 0.0s to 3.5s, young Kenji raises a 1991 monochrome LCD clipboard in his left hand and compares the telemetry readout to the halted robotic arm. From 3.5s to 7.0s, he places his right palm gently against the cleanroom glass partition as the amber beacon reflects in his glasses. From 7.0s to 10.0s, he turns his head 45 degrees toward the camera in contemplative stillness. Single continuous take, no cuts.',
        cameraAndLighting:
          '40mm anamorphic slow lateral track left-to-right along the cleanroom glass; monochromatic amber cleanroom lighting with crisp glass reflections.',
        sfxAndMusic:
          'Steady low cleanroom ventilation hum and soft electronic status beep; chamber strings build at 25% volume.',
        settleOn:
          'Young Kenji in profile with the blinking amber robotic wafer arm reflected in the cleanroom glass.',
      },
      {
        blockNumber: 5,
        title: 'The Classroom Question (São Paulo, 2014)',
        timecode: '0:40–0:50',
        timing: 'Motion 0:40–0:47 · Settle 0:47–0:50',
        narrationVo:
          'Then the model crossed the threshold into every newsroom, classroom, and kitchen on earth.',
        videoPrompt:
          'Single continuous medium shot inside a sunlit São Paulo high school science classroom in 2014 digital cinema. At 0.0s, a 16-year-old female student in a navy school polo stands center-right beside a wooden lab desk where a projector casts a glowing blue translation tree onto a pull-down screen on the left wall, while three classmates sit watching in the background. From 0.0s to 3.5s, the student types a short phrase onto a silver laptop keyboard on the desk with both hands. From 3.5s to 7.0s, the projected diagram on the wall updates with a new branching sentence; the student steps toward the screen, points at the bottom branch with her left hand, and turns back toward her classmates with an expression of genuine discovery. From 7.0s to 10.0s, her classmates lean forward nodding as the projector light catches her face. Single continuous take, no cuts.',
        cameraAndLighting:
          '50mm observational documentary framing; warm afternoon Brazilian sunlight mixing with cool blue projector spill.',
        sfxAndMusic:
          'Soft keyboard taps and quiet classroom murmur; arpeggiated chamber strings swell at 25% volume.',
        settleOn:
          'The student smiling beside the projected translation tree as her classmates lean in.',
      },
      {
        blockNumber: 6,
        title: 'The Night Harbor (Rotterdam, Present Day)',
        timecode: '0:50–1:00',
        timing: 'Motion 0:50–0:57 · Settle 0:57–1:00',
        narrationVo:
          'Today, across continents and oceans, systems coordinate work that human hands began.',
        videoPrompt:
          'Single continuous medium-wide shot inside a glass-walled harbor control tower overlooking the Port of Rotterdam container terminal in present-day 4K night cinema. At 0.0s, a female harbor logistics planner in a dark wool sweater stands centered in silhouette facing floor-to-ceiling rain-streaked windows, holding a glowing tablet in her left hand while automated orange gantry cranes move smoothly across the illuminated dock below. From 0.0s to 4.0s, she taps a route confirmation on the tablet with her right index finger; out through the window, a line of amber guide lights along the wet pier illuminates sequentially from left to right. From 4.0s to 7.0s, she lowers the tablet slightly and watches an autonomous container carrier glide into position below. From 7.0s to 10.0s, she turns into three-quarter profile as cyan telemetry reflections shimmer on the window glass. Single continuous take, no cuts.',
        cameraAndLighting:
          '35mm cinema prime slow push-in toward the window; high-contrast nocturnal sodium-orange dock lights against cool cyan glass reflections.',
        sfxAndMusic:
          'Distant harbor foghorn and rain on glass; soaring polyrhythmic strings and marimba at 25% volume.',
        settleOn:
          'Three-quarter profile of the harbor planner against the illuminated night geometry of Rotterdam port.',
      },
      {
        blockNumber: 7,
        title: 'The Engineer’s Reflection (Tokyo Archive, Present Day)',
        timecode: '1:00–1:10',
        timing: 'Motion 1:00–1:07 · Settle 1:07–1:10',
        narrationVo:
          'Every decade locked to its true lenses, wardrobe, and machines—synced automatically to the narrator’s transcript.',
        videoPrompt:
          'Single continuous medium close-up shot inside a quiet present-day Tokyo robotics archive in 4K cinema. At 0.0s, REF: CHAR_KENJI_NOW stands at center frame behind a black anti-static workbench holding a vintage 1991 gold-pinned ceramic microprocessor chip in his gloved right hand beside a glowing modern translucent optical wafer on a stand. From 0.0s to 4.0s, Kenji slowly raises the 1991 ceramic chip to eye level, aligning it in the foreground beside the softly glowing modern wafer so both eras of hardware sit side by side in the same frame. From 4.0s to 7.0s, he sets the vintage chip gently onto a velvet tray and looks up into the camera lens through his titanium glasses. From 7.0s to 10.0s, he holds a calm, contemplative gaze. Single continuous take, no cuts.',
        cameraAndLighting:
          '65mm macro-capable cinema prime at T2.0; soft overhead diffused key light with warm gold reflections off the silicon wafer.',
        sfxAndMusic:
          'Quiet metallic click of the ceramic chip on the tray; strings sustain a resonant harmonic chord at 25% volume.',
        settleOn:
          'Present-day Kenji Sato looking directly into the lens behind the 1991 chip and modern optical wafer.',
      },
      {
        blockNumber: 8,
        title: 'The Question Ahead (The Governance Horizon)',
        timecode: '1:10–1:20',
        timing: 'Motion 1:10–1:17 · Settle 1:17–1:20',
        inSceneDialogue:
          'KENJI SATO: "What does a system smarter than its makers owe the nurse, the composer, and the billion people who never got a vote?"',
        videoPrompt:
          'Single continuous medium two-shot in a high-ceilinged contemporary archive room at dusk. At 0.0s, REF: CHAR_AMIRA_NOW sits on the left and REF: CHAR_KENJI_NOW sits on the right across a long wooden table where a 1956 leather lab notebook and a modern brushed-steel drive rest between them. From 0.0s to 4.0s, Kenji leans slightly forward, folds his hands on the table edge, and delivers his line with quiet, unhurried gravitas while Amira listens attentively. From 4.0s to 7.0s, Amira nods once and places her right hand gently atop the closed 1956 leather notebook. From 7.0s to 10.0s, both witnesses turn their heads slightly to look directly into the camera lens in calm silence. Single continuous take, no cuts.',
        cameraAndLighting:
          '50mm cinema prime locked master two-shot; deep twilight blue window light balanced with a warm 3200K brass table lamp.',
        sfxAndMusic:
          'Full ensemble strips back to a single sustained cello harmonic at 25% volume.',
        settleOn:
          'Amira and Kenji seated across the archive table looking directly into the camera lens.',
      },
      {
        blockNumber: 9,
        title: 'The Unfinished Switch & SceneFlow Signature',
        timecode: '1:20–1:30',
        timing: 'Motion 1:20–1:26 · Settle 1:26–1:30',
        narrationVo:
          'The Long Thought. Five episodes, twelve cities, seventy years of history—directed in SceneFlow. Imagine the possibilities.',
        videoPrompt:
          'Single continuous macro close-up shot on the oak archive table at dusk. At 0.0s, the vintage 1956 brass Bakelite toggle switch assembly sits on the left beside a glowing blue fiber-optic core module on the right. From 0.0s to 4.0s, REF: CHAR_AMIRA_NOW’s right hand enters calmly from the left of frame and rests her fingertips lightly atop the brass 1956 switch housing without flipping it. From 4.0s to 7.0s, the blue fiber-optic module on the right pulses once with a soft cyan-white light that illuminates the grain of the oak table and the brass switch. From 7.0s to 10.0s, her hand remains still beside both artifacts as the light holds steady. Single continuous take, no cuts.',
        cameraAndLighting:
          '85mm macro prime slow push-in; warm tungsten highlight on the 1956 brass balanced with cool cyan fiber-optic glow.',
        sfxAndMusic:
          'A single resonant relay click echoing into a deep, lingering piano and cello chord at 25% volume.',
        settleOn:
          'Macro close-up of Amira’s hand resting beside the 1956 brass switch and glowing modern fiber-optic core.',
      },
    ],
  },

  // ============================================================================
  // 4. TRAINING SERIES — "Five Plates" (75s · Explicit Shot-Action Direction)
  // ============================================================================
  {
    id: 'training',
    buttonLabel: 'Training Series',
    showTitle: 'Five Plates',
    formatBadge: '5-Module Culinary Curriculum · 75s Official Trailer',
    runtimeLabel: '1:15',
    durationSeconds: 75,
    tagline: 'Curriculum-Ready Multi-Module Training Series. One Locked Chef.',
    logline:
      'One executive chef, one sunlit teaching kitchen, and five progressive meals—demonstrating real physical craft across synced multi-camera angles from foundational clear broth to a five-plate graduation service.',
    artStyleLock:
      'Natural Daylight Culinary Studio · 3-Camera Instructional Rig (A-Cam Medium, 90° Overhead B-Cam, 100mm Macro C-Cam)',
    continuityBadge: '1 Locked Instructor (Chef Lila Mensah) · 2 Cohort Apprentices · Harbor Street Kitchen',
    webmSrc: TRAINING_SERIES_TRAILER_WEBM,
    mp4Src: TRAINING_SERIES_TRAILER_MP4,
    backgroundMusic: {
      title: 'Mise en Place & Craft (75s Warm Acoustic Culinary Studio Score)',
      styleAndMood:
        'Crisp, articulate, inspiring acoustic studio groove that mirrors precision handcraft and builds to a warm, proud graduation table.',
      bpmAndKey: '104 BPM · C Major',
      instrumentation:
        'Fingerstyle steel-string acoustic guitar, warm upright bass, light brushed snare/shaker, marimba accents, and solo violin/cello harmony.',
      mixLevel: '25% volume (-12 dB) under dialogue and narration VO',
      generationPrompt:
        'Instrumental warm culinary instructional series trailer score, 75 seconds, 104 BPM, C major. 0:00-0:20 clean fingerpicked acoustic guitar and warm upright bass with crisp brushed percussion evoking focus and craftsmanship. 0:20-0:50 steady rhythmic build with wooden marimba accents and warm acoustic strumming. 0:50-1:15 uplifting cello and violin melody joining the acoustic ensemble for a proud, celebratory masterclass finish, ending on a clean resonant acoustic guitar chord. Instrumental only, no vocals.',
    },
    referenceLocks: [
      {
        token: 'REF: CHAR_LILA',
        name: 'Chef Lila Mensah (38)',
        role: 'Lead Instructor · Locked Identity & Wardrobe',
        description:
          'Black female Executive Chef-Instructor (38), close-cropped natural hair, crisp white double-breasted chef coat with black piping, slate-grey bib apron, calm authoritative smile.',
      },
      {
        token: 'REF: CHAR_MARCUS',
        name: 'Marcus Cole (26)',
        role: 'Apprentice Cohort Cook · Bench #2',
        description:
          'Male culinary apprentice (26) in a navy short-sleeve chef jacket and charcoal apron at the rear left prep station.',
      },
      {
        token: 'REF: CHAR_PRIYA',
        name: 'Priya Nair (24)',
        role: 'Apprentice Cohort Cook · Bench #3',
        description:
          'South Asian female culinary apprentice (24) in a charcoal chef jacket with hair tied back in a neat bun at the rear right prep station.',
      },
      {
        token: 'REF: LOC_HARBOR_KITCHEN',
        name: 'Harbor Street Teaching Kitchen',
        role: 'Locked Studio Set',
        description:
          'Sunlit industrial brick and sage-green ceramic subway tiles, brushed-steel central island with maple butcher block, hanging copper saucepans.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'One Chef, One Kitchen, Five Meals (A-Cam Master)',
        timecode: '0:00–0:10',
        timing: 'Motion 0:00–0:07 · Settle 0:07–0:10',
        inSceneDialogue:
          'CHEF LILA MENSAH: "Five plates. One kitchen. Every dish teaches your hands what the next dish will demand."',
        videoPrompt:
          'Single continuous medium shot inside REF: LOC_HARBOR_KITCHEN bathed in bright morning daylight. At 0.0s, REF: CHAR_LILA stands centered behind the maple butcher-block island in her white double-breasted coat and slate apron, while REF: CHAR_MARCUS on the rear left and REF: CHAR_PRIYA on the rear right stand at stainless prep benches. From 0.0s to 3.5s, Chef Lila pulls the slate apron strings snug at her waist and places a folded white kitchen towel neatly to the right of her cutting board. From 3.5s to 7.0s, she rests both palms flat on the front edge of the maple butcher block, leans slightly toward A-Cam, and delivers her line with warm, steady lip-sync. From 7.0s to 10.0s, she nods welcomingly to the lens while Marcus and Priya stand ready behind her. Single continuous take, no cuts.',
        cameraAndLighting:
          '50mm A-Cam slow dolly-in; 5600K natural daylight from left studio windows catching the green ceramic tiles and copper pans.',
        sfxAndMusic:
          'Crisp linen apron tie and soft studio room tone; fingerstyle acoustic guitar and upright bass enter at 25% volume.',
        settleOn:
          'Chef Lila centered at the maple island with her hands resting calmly on the cutting board.',
      },
      {
        blockNumber: 2,
        title: 'Module 1: The Broth — Clarifying the Simmer (C-Cam Macro)',
        timecode: '0:10–0:20',
        timing: 'Motion 0:10–0:17 · Settle 0:17–0:20',
        narrationVo:
          'Forget static slide readers. Direct multi-camera physical demonstrations synced to every teaching beat.',
        videoPrompt:
          'Single continuous close-up angle at the stove inside REF: LOC_HARBOR_KITCHEN. At 0.0s, a heavy hammered-copper stockpot sits centered on a low blue gas flame filled with clear golden consommé broth, while REF: CHAR_LILA stands in soft focus behind the pot holding a long-handled silver skimming ladle in her right hand. From 0.0s to 4.0s, a gentle convection bubble rises at the center of the golden broth; Chef Lila lowers the silver ladle smoothly at a shallow angle and skims across the surface from left to right. From 4.0s to 7.0s, she lifts a spoonful of crystal-clear golden broth four inches above the rim of the pot so the morning window light shines directly through the translucent liquid. From 7.0s to 10.0s, she holds the ladle steady in frame as wispy white steam curls upward. Single continuous take, no cuts.',
        cameraAndLighting:
          '85mm C-Cam close-up at T2.8 angled 30 degrees above the copper stockpot; backlit 5600K window light illuminating the rising steam and clear golden broth.',
        sfxAndMusic:
          'Quiet liquid simmer and gentle silver ladle dip; rhythmic acoustic guitar and marimba pulse at 25% volume.',
        settleOn:
          'A ladle of crystal-clear golden broth held steady in backlit steam above the copper pot.',
      },
      {
        blockNumber: 3,
        title: 'Module 2: The Bread — Scoring the Boule (Bench Two-Shot)',
        timecode: '0:20–0:30',
        timing: 'Motion 0:20–0:27 · Settle 0:27–0:30',
        inSceneDialogue:
          'CHEF LILA MENSAH: "Don’t watch the clock—read the dough. When it springs back halfway, the loaf is ready for the blade."',
        videoPrompt:
          'Single continuous medium two-shot at the flour-dusted maple workbench in REF: LOC_HARBOR_KITCHEN. At 0.0s, a round proofed sourdough boule rests centered on parchment paper; REF: CHAR_LILA stands on the left holding a wooden-handled curved baker’s lame in her right hand while REF: CHAR_PRIYA stands on the right watching closely. From 0.0s to 3.5s, Chef Lila presses her left index finger gently half an inch into the side of the dough boule and lifts her finger away as the indentation slowly springs halfway back while she speaks her line. From 3.5s to 7.0s, Lila draws the curved blade of the lame in one smooth, continuous crescent slash across the top of the flour-dusted boule from back to front. From 7.0s to 10.0s, the scored dough seam opens slightly as Priya nods in understanding. Single continuous take, no cuts.',
        cameraAndLighting:
          '50mm 45-degree bench two-shot on a locked tripod; crisp side daylight highlighting the white flour dust and scored dough texture.',
        sfxAndMusic:
          'Soft flour pat and the crisp whisper of the razor blade scoring taut dough; warm acoustic groove at 25% volume.',
        settleOn:
          'Chef Lila and Priya looking down at the cleanly scored sourdough boule on the maple bench.',
      },
      {
        blockNumber: 4,
        title: 'Module 3: The Vegetable Main — Pan Emulsion',
        timecode: '0:30–0:39',
        timing: 'Motion 0:30–0:36 · Settle 0:36–0:39',
        narrationVo:
          'Instructor face, wardrobe, and studio geometry stay locked from Lesson One to Lesson Five.',
        videoPrompt:
          'Single continuous medium shot at the gas range in REF: LOC_HARBOR_KITCHEN. At 0.0s, REF: CHAR_LILA stands centered holding the handle of a wide stainless sauté pan in her left hand over a medium flame containing roasted green brassicas, while holding a small ladle of golden broth in her right hand. From 0.0s to 3.5s, she pours the ladle of broth into the hot pan, sending up a bright puff of aromatic steam. From 3.5s to 6.5s, she sets the ladle down and swirls the sauté pan in three smooth circular wrist motions, emulsifying the broth and butter into a glossy glaze coating the greens. From 6.5s to 9.0s, she tilts the pan slightly toward the camera to show the glossy emulsion. Single continuous take, no cuts.',
        cameraAndLighting:
          '50mm medium shot with a subtle lateral slide; warm copper and stainless reflections against the sage-green tile wall.',
        sfxAndMusic:
          'Lively pan sizzle as broth hits hot steel; upbeat acoustic bass and brushed snare at 25% volume.',
        settleOn:
          'Chef Lila holding the tilted sauté pan showing the glossy emerald vegetable glaze.',
      },
      {
        blockNumber: 5,
        title: 'Module 4: The Celebration Roast — Butter Basting',
        timecode: '0:39–0:48',
        timing: 'Motion 0:39–0:45 · Settle 0:45–0:48',
        narrationVo:
          'Voice, captions, and on-screen technique land on the exact same beat.',
        videoPrompt:
          'Single continuous medium-close shot at the center island in REF: LOC_HARBOR_KITCHEN. At 0.0s, an herb-crusted roast rests inside a tilted copper pan on the stove while REF: CHAR_LILA stands on the left holding a large stainless basting spoon in her right hand and REF: CHAR_MARCUS stands on the right holding a digital probe thermometer. From 0.0s to 3.5s, Lila scoops foaming golden butter and rosemary sprigs from the lower edge of the tilted pan and pours two glossy spoonfuls over the top crust of the roast. From 3.5s to 6.5s, Marcus inserts the thin metal probe thermometer horizontally into the center of the roast and nods as the readout stabilizes. From 6.5s to 9.0s, Lila gives Marcus an approving nod beside the resting roast. Single continuous take, no cuts.',
        cameraAndLighting:
          '65mm medium-close framing; warm golden highlights on the foaming butter and copper pan rim.',
        sfxAndMusic:
          'Gentle foaming butter sizzle; warm cello line joins the acoustic guitar at 25% volume.',
        settleOn:
          'Chef Lila and Marcus beside the golden herb-crusted roast.',
      },
      {
        blockNumber: 6,
        title: 'Module 5: The Last Sweet — Caramel Pour (Overhead B-Cam)',
        timecode: '0:48–0:57',
        timing: 'Motion 0:48–0:54 · Settle 0:54–0:57',
        narrationVo:
          'Every module builds on the last—heat control, timing, seasoning, and composure.',
        videoPrompt:
          'Single continuous 90-degree top-down overhead shot over the maple workbench in REF: LOC_HARBOR_KITCHEN. At 0.0s, a white ceramic dessert plate sits centered on the wood surface holding a poached orchard pear beside a quenelle of white crème fraîche, while REF: CHAR_LILA’s hands enter from the top of frame holding a small copper saucepan of warm amber caramel in her right hand. From 0.0s to 4.0s, she tilts the copper saucepan and pours a thin, steady ribbon of glossy amber caramel in a slow clockwise spiral over the poached pear. From 4.0s to 6.5s, she lifts the saucepan cleanly away and places a single fresh mint leaf beside the pear with culinary tweezers in her left hand. From 6.5s to 9.0s, the finished plate sits centered in pristine symmetry. Single continuous take, no cuts.',
        cameraAndLighting:
          'Locked 90-degree overhead B-Cam rig; soft diffused daylight creating jewel-like highlights on the amber caramel.',
        sfxAndMusic:
          'Delicate clink of culinary tweezers on porcelain; gentle musical crescendo at 25% volume.',
        settleOn:
          'Top-down view of the finished poached pear and amber caramel dessert plate.',
      },
      {
        blockNumber: 7,
        title: 'The Five-Plate Graduation Service',
        timecode: '0:57–1:06',
        timing: 'Motion 0:57–1:03 · Settle 1:03–1:06',
        inSceneDialogue:
          'CHEF LILA MENSAH: "You didn’t just learn five recipes. You built a system that holds together when the kitchen gets hot."',
        videoPrompt:
          'Single continuous medium-wide three-shot behind the central pass in REF: LOC_HARBOR_KITCHEN. At 0.0s, four completed dishes—the golden broth bowl, the sliced sourdough loaf, the glazed vegetable main, and the carved roast—sit in a neat row along the maple counter while REF: CHAR_LILA stands centered flanked by REF: CHAR_MARCUS on the left and REF: CHAR_PRIYA on the right. From 0.0s to 3.5s, Chef Lila sets the fifth plate—the caramel poached pear dessert—down at the right end of the row to complete the five-plate line while speaking her line. From 3.5s to 6.5s, she looks warmly to Marcus and Priya, who both straighten their posture with proud smiles. From 6.5s to 9.0s, all three chefs stand together behind the completed five-course spread. Single continuous take, no cuts.',
        cameraAndLighting:
          '35mm wide master A-Cam framing; warm late-afternoon golden daylight across the green tiles and five completed plates.',
        sfxAndMusic:
          'Soft ceramic plate set-down on maple; uplifting full acoustic and string ensemble at 25% volume.',
        settleOn:
          'Chef Lila, Marcus, and Priya standing proudly behind all five finished dishes on the pass.',
      },
      {
        blockNumber: 8,
        title: 'The Completed Table & SceneFlow Signature',
        timecode: '1:06–1:15',
        timing: 'Motion 1:06–1:12 · Settle 1:12–1:15',
        narrationVo:
          'Five Plates. A complete multi-module training series—directed, synced, and mastered in SceneFlow. Imagine the possibilities.',
        videoPrompt:
          'Single continuous medium-wide shot at the sunlit maple island in REF: LOC_HARBOR_KITCHEN. At 0.0s, REF: CHAR_LILA stands centered with REF: CHAR_MARCUS on her left and REF: CHAR_PRIYA on her right behind the five finished plates, each holding a silver tasting spoon in their right hand. From 0.0s to 3.5s, all three raise their silver tasting spoons simultaneously toward the center of the island in a celebratory culinary toast and tap the edges of the spoons lightly together. From 3.5s to 6.0s, they look directly into the camera lens with warm, confident smiles. From 6.0s to 9.0s, the camera holds steady on the three smiling chefs and the five dishes in the foreground. Single continuous take, no cuts.',
        cameraAndLighting:
          'Slow 35mm dolly pullback; warm golden-hour studio light filling the Harbor Street Teaching Kitchen.',
        sfxAndMusic:
          'Bright metallic clink of three tasting spoons and a resonant C-major acoustic guitar chord at 25% volume.',
        settleOn:
          'Chef Lila, Marcus, and Priya smiling behind the five-plate spread in the sunlit studio kitchen.',
      },
    ],
  },

  // ============================================================================
  // 5. CREATOR & PODCASTS — "The Midnight Frequency" (75s · Explicit Shot-Action)
  // ============================================================================
  {
    id: 'podcast',
    buttonLabel: 'Creator & Podcasts',
    showTitle: 'The Midnight Frequency',
    formatBadge: 'Weekly Creator Channel & Video Podcast · 75s Official Trailer',
    runtimeLabel: '1:15',
    durationSeconds: 75,
    tagline: 'Upload Your Live Studio Clips. Generate the Cinematic World.',
    logline:
      'From a late-night broadcast desk, investigative host Devon Vance and his skeptical clockwork owl co-host unpack declassified mysteries—cutting seamlessly from uploaded studio camera takes into photorealistic 1928 Arctic reconstructions.',
    artStyleLock:
      'Hybrid Warm Walnut-and-Cyan Broadcast Studio (Live Host Upload) + 35mm Anamorphic 1928 Arctic Expedition Cinema',
    continuityBadge: 'Live Studio Host Upload · Clockwork Co-Host Orson · 1928 Svalbard Cast & Sets',
    webmSrc: CREATOR_PODCAST_TRAILER_WEBM,
    mp4Src: CREATOR_PODCAST_TRAILER_MP4,
    backgroundMusic: {
      title: 'Signal Beneath the Ice (75s Mystery Podcast & Investigative Lore Score)',
      styleAndMood:
        'Intriguing, atmospheric late-night mystery theme (inspired by investigative lore channels and sci-fi mystery podcasts) combining warm analog synth pulse with haunting Nordic strings.',
      bpmAndKey: '100 BPM · E Minor',
      instrumentation:
        'Warm Moog sub-bass pulse, muted electric guitar harmonics, clockwork celesta/glockenspiel ticks, solo viola, and deep cinematic braams.',
      mixLevel: '25% volume (-12 dB) under dialogue and narration VO',
      generationPrompt:
        'Instrumental investigative mystery podcast and creator channel trailer score, 75 seconds, 100 BPM, E minor. 0:00-0:20 intriguing late-night analog synth bass pulse and delicate clockwork celesta notes creating curiosity and suspense. 0:20-0:50 atmospheric solo viola and rhythmic muted percussion building a cinematic historical mystery vibe. 0:50-1:05 dramatic low brass swell and sonar-like synth resonance. 1:05-1:15 resolves into a sleek, memorable late-night broadcast signature chord with a clean sub-bass tail. Instrumental only, no vocals.',
    },
    referenceLocks: [
      {
        token: 'REF: CHAR_DEVON',
        name: 'Devon Vance (36)',
        role: 'Lead Host · Uploaded Live Studio Camera & Locked Double',
        description:
          'Male investigative host (36), short dark hair and trimmed stubble, slate-grey chore jacket over charcoal henley, seated at a walnut podcast desk with a black broadcast boom mic on an articulated arm.',
      },
      {
        token: 'REF: CHAR_ORSON',
        name: 'Orson the Clockwork Owl',
        role: 'Co-Host Sidekick · Locked Studio Desk Companion',
        description:
          'Twelve-inch mechanical barn owl crafted from brushed brass and copper feathers, perched on a brass stand on the right side of the studio desk with expressive amber glass lens eyes.',
      },
      {
        token: 'REF: CHAR_LINDQVIST',
        name: 'Captain Nils Lindqvist (48)',
        role: '1928 Expedition Lead · Locked Reconstruction Cast',
        description:
          'Norwegian acoustic engineer (48) in a frost-dusted brown sheepskin coat, heavy cable-knit turtleneck, and vintage black Bakelite headphones.',
      },
      {
        token: 'REF: LOC_MIDNIGHT_DESK',
        name: 'The Midnight Frequency Studio',
        role: 'Locked Broadcast Studio Set',
        description:
          'Acoustic slatted walnut back wall, glowing neon sign reading "ON AIR", warm 3200K key light on the host desk with cool cyan LED rim lighting.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'The Live Studio Hook & The 1928 Cylinder',
        timecode: '0:00–0:10',
        timing: 'Motion 0:00–0:07 · Settle 0:07–0:10',
        inSceneDialogue:
          'DEVON VANCE: "In November 1928, six acoustic engineers in Svalbard recorded a metallic bell two miles beneath solid ice—then walked away from their dinner."',
        videoPrompt:
          'Single continuous medium shot inside REF: LOC_MIDNIGHT_DESK. At 0.0s, REF: CHAR_DEVON sits centered behind the walnut studio desk speaking into a black broadcast boom mic on the left, while REF: CHAR_ORSON perches on his brass stand on the right side of the desk. From 0.0s to 3.5s, Devon lifts a weathered 1928 brass telegraph cylinder with his right hand and places it upright in the center of the desk under the warm key light while delivering his line with natural lip-sync. From 3.5s to 7.0s, Orson the brass owl tilts his mechanical head 30 degrees to the left as his amber glass eyes narrow in curiosity toward the cylinder. From 7.0s to 10.0s, Devon taps the brass cylinder once with his index finger and looks directly into the camera lens. Single continuous take, no cuts.',
        cameraAndLighting:
          '50mm broadcast studio A-Cam with a slow 8% push-in; warm 3200K key light on Devon balanced with cyan LED rim light on the walnut slats.',
        sfxAndMusic:
          'Heavy brass cylinder thud on walnut and tiny clockwork gear whirr from Orson; mystery synth pulse enters at 25% volume.',
        settleOn:
          'Devon and Orson framing the 1928 brass cylinder on the studio desk.',
      },
      {
        blockNumber: 2,
        title: 'Pressing Play on the Declassified Tape',
        timecode: '0:10–0:20',
        timing: 'Motion 0:10–0:17 · Settle 0:17–0:20',
        narrationVo:
          'Upload your live studio camera takes—and let SceneFlow generate the cinematic world around your voice.',
        videoPrompt:
          'Single continuous medium-close shot at the walnut desk in REF: LOC_MIDNIGHT_DESK. At 0.0s, a vintage silver reel-to-reel audio deck sits on the left of the desk beside REF: CHAR_DEVON in the center and REF: CHAR_ORSON on the right. From 0.0s to 3.5s, Devon reaches forward with his left hand and presses down the heavy chrome PLAY lever on the reel-to-reel deck; both aluminum tape reels begin spinning smoothly clockwise. From 3.5s to 7.0s, the warm amber analog VU meter needle on the front of the deck swings rhythmically to the right in time with a low resonant chime as Devon leans toward his microphone listening intently. From 7.0s to 10.0s, the amber VU meter light reflects brightly in Orson’s glass eyes. Single continuous take, no cuts.',
        cameraAndLighting:
          '65mm shallow-depth studio shot focusing on the spinning tape reels, glowing amber VU meter, and Devon’s focused profile.',
        sfxAndMusic:
          'Mechanical tape-deck clunk and a deep, eerie low-frequency metallic chime; mystery score builds at 25% volume.',
        settleOn:
          'Close framing on the glowing amber VU meter needle and spinning aluminum reels.',
      },
      {
        blockNumber: 3,
        title: '1928 Svalbard Listening Post (Cinematic Cutaway)',
        timecode: '0:20–0:30',
        timing: 'Motion 0:20–0:27 · Settle 0:27–0:30',
        narrationVo:
          'Cut seamlessly from your podcast desk into photorealistic historical reconstructions.',
        videoPrompt:
          'Single continuous medium shot inside a wooden 1928 Arctic telegraph hut in Svalbard lit by a hanging brass kerosene lantern. At 0.0s, REF: CHAR_LINDQVIST sits centered at a frost-rimmed pine table wearing his sheepskin coat and black Bakelite headphones, with his right hand resting on a brass frequency dial while snow blows against the small window glass behind him. From 0.0s to 3.5s, Lindqvist presses his left hand tightly against his left headphone cup, leans forward over a spinning paper seismograph drum, and slowly turns the brass dial clockwise with his right hand. From 3.5s to 7.0s, the metal stylus on the paper drum jumps sharply, drawing rhythmic ink spikes across the scrolling paper as a tin mug of tea on the table ripples in concentric circles. From 7.0s to 10.0s, Lindqvist stares at the vibrating tea mug in stunned silence. Single continuous take, no cuts.',
        cameraAndLighting:
          '35mm anamorphic period cinema lens; warm flickering kerosene lantern light contrasting with icy blue window frost.',
        sfxAndMusic:
          'Howling Arctic wind outside, scratching seismograph stylus, and deep sub-glacial chime; strings swell at 25% volume.',
        settleOn:
          'Captain Lindqvist staring at the concentric ripples in his tin tea mug beside the spiking seismograph.',
      },
      {
        blockNumber: 4,
        title: 'The Sub-Glacial Borehole Shaft (1928 Exterior)',
        timecode: '0:30–0:40',
        timing: 'Motion 0:30–0:37 · Settle 0:37–0:40',
        narrationVo:
          'Hold character wardrobe, period props, and atmospheric lighting across every story beat.',
        videoPrompt:
          'Single continuous medium-wide shot on a snow-covered 1928 Arctic glacier at night around a circular vertical ice shaft. At 0.0s, REF: CHAR_LINDQVIST kneels on the left edge of the ice shaft in his sheepskin coat holding a brass storm lantern in his right hand, while a second expedition engineer in a wool parka stands on the right gripping a wooden tripod winch. From 0.0s to 4.0s, Lindqvist extends his right arm to hold the glowing brass lantern directly over the dark circular opening of the ice borehole, illuminating fluted blue glacial walls descending into darkness. From 4.0s to 7.0s, the braided steel hydrophone cable hanging down the center of the shaft vibrates tautly, shaking loose a dusting of frost crystals. From 7.0s to 10.0s, Lindqvist places his gloved left hand on the vibrating cable to feel the pulse. Single continuous take, no cuts.',
        cameraAndLighting:
          '40mm anamorphic low-angle shot in falling snow; warm amber lantern glow against deep midnight-blue glacial ice.',
        sfxAndMusic:
          'Thrumming steel cable resonance and Arctic wind; tense viola and low brass pulse at 25% volume.',
        settleOn:
          'Lindqvist feeling the vibration on the steel hydrophone cable above the glowing blue ice shaft.',
      },
      {
        blockNumber: 5,
        title: 'Co-Host Banter & Declassified Blueprints',
        timecode: '0:40–0:49',
        timing: 'Motion 0:40–0:46 · Settle 0:46–0:49',
        inSceneDialogue:
          'DEVON VANCE: "Now before Orson blames ancient aliens—look at the 1928 geological survey map they unsealed fifty years later."',
        videoPrompt:
          'Single continuous medium two-shot back inside REF: LOC_MIDNIGHT_DESK. At 0.0s, REF: CHAR_DEVON sits on the left holding a large yellowed 1928 topographical map across the walnut desk while REF: CHAR_ORSON stands on his brass perch on the right. From 0.0s to 3.5s, Orson ruffles his articulated copper wings once and shakes his mechanical head side to side in comedic protest while Devon grins and delivers his line. From 3.5s to 6.5s, Devon unfolds the right half of the yellowed map flat onto the desk and points with a silver pen to a red-inked fault line directly beneath the Svalbard camp. From 6.5s to 9.0s, Orson leans his beak down to inspect the red fault line as Devon looks to the camera. Single continuous take, no cuts.',
        cameraAndLighting:
          '50mm overhead-angled studio two-shot capturing both the host banter and the yellowed 1928 map on the walnut desk.',
        sfxAndMusic:
          'Crisp map unfold and playful brass owl chirp; rhythmic mystery groove continues at 25% volume.',
        settleOn:
          'Devon pointing his silver pen at the red fault line on the 1928 map while Orson leans in.',
      },
      {
        blockNumber: 6,
        title: 'Inside the Sub-Glacial Cavern (1928 Climax)',
        timecode: '0:49–0:58',
        timing: 'Motion 0:49–0:55 · Settle 0:55–0:58',
        narrationVo:
          'Turn complex scientific and historical explanations into unforgettable visual cinema.',
        videoPrompt:
          'Single continuous wide shot inside a vast subterranean glacial ice cavern beneath Svalbard in 1928. At 0.0s, REF: CHAR_LINDQVIST stands in the left foreground holding his brass lantern high, facing a natural thirty-foot arch of translucent blue basal ice spanning a dark underground tidal fissure in the center of the cavern. From 0.0s to 4.0s, Lindqvist takes three slow steps forward onto a flat rock ledge as a deep tidal surge rises smoothly in the fissure below, compressing trapped air through fluted vertical ice chimneys in the arch. From 4.0s to 7.0s, the ice arch resonates with a visible shimmer of falling frost crystals that catch the golden lantern light like a cathedral organ. From 7.0s to 9.0s, Lindqvist lowers his Bakelite headphones around his neck in quiet awe. Single continuous take, no cuts.',
        cameraAndLighting:
          '28mm anamorphic wide shot; dramatic interplay of warm amber lantern light and translucent cyan-blue glacial ice.',
        sfxAndMusic:
          'Majestic, resonant sub-glacial organ chime echoing through the ice cavern; emotional string crescendo at 25% volume.',
        settleOn:
          'Lindqvist standing on the rock ledge illuminated by the towering blue ice arch.',
      },
      {
        blockNumber: 7,
        title: 'Global Multi-Language Channel Scaling',
        timecode: '0:58–1:07',
        timing: 'Motion 0:58–1:04 · Settle 1:04–1:07',
        narrationVo:
          'Then publish your episode in Spanish, Portuguese, Hindi, Arabic, and Mandarin—growing one channel into a global network.',
        videoPrompt:
          'Single continuous medium shot inside REF: LOC_MIDNIGHT_DESK. At 0.0s, REF: CHAR_DEVON sits centered at the walnut desk with REF: CHAR_ORSON on the right and a sleek glass monitor on the left side of the desk displaying six horizontal audio waveform tracks labeled EN, ES, PT, HI, AR, and ZH. From 0.0s to 3.5s, Devon reaches out with his left hand and slides a brushed-aluminum master fader upward on his desktop audio mixer. From 3.5s to 6.5s, all six language waveform tracks on the glass monitor illuminate in synchronized cyan glow from top to bottom as the neon "ON AIR" sign on the walnut wall behind him pulses brightly. From 6.5s to 9.0s, Devon leans back with a satisfied nod while Orson gives a crisp salute with his right copper wing. Single continuous take, no cuts.',
        cameraAndLighting:
          '50mm studio dolly shot; vibrant cyan waveform reflections on the walnut desk balanced with warm key light.',
        sfxAndMusic:
          'Smooth fader slide and a subtle harmonic confirmation chime; score swells toward its finale at 25% volume.',
        settleOn:
          'Devon and Orson at the studio desk beside the six glowing multi-language waveform tracks.',
      },
      {
        blockNumber: 8,
        title: 'Late-Night Sign-Off & SceneFlow Signature',
        timecode: '1:07–1:15',
        timing: 'Motion 1:07–1:12 · Settle 1:12–1:15',
        inSceneDialogue:
          'DEVON VANCE: "Stay curious, keep your dial locked—and we’ll see you on the next frequency."',
        videoPrompt:
          'Single continuous medium shot inside REF: LOC_MIDNIGHT_DESK. At 0.0s, REF: CHAR_DEVON sits centered behind the walnut desk with the 1928 brass cylinder in the foreground and REF: CHAR_ORSON perched on the right. From 0.0s to 3.5s, Devon delivers his sign-off line directly to the camera with a warm, knowing smile. From 3.5s to 6.0s, he reaches up with his left hand and flips a vintage brass desk lamp switch, dimming the foreground key light slightly so the cyan studio rim lights and the glowing amber "ON AIR" sign frame him and Orson in atmospheric silhouette. From 6.0s to 8.0s, Orson blinks his glowing amber glass eyes once as the camera holds steady. Single continuous take, no cuts.',
        cameraAndLighting:
          'Slow 50mm pullback from the walnut studio desk; atmospheric late-night cyan and amber broadcast lighting.',
        sfxAndMusic:
          'Crisp brass lamp click and a sleek, resonant E-minor synth and cello button chord at 25% volume.',
        settleOn:
          'Devon and Orson framed under the glowing "ON AIR" studio sign.',
      },
    ],
  },

  // ============================================================================
  // 6. VIDEO MEMOIRS — "Letters Across the Water" (75s · Explicit Shot-Action)
  // ============================================================================
  {
    id: 'memoir',
    buttonLabel: 'Video Memoirs',
    showTitle: 'Letters Across the Water',
    formatBadge: 'Commissioned Family Legacy Film · 75s Official Trailer',
    runtimeLabel: '1:15',
    durationSeconds: 75,
    tagline: 'Turn Spoken Family Memories into Cinema. A New Production Business Model.',
    logline:
      'At her 60th family reunion, an 82-year-old matriarch shares how a rain-swept 1966 harbor departure and a handwritten sourdough starter recipe built a three-generation neighborhood institution.',
    artStyleLock:
      'Warm 4K Living-Room Interview Upload + Lush 1966 Kodachrome Harbor & 1974 Bakery Period Reenactments',
    continuityBadge: 'Present-Day & 1966 Age-Locked Cast · 1966 Leather Recipe Book · Turnkey Client Workflow',
    webmSrc: VIDEO_MEMOIR_TRAILER_WEBM,
    mp4Src: VIDEO_MEMOIR_TRAILER_MP4,
    backgroundMusic: {
      title: 'Across Two Oceans (75s Emotional Cinematic Memoir & Strings Score)',
      styleAndMood:
        'Deeply moving, nostalgic, and warm cinematic score (in the spirit of Thomas Newman and Cinema Paradiso) that honors family heritage, sacrifice, and multi-generational love.',
      bpmAndKey: '88 BPM · F Major',
      instrumentation:
        'Intimate solo felt piano, lyrical solo violin and warm cello duet, gentle acoustic mandolin/guitar arpeggios, and lush legato string orchestra.',
      mixLevel: '25% volume (-12 dB) under dialogue and narration VO',
      generationPrompt:
        'Instrumental emotional family memoir and biographical film trailer score, 75 seconds, 88 BPM, F major. 0:00-0:20 tender, intimate solo felt piano melody with delicate nostalgia and warmth. 0:20-0:48 expressive solo cello and violin duet joining the piano with gentle acoustic guitar arpeggios, evoking a 1960s ocean voyage and young love. 0:48-1:06 lush, heartwarming full string orchestra swell filled with gratitude, triumph, and family connection. 1:06-1:15 resolves into a peaceful, glowing solo piano and warm string chord that lingers gently. Instrumental only, no vocals.',
    },
    referenceLocks: [
      {
        token: 'REF: CHAR_ELENA_82',
        name: 'Elena Rossi-Chen (Age 82, Present Day)',
        role: 'Present-Day Storyteller · Uploaded Family Interview Clip',
        description:
          'Warm 82-year-old Italian-American matriarch with silver hair in a soft wave, ivory cashmere shawl over a sage silk blouse, expressive hazel eyes.',
      },
      {
        token: 'REF: CHAR_ELENA_22',
        name: 'Young Elena Rossi (Age 22, 1966)',
        role: 'Period Reenactment Lead · Age-Locked Character Sheet',
        description:
          '22-year-old woman with identical hazel eyes and facial bone structure to Present-Day Elena; 1966 navy wool belted trench coat, cream silk headscarf.',
      },
      {
        token: 'REF: CHAR_MATEO_24',
        name: 'Young Mateo Chen (Age 24, 1966)',
        role: 'Period Reenactment Co-Lead · Locked Character Sheet',
        description:
          '24-year-old ship’s carpenter and baker; rolled-sleeve chambray work shirt, brown wool vest, warm reassuring smile.',
      },
      {
        token: 'REF: PROP_RECIPE_BOOK',
        name: '1966 Brass-Clasped Leather Recipe Notebook',
        role: 'Cross-Era Heirloom Prop Lock',
        description:
          'Pocket-sized cognac-brown leather notebook with an aged brass clasp and cream pages filled with handwritten fountain-pen recipes and a pressed olive leaf.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'The Living-Room Interview & The 1966 Notebook',
        timecode: '0:00–0:10',
        timing: 'Motion 0:00–0:07 · Settle 0:07–0:10',
        inSceneDialogue:
          'ELENA ROSSI-CHEN (82): "When I stood on Pier 14 in 1966, there was no camera to film us—only the rain and my mother’s recipe book."',
        videoPrompt:
          'Single continuous medium close-up interview shot inside a sunlit present-day living room in warm 4K digital cinema. At 0.0s, REF: CHAR_ELENA_82 sits centered in an upholstered armchair wearing her ivory cashmere shawl, holding REF: PROP_RECIPE_BOOK closed in her lap with both hands while framed family photos rest softly blurred on a sideboard behind her. From 0.0s to 3.5s, Elena unhooks the aged brass clasp with her right thumb and opens the cognac-brown leather notebook to a yellowed page holding a pressed olive leaf. From 3.5s to 7.0s, she looks up warmly into the camera lens and delivers her line with natural lip-sync and tender emotion. From 7.0s to 10.0s, she traces the handwritten ink title on the page with her right index finger. Single continuous take, no cuts.',
        cameraAndLighting:
          '85mm cinema prime at T2.0 with a slow 8% push-in; soft 4800K afternoon window key light wrapping gently across her face.',
        sfxAndMusic:
          'Soft brass clasp click and gentle parchment page turn; intimate solo felt piano melody enters at 25% volume.',
        settleOn:
          'Present-day Elena looking warmly into the lens with the open 1966 leather recipe notebook in her hands.',
      },
      {
        blockNumber: 2,
        title: 'Pier 14 in the Rain (Naples Harbor, 1966)',
        timecode: '0:10–0:20',
        timing: 'Motion 0:10–0:17 · Settle 0:17–0:20',
        narrationVo:
          'Upload a family interview and a handful of photos—and bring unfilmed memories to life with age-locked continuity.',
        videoPrompt:
          'Single continuous medium shot on a rain-slicked cobblestone steamer pier in 1966 rendered in lush Kodachrome period cinema with zero modern objects. At 0.0s, REF: CHAR_ELENA_22 stands centered at the foot of a black iron ship gangway in her navy wool trench coat and cream silk headscarf, holding a single battered tan leather suitcase in her left hand and clutching REF: PROP_RECIPE_BOOK against her chest with her right hand. From 0.0s to 4.0s, white steam billows from the ocean liner’s funnel in the background as young Elena looks back once over her left shoulder toward the misty harbor lamps. From 4.0s to 7.0s, she turns forward toward the camera, tightens her grip on the leather recipe notebook, and takes two steady steps up the wet wooden gangway planks. From 7.0s to 10.0s, she pauses by the brass gangway rail looking up at the ship deck. Single continuous take, no cuts.',
        cameraAndLighting:
          '50mm vintage anamorphic lens; warm 1960s tungsten harbor lamps reflecting on wet cobblestones against misty slate-blue rain.',
        sfxAndMusic:
          'Deep ocean liner steam whistle and soft rain; solo cello joins the felt piano at 25% volume.',
        settleOn:
          '22-year-old Elena on the steamer gangway clutching the exact same brown leather recipe notebook.',
      },
      {
        blockNumber: 3,
        title: 'Meeting on the Steerage Deck (Mid-Atlantic, 1966)',
        timecode: '0:20–0:30',
        timing: 'Motion 0:20–0:27 · Settle 0:27–0:30',
        narrationVo:
          'Recreate the exact moments a family’s story began—with locked faces, heirlooms, and period sets.',
        videoPrompt:
          'Single continuous medium two-shot inside a warm wood-paneled 1966 ocean liner dining saloon during an evening crossing. At 0.0s, REF: CHAR_ELENA_22 sits on the left side of a bolted oak table with REF: PROP_RECIPE_BOOK open before her, while REF: CHAR_MATEO_24 stands on the right in his chambray work shirt and wool vest holding two steaming porcelain mugs of ginger tea. From 0.0s to 3.5s, Mateo sets one steaming mug gently onto the oak table beside Elena’s notebook and sits down on the wooden bench across from her. From 3.5s to 7.0s, Mateo reaches into his vest pocket, pulls out a small brass screwdriver, and tightens the loose brass clasp on the edge of Elena’s leather notebook while she watches his hands with a shy, grateful smile. From 7.0s to 10.0s, both look up and share a warm first smile under the swinging brass ship lamp. Single continuous take, no cuts.',
        cameraAndLighting:
          '50mm period cinema two-shot; warm 3000K brass cabin lantern light with a gentle nautical sway.',
        sfxAndMusic:
          'Porcelain mug set on oak and soft ship timber creak; lyrical violin and cello duet at 25% volume.',
        settleOn:
          'Young Elena and Mateo smiling across the ship table beside the repaired leather recipe book.',
      },
      {
        blockNumber: 4,
        title: 'The First Brick Oven at 4:00 A.M. (1974)',
        timecode: '0:30–0:39',
        timing: 'Motion 0:30–0:36 · Settle 0:36–0:39',
        inSceneDialogue:
          'ELENA ROSSI-CHEN (VO): "Our first winter on Mulberry Street, the radiator broke—so Mateo lit the brick oven at four in the morning just to keep the starter alive."',
        videoPrompt:
          'Single continuous medium two-shot inside a small 1974 brick-walled neighborhood bakery before dawn as snow falls past the front storefront window in the background. At 0.0s, REF: CHAR_MATEO_24 kneels on the left in a flour-dusted canvas apron before an open cast-iron hearth door glowing with orange wood embers, while REF: CHAR_ELENA_22 stands on the right holding a glass crock of sourdough starter in both arms. From 0.0s to 3.5s, Mateo slides a long wooden baker’s peel loaded with three scored dough loaves smoothly into the glowing brick hearth. From 3.5s to 6.5s, he stands up, brushes flour from his hands, and wraps his right arm warmly around Elena’s shoulders as she sets the glass starter crock on the warm brick ledge above the oven door. From 6.5s to 9.0s, both watch the loaves bake in the golden firelight. Single continuous take, no cuts.',
        cameraAndLighting:
          '40mm period prime shot; rich 2700K orange hearth firelight contrasting with cold blue 1974 street snow outside the window.',
        sfxAndMusic:
          'Crackling hearth fire and wooden peel slide on stone; warm acoustic guitar and strings swell at 25% volume.',
        settleOn:
          'Young Mateo and Elena standing arm-in-arm in the warm glow of their first brick oven.',
      },
      {
        blockNumber: 5,
        title: 'Opening the Mulberry Street Doors (1974 Morning)',
        timecode: '0:39–0:48',
        timing: 'Motion 0:39–0:45 · Settle 0:45–0:48',
        narrationVo:
          'Launch a high-margin video memoir studio—delivering broadcast-grade legacy films in a single afternoon.',
        videoPrompt:
          'Single continuous medium shot at the glass front door of the 1974 Mulberry Street bakery in bright winter morning sunlight. At 0.0s, REF: CHAR_ELENA_22 stands on the left behind a wooden display counter stacked with golden-crusted hearth loaves, while REF: CHAR_MATEO_24 stands on the right at the glass entrance door. From 0.0s to 3.5s, Mateo flips the hanging wooden door sign from "CLOSED" to "OPEN" with his right hand and pulls the front door inward, setting off the small brass shop bell above the frame. From 3.5s to 6.5s, Elena wraps a warm loaf in brown kraft paper, ties it with butcher twine, and hands it across the counter with a radiant smile. From 6.5s to 9.0s, morning sunlight floods the flour-dusted counter. Single continuous take, no cuts.',
        cameraAndLighting:
          '50mm medium shot; crisp golden morning winter sunlight streaming through the gold-lettered bakery window.',
        sfxAndMusic:
          'Cheerful brass shop bell jingle and crisp kraft paper fold; uplifting string orchestra crescendo at 25% volume.',
        settleOn:
          'Young Elena handing the twine-tied loaf across the sunlit counter as Mateo holds the door open.',
      },
      {
        blockNumber: 6,
        title: 'Passing the Recipe Book to the Third Generation (Present Day)',
        timecode: '0:48–0:57',
        timing: 'Motion 0:48–0:54 · Settle 0:54–0:57',
        narrationVo:
          'Every heirloom, every era, and every voice—preserved for the next generation in any language.',
        videoPrompt:
          'Single continuous medium two-shot in the sunlit present-day bakery kitchen. At 0.0s, REF: CHAR_ELENA_82 stands on the left in her ivory shawl holding REF: PROP_RECIPE_BOOK in both hands, while her 26-year-old granddaughter Maya stands on the right in a linen baker’s apron beside a cooling rack of fresh sourdough loaves. From 0.0s to 3.5s, 82-year-old Elena extends both hands and places the worn 1966 cognac-brown leather recipe notebook into Maya’s flour-dusted hands. From 3.5s to 6.5s, Maya closes her hands gently over her grandmother’s fingers on the brass clasp and looks into Elena’s eyes with deep gratitude. From 6.5s to 9.0s, Elena reaches up with her left hand to touch Maya’s cheek with a proud smile. Single continuous take, no cuts.',
        cameraAndLighting:
          '65mm cinema prime at T2.0; warm golden afternoon light highlighting the worn 1966 leather notebook between their hands.',
        sfxAndMusic:
          'Gentle touch of hands on leather; lush, emotional full string melody peaks at 25% volume.',
        settleOn:
          '82-year-old Elena and her granddaughter holding the 1966 leather recipe notebook together.',
      },
      {
        blockNumber: 7,
        title: 'Sixty Years at One Table (The Family Reunion)',
        timecode: '0:57–1:06',
        timing: 'Motion 0:57–1:03 · Settle 1:03–1:06',
        inSceneDialogue:
          'ELENA ROSSI-CHEN (82): "Two oceans, three generations, and the very same bread on our table tonight."',
        videoPrompt:
          'Single continuous medium-wide shot in a warm courtyard garden strung with bistro lights at dusk during a three-generation family reunion. At 0.0s, REF: CHAR_ELENA_82 sits at the head of a long linen-draped wooden dining table surrounded by her children and grandchildren, while Maya stands beside her holding a wooden board with a steaming, scored sourdough boule. From 0.0s to 3.5s, Maya sets the steaming loaf in the center of the table beside REF: PROP_RECIPE_BOOK while Elena speaks her line with a radiant smile. From 3.5s to 6.5s, Elena breaks a warm piece of crust from the loaf with both hands as the family around the table raises their glasses in a joyful toast. From 6.5s to 9.0s, warm laughter and applause fill the courtyard under the glowing string lights. Single continuous take, no cuts.',
        cameraAndLighting:
          '35mm wide dolly push-in down the length of the reunion table; warm 2800K courtyard string lights against a deep twilight sky.',
        sfxAndMusic:
          'Crisp bread crust crackle, gentle clink of glasses, and warm family applause; heartwarming orchestral resolution at 25% volume.',
        settleOn:
          '82-year-old Elena at the head of the glowing three-generation reunion table.',
      },
      {
        blockNumber: 8,
        title: 'The Heirloom Portrait & SceneFlow Signature',
        timecode: '1:06–1:15',
        timing: 'Motion 1:06–1:12 · Settle 1:12–1:15',
        narrationVo:
          'Letters Across the Water. Turn spoken memories into cinema—and build a bespoke video studio in SceneFlow. Imagine the possibilities.',
        videoPrompt:
          'Single continuous close-up shot on the linen reunion table under warm evening light. At 0.0s, REF: PROP_RECIPE_BOOK lies open in the center foreground beside a vintage black-and-white 1966 harbor photograph of young Elena and Mateo and a fresh golden sourdough loaf, while REF: CHAR_ELENA_82’s and her granddaughter Maya’s hands rest on the table edge. From 0.0s to 4.0s, Elena’s right hand gently places the vintage 1966 photograph onto the open left page of the leather notebook opposite the pressed olive leaf. From 4.0s to 6.5s, Maya’s hand rests warmly over her grandmother’s hand beside the notebook. From 6.5s to 9.0s, the camera holds steady on the open heirloom book and joined hands in warm golden light. Single continuous take, no cuts.',
        cameraAndLighting:
          '65mm macro-capable prime slow tilt-down to the open 1966 notebook, photograph, and joined hands; warm golden candlelight.',
        sfxAndMusic:
          'Soft paper placement and a peaceful, lingering F-major felt piano and warm string chord at 25% volume.',
        settleOn:
          'Close-up of grandmother and granddaughter’s hands joined beside the open 1966 leather recipe book and harbor photo.',
      },
    ],
  },
] as const

const TRAILER_SCRIPT_BY_ID: Record<ProductionWalkId, ExampleTrailerScript> = {
  drama: EXAMPLE_TRAILER_SCRIPTS[0],
  animation: EXAMPLE_TRAILER_SCRIPTS[1],
  documentary: EXAMPLE_TRAILER_SCRIPTS[2],
  training: EXAMPLE_TRAILER_SCRIPTS[3],
  podcast: EXAMPLE_TRAILER_SCRIPTS[4],
  memoir: EXAMPLE_TRAILER_SCRIPTS[5],
}

export function getExampleTrailerScript(id: string): ExampleTrailerScript | null {
  if (
    id === 'drama' ||
    id === 'animation' ||
    id === 'documentary' ||
    id === 'training' ||
    id === 'podcast' ||
    id === 'memoir'
  ) {
    return TRAILER_SCRIPT_BY_ID[id]
  }
  return null
}

export function formatExampleTrailerScript(script: ExampleTrailerScript): string {
  const header = [
    `# ${script.buttonLabel.toUpperCase()} TRAILER — "${script.showTitle}" (${script.runtimeLabel})`,
    `Category: ${script.buttonLabel}`,
    `Format: ${script.formatBadge}`,
    `Tagline: ${script.tagline}`,
    `Logline: ${script.logline}`,
    `Art Style Lock: ${script.artStyleLock}`,
    `Continuity Lock: ${script.continuityBadge}`,
    `Target Assets: ${script.webmSrc.split('?')[0]} | ${script.mp4Src.split('?')[0]}`,
    '',
    '## BACKGROUND MUSIC SPECIFICATION (MIX AT 25% VOLUME / -12 dB)',
    `- Cue Title: ${script.backgroundMusic.title}`,
    `- Style & Mood: ${script.backgroundMusic.styleAndMood}`,
    `- Tempo & Key: ${script.backgroundMusic.bpmAndKey}`,
    `- Instrumentation: ${script.backgroundMusic.instrumentation}`,
    `- Mix Level: ${script.backgroundMusic.mixLevel}`,
    `- Music Generation Prompt: ${script.backgroundMusic.generationPrompt}`,
    '',
    '## LOCKED CHARACTER, PROP & ENVIRONMENT REFERENCES',
    ...script.referenceLocks.map(
      (ref) => `- ${ref.token} — ${ref.name} (${ref.role}): ${ref.description}`
    ),
    '',
    `## SHOT-BY-SHOT TRAILER SCRIPT (${script.blocks.length} BLOCKS · ${script.runtimeLabel})`,
  ]

  const blocks = script.blocks.map((block) => {
    const lines = [
      `### Block ${String(block.blockNumber).padStart(2, '0')} — ${block.title} (${block.timecode})`,
      `- Timing: ${block.timing}`,
    ]
    if (block.inSceneDialogue) {
      lines.push(`- In-Scene Sync Dialogue: ${block.inSceneDialogue}`)
    }
    if (block.narrationVo) {
      lines.push(`- Narration VO: "${block.narrationVo}"`)
    }
    lines.push(
      `- Video Prompt: ${block.videoPrompt}`,
      `- Camera & Lighting: ${block.cameraAndLighting}`,
      `- SFX & Music: ${block.sfxAndMusic}`,
      `- Settle On: ${block.settleOn}`
    )
    return lines.join('\n')
  })

  return [...header, '', ...blocks].join('\n\n')
}
