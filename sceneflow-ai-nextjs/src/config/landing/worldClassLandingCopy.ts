/**
 * Canonical copy & 7-locale priority translations for SceneFlow Studio's
 * Creator + Video Services Business landing page architecture.
 *
 * Wired into `buildEnMessages()` under `studioLanding` so `messages/en.json`
 * stays 100% reproducible via `npm run i18n:build-en`, with built-in native
 * translations for `es`, `pt`, `hi`, `zh-CN`, `ar`, and `th`.
 */

export type AudienceCardCopy = {
  id: 'services' | 'aspiring' | 'experienced'
  badge: string
  title: string
  description: string
  highlights: readonly [string, string, string]
  ctaLabel: string
  targetAnchor: string
}

export type SuperpowerPillarCopy = {
  id: 'baseline' | 'dialog' | 'review' | 'agents' | 'collaboration'
  number: string
  badge: string
  title: string
  description: string
  outcomeTag: string
  videoClipKey?: 'comparison' | 'direction' | 'agent' | 'publish'
}

export type ServiceVerticalCopy = {
  id: 'memoir' | 'realestate' | 'training' | 'brand'
  tabLabel: string
  badge: string
  title: string
  description: string
  clientBuyer: string
  typicalRetailUsd: number
  retailRangeLabel: string
  estComputeUsd: number
  activeMinutesLabel: string
  keyAdvantage: string
}

export type ClientStepCopy = {
  step: string
  title: string
  detail: string
}

export type GuidedRoomCallout = {
  label: string
  detail: string
}

export type GuidedRoomCopy = {
  id: 'series-desk' | 'blueprint-board' | 'production-stage' | 'screening-room'
  stepNumber: string
  tabLabel: string
  badge: string
  title: string
  promise: string
  creatorExampleTitle: string
  creatorExampleNote: string
  serviceExampleTitle: string
  serviceExampleNote: string
  callouts: readonly [GuidedRoomCallout, GuidedRoomCallout, GuidedRoomCallout]
}

export type StudioLandingCopy = {
  heroDock: {
    tagline: string
    primaryCta: string
    businessCta: string
    howItWorksCta: string
  }
  audienceGateway: {
    eyebrow: string
    title: string
    titleAccent: string
    subtitle: string
    cards: readonly [AudienceCardCopy, AudienceCardCopy, AudienceCardCopy]
  }
  superpowers: {
    eyebrow: string
    title: string
    titleAccent: string
    subtitle: string
    watchClipLabel: string
    pillars: readonly [
      SuperpowerPillarCopy,
      SuperpowerPillarCopy,
      SuperpowerPillarCopy,
      SuperpowerPillarCopy,
      SuperpowerPillarCopy,
    ]
  }
  videoServices: {
    eyebrow: string
    title: string
    titleAccent: string
    subtitle: string
    commercialRightsBadge: string
    verticalsHeading: string
    calculatorBadge: string
    calculatorTitle: string
    volumeLabel: string
    projectsPerMonthSuffix: string
    typicalFeeLabel: string
    estComputeLabel: string
    activeHandsOnLabel: string
    monthlyGrossLabel: string
    monthlyNetLabel: string
    marginBadgeSuffix: string
    disclaimer: string
    launchBusinessCta: string
    workflowHeading: string
    workflowSteps: readonly [ClientStepCopy, ClientStepCopy, ClientStepCopy, ClientStepCopy]
    verticals: readonly [
      ServiceVerticalCopy,
      ServiceVerticalCopy,
      ServiceVerticalCopy,
      ServiceVerticalCopy,
    ]
  }
  guidedTour: {
    eyebrow: string
    title: string
    titleAccent: string
    subtitle: string
    lensLabel: string
    lensCreator: string
    lensService: string
    watchRoomVideoLabel: string
    inspectFullScreenLabel: string
    openLiveScreeningLabel: string
    rooms: readonly [GuidedRoomCopy, GuidedRoomCopy, GuidedRoomCopy, GuidedRoomCopy]
  }
  directoryDrawer: {
    badge: string
    title: string
    subtitle: string
    expandCta: string
    collapseCta: string
  }
  academyStrip: {
    badge: string
    title: string
    subtitle: string
    pills: readonly [string, string, string]
    watchAcademyCta: string
    startExplorerCta: string
  }
}

