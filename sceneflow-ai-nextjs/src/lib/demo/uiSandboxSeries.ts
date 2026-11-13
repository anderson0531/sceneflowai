import type {
  EpisodeBlueprintWithProject,
  SeriesProductionBible,
  SeriesResonanceAnalysis,
  SeriesResponse,
} from '@/types/series'
import type { ReferenceGroups } from '@/lib/series/referenceTransfer'

export const DEMO_SERIES_ID = '00000000-0000-4000-8000-000000000101'
export const DEMO_ANIMATED_SERIES_ID = '00000000-0000-4000-8000-000000000102'

export const DEMO_EPISODE_1_PROJECT_ID = '00000000-0000-4000-8000-000000000001'
export const DEMO_SILT_LINE_PROJECT_ID = '00000000-0000-4000-8000-000000000004'

export function isDemoSeriesId(id?: string | null): boolean {
  if (!id) return false
  const normalized = String(id).trim().toLowerCase()
  return (
    normalized === DEMO_SERIES_ID ||
    normalized === DEMO_ANIMATED_SERIES_ID ||
    normalized === 'demo-series' ||
    normalized === 'glass-ledger-series' ||
    normalized === 'silt-line-series'
  )
}

const GLASS_LEDGER_BIBLE: SeriesProductionBible = {
  version: '1.4.0',
  lastUpdated: '2026-11-12T18:30:00.000Z',
  lastUpdatedBy: 'Studio Showrunner',
  logline:
    'Beneath a rain-swept maritime metropolis, a forensic archivist discovers a missing etched-quartz plate inside a centuries-old municipal debt codex—exposing a ruling syndicate preparing a midnight archival purge.',
  synopsis:
    'In New Veridian, property deeds, harbor water rights, and sovereign bond obligations are notarized in The Glass Ledger: a subterranean vault of laser-etched quartz plates impervious to fire and flood. When Lead Forensic Archivist Elara Vance discovers Plate XIV has been surgically excised with a horological rotary blade, her investigation pits her against Chief Curator Marcus Thorne and binds her in an uneasy alliance with reluctant optical cryptographer Dr. Aris Kael. Across six episodes, Elara and Aris follow the twin quartz impression from flooded municipal vaults to offshore customs barges—racing to broadcast the city’s true ownership ledger before Thorne’s midnight purge erases three districts from civic law.',
  setting:
    'New Veridian — a dense coastal financial capital where Neo-Gothic cast-iron subterranean vaults, flooded tidal canals, and modern glass harbor towers coexist in perpetual autumn rain.',
  timeframe: 'Contemporary Neo-Noir (Autumn)',
  protagonist: {
    characterId: 'char-elara',
    name: 'Elara Vance',
    goal: 'Recover the excised Plate XIV and expose the Harbor Syndicate before the midnight purge rewrites municipal title law.',
    flaw: 'Instinctive institutional loyalty and isolationist self-reliance that makes trusting whistleblowers difficult.',
  },
  antagonistConflict: {
    type: 'character',
    characterId: 'char-marcus',
    description:
      'Chief Curator Marcus Thorne believes selective historical erasure is the price of civic stability—deploying vault lockdowns, private Harbor Authority operatives, and legal injunctions to bury Plate XIV.',
  },
  aesthetic: {
    cinematography:
      '35mm anamorphic Panavision lenses, shallow depth of field, tactile macro inserts of etched quartz and brass clockwork, deliberate dolly push-ins.',
    colorPalette: {
      primary: ['#D97706', '#0E7490', '#0F172A'],
      accents: ['#F59E0B', '#22D3EE', '#991B1B'],
    },
    aspectRatio: '16:9',
    artStyle: 'realistic',
    artStyleLocked: true,
    visualStyle:
      'Anamorphic Neo-Noir Realism — warm 2700K amber banker-lamp caustics refracting through bevelled quartz against cold 5600K cyan harbor rain and wet slate.',
    lightingStyle:
      'Chiaroscuro practical lighting: green-shaded desk lamps, prismatic quartz reflections, overhead street-grate cyan spill, and crimson lockdown strobes.',
    lockedPromptTokens: {
      global: [
        '35mm anamorphic neo-noir cinema',
        'warm 2700K amber quartz refraction vs cold 5600K cyan rain shadow',
        'tactile wet stone, tarnished brass, oxidized copper',
      ],
      characters: {
        'char-elara': [
          '34-year-old East Asian-European woman',
          'sleek chin-length dark espresso bob',
          'tailored slate-gray wool trench coat over charcoal mock-neck',
          'brass optical loupe on thin cord',
        ],
        'char-marcus': [
          '58-year-old silver-templed man with trimmed salt-and-pepper beard',
          'charcoal bespoke three-piece suit with burgundy silk tie',
          'silver pocket-watch chain across waistcoat',
        ],
        'char-aris': [
          '42-year-old South Asian man with thin round wire-rimmed spectacles',
          'ivory rolled-sleeve linen shirt under olive-brown tweed waistcoat',
          'brass jeweler loupe on leather cord',
        ],
      },
      locations: {
        'loc-vault': [
          'three-story Neo-Gothic subterranean archive vault',
          'cast-iron tiered bookshelves and shallow floor water channels',
          'green-shaded banker lamps on heavy oak examination tables',
        ],
        'loc-deck': [
          'soaring arched glass harbor observation deck lashed by night rain',
          'cyan neon harbor beacons and antique brass transit telescope',
        ],
      },
    },
  },
  characters: [
    {
      id: 'char-elara',
      name: 'Elara Vance',
      role: 'protagonist',
      age: 34,
      gender: 'Female',
      ethnicity: 'Mixed East Asian & European',
      build: 'Lean, poised',
      hairStyle: 'Sleek chin-length bob',
      hairColor: 'Dark espresso',
      eyeColor: 'Dark brown',
      keyFeature: 'Sharp cheekbones and brass optical loupe worn on a cord',
      expression: 'Composed forensic focus',
      defaultWardrobe: 'Tailored slate-gray wool trench coat over charcoal mock-neck sweater and dark leather gloves',
      wardrobeAccessories: 'Antique brass optical loupe on leather cord',
      voiceDescription: 'Measured alto, crisp diction, quiet intensity under pressure',
      description:
        'Lead Forensic Archivist of the Municipal Vault. Methodical, observant, and fiercely protective of historical truth after her mentor’s suspicious retirement.',
      appearance:
        '34-year-old woman of East Asian and European heritage with sharp cheekbones, sleek chin-length dark espresso bob, wearing a tailored slate-gray wool trench coat over a charcoal mock-neck sweater and a brass optical loupe.',
      referenceImageUrl: '/images/sandbox/glass-ledger/char-elara.jpg',
      wardrobes: [
        {
          id: 'wardrobe-elara-vault',
          name: 'Archive Duty Coat',
          description: 'Tailored slate-gray wool trench coat over charcoal mock-neck sweater with dark leather archive gloves.',
          previewImageUrl: '/images/sandbox/glass-ledger/char-elara.jpg',
          headshotUrl: '/images/sandbox/glass-ledger/char-elara.jpg',
          isDefault: true,
          sceneNumbers: [1, 2, 3],
        },
      ],
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-12T18:00:00.000Z',
    },
    {
      id: 'char-marcus',
      name: 'Marcus Thorne',
      role: 'antagonist',
      age: 58,
      gender: 'Male',
      ethnicity: 'European',
      build: 'Tall, upright, commanding',
      hairStyle: 'Swept-back silver-templed',
      hairColor: 'Silver and salt-and-pepper',
      eyeColor: 'Steel blue',
      keyFeature: 'Trimmed salt-and-pepper beard and antique silver pocket watch',
      expression: 'Patrician calm masking ruthless calculation',
      defaultWardrobe: 'Bespoke charcoal three-piece suit, crisp white dress shirt, deep burgundy silk tie',
      wardrobeAccessories: 'Silver pocket watch on waistcoat chain',
      voiceDescription: 'Resonant baritone, unhurried cadence, velvet authority',
      description:
        'Chief Curator of the High Archive and covert trustee for the Harbor Reclamation Syndicate. Views historical records as instruments of governance rather than public memory.',
      appearance:
        '58-year-old silver-templed man with a neatly trimmed salt-and-pepper beard, steel-blue eyes, bespoke charcoal three-piece suit, burgundy silk tie, and silver pocket-watch chain.',
      referenceImageUrl: '/images/sandbox/glass-ledger/char-marcus.jpg',
      wardrobes: [
        {
          id: 'wardrobe-marcus-curator',
          name: 'Curator Three-Piece Suit',
          description: 'Charcoal three-piece bespoke wool suit with burgundy silk tie and silver pocket watch.',
          previewImageUrl: '/images/sandbox/glass-ledger/char-marcus.jpg',
          headshotUrl: '/images/sandbox/glass-ledger/char-marcus.jpg',
          isDefault: true,
          sceneNumbers: [1],
        },
      ],
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-12T18:00:00.000Z',
    },
    {
      id: 'char-aris',
      name: 'Dr. Aris Kael',
      role: 'supporting',
      age: 42,
      gender: 'Male',
      ethnicity: 'South Asian',
      build: 'Slender scholar',
      hairStyle: 'Slightly tousled wavy',
      hairColor: 'Dark brown-black',
      eyeColor: 'Warm brown',
      keyFeature: 'Thin round wire-rimmed spectacles and jeweler’s loupe',
      expression: 'Conscience-stricken urgency',
      defaultWardrobe: 'Rolled-sleeve ivory linen shirt under an olive-brown tweed waistcoat',
      wardrobeAccessories: 'Tarnished brass jeweler’s loupe on leather cord',
      voiceDescription: 'Warm tenor, thoughtful phrasing, quickens when decoding',
      description:
        'Master optical cryptographer who engineered the archive’s laser-quartz calibration blades—unwittingly complicit in Thorne’s transfer order until Elara reveals the rotary cut.',
      appearance:
        '42-year-old South Asian man with warm brown eyes behind thin round wire-rimmed spectacles, tousled wavy dark hair, ivory rolled-sleeve linen shirt under an olive-brown tweed waistcoat.',
      referenceImageUrl: '/images/sandbox/glass-ledger/char-aris.jpg',
      wardrobes: [
        {
          id: 'wardrobe-aris-lab',
          name: 'Optical Workshop Waistcoat',
          description: 'Rolled-sleeve ivory linen shirt, olive-brown tweed waistcoat, wire-rimmed spectacles.',
          previewImageUrl: '/images/sandbox/glass-ledger/char-aris.jpg',
          headshotUrl: '/images/sandbox/glass-ledger/char-aris.jpg',
          isDefault: true,
          sceneNumbers: [2],
        },
      ],
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-12T18:00:00.000Z',
    },
  ],
  locations: [
    {
      id: 'loc-vault',
      name: 'Subterranean Archive Vault',
      description:
        'Three-story Neo-Gothic subterranean vault beneath the Municipal Hall with cast-iron catwalks, brass bookshelves, and shallow drainage channels.',
      visualDescription:
        'Tiered brass bookshelves rising into shadow, shallow stone floor water channels reflecting warm 2700K green-shaded banker lamps on oak examination tables and cold 5600K cyan street-grate light.',
      referenceImageUrl: '/images/sandbox/glass-ledger/loc-archive-vault.jpg',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-12T18:00:00.000Z',
    },
    {
      id: 'loc-deck',
      name: 'Rain-Slicked Observation Deck',
      description:
        'Glass-vaulted upper observation gallery overlooking New Veridian’s fog-bound harbor and shipping locks.',
      visualDescription:
        'Soaring arched industrial glass windows lashed by rain, cyan neon harbor beacons in mist, rippling rain caustics on dark terrazzo, antique brass transit telescope.',
      referenceImageUrl: '/images/sandbox/glass-ledger/loc-observation-deck.jpg',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-12T18:00:00.000Z',
    },
  ],
  props: [
    {
      id: 'prop-ledger',
      name: 'The Glass Ledger',
      description:
        'Hand-bound municipal codex of bevelled translucent quartz crystal plates etched with microscopic debt ciphers in an oxidized copper spine.',
      ownerCharacterId: 'char-elara',
      referenceImageUrl: '/images/sandbox/glass-ledger/prop-glass-ledger.jpg',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-12T18:00:00.000Z',
    },
    {
      id: 'prop-key',
      name: 'Brass Chrono-Key',
      description:
        'Antique horological skeleton key with three concentric rotating vernier rings that unlock both the High Vault calibration press and the service lift.',
      ownerCharacterId: 'char-elara',
      referenceImageUrl: '/images/sandbox/glass-ledger/prop-chrono-key.jpg',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-12T18:00:00.000Z',
    },
  ],
  toneGuidelines:
    'Taut, cerebral architectural neo-noir. Dialogue carries subtext and forensic specificity; tension builds through mechanical clocks, closing shutters, and moral compromises.',
  visualGuidelines:
    'Maintain dual-temperature lighting (2700K amber quartz/banker lamps vs 5600K cyan rain/skylight grates). Avoid modern LED flat lighting or handheld chaos.',
  audioGuidelines:
    'Solo cello and bowed glass motifs layered beneath tactile room tone: rain on glass, ticking pocket watches, iron shutter relays.',
  consistencyRules: [
    'Plate XIV remains physically missing from The Glass Ledger spine from Episode 1 onward; only its sheared verdigris copper hinge remains.',
    'Elara possesses the Brass Chrono-Key from Episode 1 Beat 4 until Episode 4’s customs barge exchange.',
    'All subterranean vault interiors feature shallow floor reflection channels.',
  ],
  worldBuildingNotes: [
    'New Veridian’s Charter of 1889 mandates that only physical quartz impressions held in the Municipal Vault carry sovereign title standing.',
    'A "Midnight Purge" is an automated optical re-indexing cycle held at the end of each fiscal quarter.',
  ],
  storyThreads: [
    {
      id: 'thread-plate-14',
      name: 'The Missing Plate XIV Cipher',
      type: 'mystery',
      status: 'developing',
      description: 'Decoding who excised Plate XIV and which three harbor districts it secretly conveys.',
      introducedInEpisode: 1,
    },
    {
      id: 'thread-aris-pact',
      name: 'Elara & Aris’s Fragile Alliance',
      type: 'character',
      status: 'developing',
      description: 'Aris’s atonement for building the rotary blade Thorne used to sever the plate.',
      introducedInEpisode: 1,
    },
    {
      id: 'thread-syndicate',
      name: 'The Harbor Reclamation Syndicate',
      type: 'main',
      status: 'introduced',
      description: 'Thorne’s boardroom coalition engineering sovereign debt defaults across the Old Docks.',
      introducedInEpisode: 1,
    },
  ],
  keyEvents: [
    {
      id: 'ke-1',
      episodeNumber: 1,
      type: 'reveal',
      description: 'Elara proves Plate XIV was intentionally cut out with a rotary calibration blade rather than fractured by age.',
      affectedCharacterIds: ['char-elara', 'char-marcus'],
      affectedLocationIds: ['loc-vault'],
      irreversible: true,
      createdAt: '2026-11-10T12:00:00.000Z',
    },
    {
      id: 'ke-2',
      episodeNumber: 1,
      type: 'acquisition',
      description: 'Elara conceals the Brass Chrono-Key during lockdown and recruits Dr. Aris Kael on the Observation Deck.',
      affectedCharacterIds: ['char-elara', 'char-aris'],
      affectedLocationIds: ['loc-deck'],
      irreversible: false,
      createdAt: '2026-11-10T12:15:00.000Z',
    },
  ],
  episodeSummaries: [
    {
      episodeNumber: 1,
      title: 'Beneath the Waterline',
      summary:
        'Working past curfew in the Subterranean Archive Vault, Elara Vance discovers Plate XIV has been rotary-cut from The Glass Ledger. Evading Chief Curator Marcus Thorne’s lockdown, she recruits optical cryptographer Dr. Aris Kael and escapes via the service lift with the Brass Chrono-Key.',
      keyEventIds: ['ke-1', 'ke-2'],
      characterStatuses: {
        'char-elara': 'Fugitive with The Glass Ledger & Brass Chrono-Key',
        'char-marcus': 'Initiated vault lockdown',
        'char-aris': 'Allied with Elara',
      },
      createdAt: '2026-11-12T18:00:00.000Z',
    },
  ],
  unresolvedHooks: [
    'Whose private drydock holds the twin carbon calibration press capable of reading Plate XIV’s negative impression?',
    'How much of the Harbor Authority inspectorate reports directly to Marcus Thorne?',
  ],
  seasons: [
    {
      id: 'season-1',
      number: 1,
      title: 'Season 1: The Midnight Index',
      episodeNumbers: [1, 2, 3, 4, 5, 6],
    },
  ],
}

