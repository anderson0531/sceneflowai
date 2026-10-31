/**
 * Cinematic 60s–90s Trailer Scripts for the four SceneFlow example productions.
 * Powers the top "Imagine the Possibilities" cinematic video header and the
 * Production Examples trailer showcase.
 */

import {
  ANIMATED_SERIES_TRAILER_MP4,
  ANIMATED_SERIES_TRAILER_WEBM,
  CINEMATIC_DRAMA_TRAILER_MP4,
  CINEMATIC_DRAMA_TRAILER_WEBM,
  DOCUMENTARY_TRAILER_MP4,
  DOCUMENTARY_TRAILER_WEBM,
  TRAINING_SERIES_TRAILER_MP4,
  TRAINING_SERIES_TRAILER_WEBM,
  type ProductionWalkId,
} from '@/config/landing/productionPipelineDemo'

export type PossibilitiesCategoryButtonLabel =
  | 'Cinematic Drama'
  | 'Animated Series'
  | 'Documentaries'
  | 'Training Series'

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
  referenceLocks: readonly ExampleTrailerReferenceLock[]
  blocks: readonly TrailerShotBlock[]
}

export const IMAGINE_POSSIBILITIES_COPY = {
  headline: 'Imagine the Possibilities',
  subheadline: 'with SceneFlow Studio',
} as const