export const WORLD_CLASS_LANDING_COPY: StudioLandingCopy = {
  heroDock: {
    tagline:
      'Direct original films & series — or build a high-margin video production business. Zero filmmaking or prompt skills required.',
    primaryCta: 'Launch Studio ($9)',
    businessCta: 'Explore Video Business',
    howItWorksCta: 'See How It Works',
  },
  audienceGateway: {
    eyebrow: 'One Studio · Three Ways to Win',
    title: 'Create Original Worlds.',
    titleAccent: 'Or Build a Profitable Video Business.',
    subtitle:
      'SceneFlow pairs an expert AI production crew with conversational direction—empowering solo storytellers, multi-episode creators, and client-facing video businesses alike.',
    cards: [
      {
        id: 'services',
        badge: 'Income Opportunity · 65–85% Typical Margin',
        title: 'Video Delivery Businesses',
        description:
          'Deliver bespoke Life Memoirs, Real Estate Walkthroughs, Corporate Training, and Brand Films for paying clients in hours instead of weeks—with full commercial ownership.',
        highlights: [
          'Guided story-first client intake & multi-age cast continuity',
          'Shared links for Blueprint, Continuity & Screening sign-off',
          'Hybrid client photos + 4K AI re-enactments keep margins high',
        ],
        ctaLabel: 'Explore Business Models & Margins',
        targetAnchor: 'video-services',
      },
      {
        id: 'aspiring',
        badge: 'No Film School or Prompting Needed',
        title: 'Aspiring Storytellers & Authors',
        description:
          'Have a memoir, novel, or channel idea in your head? Describe your story in everyday spoken or typed words and let SceneFlow generate your expert baseline script and world.',
        highlights: [
          'Instant expert baseline for Series, Blueprint & Script',
          'Speak or type changes in plain language—zero prompt syntax',
          'Watch your voiced animatic before spending credits on motion',
        ],
        ctaLabel: 'Take the 4-Step Studio Tour',
        targetAnchor: 'studio-tour',
      },
      {
        id: 'experienced',
        badge: 'Series Channels · Podcasts · Investor Pre-Vis',
        title: 'Experienced Creators & Filmmakers',
        description:
          'End slot-machine regenerations. Lock recurring cast faces, per-shot wardrobes, custom voices, and sets in your Continuity Vault—then scale production 10x with autonomous agents.',
        highlights: [
          'Multi-episode Continuity Vault & per-shot wardrobe control',
          'Audience Resonance & FlowDirector greenlight review',
          'Autonomous agents build 27+ scenes & 70+ language dubs',
        ],
        ctaLabel: 'See the 5 Studio Superpowers',
        targetAnchor: 'five-superpowers',
      },
    ],
  },
  superpowers: {
    eyebrow: 'The SceneFlow Design Philosophy',
    title: 'Five Studio Superpowers.',
    titleAccent: 'Zero Technical Manual.',
    subtitle:
      'Traditional AI video forces you to juggle fragmented tools and write hundreds of brittle prompts. SceneFlow gives you an intelligent baseline, natural voice/text direction, executive review, and autonomous build agents.',
    watchClipLabel: 'Watch 30s Overview',
    pillars: [
      {
        id: 'baseline',
        number: '01',
        badge: 'Never Face a Blank Page',
        title: 'Auto Expert Baseline Generation',
        description:
          'Start with a simple concept or story-first interview. SceneFlow automatically writes a structured Series Bible, Film Blueprint, and Production Script—complete with individual character arcs, era-accurate locations, and dramatic beats.',
        outcomeTag: 'Series · Blueprint · Production Script',
        videoClipKey: 'comparison',
      },
      {
        id: 'dialog',
        number: '02',
        badge: 'Voice or Typed Direction',
        title: 'Full Director Control via Intelligent Dialog',
        description:
          'Direct like a filmmaker, not a prompt engineer. Speak or type to reshape story beats, split characters across life stages (Age 17, 32, 62), pick exact per-shot wardrobes, or surgically refine any frame.',
        outcomeTag: 'Zero Prompt Engineering',
        videoClipKey: 'direction',
      },
      {
        id: 'review',
        number: '03',
        badge: 'Greenlight Before You Spend',
        title: 'Audience Resonance & FlowDirector Review',
        description:
          'Built-in Audience Resonance scores your Series, Blueprint, and Script against your target audience, while FlowDirector highlights pacing gaps and applies one-click creative upgrades before rendering video.',
        outcomeTag: 'Series · Blueprint · Script Scoring',
      },
      {
        id: 'agents',
        number: '04',
        badge: 'Hands-Free Scale',
        title: 'Autonomous Fast-Track Production Agents',
        description:
          'Once your script and Pre-Vis animatic feel right, launch Audio, Stills, Clips, or the full Production Agent to build dozens of scenes, self-heal failed takes, and notify you when your cut is ready.',
        outcomeTag: '300+ Manual Prompts Replaced',
        videoClipKey: 'agent',
      },
      {
        id: 'collaboration',
        number: '05',
        badge: 'Client Sign-Off & Global Reach',
        title: 'Shared Review Links, Screening Room & 70+ Languages',
        description:
          'Share clean browser links for Blueprint, Script, and frame-accurate Screening Room sign-off—then deliver localized streams in 70+ languages while directing in 7 native Studio UI languages.',
        outcomeTag: 'Share Links · Screening Room · 70+ Dubs',
        videoClipKey: 'publish',
      },
    ],
  },
  videoServices: {
    eyebrow: 'Monetize Your Creativity · B2B & Client Services',
    title: 'Turn SceneFlow Into a',
    titleAccent: 'High-Margin Video Business',
    subtitle:
      'Families, realtors, schools, and local businesses pay $200 to $2,500+ for custom storytelling videos—yet traditional crews cost thousands. Deliver unforgettable productions in hours and keep 100% of your client revenue.',
    commercialRightsBadge: '100% Commercial Ownership · Deliver Client Masters Anywhere',
    verticalsHeading: '1. Choose a High-Demand Client Service',
    calculatorBadge: 'Interactive Unit Economics Preview',
    calculatorTitle: '2. Estimate Your Monthly Service Income',
    volumeLabel: 'Client deliveries / month:',
    projectsPerMonthSuffix: 'projects/mo',
    typicalFeeLabel: 'Typical client price',
    estComputeLabel: 'Est. SceneFlow compute',
    activeHandsOnLabel: 'Hands-on direction',
    monthlyGrossLabel: 'Est. Monthly Client Billing',
    monthlyNetLabel: 'Est. Net Creator Income (before base plan)',
    marginBadgeSuffix: 'gross margin',
    disclaimer:
      'Illustrative estimates using SceneFlow’s hybrid Pre-Vis animatic + selective 4K AI clip workflow ($0.01/credit add-on rate). You set your own client pricing and terms.',
    launchBusinessCta: 'Launch Your Video Service ($9)',
    workflowHeading: 'How a Client Project Flows in 4 Effortless Steps',
    workflowSteps: [
      {
        step: '01',
        title: 'Story-First Client Intake',
        detail: 'Interview your client ("Tell me your story") to capture resonating life or brand beats and key individuals.',
      },
      {
        step: '02',
        title: 'Shared Blueprint Sign-Off',
        detail: 'Refine with Audience Resonance internally, then send a clean Blueprint link for client approval before production.',
      },
      {
        step: '03',
        title: 'Hybrid Photo + AI Build',
        detail: 'Combine real client photos with multi-age cast continuity, custom wardrobes, and autonomous Audio/Clips Agents.',
      },
      {
        step: '04',
        title: 'Screening Room Delivery',
        detail: 'Share a private Screening Room link for frame-accurate review, export the 4K master, and collect payment.',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'Video Memoirs',
        badge: '$350–$799 / film · High Emotional Value',
        title: 'Life Stories, Milestone Tributes & Family Biographies',
        description:
          'Blend treasured family photographs with cinematic AI era re-enactments and accurate multi-age character continuity (e.g., Age 17 → Age 32 → Age 62) narrated in warm, lifelike voices.',
        clientBuyer: 'Families, milestone birthdays, estate planners, senior communities & funeral homes',
        typicalRetailUsd: 450,
        retailRangeLabel: '$350–$799',
        estComputeUsd: 75,
        activeMinutesLabel: '~45 min',
        keyAdvantage: 'Hybrid Documentary mode mixes real archival photos with selective hero AI clips for 80%+ margins.',
      },
      {
        id: 'realestate',
        tabLabel: 'Real Estate Tours',
        badge: '$199–$399 / listing · Repeat Brokerage Volume',
        title: 'Narrated Luxury Property & Boutique Hospitality Tours',
        description:
          'Turn listing photographs and neighborhood highlights into scored, narrated cinema walkthroughs—plus instant Mandarin, Spanish, Arabic, or Portuguese versions for international buyers.',
        clientBuyer: 'Residential realtors, luxury brokerages, vacation rentals & boutique hotels',
        typicalRetailUsd: 275,
        retailRangeLabel: '$199–$399',
        estComputeUsd: 22,
        activeMinutesLabel: '~20 min',
        keyAdvantage: 'One realtor listing 4 homes a month becomes a recurring monthly retainer account.',
      },
      {
        id: 'training',
        tabLabel: 'Training & SOPs',
        badge: '$600–$2,500 / course · 70+ Languages',
        title: 'Corporate Onboarding, Safety & Multilingual Courses',
        description:
          'Lock a consistent instructor avatar, uniforms, and workplace sets in your Continuity Vault—then ship crystal-clear training episodes localized across every employee’s native language.',
        clientBuyer: 'HR & L&D teams, manufacturers, healthcare clinics, restaurants & franchises',
        typicalRetailUsd: 950,
        retailRangeLabel: '$600–$2,500',
        estComputeUsd: 80,
        activeMinutesLabel: '~60 min',
        keyAdvantage: 'Update one changed compliance beat in minutes without hiring actors or reshooting.',
      },
      {
        id: 'brand',
        tabLabel: 'Brand Stories',
        badge: '$400–$1,200 / package · Web + Social',
        title: 'Founder Origin Films, Clinic Explainers & Social Ads',
        description:
          'Craft high-converting homepage brand stories paired with automatic 9:16 vertical trailers for Instagram, TikTok, and YouTube Shorts—vetted with clients in the Screening Room.',
        clientBuyer: 'Medical/dental practices, law firms, local SMBs, agencies & e-commerce founders',
        typicalRetailUsd: 600,
        retailRangeLabel: '$400–$1,200',
        estComputeUsd: 40,
        activeMinutesLabel: '~35 min',
        keyAdvantage: 'Upsell seasonal promo cutdowns from the client’s saved Continuity Vault.',
      },
    ],
  },
  guidedTour: {
    eyebrow: 'Visual Studio Tour · No Jargon',
    title: 'Four Connected Rooms.',
    titleAccent: 'One Effortless Flow.',
    subtitle:
      'Explore how an idea moves from story concept to approved client or audience master—using live showcases from our Studio Sandbox instead of a dense technical manual.',
    lensLabel: 'Preview lens:',
    lensCreator: 'Original Series ("The Glass Ledger")',
    lensService: 'Client Service ("Life Story Memoir")',
    watchRoomVideoLabel: 'Watch 30s Room Tour',
    inspectFullScreenLabel: 'Inspect Full Studio Screen',
    openLiveScreeningLabel: 'Open Live Sandbox Screening Room',
    rooms: [
      {
        id: 'series-desk',
        stepNumber: '01',
        tabLabel: 'Series Studio',
        badge: 'Multi-Episode World & Continuity Bible',
        title: 'Build a Reusable Universe Once—Not Just a Single Clip',
        promise:
          'Describe a series channel, training curriculum, or multi-chapter biography once. SceneFlow builds your Story Bible, Episode Slate, and Shared Continuity Vault so every episode stays on-model.',
        creatorExampleTitle: 'The Glass Ledger · 6-Episode Neo-Noir Thriller',
        creatorExampleNote:
          'Shared Cast (Elara Vance, Marcus Thorne, Dr. Aris Kael), Archive Vault set, and Quartz Codex prop lock across all 6 episodes with a 91/100 Audience Resonance baseline.',
        serviceExampleTitle: 'Multi-Chapter Family Legacy or Corporate Curriculum',
        serviceExampleNote:
          'Save a client’s approved hosts, family eras, or workplace locations once—then spin up Episode 2 through Episode 10 in one click with zero visual drift.',
        callouts: [
          {
            label: 'Instant Series Baseline & Resonance Score',
            detail: 'Auto-generates synopsis, episode arcs, and Audience Resonance scoring before production.',
          },
          {
            label: 'Shared Continuity Vault',
            detail: 'Characters, voices, wardrobes, sets, and props transfer automatically into every episode.',
          },
          {
            label: 'Voice or Text Series Director',
            detail: 'Speak or type adjustments to reshape season arcs or individual episodes effortlessly.',
          },
        ],
      },
      {
        id: 'blueprint-board',
        stepNumber: '02',
        tabLabel: 'Blueprint Studio',
        badge: 'Story-First Intake, Multi-Age Cast & Greenlight',
        title: 'Lock a Resonating Story & Cast Before Spending on Video',
        promise:
          'Start from a natural story interview or concept. Blueprint Studio structures your beats, highlights individual characters per beat, locks multi-age identity, and lets clients or collaborators sign off via shared link.',
        creatorExampleTitle: 'Beat-by-Beat Treatment & Visual Style Lock',
        creatorExampleNote:
          'Each beat pairs dramatic intent with participating characters, anamorphic lighting rules, and narrated Audience Resonance feedback.',
        serviceExampleTitle: 'Intelligent Memoir Interview & Multi-Age Continuity',
        serviceExampleNote:
          'Starts with "Tell me your story," clarifies resonating life beats, and creates distinct age-stage characters (e.g., Age 17, Age 32, Age 62) with locked ancestral heritage.',
        callouts: [
          {
            label: 'Story-First Guided Interview',
            detail: 'Draws out rich personal or brand stories and highlights specific individuals in every beat.',
          },
          {
            label: 'Multi-Age Character Continuity',
            detail: 'Creates separate age-specific character references so a 1970s youth and modern elder never blur together.',
          },
          {
            label: 'Audience Resonance + Shared Blueprint Link',
            detail: 'Verify story impact with AI audience scoring and collect client approval from a clean browser link.',
          },
        ],
      },
      {
        id: 'production-stage',
        stepNumber: '03',
        tabLabel: 'Production Stage',
        badge: 'Shot Director, Wardrobe Control & Autonomous Agents',
        title: 'Preview the Voiced Animatic—Then Let Agents Build Your Shots',
        promise:
          'Review your baseline Production Script, lock Continuity references, watch the full voiced Pre-Vis animatic, select exact per-shot wardrobes in Shot Director, and run autonomous agents across all scenes.',
        creatorExampleTitle: 'Scene 1: Subterranean Archive Vault · Anamorphic 4K',
        creatorExampleNote:
          'Switch Elara’s wardrobe per shot, direct camera framing by voice or text, blend multi-track dialogue/SFX/score in the Mixer, and dispatch the Production Agent.',
        serviceExampleTitle: 'Hybrid Client Photos + Cinematic Era Re-Enactments',
        serviceExampleNote:
          'Place real client photographs on Ken Burns beats alongside 4K AI re-enactments for unphotographed memories—keeping a 15-minute memoir under ~$75 in compute.',
        callouts: [
          {
            label: 'Per-Shot Wardrobe & Voice/Typed Shot Director',
            detail: 'Pick exact outfits per shot and refine framing or expressions conversationally—no slot-machine re-rolls.',
          },
          {
            label: 'Voiced Pre-Vis Animatic Firewall',
            detail: 'Hear dialogue, narration, SFX, and music over storyboard stills before spending motion credits.',
          },
          {
            label: 'Autonomous Audio, Stills & Clips Agents',
            detail: 'Generate scene-by-scene or launch the full Production Agent to build and stitch automatically.',
          },
        ],
      },
      {
        id: 'screening-room',
        stepNumber: '04',
        tabLabel: 'Screening Room',
        badge: 'Frame-Accurate Review, 70+ Languages & Publishing',
        title: 'Collaborate via Private Link & Ship Globally in Any Language',
        promise:
          'Screen animatics, rough cuts, and final 4K masters in one unified player. Collect timestamped client or team notes, spin up 70+ in-scene dubbed streams, and export or publish anywhere.',
        creatorExampleTitle: 'Premiere-Ready Master, Promo Trailers & Global Dubs',
        creatorExampleNote:
          'Cut vertical 9:16 trailers automatically, regenerate localized dialogue streams across 70+ markets, and publish to YouTube or apply to SceneFlow Originals.',
        serviceExampleTitle: 'Frictionless Client Review & Multilingual Delivery',
        serviceExampleNote:
          'Clients watch on phone or desktop with zero login required, leave timestamped notes, and receive pristine MP4 deliverables in their family’s or workforce’s language.',
        callouts: [
          {
            label: 'Zero-Login Shared Review Links',
            detail: 'Send private `/share/screening-room/` links for effortless client, executive, or family sign-off.',
          },
          {
            label: '70+ Language In-Scene Sync Streams',
            detail: 'Preserves ambient SFX and score while aligning localized voices and dialogue across global markets.',
          },
          {
            label: '4K Master Export & Promo Cutdowns',
            detail: 'Download clean commercial masters with full IP ownership or ship trailers directly to social channels.',
          },
        ],
      },
    ],
  },
  directoryDrawer: {
    badge: 'Complete Studio Specification · 30+ Capabilities',
    title: 'Want Every Technical Detail? Explore the Full Studio Directory',
    subtitle:
      'Open the interactive room-by-room reference catalog to inspect full-resolution 5K workspace screenshots across Series, Blueprint, Production Stage, Mixer, and Screening Room.',
    expandCta: 'Open Full 30-Feature Directory',
    collapseCta: 'Hide Full 30-Feature Directory',
  },
  academyStrip: {
    badge: 'Zero Learning Curve Guarantee · Studio Academy',
    title: 'Never Feel Overwhelmed. Press ? Anywhere for a 60-Second Visual Guide.',
    subtitle:
      'Every Studio room includes a Just-In-Time (JIT) Screen Map with numbered callouts, one-click actions, credit guardrails, and our interactive “Your First Film in 10 Minutes” simulator.',
    pills: [
      'Context-Aware ? Screen Maps',
      '“First Film in 10 Minutes” Simulator',
      'Pre-Vis Credit Guardrails Built In',
    ],
    watchAcademyCta: 'Watch 30s Academy Tour',
    startExplorerCta: 'Start with Explorer — $9',
  },
}