const GLASS_LEDGER_EPISODES: EpisodeBlueprintWithProject[] = [
  {
    id: 'ep-glass-1',
    episodeNumber: 1,
    title: 'Beneath the Waterline',
    logline:
      'When Elara Vance discovers a surgical rotary cut inside The Glass Ledger, Chief Curator Marcus Thorne seals the subterranean vault with her still inside.',
    synopsis:
      'Three hours past curfew in the Subterranean Archive Vault, Lead Forensic Archivist Elara Vance inspects a sheared copper mount where Plate XIV once sat. Chief Curator Marcus Thorne emerges from the shadows demanding the cipher, but Elara pockets the Brass Chrono-Key, slips up to the Rain-Slicked Observation Deck to confront optical engineer Dr. Aris Kael, and races descending iron blast shutters to unlock the service lift before midnight lockdown.',
    status: 'in_progress',
    projectId: DEMO_EPISODE_1_PROJECT_ID,
    project: {
      id: DEMO_EPISODE_1_PROJECT_ID,
      title: 'The Glass Ledger — Ep. 1: Beneath the Waterline',
      status: 'in-progress',
      currentStep: 'production',
      stepProgress: { blueprint: 100, production: 82, overall: 82 },
      updatedAt: '2026-11-13T01:30:00.000Z',
    },
    beats: [
      {
        beatNumber: 1,
        act: 1,
        title: 'The Rotary Cut in Vault Tier III',
        description:
          'Elara discovers the verdigris hinge of Plate XIV has been cleanly sheared with a horological blade just as Marcus Thorne steps out of the aisle shadows.',
      },
      {
        beatNumber: 2,
        act: 2,
        title: 'Pocketing the Brass Chrono-Key',
        description:
          'Across the oak examination table, Elara defies Thorne’s curfew order while discreetly concealing the vernier Brass Chrono-Key in her coat pocket.',
      },
      {
        beatNumber: 3,
        act: 2,
        title: 'Pact on the Rain-Slicked Deck',
        description:
          'Elara confronts Dr. Aris Kael beside the harbor transit telescope; horrified that Thorne plans erasure, Aris agrees to read the twin impression.',
      },
      {
        beatNumber: 4,
        act: 3,
        title: 'Third Notch Counterclockwise',
        description:
          'Crimson strobes ignite as iron shutters drop along the vaulted corridor; Elara sprints to the service lift and unlocks the rotary cylinder seconds before containment.',
      },
    ],
    characters: [
      { characterId: 'char-elara', role: 'protagonist', episodeArc: 'Moves from dutiful archivist to hunted whistleblower.' },
      { characterId: 'char-marcus', role: 'antagonist', episodeArc: 'Drops his patrician mentor mask and triggers lethal containment.' },
      { characterId: 'char-aris', role: 'supporting', episodeArc: 'Confesses building the blade and joins Elara’s flight.' },
    ],
    plotDevelopments: [
      'Plate XIV is confirmed stolen via precision rotary blade.',
      'Elara escapes the Municipal Vault carrying The Glass Ledger and Brass Chrono-Key.',
    ],
    episodeHook:
      'Inside the rising service lift, ultraviolet street-grate spill reveals a second hidden engraving inside the spine: Aris’s own workshop coordinates.',
  },
  {
    id: 'ep-glass-2',
    episodeNumber: 2,
    title: 'The Vernier Index',
    logline:
      'Hunted across flooded canal workshops, Elara and Aris reconstruct Plate XIV’s negative impression from a carbon calibration wheel—uncovering three condemned wards.',
    synopsis:
      'Sheltering in Aris’s shuttered clockmaker loft above the Old Locks, Elara and Aris mount the Brass Chrono-Key into the original calibration press. Reconstructing the laser path from residual quartz dust reveals deeds to the South Basin tenements—just as Harbor Authority sweep teams triangulate the press’s transformer hum.',
    status: 'blueprint',
    beats: [
      { beatNumber: 1, act: 1, title: 'The Clockmaker’s Loft', description: 'Elara tests Aris’s loyalty when his workshop coordinates match the spine engraving.' },
      { beatNumber: 2, act: 2, title: 'Ghost of the Quartz Lattice', description: 'Collimated amber light through the calibration wheel projects the missing boundary lines.' },
      { beatNumber: 3, act: 2, title: 'Thorne’s Injunction', description: 'Marcus freezes civic transit passes and frames Elara for archival theft.' },
      { beatNumber: 4, act: 3, title: 'Escape Across the Lock Gates', description: 'Aris floods the lower sluice to cover their crossing onto a coal tender.' },
    ],
    characters: [
      { characterId: 'char-elara', role: 'protagonist' },
      { characterId: 'char-aris', role: 'supporting' },
      { characterId: 'char-marcus', role: 'antagonist' },
    ],
    episodeHook: 'The reconstructed deed bears the counter-signature of Elara’s late mentor—dated two weeks after his reported death.',
  },
  {
    id: 'ep-glass-3',
    episodeNumber: 3,
    title: 'Tidal Vaults',
    logline:
      'To verify the posthumous signature, Elara dives into the decommissioned 1889 Quarantine Archive accessible only during king-tide slack water.',
    synopsis:
      'With forty-two minutes before the incoming tide refills the sea-level cisterns, Elara descends into the salt-crusted Quarantine Archive while Aris monitors barometer valves topside. Inside, she finds her mentor’s sealed wax cylinder testimony—and realizes Thorne is not acting alone.',
    status: 'blueprint',
    beats: [
      { beatNumber: 1, act: 1, title: 'Slack-Water Window', description: 'Elara and Aris breach the sea-gate beneath Pier 9 during the forty-minute low-tide window.' },
      { beatNumber: 2, act: 2, title: 'The Wax Cylinder Testimony', description: 'Elara recovers the phosphor-bronze cylinder naming the five Syndicate seats.' },
      { beatNumber: 3, act: 2, title: 'Sabotaged Sea-Valve', description: 'Thorne’s diver jams the intake wheel, accelerating tidal inflow.' },
      { beatNumber: 4, act: 3, title: 'Acoustic Buoy Uplink', description: 'Elara surfaces through the harbor fog bell shaft clutching the cylinder.' },
    ],
    characters: [
      { characterId: 'char-elara', role: 'protagonist' },
      { characterId: 'char-aris', role: 'supporting' },
    ],
    episodeHook: 'The fifth voice on the wax cylinder belongs to the Chief Magistrate presiding over tomorrow’s emergency bond hearing.',
  },
  {
    id: 'ep-glass-4',
    episodeNumber: 4,
    title: 'The Harbor Cartel',
    logline:
      'Disguised among sovereign bond underwriters aboard an offshore customs barge, Elara attempts a daring plate-swap inside Thorne’s private auction.',
    synopsis:
      'Plate XIV surfaces as collateral at a black-tie maritime bond auction anchored beyond municipal waters. Elara infiltrates the bidding floor with a blank decoy quartz plate while Aris taps the ship’s telegraph optical trunk.',
    status: 'blueprint',
    beats: [
      { beatNumber: 1, act: 1, title: 'Beyond the Three-Mile Line', description: 'Elara boards the customs tender under forged Geneva bond credentials.' },
      { beatNumber: 2, act: 2, title: 'The Decoy Refraction', description: 'Thorne tests Plate XIV under polarized light in front of foreign creditors.' },
      { beatNumber: 3, act: 2, title: 'Aris Caught in the Relay Room', description: 'Security detains Aris mid-splice, forcing Elara to choose between the plate and her partner.' },
      { beatNumber: 4, act: 3, title: 'Bargain on the Promenade Deck', description: 'Elara surrenders the Brass Chrono-Key to buy Aris’s life—keeping a microscopic resin cast.' },
    ],
    characters: [
      { characterId: 'char-elara', role: 'protagonist' },
      { characterId: 'char-marcus', role: 'antagonist' },
      { characterId: 'char-aris', role: 'supporting' },
    ],
    episodeHook: 'Thorne slots the Brass Chrono-Key into the High Vault master clock—moving the Midnight Purge forward by twenty-four hours.',
  },
  {
    id: 'ep-glass-5',
    episodeNumber: 5,
    title: 'Shattered Quartz',
    logline:
      'Stripped of the key and surrounded in the Old Docks tenements, Elara rallies displaced guild machinists to forge a resonant optical transmitter.',
    synopsis:
      'As eviction notices go up across the South Basin, Elara brings the truth directly to the dockworkers whose pensions are tied to the erased deeds. Together with Aris, guild lens-grinders polish a lighthouse Fresnel prism capable of projecting Plate XIV’s cipher into the city’s central verification array.',
    status: 'blueprint',
    beats: [
      { beatNumber: 1, act: 1, title: 'Assembly in the Glassworks', description: 'Elara lays the damaged Glass Ledger before skeptical dockyard stewards.' },
      { beatNumber: 2, act: 2, title: 'Grinding the Fresnel Key', description: 'Aris calculates the exact refractive index from Elara’s resin cast.' },
      { beatNumber: 3, act: 2, title: 'Blackout on the Quay', description: 'Thorne cuts municipal power to the South Basin to stall the guild.' },
      { beatNumber: 4, act: 3, title: 'Arc-Lamp Ignition', description: 'Harbor tugboats wire their generators in series to power the lens.' },
    ],
    characters: [
      { characterId: 'char-elara', role: 'protagonist' },
      { characterId: 'char-aris', role: 'supporting' },
      { characterId: 'char-marcus', role: 'antagonist' },
    ],
    episodeHook: 'With eleven minutes to midnight, Elara re-enters the High Archive cupola to align the receiving mirror by hand.',
  },
  {
    id: 'ep-glass-6',
    episodeNumber: 6,
    title: 'Midnight Purge',
    logline:
      'High inside the clockwork dome of the Municipal Hall, Elara faces Marcus Thorne in a final optical showdown as the midnight re-indexing beam ignites.',
    synopsis:
      'While Aris directs the tugboat-powered Fresnel beam from across the harbor, Elara climbs the High Archive’s glass cupola to lock the receiving prism before the automated purge overwrites civic law. Confronted by Marcus Thorne on the catwalk, she forces the unbroken public index onto every magistrate terminal in New Veridian.',
    status: 'blueprint',
    beats: [
      { beatNumber: 1, act: 1, title: 'Ascent to the Cupola', description: 'Elara uses maintenance counterweights to bypass the sealed High Vault.' },
      { beatNumber: 2, act: 2, title: 'The Curator’s Defense', description: 'Thorne argues that exposing sovereign insolvency will collapse the port.' },
      { beatNumber: 3, act: 3, title: 'Refraction Across the Harbor', description: 'Aris fires the amber harbor beam; Elara locks the prism into the master array.' },
      { beatNumber: 4, act: 3, title: 'The Unbroken Ledger', description: 'Every civic terminal prints the restored South Basin deeds as dawn clears the harbor mist.' },
    ],
    characters: [
      { characterId: 'char-elara', role: 'protagonist' },
      { characterId: 'char-marcus', role: 'antagonist' },
      { characterId: 'char-aris', role: 'supporting' },
    ],
    episodeHook: 'In the restored index footer, a dormant Colonial plate number blinks active in Geneva—setting up Season 2.',
  },
]