export const EXAMPLE_TRAILER_SCRIPTS: readonly ExampleTrailerScript[] = [
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
        name: '1893 Columbian Induction Manifold',
        role: 'Key Hero Prop',
        description:
          'Heavy riveted brass and copper-coil resonant induction core with a rotating cryptographic cipher cylinder and violet-teal plasma arc.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'The Frozen City & The Subterranean Vault',
        timecode: '0:00–0:10',
        timing: 'Motion 0:00–0:07 · Settle 0:07–0:10',
        narrationVo:
          'When a city is engineered to freeze in the dark, the truth hides forty feet beneath the ice.',
        videoPrompt:
          'Sweeping anamorphic aerial descent over snow-choked Chicago South Side blocks plunging sequentially into rolling blackout darkness, transitioning through a grated street manhole into a 1906 brick freight-tunnel vault where REF: CHAR_GIDEON chalks differential equations beside a glowing 3200K tungsten lamp.',
        cameraAndLighting:
          '35mm anamorphic crane drop from icy blue-slate exterior (-24°F) into warm 3200K tungsten vault key.',
        sfxAndMusic:
          'Howling polar wind and distant transformer power-down thud; low solo cello pulse and sub-bass heartbeat.',
        settleOn:
          'Medium close-up of Gideon looking up sharply as perimeter tripwire bells chime in the tunnel shadow.',
      },
      {
        blockNumber: 2,
        title: 'The Intrusion & The Cipher',
        timecode: '0:10–0:20',
        timing: 'Motion 0:10–0:17 · Settle 0:17–0:20',
        inSceneDialogue:
          'PIPER HAYES: "Your wife didn’t die in a lab fire, Gideon. Vane-Calhoun killed her to bury this."',
        videoPrompt:
          'REF: CHAR_PIPER emerges from the frost-rimmed tunnel archway, brushing snow from her olive parka, and sets a brass 1893 cryptographic cipher cylinder and Vane-Calhoun shutoff manifests onto the drafting table in front of REF: CHAR_GIDEON.',
        cameraAndLighting:
          'Over-the-shoulder two-shot pushing in on Piper’s intense expression and the engraved brass cylinder, 50mm anamorphic, T2.0.',
        sfxAndMusic:
          'Heavy metallic clink of the brass cipher on oak; tense string tremolos rising underneath.',
        settleOn:
          'Extreme close-up of Gideon’s trembling fingers recognizing his late wife Clara’s handwriting on the manifest.',
      },
      {
        blockNumber: 3,
        title: 'Igniting the Faraday Protocol',
        timecode: '0:20–0:30',
        timing: 'Motion 0:20–0:27 · Settle 0:27–0:30',
        narrationVo:
          'In 1893, they built a wireless current for everyone. Tonight, it wakes up.',
        videoPrompt:
          'REF: CHAR_GIDEON slots the brass cipher into REF: PROP_MANIFOLD and twists the locking ring; a blinding violet-teal electromagnetic induction wave surges through the copper coils, levitating iron filings and draftsman compasses across the table as REF: CHAR_PIPER steps back in awe.',
        cameraAndLighting:
          'Low-angle 180-degree orbital arc around the manifold as violet-teal plasma light floods both faces.',
        sfxAndMusic:
          'Deep resonant harmonic hum building to a crystalline electromagnetic ignition chord.',
        settleOn:
          'Violet-teal induction arcs reflecting in Gideon’s wire-rimmed spectacles.',
      },
      {
        blockNumber: 4,
        title: 'The Corporate Hunter',
        timecode: '0:30–0:40',
        timing: 'Motion 0:30–0:37 · Settle 0:37–0:40',
        inSceneDialogue:
          'JULIAN WARD: "An 1893 harmonic spike under Sector Four. Seal the sluices—nothing leaves those tunnels breathing."',
        videoPrompt:
          'High-contrast glass operations floor atop Vane-Calhoun Tower overlooking dark Chicago: REF: CHAR_WARD stands in his tailored matte-black overcoat before a holographic subterranean grid map pulsing with a crimson anomaly beacon.',
        cameraAndLighting:
          'Slow push-in on Ward, 65mm anamorphic, cold steel-blue institutional top light with crimson map reflections.',
        sfxAndMusic:
          'Sonar-like grid alarm ping; brazen brass horn blast cutting through driving percussion.',
        settleOn:
          'Ward tapping his bone-conduction earpiece with icy, surgical calm.',
      },
      {
        blockNumber: 5,
        title: 'Breach in the Freight Tunnels',
        timecode: '0:40–0:50',
        timing: 'Motion 0:40–0:47 · Settle 0:47–0:50',
        narrationVo:
          'Hunted by a private containment directorate across forgotten subterranean corridors.',
        videoPrompt:
          'Thermite breach charges blow open the vault’s iron bulkhead in a shower of sparks; REF: CHAR_GIDEON wrenches a cast-iron pressure wheel, unleashing a roaring wall of industrial steam that blinds tactical operatives while he pulls REF: CHAR_PIPER into an Adams Street pneumatic mail conduit.',
        cameraAndLighting:
          'Handheld kinetic tracking shot through backlit steam and tactical laser beams, 28mm anamorphic.',
        sfxAndMusic:
          'Muted concussion blast, shrieking high-pressure steam release, and pounding orchestral drums.',
        settleOn:
          'Gideon slamming the heavy pneumatic hatch shut as laser beams slice through the steam outside.',
      },
      {
        blockNumber: 6,
        title: 'Memory & Resolve in the Sub-Station',
        timecode: '0:50–1:00',
        timing: 'Motion 0:50–0:57 · Settle 0:57–1:00',
        inSceneDialogue:
          'GIDEON CROFT: "Two miles of pack ice between us and the Crib. We couple her manifold to the lake array—or the city dies in the dark."',
        videoPrompt:
          'Inside a derelict pneumatic mail sorting station, warm amber projection light from REF: PROP_MANIFOLD casts an archival holographic memory of REF: CHAR_CLARA beside REF: CHAR_GIDEON and REF: CHAR_PIPER as Gideon finishes bandaging Piper’s shoulder.',
        cameraAndLighting:
          'Intimate 50mm medium profile shot; warm amber memory projection mingling with cool subterranean shadows.',
        sfxAndMusic:
          'Percussion drops out for a haunting solo piano motif; quiet crackle of archival projector light.',
        settleOn:
          'Piper nodding to Gideon, slinging the glowing manifold pack over her good shoulder.',
      },
      {
        blockNumber: 7,
        title: 'The Sub-Lacustrine Traverse',
        timecode: '1:00–1:10',
        timing: 'Motion 1:00–1:07 · Settle 1:07–1:10',
        narrationVo:
          'Two miles beneath Lake Michigan’s pack ice, every frame holds its cast, its wardrobe, and its light.',
        videoPrompt:
          'Claustrophobic waist-deep wade through a half-flooded 1890s brick water-intake siphon beneath frozen Lake Michigan; stalactites of ice groan overhead as REF: CHAR_GIDEON and REF: CHAR_PIPER haul the waterproofed manifold case up the rusted iron intake shaft.',
        cameraAndLighting:
          'Low-angle water-level tracking shot, bioluminescent violet-teal spill from the manifold case cutting through freezing black water.',
        sfxAndMusic:
          'Groaning tectonic lake ice above, sloshing freezing water, and accelerating string ostinato.',
        settleOn:
          'Gideon kicking open the frost-sealed upper hatch into a roaring lakefront blizzard.',
      },
      {
        blockNumber: 8,
        title: 'Stand on the Gale-Swept Gantry',
        timecode: '1:10–1:20',
        timing: 'Motion 1:10–1:17 · Settle 1:17–1:20',
        inSceneDialogue:
          'PIPER HAYES: "Broadcast is live! Light it, Gideon—now!"',
        videoPrompt:
          'On the gale-swept iron gantry of the offshore Two-Mile Crib surrounded by churning pack ice, REF: CHAR_WARD corners them with a high-voltage inversion relay; REF: CHAR_PIPER locks the microwave uplink while REF: CHAR_GIDEON slams the Victorian hydraulic flood-gate lever, routing a massive violet lightning arc across the tower.',
        cameraAndLighting:
          'Epic wide anamorphic crane shot in driving snow, violet-white electrical arcs illuminating the entire offshore crib.',
        sfxAndMusic:
          'Thunderous high-voltage discharge, howling gale wind, and full orchestral brass climax.',
        settleOn:
          'The offshore crib tower fully charged, humming with blinding violet-gold resonance.',
      },
      {
        blockNumber: 9,
        title: 'The Harmonic Transmission & SceneFlow Signature',
        timecode: '1:20–1:30',
        timing: 'Motion 1:20–1:26 · Settle 1:26–1:30',
        narrationVo:
          'The White City Current. Six episodes, zero character drift—directed from script to master in SceneFlow. Imagine the possibilities.',
        videoPrompt:
          'A colossal harmonic ring of violet-gold energy expands from the Two-Mile Crib across frozen Lake Michigan, igniting streetlight grids, elevated trains, and apartment windows across the entire Chicago skyline at dawn as REF: CHAR_GIDEON and REF: CHAR_PIPER watch from the icy rail.',
        cameraAndLighting:
          'Majestic aerial pullback from the crib to the newly illuminated golden skyline under breaking dawn light.',
        sfxAndMusic:
          'Triumphant orchestral resolution fading into a single resonant piano chord and warm city ambience.',
        settleOn:
          'Wide silhouette of Gideon and Piper against the lit Chicago horizon with the title "THE WHITE CITY CURRENT · BUILT IN SCENEFLOW".',
      },
    ],
  },
  {
    id: 'animation',
    buttonLabel: 'Animated Series',
    showTitle: 'Hart House',
    formatBadge: '5-Episode 2D Animated Sitcom · 75s Official Trailer',
    runtimeLabel: '1:15',
    durationSeconds: 75,
    tagline: 'Full-Season Animated Series. One Consistent Art Style.',
    logline:
      'In ordinance-obsessed Millwick, the three-generation Hart family turns a twelve-bin recycling mandate and a garage sorting contraption into a season-long battle over whether Nana Inez’s "temporary" side porch is forever.',
    artStyleLock:
      'Locked 2D Flat-Cel Animation · Bold Hand-Inked Outlines · Warm Suburban Gouache Palette · Zero Off-Model Drift',
    continuityBadge: '5 Locked 2D Character Sheets · Millwick Craftsman House & Side Porch · 5 Episodes',
    webmSrc: ANIMATED_SERIES_TRAILER_WEBM,
    mp4Src: ANIMATED_SERIES_TRAILER_MP4,
    referenceLocks: [
      {
        token: 'REF: CHAR_RUTH',
        name: 'Ruth Hart (42)',
        role: 'Matriarch · Millwick Municipal Clerk',
        description:
          '2D flat-cel character sheet: terracotta knit cardigan, tortoiseshell glasses, color-coded clipboard, deadpan eyebrow arcs.',
      },
      {
        token: 'REF: CHAR_ELLIS',
        name: 'Ellis Hart (44)',
        role: 'Patriarch · Night-Shift Bus Mechanic',
        description:
          '2D flat-cel character sheet: navy mechanic coveralls with oil smudges, steel thermos, infectious grin, oversized wrench.',
      },
      {
        token: 'REF: CHAR_JUNE',
        name: 'June Hart (16)',
        role: 'Daughter · High School Debate Captain',
        description:
          '2D flat-cel character sheet: mustard hoodie over pleated skirt, tab-indexed town charter binder, dramatic courtroom gestures.',
      },
      {
        token: 'REF: CHAR_MILO',
        name: 'Milo Hart (9)',
        role: 'Son · Household Archivist',
        description:
          '2D flat-cel character sheet: teal-striped rugby shirt, untied high-tops, industrial yellow label-maker gun holstered at hip.',
      },
      {
        token: 'REF: CHAR_INEZ',
        name: 'Nana Inez (71)',
        role: 'Grandmother · Side-Porch Sovereign',
        description:
          '2D flat-cel character sheet: embroidered indigo shawl, silver chignon, reigning from her wicker peacock chair.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'Welcome to Millwick at 6:15 A.M.',
        timecode: '0:00–0:10',
        timing: 'Motion 0:00–0:07 · Settle 0:07–0:10',
        narrationVo:
          'In the town of Millwick, there is a municipal ordinance for everything—except how five Harts share one roof.',
        videoPrompt:
          '2D flat-cel animation with bold ink outlines and warm morning colours: sunny birds-eye zip pan from Millwick Town Hall to the Hart family craftsman house, cutting inside the kitchen where REF: CHAR_RUTH pins a massive fold-out chart titled "ORDINANCE 412: 12-BIN CURBSIDE SORTING" over the wall calendar.',
        cameraAndLighting:
          'Snappy 2D horizontal whip-pan into a clean medium shot; warm morning sunlight through kitchen gingham curtains.',
        sfxAndMusic:
          'Upbeat jazzy woodwind and upright bass sitcom theme; crisp paper unfurl snap.',
        settleOn:
          'Ruth adjusting her tortoiseshell glasses with a determined municipal clerk sigh.',
      },
      {
        blockNumber: 2,
        title: 'The Twelve-Bin Kitchen Standoff',
        timecode: '0:10–0:20',
        timing: 'Motion 0:10–0:17 · Settle 0:17–0:20',
        inSceneDialogue:
          'ELLIS HART: "Why use twelve plastic bins when a salvaged bus-door motor can sort breakfast at forty miles an hour?"',
        videoPrompt:
          'Fast-cut 2D flat-cel kitchen ensemble: REF: CHAR_JUNE slams her annotated town charter onto the breakfast table in protest just as REF: CHAR_ELLIS kicks open the back door cradling a sparking municipal bus-door motor and a coil of conveyor belting.',
        cameraAndLighting:
          'Dynamic comedic three-shot with expressive squash-and-stretch reaction takes from Ruth and June.',
        sfxAndMusic:
          'Heavy binder thud, pneumatic bus-door hiss, and playful pizzicato strings.',
        settleOn:
          'Ellis grinning proudly while a loose spring boings out of the motor assembly.',
      },
      {
        blockNumber: 3,
        title: 'Ellis’s Garage Sorting Contraption',
        timecode: '0:20–0:30',
        timing: 'Motion 0:20–0:27 · Settle 0:27–0:30',
        narrationVo:
          'Direct punchy cartoon physics and comedic timing beat by beat—without a single frame drifting off-model.',
        videoPrompt:
          'Inside the Hart garage in locked 2D flat-cel style: REF: CHAR_ELLIS pulls a red lever on his Rube Goldberg pulley-and-conveyor sorting machine; three green bottles clink neatly into Bin #4 before the belt hits turbo speed, launching cereal boxes, roller skates, and Ellis’s thermos across the room.',
        cameraAndLighting:
          'Wide 2D stage framing with classic cartoon speed lines and multi-plane foreground clutter.',
        sfxAndMusic:
          'Rhythmic mechanical clatter escalating into brass trombones and rapid cartoon ricochets.',
        settleOn:
          'Ruth, June, and Milo peeking over an upturned laundry basket with identical deadpan blinks.',
      },
      {
        blockNumber: 4,
        title: 'Milo’s Label Gun & Nana’s Sovereign Porch',
        timecode: '0:30–0:40',
        timing: 'Motion 0:30–0:37 · Settle 0:37–0:40',
        inSceneDialogue:
          'NANA INEZ: "Point that label gun at my wicker chair, mijito, and this porch secedes from the township."',
        videoPrompt:
          '2D flat-cel tracking shot as REF: CHAR_MILO slides across the hallway rug firing neon category stickers onto the toaster and family cat, skidding to a halt at the French doors of the sun-drenched side porch where REF: CHAR_INEZ sips café con leche in her wicker throne.',
        cameraAndLighting:
          'Low-angle reverse shot giving Nana Inez regal comedic authority in warm golden porch light.',
        sfxAndMusic:
          'Rapid-fire ka-chunk label-gun clicks stopping dead on a single acoustic guitar chord.',
        settleOn:
          'Milo slowly holstering his label gun while Nana Inez raises one silver eyebrow.',
      },
      {
        blockNumber: 5,
        title: 'Full-Season Continuity Montage',
        timecode: '0:40–0:49',
        timing: 'Motion 0:40–0:46 · Settle 0:46–0:49',
        narrationVo:
          'Five episodes, one locked flat-cel palette. From rained-out town parades to six A.M. night-shift pancakes.',
        videoPrompt:
          'Crisp split-screen and wipe montage in identical 2D flat-cel line weight: (1) all five Harts holding up a sagging blue tarp during a torrential Millwick Day rainstorm, then (2) REF: CHAR_ELLIS flipping a tower of pancakes at dawn as REF: CHAR_JUNE debates a stopwatch.',
        cameraAndLighting:
          'Graphic comic-panel diagonal wipe transitions preserving exact character proportions and colors.',
        sfxAndMusic:
          'Thunderclap and splash cutting to sizzling skillet and upbeat snare-brush groove.',
        settleOn:
          'Ellis catching a pancake on his spatula while the whole kitchen cheers.',
      },
      {
        blockNumber: 6,
        title: 'The Label That Stops the Room',
        timecode: '0:49–0:58',
        timing: 'Motion 0:49–0:55 · Settle 0:55–0:58',
        inSceneDialogue:
          'MILO HART: "I didn’t make up the word! Everyone calls it Nana’s temporary porch!"',
        videoPrompt:
          'In the living room, the comedic chaos freezes when REF: CHAR_MILO slap-tags a cedar keepsake trunk with a sticker reading "NANA’S TEMPORARY PORCH THINGS"; REF: CHAR_INEZ looks down quietly, folding her indigo shawl, as REF: CHAR_RUTH and REF: CHAR_ELLIS exchange a stricken glance.',
        cameraAndLighting:
          'Gentle push-in on the five-character ensemble as the background palette softens to warm twilight amber.',
        sfxAndMusic:
          'Upbeat jazz stops on a dime; soft, tender electric piano chord.',
        settleOn:
          'Nana Inez standing beside her packed cedar trunk on the side porch.',
      },
      {
        blockNumber: 7,
        title: 'The Household Vote',
        timecode: '0:58–1:07',
        timing: 'Motion 0:58–1:04 · Settle 1:04–1:07',
        inSceneDialogue:
          'RUTH HART: "Forget Town Hall. All in favor of knocking out the wall and making the porch Nana’s real room?"',
        videoPrompt:
          'Around the dining table in locked 2D flat-cel warmth: REF: CHAR_RUTH raises her hand first; REF: CHAR_JUNE closes her ordinance binder and raises hers; REF: CHAR_ELLIS and REF: CHAR_MILO raise both hands high as REF: CHAR_INEZ tries to hide a touched smile.',
        cameraAndLighting:
          'Warm overhead circular table framing rotating gently around the five raised hands.',
        sfxAndMusic:
          'Warm acoustic guitar and brass swell returning with heartfelt energy.',
        settleOn:
          'Nana Inez reaching across the table to squeeze Ruth’s hand.',
      },
      {
        blockNumber: 8,
        title: 'Porch Light & SceneFlow Signature',
        timecode: '1:07–1:15',
        timing: 'Motion 1:07–1:12 · Settle 1:12–1:15',
        narrationVo:
          'Hart House. An entire animated season with zero style drift—created in SceneFlow. Imagine the possibilities.',
        videoPrompt:
          'Golden-hour exterior wide shot of the Hart house in vibrant 2D flat-cel animation: all five family members crowded onto the newly framed permanent porch laughing together as REF: CHAR_MILO sticks a final label on the porch beam reading "HOME (PERMANENT)."',
        cameraAndLighting:
          'Classic sitcom crane pull-back as warm porch string lights twinkle on against an evening lilac sky.',
        sfxAndMusic:
          'Full big-band sitcom finale button with a playful final label-gun click.',
        settleOn:
          'Wide family portrait on the porch with the title card "HART HOUSE · BUILT IN SCENEFLOW".',
      },
    ],
  },
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
    referenceLocks: [
      {
        token: 'REF: CHAR_AMIRA_NOW',
        name: 'Dr. Amira Hassan (64 & 28)',
        role: 'Lead Witness · Mathematical Logician (Cairo & London)',
        description:
          'Multi-era locked identity: appears at age 28 in 1989 Cairo/Nairobi 35mm archival plates and at age 64 in crisp 4K London archive interviews with identical facial structure.',
      },
      {
        token: 'REF: CHAR_KENJI_NOW',
        name: 'Kenji Sato (66 & 31)',
        role: 'Co-Lead Witness · Control Systems Engineer (Osaka & Tokyo)',
        description:
          'Multi-era locked identity: appears at age 31 on 1991 Osaka/Seoul semiconductor floors and at age 66 in contemporary 4K Tokyo robotics archives.',
      },
      {
        token: 'VOICE_CHRONICLER',
        name: 'The Chronicler',
        role: 'Voice-of-God Documentary Narrator',
        description:
          'Measured, authoritative documentary narration synced to transcript-driven archival B-roll and schematics across English, Spanish, Chinese, and Arabic.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'The Room with the Switches (Manchester & Tokyo, 1956)',
        timecode: '0:00–0:10',
        timing: 'Motion 0:00–0:07 · Settle 0:07–0:10',
        narrationVo:
          'Before intelligence was a cloud, it was a room the size of a gymnasium—and a single switch left on through the night.',
        videoPrompt:
          'Period-guarded 1956 16mm film grain with zero modern objects: engineers in wool waistcoats and rolled sleeves trace a logic fault across towering banks of clattering electromagnetic relays in Manchester and Tokyo, feeding 5-hole punched paper tape through brass optical readers.',
        cameraAndLighting:
          'Authentic 1950s 16mm Kodachrome palette, warm tungsten work lamps, deep shadows, tactile halation.',
        sfxAndMusic:
          'Rhythmic mechanical clatter of hundreds of electromagnetic relays; deep, contemplative glass marimba and solo cello.',
        settleOn:
          'Extreme close-up of a heavy 1956 brass toggle switch flipped to the ON position.',
      },
      {
        blockNumber: 2,
        title: 'The Witnesses Across Time (London & Tokyo, Present Day)',
        timecode: '0:10–0:20',
        timing: 'Motion 0:10–0:17 · Settle 0:17–0:20',
        inSceneDialogue:
          'DR. AMIRA HASSAN: "We didn’t set out to build a mind. We set out to test whether a machine could hold a rule—and change its own next step."',
        videoPrompt:
          'Razor-sharp present-day 4K cinema interview plate in a sunlit London archive: REF: CHAR_AMIRA_NOW holds an original spool of 1956 5-hole paper tape, speaking with natural micro-expressions and lip-sync, intercut with REF: CHAR_KENJI_NOW examining a vintage logic board in Tokyo.',
        cameraAndLighting:
          '85mm cinema prime at T1.8, shallow depth of field, natural soft key light Documentary master grade.',
        sfxAndMusic:
          'Subtle room tone of quiet archive; minimal chamber strings underscoring Amira’s cadence.',
        settleOn:
          'Amira’s eyes reflecting the perforations of the 1956 paper tape.',
      },
      {
        blockNumber: 3,
        title: 'The Useful Machine (Nairobi, 1989)',
        timecode: '0:20–0:30',
        timing: 'Motion 0:20–0:27 · Settle 0:27–0:30',
        narrationVo:
          'By the late eighties, the rule left the laboratory—and began arguing with the experts beside it.',
        videoPrompt:
          'Period-locked 1989 35mm documentary stock in a Nairobi hospital records room: beige CRT terminals glow green as a 28-year-old REF: CHAR_AMIRA_NOW watches a senior clinician debate a diagnostic tree printed on tractor-feed dot-matrix paper. Zero modern screens or anachronisms.',
        cameraAndLighting:
          '1980s 35mm film grain, green CRT phosphor spill on faces, warm fluorescent ceiling practicals.',
        sfxAndMusic:
          'High-pitched CRT flyback hum, screeching dot-matrix printer ribbon, and pulsing analog synth bass.',
        settleOn:
          'Young Amira circling a line of diagnostic output on the perforated paper.',
      },
      {
        blockNumber: 4,
        title: 'The Silicon Floor (Osaka & Seoul, 1991)',
        timecode: '0:30–0:40',
        timing: 'Motion 0:30–0:37 · Settle 0:37–0:40',
        inSceneDialogue:
          'KENJI SATO: "The line stopped itself at 3 A.M. For the first time, the sensor trusted its own threshold over the foreman."',
        videoPrompt:
          '1991 amber-lit semiconductor cleanroom and robotic assembly corridor in Osaka: a 31-year-old REF: CHAR_KENJI_NOW in period anti-static smock inspects a halted robotic wafer arm blinking amber while factory supervisors gather behind the glass.',
        cameraAndLighting:
          'Anamorphic documentary tracking shot through sodium-vapor cleanroom glass, authentic 1990s video telemetry monitors.',
        sfxAndMusic:
          'Pneumatic assembly hiss stopping abruptly into a steady warning tone; strings build in urgency.',
        settleOn:
          'Young Kenji staring at his reflection in the cleanroom observation window.',
      },
      {
        blockNumber: 5,
        title: 'The Public Arrival (Lagos, São Paulo & Berlin, 2014)',
        timecode: '0:40–0:50',
        timing: 'Motion 0:40–0:47 · Settle 0:47–0:50',
        narrationVo:
          'Then the model crossed the threshold into every newsroom, classroom, and kitchen on earth.',
        videoPrompt:
          'Three-city global documentary sequence in crisp 2010s digital cinema: (1) journalists in a bustling Lagos newsroom comparing live automated translations, (2) students in a São Paulo classroom questioning a projected model, and (3) a child at a Berlin kitchen table speaking to a glowing countertop device.',
        cameraAndLighting:
          'Observational handheld 35mm documentary lens, natural city light across three continents.',
        sfxAndMusic:
          'Layered global city ambiences—Lagos traffic, classroom chatter, Berlin rain—woven into an expansive orchestral theme.',
        settleOn:
          'Close-up on the child’s face illuminated by the response light—holding on the human reaction, not the screen.',
      },
      {
        blockNumber: 6,
        title: 'The Acceleration (Manila, Accra & Rotterdam, Present Day)',
        timecode: '0:50–1:00',
        timing: 'Motion 0:50–0:57 · Settle 0:57–1:00',
        narrationVo:
          'Today, across Manila, Accra, and Rotterdam, systems finish sentences that human hands began.',
        videoPrompt:
          'Contemporary 4K widescreen triptych: a night-shift triage nurse in Manila reviewing predictive vitals, a composer in an Accra studio shaping orchestral stems, and a dock planner in Rotterdam routing autonomous container cranes under North Sea rain.',
        cameraAndLighting:
          'Crisp modern 4K digital cinema, rich nocturnal contrast and kinetic lateral camera movement.',
        sfxAndMusic:
          'Soaring polyrhythmic percussion and Philip Glass-style arpeggiated strings.',
        settleOn:
          'Wide aerial of Rotterdam’s automated container terminal operating like a illuminated circuit board at night.',
      },
      {
        blockNumber: 7,
        title: 'Transcript-Driven Archival Synthesis',
        timecode: '1:00–1:10',
        timing: 'Motion 1:00–1:07 · Settle 1:07–1:10',
        narrationVo:
          'Every decade locked to its true lenses, wardrobe, and machines—synced automatically to the narrator’s transcript.',
        videoPrompt:
          'Cinematic archival match-cut sequence: a 1956 hand-drawn Turing relay schematic dissolves in exact geometric alignment into a 1989 silicon wafer lithography mask, then into a luminous 3D topology of modern frontier neural weights.',
        cameraAndLighting:
          'Macro rostrum camera push-in with seamless temporal lighting transitions.',
        sfxAndMusic:
          'Sub-bass swell as archival film projector clicks morph into high-density optical data hum.',
        settleOn:
          'The neural topology resolving into the iris of Dr. Amira Hassan in present-day 4K.',
      },
      {
        blockNumber: 8,
        title: 'The Question Ahead (The Superintelligence Horizon)',
        timecode: '1:10–1:20',
        timing: 'Motion 1:10–1:17 · Settle 1:17–1:20',
        inSceneDialogue:
          'KENJI SATO: "What does a system smarter than its makers owe the nurse, the composer, and the billion people who never got a vote?"',
        videoPrompt:
          'In a quiet, high-ceilinged contemporary archive room at dusk, REF: CHAR_AMIRA_NOW and REF: CHAR_KENJI_NOW sit across a wooden table strewn with 1950s notebooks and modern optical drives, speaking with quiet gravitas as an unblinking server rack hums softly in the background.',
        cameraAndLighting:
          'Two-camera 50mm documentary master and close-up coverage; twilight blue window light balanced with warm desk practicals.',
        sfxAndMusic:
          'Orchestra drops to a single sustained cello harmonic and quiet room tone.',
        settleOn:
          'Amira and Kenji looking directly into the lens in calm, unhurried silence.',
      },
      {
        blockNumber: 9,
        title: 'The Unfinished Switch & SceneFlow Signature',
        timecode: '1:20–1:30',
        timing: 'Motion 1:20–1:26 · Settle 1:26–1:30',
        narrationVo:
          'The Long Thought. Five episodes, twelve cities, seventy years of history—directed in SceneFlow. Imagine the possibilities.',
        videoPrompt:
          'Split-era final image: a 1956 engineer’s hand resting on a brass relay switch in Manchester matched with a modern engineer’s hand beside a fiber-optic core in Rotterdam, fading to the documentary title treatment.',
        cameraAndLighting:
          'Locked macro framing bridging 16mm monochrome grain and 4K anamorphic clarity.',
        sfxAndMusic:
          'A single resonant relay click echoing into a deep, unresolved piano chord.',
        settleOn:
          'Title card: "THE LONG THOUGHT · A 5-PART DOCUMENTARY BUILT IN SCENEFLOW".',
      },
    ],
  },
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
    referenceLocks: [
      {
        token: 'REF: CHAR_LILA',
        name: 'Chef Lila Mensah (38)',
        role: 'Lead Instructor · Locked Identity & Wardrobe',
        description:
          'Executive Chef-Instructor: crisp white double-breasted chef coat, slate apron, close-cropped hair; identical face, hands, and calm pedagogical authority across all 5 modules.',
      },
      {
        token: 'REF: CHAR_MARCUS',
        name: 'Marcus Cole (26)',
        role: 'Apprentice Cohort Cook · Bench #2',
        description:
          'First-year culinary apprentice in navy jacket; executes live heat checks and knife work.',
      },
      {
        token: 'REF: CHAR_PRIYA',
        name: 'Priya Nair (24)',
        role: 'Apprentice Cohort Cook · Bench #3',
        description:
          'First-year culinary apprentice in charcoal jacket; demonstrates dough proofing, emulsion, and plating.',
      },
      {
        token: 'REF: LOC_HARBOR_KITCHEN',
        name: 'Harbor Street Teaching Kitchen',
        role: 'Locked Studio Set',
        description:
          'Daylight-lit industrial brick and green ceramic wall tiles, brushed-steel central pass, maple butcher blocks, and heavy copper stockpots.',
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
          'REF: LOC_HARBOR_KITCHEN bathed in crisp morning daylight: REF: CHAR_LILA ties her slate apron over her white double-breasted coat at the brushed-steel island, speaking directly to A-Cam while REF: CHAR_MARCUS and REF: CHAR_PRIYA prep copper stockpots at the rear benches.',
        cameraAndLighting:
          'Smooth 50mm dolly-in on A-Cam; 5600K natural window daylight catching the green ceramic tiles and copper cookware.',
        sfxAndMusic:
          'Crisp linen apron tie, warm acoustic guitar and light brushed-snare culinary score.',
        settleOn:
          'Chef Lila resting her hands calmly on the maple cutting board, ready to begin Module 1.',
      },
      {
        blockNumber: 2,
        title: 'Module 1: The Broth — 90° Overhead & Macro Simmer',
        timecode: '0:10–0:20',
        timing: 'Motion 0:10–0:17 · Settle 0:17–0:20',
        narrationVo:
          'Forget static slide readers. Direct multi-camera physical demonstrations synced to every teaching beat.',
        videoPrompt:
          'Seamless instructional cut in REF: LOC_HARBOR_KITCHEN: 90-degree overhead B-Cam shows REF: CHAR_LILA’s hands demonstrating uniform mirepoix knife cuts, cutting to 100mm Macro C-Cam as a single lazy convection bubble rises through crystal-clear golden broth while her ladle skims the surface.',
        cameraAndLighting:
          'Locked 90° overhead bench rig cutting to 100mm macro at T2.8 with warm backlit steam.',
        sfxAndMusic:
          'Rhythmic knife-on-maple cadence followed by a gentle simmer purr.',
        settleOn:
          'A crystal-clear spoonful of golden broth held up against the kitchen window light.',
      },
      {
        blockNumber: 3,
        title: 'Module 2: The Bread — Fermentation, Touch & Crumb Check',
        timecode: '0:20–0:30',
        timing: 'Motion 0:20–0:27 · Settle 0:27–0:30',
        inSceneDialogue:
          'CHEF LILA MENSAH: "Don’t watch the clock—read the dough. When it springs back halfway, the loaf is ready for the blade."',
        videoPrompt:
          'Same kitchen, same instructor: flour dusts the maple bench as REF: CHAR_LILA guides REF: CHAR_MARCUS and REF: CHAR_PRIYA through a gentle fingertip proof check, scores a taut sourdough boule with a curved lame, and pulls a blistered, mahogany-crusted loaf from the deck oven.',
        cameraAndLighting:
          '45-degree bench two-shot cutting to tight macro of the lame scoring the flour-dusted crust.',
        sfxAndMusic:
          'Crisp whisper of the razor lame through dough; crackling artisan crust as the loaf cools.',
        settleOn:
          'Lila slicing the loaf open to reveal a steaming, honeycomb open crumb.',
      },
      {
        blockNumber: 4,
        title: 'Module 3: The Vegetable Main — Emulsion & Consistency',
        timecode: '0:30–0:39',
        timing: 'Motion 0:30–0:36 · Settle 0:36–0:39',
        narrationVo:
          'Instructor face, wardrobe, and studio geometry stay locked from Lesson One to Lesson Five.',
        videoPrompt:
          'At the range in REF: LOC_HARBOR_KITCHEN: REF: CHAR_LILA and REF: CHAR_PRIYA deglaze charred brassicas and heritage grains with a ladle of Module 1’s clear broth, swirling cold butter into a glossy emulsion and plating six identical bowls down the pass.',
        cameraAndLighting:
          'Dynamic lateral tracking shot along the range; warm copper pan reflections and vibrant emerald greens.',
        sfxAndMusic:
          'Expressive pan sizzle as broth hits hot steel; upbeat percussive bassline.',
        settleOn:
          'Overhead view of six identical plated vegetable mains lined up along the steel pass.',
      },
      {
        blockNumber: 5,
        title: 'Module 4: The Celebration Roast — Thermal Precision',
        timecode: '0:39–0:48',
        timing: 'Motion 0:39–0:45 · Settle 0:45–0:48',
        narrationVo:
          'Voice, captions, and on-screen technique land on the exact same beat.',
        videoPrompt:
          'Close-up C-Cam coverage as REF: CHAR_LILA bastes an herb-crusted celebration roast with foaming thyme butter in a tilted copper pan, while REF: CHAR_MARCUS checks internal carry-over temperature and carves clean medallions beside toasted sourdough panzanella from Module 2.',
        cameraAndLighting:
          '100mm macro basting shot at 60fps slow-motion settling into a balanced medium carving shot.',
        sfxAndMusic:
          'Rich aromatic butter foaming sizzle; warm cello and acoustic guitar harmony.',
        settleOn:
          'Carved roast platter resting on the butcher block with golden pan juices.',
      },
      {
        blockNumber: 6,
        title: 'Module 5: The Last Sweet — Cumulative Mastery',
        timecode: '0:48–0:57',
        timing: 'Motion 0:48–0:54 · Settle 0:54–0:57',
        narrationVo:
          'Every module builds on the last—heat control, timing, seasoning, and composure.',
        videoPrompt:
          '90-degree overhead B-Cam and macro C-Cam: REF: CHAR_LILA pours amber caramel over poached orchard pears and quenelles spiced crème fraîche with surgical steadiness while REF: CHAR_PRIYA and REF: CHAR_MARCUS mirror the plating at their stations.',
        cameraAndLighting:
          'Warm late-afternoon sunlight slanting across the green kitchen tiles; jewel-like amber caramel highlights.',
        sfxAndMusic:
          'Delicate crystalline sugar tap and gentle musical crescendo.',
        settleOn:
          'Three finished dessert plates completed in unison across the three benches.',
      },
      {
        blockNumber: 7,
        title: 'The Five-Plate Graduation Service',
        timecode: '0:57–1:06',
        timing: 'Motion 0:57–1:03 · Settle 1:03–1:06',
        inSceneDialogue:
          'CHEF LILA MENSAH: "You didn’t just learn five recipes. You built a system that holds together when the kitchen gets hot."',
        videoPrompt:
          'Wide A-Cam dolly shot in REF: LOC_HARBOR_KITCHEN as REF: CHAR_LILA, REF: CHAR_MARCUS, and REF: CHAR_PRIYA set all five progressive dishes—the clear broth, the sourdough loaf, the vegetable main, the celebration roast, and the pear tart—down the length of the sunlit chef’s table.',
        cameraAndLighting:
          'Wide 35mm master shot showing the entire locked kitchen set, consistent wardrobe, and all five dishes.',
        sfxAndMusic:
          'Warm ceramic plates set on oak; full, uplifting acoustic ensemble.',
        settleOn:
          'Chef Lila standing at the head of the pass with Marcus and Priya beside her.',
      },
      {
        blockNumber: 8,
        title: 'The Completed Table & SceneFlow Signature',
        timecode: '1:06–1:15',
        timing: 'Motion 1:06–1:12 · Settle 1:12–1:15',
        narrationVo:
          'Five Plates. A complete multi-module training series—directed, synced, and mastered in SceneFlow. Imagine the possibilities.',
        videoPrompt:
          'Continuous 90-degree overhead tracking shot gliding over all five finished plates on the oak table, tilting up to REF: CHAR_LILA, REF: CHAR_MARCUS, and REF: CHAR_PRIYA raising tasting spoons together in the warm Harbor Street Kitchen.',
        cameraAndLighting:
          'Overhead crane tilt-up into a warm golden-hour studio portrait.',
        sfxAndMusic:
          'Friendly clink of tasting spoons and a warm, resonant final guitar chord.',
        settleOn:
          'Title card over the sunlit five-plate table: "FIVE PLATES · BUILT IN SCENEFLOW".',
      },
    ],
  },
] as const

const TRAILER_SCRIPT_BY_ID: Record<ProductionWalkId, ExampleTrailerScript> = {
  drama: EXAMPLE_TRAILER_SCRIPTS[0],
  animation: EXAMPLE_TRAILER_SCRIPTS[1],
  documentary: EXAMPLE_TRAILER_SCRIPTS[2],
  training: EXAMPLE_TRAILER_SCRIPTS[3],
}

export function getExampleTrailerScript(id: string): ExampleTrailerScript | null {
  if (id === 'drama' || id === 'animation' || id === 'documentary' || id === 'training') {
    return TRAILER_SCRIPT_BY_ID[id]
  }
  return null
}

export function formatExampleTrailerScript(script: ExampleTrailerScript): string {
  const header = [
    `# ${script.buttonLabel.toUpperCase()} TRAILER — "${script.showTitle}" (${script.runtimeLabel})`,
    `Format: ${script.formatBadge}`,
    `Tagline: ${script.tagline}`,
    `Logline: ${script.logline}`,
    `Art Style Lock: ${script.artStyleLock}`,
    `Continuity Lock: ${script.continuityBadge}`,
    `Target Assets: ${script.webmSrc.split('?')[0]} | ${script.mp4Src.split('?')[0]}`,
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