/**
 * Priority translations for the 6 non-English core UI locales (`es`, `pt`, `hi`, `zh-CN`, `ar`, `th`)
 * so international visitors experience native, persuasive copy offline without GCP translation calls.
 */
export const WORLD_CLASS_LANDING_TRANSLATIONS: Record<
  'es' | 'pt' | 'hi' | 'zh-CN' | 'ar' | 'th',
  Partial<{
    heroDock: StudioLandingCopy['heroDock']
    audienceGatewayHeader: Pick<
      StudioLandingCopy['audienceGateway'],
      'eyebrow' | 'title' | 'titleAccent' | 'subtitle'
    >
    superpowersHeader: Pick<
      StudioLandingCopy['superpowers'],
      'eyebrow' | 'title' | 'titleAccent' | 'subtitle' | 'watchClipLabel'
    >
    videoServicesHeader: Pick<
      StudioLandingCopy['videoServices'],
      | 'eyebrow'
      | 'title'
      | 'titleAccent'
      | 'subtitle'
      | 'commercialRightsBadge'
      | 'launchBusinessCta'
    >
    guidedTourHeader: Pick<
      StudioLandingCopy['guidedTour'],
      | 'eyebrow'
      | 'title'
      | 'titleAccent'
      | 'subtitle'
      | 'lensLabel'
      | 'lensCreator'
      | 'lensService'
      | 'watchRoomVideoLabel'
      | 'inspectFullScreenLabel'
      | 'openLiveScreeningLabel'
    >
    directoryDrawer: StudioLandingCopy['directoryDrawer']
    academyStrip: StudioLandingCopy['academyStrip']
  }>