const GLASS_LEDGER_RESONANCE: SeriesResonanceAnalysis = {
  seriesId: DEMO_SERIES_ID,
  greenlightScore: {
    score: 93,
    tier: 'market-ready',
    label: 'Market Ready',
    color: '#22c55e',
    confidence: 0.94,
  },
  axes: [
    {
      id: 'concept-originality',
      label: 'Concept Originality',
      score: 95,
      weight: 20,
      description: 'Tactile quartz-codex worldbuilding blends classic conspiracy noir with fresh architectural stakes.',
    },
    {
      id: 'character-depth',
      label: 'Character Depth',
      score: 92,
      weight: 25,
      description: 'Compelling ideological triangle between Elara’s forensic truth, Thorne’s paternalistic order, and Aris’s guilt.',
    },
    {
      id: 'episode-engagement',
      label: 'Episode Engagement',
      score: 94,
      weight: 25,
      description: 'Every episode features a ticking physical constraint (curfew, slack tide, 24-hour purge) and propulsive cliffhanger.',
    },
    {
      id: 'story-arc-coherence',
      label: 'Story Arc Coherence',
      score: 93,
      weight: 15,
      description: 'Clean causal escalation from subterranean discovery (Ep 1) to city-wide optical transmission (Ep 6).',
    },
    {
      id: 'commercial-viability',
      label: 'Commercial Viability',
      score: 90,
      weight: 15,
      description: 'Contained prestige locations with high visual distinctiveness; strong international CTV & streamer appeal.',
    },
  ],
  episodeEngagement: GLASS_LEDGER_EPISODES.map((ep, i) => ({
    episodeId: ep.id,
    episodeNumber: ep.episodeNumber,
    title: ep.title,
    hookStrength: [9.4, 9.0, 9.2, 9.5, 9.1, 9.6][i] ?? 9.2,
    cliffhangerScore: [9.5, 9.1, 9.3, 9.6, 9.4, 9.2][i] ?? 9.2,
    continuityScore: 9.4,
    characterMoments: 9.1,
    tensionLevel: 'high',
    pacing: i === 1 ? 'moderate' : 'fast',
    overallScore: [94, 90, 92, 95, 92, 96][i] ?? 92,
    notes: `Strong causal payoff in Act 3 with clear continuity handoff from Episode ${ep.episodeNumber}.`,
    improvements: [],
  })),
  characterAnalysis: [
    {
      characterId: 'char-elara',
      name: 'Elara Vance',
      role: 'protagonist',
      arcClarity: 9.5,
      distinctiveness: 9.3,
      relatability: 9.1,
      visualClarity: 9.6,
      strengths: ['Iconic slate trench coat + brass loupe silhouette', 'Active forensic agency in every scene'],
      weaknesses: [],
    },
    {
      characterId: 'char-marcus',
      name: 'Marcus Thorne',
      role: 'antagonist',
      arcClarity: 9.2,
      distinctiveness: 9.4,
      relatability: 8.6,
      visualClarity: 9.5,
      strengths: ['Articulate civic-stability philosophy elevates him above a greedy villain'],
      weaknesses: [],
    },
    {
      characterId: 'char-aris',
      name: 'Dr. Aris Kael',
      role: 'supporting',
      arcClarity: 9.0,
      distinctiveness: 9.1,
      relatability: 9.3,
      visualClarity: 9.4,
      strengths: ['Personal culpability in crafting the blade creates immediate dramatic friction'],
      weaknesses: [],
    },
  ],
  locationAnalysis: [
    {
      locationId: 'loc-vault',
      name: 'Subterranean Archive Vault',
      visualImpact: 9.7,
      narrativeRole: 9.6,
      worldBuilding: 9.5,
      notes: 'Signature standing set with unmistakable amber-vs-cyan lighting geometry.',
    },
    {
      locationId: 'loc-deck',
      name: 'Rain-Slicked Observation Deck',
      visualImpact: 9.4,
      narrativeRole: 9.0,
      worldBuilding: 9.2,
      notes: 'Connects subterranean intrigue to the living harbor stakes outside.',
    },
  ],
  insights: [
    {
      id: 'ins-gl-1',
      category: 'concept',
      status: 'strength',
      title: 'Tactile Analog-Optical Worldbuilding',
      insight:
        'Replacing generic computer hacking with laser-etched quartz plates, vernier keys, and Fresnel prisms creates unforgettable cinema visuals.',
      actionable: false,
      axisId: 'concept-originality',
    },
    {
      id: 'ins-gl-2',
      category: 'episodes',
      status: 'strength',
      title: 'Relentless Physical Clocks Across All 6 Episodes',
      insight:
        'Curfew lockdown (Ep 1), 42-minute slack tide (Ep 3), and the advanced Midnight Purge (Ep 4–6) sustain elite binge momentum.',
      actionable: false,
      axisId: 'episode-engagement',
    },
    {
      id: 'ins-gl-3',
      category: 'characters',
      status: 'weakness',
      title: 'Foreshadow South Basin Human Stakes Earlier in Episode 2',
      insight:
        'Introducing one named guild machinist in Episode 2 before the Episode 5 rally will deepen emotional payoff when the tugboats power the lens.',
      targetSection: 'episode',
      targetId: 'ep-glass-2',
      actionable: true,
      fixSuggestion:
        'Add a brief encounter in Episode 2 Beat 4 where dockyard steward Maeve Lin shelters Elara and Aris aboard her coal tender.',
      axisId: 'character-depth',
      estimatedImpact: 2,
      severity: 'low',
      impactLabel: 'Low',
      impactScore: 1.8,
    },
  ],
  summary: {
    overallAssessment:
      'The Glass Ledger is a flagship prestige thriller with festival-grade visual identity, tight six-episode escalation, and locked character/location continuity ready for immediate episode production.',
    bingeWorthiness: 'High — interlocking mystery reveals and tactile cliffhangers drive >85% projected episode-to-episode completion.',
    targetAudience: 'Adults 24–54 who watch prestige mystery-thrillers, architectural sci-fi/noir, and serialized investigative drama.',
    comparableSeries: ['Severance', 'Silo', 'Slow Horses', 'Dark'],
    keyStrengths: [
      'Unmistakable 2700K amber quartz vs 5600K cyan rain visual signature',
      'High-agency protagonist whose forensic skill drives plot turns',
      'Contained, reusable hero standing sets optimize production budget',
    ],
    criticalWeaknesses: [],
    marketPositioning: ' Tier-1 SVOD / CTV limited series with strong multi-season anthology or global localization upside.',
    renewalPotential: 'Strong — Geneva Colonial Index hook cleanly launches Season 2.',
  },
  analysisVersion: '3.2',
  generatedAt: '2026-11-12T19:00:00.000Z',
  creditsUsed: 45,
  iterationCount: 2,
  previousScore: 87,
  isProductionReady: true,
  suggestedAction: 'proceed-to-production',
  scoreTrend: 'improving',
}

