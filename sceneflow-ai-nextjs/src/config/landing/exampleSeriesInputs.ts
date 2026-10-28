/**
 * Paste-ready Create Series inputs for the four production examples.
 * English source. Visitors can read the storyline; Copy puts the same text
 * on the clipboard for New Series.
 */

export type ExampleSeriesEpisode = {
  number: number
  title: string
  duration: string
  synopsis: string
}

export type ExampleSeriesCastMember = {
  name: string
  role: string
  descriptor: string
}

export type ExampleEpisodeOneHighlight = {
  episodeLabel: string
  title: string
  duration: string
  logline: string
  synopsis: string
  chapter1Title: string
  chapter1Duration: string
  chapter1Synopsis: string
}

export type ExampleSeriesInput = {
  cardId: 'drama' | 'animation' | 'documentary' | 'training'
  showTitle: string
  format: string
  genre: string
  artStyle: string
  duration: string
  continuityLock: string
  unitLabel: string
  artLock: string
  concept: string
  logline: string
  seriesSynopsis: string
  storyline: string
  cast: readonly ExampleSeriesCastMember[]
  episode1Synopsis: ExampleEpisodeOneHighlight
  episodes: readonly ExampleSeriesEpisode[]
}

export const EXAMPLE_SERIES_INPUTS: readonly ExampleSeriesInput[] = [
  {
    cardId: 'drama',
    showTitle: 'The White City Current',
    format: '6-Episode Prestige Series · Episode 1 Pilot (8 Chapters)',
    genre: 'Sci-Fi Infrastructure Thriller',
    artStyle: 'Anamorphic Photorealism · Tungsten, Sub-Zero Slate & Violet-Teal Induction Glow',
    duration: '265 min Series (6 × 42–48 min) · Ep 1: 42.5 min',
    continuityLock:
      'Gideon Croft, Piper Hayes, Julian Ward & Dr. Clara Vance-Croft · 4 Subterranean & Lakefront Sets · Clara’s 1893 Manifold & Cipher',
    unitLabel: 'Episode 1 Story Beats / Chapters (8)',
    artLock:
      'Locked anamorphic photorealism across every beat: Gideon Croft’s weathered archivist smock, Piper Hayes’s snow-dusted field coat, Julian Ward’s corporate tactical gear, Clara’s restored 1893 induction manifold, and the progression from 1906 freight tunnels to the frozen Two-Mile Crib.',
    concept:
      'When a disgraced reporter breaches the subterranean bunker of an isolated infrastructure archivist to activate an 1893 atmospheric energy artifact, the pair must survive an elite strike team led by the corporate risk operative who murdered his wife—culminating in a choice between self-preservation and liberating humanity from artificial scarcity.',
    logline:
      'When a disgraced reporter breaches the subterranean bunker of an isolated infrastructure archivist to activate an 1893 atmospheric energy artifact, the pair must survive an elite strike team led by the corporate risk operative who murdered his wife—culminating in a choice between self-preservation and liberating humanity from artificial scarcity.',
    seriesSynopsis:
      'Set beneath a climate-battered American Midwest where private utility conglomerate Vane-Calhoun Energy weaponizes rolling winter blackouts to extract municipal concessions, The White City Current spans six 45-minute episodes. Former municipal archivist Gideon Croft and blacklisted investigative journalist Piper Hayes uncover a suppressed 1893 Columbian Exposition resonant-induction network engineered by Gideon’s late wife, Dr. Clara Vance-Croft. Across Season 1, lighting the Chicago Two-Mile Crib in Episode 1 triggers a high-stakes war across historic subterranean infrastructure corridors—from Detroit’s salt-mine substations to Niagara’s decommissioned wheel-pits—pitting public-grid liberation against Senior Risk Director Julian Ward’s private containment directorate.',
    storyline:
      'In the subterranean labyrinth of Chicago’s abandoned 1906 freight tunnel network, former municipal infrastructure archivist Gideon Croft lives in hyper-vigilant isolation, compulsively calculating mathematical proofs to dismiss his late wife Clara’s suppressed wireless energy discoveries as impossible delusions while a brutal polar vortex freezes working-class South Side wards under Vane-Calhoun Energy’s engineered blackouts. When blacklisted investigative reporter Piper Hayes infiltrates his vault carrying Clara’s final cryptographic cipher, internal Vane-Calhoun shutoff manifests, and Clara’s handwritten plea, Gideon’s defensive skepticism shatters. Igniting the restored induction manifold in a violet electromagnetic surge trips monitoring sensors overseen by Julian Ward, Vane-Calhoun’s ruthless Senior Director of Corporate Risk. When Ward’s sanitization squad breaches the vault and Piper takes shrapnel shielding Gideon, Gideon overcomes his instinct to seal himself away—guiding her through steam-flooded sluices, suturing her wound in a derelict Adams Street pneumatic mail station, blasting open a lakefront ventilation flue, and hauling her through a half-flooded 1890s sub-lacustrine water-intake siphon beneath two miles of pack ice to the offshore Two-Mile Crib. Cornered on the gale-swept gantry, Gideon rejects Ward’s bribe, routes Ward’s high-voltage inversion charge through Victorian hydraulic flood-gates, and couples Clara’s manifold to the regional array while Piper uplinks proof of Vane-Calhoun’s crimes—wirelessly restoring heat and light across Chicago before Gideon incinerates his credentials at dawn.',
    cast: [
      {
        name: 'Gideon Croft',
        role: 'Protagonist · Locked Character Sheet',
        descriptor:
          'Former Municipal Infrastructure Archivist (54). Weathered charcoal wool archivist smock, wire-rimmed spectacles, salt-and-pepper beard, calloused draftsman hands; lit by warm 3200K tungsten against cold tunnel slate.',
      },
      {
        name: 'Piper Hayes',
        role: 'Co-Lead · Locked Character Sheet',
        descriptor:
          'Blacklisted Investigative Energy Reporter (31). Snow-dusted olive field parka, canvas satchel with encrypted drive and brass cipher cylinder, sharp kinetic intensity under violet-teal induction spill.',
      },
      {
        name: 'Julian Ward',
        role: 'Primary Antagonist · Locked Character Sheet',
        descriptor:
          'Senior Director of Corporate Risk, Vane-Calhoun Energy (46). Tailored matte-black tactical overcoat, bone-conduction comms, surgical calm; framed with sterile high-contrast institutional lighting.',
      },
      {
        name: 'Dr. Clara Vance-Croft',
        role: 'Archival & Memory Anchor · Locked Character Sheet',
        descriptor:
          'Late Resonance Physicist (48). Slate lab coat, copper-wound 1893 calibration rig, warm amber flashback plates and holographic schematic reflections.',
      },
    ],
    episode1Synopsis: {
      episodeLabel: 'Episode 1 Synopsis · Feature-Length Pilot (8 Chapters)',
      title: 'Episode 1: The Faraday Protocol',
      duration: '42.5 min (8 Chapters · Chapter 1 Live Proof: 6 min)',
      logline:
        'A grieving tunnel archivist and a hunted reporter ignite an 1893 wireless power manifold beneath frozen Chicago and fight through two miles of sub-lakebed tunnels to broadcast the truth.',
      synopsis:
        'During a lethal polar vortex engineered by Vane-Calhoun Energy to bankrupt Chicago’s South Side wards, Piper Hayes breaches Gideon Croft’s 1906 freight-tunnel bunker with the missing cryptographic key to his murdered wife Clara’s 1893 resonant induction manifold. Awakening the prototype alerts Julian Ward’s sanitization unit, forcing Gideon and a wounded Piper out of hiding and through steam sluices, an Adams Street pneumatic mail station, and a collapsing 1890s sub-lacustrine intake tunnel to couple the manifold to the offshore Two-Mile Crib.',
      chapter1Title: 'Chapter 1 (Beat 1): Subterranean Isolation',
      chapter1Duration: '6 min · Initial Chapter Proof',
      chapter1Synopsis:
        'Forty feet beneath freezing Chicago, Gideon Croft’s chalk-covered vault hums under stolen municipal current while radio dispatches count South Side blackout casualties. Piper Hayes bypasses his perimeter tripwires carrying Clara’s brass cipher and Vane-Calhoun’s load-shedding orders—forcing Gideon to confront the proof that Clara’s death was a corporate assassination.',
    },
    episodes: [
      {
        number: 1,
        title: 'Subterranean Isolation',
        duration: '6 min',
        synopsis:
          'Establish Gideon’s defensive isolation in the 1906 Chicago freight tunnels, his obsession with rationalizing Clara’s murder as personal failure while Vane-Calhoun’s polar-vortex blackouts freeze the South Side, and Piper Hayes’s disruptive intrusion with Clara’s final cryptographic cipher.',
      },
      {
        number: 2,
        title: 'Unlocking the Faraday Protocol',
        duration: '5.5 min',
        synopsis:
          'Stage a fierce ideological collision as Piper confronts Gideon with internal Vane-Calhoun shutoff manifests and Clara’s handwritten plea—shattering his cynicism and forcing him to input the alignment sequence that wakes the resonant induction prototype in a violet electromagnetic surge.',
      },
      {
        number: 3,
        title: 'The Claustrophobic Counter-Offensive',
        duration: '5.5 min',
        synopsis:
          'Julian Ward’s tactical sanitization squad detonates breach charges into the vault. When Piper takes shrapnel shielding Gideon, he overcomes his instinct to seal himself away alone—guiding her through forgotten drainage sluices and scalding Ward’s contractors with an industrial steam bypass.',
      },
      {
        number: 4,
        title: 'Suture and Sub-Station',
        duration: '4.5 min',
        synopsis:
          'Taking shelter in a derelict pneumatic mail sorting station beneath Adams Street, Gideon field-sutures Piper’s wound in an intimate decompression beat that binds Clara’s legacy to Piper’s mission and cements Gideon’s commitment to the fight.',
      },
      {
        number: 5,
        title: 'Breaching the Harbor Flue',
        duration: '4.5 min',
        synopsis:
          'Cornered by Ward’s surface perimeter and timed thermite charges, Gideon and Piper execute an interdependent tactical breakthrough—jury-rigging a pressurized concussion canister in a pneumatic dispatch tube to blow open a ventilation flue to the frozen lakefront.',
      },
      {
        number: 6,
        title: 'The Sub-Lacustrine Traverse',
        duration: '5 min',
        synopsis:
          'Faced with two miles of churning pack ice to reach the offshore Two-Mile Crib, Gideon leads Piper through a hazardous, half-flooded 1890s brick water-intake siphon beneath the frozen lakebed—battling hypothermia, rising icy seepage, and structural collapse to haul her up the intake shaft.',
      },
      {
        number: 7,
        title: 'Stand on the Gantry',
        duration: '5.5 min',
        synopsis:
          'On the crib’s gale-swept gantry, Ward corners them with a high-voltage inversion relay and offers Gideon underground immunity and lab funding for Clara’s manifold. Gideon rejects corporate co-optation and hotwires Victorian hydraulic flood-gates to route Ward’s reverse charge back through the actuators.',
      },
      {
        number: 8,
        title: 'The Harmonic Grid Transmission and Vindication',
        duration: '6 min',
        synopsis:
          'Piper splices into the microwave uplink to broadcast Vane-Calhoun’s crimes to independent news outlets while Gideon couples Clara’s manifold to the regional array—unleashing a resonant harmonic transmission that restores heat and light across Chicago before Gideon burns his credentials at dawn.',
      },
    ],
  },
  {
    cardId: 'animation',
    showTitle: 'Hart House',
    format: 'Animated Sitcom · 5-Episode Season',
    genre: 'Multi-Generational Family Comedy',
    artStyle: '2D Flat-Cel Animation · Bold Ink Outlines & Warm Suburban Palette',
    duration: '110 min Season (5 × 22 min) · Ep 1: 22 min',
    continuityLock:
      '5 Locked Family Character Sheets · Millwick House & Side Porch · Zero Style Drift',
    unitLabel: 'Season 1 Episodes (5)',
    artLock:
      'One locked flat-cel style for the whole season: bold ink outlines, warm suburban color, and the same character designs in every episode. The platform can hold many styles. This series does not switch.',
    concept:
      'Hart House is a weekly family comedy in the invented town of Millwick. Ruth Hart, a municipal clerk, and Ellis Hart, a night-shift bus mechanic, share a small house with their daughter June (16), their son Milo (9), and Ruth’s mother, Nana Inez, who has turned the side porch into her rooms. Each episode is one ordinary Millwick problem — a new town rule, a rained-out festival, a breakfast that is the only hour the family overlaps — told so the joke is also the point. Lock one flat-cel art style, these five faces, and this house from episode 1 to episode 5. Episode 5 turns: the family has to decide whether Nana Inez’s “temporary” porch is actually her home.',
    logline:
      'In Millwick, the Harts turn a household argument into the week’s joke, and the joke into the reason they still live under one roof.',
    seriesSynopsis:
      'Set in the civic-ordinance-obsessed town of Millwick, Hart House is a five-episode, 22-minute 2D animated family sitcom built to prove zero off-model drift across an entire broadcast season. Municipal clerk Ruth Hart and night-shift transit mechanic Ellis Hart share a cramped craftsman house with sixteen-year-old debate captain June, nine-year-old fact-collector Milo, and Ruth’s mother Nana Inez, whose “temporary” enclosed side porch has quietly become the emotional center of the home. Every episode turns a small municipal headache into rapid-fire ensemble comedy while keeping identical line weights, warm cel-shaded palettes, and multi-angle character sheets locked from Episode 1 through the Episode 5 household vote.',
    storyline:
      'Ruth keeps the calendar. Ellis fixes machines that almost work. June, sixteen, will debate the rule before she follows it. Milo, nine, collects facts nobody requested. Nana Inez remembers every slight the block ever offered and still sets an extra plate. The season is five weeks in one house. The art style never changes: the same ink line, the same warm palette, the same faces. What changes is how much of the house belongs to Nana Inez, and whether Millwick will treat a temporary arrangement as a real home.',
    cast: [
      {
        name: 'Ruth Hart',
        role: 'Matriarch · Locked 2D Character Sheet',
        descriptor:
          'Millwick Municipal Clerk (42). Terracotta knit cardigan, tortoiseshell glasses, color-coded wall calendar; deadpan vocal timing and expressive eyebrow arcs.',
      },
      {
        name: 'Ellis Hart',
        role: 'Patriarch · Locked 2D Character Sheet',
        descriptor:
          'Night-Shift Municipal Bus Mechanic (44). Navy shop coveralls, steel thermos, optimistic garage inventor who solves 5-minute chores with 40-pound contraptions.',
      },
      {
        name: 'June Hart',
        role: 'Daughter · Locked 2D Character Sheet',
        descriptor:
          'High School Debate Captain (16). Mustard hoodie over pleated skirt, annotated town charter in hand; treats every dinner-table rule like a Supreme Court oral argument.',
      },
      {
        name: 'Milo Hart',
        role: 'Son · Locked 2D Character Sheet',
        descriptor:
          'Household Archivist & Label-Maker Enthusiast (9). Striped rugby shirt, untied high-tops, industrial label gun; delivers devastatingly literal truths on the comedic beat.',
      },
      {
        name: 'Nana Inez',
        role: 'Grandmother · Locked 2D Character Sheet',
        descriptor:
          'Side-Porch Sovereign & Retired Seamstress (71). Embroidered indigo shawl, silver chignon, wicker throne; remembers every zoning variance on the block since 1984.',
      },
    ],
    episode1Synopsis: {
      episodeLabel: 'Episode 1 Synopsis · Season Premiere (4 Chapters)',
      title: 'Episode 1: The Sorting Rule',
      duration: '22 min (4 Chapters · Chapter 1 Live Proof: 5.5 min)',
      logline:
        'A twelve-category town recycling mandate inspires Ellis to build a motorized garage sorting conveyor that accidentally classifies Nana Inez’s porch belongings as municipal surplus.',
      synopsis:
        'When Millwick enacts Ordinance 412—requiring twelve color-coded curb bins by Thursday morning—Ruth wants quiet compliance so her coworkers at Town Hall cannot gossip, June drafts a constitutional challenge for the council mic, and Ellis constructs a pulley-driven sorting machine in the garage. The machine triumphs on glass bottles before devouring the family’s unlabeled storage boxes, culminating in a living-room standoff when Milo prints a tag reading “Nana’s Temporary Porch Things” and the family must admit nobody knows what “temporary” means.',
      chapter1Title: 'Chapter 1 (Cold Open & Act I): Twelve Bins by Thursday',
      chapter1Duration: '5.5 min · Initial Chapter Proof',
      chapter1Synopsis:
        'At 6:15 a.m. in the locked Hart kitchen, Ruth unveils the town’s twelve-category sorting chart while Ellis returns from night shift with a salvaged bus-door motor. Across fast-cut flat-cel reaction shots, Milo begins labeling household furniture and Nana Inez declares the side porch exempt from municipal jurisdiction.',
    },
    episodes: [
      {
        number: 1,
        title: 'The Sorting Rule',
        duration: '22 min',
        synopsis:
          'Millwick issues a new recycling order with twelve categories. Ellis builds a sorting machine in the garage. It works on bottles and then, disastrously, on the family’s unlabeled boxes. June wants to challenge the rule at the town meeting. Ruth wants the curb to look compliant by Thursday. The episode lands when Milo labels one box “Nana’s porch things” and nobody can agree what the label means.',
      },
      {
        number: 2,
        title: 'Parade Weather',
        duration: '22 min',
        synopsis:
          'Rain is forecast for Millwick Day. June wants to cancel her debate-club banner. Milo wants to log the lightning. Nana Inez refuses to wave at a neighbor she has avoided since a fence dispute. Ruth still has to host the block under a tarp. The joke is the tarp. The point is who gets to decide that a celebration happened.',
      },
      {
        number: 3,
        title: 'Night Shift Breakfast',
        duration: '22 min',
        synopsis:
          'Ellis gets home at dawn and cooks for people who are already leaving. June has a tournament. Milo has a field trip. Ruth has a counter shift. For one hour the kitchen is the whole family, and the eggs are the only conversation that fits. A burnt pancake becomes the running argument about whose morning the house is built around.',
      },
      {
        number: 4,
        title: 'The Spare Key',
        duration: '22 min',
        synopsis:
          'Someone has been refilling the cat’s bowl on the mornings Ellis oversleeps. The Harts investigate and find the key they hid under a brick years ago. The neighbor they have been calling nosy has been covering the dawn gap. Nana Inez has to decide whether to take the key back or admit the block has been helping.',
      },
      {
        number: 5,
        title: 'The Porch Vote',
        duration: '22 min',
        synopsis:
          'Nana Inez announces she is done with the “temporary” porch and will move to her sister’s town. The Harts call a household vote. Rebuilding the porch as her real rooms means Ellis’s garage project stops, June’s study corner moves, and Millwick has to permit a change it has been ignoring. The season turns here: the comedy is no longer about a messy week. It is about who gets to stay.',
      },
    ],
  },
  {
    cardId: 'documentary',
    showTitle: 'The Long Thought',
    format: 'Historical Documentary · 5-Part Series',
    genre: 'Global History of Science & Technology',
    artStyle: 'Era-Accurate Archival Realism (1950s 16mm Grain → 1980s CRT → Modern 4K)',
    duration: '200 min Series (5 × 40 min) · Ep 1: 40 min',
    continuityLock:
      '2 Recurring Witnesses (Dr. Amira Hassan & Kenji Sato) · 12 Global Cities · Strict Period Guardrails',
    unitLabel: 'Documentary Episodes (5)',
    artLock:
      'Period accuracy is the rule of the picture. A 1956 lab has period wardrobe, film grain, and the machines of that year — no flat screens, no phones. A present-day chapter looks like now. The same two witnesses, Dr. Amira Hassan and Kenji Sato, keep the same faces across every era they appear in.',
    concept:
      'The Long Thought is a five-episode documentary on the rise and trajectory of artificial intelligence and the question of superintelligence. It is global, not a single-country story: Manchester and Tokyo in the early labs, a Nairobi records room and a Seoul chip floor when machines became useful, a Lagos newsroom and a São Paulo classroom when the public arrived, then one present day in Manila, Accra, and Rotterdam, and a final chapter that refuses both utopia and doom. Lock the narrator and the two witnesses. Keep every chapter’s wardrobe, rooms, and cities accurate to that year.',
    logline:
      'A five-part documentary follows intelligence — built, borrowed, and still unfinished — from the first useful machines to the question of a system smarter than its makers.',
    seriesSynopsis:
      'Spanning seventy years and twelve cities across five continents, The Long Thought is a five-part, 200-minute documentary series tracing humanity’s attempt to externalize reasoning—from 1956 relay rooms in Manchester and Tokyo to contemporary foundation-model infrastructure and the governance horizon of superintelligence. Anchored by recurring on-camera witnesses Dr. Amira Hassan (Cairo/London) and Kenji Sato (Osaka/Tokyo), SceneFlow’s Historical Style Guardrails lock period-authentic lenses, wardrobe, and room geometry per decade while automatically weaving transcript-synced archival cutaways, schematics, and multi-language narration.',
    storyline:
      'Two witnesses carry the series. Dr. Amira Hassan starts in a Cairo lecture hall and later works between Cairo and London. Kenji Sato starts on an Osaka factory floor and later in a research lab. A calm narrator ties the chapters. The pictures never cheat the year. Early episodes cannot contain a smartphone. The present cannot be dressed as the 1950s. The last episode does not predict a winner. It asks what a system smarter than the people who built it would owe the people who never got a vote.',
    cast: [
      {
        name: 'Dr. Amira Hassan',
        role: 'Lead Witness · Multi-Era Locked Identity',
        descriptor:
          'Mathematical Logician & AI Governance Scholar. Appears in 1980s Cairo/Paris archival recreations (age 28) and present-day 4K London interview plates (age 64) with locked facial structure and vocal cadence.',
      },
      {
        name: 'Kenji Sato',
        role: 'Co-Lead Witness · Multi-Era Locked Identity',
        descriptor:
          'Industrial Control & Semiconductor Engineer. Tracked from 1980s Osaka/Seoul fabrication floors to contemporary Tokyo robotics archives with natural micro-expressions and lip-sync.',
      },
      {
        name: 'The Chronicler (Narrator)',
        role: 'Documentary Voice-of-God · 4-Language Neural Lock',
        descriptor:
          'Measured, unsensationalist documentary narrator driving transcript-timed archival B-roll and localized audio mixes in English, Spanish, Chinese, and Arabic.',
      },
      {
        name: 'Historical Lab & Field Ensemble',
        role: 'Period-Guarded Re-Enactment Cast (1956–Present)',
        descriptor:
          '1956 Manchester and Tokyo computing pioneers, 1989 Nairobi hospital records analysts, and present-day practitioners in Manila, Accra, and Rotterdam—strictly filtered against modern anachronisms.',
      },
    ],
    episode1Synopsis: {
      episodeLabel: 'Episode 1 Synopsis · Series Premiere (5 Chapters)',
      title: 'Episode 1: The Room with the Switches (1950–1968)',
      duration: '40 min (5 Chapters · Chapter 1 Live Proof: 6 min)',
      logline:
        'In post-war Manchester, Princeton, and Tokyo, a handful of mathematicians and relay engineers wire rooms the size of gymnasiums to test whether a machine can hold a rule and change its mind.',
      synopsis:
        'Episode 1 reconstructs the physical and philosophical birth of machine intelligence between 1950 and 1968. Moving between 16mm archival-grade recreations of Manchester’s Ferranti Mark 1, Tokyo’s ETL Mark III relay room, and Dartmouth’s 1956 summer study, Dr. Amira Hassan and Kenji Sato examine the artifacts their mentors left behind—showing how early researchers mistook formal logic for human common sense, yet laid the switching architecture that still governs modern compute.',
      chapter1Title: 'Chapter 1: The Relay That Remembered (Manchester & Tokyo, 1956)',
      chapter1Duration: '6 min · Initial Chapter Proof',
      chapter1Synopsis:
        'Shot in locked 1956 16mm grain with zero modern artifacts, engineers in wool waistcoats trace a fault across clattering electromagnetic relays in Manchester and Tokyo, intercut with crisp 4K present-day interview plates of Amira Hassan and Kenji Sato holding original 5-hole punched tape—closing on a single toggle switch left on through the night.',
    },
    episodes: [
      {
        number: 1,
        title: 'The Room with the Switches',
        duration: '40 min',
        synopsis:
          'Mid-century labs in Manchester, Princeton, and Tokyo. Researchers in period dress stand over machines that do one clever thing in a loud room. Amira’s teacher, on a later interview tape, describes the hope without using a single object from the future. Kenji’s uncle services a factory controller the size of a wardrobe. The chapter ends on a switch left in the on position overnight.',
      },
      {
        number: 2,
        title: 'The Useful Machine',
        duration: '40 min',
        synopsis:
          'The 1980s and 1990s. An expert system in a Nairobi hospital records room, a chip floor in Seoul, a translation office in Paris. Beige terminals, CRT glow, clothing and cars of that decade. Amira, young, watches a program suggest a diagnosis a senior clinician rejects. Kenji sees a line stop because a sensor trusted itself. Useful, and already arguing with the people beside it.',
      },
      {
        number: 3,
        title: 'The Public Arrival',
        duration: '40 min',
        synopsis:
          'The 2010s. A Lagos newsroom, a São Paulo classroom, a Berlin kitchen where a phone answers a question a child asked out loud. The model has left the lab. Amira is now the person reporters call. Kenji’s factory posts a notice that the night shift will “consult the system.” The chapter holds on faces reading a screen, not on the screen.',
      },
      {
        number: 4,
        title: 'The Acceleration',
        duration: '40 min',
        synopsis:
          'One present day, three cities. A nurse in Manila, a composer in Accra, a dock planner in Rotterdam. Each uses a system that finishes a sentence they started. The narrator counts what sped up and who was not in the room when the terms were set. Amira and Kenji, older, compare the notices on their doors. The pictures are contemporary: current dress, current streets, current light.',
      },
      {
        number: 5,
        title: 'The Question Ahead',
        duration: '40 min',
        synopsis:
          'The superintelligence horizon, told as a question rather than a prophecy. Amira and Kenji sit in a quiet archive — papers, photographs, and a machine that is not pretending to be a person. They ask what a system smarter than its makers would owe the nurse, the composer, the dock planner, and the people who never touched the switch. The series does not answer. It leaves the obligation in the room.',
      },
    ],
  },
  {
    cardId: 'training',
    showTitle: 'Five Plates',
    format: 'Instructional Series · 5-Module Course',
    genre: 'Hands-On Culinary Curriculum',
    artStyle: 'Natural Daylight Studio · Clean Overhead & Bench Coverage',
    duration: '75 min Course (5 × 15 min) · Module 1: 15 min',
    continuityLock:
      '1 Locked Instructor (Chef Lila Mensah) · 2 Apprentice Cohort Cooks · 1 Harbor Street Teaching Kitchen · 5 Progressive Plates',
    unitLabel: 'Course Modules (5)',
    artLock:
      'One locked chef. Chef Lila Mensah, the same face, the same white coat, the same close-cropped hair, in the same Harbor Street teaching kitchen — same tiles, same pots, same window — from the broth to the dessert.',
    concept:
      'Five Plates is a five-module culinary course taught by one chef in one kitchen. Chef Lila Mensah teaches five meals that build on each other: a clear broth, a bread, a vegetable main that can feed a class, a celebration roast, and a dessert that uses the skills of the first four. Learners see the same instructor, the same coat, and the same Harbor Street kitchen in every module. Each module is setup, demonstration, and a check before the next plate.',
    logline:
      'One chef, one kitchen, five meals — each plate teaching the hands what the next plate will need.',
    seriesSynopsis:
      'Designed as an enterprise-grade, multi-module instructional curriculum, Five Plates follows Chef Lila Mensah across five 15-minute lessons (75 minutes total) inside the locked Harbor Street Teaching Kitchen. Unlike avatar slide-readers that cannot demonstrate physical craft, SceneFlow locks Chef Mensah’s face, double-breasted coat, knife station, and green ceramic wall tiles across A-Cam medium teaching beats, B-Cam 90° overhead bench demonstrations, and C-Cam macro simmer/crumb inspections—building cumulative culinary competency from a foundational clear broth to a five-plate graduation service.',
    storyline:
      'Chef Lila Mensah does not change wigs, kitchens, or personalities between modules. The course is a sequence, not a pile of clips. Students learn heat and salt in the broth, time and touch in the bread, feeding a group with the vegetable main, holding a celebration plate, and finishing with a dessert that depends on everything before it. The last module is the check: the class cooks the five plates as one meal, and Lila is still the person who started the broth.',
    cast: [
      {
        name: 'Chef Lila Mensah',
        role: 'Lead Instructor · Locked Identity & Wardrobe',
        descriptor:
          'Executive Chef-Instructor (38). Crisp white double-breasted chef coat, slate apron, close-cropped hair; maintains identical facial geometry, hand continuity, and calm pedagogical authority across all 5 modules.',
      },
      {
        name: 'Marcus Cole',
        role: 'Apprentice Cohort Cook · Locked Character Sheet',
        descriptor:
          'First-Year Culinary Student (26). Navy apprentice jacket at Bench #2; executes live technique checks, heat adjustments, and troubleshooting diagnostics.',
      },
      {
        name: 'Priya Nair',
        role: 'Apprentice Cohort Cook · Locked Character Sheet',
        descriptor:
          'First-Year Culinary Student (24). Charcoal apprentice jacket at Bench #3; demonstrates seasoning calibration, dough proofing checks, and family-style plating.',
      },
      {
        name: 'Harbor Street Teaching Kitchen',
        role: 'Locked Studio Set · 3-Camera Instructional Rig',
        descriptor:
          'Daylight-lit industrial brick and green-tile studio with brushed-steel island, heavy copper stockpots, and synced callout graphics across A-Cam, 90° Overhead B-Cam, and Macro C-Cam.',
      },
    ],
    episode1Synopsis: {
      episodeLabel: 'Episode 1 (Module 1) Synopsis · Course Foundation (3 Chapters)',
      title: 'Module 1: The Broth — Extraction, Clarity & Heat Control',
      duration: '15 min (3 Chapters · Chapter 1 Live Proof: 5 min)',
      logline:
        'Chef Lila Mensah teaches heat management, aromatics, and skimming discipline through a crystal-clear foundation broth that powers the rest of the curriculum.',
      synopsis:
        'In Module 1, Chef Lila Mensah establishes the Harbor Street workbench and teaches the foundational skill of the course: transforming cold water, roasted bones or root vegetables, and aromatics into a clear, structured broth. Structured into three instructional chapters—(1) Cold Start & Knife Mise en Place, (2) The Convection Simmer & Skim, and (3) Late-Stage Salt Calibration & Clarity Check—learners master thermal control before touching flour or roast proteins in later modules.',
      chapter1Title: 'Chapter 1: Cold Water, Clean Bones & The First Simmer',
      chapter1Duration: '5 min · Initial Chapter Proof',
      chapter1Synopsis:
        'Opening on A-Cam in the daylight-balanced Harbor Street Kitchen, Chef Lila Mensah introduces the five-plate syllabus, switches to a locked 90° overhead B-Cam to demonstrate uniform mirepoix cuts and cold-water submersion, and brings the stockpot to its first lazy convection bubble alongside apprentices Marcus and Priya.',
    },
    episodes: [
      {
        number: 1,
        title: 'The Broth',
        duration: '15 min',
        synopsis:
          'Lila starts with a clear broth: knife, bones or vegetables, heat, and patience. She shows the simmer, the skim, and the moment salt goes in. The kitchen, the coat, and her face are established as the locked set. The check is a spoonful that tastes finished, not cloudy.',
      },
      {
        number: 2,
        title: 'The Bread',
        duration: '15 min',
        synopsis:
          'Same bench, same chef. Dough, time, and the feel of a proved loaf. Lila ties the broth’s lesson about patience to the wait the dough requires. Students shape, score, and bake. The check is a crumb that is open, not gummy, and a note on what they would change next time.',
      },
      {
        number: 3,
        title: 'The Vegetable Main',
        duration: '15 min',
        synopsis:
          'A pan of greens and grains that has to feed the whole class, not a camera. Lila shows a sauce built from the broth, seasoning for a group, and how to hold color in the vegetables. The check is a plate that is the same in the first bowl and the last.',
      },
      {
        number: 4,
        title: 'The Celebration Roast',
        duration: '15 min',
        synopsis:
          'A center plate for a night that matters: roast, rest, and a side that uses yesterday’s bread. Lila keeps the same station and the same voice while the stakes of the plate go up. The check is carving for a table, not a single hero shot.',
      },
      {
        number: 5,
        title: 'The Last Sweet',
        duration: '15 min',
        synopsis:
          'A dessert that needs the heat control of module 1, the timing of module 2, and the seasoning eye of module 3. Then the class sets all five plates as one meal. Lila walks the pass in the same coat, in the same kitchen. The course turns from lessons into a service.',
      },
    ],
  },
]