> = {
  es: {
    heroDock: {
      tagline:
        'Dirige películas y series originales — o crea un negocio rentable de servicios de video. Sin escuela de cine ni ingeniería de prompts.',
      primaryCta: 'Iniciar Studio ($9)',
      businessCta: 'Negocio de Servicios de Video',
      howItWorksCta: 'Cómo Funciona',
    },
    audienceGatewayHeader: {
      eyebrow: 'Un Estudio · Tres Caminos para Triunfar',
      title: 'Crea Mundos Originales.',
      titleAccent: 'O Construye un Negocio Rentable de Video.',
      subtitle:
        'SceneFlow combina un equipo experto de producción con IA y dirección conversacional para narradores, creadores de series y negocios de producción para clientes.',
    },
    superpowersHeader: {
      eyebrow: 'La Filosofía de Diseño de SceneFlow',
      title: 'Cinco Superpoderes de Estudio.',
      titleAccent: 'Cero Manuales Técnicos.',
      subtitle:
        'Obtén una base experta automática, dirección por voz o texto, revisión ejecutiva con Audience Resonance y agentes autónomos de producción.',
      watchClipLabel: 'Ver Resumen de 30s',
    },
    videoServicesHeader: {
      eyebrow: 'Monetiza tu Creatividad · Servicios B2B y Clientes',
      title: 'Convierte SceneFlow en un',
      titleAccent: 'Negocio de Video de Alto Margen',
      subtitle:
        'Familias, inmobiliarias, empresas y clínicas pagan entre $200 y $2,500+ por videos personalizados. Entrega producciones memorables en horas y conserva el 100% de tus ingresos.',
      commercialRightsBadge: '100% Propiedad Comercial · Entrega Masters a tus Clientes',
      launchBusinessCta: 'Lanza tu Servicio de Video ($9)',
    },
    guidedTourHeader: {
      eyebrow: 'Recorrido Visual del Estudio · Sin Jerga',
      title: 'Cuatro Salas Conectadas.',
      titleAccent: 'Un Flujo Sin Esfuerzo.',
      subtitle:
        'Descubre cómo una idea pasa de entrevista inicial a máster aprobado usando ejemplos reales de nuestro Sandbox.',
      lensLabel: 'Enfoque de vista previa:',
      lensCreator: 'Serie Original ("The Glass Ledger")',
      lensService: 'Servicio a Clientes ("Video Memoria de Vida")',
      watchRoomVideoLabel: 'Ver Tour de 30s',
      inspectFullScreenLabel: 'Ver Pantalla Completa del Estudio',
      openLiveScreeningLabel: 'Abrir Sala de Proyección en Vivo',
    },
    directoryDrawer: {
      badge: 'Especificación Completa · Más de 30 Funciones',
      title: '¿Quieres Todos los Detalles Técnicos? Explora el Directorio Completo',
      subtitle:
        'Abre el catálogo interactivo sala por sala para inspeccionar capturas en alta resolución 5K de todo el estudio.',
      expandCta: 'Abrir Directorio de 30+ Funciones',
      collapseCta: 'Ocultar Directorio Completo',
    },
    academyStrip: {
      badge: 'Garantía de Curva de Aprendizaje Cero · Studio Academy',
      title: 'Nunca te Sientas Abrumado. Pulsa ? en Cualquier Pantalla para una Guía Visual de 60s.',
      subtitle:
        'Cada sala incluye mapas visuales interactivos, acciones en un clic, control de créditos y el simulador “Tu Primera Película en 10 Minutos”.',
      pills: [
        'Mapas Visuales Contextuales (?)',
        'Simulador “Primera Película en 10 Min”',
        'Protección de Créditos Pre-Vis',
      ],
      watchAcademyCta: 'Ver Tour de Academy (30s)',
      startExplorerCta: 'Comenzar con Explorer — $9',
    },
  },
  pt: {
    heroDock: {
      tagline:
        'Dirija filmes e séries originais — ou crie um negócio lucrativo de produção de vídeo. Sem escola de cinema nem engenharia de prompts.',
      primaryCta: 'Iniciar Studio ($9)',
      businessCta: 'Negócio de Serviços de Vídeo',
      howItWorksCta: 'Como Funciona',
    },
    audienceGatewayHeader: {
      eyebrow: 'Um Estúdio · Três Formas de Vencer',
      title: 'Crie Mundos Originais.',
      titleAccent: 'Ou Construa um Negócio Lucrativo de Vídeo.',
      subtitle:
        'O SceneFlow une uma equipe especialista de IA com direção por voz ou texto para contadores de histórias, criadores de séries e produtores de vídeo para clientes.',
    },
    superpowersHeader: {
      eyebrow: 'A Filosofia de Design do SceneFlow',
      title: 'Cinco Superpoderes de Estúdio.',
      titleAccent: 'Zero Manual Técnico.',
      subtitle:
        'Base especialista automática, direção conversacional por voz ou texto, análise Audience Resonance e agentes autônomos de produção.',
      watchClipLabel: 'Ver Resumo de 30s',
    },
    videoServicesHeader: {
      eyebrow: 'Monetize sua Criatividade · Serviços de Vídeo para Clientes',
      title: 'Transforme o SceneFlow em uma',
      titleAccent: 'Produtora de Vídeo de Alta Margem',
      subtitle:
        'Famílias, corretores, empresas e clínicas pagam de $200 a $2,500+ por vídeos sob medida. Entregue produções incríveis em horas com 100% dos direitos comerciais.',
      commercialRightsBadge: '100% Propriedade Comercial · Entregue Masters aos Clientes',
      launchBusinessCta: 'Comece seu Serviço de Vídeo ($9)',
    },
    guidedTourHeader: {
      eyebrow: 'Tour Visual do Estúdio · Sem Jargão',
      title: 'Quatro Salas Conectadas.',
      titleAccent: 'Um Fluxo Sem Esforço.',
      subtitle:
        'Veja como uma ideia evolui da conversa inicial ao master aprovado com exemplos reais do nosso Sandbox.',
      lensLabel: 'Lente de visualização:',
      lensCreator: 'Série Original ("The Glass Ledger")',
      lensService: 'Serviço ao Cliente ("Vídeo Memória de Vida")',
      watchRoomVideoLabel: 'Assistir Tour de 30s',
      inspectFullScreenLabel: 'Ver Tela Completa do Estúdio',
      openLiveScreeningLabel: 'Abrir Sala de Exibição ao Vivo',
    },
    directoryDrawer: {
      badge: 'Especificação Completa · 30+ Recursos',
      title: 'Quer Todos os Detalhes Técnicos? Explore o Diretório Completo do Estúdio',
      subtitle:
        'Abra o catálogo interativo sala por sala para inspecionar capturas 5K de Series, Blueprint, Produção, Mixer e Screening Room.',
      expandCta: 'Abrir Diretório de 30+ Recursos',
      collapseCta: 'Ocultar Diretório Completo',
    },
    academyStrip: {
      badge: 'Garantia de Curva Zero · Studio Academy',
      title: 'Nunca Fique Perdido. Pressione ? em Qualquer Tela para um Guia Visual de 60s.',
      subtitle:
        'Cada sala inclui mapas visuais Just-In-Time, ações em um clique, proteção de créditos e o simulador “Seu Primeiro Filme em 10 Minutos”.',
      pills: [
        'Mapas Visuais Contextuais (?)',
        'Simulador “Primeiro Filme em 10 Min”',
        'Guarda-Corpos de Créditos Pre-Vis',
      ],
      watchAcademyCta: 'Assistir Tour da Academy (30s)',
      startExplorerCta: 'Começar com Explorer — $9',
    },
  },
  hi: {
    heroDock: {
      tagline:
        'मौलिक फ़िल्में और सीरीज़ निर्देशित करें — या उच्च-मार्जिन वीडियो सेवा व्यवसाय शुरू करें। किसी फ़िल्म स्कूल या प्रॉम्प्ट इंजीनियरिंग की आवश्यकता नहीं।',
      primaryCta: 'स्टूडियो शुरू करें ($9)',
      businessCta: 'वीडियो बिज़नेस अवसर देखें',
      howItWorksCta: 'यह कैसे काम करता है',
    },
    audienceGatewayHeader: {
      eyebrow: 'एक स्टूडियो · सफलता के तीन रास्ते',
      title: 'मौलिक कहानियाँ रचें।',
      titleAccent: 'या लाभदायक वीडियो व्यवसाय बनाएँ।',
      subtitle:
        'SceneFlow विशेषज्ञ AI प्रोडक्शन क्रू और सहज संवाद निर्देशन को जोड़ता है—कहानीकारों, सीरीज़ क्रिएटर्स और क्लाइंट वीडियो एजेंसियों के लिए।',
    },
    superpowersHeader: {
      eyebrow: 'SceneFlow डिज़ाइन दर्शन',
      title: 'पाँच स्टूडियो सुपरपावर।',
      titleAccent: 'कोई जटिल तकनीकी मैनुअल नहीं।',
      subtitle:
        'स्वचालित विशेषज्ञ बेसलाइन, आवाज़ या टेक्स्ट से निर्देशन, Audience Resonance समीक्षा और स्वायत्त प्रोडक्शन एजेंट्स एक ही पाइपलाइन में।',
      watchClipLabel: '30 सेकंड का परिचय देखें',
    },
    videoServicesHeader: {
      eyebrow: 'अपनी रचनात्मकता से आय कमाएँ · क्लाइंट वीडियो सेवाएँ',
      title: 'SceneFlow को बनाएँ अपना',
      titleAccent: 'उच्च-मार्जिन वीडियो प्रोडक्शन व्यवसाय',
      subtitle:
        'परिवार, रियल एस्टेट एजेंट, संस्थान और व्यवसाय कस्टम वीडियो के लिए $200 से $2,500+ देते हैं। घंटों में शानदार प्रोडक्शन डिलीवर करें और 100% व्यावसायिक अधिकार रखें।',
      commercialRightsBadge: '100% कमर्शियल स्वामित्व · क्लाइंट को मास्टर डिलीवर करें',
      launchBusinessCta: 'अपना वीडियो बिज़नेस शुरू करें ($9)',
    },
    guidedTourHeader: {
      eyebrow: 'विज़ुअल स्टूडियो टूर · सरल और स्पष्ट',
      title: 'चार जुड़े हुए स्टूडियो रूम।',
      titleAccent: 'एक सहज वर्कफ़्लो।',
      subtitle:
        'हमारे सैंडबॉक्स उदाहरणों के साथ देखें कि कैसे एक कहानी विचार से तैयार 4K मास्टर तक पहुँचती है।',
      lensLabel: 'उदाहरण चुनें:',
      lensCreator: 'ओरिजिनल सीरीज़ ("The Glass Ledger")',
      lensService: 'क्लाइंट सर्विस ("लाइफ़ स्टोरी मेमॉयर")',
      watchRoomVideoLabel: '30s रूम टूर देखें',
      inspectFullScreenLabel: 'पूर्ण स्टूडियो स्क्रीन देखें',
      openLiveScreeningLabel: 'लाइव स्क्रीनिंग रूम खोलें',
    },
    directoryDrawer: {
      badge: 'पूर्ण स्टूडियो विवरण · 30+ क्षमताएँ',
      title: 'हर तकनीकी विवरण देखना चाहते हैं? पूरी स्टूडियो डायरेक्टरी खोलें',
      subtitle:
        'Series, Blueprint, Production Stage, Mixer और Screening Room के 5K स्क्रीनशॉट देखने के लिए पूरी सूची खोलें।',
      expandCta: 'सभी 30+ फ़ीचर्स देखें',
      collapseCta: 'फ़ीचर डायरेक्टरी छुपाएँ',
    },
    academyStrip: {
      badge: 'शून्य लर्निंग कर्व गारंटी · Studio Academy',
      title: 'कभी उलझन महसूस न करें। 60-सेकंड विज़ुअल गाइड के लिए किसी भी स्क्रीन पर ? दबाएँ।',
      subtitle:
        'हर रूम में विज़ुअल स्क्रीन मैप, वन-क्लिक एक्शन, क्रेडिट सुरक्षा और “10 मिनट में आपकी पहली फ़िल्म” सिम्युलेटर शामिल है।',
      pills: [
        'संदर्भ-आधारित ? स्क्रीन मैप',
        '“10 मिनट में पहली फ़िल्म” सिम्युलेटर',
        'बिल्ट-इन Pre-Vis क्रेडिट सुरक्षा',
      ],
      watchAcademyCta: '30s Academy टूर देखें',
      startExplorerCta: 'Explorer से शुरू करें — $9',
    },
  },
  'zh-CN': {
    heroDock: {
      tagline:
        '执导原创影视剧集 — 或打造高利润的视频交付服务业务。无需电影学院背景，告别繁琐提示词工程。',
      primaryCta: '启动工作室 ($9)',
      businessCta: '了解视频服务商机',
      howItWorksCta: '了解工作流程',
    },
    audienceGatewayHeader: {
      eyebrow: '一体化制片厂 · 三大成功路径',
      title: '创作原创影视世界，',
      titleAccent: '或开启高利润视频定制业务。',
      subtitle:
        'SceneFlow 将专业级 AI 制片团队与自然语音/文字导演对话融为一体，赋能商业视频服务商、故事创作者与资深影视人。',
    },
    superpowersHeader: {
      eyebrow: 'SceneFlow 核心设计哲学',
      title: '五大制片超能力，',
      titleAccent: '告别晦涩技术手册。',
      subtitle:
        '自动生成专家级初稿、语音或文字自然执导、Audience Resonance 专业审片，以及全自动多场景生产代理。',
      watchClipLabel: '观看 30 秒导览',
    },
    videoServicesHeader: {
      eyebrow: '商业变现引擎 · B2B 与客户视频交付服务',
      title: '用 SceneFlow 打造您的',
      titleAccent: '高毛利视频制作生意',
      subtitle:
        '家庭人生传记、房产导览、企业多语种培训与品牌故事客单价达 $200–$2,500+。数小时交付院线级成片，享有 100% 商业版权收益。',
      commercialRightsBadge: '100% 商业版权归属 · 自由向客户交付母带',
      launchBusinessCta: '开启视频服务业务 ($9)',
    },
    guidedTourHeader: {
      eyebrow: '可视化制片导览 · 直观易懂',
      title: '四大协同创作空间，',
      titleAccent: '一站式顺畅成片。',
      subtitle:
        '通过真实沙盒项目演示，直观体验从故事访谈、分龄角色锁定到客户审片交付的完整流程。',
      lensLabel: '切换演示视角：',
      lensCreator: '原创剧集（《琉璃账本》）',
      lensService: '客户定制服务（“人生传记电影”）',
      watchRoomVideoLabel: '观看 30 秒空间导览',
      inspectFullScreenLabel: '查看高清完整工作台',
      openLiveScreeningLabel: '打开沙盒审片室预览',
    },
    directoryDrawer: {
      badge: '完整制片厂规格 · 30+ 项核心能力',
      title: '想深入了解每一项细节？展开 30+ 功能完整目录',
      subtitle:
        '按空间浏览剧集室、蓝图室、制片舞台、混音台与放映室的 5K 全分辨率界面截图与详细说明。',
      expandCta: '展开全部 30+ 项功能目录',
      collapseCta: '收起完整功能目录',
    },
    academyStrip: {
      badge: '零学习门槛保障 · Studio Academy',
      title: '随时掌控全局：在任意界面按下 ? 即可打开 60 秒可视化指引。',
      subtitle:
        '内置即时界面导览图、一键快捷操作、预演积分护栏，以及“10 分钟完成第一部短片”互动教学。',
      pills: ['即时上下文 ? 导览图', '“10 分钟首部短片”模拟器', '先审动态分镜再耗视频积分'],
      watchAcademyCta: '观看 30 秒学院介绍',
      startExplorerCta: '以 Explorer 起步 — $9',
    },
  },
  ar: {
    heroDock: {
      tagline:
        'أخرج أفلاماً ومسلسلات أصلية — أو أطلق مشروعاً مربحاً لخدمات إنتاج الفيديو للعملاء دون الحاجة لخبرة سينمائية أو هندسة أوامر.',
      primaryCta: 'ابدأ الاستوديو ($9)',
      businessCta: 'اكتشف فرصة أعمال الفيديو',
      howItWorksCta: 'كيف يعمل الاستوديو',
    },
    audienceGatewayHeader: {
      eyebrow: 'استوديو واحد · ثلاثة مسارات للنجاح',
      title: 'اصنع عوالمك السينمائية الأصلية.',
      titleAccent: 'أو ابنِ مشروعاً مربحاً لخدمات الفيديو.',
      subtitle:
        'يجمع SceneFlow بين طاقم إنتاج ذكي وتوجيه حواري بالصوت أو النص لتمكين مقدمي خدمات الفيديو، ورواة القصص، وصنّاع المحتوى المحترفين.',
    },
    superpowersHeader: {
      eyebrow: 'فلسفة تصميم SceneFlow',
      title: 'خمس قدرات إخراجية فائقة.',
      titleAccent: 'دون تعقيد الأدلة التقنية.',
      subtitle:
        'توليد تلقائي لأساس احترافي، تحكم كامل بالحوار الصوتي أو النصي، تقييم Audience Resonance، ووكلاء إنتاج ذاتيون.',
      watchClipLabel: 'شاهد ملخص 30 ثانية',
    },
    videoServicesHeader: {
      eyebrow: 'حوّل إبداعك إلى دخل مستمر · خدمات الفيديو للعملاء',
      title: 'حوّل SceneFlow إلى',
      titleAccent: 'مشروع إنتاج فيديو عالي الربحية',
      subtitle:
        'تدفع العائلات وشركات العقارات والمؤسسات من 200$ إلى 2,500$+ مقابل فيديوهات قصصية مخصصة. أنجز أعمالاً احترافية في ساعات مع ملكية تجارية كاملة 100%.',
      commercialRightsBadge: 'ملكية تجارية 100% · سلّم النسخ النهائية لعملائك بحرية',
      launchBusinessCta: 'أطلق مشروع خدمات الفيديو ($9)',
    },
    guidedTourHeader: {
      eyebrow: 'جولة مرئية مبسطة داخل الاستوديو',
      title: 'أربع غرف مترابطة.',
      titleAccent: 'تدفق إبداعي سلس.',
      subtitle:
        'استكشف كيف تتحول الفكرة من مقابلة قصصية إلى عمل نهائي معتمد عبر أمثلة حقيقية من بيئة Sandbox.',
      lensLabel: 'عدسة العرض:',
      lensCreator: 'مسلسل أصلي ("The Glass Ledger")',
      lensService: 'خدمة عملاء ("فيلم سيرة حياة")',
      watchRoomVideoLabel: 'شاهد جولة 30 ثانية',
      inspectFullScreenLabel: 'عرض شاشة الاستوديو الكاملة',
      openLiveScreeningLabel: 'افتح غرفة العرض التجريبية',
    },
    directoryDrawer: {
      badge: 'المواصفات الكاملة للاستوديو · أكثر من 30 ميزة',
      title: 'هل ترغب في كل التفاصيل التقنية؟ استكشف الدليل الكامل للاستوديو',
      subtitle:
        'افتح الدليل التفاعلي لاستعراض لقطات شاشة بدقة 5K لجميع غرف الاستوديو وأدوات الإنتاج.',
      expandCta: 'افتح دليل 30+ ميزة كاملة',
      collapseCta: 'إخفاء الدليل الكامل',
    },
    academyStrip: {
      badge: 'ضمان سهولة التعلم · أكاديمية الاستوديو',
      title: 'إرشاد فوري في كل خطوة: اضغط ? في أي شاشة لفتح خريطة مرئية خلال 60 ثانية.',
      subtitle:
        'تتضمن كل غرفة خرائط شاشة تفاعلية، وإجراءات بنقرة واحدة، وحماية للرصيد، ومحاكي "فيلمك الأول في 10 دقائق".',
      pills: [
        'خرائط شاشة فورية بزر ?',
        'محاكي "فيلمك الأول في 10 دقائق"',
        'حماية الرصيد قبل توليد الفيديو',
      ],
      watchAcademyCta: 'شاهد جولة الأكاديمية (30 ث)',
      startExplorerCta: 'ابدأ بباقة Explorer — $9',
    },
  },
  th: {
    heroDock: {
      tagline:
        'กำกับภาพยนตร์และซีรีส์ต้นฉบับ — หรือสร้างธุรกิจรับผลิตวิดีโอกำไรสูง โดยไม่ต้องจบภาพยนตร์และไม่ต้องเขียนพรอมต์ซับซ้อน',
      primaryCta: 'เปิดสตูดิโอ ($9)',
      businessCta: 'ดูโอกาสธุรกิจรับทำวิดีโอ',
      howItWorksCta: 'ดูวิธีการทำงาน',
    },
    audienceGatewayHeader: {
      eyebrow: 'หนึ่งสตูดิโอ · สามเส้นทางสู่ความสำเร็จ',
      title: 'สร้างสรรค์โลกภาพยนตร์ของคุณเอง',
      titleAccent: 'หรือปั้นธุรกิจรับผลิตวิดีโอที่ทำกำไรได้จริง',
      subtitle:
        'SceneFlow ผสานทีมโปรดักชัน AI ระดับผู้เชี่ยวชาญเข้ากับการสั่งงานด้วยเสียงหรือข้อความ เพื่อผู้ให้บริการวิดีโอ นักเล่าเรื่องมือใหม่ และครีเอเตอร์มืออาชีพ',
    },
    superpowersHeader: {
      eyebrow: 'ปรัชญาการออกแบบของ SceneFlow',
      title: '5 พลังพิเศษระดับสตูดิโอ',
      titleAccent: 'เข้าใจง่าย ไม่เหมือนอ่านคู่มือเทคนิค',
      subtitle:
        'สร้างโครงเรื่องตั้งต้นระดับมืออาชีพอัตโนมัติ สั่งงานด้วยเสียงหรือพิมพ์ วิเคราะห์ผลตอบรับด้วย Audience Resonance และให้เอเจนต์อัตโนมัติผลิตงานแทนคุณ',
      watchClipLabel: 'ดูคลิปแนะนำ 30 วินาที',
    },
    videoServicesHeader: {
      eyebrow: 'สร้างรายได้จริงจากความคิดสร้างสรรค์ · บริการผลิตวิดีโอให้ลูกค้า',
      title: 'เปลี่ยน SceneFlow ให้เป็น',
      titleAccent: 'ธุรกิจรับผลิตวิดีโออัตรากำไรสูง',
      subtitle:
        'ครอบครัว นายหน้าอสังหาฯ องค์กร และธุรกิจท้องถิ่นพร้อมจ่าย $200–$2,500+ สำหรับวิดีโอเล่าเรื่องเฉพาะบุคคล ส่งมอบงานคุณภาพโรงภาพยนตร์ในไม่กี่ชั่วโมงพร้อมสิทธิ์เชิงพาณิชย์ 100%',
      commercialRightsBadge: 'สิทธิ์เชิงพาณิชย์ 100% · ส่งมอบไฟล์มาสเตอร์ให้ลูกค้าได้ทันที',
      launchBusinessCta: 'เริ่มต้นธุรกิจวิดีโอของคุณ ($9)',
    },
    guidedTourHeader: {
      eyebrow: 'ทัวร์สตูดิโอแบบเห็นภาพจริง · ไร้ศัพท์เทคนิคยุ่งยาก',
      title: '4 ห้องทำงานที่เชื่อมต่อกัน',
      titleAccent: 'ลื่นไหลตั้งแต่ไอเดียจนจบมาสเตอร์',
      subtitle:
        'สำรวจเส้นทางจากบทสัมภาษณ์เรื่องราวสู่ผลงานมาสเตอร์ 4K ผ่านตัวอย่างจริงจาก Sandbox ของเรา',
      lensLabel: 'มุมมองตัวอย่าง:',
      lensCreator: 'ซีรีส์ต้นฉบับ ("The Glass Ledger")',
      lensService: 'งานบริการลูกค้า ("วิดีโออัตชีวประวัติ")',
      watchRoomVideoLabel: 'ดูทัวร์ห้อง 30 วินาที',
      inspectFullScreenLabel: 'ดูหน้าจอสตูดิโอขนาดเต็ม',
      openLiveScreeningLabel: 'เปิดห้องฉายตัวอย่างจริง',
    },
    directoryDrawer: {
      badge: 'รายละเอียดสตูดิโอฉบับเต็ม · 30+ ความสามารถ',
      title: 'ต้องการดูรายละเอียดเชิงลึกทั้งหมดหรือไม่? เปิดสารบบฟีเจอร์ครบ 30+ รายการ',
      subtitle:
        'เปิดแคตตาล็อกแบบโต้ตอบเพื่อดูภาพหน้าจอความละเอียด 5K ของทุกห้องทำงานในสตูดิโอ',
      expandCta: 'เปิดดูสารบบครบ 30+ ฟีเจอร์',
      collapseCta: 'ซ่อนสารบบฟีเจอร์ฉบับเต็ม',
    },
    academyStrip: {
      badge: 'การันตีเริ่มใช้งานได้ทันที · Studio Academy',
      title: 'ไม่ต้องกลัวหลงทาง กดปุ่ม ? บนหน้าจอใดก็ได้เพื่อดูแผนที่แนะนำภายใน 60 วินาที',
      subtitle:
        'ทุกห้องมาพร้อมแผนที่หน้าจอแบบ Just-In-Time ปุ่มสั่งงานคลิกเดียว ระบบคุมงบเครดิต และซิมูเลเตอร์ “สร้างหนังเรื่องแรกใน 10 นาที”',
      pills: [
        'แผนที่หน้าจออัจฉริยะกด ?',
        'ซิมูเลเตอร์ “หนังเรื่องแรกใน 10 นาที”',
        'ตรวจอนิเมติกก่อนใช้เครดิตสร้างวิดีโอ',
      ],
      watchAcademyCta: 'ดูทัวร์ Academy (30 วินาที)',
      startExplorerCta: 'เริ่มต้นด้วย Explorer — $9',
    },
  },
}

