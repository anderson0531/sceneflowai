/**
 * Localized copy for the interactive "Longform 4K Cinema vs. Shortform AI Slop"
 * Craft & Continuity Showcase — rendered on both:
 *   1. Keepsake Cinema White-Label Storefront (`/showcase`, variant="storefront")
 *   2. SceneFlow Studio Video Services Spotlight (`/#video-services`, variant="studio")
 *
 * Inline `$29` and `$149` tokens are dynamically converted to local currency via
 * `localizeUsdText` in the component.
 */

import type { ClientPortalLocale } from '@/lib/intake/clientPortalCopy'

export type CraftPillarId =
  | 'resonance_script'
  | 'character_aging'
  | 'location_matching'
  | 'heirloom_props'
  | 'voice_cloning'
  | 'directed_4k_master'

export interface CraftPillarCopy {
  id: CraftPillarId
  shortTab: string
  badge: string
  title: string
  summary: string
  exampleLabel: string
  exampleHeadline: string
  exampleDetails: string
  highlights: readonly [string, string, string]
  metricValue: string
  metricLabel: string
}

export interface SlopComparisonRow {
  dimension: string
  shortformSlop: string
  sceneFlowLongform: string
}

export interface LongformCraftLocaleCopy {
  storefrontEyebrow: string
  studioEyebrow: string
  storefrontHeadingPrefix: string
  storefrontHeadingAccent: string
  studioHeadingPrefix: string
  studioHeadingAccent: string
  storefrontSubtitle: string
  studioSubtitle: string
  noSlopBadge: string
  trailerSpotlight: {
    badge: string
    headline: string
    body: string
    pill1: string
    pill2: string
    pill3: string
  }
  pillarsHeading: string
  pillarsHint: string
  pillars: readonly [
    CraftPillarCopy,
    CraftPillarCopy,
    CraftPillarCopy,
    CraftPillarCopy,
    CraftPillarCopy,
    CraftPillarCopy,
  ]
  comparisonHeading: string
  comparisonSubtitle: string
  colDimension: string
  colSlop: string
  colSceneFlow: string
  comparisonRows: readonly [
    SlopComparisonRow,
    SlopComparisonRow,
    SlopComparisonRow,
    SlopComparisonRow,
    SlopComparisonRow,
    SlopComparisonRow,
  ]
  storefrontCtaLabel: string
  studioPrimaryCtaLabel: string
  studioSecondaryCtaLabel: string
}