const SERIES_BY_CARD: Record<ExampleSeriesInput['cardId'], ExampleSeriesInput> = {
  drama: EXAMPLE_SERIES_INPUTS[0],
  animation: EXAMPLE_SERIES_INPUTS[1],
  documentary: EXAMPLE_SERIES_INPUTS[2],
  training: EXAMPLE_SERIES_INPUTS[3],
}

export function getExampleSeriesInput(cardId: string): ExampleSeriesInput | null {
  if (
    cardId === 'drama' ||
    cardId === 'animation' ||
    cardId === 'documentary' ||
    cardId === 'training'
  ) {
    return SERIES_BY_CARD[cardId]
  }
  return null
}

export function formatSeriesInput(series: ExampleSeriesInput): string {
  const castLines = series.cast
    .map((member) => `- ${member.name} (${member.role}): ${member.descriptor}`)
    .join('\n')
  const episodes = series.episodes
    .map((episode) => `${episode.number}. ${episode.title} (${episode.duration})\n${episode.synopsis}`)
    .join('\n\n')
  return [
    series.showTitle,
    `Format: ${series.format}`,
    `Genre: ${series.genre}`,
    `Art Style: ${series.artStyle}`,
    `Duration: ${series.duration}`,
    `Continuity Lock: ${series.continuityLock}`,
    series.artLock,
    '',
    'Create Series input',
    series.concept,
    '',
    'Series Synopsis',
    series.seriesSynopsis,
    '',
    'Cast & Continuity Locks',
    castLines,
    '',
    series.episode1Synopsis.episodeLabel,
    `${series.episode1Synopsis.title} (${series.episode1Synopsis.duration})`,
    series.episode1Synopsis.synopsis,
    `${series.episode1Synopsis.chapter1Title} (${series.episode1Synopsis.chapter1Duration}): ${series.episode1Synopsis.chapter1Synopsis}`,
    '',
    'Storyline',
    series.logline,
    '',
    series.storyline,
    '',
    series.unitLabel,
    episodes,
  ].join('\n')
}