const SILT_LINE_BIBLE: SeriesProductionBible = {
  version: '1.3.0',
  lastUpdated: '2026-11-11T16:20:00.000Z',
  lastUpdatedBy: 'Studio Showrunner',
  logline:
    'When a predatory municipal councilor stages an automated floodgate failure to seize Port Marrow’s worker-owned waterfront collective, a sensory-strained 23-year-old diagnostic technician and her sound-engineer partner infiltrate an offshore auction barge to recover her vanished mother’s black-box telemetry.',
  synopsis:
    'In the retro-futuristic coastal harbor metropolis of Port Marrow—where 1920s riveted maritime brass meets open-source bioluminescent cybernetics—diagnostic technician Juniper Finch (23) and acoustic specialist Tobias Wu (24) uncover Councilman Orville Crane’s scheme to submerge the North Quay collective under a manufactured tidal surge. Aided discreetly by conflicted Harbor Investigator Bram Halloway, Juniper and Tobias battle across salt-crusted catwalks, offshore auction barges, and roaring hydraulic floodgates to broadcast Eleanor Finch’s encrypted baseline ledger before the lower quays are drowned for luxury redevelopment bonds.',
  setting:
    'Port Marrow — a tiered maritime industrial city of brass locks, neon fog beacons, and worker-owned dockside workshops perched above volatile automated surge barriers.',
  timeframe: 'Retro-Futuristic Maritime Era',
  protagonist: {
    characterId: 'char-juniper',
    name: 'Juniper Finch',
    goal: 'Recover her mother Eleanor’s black-box flood telemetry and save the North Quay Workshop from engineered inundation.',
    flaw: 'Pushes her augmented optical monocle past safe neural thresholds, risking paralyzing sensory overload.',
  },
  antagonistConflict: {
    type: 'character',
    characterId: 'char-crane',
    description:
      'Councilman Orville Crane weaponizes municipal bond defaults and sabotaged floodgates to clear working-class docks for private waterfront enclaves.',
  },
  aesthetic: {
    cinematography:
      'Dynamic stylized 3D virtual camera, tactile macro textures on salt-corroded brass and oiled canvas, kinetic whip-pans and chromatic telemetry overlays.',
    colorPalette: {
      primary: ['#06B6D4', '#D97706', '#1E293B'],
      accents: ['#22D3EE', '#FBBF24', '#EF4444'],
    },
    aspectRatio: '16:9',
    artStyle: '3d-animation',
    artStyleLocked: true,
    visualStyle:
      'Tactile Stylized 3D Animation — dieselpunk maritime brass, weathered patches and oilskins, bioluminescent cyan tidal telemetry, and warm amber vacuum-tube glow.',
    lightingStyle: 'Volumetric harbor fog beams, bioluminescent cyan water bounce, warm workshop tungsten.',
  },
  characters: [
    {
      id: 'char-juniper',
      name: 'Juniper Finch',
      role: 'protagonist',
      age: 23,
      gender: 'Female',
      build: 'Agile mechanic',
      hairStyle: 'Asymmetric chin-length bob',
      hairColor: 'Copper auburn',
      eyeColor: 'Warm amber-hazel',
      defaultWardrobe: 'Patched olive utility jacket over navy sailor collar shirt and ochre workshop apron with leather tool belt',
      description:
        '23-year-old lead diagnostic technician at the North Quay Collective. Hyper-observant and fiercely loyal, decoding mechanical telemetry through an optical monocle.',
      appearance:
        'Stylized 3D 23-year-old woman with copper-auburn asymmetric bob, large expressive amber eyes, patched dark-olive scout mechanic jacket over ochre canvas apron.',
      referenceImageUrl: '/images/cast/silt-line/juniper-finch.webp',
      createdAt: '2026-11-02T10:00:00.000Z',
      updatedAt: '2026-11-11T16:00:00.000Z',
    },
    {
      id: 'char-tobias',
      name: 'Tobias Wu',
      role: 'supporting',
      age: 24,
      gender: 'Male',
      build: 'Broad-shouldered, grounded',
      hairStyle: 'Curly dark hair under knit beanie',
      hairColor: 'Jet black',
      eyeColor: 'Warm brown',
      defaultWardrobe: 'Mustard-ochre weatherproof field jacket over knit hoodie, wooden studio headphones, canvas mic-kit satchel',
      description:
        '24-year-old co-op acoustic telemetry engineer whose custom resonance rigs stabilize Juniper’s sensory feedback loops and crack hydraulic locks.',
      appearance:
        'Stylized 3D 24-year-old man with teal knit beanie, neatly trimmed beard, wooden-cup headphones around neck, mustard field jacket, and crossbody satchel packed with microphones.',
      referenceImageUrl: '/images/cast/silt-line/tobias-wu.webp',
      createdAt: '2026-11-02T10:00:00.000Z',
      updatedAt: '2026-11-11T16:00:00.000Z',
    },
    {
      id: 'char-crane',
      name: 'Orville Crane',
      role: 'antagonist',
      age: 56,
      gender: 'Male',
      description:
        'Municipal Councilor and waterfront developer orchestrating the surge-barrier failure to harvest disaster recovery bonds.',
      appearance:
        'Stylized 3D patrician industrialist in impeccably tailored pinstripe maritime overcoat with brass lapel insignia and calculating gaze.',
      referenceImageUrl: '/images/cast/silt-line/orville-crane.webp',
      createdAt: '2026-11-02T10:00:00.000Z',
      updatedAt: '2026-11-11T16:00:00.000Z',
    },
    {
      id: 'char-halloway',
      name: 'Inspector Bram Halloway',
      role: 'supporting',
      age: 51,
      gender: 'Male',
      description:
        'Seasoned Harbor District investigator torn between precinct orders and his vow to protect Eleanor Finch’s daughter.',
      appearance:
        'Stylized 3D harbor inspector with salt-and-pepper beard, warm conflicted brown eyes, tan weatherproof trench jacket over navy uniform polo.',
      referenceImageUrl: '/images/cast/silt-line/inspector-bram-halloway.webp',
      createdAt: '2026-11-02T10:00:00.000Z',
      updatedAt: '2026-11-11T16:00:00.000Z',
    },
    {
      id: 'char-anderson',
      name: 'John Anderson',
      role: 'recurring',
      age: 60,
      gender: 'Male',
      description:
        'Weathered Chief Maritime Inspector whose decade-old silence fractures when Crane orders live sabotage.',
      appearance:
        'Stylized 3D veteran maritime officer in heavy navy wool peacoat and brass-trimmed cap.',
      referenceImageUrl: '/images/cast/silt-line/john-anderson.webp',
      createdAt: '2026-11-02T10:00:00.000Z',
      updatedAt: '2026-11-11T16:00:00.000Z',
    },
  ],
  locations: [
    {
      id: 'loc-silt-floodgate',
      name: 'Port Marrow Surge Barrier & Slipway',
      description: 'Towering riveted iron tidal floodgates lit by bioluminescent cyan harbor shafts and swirling silt currents.',
      visualDescription: 'Submerged industrial iron lock gates pierced by volumetric cyan light rays and stylized swirling silt ribbons.',
      referenceImageUrl: '/images/trailers/animated-series-poster.webp',
      createdAt: '2026-11-02T10:00:00.000Z',
      updatedAt: '2026-11-11T16:00:00.000Z',
    },
  ],
  seasons: [
    {
      id: 'silt-season-1',
      number: 1,
      title: 'Season 1: Rising Charter',
      episodeNumbers: [1, 2, 3, 4, 5, 6],
    },
  ],
}