export const LONGFORM_CRAFT_COPY: Record<ClientPortalLocale, LongformCraftLocaleCopy> = {
  en: {
    storefrontEyebrow: 'Longform 4K Cinema · Zero AI Slop',
    studioEyebrow: 'The Unfair Moat Behind Your White-Label Studio',
    storefrontHeadingPrefix: 'Not a 5-Second AI Clip App. A True ',
    storefrontHeadingAccent: '$149 Longform 4K Film Studio.',
    studioHeadingPrefix: 'Why Clients Pay $149–$950+ Instead of Using ',
    studioHeadingAccent: 'Shortform AI Clip Generators.',
    storefrontSubtitle:
      'Generic shortform generators spit out 5-second clips with morphing faces and hollow prompts. Every $149 Keepsake Cinema film is a directed, multi-chapter longform 4K production engineered for 90%+ target audience resonance—bringing real people, eras, homes, heirlooms, and businesses unmistakably to life.',
    studioSubtitle:
      'Shortform AI clip apps flood the internet with disposable 5-second "AI slop." SceneFlow equips your white-label business with true longform 4K cinema—90%+ resonance scripts, locked character de-aging, location & prop continuity, voice cloning, and broadcast-ready masters clients proudly screen and pay premium fees for.',
    noSlopBadge: 'ZERO AI SLOP · LONGFORM 4K CINEMA',
    trailerSpotlight: {
      badge: 'Go Deep · 30–150 Min Feature Film + 1–3 Min Trailer Included',
      headline: 'Turn Your Life Story Into a 30–150 Minute Cinematic Feature Film — Package Includes a 1–3 Min Theatrical Trailer.',
      body: 'Published showcase clips are 2-minute examples—your $149 package buys true longform cinema (up to 1 hour / 360 directed 4K frames; extended 90–150 min feature epics available). Send the 1–3 minute theatrical trailer overview to family or guests before the event, then premiere every life chapter on the big screen.',
      pill1: '1–3 Min Shareable Theatrical Trailer Overview',
      pill2: 'Up to 60 Min (360 4K Frames) Included at $149',
      pill3: 'Expandable to 90–150 Min Full Feature Epics',
    },
    pillarsHeading: 'Explore the 6 Studio Craft Systems Inside Every Film',
    pillarsHint: 'Select any capability to inspect how SceneFlow directs real stories with zero AI slop.',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: '90%+ Resonance Scripts',
        badge: 'Audience-Engineered Screenwriting',
        title: 'Professional Scripts Scored for 90%+ Target Audience Resonance',
        summary:
          'We never feed a raw one-line prompt into a video generator. Every film begins with a multi-act screenplay calibrated for emotional arc, pacing, and 90%+ target audience resonance—whether moving a family to tears at an 80th birthday, converting luxury property buyers, building clinic trust, or locking in employee SOP retention.',
        exampleLabel: 'Director Blueprint Example',
        exampleHeadline: 'Act I Hook → Era Progression → Emotional Climax → Legacy Finale',
        exampleDetails:
          'Each beat is scored against your specific audience (families, luxury buyers, clinic patients, or new hires) before a single frame renders—eliminating flat narration and filler.',
        highlights: [
          'True 30–150 min multi-chapter feature arc (up to 60 min / 360 frames at $149)',
          'Scored & refined for 90%+ target audience emotional & conversion resonance',
          'Includes 1–3 min theatrical trailer overview + interactive Storyboard Blueprint',
        ],
        metricValue: '90%+',
        metricLabel: 'Target Audience Resonance',
      },
      {
        id: 'character_aging',
        shortTab: 'Age-28 & Relative Continuity',
        badge: 'Character Identity & Era Engine',
        title: 'Generate a 28-Year-Old Grandfather & Match Relatives Across Decades',
        summary:
          'Have only a recent portrait of Grandpa at 80? SceneFlow’s Continuity Reference Engine authentically generates his 28-year-old self for 1970s scenes, matches family resemblances across siblings and generations, and locks every character’s likeness across the entire longform film.',
        exampleLabel: 'Continuity Lock Example',
        exampleHeadline: '1 Current Photo → Authentic Age 28 · Age 52 · Today',
        exampleDetails:
          'The same face, bone structure, and warmth carry seamlessly from childhood roots to career milestones and modern family gatherings—never morphing into a stranger between cuts.',
        highlights: [
          'Authentic age-progression & de-aging from everyday phone photos',
          'Multi-generational relative matching across spouses, children & grandchildren',
          'Consistent presenter & founder identity for brand and training films',
        ],
        metricValue: '100%',
        metricLabel: 'Locked Character Identity',
      },
      {
        id: 'location_matching',
        shortTab: 'Location Matching',
        badge: 'Real-World Environment Fidelity',
        title: 'Exact Location Matching — Real Estate, Childhood Streets & Flagship Spaces',
        summary:
          'Generic AI invents random rooms that look nothing like reality. SceneFlow goes deep and locks real locations into continuity—walking real estate buyers through every room, architectural updates, luxury appliances, outdoor living & neighborhood amenities, recreating a beloved childhood street, or preserving your clinic or corporate floor.',
        exampleLabel: 'Environment Lock Example',
        exampleHeadline: 'Childhood Street · Real Estate Upgrades, Appliances & Neighborhood · Flagship Clinic',
        exampleDetails:
          'Upload listing photos, archival street snapshots, or workplace references so every angle and transition honors the true architecture and atmosphere of your story.',
        highlights: [
          'Room-by-room MLS architectural fidelity for Real Estate 4K tours',
          'Era-accurate childhood neighborhoods, schools & family hometowns',
          'Brand-consistent offices, clinics, hotels & safety training floors',
        ],
        metricValue: 'Room-Exact',
        metricLabel: 'Architectural & Era Fidelity',
      },
      {
        id: 'heirloom_props',
        shortTab: 'Signature Props & Heirlooms',
        badge: 'Object & Heirloom Continuity',
        title: 'Lock Cherished Props — From a Family Bible to Signature Brand Gear',
        summary:
          'Great storytelling lives in the details people recognize instantly. SceneFlow’s Prop Continuity locks meaningful objects—like a worn leather family Bible, grandfather’s wristwatch, vintage guitar, signature product, or safety equipment—so they stay consistent scene after scene.',
        exampleLabel: 'Prop Reference Example',
        exampleHeadline: 'Worn Family Bible · Heirloom Watch · Signature Equipment',
        exampleDetails:
          'Because props are anchored in your Continuity Reference Library before rendering, objects never warp, vanish, or turn into garbled AI artifacts mid-scene.',
        highlights: [
          'Preserves cherished family heirlooms (family Bible, jewelry, letters, cars)',
          'Locks commercial products, signage & uniforms for founder brand stories',
          'Accurate equipment & visual aids for compliance and SOP training modules',
        ],
        metricValue: 'Zero Drift',
        metricLabel: 'Object & Heirloom Lock',
      },
      {
        id: 'voice_cloning',
        shortTab: 'Voice Cloning & Matching',
        badge: 'Vocal Identity & Audio Craft',
        title: 'Voice Cloning, Voice-to-Image Matching & 10-Second Pronunciation Lock',
        summary:
          'An unforgettable film sounds as real as it looks. SceneFlow pairs voice cloning and voice-to-image character matching with a 10-second pronunciation guide—so family names, hometowns, and technical acronyms are spoken with natural warmth and broadcast clarity in 70+ languages.',
        exampleLabel: 'Audio Continuity Example',
        exampleHeadline: 'Matched Character Voices + Cloned Warmth + Flawless Name Pronunciation',
        exampleDetails:
          'Each on-screen speaker matches their visual age and persona, backed by gated lip-sync dialogue, custom ambient SFX, and a dynamically ducked orchestral score.',
        highlights: [
          'Voice cloning & age/persona-matched voices paired to on-screen characters',
          '10-second phonetic pronunciation lock for surnames, towns & brand terms',
          'Broadcast stereo mix: dialogue, Studio Narrator VO, SFX & ducked score',
        ],
        metricValue: '70+ Langs',
        metricLabel: 'Voice & Pronunciation Lock',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'Directed 4K Beats & Master',
        badge: 'Photorealistic & Illustrative 4K Cinema',
        title: 'Professionally Directed Beats (Realistic or Illustrative) & 4K Cinema Master',
        summary:
          'Choose lush photorealistic cinema or heirloom illustrative art direction. Every single beat is framed like a documentary DP, animated with smooth 4K Ken Burns camera choreography (or Full-Motion via Studio Partners), and delivered as a theater-ready 3840×2160 master.',
        exampleLabel: 'Finishing Pipeline Example',
        exampleHeadline: 'Art-Directed 4K Beat Frames → 6-Move Camera Choreography → Broadcast Master',
        exampleDetails:
          'No muddy 720p exports or jarring cuts—ready to project onto a wedding banquet screen, stream on a 75" living room TV, or anchor a flagship business homepage.',
        highlights: [
          'Photorealistic cinema OR bespoke illustrative art direction per story',
          'True 4K (3840×2160) with directed push-ins, dolly pans & crane reveals',
          'Upgradeable anytime to Full-Motion live-action cinema via Studio Partners',
        ],
        metricValue: '4K UHD',
        metricLabel: 'Theater-Ready Master',
      },
    ],
    comparisonHeading: 'Why $149 Longform 4K Cinema Is a Different Universe',
    comparisonSubtitle:
      'Compare disposable shortform AI clip generators against a true SceneFlow longform production.',
    colDimension: 'Production Standard',
    colSlop: 'Shortform AI Clip Generators ("AI Slop")',
    colSceneFlow: 'SceneFlow Longform 4K Cinema ($149)',
    comparisonRows: [
      {
        dimension: 'Format & Runtime',
        shortformSlop: '5–15 sec disconnected clips with no story arc',
        sceneFlowLongform: 'Up to 60 min (360 4K frames) at $149 + 1–3 min trailer (expandable to 150-min feature films)',
      },
      {
        dimension: 'Script & Resonance',
        shortformSlop: 'Generic 1-line prompt filler with flat pacing',
        sceneFlowLongform: 'Professional multi-act script scored for 90%+ target audience resonance',
      },
      {
        dimension: 'People & Aging',
        shortformSlop: 'Faces morph into strangers every few seconds',
        sceneFlowLongform: 'Locked character continuity (e.g., 28-year-old Grandfather & relative matching)',
      },
      {
        dimension: 'Locations & Props',
        shortformSlop: 'Hallucinated stock rooms and garbled objects',
        sceneFlowLongform: 'Exact location matching (real estate, childhood streets) & props (family Bible, etc.)',
      },
      {
        dimension: 'Voices & Audio Mix',
        shortformSlop: 'Robotic TTS, mispronounced names & jarring stock loops',
        sceneFlowLongform: 'Voice cloning, voice-image matching, pronunciation lock, SFX & ducked score',
      },
      {
        dimension: 'Visual Direction & Master',
        shortformSlop: 'Flickering artifacts & unwatchable "AI slop"',
        sceneFlowLongform: 'Art-directed realistic or illustrative 4K beat frames + theater-ready master',
      },
    ],
    storefrontCtaLabel: 'Start My $29 Longform Blueprint (Credited Toward $149 4K Film)',
    studioPrimaryCtaLabel: 'Launch Your White-Label Longform Studio',
    studioSecondaryCtaLabel: 'Experience the Live $149 Storefront',
  },

  es: {
    storefrontEyebrow: 'Cine 4K de Formato Largo · Cero "AI Slop"',
    studioEyebrow: 'La Ventaja Injusta de Tu Estudio Marca Blanca',
    storefrontHeadingPrefix: 'No Es una App de Clips de 5 Segundos. Es un ',
    storefrontHeadingAccent: 'Estudio de Cine 4K Largo por $149.',
    studioHeadingPrefix: 'Por Qué los Clientes Pagan $149–$950+ en Lugar de Usar ',
    studioHeadingAccent: 'Generadores Cortos de IA.',
    storefrontSubtitle:
      'Las apps cortas generan clips de 5 segundos con rostros cambiantes y guiones vacíos. Cada filme de $149 es una producción larga en 4K dirigida profesionalmente con 90%+ de resonancia con tu audiencia: personajes, épocas, hogares, reliquias y negocios que cobran vida real.',
    studioSubtitle:
      'Los generadores cortos inundan las redes con "AI slop" desechable. SceneFlow equipa tu estudio marca blanca con cine 4K largo: guiones con 90%+ de resonancia, rejuvenecimiento de personajes, continuidad de locaciones y objetos, clonación de voz y máster profesional.',
    noSlopBadge: 'CERO AI SLOP · CINE 4K FORMATO LARGO',
    trailerSpotlight: {
      badge: 'Ejemplo Insignia · Largometraje + Tráiler Incluido',
      headline: 'Convierte Tu Historia de Vida en una Película Cinematográfica — Incluye Tráiler Oficial.',
      body: 'Envía por WhatsApp un tráiler cinematográfico de 60 segundos a familia e invitados antes del evento y luego estrena la película completa en 4K en pantalla grande.',
      pill1: 'Tráiler Cinematográfico de 60s Incluido',
      pill2: 'Película Completa 4K de Formato Largo',
      pill3: 'Lista para Pantalla Grande y Recuerdo Familiar',
    },
    pillarsHeading: 'Explora los 6 Sistemas de Estudio Detrás de Cada Filme',
    pillarsHint: 'Selecciona cualquier capacidad para ver cómo SceneFlow dirige historias reales sin "AI slop".',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: 'Guiones 90%+ Resonancia',
        badge: 'Guionismo de Precisión',
        title: 'Guiones Profesionales Optimizados para 90%+ de Resonancia',
        summary:
          'Nunca alimentamos un prompt simple. Cada película inicia con un guion multi-acto calibrado para lograr 90%+ de resonancia con la audiencia objetivo: emocionar familias, convertir compradores inmobiliarios, generar confianza médica o capacitar equipos.',
        exampleLabel: 'Ejemplo de Dirección',
        exampleHeadline: 'Gancho Acto I → Evolución de Épocas → Clímax Emocional → Cierre Memorable',
        exampleDetails:
          'Cada escena se evalúa según tu público antes de renderizar, eliminando narraciones planas o relleno.',
        highlights: [
          'Largometraje real de 30–150 min en capítulos (hasta 60 min / 360 cuadros por $149)',
          'Guion evaluado y refinado para 90%+ de resonancia con tu audiencia',
          'Aprobación interactiva del Storyboard Blueprint antes del 4K final',
        ],
        metricValue: '90%+',
        metricLabel: 'Resonancia de Audiencia',
      },
      {
        id: 'character_aging',
        shortTab: 'Continuidad y Edad',
        badge: 'Identidad de Personajes',
        title: 'Crea la Versión de 28 Años del Abuelo y Empareja Familiares',
        summary:
          '¿Solo tienes una foto actual del abuelo a los 80? Nuestro Motor de Continuidad genera su versión auténtica de 28 años para escenas de juventud, mantiene rasgos familiares entre generaciones y fija cada rostro durante toda la película.',
        exampleLabel: 'Ejemplo de Continuidad',
        exampleHeadline: '1 Foto Actual → Auténtico a los 28 · 52 · Hoy',
        exampleDetails:
          'La misma identidad y calidez atraviesan décadas sin transformarse en desconocidos entre escenas.',
        highlights: [
          'Rejuvenecimiento y progresión de edad fiel desde fotos del celular',
          'Coincidencia de rasgos familiares entre padres, hijos y nietos',
          'Identidad fija de fundadores y presentadores en filmes comerciales',
        ],
        metricValue: '100%',
        metricLabel: 'Identidad Bloqueada',
      },
      {
        id: 'location_matching',
        shortTab: 'Locaciones Reales',
        badge: 'Fidelidad de Espacios',
        title: 'Locaciones Exactas — Inmuebles, Barrios de Infancia y Clínicas',
        summary:
          'La IA genérica inventa espacios irreales. SceneFlow fija tus locaciones reales: recorridos inmobiliarios habitación por habitación, el barrio de la infancia o tu clínica, oficina o planta corporativa.',
        exampleLabel: 'Ejemplo de Locación',
        exampleHeadline: 'Barrio de Infancia · Propiedad Inmobiliaria · Clínica Principal',
        exampleDetails:
          'Sube fotos del inmueble o lugares queridos para respetar la arquitectura y atmósfera reales.',
        highlights: [
          'Fidelidad arquitectónica habitación por habitación en tours 4K',
          'Recuerdos fieles de vecindarios, escuelas y pueblos familiares',
          'Coherencia visual para oficinas, hoteles y áreas de capacitación',
        ],
        metricValue: 'Exacto',
        metricLabel: 'Fidelidad de Locación',
      },
      {
        id: 'heirloom_props',
        shortTab: 'Objetos y Reliquias',
        badge: 'Continuidad de Objetos',
        title: 'Fija Objetos Significativos — Desde una Biblia Familiar hasta Equipos',
        summary:
          'Las grandes historias viven en los detalles. Fijamos objetos queridos —como una Biblia familiar, un reloj heredado, una guitarra o productos clave de tu negocio— para que se mantengan intactos escena tras escena.',
        exampleLabel: 'Ejemplo de Utilería',
        exampleHeadline: 'Biblia Familiar · Reloj Heredado · Equipo de Marca',
        exampleDetails:
          'Anclados en la Biblioteca de Continuidad antes del render, los objetos nunca se deforman ni desaparecen.',
        highlights: [
          'Conserva reliquias familiares (Biblia familiar, cartas, joyas, autos)',
          'Fija productos comerciales, letreros y uniformes de marca',
          'Herramientas y equipos precisos para módulos de seguridad y SOP',
        ],
        metricValue: 'Cero Error',
        metricLabel: 'Continuidad de Objetos',
      },
      {
        id: 'voice_cloning',
        shortTab: 'Clonación de Voz',
        badge: 'Identidad Vocal',
        title: 'Clonación de Voz, Emparejamiento Voz-Imagen y Pronunciación Exacta',
        summary:
          'Un gran filme suena tan real como se ve. Combinamos clonación de voz, emparejamiento de voz con la imagen del personaje y una guía de pronunciación de 10 segundos en más de 70 idiomas.',
        exampleLabel: 'Ejemplo Vocal',
        exampleHeadline: 'Voces Coherentes + Clonación Natural + Nombres Bien Pronunciados',
        exampleDetails:
          'Cada voz coincide con el personaje en pantalla, acompañada de efectos sonoros y música orquestal mezclada.',
        highlights: [
          'Clonación de voz y ajuste preciso de edad y tono con cada personaje',
          'Guía fonética de 10 segundos para apellidos, ciudades y marcas',
          'Mezcla estéreo profesional: diálogo, narración, SFX y banda sonora',
        ],
        metricValue: '70+ Idiomas',
        metricLabel: 'Voz y Pronunciación',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'Escenas 4K y Máster',
        badge: 'Dirección Realista o Ilustrada',
        title: 'Escenas 4K Dirigidas (Realistas o Ilustradas) y Máster Cinematográfico',
        summary:
          'Elige estilo cinematográfico fotorrealista o ilustración artística. Cada plano se dirige con movimientos fluidos de cámara 4K (o Movimiento Total con Estudios Socios) y se entrega en máster 3840×2160 listo para pantalla grande.',
        exampleLabel: 'Acabado de Estudio',
        exampleHeadline: 'Cuadros 4K Dirigidos → Coreografía de Cámara → Máster Profesional',
        exampleDetails:
          'Listo para proyectar en bodas, celebraciones familiares, televisores 4K o tu sitio web principal.',
        highlights: [
          'Dirección fotorrealista o ilustrada según el tono de tu historia',
          '4K UHD real (3840×2160) con paneos y acercamientos cinematográficos',
          'Actualizable en cualquier momento a Movimiento Total vía socios',
        ],
        metricValue: '4K UHD',
        metricLabel: 'Máster de Cine',
      },
    ],
    comparisonHeading: 'Por Qué el Cine 4K Largo de $149 Está en Otra Liga',
    comparisonSubtitle: 'Compara los generadores cortos de IA contra una producción larga de SceneFlow.',
    colDimension: 'Estándar de Producción',
    colSlop: 'Generadores Cortos ("AI Slop")',
    colSceneFlow: 'SceneFlow Cine 4K Largo ($149)',
    comparisonRows: [
      {
        dimension: 'Duración y Formato',
        shortformSlop: 'Clips sueltos de 5–15 segundos sin arco narrativo',
        sceneFlowLongform: 'Hasta 60 min (360 cuadros 4K) por $149 + tráiler 1–3 min (ampliable a 150 min)',
      },
      {
        dimension: 'Guion y Resonancia',
        shortformSlop: 'Prompts genéricos planos y sin emoción',
        sceneFlowLongform: 'Guion profesional multi-acto con 90%+ de resonancia',
      },
      {
        dimension: 'Rostros y Edades',
        shortformSlop: 'Rostros que cambian cada 4 segundos',
        sceneFlowLongform: 'Continuidad fija (ej. abuelo a los 28 años y familiares)',
      },
      {
        dimension: 'Locaciones y Objetos',
        shortformSlop: 'Habitaciones inventadas y objetos distorsionados',
        sceneFlowLongform: 'Locaciones exactas (inmuebles, infancia) y reliquias (Biblia familiar)',
      },
      {
        dimension: 'Voces y Mezcla',
        shortformSlop: 'Voces robóticas y nombres mal pronunciados',
        sceneFlowLongform: 'Clonación de voz, emparejamiento voz-imagen, SFX y música',
      },
      {
        dimension: 'Dirección y Máster',
        shortformSlop: 'Artefactos visibles y estética desechable',
        sceneFlowLongform: 'Planos 4K realistas o ilustrados + máster listo para cine',
      },
    ],
    storefrontCtaLabel: 'Iniciar Blueprint Largo de $29 (Acreditado al Filme 4K de $149)',
    studioPrimaryCtaLabel: 'Lanza Tu Estudio Marca Blanca de Formato Largo',
    studioSecondaryCtaLabel: 'Ver la Tienda en Vivo de $149',
  },

  pt: {
    storefrontEyebrow: 'Cinema 4K de Longa Duração · Zero "AI Slop"',
    studioEyebrow: 'O Diferencial Injusto do Seu Estúdio White-Label',
    storefrontHeadingPrefix: 'Não É um App de Clipes de 5 Segundos. É um ',
    storefrontHeadingAccent: 'Estúdio de Cinema 4K Longo por $149.',
    studioHeadingPrefix: 'Por Que Clientes Pagam $149–$950+ em Vez de Usar ',
    studioHeadingAccent: 'Geradores Curtos de IA.',
    storefrontSubtitle:
      'Geradores curtos criam clipes de 5 segundos com rostos distorcidos e roteiros vazios. Cada filme de $149 é uma obra longa em 4K com 90%+ de ressonância com o público—dando vida real a pessoas, épocas, imóveis, relíquias e empresas.',
    studioSubtitle:
      'Apps de vídeo curto enchem a internet de "AI slop" descartável. O SceneFlow equipa seu negócio white-label com cinema 4K de longa duração: roteiros 90%+ ressonância, rejuvenescimento de personagens, continuidade de locais e objetos, clonagem de voz e master profissional.',
    noSlopBadge: 'ZERO AI SLOP · CINEMA 4K LONGA DURAÇÃO',
    trailerSpotlight: {
      badge: 'Exemplo Destaque · Filme Completo + Trailer Incluso',
      headline: 'Transforme Sua História de Vida em um Filme Cinematográfico — Pacote Inclui Trailer.',
      body: 'Envie um trailer de cinema de 60 segundos para familiares e convidados antes da celebração—e estreie o filme completo em 4K no telão.',
      pill1: 'Trailer Cinematográfico de 60s Incluso',
      pill2: 'Filme Master 4K de Longa Duração',
      pill3: 'Pronto para Telões e Herança Familiar',
    },
    pillarsHeading: 'Explore os 6 Sistemas de Estúdio em Cada Filme',
    pillarsHint: 'Selecione qualquer recurso para ver como o SceneFlow dirige histórias reais sem "AI slop".',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: 'Roteiros 90%+ Ressonância',
        badge: 'Roteirização Profissional',
        title: 'Roteiros Profissionais com 90%+ de Ressonância com o Público',
        summary:
          'Nunca usamos prompts soltos. Cada filme nasce de um roteiro em atos calibrado para 90%+ de ressonância emocional e estratégica—seja para emocionar famílias, vender imóveis de luxo, gerar confiança em clínicas ou treinar equipes.',
        exampleLabel: 'Exemplo de Roteiro',
        exampleHeadline: 'Gancho Ato I → Linha do Tempo → Clímax Emocional → Final Inesquecível',
        exampleDetails:
          'Cada cena é avaliada para o seu público-alvo antes da renderização, garantindo ritmo envolvente do início ao fim.',
        highlights: [
          'Longa-metragem de 30–150 min em capítulos (até 60 min / 360 quadros por $149)',
          'Roteiro calibrado para 90%+ de ressonância com a audiência',
          'Aprovação do Storyboard Blueprint antes do master 4K final',
        ],
        metricValue: '90%+',
        metricLabel: 'Ressonância do Público',
      },
      {
        id: 'character_aging',
        shortTab: 'Avô aos 28 Anos e Família',
        badge: 'Continuidade de Personagens',
        title: 'Crie a Versão de 28 Anos do Avô e Combine Familiares',
        summary:
          'Só tem uma foto atual do avô aos 80? Nosso Motor de Continuidade cria sua versão fiel aos 28 anos para cenas de juventude, harmoniza traços entre parentes e mantém o mesmo rosto por todo o filme.',
        exampleLabel: 'Exemplo de Identidade',
        exampleHeadline: '1 Foto Atual → Fiel aos 28 Anos · 52 Anos · Hoje',
        exampleDetails:
          'O mesmo olhar e estrutura facial atravessam gerações sem jamais virar um estranho entre cortes.',
        highlights: [
          'Rejuvenescimento e envelhecimento natural a partir de fotos comuns',
          'Semelhança fiel entre pais, filhos, cônjuges e netos',
          'Identidade travada para fundadores e instrutores em filmes B2B',
        ],
        metricValue: '100%',
        metricLabel: 'Identidade Travada',
      },
      {
        id: 'location_matching',
        shortTab: 'Locais Reais',
        badge: 'Fidelidade de Ambientes',
        title: 'Correspondência Exata de Locais — Imóveis, Bairro Natal e Clínicas',
        summary:
          'IA genérica inventa cenários artificiais. O SceneFlow fixa seus ambientes reais: cômodos de imóveis, o bairro da infância ou sua clínica, loja ou sede corporativa.',
        exampleLabel: 'Exemplo de Ambiente',
        exampleHeadline: 'Casa da Infância · Tour Imobiliário Real · Clínica Flagship',
        exampleDetails:
          'Envie fotos do imóvel ou memórias do bairro para preservar arquitetura e atmosfera autênticas.',
        highlights: [
          'Fidelidade arquitetônica cômodo a cômodo em tours 4K',
          'Bairros de infância, escolas e cidades de origem autênticas',
          'Consistência visual para clínicas, hotéis e ambientes de trabalho',
        ],
        metricValue: 'Exato',
        metricLabel: 'Fidelidade de Local',
      },
      {
        id: 'heirloom_props',
        shortTab: 'Objetos e Relíquias',
        badge: 'Continuidade de Objetos',
        title: 'Trave Objetos Marcantes — Da Bíblia da Família a Produtos da Marca',
        summary:
          'A emoção está nos detalhes que todos reconhecem. Travamos objetos especiais—como uma Bíblia da família, relógio antigo, violão ou equipamentos da empresa—mantendo consistência total em todas as cenas.',
        exampleLabel: 'Exemplo de Objeto',
        exampleHeadline: 'Bíblia da Família · Relógio Antigo · Equipamento da Marca',
        exampleDetails:
          'Ancorados na Biblioteca de Continuidade, os objetos nunca se deformam nem somem no meio da cena.',
        highlights: [
          'Preserva relíquias queridas (Bíblia da família, cartas, joias)',
          'Trava produtos comerciais, letreiros e uniformes da marca',
          'Precisão visual para treinamentos de segurança e SOPs',
        ],
        metricValue: 'Zero Falha',
        metricLabel: 'Continuidade de Objetos',
      },
      {
        id: 'voice_cloning',
        shortTab: 'Clonagem de Voz',
        badge: 'Identidade Vocal',
        title: 'Clonagem de Voz, Harmonia Voz-Imagem e Guia de Pronúncia',
        summary:
          'Um filme inesquecível soa tão verdadeiro quanto parece. Unimos clonagem de voz, correspondência entre voz e personagem e trava fonética de 10 segundos em 70+ idiomas.',
        exampleLabel: 'Exemplo de Áudio',
        exampleHeadline: 'Vozes Combinadas à Imagem + Clonagem + Pronúncia Perfeita',
        exampleDetails:
          'Cada personagem fala com voz coerente à idade e perfil, sobre efeitos sonoros e trilha mixada.',
        highlights: [
          'Clonagem de voz e combinação fiel de voz com imagem em tela',
          'Guia de pronúncia de 10s para sobrenomes, cidades e siglas',
          'Mixagem estéreo profissional: diálogos, narração, SFX e trilha',
        ],
        metricValue: '70+ Idiomas',
        metricLabel: 'Voz e Pronúncia',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'Cenas 4K e Master',
        badge: 'Realista ou Ilustrado em 4K',
        title: 'Cenas 4K Dirigidas (Realistas ou Ilustradas) e Master Profissional',
        summary:
          'Escolha cinema fotorrealista ou direção ilustrada autoral. Cada plano recebe câmera 4K fluida (ou Movimento Total com Estúdios Parceiros) e entrega em master 3840×2160 pronto para telão.',
        exampleLabel: 'Acabamento de Cinema',
        exampleHeadline: 'Quadros 4K Dirigidos → Movimentos de Câmera → Master Profissional',
        exampleDetails:
          'Sem vídeos borrados—pronto para projetores de eventos, TVs 4K e páginas principais de empresas.',
        highlights: [
          'Estilo cinematográfico fotorrealista OU ilustrado sob medida',
          '4K UHD real (3840×2160) com movimentos suaves de câmera',
          'Upgrade para Movimento Total disponível via Estúdios Parceiros',
        ],
        metricValue: '4K UHD',
        metricLabel: 'Master de Cinema',
      },
    ],
    comparisonHeading: 'Por Que o Cinema 4K Longo de $149 Está em Outro Patamar',
    comparisonSubtitle: 'Compare geradores curtos descartáveis com uma produção longa SceneFlow.',
    colDimension: 'Padrão de Produção',
    colSlop: 'Geradores Curtos ("AI Slop")',
    colSceneFlow: 'SceneFlow Cinema 4K Longo ($149)',
    comparisonRows: [
      {
        dimension: 'Formato e Duração',
        shortformSlop: 'Clipes soltos de 5–15 segundos sem história',
        sceneFlowLongform: 'Até 60 min (360 quadros 4K) por $149 + trailer 1–3 min (expansível a 150 min)',
      },
      {
        dimension: 'Roteiro e Ressonância',
        shortformSlop: 'Texto genérico sem arco emocional',
        sceneFlowLongform: 'Roteiro profissional com 90%+ de ressonância com o público',
      },
      {
        dimension: 'Rostos e Idades',
        shortformSlop: 'Rostos mudam para estranhos a cada cena',
        sceneFlowLongform: 'Continuidade travada (ex.: avô aos 28 anos e familiares)',
      },
      {
        dimension: 'Locais e Objetos',
        shortformSlop: 'Cenários inventados e objetos deformados',
        sceneFlowLongform: 'Locais reais (imóveis, infância) e relíquias (Bíblia da família)',
      },
      {
        dimension: 'Vozes e Áudio',
        shortformSlop: 'Voz robótica e nomes pronunciados errado',
        sceneFlowLongform: 'Clonagem de voz, harmonia voz-imagem, SFX e trilha',
      },
      {
        dimension: 'Direção e Master',
        shortformSlop: 'Artefatos visuais e aspecto de "AI slop"',
        sceneFlowLongform: 'Quadros 4K realistas ou ilustrados + master profissional',
      },
    ],
    storefrontCtaLabel: 'Iniciar Blueprint Longo de $29 (Abatido no Filme 4K de $149)',
    studioPrimaryCtaLabel: 'Lance Seu Estúdio White-Label de Longa Duração',
    studioSecondaryCtaLabel: 'Explorar a Loja ao Vivo de $149',
  },

  hi: {
    storefrontEyebrow: 'लॉन्ग-फॉर्म 4K सिनेमा · ज़ीरो AI स्लॉप',
    studioEyebrow: 'आपके व्हाइट-लेबल स्टूडियो की अजेय ताकत',
    storefrontHeadingPrefix: 'यह 5-सेकंड का AI क्लिप ऐप नहीं है। यह एक असली ',
    storefrontHeadingAccent: '$149 लॉन्ग-फॉर्म 4K फिल्म स्टूडियो है।',
    studioHeadingPrefix: 'ग्राहक शॉर्ट-फॉर्म AI ऐप्स की जगह $149–$950+ ',
    studioHeadingAccent: 'लॉन्ग-फॉर्म सिनेमा के लिए क्यों देते हैं।',
    storefrontSubtitle:
      'साधारण शॉर्ट-फॉर्म AI ऐप्स 5 सेकंड के बदलते चेहरों वाले क्लिप बनाते हैं। हर $149 फिल्म एक निर्देशित, मल्टी-चैप्टर लॉन्ग-फॉर्म 4K सिनेमा मास्टर है—90%+ दर्शक जुड़ाव (रेज़ोनेंस) के साथ आपके परिवार, घर, यादगार वस्तुओं और व्यवसाय को सजीव करती है।',
    studioSubtitle:
      'शॉर्ट-फॉर्म ऐप्स इंटरनेट को सस्ते "AI स्लॉप" से भर देते हैं। SceneFlow आपके व्हाइट-लेबल स्टूडियो को देता है असली लॉन्ग-फॉर्म 4K सिनेमा—90%+ रेज़ोनेंस स्क्रिप्ट, उम्र के अनुसार कैरेक्टर कंटिन्यूटी, लोकेशन और वस्तु लॉक, वॉइस क्लोनिंग और ब्रॉडकास्ट मास्टर।',
    noSlopBadge: 'ज़ीरो AI स्लॉप · लॉन्ग-फॉर्म 4K सिनेमा',
    trailerSpotlight: {
      badge: 'विशेष उदाहरण · फीचर फिल्म + ट्रेलर शामिल',
      headline: 'अपनी जीवन कहानी को सिनेमैटिक फीचर फिल्म में बदलें — पैकेज में ट्रेलर शामिल।',
      body: 'समारोह से पहले परिवार और मेहमानों को 60-सेकंड का शानदार थिएट्रिकल ट्रेलर भेजें—और फिर बड़े पर्दे पर पूरी लॉन्ग-फॉर्म 4K फिल्म का प्रीमियर करें।',
      pill1: '60-सेकंड का शेयर करने योग्य ट्रेलर शामिल',
      pill2: 'पूर्ण लॉन्ग-फॉर्म 4K फीचर मास्टर',
      pill3: 'बड़े पर्दे और पारिवारिक यादगार के लिए तैयार',
    },
    pillarsHeading: 'हर फिल्म के पीछे 6 स्टूडियो क्राफ्ट सिस्टम देखें',
    pillarsHint: 'किसी भी क्षमता पर क्लिक करें और देखें SceneFlow कैसे असली कहानियाँ निर्देशित करता है।',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: '90%+ रेज़ोनेंस स्क्रिप्ट',
        badge: 'पेशेवर पटकथा लेखन',
        title: '90%+ टारगेट ऑडियंस रेज़ोनेंस के लिए तैयार प्रोफेशनल स्क्रिप्ट्स',
        summary:
          'हम एक-लाइन प्रॉम्प्ट नहीं चलाते। हर फिल्म एक मल्टी-एक्ट स्क्रिप्ट से शुरू होती है जिसे 90%+ दर्शक जुड़ाव के लिए तराशा जाता है—परिवार को भावुक करने, लग्ज़री प्रॉपर्टी बेचने या कॉर्पोरेट ट्रेनिंग को यादगार बनाने के लिए।',
        exampleLabel: 'डायरेक्टर ब्लूप्रिंट उदाहरण',
        exampleHeadline: 'एक्ट I हुक → समय की यात्रा → भावनात्मक चरम → यादगार समापन',
        exampleDetails:
          'फ्रेम बनने से पहले हर बीट को आपके लक्ष्य दर्शकों के अनुसार परखा जाता है।',
        highlights: [
          '30–150 मिनट की पूर्ण फीचर कहानी ($149 में 60 मिनट / 360 फ्रेम + 1–3 मिनट ट्रेलर)',
          '90%+ ऑडियंस रेज़ोनेंस के लिए स्कोर और परिष्कृत स्क्रिप्ट',
          'फाइनल 4K से पहले इंटरैक्टिव स्टोरीबोर्ड ब्लूप्रिंट स्वीकृति',
        ],
        metricValue: '90%+',
        metricLabel: 'दर्शक रेज़ोनेंस स्कोर',
      },
      {
        id: 'character_aging',
        shortTab: '28-वर्षीय दादाजी व परिवार',
        badge: 'कैरेक्टर पहचान और उम्र इंजन',
        title: 'दादाजी का 28-वर्षीय रूप बनाएँ और पूरे परिवार की शक्ल लॉक रखें',
        summary:
          'क्या आपके पास दादाजी की केवल आज की फोटो है? हमारा कंटिन्यूटी इंजन जवानी के दृश्यों के लिए उनका प्रामाणिक 28-वर्षीय रूप तैयार करता है, रिश्तेदारों की शक्ल मिलाता है और पूरी फिल्म में चेहरे स्थिर रखता है।',
        exampleLabel: 'कंटिन्यूटी लॉक उदाहरण',
        exampleHeadline: '1 वर्तमान फोटो → 28 वर्ष · 52 वर्ष · आज (100% स्थिर पहचान)',
        exampleDetails:
          'एक ही चेहरा और आत्मीयता बचपन से आज तक बनी रहती है—कट के बीच चेहरा कभी नहीं बदलता।',
        highlights: [
          'साधारण फोन फोटो से प्रामाणिक उम्र-परिवर्तन और युवा रूप',
          'पीढ़ियों के बीच माता-पिता, बच्चों और रिश्तेदारों का सटीक मिलान',
          'ब्रांड व ट्रेनिंग फिल्मों में प्रस्तुतकर्ता की निरंतर पहचान',
        ],
        metricValue: '100%',
        metricLabel: 'स्थिर कैरेक्टर पहचान',
      },
      {
        id: 'location_matching',
        shortTab: 'लोकेशन मैचिंग',
        badge: 'असली वातावरण की सटीकता',
        title: 'सटीक लोकेशन मैचिंग — रियल एस्टेट, बचपन की गलियाँ और क्लिनिक',
        summary:
          'साधारण AI काल्पनिक कमरे बना देता है। SceneFlow असली स्थानों को लॉक करता है—हर कमरे का रियल एस्टेट मिलान, बचपन का मोहल्ला या आपका क्लिनिक और ऑफिस।',
        exampleLabel: 'लोकेशन लॉक उदाहरण',
        exampleHeadline: 'बचपन का आँगन · असली प्रॉपर्टी टूर · मुख्य क्लिनिक',
        exampleDetails:
          'असली फोटो अपलोड करें ताकि हर दृश्य आपके वास्तविक स्थान की वास्तुकला और एहसास को जीवंत रखे।',
        highlights: [
          'रियल एस्टेट 4K टूर के लिए हर कमरे की सटीक वास्तुकला',
          'बचपन के मोहल्ले, स्कूल और पैतृक शहर की प्रामाणिक झलक',
          'ब्रांड और ट्रेनिंग के लिए एकरूप ऑफिस और कार्यस्थल',
        ],
        metricValue: 'सटीक',
        metricLabel: 'स्थान व युग मिलान',
      },
      {
        id: 'heirloom_props',
        shortTab: 'यादगार वस्तुएँ व प्रॉप्स',
        badge: 'वस्तु कंटिन्यूटी लॉक',
        title: 'खास वस्तुओं को लॉक करें — पारिवारिक ग्रंथ/बाइबिल से ब्रांड गियर तक',
        summary:
          'असली कहानियाँ उन विवरणों में बसती हैं जिन्हें सब तुरंत पहचानते हैं—जैसे पुरानी पारिवारिक बाइबिल/ग्रंथ, दादाजी की घड़ी, गिटार या सुरक्षा उपकरण। हर दृश्य में वस्तुएँ हूबहू बनी रहती हैं।',
        exampleLabel: 'प्रॉप उदाहरण',
        exampleHeadline: 'पारिवारिक बाइबिल/ग्रंथ · पुरानी घड़ी · मुख्य उत्पाद',
        exampleDetails:
          'कंटिन्यूटी लाइब्रेरी में लॉक होने से कोई भी वस्तु दृश्य के बीच बिगड़ती या गायब नहीं होती।',
        highlights: [
          'पारिवारिक धरोहरें (बाइबिल/ग्रंथ, गहने, पत्र, पुरानी कार)',
          'व्यवसाय के उत्पाद, साइनबोर्ड और यूनिफ़ॉर्म लॉक',
          'ट्रेनिंग और SOP के लिए सटीक उपकरण और विज़ुअल एड्स',
        ],
        metricValue: 'ज़ीरो ड्रिफ्ट',
        metricLabel: 'वस्तु कंटिन्यूटी',
      },
      {
        id: 'voice_cloning',
        shortTab: 'वॉइस क्लोनिंग व मैच',
        badge: 'आवाज़ की पहचान',
        title: 'वॉइस क्लोनिंग, वॉइस-टू-इमेज मैचिंग और 10-सेकंड उच्चारण लॉक',
        summary:
          'यादगार फिल्म जितनी सुंदर दिखती है उतनी ही स्वाभाविक सुनाई देती है। वॉइस क्लोनिंग, किरदार के अनुसार आवाज़ और 10-सेकंड उच्चारण गाइड के साथ 70+ भाषाओं में बिल्कुल सटीक नाम और संवाद।',
        exampleLabel: 'ऑडियो उदाहरण',
        exampleHeadline: 'किरदार-मेल आवाज़ें + वॉइस क्लोनिंग + सटीक नाम उच्चारण',
        exampleDetails:
          'डायलॉग, स्टूडियो नैरेटर, साउंड इफेक्ट्स और संतुलित ऑर्केस्ट्रा संगीत का ब्रॉडकास्ट मिक्स।',
        highlights: [
          'ऑन-स्क्रीन उम्र व व्यक्तित्व के अनुसार वॉइस क्लोनिंग व मैचिंग',
          'उपनाम, शहर व तकनीकी शब्दों के लिए 10-सेकंड उच्चारण लॉक',
          'प्रोफेशनल स्टीरियो मास्टर: संवाद, वॉइस-ओवर, SFX व संगीत',
        ],
        metricValue: '70+ भाषाएँ',
        metricLabel: 'वॉइस और उच्चारण',
      },
      {
        id: 'directed_4k_master',
        shortTab: '4K बीट्स और मास्टर',
        badge: 'रियलिस्टिक व इलस्ट्रेटिव 4K',
        title: 'पेशेवर निर्देशित 4K बीट फ्रेम्स (रियलिस्टिक या इलस्ट्रेटिव) व मास्टर',
        summary:
          'फोटोरियलिस्टिक सिनेमा या कलात्मक इलस्ट्रेटिव शैली चुनें। हर बीट को डॉक्यूमेंट्री कैमरे की तरह निर्देशित कर स्मूद 4K मोशन (या पार्टनर स्टूडियो द्वारा फुल मोशन) के साथ 3840×2160 मास्टर में तैयार किया जाता है।',
        exampleLabel: 'फिनिशिंग उदाहरण',
        exampleHeadline: 'कला-निर्देशित 4K फ्रेम → 6-मूव कैमरा मोशन → ब्रॉडकास्ट मास्टर',
        exampleDetails:
          'शादी के प्रोजेक्टर, 75-इंच टीवी और वेबसाइट होमपेज के लिए बिल्कुल तैयार।',
        highlights: [
          'रियलिस्टिक सिनेमा या कहानी के अनुसार इलस्ट्रेटिव आर्ट स्टाइल',
          'ट्रू 4K (3840×2160) और स्मूद डॉक्यूमेंट्री कैमरा मूवमेंट',
          'कभी भी पार्टनर स्टूडियो के साथ फुल-मोशन में अपग्रेड संभव',
        ],
        metricValue: '4K UHD',
        metricLabel: 'थिएटर-रेडी मास्टर',
      },
    ],
    comparisonHeading: '$149 लॉन्ग-फॉर्म 4K सिनेमा बिल्कुल अलग स्तर क्यों है',
    comparisonSubtitle: 'साधारण शॉर्ट-फॉर्म AI क्लिप ऐप्स और SceneFlow लॉन्ग-फॉर्म प्रोडक्शन की तुलना करें।',
    colDimension: 'प्रोडक्शन मानक',
    colSlop: 'शॉर्ट-फॉर्म AI क्लिप ऐप्स ("AI स्लॉप")',
    colSceneFlow: 'SceneFlow लॉन्ग-फॉर्म 4K सिनेमा ($149)',
    comparisonRows: [
      {
        dimension: 'फॉर्मेट व अवधि',
        shortformSlop: 'बिना कहानी के 5–15 सेकंड के टुकड़े',
        sceneFlowLongform: '$149 में 60 मिनट तक (360 4K फ्रेम) + 1–3 मिनट ट्रेलर (150 मिनट तक विस्तार योग्य)',
      },
      {
        dimension: 'स्क्रिप्ट व जुड़ाव',
        shortformSlop: 'साधारण प्रॉम्प्ट और नीरस गति',
        sceneFlowLongform: '90%+ टारगेट ऑडियंस रेज़ोनेंस के लिए तराशी प्रोफेशनल स्क्रिप्ट',
      },
      {
        dimension: 'चेहरे व उम्र',
        shortformSlop: 'हर कुछ सेकंड में बदलते अजनबी चेहरे',
        sceneFlowLongform: 'लॉक्ड कैरेक्टर कंटिन्यूटी (28-वर्षीय दादाजी व रिश्तेदारों का मिलान)',
      },
      {
        dimension: 'स्थान व वस्तुएँ',
        shortformSlop: 'काल्पनिक कमरे और बिगड़ी हुई वस्तुएँ',
        sceneFlowLongform: 'सटीक लोकेशन (रियल एस्टेट, बचपन की गलियाँ) व प्रॉप्स (पारिवारिक बाइबिल)',
      },
      {
        dimension: 'आवाज़ व ऑडियो',
        shortformSlop: 'रोबोटिक आवाज़ और गलत उच्चारण',
        sceneFlowLongform: 'वॉइस क्लोनिंग, वॉइस-इमेज मैच, उच्चारण लॉक व ऑर्केस्ट्रा स्कोर',
      },
      {
        dimension: 'विज़ुअल व मास्टर',
        shortformSlop: 'झिलमिलाते आर्टिफैक्ट्स और "AI स्लॉप"',
        sceneFlowLongform: 'रियलिस्टिक या इलस्ट्रेटिव 4K बीट फ्रेम्स + थिएटर-रेडी मास्टर',
      },
    ],
    storefrontCtaLabel: '$29 लॉन्ग-फॉर्म ब्लूप्रिंट शुरू करें ($149 4K फिल्म में समायोजित)',
    studioPrimaryCtaLabel: 'अपना व्हाइट-लेबल लॉन्ग-फॉर्म स्टूडियो लॉन्च करें',
    studioSecondaryCtaLabel: 'लाइव $149 स्टोरफ्रंट देखें',
  },

  'zh-CN': {
    storefrontEyebrow: '长篇 4K 电影级制作 · 拒绝廉价 AI 拼接',
    studioEyebrow: '白标视频工作室的核心护城河',
    storefrontHeadingPrefix: '不是 5 秒短视频玩具，而是真正的 ',
    storefrontHeadingAccent: '$149 长篇 4K 电影工作室。',
    studioHeadingPrefix: '为什么客户愿付 $149–$950+，而不是用 ',
    studioHeadingAccent: '短平快 AI 视频生成器。',
    storefrontSubtitle:
      '市面上的短片 AI 工具只能生成 5 秒变脸片段和空洞画面。每一部 $149 作品都是经过专业导演编排的多章节长篇 4K 电影，脚本针对 90%+ 目标受众共鸣优化，让人物、年代、老宅、传家宝与品牌真正鲜活起来。',
    studioSubtitle:
      '短片 AI 生成器充斥着一次性“AI 垃圾片”。SceneFlow 为您的白标工作室提供真正的长篇 4K 电影引擎：90%+ 受众共鸣剧本、跨年代人物逆龄连续性、实景与道具锁定、声音克隆与声画匹配、以及广播级成片母带。',
    noSlopBadge: '拒绝 AI 垃圾片 · 真正长篇 4K 电影',
    trailerSpotlight: {
      badge: '标杆案例 · 长篇传记电影 + 专属预告片',
      headline: '将您的人生故事拍成院线级长篇电影 —— 套餐含专属电影预告片。',
      body: '庆典前先向亲友嘉宾发送 60 秒震撼院线级预告片预热期待，再在宴会大屏或客厅电视上首映完整 4K 长篇传记电影。',
      pill1: '内含 60 秒可分享院线级预告片',
      pill2: '完整长篇 4K 电影母带',
      pill3: '适配宴会大屏与家族世代珍藏',
    },
    pillarsHeading: '探索每部影片背后的 6 大电影级核心引擎',
    pillarsHint: '点击任意模块，查看 SceneFlow 如何彻底告别 AI 拼接感。',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: '90%+ 共鸣剧本',
        badge: '专业受众共鸣编剧',
        title: '专为 90%+ 目标受众共鸣打造的多幕专业剧本',
        summary:
          '绝不用一句话提示词凑数。每部影片都从专业多幕剧本出发，针对情感起伏、节奏与 90%+ 目标受众共鸣反复打磨——无论打动寿宴上的家人、转化高端房产买家，还是建立医疗品牌信任与企业培训留存。',
        exampleLabel: '导演蓝图示例',
        exampleHeadline: '第一幕开篇钩子 → 年代演进 → 情感高潮 → 传世尾声',
        exampleDetails:
          '在生成任何一帧画面前，每个节拍都会针对您的目标受众进行共鸣校准，彻底消除平淡流水账。',
        highlights: [
          '30–150 分钟院线级长篇叙事（$149 含最长 60 分钟 / 360 帧 + 1–3 分钟预告片）',
          '针对 90%+ 目标受众情感与转化共鸣深度优化',
          '最终 4K 渲染前支持交互式分镜蓝图审阅',
        ],
        metricValue: '90%+',
        metricLabel: '目标受众共鸣度',
      },
      {
        id: 'character_aging',
        shortTab: '28 岁祖父逆龄连续性',
        badge: '人物身份与跨年代引擎',
        title: '还原 28 岁的年轻祖父，跨年代锁定家人长相',
        summary:
          '只有爷爷 80 岁的近照？连续性参考引擎可真实还原他 28 岁时的青年形象用于年代回忆，精准匹配父母与子女的亲属特征，并让全片每个镜头的人物面孔高度一致。',
        exampleLabel: '人物连续性示例',
        exampleHeadline: '1 张近照 → 真实还原 28 岁 · 52 岁 · 当下',
        exampleDetails:
          '同一张脸与神韵贯穿数十年人生篇章，绝不出现镜头切换就“换脸变陌生人”的穿帮。',
        highlights: [
          '基于普通手机照片实现真实逆龄与跨年代年龄演变',
          '精准匹配配偶、子女与祖孙间的家族相貌关联',
          '品牌创始人与企业讲师全片形象严格锁定',
        ],
        metricValue: '100%',
        metricLabel: '人物面孔锁定',
      },
      {
        id: 'location_matching',
        shortTab: '实景与空间匹配',
        badge: '真实环境还原',
        title: '精准场景匹配 —— 高端房产、童年街巷与实体门店',
        summary:
          '普通 AI 只会编造毫无关联的房间。SceneFlow 将真实空间锁定进连续性库：逐间还原房源格局、重现童年老街或故乡院落，或忠实呈现您的诊所、工坊与办公环境。',
        exampleLabel: '场景锁定示例',
        exampleHeadline: '童年老宅门廊 · 真实房源格局 · 旗舰诊所实景',
        exampleDetails:
          '上传房源图、老街照片或门店参考，让每个机位都尊重真实的建筑结构与氛围。',
        highlights: [
          '4K 房产导览逐间还原真实建筑格局与采光',
          '真实再现童年街区、母校与家族故乡风貌',
          '商业诊所、酒店与培训车间环境全程统一',
        ],
        metricValue: '实景还原',
        metricLabel: '空间与年代精度',
      },
      {
        id: 'heirloom_props',
        shortTab: '传家宝与核心道具',
        badge: '道具连续性锁定',
        title: '锁定珍贵道具 —— 从家族圣经到品牌核心产品',
        summary:
          '真正打动人心的故事藏在细节里。无论是泛黄的家族圣经、爷爷的旧怀表、老吉他，还是企业的招牌产品与安全设备，道具连续性引擎让关键物件在全片中始终如一。',
        exampleLabel: '道具锁定示例',
        exampleHeadline: '家族圣经 · 传家腕表 · 品牌核心产品与设备',
        exampleDetails:
          '所有重要道具提前锚定在参考库中，绝不会在镜头中扭曲、消失或变成畸形 AI 伪影。',
        highlights: [
          '精准保留家族传家宝（家族圣经、首饰、手写信、老车）',
          '商业影片锁定品牌产品、招牌与统一工装',
          '企业培训准确呈现专业仪器与安全操作教具',
        ],
        metricValue: '零漂移',
        metricLabel: '道具一致性锁定',
      },
      {
        id: 'voice_cloning',
        shortTab: '声音克隆与声画匹配',
        badge: '声纹与母带混音',
        title: '声音克隆、声画角色匹配与 10 秒专有名词发音锁',
        summary:
          '好电影同样靠声音打动人心。SceneFlow 将声音克隆、角色年龄声画匹配与 10 秒发音指南结合，确保人名、地名与行业术语在 70+ 语言中自然温暖、发音零失误。',
        exampleLabel: '音频连续性示例',
        exampleHeadline: '角色声画精准匹配 + 声音克隆 + 人名零误读',
        exampleDetails:
          '屏幕人物与声线高度契合，搭配环境音效与智能闪避交响配乐，达到广播级听感。',
        highlights: [
          '支持声音克隆及与画面年龄、气质高度契合的角色配音',
          '10 秒发音指南精准锁定姓氏、地名与品牌专有名词',
          '广播级立体声混音：对白、棚录旁白、音效与交响配乐',
        ],
        metricValue: '70+ 语言',
        metricLabel: '声纹与发音锁定',
      },
      {
        id: 'directed_4k_master',
        shortTab: '导演级 4K 画面与母带',
        badge: '写实或绘本 4K 电影',
        title: '专业导演分镜（写实或插画风格）与影院级 4K 母带',
        summary:
          '可自由选择电影级写实画面或温情插画艺术风格。每个节拍均经专业构图与 6 种纪录片 4K 运镜编排（亦可通过合作工作室升级全动态），交付 3840×2160 影院级成片母带。',
        exampleLabel: '成片交付示例',
        exampleHeadline: '导演级 4K 分镜画面 → 电影感运镜编排 → 影院级立体声母带',
        exampleDetails:
          '告别模糊画质与生硬切换，可直接投屏宴会大屏、75 寸客厅电视或品牌官网首页。',
        highlights: [
          '按故事气质定制写实电影风或精装插画艺术风',
          '真 4K (3840×2160) 丝滑推拉摇移与鹤臂电影运镜',
          '随时可通过 SceneFlow 合作工作室升级全动态实拍级成片',
        ],
        metricValue: '4K 超清',
        metricLabel: '影院级母带交付',
      },
    ],
    comparisonHeading: '为什么 $149 长篇 4K 电影与短片 AI 完全不在一个维度',
    comparisonSubtitle: '直观对比市面上的一次性短片 AI 工具与 SceneFlow 长篇电影级制作。',
    colDimension: '制作标准',
    colSlop: '短片 AI 生成器（廉价“AI 垃圾片”）',
    colSceneFlow: 'SceneFlow 长篇 4K 电影 ($149)',
    comparisonRows: [
      {
        dimension: '片长与结构',
        shortformSlop: '5–15 秒碎片短片，毫无完整叙事弧线',
        sceneFlowLongform: '$149 含最长 60 分钟（360 帧 4K）+ 1–3 分钟预告片（可扩展至 150 分钟长片）',
      },
      {
        dimension: '剧本与共鸣',
        shortformSlop: '一句话平淡提示词，缺乏情绪张力',
        sceneFlowLongform: '专业多幕剧本，针对 90%+ 目标受众共鸣深度优化',
      },
      {
        dimension: '人物与年代',
        shortformSlop: '每 4 秒变脸成陌生人，严重出戏',
        sceneFlowLongform: '全片人物连续性锁定（如 28 岁祖父逆龄与亲属相貌匹配）',
      },
      {
        dimension: '场景与道具',
        shortformSlop: '胡乱编造的房间与畸形穿帮物件',
        sceneFlowLongform: '真实空间匹配（房产、童年老街）与传家道具锁定（如家族圣经）',
      },
      {
        dimension: '声音与混音',
        shortformSlop: '机械配音、读错人名、廉价循环配乐',
        sceneFlowLongform: '声音克隆、声画匹配、发音锁定、音效与交响配乐混音',
      },
      {
        dimension: '视觉与母带',
        shortformSlop: '闪烁伪影与肉眼可见的廉价 AI 感',
        sceneFlowLongform: '专业导演写实或插画 4K 分镜画面 + 影院级成片母带',
      },
    ],
    storefrontCtaLabel: '开启 $29 长篇分镜蓝图（全额抵扣 $149 4K 电影）',
    studioPrimaryCtaLabel: '启动您的白标长篇电影工作室',
    studioSecondaryCtaLabel: '体验实时 $149 样板门店',
  },

  ar: {
    storefrontEyebrow: 'سينما 4K طويلة · بدون أي "محتوى AI رديء"',
    studioEyebrow: 'الميزة التنافسية الساحقة لاستوديو علامتك التجارية',
    storefrontHeadingPrefix: 'ليس تطبيق مقاطع 5 ثوانٍ. بل ',
    storefrontHeadingAccent: 'استوديو أفلام 4K طويلة بـ $149.',
    studioHeadingPrefix: 'لماذا يدفع العملاء $149–$950+ بدلاً من استخدام ',
    studioHeadingAccent: 'مولدات المقاطع القصيرة.',
    storefrontSubtitle:
      'أدوات المقاطع القصيرة تنتج لقطات من 5 ثوانٍ بوجوه متغيرة ونصوص جوفاء. كل فيلم بقيمة $149 هو عمل سينمائي طويل متعدد الفصول بدقة 4K مُعد لتحقيق 90%+ من التفاعل العاطفي مع الجمهور—يحيي الأشخاص والعقارات والتاريخ العائلي بواقعية مذهلة.',
    studioSubtitle:
      'أدوات الفيديو القصير تغرق الإنترنت بمحتوى رديء. يمنحك SceneFlow استوديو سينما 4K طويل: نصوص بتأثير 90%+، استمرارية شخصيات عبر العقود، مطابقة المواقع والمقتنيات، استنساخ الصوت وماستر احترافي.',
    noSlopBadge: 'بلا محتوى عشوائي · سينما 4K طويلة',
    trailerSpotlight: {
      badge: 'مثال مميز · فيلم طويل + إعلان تشويقي مشمول',
      headline: 'حوّل قصة حياتك إلى فيلم سينمائي طويل — الباقة تشمل إعلاناً تشويقياً (Trailer).',
      body: 'أرسل إعلاناً سينمائياً مدته 60 ثانية للعائلة والضيوف قبل المناسبة لإثارة الحماس—ثم اعرض الفيلم الطويل الكامل بدقة 4K على الشاشة الكبيرة.',
      pill1: 'إعلان تشويقي 60 ثانية قابل للمشاركة',
      pill2: 'ماستر فيلم سينمائي طويل بدقة 4K',
      pill3: 'جاهز للشاشات العملاقة وذكريات العائلة',
    },
    pillarsHeading: 'اكتشف أنظمة الاستوديو الستة داخل كل فيلم',
    pillarsHint: 'اختر أي ميزة لترى كيف يخرج SceneFlow قصصاً حقيقية بمستوى سينمائي.',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: 'نصوص بتأثير 90%+',
        badge: 'كتابة سيناريو احترافية',
        title: 'نصوص احترافية مصممة لتحقيق 90%+ من الصدى لدى جمهورك المستهدف',
        summary:
          'لا نعتمد على وصف سطري عابر. يبدأ كل فيلم بسيناريو احترافي متعدد الفصول مضبوط الإيقاع والمشاعر لتحقيق 90%+ من التفاعل لدى العائلة أو مشتري العقارات الفاخرة أو عملاء العيادات أو الموظفين.',
        exampleLabel: 'مثال مخطط الإخراج',
        exampleHeadline: 'افتتاحية جاذبة ← تطور المراحل ← ذروة عاطفية ← ختام خالد',
        exampleDetails:
          'يُختبر كل مشهد وفق جمهورك قبل إنتاج أي لقطة، لضمان سرد مشوق يخلو من الحشو.',
        highlights: [
          'فيلم سينمائي طويل 30–150 دقيقة (حتى 60 دقيقة / 360 إطاراً بـ $149 + إعلان 1–3 دقائق)',
          'سيناريو مصقول لتحقيق 90%+ من الصدى العاطفي والإقناعي',
          'مراجعة واعتماد مخطط Storyboard Blueprint قبل الإنتاج النهائي',
        ],
        metricValue: '+90%',
        metricLabel: 'صدى الجمهور المستهدف',
      },
      {
        id: 'character_aging',
        shortTab: 'الجد بعمر 28 والأقارب',
        badge: 'محرك هوية الشخصيات',
        title: 'إنشاء نسخة الجد بعمر 28 عاماً ومطابقة ملامح الأقارب عبر العقود',
        summary:
          'هل لديك صورة حديثة فقط للجد في الثمانين؟ ينشئ محرك الاستمرارية نسخته الأصيلة في عمر 28 لمشاهد الشباب، ويطابق الشبه العائلي بين الأجيال، ويثبّت ملامح كل شخصية طوال الفيلم.',
        exampleLabel: 'مثال الاستمرارية',
        exampleHeadline: 'صورة حديثة واحدة ← عمر 28 عاماً · عمر 52 · اليوم',
        exampleDetails:
          'نفس الملامح والدفء يرافقان القصة عبر العقود دون تحوّل الوجوه إلى غرباء بين اللقطات.',
        highlights: [
          'تصغير وتكبير عمري أصيل انطلاقاً من صور الهاتف العادية',
          'توافق ملامح العائلة بين الأجداد والآباء والأبناء',
          'ثبات تام لهوية المؤسس والمقدم في أفلام الأعمال والتدريب',
        ],
        metricValue: '100%',
        metricLabel: 'ثبات هوية الشخصية',
      },
      {
        id: 'location_matching',
        shortTab: 'مطابقة المواقع',
        badge: 'دقة الأماكن الحقيقية',
        title: 'مطابقة دقيقة للمواقع — العقارات، حي الطفولة والعيادات',
        summary:
          'الذكاء العشوائي يخترع غرفاً خيالية. يثبّت SceneFlow مواقعك الحقيقية: غرف العقار المعروض، حي الطفولة أو البلدة الأم، أو مقر شركتك وعيادتك بدقة معمارية عالية.',
        exampleLabel: 'مثال الموقع',
        exampleHeadline: 'شارع الطفولة · غرف العقار الحقيقية · العيادة الرئيسية',
        exampleDetails:
          'ارفع صور العقار أو الأماكن العزيزة ليحافظ كل مشهد على الطابع المعماري الحقيقي.',
        highlights: [
          'دقة معمارية غرفة بغرفة لجولات العقارات بدقة 4K',
          'إحياء أحياء الطفولة والمدارس والبلدات العائلية بأمانة',
          'بيئات عمل وعيادات متسقة للأفلام التجارية والتدريبية',
        ],
        metricValue: 'دقيق',
        metricLabel: 'أمانة المكان والعصر',
      },
      {
        id: 'heirloom_props',
        shortTab: 'المقتنيات والرموز',
        badge: 'استمرارية الأغراض الخاصة',
        title: 'تثبيت المقتنيات العزيزة — من كتاب العائلة الموروث إلى منتجات علامتك',
        summary:
          'روح القصة في التفاصيل التي يتعرف عليها الجميع فوراً—مثل كتاب العائلة المقدس الموروث، ساعة الجد، أو منتجات ومعدات شركتك—بحيث تبقى ثابتة بدقة من أول مشهد حتى النهاية.',
        exampleLabel: 'مثال المقتنيات',
        exampleHeadline: 'كتاب العائلة الموروث · ساعة أثرية · معدات العلامة التجارية',
        exampleDetails:
          'بتثبيتها في مكتبة الاستمرارية قبل التصيير، لا تتشوه الأغراض ولا تختفي فجأة.',
        highlights: [
          'حفظ المقتنيات العائلية العزيزة والرسائل والتذكارات',
          'تثبيت المنتجات التجارية واللافتات والزي الرسمي للشركة',
          'دقة تامة للمعدات والأدوات في أفلام السلامة والتدريب',
        ],
        metricValue: 'ثبات تام',
        metricLabel: 'استمرارية المقتنيات',
      },
      {
        id: 'voice_cloning',
        shortTab: 'استنساخ ومطابقة الصوت',
        badge: 'الهوية الصوتية',
        title: 'استنساخ الصوت، مطابقة الصوت بالصورة ودليل نطق 10 ثوانٍ',
        summary:
          'الفيلم الخالد يُسمع بنفس صدق صورته. يجمع SceneFlow بين استنساخ الصوت ومطابقة نبرة كل شخصية مع صورتها ودليل نطق للأسماء والمدن بأكثر من 70 لغة.',
        exampleLabel: 'مثال الصوت',
        exampleHeadline: 'أصوات مطابقة للشخصيات + استنساخ دافئ + نطق سليم للأسماء',
        exampleDetails:
          'مزج صوتي احترافي يوازن الحوار والسرد والمؤثرات والموسيقى الأوركسترالية بسلاسة.',
        highlights: [
          'استنساخ الصوت ومطابقته لعمر وشخصية الظاهر على الشاشة',
          'دليل نطق 10 ثوانٍ لأسماء العائلات والمدن والمصطلحات',
          'ماستر صوتي ستيريو: حوار، سرد استوديو، مؤثرات وموسيقى',
        ],
        metricValue: '+70 لغة',
        metricLabel: 'الصوت والنطق',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'إخراج 4K وماستر نهائي',
        badge: 'واقعي أو فني بدقة 4K',
        title: 'لقطات 4K مُخرجة باحتراف (واقعية أو فنية) وماستر جاهز للعرض',
        summary:
          'اختر الأسلوب السينمائي الواقعي أو الفني المرسوم. كل لقطة مؤطرة بعناية وتتحرك بانسيابية سينمائية بدقة 4K (أو بحركة كاملة عبر الشركاء) وتُسلّم كملف 3840×2160 جاهز للشاشات العملاقة.',
        exampleLabel: 'مثال الإخراج النهائي',
        exampleHeadline: 'إطارات 4K مُخرجة ← حركة كاميرا سينمائية ← ماستر احترافي',
        exampleDetails:
          'جاهز للعرض في قاعات الاحتفال وشاشات التلفاز الكبيرة والصفحات الرئيسية للشركات.',
        highlights: [
          'إخراج واقعي سينمائي أو أسلوب فني مرسوم حسب طابع قصتك',
          'دقة 4K حقيقية (3840×2160) بحركات كاميرا وثائقية سلسة',
          'قابلية الترقية للحركة الكاملة عبر استوديوهات SceneFlow الشريكة',
        ],
        metricValue: '4K UHD',
        metricLabel: 'ماستر جاهز للشاشة',
      },
    ],
    comparisonHeading: 'لماذا سينما 4K الطويلة بـ $149 عالم مختلف تماماً',
    comparisonSubtitle: 'قارن مولدات المقاطع القصيرة العشوائية بإنتاج SceneFlow السينمائي الطويل.',
    colDimension: 'معيار الإنتاج',
    colSlop: 'مولدات المقاطع القصيرة ("AI Slop")',
    colSceneFlow: 'سينما SceneFlow الطويلة 4K ($149)',
    comparisonRows: [
      {
        dimension: 'المدة والشكل',
        shortformSlop: 'مقاطع منفصلة 5–15 ثانية بلا قصة',
        sceneFlowLongform: 'حتى 60 دقيقة (360 إطاراً بدقة 4K) بـ $149 + إعلان 1–3 دقائق (قابل للتوسيع حتى 150 دقيقة)',
      },
      {
        dimension: 'السيناريو والتأثير',
        shortformSlop: 'نص عابر سطحي وبلا إيقاع عاطفي',
        sceneFlowLongform: 'سيناريو احترافي متعدد الفصول بصدى 90%+ لدى الجمهور',
      },
      {
        dimension: 'الأشخاص والأعمار',
        shortformSlop: 'وجوه تتغير إلى غرباء كل بضع ثوانٍ',
        sceneFlowLongform: 'استمرارية ثابتة (مثل الجد بعمر 28 عاماً ومطابقة الأقارب)',
      },
      {
        dimension: 'المواقع والمقتنيات',
        shortformSlop: 'غرف خيالية وأغراض مشوهة',
        sceneFlowLongform: 'مطابقة دقيقة للمواقع (عقارات، حي الطفولة) والمقتنيات العائلية',
      },
      {
        dimension: 'الأصوات والمزج',
        shortformSlop: 'أصوات آلية ونطق خاطئ للأسماء',
        sceneFlowLongform: 'استنساخ صوتي، مطابقة صوت-صورة، مؤثرات وموسيقى متوازنة',
      },
      {
        dimension: 'الإخراج والماستر',
        shortformSlop: 'تشوهات بصرية ومحتوى رديء',
        sceneFlowLongform: 'إطارات 4K واقعية أو فنية مُخرجة + ماستر جاهز للعرض',
      },
    ],
    storefrontCtaLabel: 'ابدأ مخطط الفيلم الطويل بـ $29 (يُخصم من $149)',
    studioPrimaryCtaLabel: 'أطلق استوديو الأفلام الطويلة بعلامتك التجارية',
    studioSecondaryCtaLabel: 'استعرض المتجر المباشر بـ $149',
  },

  th: {
    storefrontEyebrow: 'ภาพยนตร์ 4K แบบยาว · ไม่ใช่งาน AI ไร้คุณภาพ',
    studioEyebrow: 'ข้อได้เปรียบที่คู่แข่งเลียนแบบไม่ได้ของสตูดิโอไวท์เลเบลคุณ',
    storefrontHeadingPrefix: 'ไม่ใช่แอปสร้างคลิปสั้น 5 วินาที แต่คือ ',
    storefrontHeadingAccent: 'สตูดิโอภาพยนตร์ 4K แบบยาวเพียง $149',
    studioHeadingPrefix: 'ทำไมลูกค้ายอมจ่าย $149–$950+ แทนที่จะใช้ ',
    studioHeadingAccent: 'แอปสร้างคลิปสั้น AI ทั่วไป',
    storefrontSubtitle:
      'แอปคลิปสั้นทั่วไปสร้างได้แค่คลิป 5 วินาทีที่หน้าเปลี่ยนไปมาและไร้เนื้อหา ภาพยนตร์ $149 ทุกเรื่องคือภาพยนตร์ 4K แบบยาวหลายบทที่กำกับอย่างมืออาชีพ ปรับแต่งบทให้โดนใจกลุ่มเป้าหมายกว่า 90%+ ทำให้เรื่องราว บ้าน ของรัก และธุรกิจของคุณมีชีวิตจริง',
    studioSubtitle:
      'แอปคลิปสั้นเต็มไปด้วย “AI Slop” ที่ดูแล้วลืม SceneFlow มอบขุมพลังภาพยนตร์ 4K แบบยาวให้ธุรกิจไวท์เลเบลของคุณ: บทโดนใจ 90%+ ความต่อเนื่องตัวละครข้ามวัย สถานที่และของสำคัญตรงจริง โคลนเสียงตรงตัวละคร และไฟล์มาสเตอร์ระดับออกอากาศ',
    noSlopBadge: 'ไร้ AI SLOP · ภาพยนตร์ 4K แบบยาว',
    trailerSpotlight: {
      badge: 'ตัวอย่างเรือธง · ภาพยนตร์เรื่องยาว + ตัวอย่างหนังในแพ็กเกจ',
      headline: 'เปลี่ยนเรื่องราวชีวิตของคุณเป็นภาพยนตร์เรื่องยาวระดับโรง — รวมทีเซอร์ตัวอย่างหนังในแพ็กเกจ',
      body: 'ส่งตัวอย่างภาพยนตร์ 60 วินาทีสุดตื่นตาให้ครอบครัวและแขกก่อนวันงาน—แล้วฉายรอบปฐมทัศน์ภาพยนตร์ 4K เรื่องยาวเต็มเรื่องบนจอใหญ่',
      pill1: 'รวมตัวอย่างภาพยนตร์ 60 วินาทีสำหรับแชร์',
      pill2: 'ไฟล์มาสเตอร์ภาพยนตร์ 4K เรื่องยาวเต็มรูปแบบ',
      pill3: 'พร้อมฉายจอใหญ่และเก็บเป็นสมบัติครอบครัว',
    },
    pillarsHeading: 'สำรวจ 6 ระบบงานสตูดิโอเบื้องหลังภาพยนตร์ทุกเรื่อง',
    pillarsHint: 'เลือกแต่ละหัวข้อเพื่อดูว่า SceneFlow กำกับเรื่องราวจริงโดยปราศจากงาน AI หยาบๆ อย่างไร',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: 'บทโดนใจผู้ชม 90%+',
        badge: 'การเขียนบทระดับมืออาชีพ',
        title: 'บทภาพยนตร์มืออาชีพที่ปรับแต่งให้โดนใจกลุ่มเป้าหมายกว่า 90%+',
        summary:
          'เราไม่โยนคำสั่งสั้นๆ ให้ AI เดาเอง ทุกเรื่องเริ่มจากบทหลายองก์ที่วางจังหวะอารมณ์และพลังโน้มน้าวให้เข้าถึงกลุ่มเป้าหมายกว่า 90%+ ไม่ว่าจะซาบซึ้งในงานวันเกิด ขายอสังหาฯ หรู สร้างความเชื่อมั่นคลินิก หรือฝึกอบรมพนักงาน',
        exampleLabel: 'ตัวอย่างโครงสร้างบท',
        exampleHeadline: 'เปิดเรื่องดึงดูด → ไล่เรียงช่วงวัย → จุดพีคอารมณ์ → บทสรุปประทับใจ',
        exampleDetails:
          'ทุกบีตผ่านการประเมินตามกลุ่มผู้ชมเป้าหมายก่อนเรนเดอร์ ตัดความน่าเบื่อและน้ำออกทั้งหมด',
        highlights: [
          'ภาพยนตร์เรื่องยาว 30–150 นาที ($149 รวมสูงสุด 60 นาที / 360 เฟรม + ตัวอย่าง 1–3 นาที)',
          'คัดเกลาบทเพื่อความประทับใจและการมีส่วนร่วมของกลุ่มเป้าหมาย 90%+',
          'ตรวจสอบและอนุมัติ Storyboard Blueprint ก่อนผลิต 4K จริง',
        ],
        metricValue: '90%+',
        metricLabel: 'ความโดนใจกลุ่มเป้าหมาย',
      },
      {
        id: 'character_aging',
        shortTab: 'คุณปู่วัย 28 & ครอบครัว',
        badge: 'ระบบความต่อเนื่องตัวละคร',
        title: 'สร้างภาพคุณปู่วัย 28 ปี และคงเค้าโครงหน้าญาติพี่น้องข้ามยุคสมัย',
        summary:
          'มีแค่รูปปัจจุบันของคุณปู่วัย 80? ระบบ Continuity Reference สามารถสร้างตัวตนวัย 28 ปีของท่านอย่างสมจริงสำหรับฉากย้อนยุค เชื่อมเค้าโครงหน้าคนในครอบครัว และล็อกใบหน้าเดิมตลอดทั้งเรื่อง',
        exampleLabel: 'ตัวอย่างความต่อเนื่อง',
        exampleHeadline: 'รูปปัจจุบัน 1 ใบ → วัย 28 ปี · วัย 52 ปี · ปัจจุบัน',
        exampleDetails:
          'โครงหน้าและแววตาเดิมถ่ายทอดต่อเนื่องข้ามทศวรรษ ไม่มีปัญหาหน้าเปลี่ยนเป็นคนแปลกหน้าระหว่างคัต',
        highlights: [
          'ปรับช่วงวัยย้อนยุคและเติบโตอย่างเป็นธรรมชาติจากภาพมือถือ',
          'เชื่อมโยงเค้าโครงหน้าพ่อแม่ ลูกหลาน และคู่ชีวิตอย่างกลมกลืน',
          'ล็อกตัวตนผู้ก่อตั้งและวิทยากรคงที่ตลอดวิดีโอธุรกิจและฝึกอบรม',
        ],
        metricValue: '100%',
        metricLabel: 'ล็อกอัตลักษณ์ตัวละคร',
      },
      {
        id: 'location_matching',
        shortTab: 'สถานที่ตรงของจริง',
        badge: 'ความแม่นยำของสถานที่',
        title: 'จำลองสถานที่ตรงจริง — บ้านอสังหาฯ ย่านวัยเด็ก และคลินิกของคุณ',
        summary:
          'AI ทั่วไปสุ่มสร้างห้องที่ไม่ตรงความจริง SceneFlow ล็อกสถานที่จริงของคุณ ทั้งห้องต่างๆ ในบ้านอสังหาฯ ย่านวัยเด็ก หรือคลินิกและสำนักงานจริงของคุณ',
        exampleLabel: 'ตัวอย่างสถานที่',
        exampleHeadline: 'บ้านวัยเด็ก · ทัวร์อสังหาฯ ตรงทุกห้อง · คลินิกหลักของคุณ',
        exampleDetails:
          'อัปโหลดภาพอ้างอิงสถานที่จริงเพื่อให้ทุกมุมกล้องเคารพสถาปัตยกรรมและบรรยากาศดั้งเดิม',
        highlights: [
          'ทัวร์อสังหาฯ 4K ตรงสถาปัตยกรรมจริงทีละห้อง',
          'จำลองละแวกบ้านวัยเด็ก โรงเรียน และบ้านเกิดอย่างสมจริง',
          'คุมโทนสำนักงาน คลินิก โรงแรม และพื้นที่ฝึกอบรมอย่างแม่นยำ',
        ],
        metricValue: 'ตรงจริง',
        metricLabel: 'ความแม่นยำสถานที่',
      },
      {
        id: 'heirloom_props',
        shortTab: 'ของสำคัญ & อุปกรณ์',
        badge: 'ความต่อเนื่องวัตถุสำคัญ',
        title: 'ล็อกของรักประจำบ้าน — ตั้งแต่พระคัมภีร์ครอบครัวถึงอุปกรณ์แบรนด์',
        summary:
          'ความประทับใจอยู่ในรายละเอียดที่ทุกคนจำได้ทันที เราล็อกของสำคัญ เช่น พระคัมภีร์ประจำครอบครัว นาฬิกาเรือนเก่า กีตาร์ หรือสินค้าและอุปกรณ์ความปลอดภัย ให้คงเดิมทุกฉาก',
        exampleLabel: 'ตัวอย่างพร็อพ',
        exampleHeadline: 'พระคัมภีร์ครอบครัว · นาฬิกามรดก · สินค้าและอุปกรณ์หลัก',
        exampleDetails:
          'ผูกไว้ในคลังความต่อเนื่องก่อนเรนเดอร์ วัตถุจึงไม่บิดเบี้ยวหรือหายไประหว่างฉาก',
        highlights: [
          'รักษาของรักประจำตระกูล (พระคัมภีร์ จดหมาย เครื่องประดับ รถเก่า)',
          'ล็อกสินค้า ป้ายแบรนด์ และชุดยูนิฟอร์มในวิดีโอธุรกิจ',
          'อุปกรณ์และเครื่องมือแม่นยำสำหรับวิดีโอฝึกอบรมและ SOP',
        ],
        metricValue: 'แม่นยำ',
        metricLabel: 'ล็อกวัตถุสำคัญ',
      },
      {
        id: 'voice_cloning',
        shortTab: 'โคลนเสียง & ตรงตัวละคร',
        badge: 'อัตลักษณ์เสียงระดับสตูดิโอ',
        title: 'โคลนเสียง จับคู่เสียงตรงภาพตัวละคร และล็อกการออกเสียง 10 วินาที',
        summary:
          'ภาพยนตร์ที่น่าจดจำต้องมีเสียงที่สมจริงพอๆ กับภาพ ผสานการโคลนเสียง การจับคู่โทนเสียงตามวัยของตัวละคร และคู่มือออกเสียงชื่อเฉพาะใน 70+ ภาษา',
        exampleLabel: 'ตัวอย่างเสียง',
        exampleHeadline: 'เสียงตรงวัยตัวละคร + โคลนเสียงอบอุ่น + อ่านชื่อถูกต้อง 100%',
        exampleDetails:
          'มิกซ์เสียงสเตอริโอระดับออกอากาศทั้งบทสนทนา เสียงบรรยาย เอฟเฟกต์ และดนตรีประกอบ',
        highlights: [
          'โคลนเสียงและจับคู่น้ำเสียงตรงกับตัวละครบนหน้าจอ',
          'คู่มือออกเสียง 10 วินาทีสำหรับนามสกุล ชื่อเมือง และศัพท์เฉพาะ',
          'มาสเตอร์เสียงสเตอริโอ: บทสนทนา เสียงบรรยาย SFX และดนตรี',
        ],
        metricValue: '70+ ภาษา',
        metricLabel: 'เสียงและการออกเสียง',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'บีต 4K & มาสเตอร์',
        badge: 'สมจริงหรือภาพวาด 4K',
        title: 'กำกับเฟรมบีต 4K มืออาชีพ (สมจริงหรือภาพวาด) พร้อมมาสเตอร์ฉายจอใหญ่',
        summary:
          'เลือกสไตล์ภาพยนตร์สมจริงหรือภาพวาดสุดประณีต ทุกเฟรมกำกับองค์ประกอบและเคลื่อนกล้อง 4K อย่างนุ่มนวล (หรืออัปเกรดฟูลโมชันผ่านพาร์ตเนอร์) ส่งมอบไฟล์มาสเตอร์ 3840×2160',
        exampleLabel: 'ตัวอย่างงานมาสเตอร์',
        exampleHeadline: 'เฟรม 4K กำกับศิลป์ → การเคลื่อนกล้องสารคดี → มาสเตอร์จอใหญ่',
        exampleDetails:
          'พร้อมฉายขึ้นโปรเจกเตอร์งานเลี้ยง ทีวี 75 นิ้ว หรือหน้าแรกเว็บไซต์ธุรกิจของคุณ',
        highlights: [
          'เลือกได้ทั้งภาพยนตร์สมจริงหรือสไตล์ภาพวาดประณีตตามอารมณ์เรื่อง',
          '4K UHD แท้ (3840×2160) พร้อมการเคลื่อนกล้องสารคดี 6 รูปแบบ',
          'อัปเกรดเป็นฟูลโมชันได้ทุกเมื่อผ่านสตูดิโอพาร์ตเนอร์ของ SceneFlow',
        ],
        metricValue: '4K UHD',
        metricLabel: 'มาสเตอร์ระดับโรงภาพยนตร์',
      },
    ],
    comparisonHeading: 'ทำไมภาพยนตร์ 4K แบบยาว $149 จึงอยู่คนละระดับ',
    comparisonSubtitle: 'เปรียบเทียบแอปสร้างคลิปสั้น AI ทั่วไปกับการผลิตภาพยนตร์แบบยาวของ SceneFlow',
    colDimension: 'มาตรฐานการผลิต',
    colSlop: 'แอปสร้างคลิปสั้น AI ทั่วไป ("AI Slop")',
    colSceneFlow: 'SceneFlow ภาพยนตร์ 4K แบบยาว ($149)',
    comparisonRows: [
      {
        dimension: 'รูปแบบและความยาว',
        shortformSlop: 'คลิปสั้น 5–15 วินาทีขาดตอน ไร้โครงเรื่อง',
        sceneFlowLongform: 'สูงสุด 60 นาที (360 เฟรม 4K) เพียง $149 + ตัวอย่าง 1–3 นาที (ขยายได้ถึง 150 นาที)',
      },
      {
        dimension: 'บทและความประทับใจ',
        shortformSlop: 'ข้อความสั้นๆ แห้งแล้ง ไร้พลังอารมณ์',
        sceneFlowLongform: 'บทมืออาชีพหลายองก์ ปรับแต่งให้โดนใจกลุ่มเป้าหมาย 90%+',
      },
      {
        dimension: 'ใบหน้าและช่วงวัย',
        shortformSlop: 'หน้าเปลี่ยนเป็นคนอื่นทุกไม่กี่วินาที',
        sceneFlowLongform: 'ล็อกตัวละครข้ามยุค (เช่น คุณปู่วัย 28 ปี และหน้าญาติพี่น้อง)',
      },
      {
        dimension: 'สถานที่และของสำคัญ',
        shortformSlop: 'ห้องสุ่มหลุดโลกและวัตถุบิดเบี้ยว',
        sceneFlowLongform: 'สถานที่จริง (บ้านอสังหาฯ ย่านวัยเด็ก) และของรัก (พระคัมภีร์ครอบครัว)',
      },
      {
        dimension: 'เสียงและการมิกซ์',
        shortformSlop: 'เสียงหุ่นยนต์ อ่านชื่อผิด เพลงวนซ้ำ',
        sceneFlowLongform: 'โคลนเสียง เสียงตรงตัวละคร ล็อกการออกเสียง พร้อม SFX และดนตรี',
      },
      {
        dimension: 'งานภาพและมาสเตอร์',
        shortformSlop: 'ภาพสั่นเพี้ยน ดูออกทันทีว่าเป็น AI หยาบๆ',
        sceneFlowLongform: 'เฟรม 4K สมจริงหรือภาพวาดที่กำกับอย่างประณีต + มาสเตอร์พร้อมฉาย',
      },
    ],
    storefrontCtaLabel: 'เริ่ม Blueprint หนังยาว $29 (หักลดจาก $149 เต็มจำนวน)',
    studioPrimaryCtaLabel: 'เปิดตัวสตูดิโอหนังยาวไวท์เลเบลของคุณ',
    studioSecondaryCtaLabel: 'ชมหน้าร้านจริงราคา $149',
  },
}