export function resolveLocalizedStudioLandingCopy(locale: string): StudioLandingCopy {
  const base = WORLD_CLASS_LANDING_COPY
  const normalized =
    locale === 'zh' || locale.toLowerCase().startsWith('zh')
      ? 'zh-CN'
      : (locale.split('-')[0] as keyof typeof WORLD_CLASS_LANDING_TRANSLATIONS)

  const ov =
    WORLD_CLASS_LANDING_TRANSLATIONS[
      normalized as keyof typeof WORLD_CLASS_LANDING_TRANSLATIONS
    ]
  if (!ov) return base

  return {
    ...base,
    heroDock: ov.heroDock ?? base.heroDock,
    audienceGateway: ov.audienceGatewayHeader
      ? { ...base.audienceGateway, ...ov.audienceGatewayHeader }
      : base.audienceGateway,
    superpowers: ov.superpowersHeader
      ? { ...base.superpowers, ...ov.superpowersHeader }
      : base.superpowers,
    videoServices: ov.videoServicesHeader
      ? { ...base.videoServices, ...ov.videoServicesHeader }
      : base.videoServices,
    guidedTour: ov.guidedTourHeader
      ? { ...base.guidedTour, ...ov.guidedTourHeader }
      : base.guidedTour,
    directoryDrawer: ov.directoryDrawer ?? base.directoryDrawer,
    academyStrip: ov.academyStrip ?? base.academyStrip,
  }
}