const SILT_LINE_EPISODES: EpisodeBlueprintWithProject[] = [
  {
    id: 'ep-silt-1',
    episodeNumber: 1,
    title: 'The Manufactured Surge',
    logline:
      'Juniper Finch decodes sabotaged tidal telemetry hidden inside an eviction writ—pointing straight to Councilman Crane’s offshore auction barge.',
    synopsis:
      'Facing eviction at the North Quay Workshop, Juniper uses her optical monocle to uncover falsified pressure curves on Gate 7 while Tobias calibrates an acoustic damper to keep her neural migraines at bay.',
    status: 'in_progress',
    projectId: DEMO_SILT_LINE_PROJECT_ID,
    project: {
      id: DEMO_SILT_LINE_PROJECT_ID,
      title: 'The Silt Line — Ep. 1: The Manufactured Surge',
      status: 'in-progress',
      currentStep: 'production',
      stepProgress: { blueprint: 100, production: 68, overall: 68 },
      updatedAt: '2026-11-12T21:15:00.000Z',
    },
    beats: [
      { beatNumber: 1, act: 1, title: 'Eviction on North Quay', description: 'Municipal marshals post default notices across the worker-owned dockside workshop.' },
      { beatNumber: 2, act: 2, title: 'Telemetry in the Writ', description: 'Juniper’s monocle reveals Gate 7 actuator overrides masked as storm wear.' },
      { beatNumber: 3, act: 3, title: 'Pier 14 Departure', description: 'Disguised in oilskins, Juniper and Tobias board the tender toward Crane’s auction barge.' },
    ],
    characters: [
      { characterId: 'char-juniper', role: 'protagonist' },
      { characterId: 'char-tobias', role: 'supporting' },
      { characterId: 'char-crane', role: 'antagonist' },
    ],
    episodeHook: 'Beneath the barge catwalk, Juniper spots her vanished mother’s call-sign stamped on Lot 09.',
  },
  {
    id: 'ep-silt-2',
    episodeNumber: 2,
    title: 'Pier 14 Infiltration',
    logline: 'Aboard the iron auction barge, Juniper taps the private bidding feed while Inspector Halloway faces a moral breaking point in the hold.',
    synopsis: 'Juniper and Tobias thread the upper gantry cranes above Port Marrow’s wealthiest developers as Lot 09—Eleanor’s black-box ledger—comes to the block.',
    status: 'blueprint',
    beats: [
      { beatNumber: 1, act: 1, title: 'Catwalks Above the Gallery', description: 'Tobias loops hydrophone ambient noise to mask their footsteps above the bidding salon.' },
      { beatNumber: 2, act: 2, title: 'Eleanor’s Voice Print', description: 'Tapping the feed triggers a sensory spike as Juniper hears her mother’s recorded warning.' },
      { beatNumber: 3, act: 3, title: 'The Incendiary Order', description: 'Crane orders Halloway and Anderson to torch the baseline archives in the lower hold.' },
    ],
    characters: [
      { characterId: 'char-juniper', role: 'protagonist' },
      { characterId: 'char-tobias', role: 'supporting' },
      { characterId: 'char-halloway', role: 'supporting' },
      { characterId: 'char-crane', role: 'antagonist' },
    ],
  },
  {
    id: 'ep-silt-3',
    episodeNumber: 3,
    title: 'Acoustic Defiance',
    logline: 'Cornered in Crane’s panoramic salon, Tobias sacrifices his custom sonic rig to blow out the tempered glass while Halloway locks the blast gates behind them.',
    synopsis: 'Rejecting Crane’s hush-money charter, Juniper secures the black-box cylinder as Tobias triggers a resonant glass shatter into the storm-tossed slipway.',
    status: 'blueprint',
    beats: [
      { beatNumber: 1, act: 1, title: 'Crane’s Buyout Offer', description: 'Crane offers Juniper a scholarship fellowship in exchange for the ledger.' },
      { beatNumber: 2, act: 2, title: 'Resonant Frequency Shatter', description: 'Tobias overloads his amplifier array to shatter the armored gallery glass.' },
      { beatNumber: 3, act: 3, title: 'Halloway’s Stand at the Gate', description: 'Halloway manually jams the hydraulic lock, buying the kids clean passage into the harbor.' },
    ],
    characters: [
      { characterId: 'char-juniper', role: 'protagonist' },
      { characterId: 'char-tobias', role: 'supporting' },
      { characterId: 'char-halloway', role: 'supporting' },
    ],
  },
  {
    id: 'ep-silt-4',
    episodeNumber: 4,
    title: 'The Sunken Drydock',
    logline: 'Taking refuge in Eleanor’s flooded test caisson, Juniper decodes coordinates to three live surge-Sabotage relays planted along the seawall.',
    synopsis: 'Inside Caisson 4, Eleanor’s holographic stress models reveal the exact king-tide hour Crane intends to collapse the seawall.',
    status: 'blueprint',
    beats: [
      { beatNumber: 1, act: 1, title: 'Caisson Four', description: 'Bioluminescent barnacles illuminate Eleanor’s preserved workbench.' },
      { beatNumber: 2, act: 2, title: 'Three Harmonic Charges', description: 'Tobias isolates the low-frequency ping of three active gate decouplers.' },
    ],
    characters: [
      { characterId: 'char-juniper', role: 'protagonist' },
      { characterId: 'char-tobias', role: 'supporting' },
    ],
  },
  {
    id: 'ep-silt-5',
    episodeNumber: 5,
    title: 'Co-Op Mobilization',
    logline: 'With municipal police blockading the bridges, North Quay’s tug crews and crane operators unite to disarm the outer seawall relays.',
    synopsis: 'Chief Inspector Anderson leaks Crane’s patrol schedule, giving the collective one storm window to reach Gate 7.',
    status: 'blueprint',
    beats: [
      { beatNumber: 1, act: 1, title: 'Anderson’s Ledger Leak', description: 'Anderson delivers precinct deployment charts to the workshop.' },
      { beatNumber: 2, act: 2, title: 'Flotilla in the Fog', description: 'Twenty worker tugs form an acoustic screen across the harbor mouth.' },
    ],
    characters: [
      { characterId: 'char-juniper', role: 'protagonist' },
      { characterId: 'char-anderson', role: 'supporting' },
    ],
  },
  {
    id: 'ep-silt-6',
    episodeNumber: 6,
    title: 'Storm Over Port Marrow',
    logline: 'Atop the gale-lashed Gate 7 superstructure, Juniper and Tobias re-couple the surge barrier and broadcast Crane’s bond fraud over harbor radio.',
    synopsis: 'Suspended above fifty-foot swells, Juniper aligns the manual brass Worm-Gear while Tobias transmits Eleanor’s ledger to every ship and council hall in Port Marrow.',
    status: 'blueprint',
    beats: [
      { beatNumber: 1, act: 1, title: 'Gate Seven Superstructure', description: 'Juniper climbs the ice-slicked brass counterweights without her damaged monocle.' },
      { beatNumber: 2, act: 3, title: 'Harbor-Wide Broadcast', description: 'The surge barrier holds; dawn breaks over an intact North Quay.' },
    ],
    characters: [
      { characterId: 'char-juniper', role: 'protagonist' },
      { characterId: 'char-tobias', role: 'supporting' },
      { characterId: 'char-crane', role: 'antagonist' },
    ],
  },
]

const SILT_LINE_RESONANCE: SeriesResonanceAnalysis = {
  seriesId: DEMO_ANIMATED_SERIES_ID,
  greenlightScore: {
    score: 91,
    tier: 'market-ready',
    label: 'Market Ready',
    color: '#22c55e',
    confidence: 0.92,
  },
  axes: [
    { id: 'concept-originality', label: 'Concept Originality', score: 94, weight: 20, description: 'Distinctive maritime dieselpunk + cooperative economics world.' },
    { id: 'character-depth', label: 'Character Depth', score: 91, weight: 25, description: 'Neuro-sensory teamwork between Juniper and Tobias anchors emotional stakes.' },
    { id: 'episode-engagement', label: 'Episode Engagement', score: 92, weight: 25, description: 'High-momentum heist and maritime rescue set-pieces.' },
    { id: 'story-arc-coherence', label: 'Story Arc Coherence', score: 90, weight: 15, description: 'Clear 6-part escalation from eviction writ to seawall showdown.' },
    { id: 'commercial-viability', label: 'Commercial Viability', score: 89, weight: 15, description: 'Broad YA/Adult animation crossover appeal in the lane of Arcane.' },
  ],
  episodeEngagement: SILT_LINE_EPISODES.map((ep) => ({
    episodeId: ep.id,
    episodeNumber: ep.episodeNumber,
    title: ep.title,
    hookStrength: 9.1,
    cliffhangerScore: 9.2,
    continuityScore: 9.3,
    characterMoments: 9.0,
    tensionLevel: 'high',
    pacing: 'fast',
    overallScore: 91,
    notes: 'Locked 3D character sheets and tactile harbor lighting translate directly to high-retention animation.',
    improvements: [],
  })),
  characterAnalysis: [],
  locationAnalysis: [],
  insights: [
    {
      id: 'ins-sl-1',
      category: 'characters',
      status: 'strength',
      title: 'Ensemble Visual Distinctiveness',
      insight: 'All five principal 3D character silhouettes read unmistakably at thumbnail scale.',
      actionable: false,
      axisId: 'character-depth',
    },
  ],
  summary: {
    overallAssessment: 'Stylized 3D animated thriller with locked ensemble character sheets and immediate series-to-episode pipeline readiness.',
    bingeWorthiness: 'High',
    targetAudience: 'Animation & sci-fi thriller fans 16–44',
    comparableSeries: ['Arcane', 'Blue Eye Samurai', 'Scavenger’s Reign'],
    keyStrengths: ['5 locked 3D character turnaround portraits', 'Locked global 3D art style across all episodes'],
    criticalWeaknesses: [],
  },
  analysisVersion: '3.2',
  generatedAt: '2026-11-11T16:30:00.000Z',
  creditsUsed: 45,
  iterationCount: 1,
  isProductionReady: true,
  suggestedAction: 'proceed-to-production',
  scoreTrend: 'stable',
}

export function getUiSandboxSeries(id?: string | null): SeriesResponse {
  const normalized = String(id || '').trim().toLowerCase()
  if (normalized === DEMO_ANIMATED_SERIES_ID || normalized === 'silt-line-series') {
    return structuredClone({
      id: DEMO_ANIMATED_SERIES_ID,
      userId: '00000000-0000-4000-8000-000000000099',
      title: 'The Silt Line',
      logline: SILT_LINE_BIBLE.logline,
      genre: 'Maritime Cyber-Thriller · Stylized 3D',
      targetAudience: 'Sci-Fi & Prestige Animation Viewers (16–44)',
      status: 'active',
      maxEpisodes: 20,
      episodeCount: SILT_LINE_EPISODES.length,
      startedCount: 1,
      completedCount: 0,
      productionBible: SILT_LINE_BIBLE,
      episodeBlueprints: SILT_LINE_EPISODES,
      metadata: {
        format: 'animated_series',
        artStyle: '3d-animation',
        tone: 'Tactile, urgent, emotionally grounded',
        episodeCount: 6,
        synopsisLocked: true,
        heroImageUrl: '/images/trailers/animated-series-poster.webp',
        thumbnailUrl: '/images/trailers/animated-series-poster.webp',
        resonance_analysis: SILT_LINE_RESONANCE,
        narration: {
          overview: {
            audioUrl: '/audio/use-case-narration/entertainment/animated-web-series.mp3',
            voiceId: 'cinematic-narrator',
            updatedAt: '2026-11-11T16:30:00.000Z',
          },
        },
      },
      createdAt: '2026-11-02T10:00:00.000Z',
      updatedAt: '2026-11-12T21:15:00.000Z',
    })
  }

  return structuredClone({
    id: DEMO_SERIES_ID,
    userId: '00000000-0000-4000-8000-000000000099',
    title: 'The Glass Ledger',
    logline: GLASS_LEDGER_BIBLE.logline,
    genre: 'Neo-Noir Mystery Thriller',
    targetAudience: 'Prestige Drama & Mystery Viewers (24–54)',
    status: 'active',
    maxEpisodes: 20,
    episodeCount: GLASS_LEDGER_EPISODES.length,
    startedCount: 1,
    completedCount: 0,
    productionBible: GLASS_LEDGER_BIBLE,
    episodeBlueprints: GLASS_LEDGER_EPISODES,
    metadata: {
      format: 'prestige_series',
      artStyle: 'realistic',
      tone: 'Atmospheric, cerebral, high-stakes neo-noir',
      episodeCount: 6,
      synopsisLocked: true,
      heroImageUrl: '/images/sandbox/glass-ledger/hero-billboard.jpg',
      thumbnailUrl: '/images/sandbox/glass-ledger/hero-billboard.jpg',
      resonance_analysis: GLASS_LEDGER_RESONANCE,
      narration: {
        overview: {
          audioUrl: '/audio/use-case-narration/entertainment/ctv-ready-series.mp3',
          voiceId: 'cinematic-narrator',
          updatedAt: '2026-11-12T19:00:00.000Z',
        },
      },
    },
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-13T01:30:00.000Z',
  })
}

export function getAllUiSandboxSeries(): SeriesResponse[] {
  return [getUiSandboxSeries(DEMO_SERIES_ID), getUiSandboxSeries(DEMO_ANIMATED_SERIES_ID)]
}

export function getUiSandboxSeriesProductionReferences(seriesId: string): {
  byProjectId: Record<string, ReferenceGroups>
  library: ReferenceGroups
} {
  const series = getUiSandboxSeries(seriesId)
  const bible = series.productionBible
  const library: ReferenceGroups = {
    characters: (bible.characters || []).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      description: c.description,
      imageUrl: c.referenceImageUrl,
      libraryAssetId: c.id,
    })),
    locations: (bible.locations || []).map((l) => ({
      id: l.id,
      name: l.name,
      description: l.visualDescription || l.description,
      imageUrl: l.referenceImageUrl,
      libraryAssetId: l.id,
    })),
    props: (bible.props || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.referenceImageUrl,
      libraryAssetId: p.id,
    })),
  }

  const ep1ProjectId = series.episodeBlueprints?.[0]?.projectId
  return {
    byProjectId: ep1ProjectId ? { [ep1ProjectId]: library } : {},
    library,
  }
}
