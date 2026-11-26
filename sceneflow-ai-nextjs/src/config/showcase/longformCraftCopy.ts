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

export type ImmediateLiftCardId =
  | 'multi_perspective_audio'
  | 'qr_print_companion'
  | 'living_continuity_vault'

export interface ImmediateLiftCardCopy {
  id: ImmediateLiftCardId
  badge: string
  title: string
  subtitle: string
  description: string
  liftHighlight: string
  /** Optional access requirement badge (e.g., Continuity Library Code for returning vault updates). */
  accessNote?: string
}

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
  immediateLift: {
    eyebrow: string
    heading: string
    subtitle: string
    cards: readonly [ImmediateLiftCardCopy, ImmediateLiftCardCopy, ImmediateLiftCardCopy]
  }
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
      badge: '1-Hour+ Feature Film OR Multi-Episode Series + 1–3 Min Trailer',
      headline: 'Tell a 1-Hour+ Life Story as a Feature Film or Bingeable Episode Series — With Authentic Chapter Reenactments.',
      body: 'Most defining life chapters were never filmed—and short-form AI clip generators collapse past 15 seconds. SceneFlow recreates every era with locked people, locations, culture, and historical context (up to 60 min / 360 directed 4K frames included at $149; expandable to 150 min or 6–8 episodes), plus a shareable 1–3 min theatrical trailer.',
      pill1: 'Single 1-Hour+ Feature OR Multi-Episode Series',
      pill2: 'Unfilmed Chapters Recreated With Era & Cultural Context',
      pill3: '1–3 Min Shareable Theatrical Trailer + Expandable to 150 Min',
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
        shortTab: 'Active Scenes & Cultural Staging',
        badge: 'Continuity-Locked Staging',
        title: 'Continuity-Locked Active Scenes & Cultural Staging',
        summary:
          "Missing photos from the biggest chapters? Using your Continuity Vault, SceneFlow stages lively family gatherings, regional traditions, era-accurate homes, and virtual interior/furniture updates—keeping your real faces, attire, and signature heirlooms unmistakably locked.",
        exampleLabel: 'Active Staging & Environment Lock',
        exampleHeadline: 'Unphotographed Moments, Staged With Cultural Authenticity',
        exampleDetails:
          'Stage lively multigenerational dinners, 4-chapter "Before & After" luxury remodels and horizon-locked pre-construction estate walkthroughs, founding-era clinic care scenes, or regional workplace compliance drills—all locked to your real cast and architecture.',
        highlights: [
          'Stages unphotographed family gatherings, regional traditions & era-accurate homes',
          '"Before & After" 4-chapter luxury remodels & horizon/coastline-locked Pre-Construction land visualization',
          'Localized workplace safety, equipment & patient/client care scenes with zero face drift',
        ],
        metricValue: 'Active Staging',
        metricLabel: 'Cultural & Room Lock',
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
        shortTab: 'Voice Cloning & Multi-Track',
        badge: 'Multi-Perspective Audio & 70+ Langs',
        title: 'Voice Cloning, Multi-Perspective Audio Tracks & 10-Second Pronunciation Lock',
        summary:
          'An unforgettable film sounds as real as it looks. SceneFlow pairs voice cloning, voice-to-image matching, and a 10-second pronunciation lock with Multi-Perspective Audio Tracks—flipping the exact same 4K visual master seamlessly between English, Japanese, and Spanish, or between first-person memoir and third-person documentary.',
        exampleLabel: 'Multi-Perspective Audio Example',
        exampleHeadline: '1 Locked 4K Visual Reel → 70+ Languages & Multiple Narrative Perspectives',
        exampleDetails:
          'Virtually zero extra video compute: keep every visual frame locked while delivering native pronunciation for family names, hometowns, and technical acronyms across 70+ languages.',
        highlights: [
          'Multi-Perspective Audio Tracks: flip languages or 1st/3rd-person voices on the same 4K reel',
          'Voice cloning & age/persona-matched voices with 10-second phonetic pronunciation lock',
          'Broadcast stereo mix: dialogue, Studio Narrator VO, ambient SFX & ducked orchestral score',
        ],
        metricValue: '70+ Langs',
        metricLabel: 'Multi-Track Voice Lock',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'Era & Cultural Time-Capsule',
        badge: 'Period & Regional World-Building',
        title: 'Localized Era & Cultural Time-Capsule Engine',
        summary:
          "We don't just read back your notes—our story engine weaves in the authentic music, economic milestones, cultural touchstones, and everyday atmosphere of the exact decade, city, and country your story took place, turning private memories into a lasting historical documentary.",
        exampleLabel: 'Cultural Time-Capsule Example',
        exampleHeadline: 'Period & Regional Context That Brings History Alive',
        exampleDetails:
          'Every directed 4K frame (3840×2160) pairs authentic decade music, regional economic & cultural context, and smooth 6-move camera choreography into a theater-ready historical master.',
        highlights: [
          'Automatic decade & regional cultural, musical, and economic context woven into the script',
          'Photorealistic cinema OR heirloom illustrative 4K UHD (3840×2160) master choreography',
          'Operate in 14 native UI portals while producing culturally localized 4K masters in 70+ languages',
        ],
        metricValue: 'Era-True 4K',
        metricLabel: 'Cultural Time-Capsule',
      },
    ],
    immediateLift: {
      eyebrow: 'Immediate Lift · Consumers & White-Label Operators',
      heading: 'Three Built-In Growth Engines Beyond Video Editing',
      subtitle:
        'Deliver live multilingual demos, tangible print artifacts, and effortless recurring chapter or SOP updates—powered automatically from the same locked Continuity Vault.',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: 'Near-Zero Extra Compute',
          title: 'Multi-Perspective Audio Tracks',
          subtitle: 'Same 4K Visuals · Multiple Voices & Languages',
          description:
            'Showcase Voice Cloning and Script Intelligence instantly: flip one single 4K visual reel live between English, Japanese, and Spanish—or switch between first-person memoir and third-person documentary—right on a family preview or client sales call.',
          liftHighlight: 'Virtually zero extra video compute per added language or narrator perspective',
        },
        {
          id: 'qr_print_companion',
          badge: '100% Automated Artifact',
          title: 'QR-Linked Print Companion PDF',
          subtitle: 'Keepsake Book · Property Sheet · SOP Poster',
          description:
            'Turn every digital 4K master into a tangible physical companion for open houses, milestone birthday dinners, or factory floors—automatically formatted with frame stills, chapter summaries, and scannable QR video links.',
          liftHighlight: 'Gives realtors, hosts & training leads a physical keepsake that justifies premium pricing',
        },
        {
          id: 'living_continuity_vault',
          badge: 'Recurring Revenue Engine',
          title: 'Living Continuity Vault',
          subtitle: 'Incremental Chapter, Property & SOP Updates',
          description:
            'Because cast faces, voices, and environments remain permanently locked, operators can sell annual family chapter extensions or quarterly SOP and property updates at high margins with near-zero rework.',
          liftHighlight: 'Add new milestones or compliance revisions in minutes with zero continuity drift',
          accessNote: 'Returning updates unlock via a private Continuity Library Code (no full account password)',
        },
      ],
    },
    comparisonHeading: 'Why $149 Longform 4K Cinema Is a Different Universe',
    comparisonSubtitle:
      'Compare disposable shortform AI clip generators against a true SceneFlow longform production.',
    colDimension: 'Production Standard',
    colSlop: 'Shortform AI Clip Generators ("AI Slop")',
    colSceneFlow: 'SceneFlow Longform 4K Cinema ($149)',
    comparisonRows: [
      {
        dimension: 'Format, Runtime & Series',
        shortformSlop: '5–15 sec disconnected clips; unsustainable for 1-hour+ or episodic storytelling',
        sceneFlowLongform: '1-hour+ Feature Film OR Multi-Episode Series (up to 60 min / 360 4K frames at $149; expandable to 150 min) + 1–3 min trailer',
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
      badge: 'Largometraje de +1 Hora O Serie de Varios Episodios + Tráiler de 1–3 Min',
      headline: 'Cuenta una Historia de Vida de +1 Hora como Largometraje o Serie por Episodios — Con Recreaciones Auténticas de Cada Capítulo.',
      body: 'Los capítulos más decisivos de la vida nunca se filmaron—y los generadores de clips cortos con IA se desmoronan pasados 15 segundos. SceneFlow recrea cada época con personas, lugares, cultura y contexto histórico fijados (hasta 60 min / 360 cuadros 4K dirigidos incluidos por $149; ampliable a 150 min o 6–8 episodios), además de un tráiler cinematográfico de 1–3 min listo para compartir.',
      pill1: 'Largometraje Único de +1 Hora O Serie Multiepisodio',
      pill2: 'Capítulos No Filmados Recreados con Época y Contexto Cultural',
      pill3: 'Tráiler Compartible de 1–3 Min + Ampliable a 150 Min',
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
        shortTab: 'Escenas Activas y Cultura',
        badge: 'Escenografía con Continuidad Fija',
        title: 'Escenas Activas y Escenografía Cultural con Continuidad Fija',
        summary:
          '¿Faltan fotos de los capítulos más importantes? Usando tu Continuity Vault, SceneFlow escenifica reuniones familiares llenas de vida, tradiciones regionales, hogares fieles a cada época y renovaciones virtuales de interiores y mobiliario—manteniendo intactos tus rostros reales, vestuario y reliquias.',
        exampleLabel: 'Escenografía Activa y Bloqueo Ambiental',
        exampleHeadline: 'Momentos Sin Fotografiar, Escenificados con Autenticidad Cultural',
        exampleDetails:
          'Escenifica cenas multigeneracionales animadas, remodelaciones de lujo "Antes y Después" en 4 capítulos y recorridos de preventa en terreno con horizonte fijado, escenas fundacionales de clínicas o simulacros regionales de cumplimiento laboral—todo fijado a tu elenco y arquitectura reales.',
        highlights: [
          'Escenifica reuniones familiares sin fotografiar, tradiciones regionales y hogares de época',
          'Remodelaciones de lujo "Antes y Después" en 4 capítulos y visualización de terrenos en preventa con horizonte y costa fijados',
          'Escenas localizadas de seguridad laboral, equipos y atención al paciente/cliente sin deriva facial',
        ],
        metricValue: 'Escena Activa',
        metricLabel: 'Bloqueo Cultural y Espacial',
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
        shortTab: 'Clonación y Multipista',
        badge: 'Audio Multiperspectiva y 70+ Idiomas',
        title: 'Clonación de Voz, Pistas de Audio Multiperspectiva y Bloqueo de Pronunciación en 10s',
        summary:
          'Un filme inolvidable suena tan real como se ve. SceneFlow combina clonación de voz, emparejamiento voz-imagen y bloqueo fonético de 10 segundos con Pistas de Audio Multiperspectiva—cambiando el mismo máster visual 4K sin cortes entre inglés, japonés y español, o entre memoria en primera persona y documental en tercera persona.',
        exampleLabel: 'Ejemplo de Audio Multiperspectiva',
        exampleHeadline: '1 Rollo Visual 4K Fijo → 70+ Idiomas y Múltiples Perspectivas Narrativas',
        exampleDetails:
          'Prácticamente cero cómputo extra de video: mantén cada cuadro visual intacto mientras entregas pronunciación nativa para apellidos, ciudades y siglas técnicas en más de 70 idiomas.',
        highlights: [
          'Pistas de Audio Multiperspectiva: cambia idiomas o voces de 1.ª/3.ª persona sobre el mismo rollo 4K',
          'Clonación de voz y voces acordes a edad/personaje con bloqueo fonético de 10 segundos',
          'Mezcla estéreo broadcast: diálogo, narrador de estudio, SFX ambientales y música orquestal',
        ],
        metricValue: '70+ Idiomas',
        metricLabel: 'Voz Multipista Fija',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'Cápsula Cultural y de Época',
        badge: 'Ambientación Histórica y Regional',
        title: 'Motor Localizado de Época y Cápsula Cultural del Tiempo',
        summary:
          'No solo leemos tus notas: nuestro motor narrativo entreteje la música auténtica, los hitos económicos, los referentes culturales y la atmósfera cotidiana de la década, ciudad y país exactos de tu historia, convirtiendo recuerdos privados en un documental histórico perdurable.',
        exampleLabel: 'Ejemplo de Cápsula Cultural',
        exampleHeadline: 'Contexto Histórico y Regional Que Da Vida a la Historia',
        exampleDetails:
          'Cada cuadro 4K dirigido (3840×2160) combina música auténtica de la década, contexto económico y cultural regional y coreografía fluida de 6 movimientos de cámara en un máster histórico listo para pantalla grande.',
        highlights: [
          'Contexto cultural, musical y económico de época y región tejido automáticamente en el guion',
          'Cine fotorrealista O ilustración artística 4K UHD (3840×2160) con coreografía de cámara',
          'Opera en 14 portales nativos mientras produces másteres 4K localizados en 70+ idiomas',
        ],
        metricValue: '4K de Época',
        metricLabel: 'Cápsula Cultural',
      },
    ],
    immediateLift: {
      eyebrow: 'Impulso Inmediato · Clientes y Operadores Marca Blanca',
      heading: 'Tres Motores de Crecimiento Integrados Más Allá de la Edición de Video',
      subtitle:
        'Entrega demostraciones multilingües en vivo, piezas impresas tangibles y actualizaciones recurrentes de capítulos o SOP sin esfuerzo—todo impulsado automáticamente desde el mismo Continuity Vault bloqueado.',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: 'Casi Cero Cómputo Extra',
          title: 'Pistas de Audio Multiperspectiva',
          subtitle: 'Mismo Visual 4K · Múltiples Voces e Idiomas',
          description:
            'Demuestra la Clonación de Voz y la Inteligencia de Guion al instante: cambia en vivo un mismo rollo visual 4K entre inglés, japonés y español—o alterna entre memoria en primera persona y documental en tercera persona—en plena presentación familiar o llamada de ventas.',
          liftHighlight: 'Prácticamente cero cómputo extra de video por cada idioma o perspectiva añadida',
        },
        {
          id: 'qr_print_companion',
          badge: 'Pieza 100% Automatizada',
          title: 'PDF Impreso Complementario con QR',
          subtitle: 'Libro Recuerdo · Ficha Inmobiliaria · Póster SOP',
          description:
            'Convierte cada máster digital 4K en un complemento físico tangible para jornadas de puertas abiertas, cenas de aniversario o plantas industriales—maquetado automáticamente con fotogramas, resúmenes por capítulo y códigos QR escaneables.',
          liftHighlight: 'Entrega a agentes, anfitriones y líderes de capacitación un recuerdo físico que justifica tarifas premium',
        },
        {
          id: 'living_continuity_vault',
          badge: 'Motor de Ingresos Recurrentes',
          title: 'Continuity Vault Vivo',
          subtitle: 'Actualizaciones Incrementales de Capítulos, Inmuebles y SOP',
          description:
            'Como los rostros, voces y entornos del elenco quedan bloqueados permanentemente, los operadores pueden vender extensiones anuales de capítulos familiares o actualizaciones trimestrales de SOP e inmuebles con altos márgenes y casi cero retrabajo.',
          liftHighlight: 'Añade nuevos hitos o revisiones de cumplimiento en minutos sin deriva de continuidad',
          accessNote: 'Las actualizaciones se desbloquean mediante un Código Privado de Biblioteca de Continuidad (sin contraseña completa de cuenta)',
        },
      ],
    },
    comparisonHeading: 'Por Qué el Cine 4K Largo de $149 Está en Otra Liga',
    comparisonSubtitle: 'Compara los generadores cortos de IA contra una producción larga de SceneFlow.',
    colDimension: 'Estándar de Producción',
    colSlop: 'Generadores Cortos ("AI Slop")',
    colSceneFlow: 'SceneFlow Cine 4K Largo ($149)',
    comparisonRows: [
      {
        dimension: 'Formato, Duración y Series',
        shortformSlop: 'Clips sueltos de 5–15 seg; insostenibles para historias de +1 hora o seriadas',
        sceneFlowLongform: 'Largometraje de +1 hora O Serie de Varios Episodios (hasta 60 min / 360 cuadros 4K por $149; ampliable a 150 min) + tráiler de 1–3 min',
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
      badge: 'Longa-Metragem de +1 Hora OU Série em Episódios + Trailer de 1–3 Min',
      headline: 'Conte uma História de Vida de +1 Hora como Longa-Metragem ou Série Maratonável — Com Reconstituições Autênticas de Cada Capítulo.',
      body: 'Os capítulos mais marcantes da vida nunca foram filmados—e geradores de clipes curtos de IA desmoronam depois de 15 segundos. O SceneFlow recria cada época com pessoas, cenários, cultura e contexto histórico travados (até 60 min / 360 quadros 4K dirigidos inclusos por $149; expansível para 150 min ou 6–8 episódios), além de um trailer cinematográfico de 1–3 min pronto para compartilhar.',
      pill1: 'Longa-Metragem Único de +1 Hora OU Série em Episódios',
      pill2: 'Capítulos Não Filmados Recriados com Época e Contexto Cultural',
      pill3: 'Trailer Compartilhável de 1–3 Min + Expansível até 150 Min',
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
        shortTab: 'Cenas Ativas e Cultura',
        badge: 'Encenação com Continuidade Travada',
        title: 'Cenas Ativas e Encenação Cultural com Continuidade Travada',
        summary:
          'Faltam fotos dos capítulos mais marcantes? Usando seu Continuity Vault, o SceneFlow encena encontros familiares animados, tradições regionais, lares fiéis à época e atualizações virtuais de interiores e mobiliário—mantendo rostos reais, trajes e relíquias inconfundivelmente travados.',
        exampleLabel: 'Encenação Ativa e Trava Ambiental',
        exampleHeadline: 'Momentos Não Fotografados, Encenados com Autenticidade Cultural',
        exampleDetails:
          'Encene jantares multigeracionais vibrantes, reformas de luxo "Antes e Depois" em 4 capítulos e tours de pré-construção com horizonte travado, cenas fundacionais de clínicas ou simulações regionais de conformidade—tudo travado ao seu elenco e arquitetura reais.',
        highlights: [
          'Encena encontros familiares sem fotos, tradições regionais e lares fiéis à época',
          'Reformas de luxo "Antes e Depois" em 4 capítulos e visualização de terrenos em pré-construção com horizonte e costa travados',
          'Cenas localizadas de segurança no trabalho, equipamentos e atendimento sem desvio facial',
        ],
        metricValue: 'Cena Ativa',
        metricLabel: 'Trava Cultural e Espacial',
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
        shortTab: 'Clonagem e Multipista',
        badge: 'Áudio Multiperspectiva e 70+ Idiomas',
        title: 'Clonagem de Voz, Faixas de Áudio Multiperspectiva e Trava de Pronúncia em 10s',
        summary:
          'Um filme inesquecível soa tão verdadeiro quanto parece. O SceneFlow combina clonagem de voz, harmonia voz-imagem e trava fonética de 10 segundos com Faixas de Áudio Multiperspectiva—alternando o mesmo master visual 4K sem cortes entre inglês, japonês e espanhol, ou entre memórias em 1.ª pessoa e documentário em 3.ª pessoa.',
        exampleLabel: 'Exemplo de Áudio Multiperspectiva',
        exampleHeadline: '1 Rolo Visual 4K Travado → 70+ Idiomas e Múltiplas Perspectivas Narrativas',
        exampleDetails:
          'Praticamente zero computação extra de vídeo: mantenha cada quadro visual intacto enquanto entrega pronúncia nativa para sobrenomes, cidades e siglas técnicas em mais de 70 idiomas.',
        highlights: [
          'Faixas de Áudio Multiperspectiva: alterne idiomas ou vozes em 1.ª/3.ª pessoa no mesmo rolo 4K',
          'Clonagem de voz e timbres fiéis à idade/persona com trava fonética de 10 segundos',
          'Mixagem estéreo broadcast: diálogos, narrador de estúdio, SFX ambientes e trilha orquestral',
        ],
        metricValue: '70+ Idiomas',
        metricLabel: 'Trava Vocal Multipista',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'Cápsula Cultural e de Época',
        badge: 'Ambientação Histórica e Regional',
        title: 'Motor Localizado de Época e Cápsula Cultural do Tempo',
        summary:
          'Não apenas lemos suas anotações: nosso motor narrativo tece a música autêntica, os marcos econômicos, as referências culturais e a atmosfera cotidiana da década, cidade e país exatos da sua história—transformando memórias privadas em um documentário histórico duradouro.',
        exampleLabel: 'Exemplo de Cápsula Cultural',
        exampleHeadline: 'Contexto Histórico e Regional Que Dá Vida à História',
        exampleDetails:
          'Cada quadro 4K dirigido (3840×2160) combina música autêntica da década, contexto econômico e cultural regional e coreografia suave de 6 movimentos de câmera em um master histórico pronto para telão.',
        highlights: [
          'Contexto cultural, musical e econômico da década e região integrado automaticamente ao roteiro',
          'Cinema fotorrealista OU direção ilustrada 4K UHD (3840×2160) com coreografia de câmera',
          'Opere em 14 portais nativos enquanto produz masters 4K localizados em 70+ idiomas',
        ],
        metricValue: '4K de Época',
        metricLabel: 'Cápsula Cultural',
      },
    ],
    immediateLift: {
      eyebrow: 'Ganho Imediato · Consumidores e Operadores White-Label',
      heading: 'Três Motores de Crescimento Integrados Além da Edição de Vídeo',
      subtitle:
        'Entregue demonstrações multilíngues ao vivo, materiais impressos tangíveis e atualizações recorrentes de capítulos ou SOPs sem esforço—tudo alimentado automaticamente pelo mesmo Continuity Vault travado.',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: 'Custo de Vídeo Quase Zero',
          title: 'Faixas de Áudio Multiperspectiva',
          subtitle: 'Mesmo Visual 4K · Múltiplas Vozes e Idiomas',
          description:
            'Mostre a Clonagem de Voz e a Inteligência de Roteiro na hora: alterne ao vivo um único rolo visual 4K entre inglês, japonês e espanhol—ou troque entre memórias em 1.ª pessoa e documentário em 3.ª pessoa—em uma prévia familiar ou reunião comercial.',
          liftHighlight: 'Praticamente zero computação extra de vídeo por idioma ou perspectiva adicionada',
        },
        {
          id: 'qr_print_companion',
          badge: 'Peça 100% Automatizada',
          title: 'PDF Impresso Complementar com QR',
          subtitle: 'Livro Recordação · Ficha de Imóvel · Pôster SOP',
          description:
            'Transforme cada master digital 4K em um material físico tangível para visitas abertas, jantares comemorativos ou chão de fábrica—diagramado automaticamente com quadros do filme, resumos por capítulo e links QR escaneáveis.',
          liftHighlight: 'Entrega a corretores, anfitriões e líderes de treinamento uma lembrança física que justifica preços premium',
        },
        {
          id: 'living_continuity_vault',
          badge: 'Motor de Receita Recorrente',
          title: 'Continuity Vault Vivo',
          subtitle: 'Atualizações Incrementais de Capítulos, Imóveis e SOPs',
          description:
            'Como rostos, vozes e ambientes do elenco permanecem travados permanentemente, operadores podem vender extensões anuais de capítulos familiares ou atualizações trimestrais de SOPs e imóveis com alta margem e retrabalho quase zero.',
          liftHighlight: 'Adicione novos marcos ou revisões de conformidade em minutos sem desvio de continuidade',
          accessNote: 'Atualizações futuras são desbloqueadas via Código Privado da Biblioteca de Continuidade (sem senha completa da conta)',
        },
      ],
    },
    comparisonHeading: 'Por Que o Cinema 4K Longo de $149 Está em Outro Patamar',
    comparisonSubtitle: 'Compare geradores curtos descartáveis com uma produção longa SceneFlow.',
    colDimension: 'Padrão de Produção',
    colSlop: 'Geradores Curtos ("AI Slop")',
    colSceneFlow: 'SceneFlow Cinema 4K Longo ($149)',
    comparisonRows: [
      {
        dimension: 'Formato, Duração e Séries',
        shortformSlop: 'Clipes desconexos de 5–15 seg; insustentáveis para narrativas de +1 hora ou seriadas',
        sceneFlowLongform: 'Longa-metragem de +1 hora OU Série em Episódios (até 60 min / 360 quadros 4K por $149; expansível a 150 min) + trailer de 1–3 min',
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
      badge: '1+ घंटे की फीचर फिल्म या मल्टी-एपिसोड सीरीज़ + 1–3 मिनट का ट्रेलर',
      headline: 'अपनी 1+ घंटे की जीवन कहानी को फीचर फिल्म या बिंज-वॉच एपिसोड सीरीज़ के रूप में सुनाएँ — प्रामाणिक अध्याय पुनर्रचना के साथ।',
      body: 'जीवन के सबसे निर्णायक अध्याय कभी फिल्माए ही नहीं गए—और शॉर्ट-फॉर्म AI क्लिप जेनरेटर 15 सेकंड के बाद बिखर जाते हैं। SceneFlow हर दौर को लॉक्ड चेहरों, लोकेशन, संस्कृति और ऐतिहासिक संदर्भ के साथ फिर से रचता है ($149 में 60 मिनट / 360 निर्देशित 4K फ्रेम शामिल; 150 मिनट या 6–8 एपिसोड तक विस्तार योग्य), साथ ही शेयर करने योग्य 1–3 मिनट का थिएट्रिकल ट्रेलर भी।',
      pill1: 'सिंगल 1+ घंटे की फीचर फिल्म या मल्टी-एपिसोड सीरीज़',
      pill2: 'अनफिल्माए अध्याय दौर और सांस्कृतिक संदर्भ के साथ पुनर्रचित',
      pill3: '1–3 मिनट का शेयर करने योग्य ट्रेलर + 150 मिनट तक विस्तार योग्य',
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
        shortTab: 'जीवंत दृश्य व सांस्कृतिक स्टेजिंग',
        badge: 'कंटिन्यूटी-लॉक्ड स्टेजिंग',
        title: 'कंटिन्यूटी-लॉक्ड जीवंत दृश्य और सांस्कृतिक स्टेजिंग',
        summary:
          'क्या सबसे खास अध्यायों की तस्वीरें नहीं हैं? आपके Continuity Vault का उपयोग करके SceneFlow जीवंत पारिवारिक समारोह, क्षेत्रीय परंपराएँ, युग-सटीक घर और वर्चुअल इंटीरियर/फ़र्नीचर अपडेट तैयार करता है—आपके असली चेहरे, परिधान और पारिवारिक धरोहरों को पूरी तरह लॉक रखते हुए।',
        exampleLabel: 'जीवंत स्टेजिंग और वातावरण लॉक',
        exampleHeadline: 'बिना तस्वीरों वाले पल, सांस्कृतिक प्रामाणिकता के साथ मंचित',
        exampleDetails:
          'पीढ़ियों के जीवंत पारिवारिक भोज, 4-अध्याय "पहले और बाद में" लग्ज़री रीमॉडल और क्षितिज-लॉक्ड प्री-कंस्ट्रक्शन एस्टेट वॉकथ्रू, क्लिनिक के शुरुआती सेवा दृश्य या क्षेत्रीय कार्यस्थल सुरक्षा अभ्यास तैयार करें—सब आपके असली पात्रों और वास्तुकला पर लॉक।',
        highlights: [
          'बिना फोटो वाले पारिवारिक समारोह, क्षेत्रीय परंपराएँ और युग-सटीक घर मंचित करता है',
          '"पहले और बाद में" 4-अध्याय लग्ज़री रीमॉडल व क्षितिज/तटरेखा-लॉक्ड प्री-कंस्ट्रक्शन भूमि विज़ुअलाइज़ेशन',
          'बिना चेहरा बदले स्थानीय कार्यस्थल सुरक्षा, उपकरण व मरीज़/ग्राहक देखभाल दृश्य',
        ],
        metricValue: 'सक्रिय स्टेजिंग',
        metricLabel: 'संस्कृति व स्थान लॉक',
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
        shortTab: 'वॉइस क्लोनिंग व मल्टी-ट्रैक',
        badge: 'मल्टी-पर्सपेक्टिव ऑडियो व 70+ भाषाएँ',
        title: 'वॉइस क्लोनिंग, मल्टी-पर्सपेक्टिव ऑडियो ट्रैक्स और 10-सेकंड उच्चारण लॉक',
        summary:
          'यादगार फिल्म जितनी सुंदर दिखती है उतनी ही स्वाभाविक सुनाई देती है। SceneFlow वॉइस क्लोनिंग, किरदार-मेल आवाज़ और 10-सेकंड उच्चारण लॉक को मल्टी-पर्सपेक्टिव ऑडियो ट्रैक्स के साथ जोड़ता है—एक ही 4K विज़ुअल मास्टर को अंग्रेज़ी, जापानी और स्पैनिश में, या प्रथम-पुरुष संस्मरण व तृतीय-पुरुष डॉक्यूमेंट्री के बीच सहजता से बदलते हुए।',
        exampleLabel: 'मल्टी-पर्सपेक्टिव ऑडियो उदाहरण',
        exampleHeadline: '1 लॉक्ड 4K विज़ुअल रील → 70+ भाषाएँ और विविध कथा दृष्टिकोण',
        exampleDetails:
          'लगभग शून्य अतिरिक्त वीडियो कंप्यूट: हर विज़ुअल फ्रेम को लॉक रखते हुए 70+ भाषाओं में उपनाम, गृहनगर और तकनीकी शब्दों का सटीक मूल उच्चारण दें।',
        highlights: [
          'मल्टी-पर्सपेक्टिव ऑडियो ट्रैक्स: एक ही 4K रील पर भाषाएँ या 1st/3rd-पर्सन आवाज़ें बदलें',
          '10-सेकंड फ़ोनेटिक उच्चारण लॉक के साथ वॉइस क्लोनिंग व उम्र/किरदार-मेल आवाज़ें',
          'ब्रॉडकास्ट स्टीरियो मिक्स: संवाद, स्टूडियो नैरेटर VO, परिवेशी SFX और संतुलित ऑर्केस्ट्रा स्कोर',
        ],
        metricValue: '70+ भाषाएँ',
        metricLabel: 'मल्टी-ट्रैक वॉइस लॉक',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'युग व सांस्कृतिक टाइम-कैप्सूल',
        badge: 'कालखंड व क्षेत्रीय विश्व-निर्माण',
        title: 'स्थानीयकृत युग और सांस्कृतिक टाइम-कैप्सूल इंजन',
        summary:
          'हम केवल आपके नोट्स नहीं पढ़ते—हमारा स्टोरी इंजन उस सटीक दशक, शहर और देश के प्रामाणिक संगीत, आर्थिक मील के पत्थर, सांस्कृतिक संदर्भ और रोज़मर्रा के माहौल को कहानी में बुनता है, जिससे निजी यादें एक स्थायी ऐतिहासिक डॉक्यूमेंट्री बन जाती हैं।',
        exampleLabel: 'सांस्कृतिक टाइम-कैप्सूल उदाहरण',
        exampleHeadline: 'कालखंड और क्षेत्रीय संदर्भ जो इतिहास को जीवंत बना दे',
        exampleDetails:
          'हर निर्देशित 4K फ्रेम (3840×2160) प्रामाणिक दशक संगीत, क्षेत्रीय आर्थिक व सांस्कृतिक संदर्भ और स्मूद 6-मूव कैमरा कोरियोग्राफी को थिएटर-रेडी ऐतिहासिक मास्टर में जोड़ता है।',
        highlights: [
          'स्क्रिप्ट में स्वचालित रूप से बुना गया दशक व क्षेत्रीय सांस्कृतिक, संगीतमय और आर्थिक संदर्भ',
          'फोटोरियलिस्टिक सिनेमा या कलात्मक इलस्ट्रेटिव 4K UHD (3840×2160) मास्टर कोरियोग्राफी',
          '14 मूल UI पोर्टल में कार्य करें और 70+ भाषाओं में सांस्कृतिक रूप से स्थानीयकृत 4K मास्टर बनाएँ',
        ],
        metricValue: 'युग-सटीक 4K',
        metricLabel: 'सांस्कृतिक टाइम-कैप्सूल',
      },
    ],
    immediateLift: {
      eyebrow: 'तत्काल बढ़त · उपभोक्ता व व्हाइट-लेबल ऑपरेटर',
      heading: 'वीडियो एडिटिंग से आगे तीन अंतर्निर्मित ग्रोथ इंजन',
      subtitle:
        'लाइव बहुभाषी डेमो, ठोस प्रिंट स्मृति-पुस्तिकाएँ और आसान आवर्ती अध्याय या SOP अपडेट दें—सब एक ही लॉक्ड Continuity Vault से स्वचालित रूप से संचालित।',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: 'लगभग शून्य अतिरिक्त कंप्यूट',
          title: 'मल्टी-पर्सपेक्टिव ऑडियो ट्रैक्स',
          subtitle: 'वही 4K विज़ुअल्स · अनेक आवाज़ें और भाषाएँ',
          description:
            'वॉइस क्लोनिंग और स्क्रिप्ट इंटेलिजेंस को तुरंत दिखाएँ: पारिवारिक प्रीव्यू या क्लाइंट सेल्स कॉल पर एक ही 4K विज़ुअल रील को लाइव अंग्रेज़ी, जापानी और स्पैनिश—या प्रथम-पुरुष संस्मरण और तृतीय-पुरुष डॉक्यूमेंट्री—के बीच बदलें।',
          liftHighlight: 'प्रत्येक नई भाषा या नैरेटर दृष्टिकोण के लिए लगभग शून्य अतिरिक्त वीडियो कंप्यूट',
        },
        {
          id: 'qr_print_companion',
          badge: '100% स्वचालित प्रिंट कृति',
          title: 'QR-लिंक्ड प्रिंट कम्पेनियन PDF',
          subtitle: 'स्मृति पुस्तिका · प्रॉपर्टी शीट · SOP पोस्टर',
          description:
            'हर डिजिटल 4K मास्टर को ओपन हाउस, माइलस्टोन जन्मदिन भोज या फ़ैक्टरी फ़्लोर के लिए एक ठोस भौतिक साथी में बदलें—फ्रेम स्टिल्स, अध्याय सारांश और स्कैन करने योग्य QR वीडियो लिंक के साथ स्वतः फ़ॉर्मेट किया हुआ।',
          liftHighlight: 'रियलटर्स, मेज़बानों और ट्रेनिंग लीड्स को ऐसा भौतिक स्मृतिचिह्न देता है जो प्रीमियम मूल्य को सही ठहराता है',
        },
        {
          id: 'living_continuity_vault',
          badge: 'आवर्ती राजस्व इंजन',
          title: 'लिविंग Continuity Vault',
          subtitle: 'क्रमिक अध्याय, प्रॉपर्टी और SOP अपडेट',
          description:
            'क्योंकि पात्रों के चेहरे, आवाज़ें और परिवेश स्थायी रूप से लॉक रहते हैं, ऑपरेटर लगभग शून्य दोबारा मेहनत के साथ उच्च मार्जिन पर वार्षिक पारिवारिक अध्याय विस्तार या त्रैमासिक SOP और प्रॉपर्टी अपडेट बेच सकते हैं।',
          liftHighlight: 'बिना किसी कंटिन्यूटी ड्रिफ्ट के मिनटों में नए मील के पत्थर या अनुपालन संशोधन जोड़ें',
          accessNote: 'बाद के अपडेट एक निजी Continuity Library Code से अनलॉक होते हैं (पूरे अकाउंट पासवर्ड की आवश्यकता नहीं)',
        },
      ],
    },
    comparisonHeading: '$149 लॉन्ग-फॉर्म 4K सिनेमा बिल्कुल अलग स्तर क्यों है',
    comparisonSubtitle: 'साधारण शॉर्ट-फॉर्म AI क्लिप ऐप्स और SceneFlow लॉन्ग-फॉर्म प्रोडक्शन की तुलना करें।',
    colDimension: 'प्रोडक्शन मानक',
    colSlop: 'शॉर्ट-फॉर्म AI क्लिप ऐप्स ("AI स्लॉप")',
    colSceneFlow: 'SceneFlow लॉन्ग-फॉर्म 4K सिनेमा ($149)',
    comparisonRows: [
      {
        dimension: 'फॉर्मेट, अवधि व सीरीज़',
        shortformSlop: '5–15 सेकंड के बिखरे क्लिप; 1+ घंटे या एपिसोडिक कहानी के लिए अव्यावहारिक',
        sceneFlowLongform: '1+ घंटे की फीचर फिल्म या मल्टी-एपिसोड सीरीज़ ($149 में 60 मिनट / 360 4K फ्रेम; 150 मिनट तक विस्तार योग्य) + 1–3 मिनट ट्रेलर',
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
      badge: '1小时+ 院线长片 或 多集连续剧 + 1–3 分钟预告片',
      headline: '将 1 小时以上的人生故事拍成长篇电影或追更剧集 —— 真实还原每个历史篇章。',
      body: '人生最关键的篇章往往从未被镜头记录，而短视频 AI 工具超过 15 秒就会崩坏。SceneFlow 以锁定的人物、场景、文化与时代背景真实重现每个年代（$149 内含最长 60 分钟 / 360 帧导演级 4K 画面；可扩展至 150 分钟或 6–8 集剧集），并附赠 1–3 分钟可分享院线级预告片。',
      pill1: '单部 1 小时+ 长片 或 多集连续剧',
      pill2: '结合时代与文化背景，重现未曾拍摄的篇章',
      pill3: '1–3 分钟可分享预告片 + 可扩展至 150 分钟',
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
        shortTab: '实景演绎与文化布景',
        badge: '连续性锁定布景',
        title: '连续性锁定的实景演绎与文化布景',
        summary:
          '最重要的人生篇章缺少照片？依托您的 Continuity Vault，SceneFlow 可真实演绎热闹的家族团聚、地域风俗、年代感老宅以及虚拟室内/家具焕新——始终牢牢锁定真实面孔、服饰与标志性传家宝。',
        exampleLabel: '动态布景与环境锁定',
        exampleHeadline: '未曾留影的珍贵瞬间，以真实文化底蕴生动再现',
        exampleDetails:
          '演绎多代同堂的热闹家宴、四章节“改造前后”豪宅翻新与锁定地平线的预建庄园漫游、诊所创立年代的问诊实景，或本土化的职场安全合规演练——全部严格锚定真实人物与建筑空间。',
        highlights: [
          '生动演绎缺少照片的家族聚会、地方传统与符合年代风貌的居家场景',
          '四章节“改造前后”豪宅翻新与锁定地平线/海岸线的预建土地可视化演绎',
          '本土化职场安全、专业设备与医患/客户服务场景，人物面孔零漂移',
        ],
        metricValue: '实景演绎',
        metricLabel: '文化与空间锁定',
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
        shortTab: '声音克隆与多音轨',
        badge: '多视角音轨与 70+ 语言',
        title: '声音克隆、多视角音轨与 10 秒专有名词发音锁',
        summary:
          '好电影的声音与画面同样真实动人。SceneFlow 将声音克隆、声画角色匹配、10 秒发音锁定与多视角音轨融为一体——同一份 4K 视觉母带可在英语、日语、西班牙语之间无缝切换，或在第一人称回忆录与第三人称纪录片视角之间自由转换。',
        exampleLabel: '多视角音轨示例',
        exampleHeadline: '1 份锁定 4K 视觉母带 → 70+ 语言与多叙事视角自由切换',
        exampleDetails:
          '几乎零额外视频算力成本：保持每一帧画面完全锁定，同时在 70+ 语言中以原生发音精准呈现姓氏、故乡地名与专业缩写。',
        highlights: [
          '多视角音轨：在同一条 4K 画面母带上即时切换语言或第一/第三人称旁白',
          '声音克隆与年龄气质匹配配音，配合 10 秒音标级发音锁定',
          '广播级立体声混音：对白、棚录旁白、环境音效与智能闪避交响配乐',
        ],
        metricValue: '70+ 语言',
        metricLabel: '多音轨声纹锁定',
      },
      {
        id: 'directed_4k_master',
        shortTab: '年代与文化时间胶囊',
        badge: '时代背景与地域世界构建',
        title: '本土化年代与文化时间胶囊引擎',
        summary:
          '我们绝不只是照本宣科——故事引擎会自动融入故事发生年代、城市与国家的真实流行音乐、经济里程碑、文化印记与市井烟火，将私人记忆升华为历久弥新的历史纪录片。',
        exampleLabel: '文化时间胶囊示例',
        exampleHeadline: '还原时代与地域脉络，让历史鲜活重现',
        exampleDetails:
          '每一帧导演级 4K 画面（3840×2160）都将纯正年代配乐、地域经济文化语境与 6 种丝滑电影运镜融为一体，打造可直投大屏的历史级母带。',
        highlights: [
          '自动将所属年代与地域的文化、音乐与经济历史脉络编织进剧本',
          '电影级写实或传世插画 4K 超清（3840×2160）母带与镜头编排',
          '支持 14 种母语界面门户运营，制作覆盖 70+ 语言的文化本土化 4K 母带',
        ],
        metricValue: '时代 4K',
        metricLabel: '文化时间胶囊',
      },
    ],
    immediateLift: {
      eyebrow: '即刻增效 · 个人客户与白标运营商',
      heading: '超越视频剪辑的三大内置增长引擎',
      subtitle:
        '无需重复返工，依托同一份锁定的 Continuity Vault 自动实现多语种现场演示、实体印刷伴手礼以及轻松的周期性章节或 SOP 更新。',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: '几乎零额外视频算力',
          title: '多视角音轨切换',
          subtitle: '同一 4K 画面 · 多声线与多语言',
          description:
            '即刻展示声音克隆与智能编剧实力：在家庭试映或客户销售通话中，将同一条 4K 视觉成片实时切换为英语、日语或西班牙语，或即时切换第一人称回忆录与第三人称纪录片视角。',
          liftHighlight: '每新增一种语言或叙事视角，几乎零额外视频算力消耗',
        },
        {
          id: 'qr_print_companion',
          badge: '100% 自动化实体产物',
          title: '二维码联动实体伴读 PDF',
          subtitle: '家族纪念画册 · 房产精装手册 · SOP 岗位海报',
          description:
            '将每部数字 4K 母带转化为开放日、大寿宴席或工厂车间的实体伴手礼——自动排版精选剧照、章节摘要与可扫码播放的二维码视频链接。',
          liftHighlight: '为房产经纪、宴会主人与培训负责人提供高质感实体纪念品，稳固高端定价',
        },
        {
          id: 'living_continuity_vault',
          badge: '持续复购营收引擎',
          title: '持续演进的 Continuity Vault',
          subtitle: '增量式家庭新章、房源与 SOP 迭代更新',
          description:
            '由于人物面孔、声线与环境永久锁定，运营商可以极低返工成本与高毛利持续销售年度家族新篇章，或季度企业 SOP 与房源更新服务。',
          liftHighlight: '数分钟即可新增人生里程碑或合规修订，连续性零漂移',
          accessNote: '后续更新仅凭专属 Continuity Library Code 解锁（无需提供完整账号密码）',
        },
      ],
    },
    comparisonHeading: '为什么 $149 长篇 4K 电影与短片 AI 完全不在一个维度',
    comparisonSubtitle: '直观对比市面上的一次性短片 AI 工具与 SceneFlow 长篇电影级制作。',
    colDimension: '制作标准',
    colSlop: '短片 AI 生成器（廉价“AI 垃圾片”）',
    colSceneFlow: 'SceneFlow 长篇 4K 电影 ($149)',
    comparisonRows: [
      {
        dimension: '格式、片长与剧集',
        shortformSlop: '5–15 秒碎片化短片；完全无法支撑 1 小时以上长片或分集叙事',
        sceneFlowLongform: '1 小时+ 长篇电影或多集连续剧（$149 含 60 分钟 / 360 帧 4K；可扩展至 150 分钟）+ 1–3 分钟预告片',
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
      badge: 'فيلم روائي طويل (+ساعة) أو مسلسل متعدد الحلقات + إعلان 1–3 دقائق',
      headline: 'اروِ قصة حياة تمتد لأكثر من ساعة كفيلم طويل أو مسلسل مشوّق بالحلقات — مع إعادة تجسيد أصيلة لكل فصل.',
      body: 'أهم فصول الحياة لم تُصوَّر قط—ومولّدات مقاطع الذكاء الاصطناعي القصيرة تنهار بعد 15 ثانية. يعيد SceneFlow تجسيد كل حقبة بشخصيات ومواقع وثقافة وسياق تاريخي ثابت (حتى 60 دقيقة / 360 إطاراً مُخرجاً بدقة 4K ضمن باقة $149؛ قابلة للتوسيع إلى 150 دقيقة أو 6–8 حلقات)، بالإضافة إلى إعلان سينمائي قابل للمشاركة مدته 1–3 دقائق.',
      pill1: 'فيلم طويل (+ساعة) أو مسلسل متعدد الحلقات',
      pill2: 'فصول غير مصوَّرة تُعاد صياغتها بسياقها الزمني والثقافي',
      pill3: 'إعلان قابل للمشاركة 1–3 دقائق + توسعة حتى 150 دقيقة',
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
        shortTab: 'مشاهد حية وإخراج ثقافي',
        badge: 'تثبيت الاستمرارية والإخراج المكاني',
        title: 'مشاهد حية وإخراج ثقافي باستمرارية مثبّتة',
        summary:
          'هل تنقصك صور لأهم فصول القصة؟ عبر Continuity Vault، يخرج SceneFlow تجمعات عائلية نابضة بالحياة وتقاليد محلية ومنازل مطابقة للعصر وتحديثات افتراضية للديكور والأثاث—مع تثبيت الوجوه الحقيقية والملابس والمقتنيات الموروثة بدقة تامة.',
        exampleLabel: 'إخراج حي وتثبيت بيئي',
        exampleHeadline: 'لحظات لم تُصوَّر، مُخرجة بأصالة ثقافية حقيقية',
        exampleDetails:
          'أخرج مآدب عائلية تجمع الأجيال، وتجديدات فاخرة «قبل وبعد» من 4 فصول وجولات ما قبل البناء بأفق مثبّت، ومشاهد رعاية طبية من بدايات العيادة، أو تدريبات سلامة مهنية محلية—كل ذلك مثبّت على شخصياتك وعمارتك الحقيقية.',
        highlights: [
          'يُخرج التجمعات العائلية غير المصوَّرة والتقاليد الإقليمية والمنازل المطابقة للعصر',
          'تجديدات فاخرة «قبل وبعد» من 4 فصول وتصوّر أراضي ما قبل البناء مع تثبيت الأفق والساحل',
          'مشاهد محلية للسلامة المهنية والمعدات ورعاية المرضى والعملاء بلا أي تغيّر في الوجوه',
        ],
        metricValue: 'إخراج حي',
        metricLabel: 'تثبيت الثقافة والمكان',
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
        shortTab: 'استنساخ الصوت وتعدد المسارات',
        badge: 'صوت متعدد المنظور و+70 لغة',
        title: 'استنساخ الصوت، مسارات صوتية متعددة المنظور وقفل نطق 10 ثوانٍ',
        summary:
          'الفيلم الخالد يُسمع بنفس صدق صورته. يجمع SceneFlow بين استنساخ الصوت ومطابقة الصوت بالصورة وقفل النطق بـ 10 ثوانٍ مع مسارات صوتية متعددة المنظور—لتبديل نفس الماستر البصري 4K بسلاسة بين الإنجليزية واليابانية والإسبانية، أو بين مذكرات بضمير المتكلم ووثائقي بضمير الغائب.',
        exampleLabel: 'مثال الصوت متعدد المنظور',
        exampleHeadline: 'شريط بصري 4K واحد مثبّت ← +70 لغة وعدة منظورات سردية',
        exampleDetails:
          'تكلفة حوسبة فيديو إضافية شبه معدومة: حافظ على كل إطار بصري مثبّتاً مع تقديم نطق أصلي لأسماء العائلات والمدن والمصطلحات التقنية بأكثر من 70 لغة.',
        highlights: [
          'مسارات صوتية متعددة المنظور: بدّل اللغات أو أصوات المتكلم/الغائب على نفس الشريط 4K',
          'استنساخ الصوت وأصوات مطابقة للعمر والشخصية مع قفل نطق صوتي خلال 10 ثوانٍ',
          'مزج ستيريو احترافي: حوار، سرد استوديو، مؤثرات محيطة وموسيقى أوركسترالية متوازنة',
        ],
        metricValue: '+70 لغة',
        metricLabel: 'تثبيت صوتي متعدد المسارات',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'كبسولة العصر والثقافة',
        badge: 'بناء عالم تاريخي وإقليمي أصيل',
        title: 'محرك كبسولة العصر والثقافة المحلية',
        summary:
          'لا نكتفي بقراءة ملاحظاتك—بل ينسج محرك القصة الموسيقى الأصيلة والمحطات الاقتصادية والرموز الثقافية وأجواء الحياة اليومية للعقد والمدينة والبلد الدقيق لقصتك، ليحوّل الذكريات الخاصة إلى فيلم وثائقي تاريخي خالد.',
        exampleLabel: 'مثال كبسولة الزمن الثقافية',
        exampleHeadline: 'سياق زمني وإقليمي يعيد للتاريخ نبضه الحقيقي',
        exampleDetails:
          'يجمع كل إطار 4K مُخرج (3840×2160) بين موسيقى العقد الأصيلة والسياق الاقتصادي والثقافي المحلي وحركات كاميرا سلسة بـ 6 أنماط في ماستر تاريخي جاهز للعرض السينمائي.',
        highlights: [
          'دمج تلقائي للسياق الثقافي والموسيقي والاقتصادي للعقد والمنطقة داخل السيناريو',
          'سينما واقعية أو أسلوب فني مرسوم بدقة 4K UHD (3840×2160) مع إخراج كاميرا سينمائي',
          'اعمل عبر 14 بوابة واجهة أصلية وأنتج نسخ ماستر 4K موطّنة ثقافياً بأكثر من 70 لغة',
        ],
        metricValue: '4K أصيل للعصر',
        metricLabel: 'كبسولة زمن ثقافية',
      },
    ],
    immediateLift: {
      eyebrow: 'قيمة فورية · للأفراد ومشغّلي العلامات البيضاء',
      heading: 'ثلاثة محركات نمو مدمجة تتجاوز مجرد مونتاج الفيديو',
      subtitle:
        'قدّم عروضاً حية متعددة اللغات، ومطبوعات ملموسة، وتحديثات متكررة للفصول أو إجراءات العمل بسهولة—كلها مدعومة تلقائياً من نفس Continuity Vault المثبّت.',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: 'حوسبة إضافية شبه معدومة',
          title: 'مسارات صوتية متعددة المنظور',
          subtitle: 'نفس المشاهد 4K · عدة أصوات ولغات',
          description:
            'اعرض قوة استنساخ الصوت وذكاء السيناريو فوراً: بدّل شريطاً بصرياً واحداً بدقة 4K مباشرة بين الإنجليزية واليابانية والإسبانية—أو بين مذكرات شخصية ووثائقي بضمير الغائب—أثناء عرض عائلي أو مكالمة مبيعات.',
          liftHighlight: 'حوسبة فيديو إضافية شبه معدومة لكل لغة أو منظور سردي إضافي',
        },
        {
          id: 'qr_print_companion',
          badge: 'مطبوعة آلية 100%',
          title: 'ملف PDF مطبوع مرتبط برموز QR',
          subtitle: 'كتاب تذكاري · نشرة عقارية · ملصق إجراءات SOP',
          description:
            'حوّل كل ماستر رقمي 4K إلى رفيق مطبوع ملموس لمعارض العقارات أو حفلات الميلاد أو أرض المصنع—مُنسّق تلقائياً بلقطات ثابتة وملخصات فصول وروابط فيديو QR قابلة للمسح.',
          liftHighlight: 'يمنح الوسطاء والمضيفين ومديري التدريب تذكاراً مادياً يبرر التسعير المميز',
        },
        {
          id: 'living_continuity_vault',
          badge: 'محرك إيرادات متكررة',
          title: 'Continuity Vault حي ومتجدد',
          subtitle: 'تحديثات تراكمية للفصول والعقارات وإجراءات SOP',
          description:
            'لأن وجوه الشخصيات وأصواتها وبيئاتها تبقى مثبّتة بشكل دائم، يمكن للمشغّلين بيع امتدادات سنوية لفصول العائلة أو تحديثات ربع سنوية للعقارات وإجراءات العمل بهوامش ربح عالية وإعادة عمل شبه معدومة.',
          liftHighlight: 'أضف محطات جديدة أو تعديلات امتثال خلال دقائق دون أي خلل في الاستمرارية',
          accessNote: 'تُفتح التحديثات اللاحقة عبر رمز خاص لمكتبة الاستمرارية (Continuity Library Code) دون الحاجة لكلمة مرور الحساب الكاملة',
        },
      ],
    },
    comparisonHeading: 'لماذا سينما 4K الطويلة بـ $149 عالم مختلف تماماً',
    comparisonSubtitle: 'قارن مولدات المقاطع القصيرة العشوائية بإنتاج SceneFlow السينمائي الطويل.',
    colDimension: 'معيار الإنتاج',
    colSlop: 'مولدات المقاطع القصيرة ("AI Slop")',
    colSceneFlow: 'سينما SceneFlow الطويلة 4K ($149)',
    comparisonRows: [
      {
        dimension: 'الصيغة والمدة والمسلسلات',
        shortformSlop: 'مقاطع منفصلة 5–15 ثانية؛ غير قابلة للاستمرار في سرد يتجاوز ساعة أو عبر حلقات',
        sceneFlowLongform: 'فيلم طويل (+ساعة) أو مسلسل متعدد الحلقات (حتى 60 دقيقة / 360 إطار 4K بـ $149؛ قابل للتوسيع إلى 150 دقيقة) + إعلان 1–3 دقائق',
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
      badge: 'ภาพยนตร์เรื่องยาว 1 ชม.+ หรือซีรีส์หลายตอน + ตัวอย่าง 1–3 นาที',
      headline: 'ถ่ายทอดเรื่องราวชีวิตความยาวกว่า 1 ชั่วโมงเป็นภาพยนตร์เรื่องยาวหรือซีรีส์ชวนดูต่อเนื่อง — พร้อมการจำลองเหตุการณ์แต่ละบทอย่างสมจริง',
      body: 'บทสำคัญที่สุดของชีวิตมักไม่เคยถูกบันทึกภาพไว้—และเครื่องมือสร้างคลิป AI แบบสั้นมักพังทลายเมื่อเกิน 15 วินาที SceneFlow สร้างทุกยุคสมัยขึ้นใหม่โดยล็อกใบหน้า สถานที่ วัฒนธรรม และบริบททางประวัติศาสตร์ไว้ครบถ้วน (รวมสูงสุด 60 นาที / 360 เฟรม 4K กำกับภาพในราคา $149; ขยายได้ถึง 150 นาที หรือ 6–8 ตอน) พร้อมตัวอย่างภาพยนตร์ 1–3 นาทีสำหรับแชร์',
      pill1: 'ภาพยนตร์เรื่องยาว 1 ชม.+ หรือซีรีส์หลายตอน',
      pill2: 'จำลองบทชีวิตที่ไม่ได้ถ่ายทำ พร้อมบริบทแห่งยุคสมัยและวัฒนธรรม',
      pill3: 'ตัวอย่างแชร์ได้ 1–3 นาที + ขยายได้ถึง 150 นาที',
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
        shortTab: 'ฉากมีชีวิตและจัดฉากวัฒนธรรม',
        badge: 'การจัดฉากที่ล็อกความต่อเนื่อง',
        title: 'ฉากมีชีวิตและการจัดฉากวัฒนธรรมที่ล็อกความต่อเนื่อง',
        summary:
          'ไม่มีรูปถ่ายช่วงเวลาสำคัญที่สุดใช่ไหม? ด้วย Continuity Vault ของคุณ SceneFlow จัดฉากงานรวมญาติที่มีชีวิตชีวา ประเพณีท้องถิ่น บ้านเรือนที่สมยุค และการตกแต่งภายใน/เฟอร์นิเจอร์เสมือนจริง โดยยังคงล็อกใบหน้าจริง เครื่องแต่งกาย และของรักประจำตระกูลไว้อย่างแม่นยำ',
        exampleLabel: 'การจัดฉากมีชีวิตและล็อกสภาพแวดล้อม',
        exampleHeadline: 'ช่วงเวลาที่ไร้ภาพถ่าย ถูกจัดฉากอย่างสมจริงตามวัฒนธรรม',
        exampleDetails:
          'จัดฉากมื้อค่ำครอบครัวหลายรุ่นที่อบอุ่น รีโนเวตบ้านหรู "ก่อนและหลัง" 4 บท และทัวร์โครงการก่อนก่อสร้างที่ล็อกเส้นขอบฟ้าจริง ฉากการดูแลผู้ป่วยยุคก่อตั้งคลินิก หรือการซ้อมความปลอดภัยในที่ทำงานท้องถิ่น โดยล็อกกับตัวละครและสถาปัตยกรรมจริงของคุณทั้งหมด',
        highlights: [
          'จัดฉากการรวมญาติที่ไม่มีภาพถ่าย ประเพณีท้องถิ่น และบ้านเรือนตรงยุคสมัย',
          'รีโนเวตบ้านหรู "ก่อนและหลัง" 4 บท และภาพจำลองที่ดินก่อนก่อสร้างที่ล็อกเส้นขอบฟ้าและแนวชายฝั่งจริง',
          'ฉากความปลอดภัยในที่ทำงาน อุปกรณ์ และการดูแลผู้ป่วย/ลูกค้าแบบท้องถิ่นโดยหน้าไม่เพี้ยน',
        ],
        metricValue: 'จัดฉากมีชีวิต',
        metricLabel: 'ล็อกวัฒนธรรมและสถานที่',
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
        shortTab: 'โคลนเสียงและหลายแทร็ก',
        badge: 'เสียงหลายมุมมอง & 70+ ภาษา',
        title: 'โคลนเสียง แทร็กเสียงหลายมุมมอง และล็อกการออกเสียง 10 วินาที',
        summary:
          'ภาพยนตร์ที่น่าจดจำต้องมีเสียงที่สมจริงพอๆ กับภาพ SceneFlow ผสานการโคลนเสียง การจับคู่เสียงตรงภาพ และการล็อกการออกเสียง 10 วินาที เข้ากับแทร็กเสียงหลายมุมมอง—สลับไฟล์ภาพ 4K ชุดเดียวกันได้อย่างลื่นไหลระหว่างภาษาอังกฤษ ญี่ปุ่น และสเปน หรือสลับระหว่างบันทึกความทรงจำบุรุษที่ 1 กับสารคดีบุรุษที่ 3',
        exampleLabel: 'ตัวอย่างเสียงหลายมุมมอง',
        exampleHeadline: 'ภาพ 4K ล็อก 1 ชุด → 70+ ภาษา และหลากหลายมุมมองการเล่าเรื่อง',
        exampleDetails:
          'แทบไม่ต้องใช้พลังประมวลผลวิดีโอเพิ่ม: คงทุกเฟรมภาพเดิมไว้ครบถ้วน พร้อมออกเสียงนามสกุล บ้านเกิด และคำย่อเฉพาะทางอย่างเป็นธรรมชาติในกว่า 70 ภาษา',
        highlights: [
          'แทร็กเสียงหลายมุมมอง: สลับภาษาหรือเสียงเล่าเรื่องบุรุษที่ 1/3 บนภาพ 4K ชุดเดียวกัน',
          'โคลนเสียงและจับคู่เสียงตามวัย/บุคลิก พร้อมล็อกการออกเสียงตามสัทศาสตร์ใน 10 วินาที',
          'มิกซ์สเตอริโอระดับออกอากาศ: บทสนทนา เสียงบรรยายสตูดิโอ SFX บรรยากาศ และดนตรีออร์เคสตรา',
        ],
        metricValue: '70+ ภาษา',
        metricLabel: 'ล็อกเสียงหลายแทร็ก',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'แคปซูลเวลาแห่งยุคและวัฒนธรรม',
        badge: 'สร้างโลกแห่งยุคสมัยและท้องถิ่น',
        title: 'ระบบแคปซูลเวลาแห่งยุคสมัยและวัฒนธรรมเฉพาะถิ่น',
        summary:
          'เราไม่ได้แค่อ่านบันทึกของคุณ—ระบบเล่าเรื่องของเราถักทอเสียงดนตรีแท้จริง เหตุการณ์เศรษฐกิจสำคัญ สัญลักษณ์ทางวัฒนธรรม และบรรยากาศชีวิตประจำวันของทศวรรษ เมือง และประเทศที่เรื่องราวเกิดขึ้น เปลี่ยนความทรงจำส่วนตัวให้กลายเป็นสารคดีประวัติศาสตร์ที่ทรงคุณค่าตลอดกาล',
        exampleLabel: 'ตัวอย่างแคปซูลเวลาทางวัฒนธรรม',
        exampleHeadline: 'บริบทแห่งยุคสมัยและท้องถิ่นที่ปลุกประวัติศาสตร์ให้มีชีวิต',
        exampleDetails:
          'ทุกเฟรม 4K ที่กำกับ (3840×2160) ผสานดนตรีประจำทศวรรษ บริบทเศรษฐกิจและวัฒนธรรมท้องถิ่น และการเคลื่อนกล้อง 6 รูปแบบอย่างนุ่มนวล สู่งานมาสเตอร์ประวัติศาสตร์พร้อมฉายจอใหญ่',
        highlights: [
          'สอดแทรกบริบททางวัฒนธรรม ดนตรี และเศรษฐกิจประจำทศวรรษและภูมิภาคลงในบทโดยอัตโนมัติ',
          'ภาพยนตร์สมจริงหรือภาพวาดประณีตระดับ 4K UHD (3840×2160) พร้อมงานกำกับมุมกล้อง',
          'ใช้งานผ่านพอร์ทัลภาษาแม่ 14 ภาษา พร้อมผลิตมาสเตอร์ 4K ที่ปรับเข้ากับวัฒนธรรมกว่า 70 ภาษา',
        ],
        metricValue: '4K สมยุค',
        metricLabel: 'แคปซูลเวลาวัฒนธรรม',
      },
    ],
    immediateLift: {
      eyebrow: 'ยกระดับทันที · ลูกค้าทั่วไปและผู้ให้บริการไวท์เลเบล',
      heading: '3 ขุมพลังเติบโตในตัวที่เหนือกว่าแค่การตัดต่อวิดีโอ',
      subtitle:
        'นำเสนอเดโมหลายภาษาแบบสด มอบสื่อสิ่งพิมพ์ที่จับต้องได้ และรับงานอัปเดตบทใหม่หรือ SOP ต่อเนื่องอย่างง่ายดาย—ขับเคลื่อนอัตโนมัติจาก Continuity Vault เดิมที่ล็อกไว้แล้ว',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: 'แทบไม่เพิ่มต้นทุนประมวลผล',
          title: 'แทร็กเสียงหลายมุมมอง',
          subtitle: 'ภาพ 4K ชุดเดิม · หลายเสียงและหลายภาษา',
          description:
            'โชว์ศักยภาพโคลนเสียงและบทอัจฉริยะได้ทันที: สลับม้วนภาพ 4K เดียวแบบสดๆ ระหว่างอังกฤษ ญี่ปุ่น และสเปน—หรือสลับระหว่างบันทึกบุรุษที่ 1 กับสารคดีบุรุษที่ 3—กลางรอบพรีวิวครอบครัวหรือการนำเสนอขายลูกค้า',
          liftHighlight: 'แทบไม่ต้องใช้พลังประมวลผลวิดีโอเพิ่มต่อภาษาหรือมุมมองผู้บรรยายที่เพิ่มเข้ามา',
        },
        {
          id: 'qr_print_companion',
          badge: 'สื่ออัตโนมัติ 100%',
          title: 'PDF สิ่งพิมพ์คู่ขวัญพร้อมคิวอาร์โค้ด',
          subtitle: 'หนังสือที่ระลึก · แผ่นข้อมูลอสังหาฯ · โปสเตอร์ SOP',
          description:
            'เปลี่ยนไฟล์มาสเตอร์ดิจิทัล 4K ทุกเรื่องให้เป็นสื่อสิ่งพิมพ์ที่จับต้องได้สำหรับงานเปิดบ้าน งานเลี้ยงวันเกิดสำคัญ หรือพื้นที่โรงงาน—จัดหน้าอัตโนมัติพร้อมภาพนิ่งจากหนัง บทสรุปแต่ละตอน และลิงก์วิดีโอ QR ที่สแกนได้',
          liftHighlight: 'มอบของที่ระลึกจับต้องได้ให้ตัวแทนอสังหาฯ เจ้าภาพ และหัวหน้าฝึกอบรม ช่วยยกระดับราคาขายพรีเมียม',
        },
        {
          id: 'living_continuity_vault',
          badge: 'ขุมพลังรายได้ประจำ',
          title: 'Continuity Vault ที่มีชีวิต',
          subtitle: 'อัปเดตบทใหม่ อสังหาฯ และ SOP แบบต่อยอด',
          description:
            'เพราะใบหน้านักแสดง เสียง และสภาพแวดล้อมถูกล็อกไว้ถาวร ผู้ให้บริการจึงสามารถขายบทขยายประจำปีของครอบครัว หรือการอัปเดต SOP และอสังหาฯ รายไตรมาสด้วยกำไรสูงโดยแทบไม่ต้องทำใหม่',
          liftHighlight: 'เพิ่มช่วงเวลาสำคัญหรือปรับปรุงข้อกำหนดใหม่ในไม่กี่นาทีโดยไม่เสียความต่อเนื่อง',
          accessNote: 'ปลดล็อกการอัปเดตครั้งต่อไปด้วยรหัส Continuity Library Code ส่วนตัว (ไม่ต้องใช้รหัสผ่านบัญชีเต็มรูปแบบ)',
        },
      ],
    },
    comparisonHeading: 'ทำไมภาพยนตร์ 4K แบบยาว $149 จึงอยู่คนละระดับ',
    comparisonSubtitle: 'เปรียบเทียบแอปสร้างคลิปสั้น AI ทั่วไปกับการผลิตภาพยนตร์แบบยาวของ SceneFlow',
    colDimension: 'มาตรฐานการผลิต',
    colSlop: 'แอปสร้างคลิปสั้น AI ทั่วไป ("AI Slop")',
    colSceneFlow: 'SceneFlow ภาพยนตร์ 4K แบบยาว ($149)',
    comparisonRows: [
      {
        dimension: 'รูปแบบ ความยาว และซีรีส์',
        shortformSlop: 'คลิปสั้นขาดตอน 5–15 วินาที; ไม่สามารถรองรับการเล่าเรื่องยาวกว่า 1 ชม. หรือแบบซีรีส์ได้',
        sceneFlowLongform: 'ภาพยนตร์เรื่องยาว 1 ชม.+ หรือซีรีส์หลายตอน (สูงสุด 60 นาที / 360 เฟรม 4K ที่ $149; ขยายได้ถึง 150 นาที) + ตัวอย่าง 1–3 นาที',
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

  ja: {
    storefrontEyebrow: '長編4Kシネマ · AIスロップゼロ',
    studioEyebrow: 'ホワイトラベル・スタジオを支える圧倒的な競争優位',
    storefrontHeadingPrefix: '5秒のAIクリップアプリではない。本物の ',
    storefrontHeadingAccent: '$149 長編4K映画スタジオ。',
    studioHeadingPrefix: 'なぜ顧客は短尺AIアプリではなく $149–$950+ を ',
    studioHeadingAccent: '長編シネマ制作に支払うのか。',
    storefrontSubtitle:
      '汎用的な短尺AI生成ツールは、顔が崩れる5秒クリップと空虚な文章を量産するだけです。$149のKeepsake Cinema作品はすべて、ターゲット視聴者の共鳴度90%以上を目指して演出された多章構成の長編4K映画——実在の人物、時代、住まい、家宝、そして事業を圧倒的なリアリティで蘇らせます。',
    studioSubtitle:
      '短尺AIアプリは使い捨ての「AIスロップ」で溢れています。SceneFlowはあなたのホワイトラベル事業に本物の長編4Kシネマを提供——共鳴度90%以上の脚本、年代別の人物一貫性、実在ロケーション・小道具ロック、音声クローン、そして大画面上映に耐える放送品質マスターを実現します。',
    noSlopBadge: 'AIスロップゼロ · 長編4Kシネマ',
    trailerSpotlight: {
      badge: '1時間超の長編映画 または 複数話シリーズ ＋ 1〜3分予告編',
      headline: '1時間超の人生の物語を、長編映画または一気見できるエピソードシリーズとして再現 — 失われた章も忠実に映像化。',
      body: '人生を決定づけた章の多くは撮影されておらず、短尺AIクリップ生成ツールは15秒を超えると破綻します。SceneFlowは人物・場所・文化・時代背景を固定してあらゆる時代を再現（$149に最大60分／360演出4Kフレーム込み、150分または全6〜8話へ拡張可能）。さらに共有しやすい1〜3分の劇場風予告編も付属します。',
      pill1: '1時間超の長編1本 または 複数話シリーズ',
      pill2: '未撮影の章を時代・文化背景とともに忠実に再現',
      pill3: '共有用1〜3分予告編 ＋ 最大150分へ拡張可能',
    },
    pillarsHeading: 'すべての作品を支える6つのスタジオ制作システム',
    pillarsHint: '各機能を選択すると、SceneFlowがAIスロップゼロで実話を演出する仕組みを確認できます。',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: '共鳴度90%+の脚本',
        badge: '視聴者設計に基づく脚本術',
        title: 'ターゲット視聴者の共鳴度90%以上をスコア検証した本格脚本',
        summary:
          '1行の雑なプロンプトを映像AIに投げることは一切ありません。すべての作品は感情曲線・テンポ・共鳴度90%以上を精密に設計した多幕構成の脚本からスタート。傘寿の祝いで家族の涙を誘う作品から、高級不動産の購入検討、クリニックの信頼醸成、社員研修の定着まで最適化します。',
        exampleLabel: 'ディレクター構成例',
        exampleHeadline: '第1幕フック → 時代の歩み → 感情のクライマックス → 記憶に残るフィナーレ',
        exampleDetails:
          'レンダリング前に各ビートをターゲット視聴者（家族、購入検討者、患者、新入社員）に照らしてスコア検証し、単調なナレーションや水増しを徹底排除します。',
        highlights: [
          '30〜150分の本格多章構成（$149で最大60分・360フレーム）',
          '感情・成約共鳴度90%以上を目指してスコア評価＆推敲',
          '1〜3分の劇場風予告編＋対話型ストーリーボード設計書付き',
        ],
        metricValue: '90%+',
        metricLabel: 'ターゲット視聴者共鳴度',
      },
      {
        id: 'character_aging',
        shortTab: '28歳の祖父＆家族一貫性',
        badge: '人物アイデンティティ＆年代エンジン',
        title: '28歳当時の祖父を再現し、世代を超えた家族の面影を完全維持',
        summary:
          '80歳の今の写真しかなくても大丈夫。SceneFlowのコンティニュイティ・エンジンが1970年代シーン向けに自然な28歳の姿を生成し、兄弟や親子・孫の面影を調和させ、長編全体を通じて全員の顔立ちをロックします。',
        exampleLabel: '一貫性ロック例',
        exampleHeadline: '現在の写真1枚 → 自然な28歳 · 52歳 · 現在',
        exampleDetails:
          '骨格や温かな表情を損なわず、幼少期からキャリアの節目、現在の家族団らんまで自然に繋がり、カットごとに別人の顔へ変わることはありません。',
        highlights: [
          '普段のスマホ写真から自然な若返り・加齢表現を実現',
          '夫婦・子ども・孫まで複数世代の家族の面影を忠実に再現',
          '企業・研修映画でも創業者や講師の人物像を完全固定',
        ],
        metricValue: '100%',
        metricLabel: '人物アイデンティティ固定',
      },
      {
        id: 'location_matching',
        shortTab: '動的シーン＆文化演出',
        badge: '一貫性ロック空間演出',
        title: '一貫性ロックの動的シーン＆文化演出ステージング',
        summary:
          '人生最大の節目の写真が残っていませんか？Continuity Vaultを活用し、SceneFlowは賑やかな家族団らん、地域の伝統行事、時代に忠実な住まい、バーチャル内装・家具リノベーションをリアルに演出——実在の顔立ち、衣装、大切な家宝を一切崩さず固定します。',
        exampleLabel: '動的ステージング＆環境ロック',
        exampleHeadline: '写真にない名場面を、文化的リアリティで鮮やかに演出',
        exampleDetails:
          '三世代が囲む賑やかな食卓、4章構成の「ビフォー＆アフター」高級リノベーションや水平線ロックの着工前・更地邸宅ウォークスルー、創業期のクリニック診療風景、地域に根ざした職場安全訓練まで——すべて実在の人物と建築に完全ロックして再現します。',
        highlights: [
          '写真が残っていない家族の集い・地域の伝統・時代に忠実な住まいを生き生きと演出',
          '4章構成の「ビフォー＆アフター」高級リノベーション＆水平線・海岸線ロックの着工前土地ビジュアライゼーション',
          '顔ブレゼロで描く地域仕様の職場安全・設備運用・患者／顧客ケアシーン',
        ],
        metricValue: '動的演出',
        metricLabel: '文化＆空間ロック',
      },
      {
        id: 'heirloom_props',
        shortTab: '大切な品・家宝ロック',
        badge: '小道具・記念品の一貫性',
        title: '大切な小道具を固定 — 家族の聖書からブランド象徴アイテムまで',
        summary:
          '心に残る物語は、誰もが一目で気づく細部に宿ります。使い込まれた家族の聖書や祖父の腕時計、愛用ギター、看板商品、安全装備などの重要な品をシーンをまたいで崩さず保持します。',
        exampleLabel: '小道具リファレンス例',
        exampleHeadline: '家族の聖書 · 形見の腕時計 · ブランド象徴アイテム',
        exampleDetails:
          'レンダリング前にコンティニュイティ・ライブラリへ登録するため、途中で歪んだり消えたり不自然なAI破綻を起こすことがありません。',
        highlights: [
          '大切な家宝や記念品（家族の聖書、手紙、時計、愛車）を忠実に保存',
          'ブランドストーリー向けに主力製品・看板・ユニフォームを固定',
          'コンプライアンス・SOP研修で正確な機材や安全装備を描写',
        ],
        metricValue: '破綻ゼロ',
        metricLabel: '小道具・家宝ロック',
      },
      {
        id: 'voice_cloning',
        shortTab: '音声クローン＆マルチトラック',
        badge: '多視点オーディオ＆70+言語',
        title: '音声クローン、多視点オーディオトラック＆10秒発音ロック',
        summary:
          '忘れられない映画は、映像と同じくらい「音」が本物です。SceneFlowは音声クローン、映像との声質マッチ、10秒発音ロックに多視点オーディオトラックを統合——同一の4K映像マスターを英語・日本語・スペイン語へ、あるいは一人称回想録と三人称ドキュメンタリーへ自在に切り替えられます。',
        exampleLabel: '多視点オーディオの例',
        exampleHeadline: '固定4K映像リール1本 → 70+言語＆複数の語り口を自在に切替',
        exampleDetails:
          '追加の映像生成コストはほぼゼロ。全フレームを完全固定したまま、70以上の言語で苗字・故郷の地名・専門略語をネイティブ発音で正確に届けます。',
        highlights: [
          '多視点オーディオトラック：同一4Kリール上で言語や一人称／三人称ナレーションを即時切替',
          '音声クローン＆年齢・人物像に調和した声質と10秒の音声発音ロック',
          '放送品質ステレオミックス：セリフ、スタジオナレーション、環境SFX、ダッキング劇伴',
        ],
        metricValue: '70+言語',
        metricLabel: 'マルチトラック音声ロック',
      },
      {
        id: 'directed_4k_master',
        shortTab: '時代＆文化タイムカプセル',
        badge: '時代背景＆地域のワールドビルディング',
        title: 'ローカライズ時代＆文化タイムカプセル・エンジン',
        summary:
          'メモをただ読み上げるだけではありません。物語が起きた正確な年代・都市・国の本物の音楽、経済の節目、文化的象徴、日々の空気感を脚本に織り込み、個人の記憶を後世に残る歴史ドキュメンタリーへ昇華させます。',
        exampleLabel: '文化タイムカプセルの例',
        exampleHeadline: '歴史を鮮やかに蘇らせる時代と地域のリアリティ',
        exampleDetails:
          '演出された全4Kフレーム（3840×2160）に、時代を象徴する音楽、地域の経済・文化背景、滑らかな6軸カメラワークを融合し、劇場品質の歴史マスターに仕上げます。',
        highlights: [
          'その年代・地域ならではの文化・音楽・経済の背景を脚本へ自動統合',
          'フォトリアル映画または家宝級イラスト調の4K UHD（3840×2160）マスター演出',
          '14の母国語UIポータルで運用し、70+言語の文化ローカライズ4Kマスターを制作',
        ],
        metricValue: '時代忠実4K',
        metricLabel: '文化タイムカプセル',
      },
    ],
    immediateLift: {
      eyebrow: '即効リフト · 個人顧客＆ホワイトラベル運営者向け',
      heading: '動画編集を超える3つの内蔵グロースエンジン',
      subtitle:
        '多言語ライブデモ、手元に残る印刷冊子、継続的な章追加やSOP更新を、ロック済みの同一Continuity Vaultから自動展開します。',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: '追加映像コストほぼゼロ',
          title: '多視点オーディオトラック',
          subtitle: '同一4K映像 · 複数ボイス＆多言語切替',
          description:
            '音声クローンと脚本インテリジェンスを即座に実演：家族向け試写や法人商談の場で、1本の4K映像を英語・日本語・スペイン語へライブ切替、または一人称回想録と三人称ドキュメンタリーを瞬時に切り替えられます。',
          liftHighlight: '言語や語り手の視点を追加しても、追加の映像演算コストはほぼゼロ',
        },
        {
          id: 'qr_print_companion',
          badge: '100%自動生成の印刷物',
          title: 'QR連動プリント・コンパニオンPDF',
          subtitle: '記念フォトブック · 物件資料 · SOPポスター',
          description:
            'すべてのデジタル4Kマスターを、オープンハウスや長寿祝いの席、工場現場で手に取れる印刷物へ変換。名場面スチール、章ごとの要約、スキャン再生できるQR動画リンクを自動レイアウトします。',
          liftHighlight: '不動産担当者・主催者・研修責任者に、高単価を納得させる実物の記念品を提供',
        },
        {
          id: 'living_continuity_vault',
          badge: '継続収益エンジン',
          title: '進化し続ける Continuity Vault',
          subtitle: '家族の続編・物件更新・SOP改訂をシームレスに追加',
          description:
            '出演者の顔・声・空間が恒久ロックされているため、運営者は毎年の家族の続編追加や四半期ごとのSOP・物件アップデートを、ほぼゼロのやり直しで高利益に販売できます。',
          liftHighlight: '一貫性の崩れゼロで、新たな節目やコンプライアンス改訂を数分で追加',
          accessNote: '継続アップデートは専用の Continuity Library Code で解放（アカウント本体のパスワード不要）',
        },
      ],
    },
    comparisonHeading: 'なぜ $149 の長編4Kシネマは別次元なのか',
    comparisonSubtitle: '使い捨ての短尺AIクリップ生成ツールと、SceneFlowの本物の長編制作を比較してください。',
    colDimension: '制作基準',
    colSlop: '短尺AIクリップアプリ（「AIスロップ」）',
    colSceneFlow: 'SceneFlow 長編4Kシネマ（$149）',
    comparisonRows: [
      {
        dimension: '形式・尺・シリーズ対応',
        shortformSlop: '5〜15秒の断片クリップ。1時間超の長編や連続エピソードの物語には破綻',
        sceneFlowLongform: '1時間超の長編映画 または 複数話シリーズ（$149で最大60分／360枚の4Kフレーム、150分まで拡張可）＋ 1〜3分予告編',
      },
      {
        dimension: '脚本と共鳴度',
        shortformSlop: '1行プロンプトによる平坦で薄い構成',
        sceneFlowLongform: '共鳴度90%+で検証されたプロ仕様の多幕脚本',
      },
      {
        dimension: '人物・年代再現',
        shortformSlop: '数秒ごとに顔が別人に変化してしまう',
        sceneFlowLongform: '人物の一貫性ロック（28歳の祖父の再現や家族の面影一致）',
      },
      {
        dimension: 'ロケーション・小道具',
        shortformSlop: '架空の部屋と歪んだ小道具を自動生成',
        sceneFlowLongform: '実在空間（物件・幼少期の街）と大切な品（家族の聖書など）を忠実ロック',
      },
      {
        dimension: '音声・サウンド',
        shortformSlop: '機械的な読み上げ、誤読、安っぽいBGMループ',
        sceneFlowLongform: '音声クローン、人物マッチ音声、発音ロック、SFX、専用スコア',
      },
      {
        dimension: '映像演出・マスター',
        shortformSlop: 'ちらつきや破綻が目立つ使い捨て映像',
        sceneFlowLongform: '実写調／イラスト調の演出4Kビート＋劇場品質4Kマスター',
      },
    ],
    storefrontCtaLabel: '$29 長編ブループリントを始める（$149 4K本編に全額充当）',
    studioPrimaryCtaLabel: '自社ブランドの長編シネマスタジオを開設',
    studioSecondaryCtaLabel: '$149 ライブストアを体験する',
  },

  ko: {
    storefrontEyebrow: '장편 4K 시네마 · 제로 AI 슬롭',
    studioEyebrow: '화이트라벨 스튜디오의 압도적 경쟁력',
    storefrontHeadingPrefix: '5초짜리 AI 클립 앱이 아닙니다. 진짜 ',
    storefrontHeadingAccent: '$149 장편 4K 영화 스튜디오입니다.',
    studioHeadingPrefix: '고객이 단편 AI 클립 앱 대신 $149–$950+를 ',
    studioHeadingAccent: '장편 시네마에 기꺼이 지불하는 이유.',
    storefrontSubtitle:
      '일반 단편 AI 생성기는 얼굴이 바뀌는 5초 클립과 공허한 문구만 찍어냅니다. $149 Keepsake Cinema 작품은 타깃 관객 공명도 90%+를 목표로 연출된 다챕터 장편 4K 영화로, 실제 인물·시대·집·가보·비즈니스를 생생하게 되살립니다.',
    studioSubtitle:
      '단편 AI 앱은 일회용 "AI 슬롭"으로 인터넷을 채웁니다. SceneFlow는 당신의 화이트라벨 스튜디오에 진짜 장편 4K 시네마를 제공합니다—90%+ 공명 각본, 시대별 인물 일관성, 실제 장소·소품 잠금, 음성 클로닝, 극장급 4K 마스터까지.',
    noSlopBadge: 'ZERO AI SLOP · 장편 4K 시네마',
    trailerSpotlight: {
      badge: '1시간+ 장편 영화 또는 멀티 에피소드 시리즈 + 1–3분 예고편',
      headline: '1시간 이상의 인생 이야기를 장편 영화나 정주행 에피소드 시리즈로 — 진정성 있는 챕터 재연과 함께.',
      body: '인생의 가장 결정적인 챕터는 대부분 촬영된 적이 없으며, 숏폼 AI 클립 생성기는 15초만 넘어가도 무너집니다. SceneFlow는 인물·장소·문화·역사적 맥락을 고정해 모든 시대를 사실적으로 재현하며($149에 최대 60분 / 360 연출 4K 프레임 포함, 150분 또는 6–8부작 시리즈로 확장 가능), 공유 가능한 1–3분 극장판 예고편도 함께 제공합니다.',
      pill1: '단일 1시간+ 장편 또는 멀티 에피소드 시리즈',
      pill2: '촬영되지 않은 챕터를 시대·문화 맥락으로 재현',
      pill3: '공유용 1–3분 예고편 + 최대 150분 확장 가능',
    },
    pillarsHeading: '모든 영화 속에 담긴 6가지 스튜디오 제작 시스템',
    pillarsHint: '각 기능을 선택해 SceneFlow가 AI 슬롭 없이 진짜 이야기를 연출하는 방식을 확인하세요.',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: '90%+ 공명 각본',
        badge: '관객 맞춤형 시나리오 설계',
        title: '타깃 관객 공명도 90% 이상으로 검증된 전문 시나리오',
        summary:
          '한 줄 프롬프트를 그대로 영상 AI에 넣지 않습니다. 모든 영화는 감정선·호흡·타깃 관객 공명도 90%+에 맞춘 다막 각본으로 시작해, 팔순 잔치의 감동, 고급 부동산 구매 설득, 병원 신뢰 구축, 신입 교육 정착까지 완벽하게 설계합니다.',
        exampleLabel: '디렉터 구성 예시',
        exampleHeadline: '1막 몰입 훅 → 시대 흐름 → 감정 클라이맥스 → 여운 남는 피날레',
        exampleDetails:
          '단 한 프레임도 렌더링하기 전에 타깃 관객(가족, 매수자, 환자, 신입사원) 기준으로 모든 비트를 점수화해 지루한 나레이션과 군더더기를 제거합니다.',
        highlights: [
          '30–150분 다챕터 장편 서사 ($149에 최대 60분 / 360 프레임)',
          '감정·전환 공명도 90%+ 달성까지 정밀 채점 및 다듬기',
          '1–3분 극장 예고편 + 인터랙티브 스토리보드 블루프린트 포함',
        ],
        metricValue: '90%+',
        metricLabel: '타깃 관객 공명도',
      },
      {
        id: 'character_aging',
        shortTab: '28세 할아버지 & 가족 일치',
        badge: '인물 정체성 & 시대 엔진',
        title: '28세 시절의 할아버지를 복원하고 세대 간 가족의 닮은꼴을 고정',
        summary:
          '80세 할아버지의 최근 사진 한 장만 있으신가요? SceneFlow 연속성 엔진은 1970년대 장면을 위한 자연스러운 28세 모습을 생성하고, 형제·자녀·손주의 닮은꼴을 맞추며 영화 전체에서 모든 인물의 얼굴을 고정합니다.',
        exampleLabel: '연속성 잠금 예시',
        exampleHeadline: '현재 사진 1장 → 자연스러운 28세 · 52세 · 현재',
        exampleDetails:
          '같은 이목구비와 따뜻한 분위기가 어린 시절부터 커리어의 절정, 오늘의 가족 모임까지 자연스럽게 이어져 컷마다 낯선 얼굴로 변하지 않습니다.',
        highlights: [
          '일상 휴대폰 사진으로 자연스러운 젊어짐·나이 듦 구현',
          '배우자·자녀·손주까지 다세대 가족의 닮은꼴 정밀 매칭',
          '브랜드·교육 영화의 창업자 및 강사 정체성 완벽 고정',
        ],
        metricValue: '100%',
        metricLabel: '인물 정체성 고정',
      },
      {
        id: 'location_matching',
        shortTab: '생동감 있는 장면 & 문화 연출',
        badge: '연속성 고정 스테이징',
        title: '연속성 고정 라이브 장면 & 문화 스테이징',
        summary:
          '가장 중요한 장의 사진이 없으신가요? Continuity Vault를 활용해 SceneFlow는 활기찬 가족 모임, 지역 전통, 시대에 충실한 집, 가상 인테리어·가구 리뉴얼을 생생하게 연출하며 실제 얼굴·복장·가보를 완벽히 고정합니다.',
        exampleLabel: '라이브 스테이징 & 공간 잠금',
        exampleHeadline: '사진에 남지 않은 순간, 문화적 진정성으로 생생하게 연출',
        exampleDetails:
          '다세대 가족 만찬, 4챕터 "비포 & 애프터" 럭셔리 리모델링 및 수평선 고정 사전 분양 저택 워크스루, 병원 개원 초기 진료 장면, 지역 맞춤 안전 규정 훈련까지—모두 실제 인물과 건축물에 정확히 고정해 연출합니다.',
        highlights: [
          '사진이 없는 가족 모임, 지역 전통, 시대 고증 주택을 생생하게 연출',
          '4챕터 "비포 & 애프터" 럭셔리 리모델링 및 수평선·해안선 고정 사전 분양·토지 시각화',
          '얼굴 변형 제로로 구현하는 현지화 직장 안전·장비·환자/고객 케어 장면',
        ],
        metricValue: '라이브 스테이징',
        metricLabel: '문화 & 공간 잠금',
      },
      {
        id: 'heirloom_props',
        shortTab: '소중한 소품 & 가보',
        badge: '사물·가보 연속성',
        title: '의미 있는 소품 고정 — 가족 성경책부터 브랜드 시그니처 장비까지',
        summary:
          '깊은 감동은 모두가 단번에 알아보는 디테일에서 나옵니다. 낡은 가족 성경책, 할아버지의 손목시계, 빈티지 기타, 대표 제품, 안전 장비까지 장면이 바뀌어도 형태가 흔들리지 않게 고정합니다.',
        exampleLabel: '소품 레퍼런스 예시',
        exampleHeadline: '가족 성경책 · 유품 손목시계 · 브랜드 핵심 장비',
        exampleDetails:
          '렌더링 전 연속성 라이브러리에 고정되므로 소품이 장면 도중 뒤틀리거나 사라지는 AI 오류가 발생하지 않습니다.',
        highlights: [
          '소중한 가족 유품 보존 (가족 성경책, 손편지, 시계, 추억의 차)',
          '브랜드 필름의 핵심 제품, 간판, 유니폼 일관성 유지',
          '안전·SOP 교육 모듈을 위한 정확한 장비와 시각 자료 구현',
        ],
        metricValue: '왜곡 제로',
        metricLabel: '소품 및 가보 고정',
      },
      {
        id: 'voice_cloning',
        shortTab: '음성 클로닝 & 멀티트랙',
        badge: '다관점 오디오 & 70+ 언어',
        title: '음성 클로닝, 다관점 오디오 트랙 및 10초 발음 잠금',
        summary:
          '잊지 못할 영화는 화면만큼 소리도 진짜 같아야 합니다. SceneFlow는 음성 클로닝, 인물-음성 매칭, 10초 발음 잠금에 다관점 오디오 트랙을 결합해 동일한 4K 영상 마스터를 영어·일본어·스페인어로 매끄럽게 전환하거나 1인칭 회고록과 3인칭 다큐멘터리 사이를 자유롭게 오갑니다.',
        exampleLabel: '다관점 오디오 예시',
        exampleHeadline: '고정 4K 영상 릴 1편 → 70+ 언어 & 다양한 서사 관점 전환',
        exampleDetails:
          '추가 영상 연산 비용 거의 제로: 모든 영상 프레임을 고정한 채 70개 이상 언어로 성씨, 고향 지명, 전문 약어를 원어민 발음으로 정확히 전달합니다.',
        highlights: [
          '다관점 오디오 트랙: 동일한 4K 릴에서 언어 또는 1인칭/3인칭 목소리를 즉시 전환',
          '10초 음성 발음 잠금을 갖춘 음성 클로닝 및 연령·성격 맞춤 보이스 매칭',
          '방송급 스테레오 믹스: 대사, 스튜디오 나레이터 VO, 환경 SFX, 오케스트라 스코어',
        ],
        metricValue: '70+ 언어',
        metricLabel: '멀티트랙 음성 잠금',
      },
      {
        id: 'directed_4k_master',
        shortTab: '시대 & 문화 타임캡슐',
        badge: '시대·지역 세계관 구축',
        title: '현지화 시대 & 문화 타임캡슐 엔진',
        summary:
          '단순히 메모를 읽어 주는 데 그치지 않습니다. 스토리 엔진이 이야기가 펼쳐진 정확한 연대·도시·국가의 당시 음악, 경제적 이정표, 문화적 상징, 일상의 공기를 자연스럽게 엮어 개인의 기억을 영원히 남을 역사 다큐멘터리로 완성합니다.',
        exampleLabel: '문화 타임캡슐 예시',
        exampleHeadline: '역사를 생생하게 되살리는 시대와 지역의 맥락',
        exampleDetails:
          '연출된 모든 4K 프레임(3840×2160)에 당시의 음악, 지역 경제·문화 맥락, 부드러운 6축 카메라 안무를 결합해 극장 상영용 역사 마스터로 완성합니다.',
        highlights: [
          '해당 연대와 지역의 문화·음악·경제 맥락을 시나리오에 자동 반영',
          '포토리얼 시네마 또는 소장용 일러스트 4K UHD(3840×2160) 마스터 연출',
          '14개 모국어 UI 포털로 운영하며 70+ 언어로 문화 현지화된 4K 마스터 제작',
        ],
        metricValue: '시대 고증 4K',
        metricLabel: '문화 타임캡슐',
      },
    ],
    immediateLift: {
      eyebrow: '즉각적인 가치 상승 · 일반 고객 & 화이트라벨 운영자',
      heading: '영상 편집을 넘어서는 3가지 내장 성장 엔진',
      subtitle:
        '잠긴 동일한 Continuity Vault에서 자동으로 구동되는 실시간 다국어 데모, 실물 인쇄 패키지, 손쉬운 정기 챕터·SOP 업데이트를 제공하세요.',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: '추가 연산 거의 제로',
          title: '다관점 오디오 트랙',
          subtitle: '동일한 4K 영상 · 다양한 목소리 & 언어',
          description:
            '음성 클로닝과 스크립트 지능을 현장에서 바로 시연하세요: 가족 시사회나 고객 영업 미팅에서 단일 4K 영상 릴을 영어·일본어·스페인어로 실시간 전환하거나 1인칭 회고록과 3인칭 다큐멘터리 사이를 즉시 바꿀 수 있습니다.',
          liftHighlight: '언어나 내레이터 관점을 추가해도 추가 영상 연산 비용이 거의 제로',
        },
        {
          id: 'qr_print_companion',
          badge: '100% 자동화 실물 아티팩트',
          title: 'QR 연동 인쇄 컴패니언 PDF',
          subtitle: '기념 화보집 · 매물 브로슈어 · SOP 포스터',
          description:
            '모든 디지털 4K 마스터를 오픈하우스, 칠순·팔순 만찬, 공장 현장에서 활용하는 실물 인쇄물로 변환하세요. 주요 스틸컷, 챕터 요약, 스캔 가능한 QR 영상 링크가 자동으로 편집됩니다.',
          liftHighlight: '부동산 중개인·행사 주최자·교육 담당자에게 프리미엄 가격을 정당화하는 실물 기념품 제공',
        },
        {
          id: 'living_continuity_vault',
          badge: '반복 매출 엔진',
          title: '살아 있는 Continuity Vault',
          subtitle: '가족 챕터·부동산·SOP의 점진적 업데이트',
          description:
            '인물의 얼굴, 목소리, 공간이 영구 고정되어 있어 운영자는 거의 재작업 없이 높은 마진으로 연간 가족 챕터 확장이나 분기별 SOP·매물 업데이트를 판매할 수 있습니다.',
          liftHighlight: '연속성 흔들림 없이 몇 분 만에 새 이정표나 규정 개정 내용을 추가',
          accessNote: '후속 업데이트는 전용 Continuity Library Code로 잠금 해제 (전체 계정 비밀번호 불필요)',
        },
      ],
    },
    comparisonHeading: '왜 $149 장편 4K 시네마는 차원이 다른가',
    comparisonSubtitle: '일회용 단편 AI 클립 생성기와 SceneFlow의 진짜 장편 제작을 비교해 보세요.',
    colDimension: '제작 기준',
    colSlop: '단편 AI 클립 생성기 ("AI 슬롭")',
    colSceneFlow: 'SceneFlow 장편 4K 시네마 ($149)',
    comparisonRows: [
      {
        dimension: '형식, 러닝타임 및 시리즈',
        shortformSlop: '서로 끊어지는 5–15초 클립; 1시간 이상 장편이나 에피소드 서사에는 유지 불가',
        sceneFlowLongform: '1시간+ 장편 영화 또는 멀티 에피소드 시리즈 ($149에 최대 60분 / 360 4K 프레임; 150분 확장 가능) + 1–3분 예고편',
      },
      {
        dimension: '각본 및 공명도',
        shortformSlop: '감동 없는 1줄 프롬프트와 단조로운 전개',
        sceneFlowLongform: '타깃 관객 공명도 90%+로 검증된 전문 다막 각본',
      },
      {
        dimension: '인물 및 연령 재현',
        shortformSlop: '몇 초마다 얼굴이 다른 사람으로 변형됨',
        sceneFlowLongform: '인물 연속성 고정 (28세 할아버지 복원 및 가족 닮은꼴 일치)',
      },
      {
        dimension: '장소 및 소품',
        shortformSlop: '지어낸 가짜 공간과 뒤틀린 사물',
        sceneFlowLongform: '실제 장소 매칭(부동산, 어린 시절 거리) 및 가보 고정(가족 성경책 등)',
      },
      {
        dimension: '음성 및 사운드 믹스',
        shortformSlop: '기계음 TTS, 이름 오발음, 단조로운 스톡 배경음',
        sceneFlowLongform: '음성 클로닝, 인물-음성 매칭, 발음 잠금, SFX 및 오리지널 스코어',
      },
      {
        dimension: '연출 및 최종 마스터',
        shortformSlop: '깜빡임과 깨짐이 심한 일회용 "AI 슬롭"',
        sceneFlowLongform: '아트 디렉션 실사·일러스트 4K 프레임 + 극장급 4K 마스터',
      },
    ],
    storefrontCtaLabel: '$29 장편 블루프린트 시작하기 ($149 4K 영화에 100% 차감)',
    studioPrimaryCtaLabel: '화이트라벨 장편 스튜디오 시작하기',
    studioSecondaryCtaLabel: '$149 라이브 스토어 체험하기',
  },

  de: {
    storefrontEyebrow: 'Langform-4K-Kino · Null AI-Slop',
    studioEyebrow: 'Der uneinholbare Vorsprung Ihres White-Label-Studios',
    storefrontHeadingPrefix: 'Keine 5-Sekunden-KI-Clip-App. Ein echtes ',
    storefrontHeadingAccent: '$149 Langform-4K-Filmstudio.',
    studioHeadingPrefix: 'Warum Kunden $149–$950+ zahlen, statt ',
    studioHeadingAccent: 'Kurzclip-KI-Generatoren zu nutzen.',
    storefrontSubtitle:
      'Gewöhnliche Kurzclip-Generatoren spucken 5-Sekunden-Schnipsel mit verformten Gesichtern und hohlen Prompts aus. Jeder $149 Keepsake-Cinema-Film ist eine inszenierte Mehrkapitel-4K-Langformproduktion mit 90 %+ Zielgruppenresonanz – für echte Menschen, Epochen, Häuser, Erbstücke und Unternehmen.',
    studioSubtitle:
      'Kurzclip-Apps fluten das Netz mit Wegwerf-„AI Slop“. SceneFlow stattet Ihr White-Label-Geschäft mit echtem Langform-4K-Kino aus: 90 %+ Resonanz-Drehbücher, konsistentes De-Aging, exakte Schauplatz- & Requisiten-Treue, Voice-Cloning und kinoreife Master.',
    noSlopBadge: 'NULL AI-SLOP · LANGFORM-4K-KINO',
    trailerSpotlight: {
      badge: '1-Std.+ Spielfilm ODER Mehrteilige Serie + 1–3 Min. Trailer',
      headline: 'Erzählen Sie eine 1-Stunden+-Lebensgeschichte als Spielfilm oder fesselnde Episoden-Serie — mit authentischen Kapitel-Nachstellungen.',
      body: 'Die prägendsten Lebenskapitel wurden nie gefilmt – und Kurzclip-KI-Generatoren brechen nach 15 Sekunden zusammen. SceneFlow erschafft jede Epoche mit fixierten Personen, Orten, Kultur und historischem Kontext neu (bis zu 60 Min. / 360 inszenierte 4K-Frames für $149 inklusive; erweiterbar auf 150 Min. oder 6–8 Episoden), plus ein teilbarer 1–3-Minuten-Kinotrailer.',
      pill1: 'Einzelner 1-Std.+ Spielfilm ODER Mehrteilige Serie',
      pill2: 'Ungefilmte Kapitel mit Epochen- & Kulturkontext rekonstruiert',
      pill3: 'Teilbarer 1–3-Min.-Trailer + Erweiterbar auf 150 Min.',
    },
    pillarsHeading: 'Entdecken Sie die 6 Studio-Handwerkssysteme in jedem Film',
    pillarsHint: 'Wählen Sie eine Funktion, um zu sehen, wie SceneFlow echte Geschichten ohne AI-Slop inszeniert.',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: '90%+ Resonanz-Skripte',
        badge: 'Zielgruppen-Drehbuchkunst',
        title: 'Professionelle Drehbücher mit 90 %+ Zielgruppenresonanz',
        summary:
          'Wir werfen niemals einen Einzeiler in einen Videogenerator. Jeder Film beginnt mit einem mehraktigen Drehbuch für Dramaturgie, Timing und 90 %+ Zielgruppenresonanz – ob zu Tränen rührender 80. Geburtstag, Luxusimmobilien-Verkauf, Klinikvertrauen oder Mitarbeiter-Onboarding.',
        exampleLabel: 'Regie-Blueprint-Beispiel',
        exampleHeadline: 'Akt-I-Hook → Epochenreise → Emotionaler Höhepunkt → Vermächtnis-Finale',
        exampleDetails:
          'Jeder Beat wird vor dem Rendern gegen Ihre konkrete Zielgruppe (Familien, Käufer, Patienten oder neue Mitarbeiter) bewertet – ohne leere Floskeln.',
        highlights: [
          'Echter 30–150-Min.-Mehrkapitel-Bogen (bis 60 Min. / 360 Frames für $149)',
          'Bewertet und verfeinert auf 90 %+ emotionale & geschäftliche Resonanz',
          'Inkl. 1–3-Min.-Kinotrailer & interaktivem Storyboard-Blueprint',
        ],
        metricValue: '90%+',
        metricLabel: 'Zielgruppenresonanz',
      },
      {
        id: 'character_aging',
        shortTab: 'Opa mit 28 & Familie',
        badge: 'Identitäts- & Epochen-Engine',
        title: 'Erschaffen Sie Großvater mit 28 Jahren & verbinden Sie Generationen',
        summary:
          'Sie haben nur ein aktuelles Porträt von Opa mit 80? Unsere Continuity-Engine generiert sein authentisches 28-jähriges Ich für Szenen der 1970er, harmonisiert Familienähnlichkeiten über Generationen hinweg und hält jedes Gesicht über den gesamten Film stabil.',
        exampleLabel: 'Continuity-Lock-Beispiel',
        exampleHeadline: '1 aktuelles Foto → Authentisch mit 28 · 52 · Heute',
        exampleDetails:
          'Dieselben Gesichtszüge und dieselbe Wärme begleiten die Geschichte von der Jugend über Karriere-Meilensteine bis heute – ohne Gesichtsverfremdung zwischen Schnitten.',
        highlights: [
          'Authentische Verjüngung & Alterung aus normalen Handyfotos',
          'Generationenübergreifende Ähnlichkeit bei Eltern, Kindern & Enkeln',
          'Konstante Gründer- & Trainer-Identität in Marken- und Schulungsfilmen',
        ],
        metricValue: '100%',
        metricLabel: 'Gesicherte Identität',
      },
      {
        id: 'location_matching',
        shortTab: 'Lebendige Szenen & Kultur-Staging',
        badge: 'Kontinuitätsgesichertes Staging',
        title: 'Kontinuitätsgesicherte aktive Szenen & kulturelles Staging',
        summary:
          'Fehlen Fotos aus den wichtigsten Kapiteln? Über Ihren Continuity Vault inszeniert SceneFlow lebendige Familienfeiern, regionale Traditionen, epochengerechte Häuser sowie virtuelle Innenraum- und Möbel-Updates – wobei echte Gesichter, Kleidung und Erbstücke unverwechselbar fixiert bleiben.',
        exampleLabel: 'Aktives Staging & Umgebungs-Lock',
        exampleHeadline: 'Unfotografierte Momente, kulturell authentisch inszeniert',
        exampleDetails:
          'Inszenieren Sie lebhafte Mehrgenerationen-Dinner, 4-Kapitel-„Vorher & Nachher“-Luxussanierungen und horizontfixierte Pre-Construction-Anwesen-Walkthroughs, Behandlungsszenen aus der Klinik-Gründerzeit oder regionale Arbeitssicherheits-Übungen – alles fest an Ihre reale Besetzung und Architektur gebunden.',
        highlights: [
          'Inszeniert unfotografierte Familienfeiern, regionale Bräuche & epochengerechte Häuser',
          '„Vorher & Nachher“-Luxussanierungen in 4 Kapiteln & horizont-/küstenfixierte Pre-Construction-Grundstücksvisualisierung',
          'Lokalisierte Arbeitsplatzsicherheits-, Geräte- & Patienten-/Kundenbetreuungsszenen ohne Gesichtsdrift',
        ],
        metricValue: 'Aktives Staging',
        metricLabel: 'Kultur- & Raum-Lock',
      },
      {
        id: 'heirloom_props',
        shortTab: 'Erbstücke & Requisiten',
        badge: 'Objekt- & Erbstück-Kontinuität',
        title: 'Verankern Sie besondere Gegenstände — von der Familienbibel bis zur Markenausrüstung',
        summary:
          'Großes Erzählen lebt von Details, die jeder sofort erkennt. Unsere Objekt-Kontinuität sichert persönliche Stücke wie eine abgegriffene Familienbibel, Großvaters Uhr, eine Gitarre, Kernprodukte oder Sicherheitsausrüstung Szene für Szene.',
        exampleLabel: 'Requisiten-Referenzbeispiel',
        exampleHeadline: 'Familienbibel · Erbstück-Uhr · Marken-Equipment',
        exampleDetails:
          'Da alle Objekte vorab in Ihrer Continuity-Bibliothek verankert werden, verformen sie sich nie und verschwinden nicht plötzlich im Bild.',
        highlights: [
          'Bewahrt geschätzte Erbstücke (Familienbibel, Briefe, Schmuck, Oldtimer)',
          'Sichert Produkte, Logos & Arbeitskleidung in Markenfilmen',
          'Präzise Geräte & Hilfsmittel für Compliance- und SOP-Schulungen',
        ],
        metricValue: 'Null Drift',
        metricLabel: 'Objekt- & Erbstück-Lock',
      },
      {
        id: 'voice_cloning',
        shortTab: 'Voice-Cloning & Mehrspur-Audio',
        badge: 'Multiperspektiv-Audio & 70+ Sprachen',
        title: 'Voice-Cloning, Multiperspektiv-Audiospuren & 10-Sek.-Aussprache-Lock',
        summary:
          'Ein unvergesslicher Film klingt so echt, wie er aussieht. SceneFlow verbindet Voice-Cloning, bildgerechte Stimmbesetzung und einen 10-Sekunden-Aussprache-Lock mit Multiperspektiv-Audiospuren – und schaltet denselben 4K-Bildmaster nahtlos zwischen Englisch, Japanisch und Spanisch oder zwischen Ich-Memoiren und Doku-Erzähler um.',
        exampleLabel: 'Multiperspektiv-Audio-Beispiel',
        exampleHeadline: '1 gesicherter 4K-Bildmaster → 70+ Sprachen & mehrere Erzählperspektiven',
        exampleDetails:
          'Nahezu null zusätzlicher Video-Rechenaufwand: Jeder Bildframe bleibt fixiert, während Familiennamen, Heimatorte und Fachkürzel in über 70 Sprachen muttersprachlich korrekt gesprochen werden.',
        highlights: [
          'Multiperspektiv-Audiospuren: Sprachen oder Ich-/Erzählerstimmen auf demselben 4K-Reel umschalten',
          'Voice-Cloning & alters-/charaktergerechte Stimmen mit 10-Sekunden-Phonetik-Lock',
          'Broadcast-Stereomix: Dialoge, Studio-Erzähler, Umgebungs-SFX & dynamischer Orchester-Score',
        ],
        metricValue: '70+ Sprachen',
        metricLabel: 'Mehrspur-Stimm-Lock',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'Epochen- & Kultur-Zeitkapsel',
        badge: 'Zeitgeschichtliches & regionales World-Building',
        title: 'Lokalisierte Epochen- & Kultur-Zeitkapsel-Engine',
        summary:
          'Wir lesen Ihre Notizen nicht bloß vor – unsere Story-Engine verwebt authentische Musik, wirtschaftliche Meilensteine, kulturelle Bezugspunkte und den Alltagsgeist genau des Jahrzehnts, der Stadt und des Landes Ihrer Geschichte und macht aus privaten Erinnerungen eine bleibende historische Dokumentation.',
        exampleLabel: 'Kultur-Zeitkapsel-Beispiel',
        exampleHeadline: 'Zeit- & Regionalkontext, der Geschichte lebendig macht',
        exampleDetails:
          'Jeder inszenierte 4K-Frame (3840×2160) verbindet authentische Dekaden-Musik, regionalen Wirtschafts- und Kulturkontext sowie eine sanfte 6-Wege-Kamerachoreografie zu einem kinoreifen historischen Master.',
        highlights: [
          'Automatischer Dekaden- & Regionalkontext aus Kultur, Musik und Wirtschaft im Drehbuch verwoben',
          'Fotorealistisches Kino ODER illustrierte 4K-UHD-Masterchoreografie (3840×2160)',
          'Betrieb in 14 nativen UI-Portalen für kulturell lokalisierte 4K-Master in über 70 Sprachen',
        ],
        metricValue: 'Epochentreu 4K',
        metricLabel: 'Kultur-Zeitkapsel',
      },
    ],
    immediateLift: {
      eyebrow: 'Sofortiger Mehrwert · Kunden & White-Label-Betreiber',
      heading: 'Drei integrierte Wachstumsmotoren jenseits des Videoschnitts',
      subtitle:
        'Liefern Sie Live-Demos in mehreren Sprachen, greifbare Druckprodukte und mühelose laufende Kapitel- oder SOP-Updates – automatisch gespeist aus demselben gesicherten Continuity Vault.',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: 'Nahezu null Zusatz-Rechenleistung',
          title: 'Multiperspektiv-Audiospuren',
          subtitle: 'Dieselbe 4K-Optik · Mehrere Stimmen & Sprachen',
          description:
            'Präsentieren Sie Voice-Cloning und Drehbuch-Intelligenz sofort live: Schalten Sie ein einziges 4K-Reel direkt zwischen Englisch, Japanisch und Spanisch – oder zwischen Ich-Memoiren und Doku-Perspektive – mitten in der Familienvorschau oder im Verkaufsgespräch.',
          liftHighlight: 'Nahezu null zusätzlicher Video-Rechenaufwand pro Sprache oder Erzählperspektive',
        },
        {
          id: 'qr_print_companion',
          badge: '100 % automatisiertes Begleitprodukt',
          title: 'QR-verknüpftes Print-Begleit-PDF',
          subtitle: 'Erinnerungsbuch · Immobilien-Exposé · SOP-Poster',
          description:
            'Verwandeln Sie jeden digitalen 4K-Master in ein greifbares Begleitmedium für Besichtigungen, runde Geburtstage oder Werkshallen – automatisch gestaltet mit Filmstills, Kapitelzusammenfassungen und scanbaren QR-Videolinks.',
          liftHighlight: 'Gibt Maklern, Gastgebern & Trainingsleitern ein physisches Andenken, das Premium-Preise rechtfertigt',
        },
        {
          id: 'living_continuity_vault',
          badge: 'Motor für wiederkehrende Umsätze',
          title: 'Lebendiger Continuity Vault',
          subtitle: 'Schrittweise Kapitel-, Immobilien- & SOP-Updates',
          description:
            'Da Gesichter, Stimmen und Schauplätze dauerhaft fixiert bleiben, können Betreiber jährliche Familienkapitel-Erweiterungen oder quartalsweise SOP- und Immobilien-Updates mit hohen Margen und minimalem Aufwand verkaufen.',
          liftHighlight: 'Neue Meilensteine oder Compliance-Anpassungen in Minuten ohne Kontinuitätsverlust ergänzen',
          accessNote: 'Folge-Updates werden über einen privaten Continuity Library Code freigeschaltet (ohne vollständiges Kontopasswort)',
        },
      ],
    },
    comparisonHeading: 'Warum $149 Langform-4K-Kino in einer eigenen Liga spielt',
    comparisonSubtitle: 'Vergleichen Sie Wegwerf-KI-Kurzclips mit einer echten SceneFlow-Langformproduktion.',
    colDimension: 'Produktionsstandard',
    colSlop: 'Kurzclip-KI-Generatoren („AI Slop“)',
    colSceneFlow: 'SceneFlow Langform-4K-Kino ($149)',
    comparisonRows: [
      {
        dimension: 'Format, Laufzeit & Serie',
        shortformSlop: '5–15 Sek. unzusammenhängende Clips; untauglich für 1-Std.+ Filme oder Serien',
        sceneFlowLongform: '1-Std.+ Spielfilm ODER Mehrteilige Serie (bis zu 60 Min. / 360 4K-Frames für $149; erweiterbar auf 150 Min.) + 1–3 Min. Trailer',
      },
      {
        dimension: 'Drehbuch & Resonanz',
        shortformSlop: 'Flache Einzeiler-Prompts ohne emotionales Tempo',
        sceneFlowLongform: 'Mehraktiges Profi-Drehbuch mit 90 %+ Zielgruppenresonanz',
      },
      {
        dimension: 'Personen & Alterung',
        shortformSlop: 'Gesichter mutieren alle paar Sekunden zu Fremden',
        sceneFlowLongform: 'Feste Kontinuität (z. B. Großvater mit 28 & Familienähnlichkeit)',
      },
      {
        dimension: 'Orte & Requisiten',
        shortformSlop: 'Halluzinierte Standardräume und verzerrte Objekte',
        sceneFlowLongform: 'Exakte Orte (Immobilien, Kindheitsstraßen) & Erbstücke (Familienbibel usw.)',
      },
      {
        dimension: 'Stimmen & Tonmix',
        shortformSlop: 'Roboterstimmen, falsch ausgesprochene Namen, Stock-Loops',
        sceneFlowLongform: 'Voice-Cloning, Stimm-Bild-Match, Aussprache-Lock, SFX & Score',
      },
      {
        dimension: 'Bildregie & Master',
        shortformSlop: 'Flackernde Artefakte und unansehnlicher „AI Slop“',
        sceneFlowLongform: 'Inszenierte realistische oder illustrierte 4K-Beats + Kinomaster',
      },
    ],
    storefrontCtaLabel: '$29 Langform-Blueprint starten (voll auf den $149 4K-Film anrechenbar)',
    studioPrimaryCtaLabel: 'Eigenes White-Label-Langformstudio starten',
    studioSecondaryCtaLabel: 'Live-$149-Storefront erleben',
  },

  fr: {
    storefrontEyebrow: 'Cinéma 4K Long Format · Zéro « AI Slop »',
    studioEyebrow: 'L’avantage décisif de votre studio en marque blanche',
    storefrontHeadingPrefix: 'Pas une appli de clips de 5 secondes. Un vrai ',
    storefrontHeadingAccent: 'Studio de Cinéma 4K Long Format à $149.',
    studioHeadingPrefix: 'Pourquoi les clients paient $149–$950+ au lieu d’utiliser des ',
    studioHeadingAccent: 'générateurs de clips IA courts.',
    storefrontSubtitle:
      'Les générateurs courts produisent des clips de 5 secondes aux visages changeants et aux textes creux. Chaque film Keepsake Cinema à $149 est une production 4K long format mise en scène en chapitres et calibrée pour 90 %+ de résonance — donnant vie aux proches, aux époques, aux lieux, aux souvenirs et aux entreprises.',
    studioSubtitle:
      'Les applis courtes inondent le web de contenu jetable (« AI slop »). SceneFlow dote votre studio en marque blanche d’un véritable cinéma 4K long format : scénarios à 90 %+ de résonance, rajeunissement cohérent des visages, fidélité des lieux et objets, clonage vocal et masters dignes du grand écran.',
    noSlopBadge: 'ZÉRO AI SLOP · CINÉMA 4K LONG FORMAT',
    trailerSpotlight: {
      badge: 'Long Métrage de +1 h OU Série Multi-Épisodes + Bande-Annonce 1–3 min',
      headline: 'Racontez une histoire de vie de plus d’1 heure en long métrage ou en série captivante — avec des reconstitutions fidèles de chaque chapitre.',
      body: 'Les chapitres les plus marquants d’une vie n’ont jamais été filmés — et les générateurs de clips IA courts s’effondrent au-delà de 15 secondes. SceneFlow recrée chaque époque avec des visages, lieux, repères culturels et contextes historiques verrouillés (jusqu’à 60 min / 360 plans 4K mis en scène inclus à $149 ; extensible à 150 min ou 6–8 épisodes), plus une bande-annonce cinéma de 1–3 min prête à partager.',
      pill1: 'Long Métrage Unique de +1 h OU Série Multi-Épisodes',
      pill2: 'Chapitres Non Filmés Recréés Avec Contexte d’Époque et Culturel',
      pill3: 'Bande-Annonce Partageable 1–3 min + Extensible à 150 min',
    },
    pillarsHeading: 'Explorez les 6 systèmes de studio au cœur de chaque film',
    pillarsHint: 'Sélectionnez chaque capacité pour découvrir comment SceneFlow met en scène de vraies histoires sans « AI slop ».',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: 'Scénarios 90 %+ Résonance',
        badge: 'Écriture calibrée pour votre public',
        title: 'Scénarios professionnels notés pour 90 %+ de résonance auprès du public',
        summary:
          'Nous n’injectons jamais une simple phrase dans un générateur vidéo. Chaque film démarre par un scénario en plusieurs actes calibré pour l’arc émotionnel, le rythme et 90 %+ de résonance — qu’il s’agisse d’émouvoir une famille pour des 80 ans, de convaincre des acquéreurs immobiliers, de rassurer des patients ou de former des équipes.',
        exampleLabel: 'Exemple de structure de réalisation',
        exampleHeadline: 'Accroche Acte I → Traversée des époques → Climax émotionnel → Final mémorable',
        exampleDetails:
          'Chaque séquence est évaluée par rapport à votre audience cible (famille, acheteurs, patients ou recrues) avant tout rendu — zéro remplissage.',
        highlights: [
          'Véritable récit chapitré de 30–150 min (jusqu’à 60 min / 360 plans à $149)',
          'Noté et affiné pour 90 %+ de résonance émotionnelle et commerciale',
          'Bande-annonce 1–3 min + Storyboard Blueprint interactif inclus',
        ],
        metricValue: '90 %+',
        metricLabel: 'Résonance du public cible',
      },
      {
        id: 'character_aging',
        shortTab: 'Grand-père à 28 ans & Famille',
        badge: 'Moteur d’identité & d’époques',
        title: 'Recréez votre grand-père à 28 ans et liez les ressemblances familiales',
        summary:
          'Vous n’avez qu’un portrait récent de votre grand-père à 80 ans ? Le moteur de continuité SceneFlow recrée fidèlement son visage à 28 ans pour les années 1970, harmonise les traits entre générations et verrouille chaque visage sur tout le film.',
        exampleLabel: 'Exemple de continuité',
        exampleHeadline: '1 photo actuelle → Fidèle à 28 ans · 52 ans · Aujourd’hui',
        exampleDetails:
          'La même physionomie et la même chaleur traversent les décennies sans jamais se transformer en inconnu d’un plan à l’autre.',
        highlights: [
          'Rajeunissement et vieillissement crédibles depuis de simples photos mobile',
          'Ressemblances familiales cohérentes entre parents, enfants et petits-enfants',
          'Identité constante du fondateur ou formateur pour vos films d’entreprise',
        ],
        metricValue: '100 %',
        metricLabel: 'Identité verrouillée',
      },
      {
        id: 'location_matching',
        shortTab: 'Scènes actives & Mise en scène culturelle',
        badge: 'Mise en scène à continuité verrouillée',
        title: 'Scènes actives et mise en scène culturelle à continuité verrouillée',
        summary:
          'Il manque des photos des plus grands chapitres ? Grâce à votre Continuity Vault, SceneFlow met en scène des réunions de famille vivantes, des traditions régionales, des intérieurs fidèles à l’époque et des rénovations virtuelles de mobilier — tout en verrouillant vos vrais visages, tenues et souvenirs de famille.',
        exampleLabel: 'Mise en scène active & verrou d’environnement',
        exampleHeadline: 'Moments jamais photographiés, mis en scène avec authenticité culturelle',
        exampleDetails:
          'Mettez en scène des dîners multigénérationnels animés, des rénovations de luxe « Avant & Après » en 4 chapitres et des visites pré-construction à horizon verrouillé, des soins d’époque en clinique ou des exercices régionaux de conformité au travail — le tout verrouillé sur vos vrais visages et votre architecture.',
        highlights: [
          'Met en scène réunions familiales non photographiées, traditions régionales & maisons d’époque',
          'Rénovations de luxe « Avant & Après » en 4 chapitres & visualisation pré-construction sur terrain verrouillée sur l’horizon et le littoral',
          'Scènes localisées de sécurité au travail, équipements & accueil patients/clients sans dérive faciale',
        ],
        metricValue: 'Scène active',
        metricLabel: 'Verrou culturel & spatial',
      },
      {
        id: 'heirloom_props',
        shortTab: 'Objets & Souvenirs clés',
        badge: 'Continuité des objets',
        title: 'Verrouillez les objets chers — De la Bible familiale aux produits phares',
        summary:
          'Les grandes histoires vivent dans les détails que chacun reconnaît aussitôt. La continuité d’objets fixe les pièces précieuses — Bible de famille, montre ancienne, guitare, produit signature ou équipement de sécurité — plan après plan.',
        exampleLabel: 'Exemple d’accessoires',
        exampleHeadline: 'Bible familiale · Montre de famille · Équipement signature',
        exampleDetails:
          'Ancrés dans votre bibliothèque de continuité avant le rendu, les objets ne se déforment jamais et ne disparaissent pas en cours de scène.',
        highlights: [
          'Préserve les souvenirs de famille (Bible familiale, lettres, bijoux, voitures)',
          'Verrouille produits, enseignes et tenues dans vos films de marque',
          'Équipements exacts pour les modules de conformité et de sécurité SOP',
        ],
        metricValue: 'Zéro dérive',
        metricLabel: 'Continuité des objets',
      },
      {
        id: 'voice_cloning',
        shortTab: 'Clonage vocal & Multipiste',
        badge: 'Audio multiperspective & 70+ langues',
        title: 'Clonage vocal, pistes audio multiperspectives & verrou de prononciation 10 s',
        summary:
          'Un film inoubliable s’écoute autant qu’il se regarde. SceneFlow associe clonage vocal, accord voix-image et verrou phonétique de 10 secondes aux Pistes Audio Multiperspectives — basculant exactement le même master visuel 4K entre anglais, japonais et espagnol, ou entre mémoires à la 1re personne et documentaire à la 3e personne.',
        exampleLabel: 'Exemple d’audio multiperspective',
        exampleHeadline: '1 bobine visuelle 4K verrouillée → 70+ langues & plusieurs voix narratives',
        exampleDetails:
          'Quasiment zéro calcul vidéo supplémentaire : chaque image reste figée tout en offrant une prononciation native des noms de famille, villes d’origine et sigles métier dans plus de 70 langues.',
        highlights: [
          'Pistes Audio Multiperspectives : changez de langue ou de voix 1re/3e personne sur la même bobine 4K',
          'Clonage vocal et voix assorties à l’âge/personnalité avec verrou phonétique de 10 secondes',
          'Mixage stéréo broadcast : dialogues, narrateur studio, SFX ambiants & partition orchestrale',
        ],
        metricValue: '70+ langues',
        metricLabel: 'Verrou vocal multipiste',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'Capsule temporelle & culturelle',
        badge: 'Reconstitution d’époque & régionale',
        title: 'Moteur localisé d’époque et capsule temporelle culturelle',
        summary:
          'Nous ne nous contentons pas de relire vos notes — notre moteur narratif tisse la musique authentique, les repères économiques, les références culturelles et l’atmosphère quotidienne de la décennie, de la ville et du pays exacts de votre histoire, transformant des souvenirs intimes en documentaire historique durable.',
        exampleLabel: 'Exemple de capsule culturelle',
        exampleHeadline: 'Un contexte historique et régional qui redonne vie au passé',
        exampleDetails:
          'Chaque plan 4K dirigé (3840×2160) associe musique d’époque authentique, contexte économique et culturel local et chorégraphie caméra fluide sur 6 axes dans un master historique prêt pour le grand écran.',
        highlights: [
          'Contexte culturel, musical et économique de la décennie et de la région intégré au scénario',
          'Cinéma photoréaliste OU direction illustrée patrimoniale en 4K UHD (3840×2160)',
          'Pilotez en 14 portails natifs tout en produisant des masters 4K localisés en 70+ langues',
        ],
        metricValue: '4K d’époque',
        metricLabel: 'Capsule culturelle',
      },
    ],
    immediateLift: {
      eyebrow: 'Impact immédiat · Particuliers & opérateurs marque blanche',
      heading: 'Trois moteurs de croissance intégrés au-delà du montage vidéo',
      subtitle:
        'Offrez des démos multilingues en direct, des supports imprimés tangibles et des mises à jour récurrentes de chapitres ou SOP sans effort — alimentés automatiquement par le même Continuity Vault verrouillé.',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: 'Quasiment zéro calcul en plus',
          title: 'Pistes Audio Multiperspectives',
          subtitle: 'Mêmes visuels 4K · Plusieurs voix & langues',
          description:
            'Démontrez instantanément le clonage vocal et l’intelligence scénaristique : basculez en direct une seule bobine 4K entre anglais, japonais et espagnol — ou entre mémoires à la 1re personne et documentaire à la 3e personne — lors d’une projection familiale ou d’un appel commercial.',
          liftHighlight: 'Quasiment zéro calcul vidéo supplémentaire par langue ou point de vue narratif ajouté',
        },
        {
          id: 'qr_print_companion',
          badge: 'Support 100 % automatisé',
          title: 'PDF compagnon imprimable avec QR',
          subtitle: 'Livre souvenir · Fiche immobilière · Affiche SOP',
          description:
            'Transformez chaque master numérique 4K en un objet physique tangible pour les visites libres, dîners d’anniversaire ou ateliers — mis en page automatiquement avec captures de plans, résumés de chapitres et liens vidéo QR scannables.',
          liftHighlight: 'Offre aux agents, hôtes et responsables formation un souvenir matériel qui justifie des tarifs premium',
        },
        {
          id: 'living_continuity_vault',
          badge: 'Moteur de revenus récurrents',
          title: 'Continuity Vault vivant',
          subtitle: 'Mises à jour progressives de chapitres, biens & SOP',
          description:
            'Parce que les visages, les voix et les décors restent verrouillés en permanence, les opérateurs peuvent vendre des extensions annuelles familiales ou des mises à jour trimestrielles SOP et immobilières à forte marge et presque sans retouche.',
          liftHighlight: 'Ajoutez de nouvelles étapes ou révisions réglementaires en quelques minutes sans perte de continuité',
          accessNote: 'Les mises à jour ultérieures se déverrouillent via un Continuity Library Code privé (sans mot de passe complet du compte)',
        },
      ],
    },
    comparisonHeading: 'Pourquoi le Cinéma 4K Long Format à $149 change totalement d’univers',
    comparisonSubtitle: 'Comparez les générateurs de clips IA jetables à une vraie production long format SceneFlow.',
    colDimension: 'Standard de production',
    colSlop: 'Générateurs de clips IA (« AI Slop »)',
    colSceneFlow: 'SceneFlow Cinéma 4K Long Format ($149)',
    comparisonRows: [
      {
        dimension: 'Format, Durée & Séries',
        shortformSlop: 'Clips isolés de 5–15 s ; intenables pour un récit de +1 h ou une série épisodique',
        sceneFlowLongform: 'Long métrage de +1 h OU Série multi-épisodes (jusqu’à 60 min / 360 plans 4K à $149 ; extensible à 150 min) + bande-annonce 1–3 min',
      },
      {
        dimension: 'Scénario & Résonance',
        shortformSlop: 'Prompt générique d’une ligne au rythme plat',
        sceneFlowLongform: 'Scénario pro multi-actes calibré pour 90 %+ de résonance',
      },
      {
        dimension: 'Visages & Âges',
        shortformSlop: 'Visages qui changent d’identité toutes les 4 secondes',
        sceneFlowLongform: 'Continuité verrouillée (grand-père à 28 ans & ressemblances familiales)',
      },
      {
        dimension: 'Lieux & Objets',
        shortformSlop: 'Pièces inventées et objets déformés',
        sceneFlowLongform: 'Lieux exacts (immobilier, rues d’enfance) & souvenirs (Bible familiale, etc.)',
      },
      {
        dimension: 'Voix & Mixage',
        shortformSlop: 'Voix robotiques, noms écorchés et boucles musicales banales',
        sceneFlowLongform: 'Clonage vocal, accord voix-image, verrou phonétique, SFX & musique',
      },
      {
        dimension: 'Direction & Master',
        shortformSlop: 'Scintillements et rendu jetable « AI slop »',
        sceneFlowLongform: 'Plans 4K réalistes ou illustrés dirigés + master prêt pour le grand écran',
      },
    ],
    storefrontCtaLabel: 'Démarrer mon Blueprint Long Format à $29 (déduit du film 4K à $149)',
    studioPrimaryCtaLabel: 'Lancer votre studio long format en marque blanche',
    studioSecondaryCtaLabel: 'Découvrir la vitrine live à $149',
  },

  it: {
    storefrontEyebrow: 'Cinema 4K Lungometraggio · Zero "AI Slop"',
    studioEyebrow: 'Il vantaggio decisivo del tuo studio White-Label',
    storefrontHeadingPrefix: 'Non un’app di clip IA da 5 secondi. Un vero ',
    storefrontHeadingAccent: 'Studio Cinema 4K Lungometraggio da $149.',
    studioHeadingPrefix: 'Perché i clienti pagano $149–$950+ invece di usare ',
    studioHeadingAccent: 'generatori brevi di clip IA.',
    storefrontSubtitle:
      'I generatori brevi producono clip da 5 secondi con volti deformati e testi vuoti. Ogni film Keepsake Cinema da $149 è una produzione 4K longform diretta a capitoli e calibrata per oltre il 90% di risonanza emotiva — dando vita a persone reali, epoche, case, cimeli e aziende.',
    studioSubtitle:
      'Le app di clip brevi inondano il web di "AI slop" usa e getta. SceneFlow dota il tuo studio white-label di vero cinema 4K longform: sceneggiature con 90%+ di risonanza, ringiovanimento coerente dei volti, fedeltà di luoghi e oggetti, clonazione vocale e master pronti per il grande schermo.',
    noSlopBadge: 'ZERO AI SLOP · CINEMA 4K LONGFORM',
    trailerSpotlight: {
      badge: 'Lungometraggio da 1+ Ora O Serie Multi-Episodio + Trailer 1–3 Min',
      headline: 'Racconta una storia di vita da oltre 1 ora come lungometraggio o serie a episodi tutta da guardare — con ricostruzioni autentiche di ogni capitolo.',
      body: 'I capitoli più decisivi della vita non sono mai stati filmati — e i generatori di clip IA brevi cedono dopo 15 secondi. SceneFlow ricrea ogni epoca con volti, luoghi, cultura e contesto storico bloccati (fino a 60 min / 360 fotogrammi 4K diretti inclusi a $149; estendibile a 150 min o 6–8 episodi), più un trailer cinematografico condivisibile da 1–3 min.',
      pill1: 'Lungometraggio Unico da 1+ Ora O Serie Multi-Episodio',
      pill2: 'Capitoli Mai Filmati Ricreati con Contesto Storico e Culturale',
      pill3: 'Trailer Condivisibile 1–3 Min + Estendibile a 150 Min',
    },
    pillarsHeading: 'Scopri i 6 sistemi artigianali di studio dentro ogni film',
    pillarsHint: 'Seleziona una capacità per vedere come SceneFlow dirige storie reali senza "AI slop".',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: 'Sceneggiature 90%+ Risonanza',
        badge: 'Scrittura calibrata sul pubblico',
        title: 'Sceneggiature professionali con oltre il 90% di risonanza sul pubblico',
        summary:
          'Non inseriamo mai un prompt di una riga in un generatore video. Ogni film nasce da una sceneggiatura in più atti calibrata per arco emotivo, ritmo e 90%+ di risonanza — per commuovere una famiglia agli 80 anni, convincere acquirenti immobiliari, creare fiducia in clinica o formare il personale.',
        exampleLabel: 'Esempio di struttura registica',
        exampleHeadline: 'Apertura Atto I → Viaggio nelle epoche → Climax emotivo → Finale indimenticabile',
        exampleDetails:
          'Ogni passaggio è valutato sul tuo pubblico specifico (famiglie, acquirenti, pazienti o neoassunti) prima del rendering — eliminando narrazioni piatte.',
        highlights: [
          'Vero arco narrativo in capitoli da 30–150 min (fino a 60 min / 360 frame a $149)',
          'Valutato e rifinito per 90%+ di risonanza emotiva e di conversione',
          'Include trailer cinematografico 1–3 min + Storyboard Blueprint interattivo',
        ],
        metricValue: '90%+',
        metricLabel: 'Risonanza sul pubblico',
      },
      {
        id: 'character_aging',
        shortTab: 'Nonno a 28 anni & Famiglia',
        badge: 'Motore di identità ed epoche',
        title: 'Ricrea il nonno a 28 anni e armonizza i lineamenti di famiglia',
        summary:
          'Hai solo una foto recente del nonno a 80 anni? Il motore di continuità SceneFlow ricrea il suo volto autentico a 28 anni per le scene degli anni ’70, mantiene le somiglianze tra parenti e blocca ogni viso per tutto il film.',
        exampleLabel: 'Esempio di continuità',
        exampleHeadline: '1 foto attuale → Autentico a 28 anni · 52 anni · Oggi',
        exampleDetails:
          'Gli stessi lineamenti e lo stesso calore attraversano i decenni senza mai trasformarsi in sconosciuti tra un’inquadratura e l’altra.',
        highlights: [
          'Ringiovanimento e invecchiamento naturali da normali foto da smartphone',
          'Somiglianze coerenti tra coniugi, figli e nipoti attraverso le generazioni',
          'Identità costante di fondatori e formatori per film aziendali e SOP',
        ],
        metricValue: '100%',
        metricLabel: 'Identità bloccata',
      },
      {
        id: 'location_matching',
        shortTab: 'Scene attive & Allestimento culturale',
        badge: 'Staging a continuità bloccata',
        title: 'Scene attive e allestimento culturale a continuità bloccata',
        summary:
          'Mancano foto dei capitoli più importanti? Usando il tuo Continuity Vault, SceneFlow mette in scena riunioni di famiglia vivaci, tradizioni regionali, case fedeli all’epoca e restyling virtuali di interni e arredi — mantenendo saldamente bloccati volti reali, abiti e cimeli.',
        exampleLabel: 'Staging attivo e blocco ambientale',
        exampleHeadline: 'Momenti mai fotografati, messi in scena con autenticità culturale',
        exampleDetails:
          'Metti in scena cene multigenerazionali vivaci, ristrutturazioni di lusso "Prima e Dopo" in 4 capitoli e walkthrough pre-costruzione con orizzonte bloccato, scene storiche di cura in clinica o esercitazioni locali di sicurezza sul lavoro — tutto ancorato al tuo cast e alla tua architettura reali.',
        highlights: [
          'Mette in scena feste familiari non fotografate, tradizioni regionali e case d’epoca',
          'Ristrutturazioni di lusso "Prima e Dopo" in 4 capitoli e visualizzazione terreni pre-costruzione con orizzonte e costa bloccati',
          'Scene localizzate di sicurezza sul lavoro, attrezzature e cura pazienti/clienti senza deriva dei volti',
        ],
        metricValue: 'Staging attivo',
        metricLabel: 'Blocco culturale e spazi',
      },
      {
        id: 'heirloom_props',
        shortTab: 'Oggetti & Cimeli cari',
        badge: 'Continuità di oggetti e cimeli',
        title: 'Blocca oggetti preziosi — Dalla Bibbia di famiglia ai prodotti del brand',
        summary:
          'Le grandi storie vivono nei dettagli che tutti riconoscono all’istante. La continuità degli oggetti mantiene coerenti la Bibbia di famiglia, l’orologio del nonno, la chitarra vintage, i prodotti di punta o i dispositivi di sicurezza scena dopo scena.',
        exampleLabel: 'Esempio di oggetti',
        exampleHeadline: 'Bibbia di famiglia · Orologio storico · Attrezzatura del brand',
        exampleDetails:
          'Ancorati nella Libreria di Continuità prima del rendering, gli oggetti non si distorcono né svaniscono mai a metà scena.',
        highlights: [
          'Preserva cimeli di famiglia (Bibbia, lettere, gioielli, auto d’epoca)',
          'Blocca prodotti, insegne e divise nei film dedicati al brand',
          'Attrezzature e strumenti precisi per corsi di sicurezza e SOP',
        ],
        metricValue: 'Zero errori',
        metricLabel: 'Continuità degli oggetti',
      },
      {
        id: 'voice_cloning',
        shortTab: 'Clonazione voce & Multitraccia',
        badge: 'Audio multiprospettiva & 70+ lingue',
        title: 'Clonazione vocale, tracce audio multiprospettiva e blocco pronuncia in 10s',
        summary:
          'Un film indimenticabile suona vero quanto sembra. SceneFlow unisce clonazione vocale, abbinamento voce-volto e blocco fonetico in 10 secondi alle Tracce Audio Multiprospettiva — passando senza stacchi lo stesso master visivo 4K tra inglese, giapponese e spagnolo, o tra memorie in 1ª persona e documentario in 3ª persona.',
        exampleLabel: 'Esempio di audio multiprospettiva',
        exampleHeadline: '1 bobina visiva 4K bloccata → 70+ lingue e più prospettive narrative',
        exampleDetails:
          'Praticamente zero calcolo video aggiuntivo: mantieni ogni fotogramma bloccato offrendo pronuncia madrelingua per cognomi, paesi e sigle tecniche in oltre 70 lingue.',
        highlights: [
          'Tracce Audio Multiprospettiva: cambia lingua o voce in 1ª/3ª persona sulla stessa bobina 4K',
          'Clonazione vocale e voci abbinate a età/carattere con blocco fonetico di 10 secondi',
          'Mix stereo broadcast: dialoghi, narratore di studio, SFX ambientali e colonna sonora orchestrale',
        ],
        metricValue: '70+ lingue',
        metricLabel: 'Blocco vocale multitraccia',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'Capsula temporale ed epoca',
        badge: 'Ricostruzione storica e regionale',
        title: 'Motore localizzato di epoca e capsula del tempo culturale',
        summary:
          'Non ci limitiamo a leggere i tuoi appunti — il nostro motore narrativo intreccia la musica autentica, i traguardi economici, i simboli culturali e l’atmosfera quotidiana del decennio, della città e del Paese esatti della tua storia, trasformando ricordi privati in un documentario storico duraturo.',
        exampleLabel: 'Esempio di capsula culturale',
        exampleHeadline: 'Contesto storico e regionale che riporta in vita il passato',
        exampleDetails:
          'Ogni fotogramma 4K diretto (3840×2160) combina musica autentica del decennio, contesto economico-culturale locale e coreografia camera fluida a 6 movimenti in un master storico pronto per la sala.',
        highlights: [
          'Contesto culturale, musicale ed economico del decennio e della regione tessuto nella sceneggiatura',
          'Cinema fotorealistico OPPURE illustrazione d’autore 4K UHD (3840×2160) con regia camera',
          'Opera in 14 portali nativi producendo master 4K localizzati culturalmente in oltre 70 lingue',
        ],
        metricValue: '4K d’epoca',
        metricLabel: 'Capsula culturale',
      },
    ],
    immediateLift: {
      eyebrow: 'Valore immediato · Clienti e operatori White-Label',
      heading: 'Tre motori di crescita integrati oltre il montaggio video',
      subtitle:
        'Offri demo multilingue dal vivo, materiali stampati tangibili e aggiornamenti ricorrenti di capitoli o SOP senza sforzo — alimentati automaticamente dallo stesso Continuity Vault bloccato.',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: 'Calcolo extra quasi zero',
          title: 'Tracce Audio Multiprospettiva',
          subtitle: 'Stesse immagini 4K · Più voci e lingue',
          description:
            'Mostra subito Clonazione Vocale e Intelligenza di Sceneggiatura: commuta dal vivo una sola bobina 4K tra inglese, giapponese e spagnolo — o tra memorie in 1ª persona e documentario in 3ª persona — durante un’anteprima familiare o una call commerciale.',
          liftHighlight: 'Praticamente zero calcolo video aggiuntivo per ogni lingua o punto di vista aggiunto',
        },
        {
          id: 'qr_print_companion',
          badge: 'Articolo 100% automatizzato',
          title: 'PDF stampabile abbinato con QR',
          subtitle: 'Libro ricordo · Scheda immobile · Poster SOP',
          description:
            'Trasforma ogni master digitale 4K in un oggetto fisico tangibile per open house, cene di compleanno o reparti produttivi — impaginato automaticamente con fotogrammi, riassunti dei capitoli e codici QR scansionabili.',
          liftHighlight: 'Dona ad agenti, organizzatori e responsabili formazione un ricordo fisico che giustifica prezzi premium',
        },
        {
          id: 'living_continuity_vault',
          badge: 'Motore di ricavi ricorrenti',
          title: 'Continuity Vault vivo',
          subtitle: 'Aggiornamenti incrementali di capitoli, immobili e SOP',
          description:
            'Poiché volti, voci e ambienti del cast restano bloccati in modo permanente, gli operatori possono vendere estensioni annuali dei capitoli familiari o aggiornamenti trimestrali di SOP e immobili ad alti margini con quasi zero rilavorazione.',
          liftHighlight: 'Aggiungi nuovi traguardi o revisioni normative in pochi minuti senza deriva di continuità',
          accessNote: 'Gli aggiornamenti successivi si sbloccano con un Continuity Library Code privato (senza password completa dell’account)',
        },
      ],
    },
    comparisonHeading: 'Perché il Cinema 4K Longform da $149 è un altro universo',
    comparisonSubtitle: 'Confronta i generatori brevi usa e getta con una vera produzione longform SceneFlow.',
    colDimension: 'Standard di produzione',
    colSlop: 'Generatori brevi di clip IA ("AI Slop")',
    colSceneFlow: 'SceneFlow Cinema 4K Longform ($149)',
    comparisonRows: [
      {
        dimension: 'Formato, Durata e Serie',
        shortformSlop: 'Clip scollegate da 5–15 sec; insostenibili per storie da 1+ ora o a episodi',
        sceneFlowLongform: 'Lungometraggio da 1+ ora O Serie multi-episodio (fino a 60 min / 360 frame 4K a $149; estendibile a 150 min) + trailer 1–3 min',
      },
      {
        dimension: 'Sceneggiatura e risonanza',
        shortformSlop: 'Prompt generico di una riga dal ritmo piatto',
        sceneFlowLongform: 'Sceneggiatura pro multi-atto con 90%+ di risonanza sul pubblico',
      },
      {
        dimension: 'Volti ed età',
        shortformSlop: 'I volti cambiano in estranei ogni pochi secondi',
        sceneFlowLongform: 'Continuità bloccata (nonno a 28 anni e somiglianze familiari)',
      },
      {
        dimension: 'Luoghi e oggetti',
        shortformSlop: 'Stanze inventate e oggetti deformati',
        sceneFlowLongform: 'Luoghi reali (immobili, vie d’infanzia) e cimeli (Bibbia di famiglia, ecc.)',
      },
      {
        dimension: 'Voci e mix audio',
        shortformSlop: 'Voci robotiche, nomi sbagliati e loop banali',
        sceneFlowLongform: 'Clonazione vocale, abbinamento voce-volto, pronuncia, SFX e colonna sonora',
      },
      {
        dimension: 'Regia visiva e master',
        shortformSlop: 'Artefatti tremolanti e "AI slop" inguardabile',
        sceneFlowLongform: 'Frame 4K realistici o illustrati diretti + master da grande schermo',
      },
    ],
    storefrontCtaLabel: 'Avvia il mio Blueprint Longform da $29 (scalato dal film 4K da $149)',
    studioPrimaryCtaLabel: 'Lancia il tuo studio longform White-Label',
    studioSecondaryCtaLabel: 'Esplora la vetrina live da $149',
  },

  nl: {
    storefrontEyebrow: 'Longform 4K Cinema · Nul "AI Slop"',
    studioEyebrow: 'De beslissende voorsprong van jouw White-Label Studio',
    storefrontHeadingPrefix: 'Geen 5-seconden AI-clipapp. Een echte ',
    storefrontHeadingAccent: '$149 Longform 4K Filmstudio.',
    studioHeadingPrefix: 'Waarom klanten $149–$950+ betalen in plaats van ',
    studioHeadingAccent: 'korte AI-clipgenerators te gebruiken.',
    storefrontSubtitle:
      'Standaard korte generators spugen 5-secondenclips uit met vervormde gezichten en holle teksten. Elke $149 Keepsake Cinema-film is een geregisseerde longform 4K-productie in hoofdstukken met 90%+ doelgroepresonantie — die echte mensen, tijdperken, huizen, erfstukken en bedrijven tastbaar tot leven brengt.',
    studioSubtitle:
      'Korte AI-clipapps overspoelen het internet met wegwerp-"AI slop". SceneFlow rust jouw white-label studio uit met echte longform 4K cinema: scripts met 90%+ resonantie, verjonging met vaste gezichtsidentiteit, locatie- en objectcontinuïteit, stemkloning en bioscoopklare masters.',
    noSlopBadge: 'NUL AI SLOP · LONGFORM 4K CINEMA',
    trailerSpotlight: {
      badge: 'Speelfilm van 1+ Uur OF Serie met Meerdere Afleveringen + 1–3 Min Trailer',
      headline: 'Vertel een levensverhaal van 1+ uur als speelfilm of meeslepende serie — met authentieke reconstructies van elk hoofdstuk.',
      body: 'De meest bepalende hoofdstukken in een leven zijn nooit gefilmd—en korte AI-clipgenerators storten na 15 seconden in. SceneFlow brengt elk tijdperk opnieuw tot leven met vergrendelde personen, locaties, cultuur en historische context (tot 60 min / 360 geregisseerde 4K-frames inbegrepen voor $149; uitbreidbaar tot 150 min of 6–8 afleveringen), plus een deelbare bioscooptrailer van 1–3 min.',
      pill1: 'Enkele Speelfilm van 1+ Uur OF Serie in Afleveringen',
      pill2: 'Ongefilmde Hoofdstukken Nagespeeld met Tijds- & Cultuurcontext',
      pill3: 'Deelbare 1–3 Min Trailer + Uitbreidbaar tot 150 Min',
    },
    pillarsHeading: 'Ontdek de 6 studiotechnieken achter elke film',
    pillarsHint: 'Kies een onderdeel om te zien hoe SceneFlow echte verhalen zonder "AI slop" regisseert.',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: '90%+ Resonantie-scripts',
        badge: 'Doelgericht scenario-ontwerp',
        title: 'Professionele scripts gescoord op 90%+ doelgroepresonantie',
        summary:
          'We gooien nooit een korte prompt in een videogenerator. Elke film begint met een meerdelig scenario afgestemd op spanningsboog, tempo en 90%+ doelgroepresonantie — of je nu een familie raakt op een 80e verjaardag, huizenkopers overtuigt, vertrouwen wekt voor een kliniek of medewerkers traint.',
        exampleLabel: 'Voorbeeld regie-blueprint',
        exampleHeadline: 'Akte I Hook → Tijdperken → Emotionele climax → Onvergetelijke finale',
        exampleDetails:
          'Elk moment wordt vóór het renderen getoetst op jouw doelgroep (familie, kopers, patiënten of nieuwe collega’s) — zonder vlakke opvulling.',
        highlights: [
          'Echte 30–150 min verhaallijn in hoofdstukken (tot 60 min / 360 frames voor $149)',
          'Gescoord en aangescherpt voor 90%+ emotionele en commerciële resonantie',
          'Inclusief 1–3 min bioscooptrailer + interactieve Storyboard Blueprint',
        ],
        metricValue: '90%+',
        metricLabel: 'Doelgroepresonantie',
      },
      {
        id: 'character_aging',
        shortTab: 'Opa op 28 jaar & Familie',
        badge: 'Identiteits- & Tijdperkengine',
        title: 'Breng opa van 28 tot leven & match familieleden door de decennia',
        summary:
          'Heb je alleen een recente foto van opa op zijn 80e? De Continuity-engine van SceneFlow creëert zijn geloofwaardige 28-jarige zelf voor scènes uit de jaren 70, laat familiegelijkenissen kloppen en vergrendelt elk gezicht door de hele film.',
        exampleLabel: 'Voorbeeld continuïteit',
        exampleHeadline: '1 huidige foto → Geloofwaardig op 28 · 52 · Nu',
        exampleDetails:
          'Dezelfde gelaatstrekken en warmte lopen moeiteloos door van jeugd tot mijlpalen en familiebijeenkomsten — nooit een vreemde tussen twee shots.',
        highlights: [
          'Natuurlijke verjonging en veroudering op basis van gewone telefoonfoto’s',
          'Familiegelijkenis over generaties tussen ouders, kinderen & kleinkinderen',
          'Consistente oprichter- en traineridentiteit voor merk- en trainingsfilms',
        ],
        metricValue: '100%',
        metricLabel: 'Vergrendelde identiteit',
      },
      {
        id: 'location_matching',
        shortTab: 'Actieve scènes & Culturele staging',
        badge: 'Continuïteitsvergrendelde staging',
        title: 'Continuïteitsvergrendelde actieve scènes & culturele staging',
        summary:
          'Ontbreken er foto’s van de grootste hoofdstukken? Via jouw Continuity Vault ensceneert SceneFlow levendige familiebijeenkomsten, regionale tradities, tijdseigen woningen en virtuele interieur- of meubelupdates — terwijl echte gezichten, kleding en erfstukken onmiskenbaar vergrendeld blijven.',
        exampleLabel: 'Actieve staging & omgevingslock',
        exampleHeadline: 'Ongefotografeerde momenten, met culturele authenticiteit geënsceneerd',
        exampleDetails:
          'Ensceneer levendige diners met meerdere generaties, 4-hoofdstukken "Voor & Na" luxeverbouwingen en horizonvergrendelde nieuwbouw-rondleidingen, oprichtingsscènes van een praktijk of regionale veiligheidsoefeningen op de werkvloer — allemaal vergrendeld aan jouw echte cast en architectuur.',
        highlights: [
          'Ensceneert ongefotografeerde familiefeesten, regionale tradities & tijdseigen woningen',
          '"Voor & Na" 4-hoofdstukken luxeverbouwingen & horizon-/kustlijnvergrendelde pre-constructie kavelvisualisatie',
          'Gelokaliseerde veiligheids-, apparatuur- & patiënt-/klantzorgscènes zonder gezichtsdrift',
        ],
        metricValue: 'Actieve staging',
        metricLabel: 'Cultuur- & ruimtelock',
      },
      {
        id: 'heirloom_props',
        shortTab: 'Erfstukken & Rekwisieten',
        badge: 'Object- & erfstukcontinuïteit',
        title: 'Vergrendel dierbare objecten — Van familiebijbel tot merkapparatuur',
        summary:
          'Sterke verhalen zitten in de details die iedereen direct herkent. Objectcontinuïteit houdt bijzondere voorwerpen — een oude familiebijbel, opa’s horloge, een gitaar, topproduct of veiligheidsuitrusting — scène na scène identiek.',
        exampleLabel: 'Voorbeeld objectreferentie',
        exampleHeadline: 'Familiebijbel · Erfstukhorloge · Herkenbare merkuitrusting',
        exampleDetails:
          'Doordat objecten vooraf in je Continuity-bibliotheek staan, vervormen of verdwijnen ze nooit halverwege een scène.',
        highlights: [
          'Behoudt dierbare erfstukken (familiebijbel, brieven, sieraden, auto’s)',
          'Vergrendelt producten, logo’s en bedrijfskleding in merkverhalen',
          'Nauwkeurige uitrusting en hulpmiddelen voor compliance- en SOP-training',
        ],
        metricValue: 'Nul drift',
        metricLabel: 'Object- & erfstuklock',
      },
      {
        id: 'voice_cloning',
        shortTab: 'Stemkloning & Multitrack',
        badge: 'Multiperspectief-audio & 70+ talen',
        title: 'Stemkloning, multiperspectief-audiosporen & 10-sec. uitspraaklock',
        summary:
          'Een onvergetelijke film klinkt net zo echt als hij oogt. SceneFlow combineert stemkloning, stem-beeldmatching en een 10-seconden uitspraaklock met Multiperspectief-audiosporen — waarmee dezelfde 4K-beeldmaster naadloos schakelt tussen Engels, Japans en Spaans, of tussen ik-memoires en documentaire in de derde persoon.',
        exampleLabel: 'Voorbeeld multiperspectief-audio',
        exampleHeadline: '1 vergrendelde 4K-beeldreel → 70+ talen & meerdere vertelperspectieven',
        exampleDetails:
          'Vrijwel nul extra videorekenkracht: houd elk beeldframe identiek terwijl achternamen, woonplaatsen en vakafkortingen in meer dan 70 talen vloeiend worden uitgesproken.',
        highlights: [
          'Multiperspectief-audiosporen: wissel talen of 1e/3e-persoonsstemmen op dezelfde 4K-reel',
          'Stemkloning & op leeftijd/karakter afgestemde stemmen met 10-seconden fonetische lock',
          'Broadcast stereomix: dialoog, studioverteller, omgevings-SFX & geduckte orkestscore',
        ],
        metricValue: '70+ talen',
        metricLabel: 'Multitrack-stemlock',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'Tijdperk- & Cultuurtijdcapsule',
        badge: 'Historische & regionale wereldopbouw',
        title: 'Gelokaliseerde Tijdperk- & Cultuurtijdcapsule-engine',
        summary:
          'We lezen niet slechts je aantekeningen voor — onze verhaalengine verweeft authentieke muziek, economische mijlpalen, culturele ankerpunten en de dagelijkse sfeer van precies het decennium, de stad en het land van jouw verhaal, zodat privéherinneringen een blijvende historische documentaire worden.',
        exampleLabel: 'Voorbeeld cultuurtijdcapsule',
        exampleHeadline: 'Tijdperk- & regiocontext die geschiedenis tot leven brengt',
        exampleDetails:
          'Elk geregisseerd 4K-frame (3840×2160) combineert authentieke decenniummuziek, regionale economische en culturele context en vloeiende 6-voudige camerachoreografie tot een bioscoopklare historische master.',
        highlights: [
          'Automatische decennium- & regionale cultuur-, muziek- en economiecontext in het script verweven',
          'Fotorealistische cinema OF erfstuk-geïllustreerde 4K UHD (3840×2160) masterchoreografie',
          'Werk in 14 native UI-portals en produceer cultureel gelokaliseerde 4K-masters in 70+ talen',
        ],
        metricValue: 'Tijdseigen 4K',
        metricLabel: 'Cultuurtijdcapsule',
      },
    ],
    immediateLift: {
      eyebrow: 'Directe meerwaarde · Consumenten & White-Label-operators',
      heading: 'Drie ingebouwde groeimotoren naast videomontage',
      subtitle:
        'Lever live meertalige demo’s, tastbare printuitgaven en moeiteloze periodieke hoofdstuk- of SOP-updates — automatisch aangedreven vanuit dezelfde vergrendelde Continuity Vault.',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: 'Vrijwel nul extra rekenkracht',
          title: 'Multiperspectief-audiosporen',
          subtitle: 'Dezelfde 4K-beelden · Meerdere stemmen & talen',
          description:
            'Laat stemkloning en scriptintelligentie direct zien: schakel één 4K-beeldreel live tussen Engels, Japans en Spaans — of tussen ik-memoires en documentaire in de derde persoon — tijdens een familiepreview of verkoopgesprek.',
          liftHighlight: 'Vrijwel nul extra videorekenkracht per toegevoegde taal of vertelperspectief',
        },
        {
          id: 'qr_print_companion',
          badge: '100% geautomatiseerd drukwerk',
          title: 'QR-gekoppelde print-companion PDF',
          subtitle: 'Herinneringsboek · Woningbrochure · SOP-poster',
          description:
            'Zet elke digitale 4K-master om in een tastbare fysieke aanvulling voor open huizen, jubileumdiners of werkvloeren — automatisch opgemaakt met filmstills, hoofdstuksamenvattingen en scanbare QR-videolinks.',
          liftHighlight: 'Geeft makelaars, gastheren & trainingsleiders een tastbaar aandenken dat premium prijzen rechtvaardigt',
        },
        {
          id: 'living_continuity_vault',
          badge: 'Terugkerende omzetmotor',
          title: 'Levende Continuity Vault',
          subtitle: 'Stapsgewijze hoofdstuk-, vastgoed- & SOP-updates',
          description:
            'Doordat gezichten, stemmen en omgevingen blijvend vergrendeld zijn, verkopen operators jaarlijkse familie-uitbreidingen of driemaandelijkse SOP- en vastgoedupdates met hoge marges en vrijwel nul herwerk.',
          liftHighlight: 'Voeg nieuwe mijlpalen of compliance-wijzigingen in minuten toe zonder continuïteitsverlies',
          accessNote: 'Vervolgupdates worden ontgrendeld met een privé Continuity Library Code (zonder volledig accountwachtwoord)',
        },
      ],
    },
    comparisonHeading: 'Waarom $149 Longform 4K Cinema een andere wereld is',
    comparisonSubtitle: 'Vergelijk wegwerp-AI-clips met een echte longform productie van SceneFlow.',
    colDimension: 'Productiestandaard',
    colSlop: 'Korte AI-clipgenerators ("AI Slop")',
    colSceneFlow: 'SceneFlow Longform 4K Cinema ($149)',
    comparisonRows: [
      {
        dimension: 'Formaat, Speelduur & Serie',
        shortformSlop: 'Losse clips van 5–15 sec; onhoudbaar voor verhalen van 1+ uur of series',
        sceneFlowLongform: 'Speelfilm van 1+ uur OF Serie met meerdere afleveringen (tot 60 min / 360 4K-frames voor $149; uitbreidbaar tot 150 min) + 1–3 min trailer',
      },
      {
        dimension: 'Script & resonantie',
        shortformSlop: 'Vlakke eenregelige prompt zonder emotioneel tempo',
        sceneFlowLongform: 'Professioneel meerdelig script gescoord op 90%+ doelgroepresonantie',
      },
      {
        dimension: 'Gezichten & leeftijd',
        shortformSlop: 'Gezichten veranderen elke paar seconden in vreemden',
        sceneFlowLongform: 'Vaste continuïteit (bijv. opa op 28 jaar & familiegelijkenis)',
      },
      {
        dimension: 'Locaties & objecten',
        shortformSlop: 'Verzonnen standaardkamers en vervormde spullen',
        sceneFlowLongform: 'Exacte locaties (vastgoed, jeugdstraten) & erfstukken (familiebijbel e.d.)',
      },
      {
        dimension: 'Stemmen & geluidsmix',
        shortformSlop: 'Robotstemmen, verkeerd uitgesproken namen & standaardmuziek',
        sceneFlowLongform: 'Stemkloning, stem-beeldmatch, uitspraaklock, SFX & originele score',
      },
      {
        dimension: 'Beeldregie & master',
        shortformSlop: 'Flikkerende artefacten en onkijkbare "AI slop"',
        sceneFlowLongform: 'Realistische of geïllustreerde 4K-frames + bioscoopklare master',
      },
    ],
    storefrontCtaLabel: 'Start mijn $29 Longform Blueprint (verrekend met de $149 4K-film)',
    studioPrimaryCtaLabel: 'Lanceer jouw White-Label Longform Studio',
    studioSecondaryCtaLabel: 'Ervaar de live $149-storefront',
  },

  ru: {
    storefrontEyebrow: 'Полнометражное 4K Кино · Ноль «AI Slop»',
    studioEyebrow: 'Неоспоримое преимущество вашей White-Label студии',
    storefrontHeadingPrefix: 'Не приложение для 5-секундных роликов. Настоящая ',
    storefrontHeadingAccent: 'Студия полнометражного 4K-кино за $149.',
    studioHeadingPrefix: 'Почему клиенты платят $149–$950+ вместо того, чтобы использовать ',
    studioHeadingAccent: 'генераторы коротких ИИ-клипов.',
    storefrontSubtitle:
      'Обычные генераторы выдают 5-секундные ролики с «плывущими» лицами и пустыми текстами. Каждый фильм Keepsake Cinema за $149 — это постановочная многоглавая 4K-картина с целевым резонансом 90%+, достоверно оживляющая близких, эпохи, дома, реликвии и компании.',
    studioSubtitle:
      'Короткие ИИ-приложения наводнили сеть одноразовым «AI slop». SceneFlow даёт вашей white-label студии настоящее полнометражное 4K-кино: сценарии с резонансом 90%+, возрастное омоложение с сохранением черт, точность локаций и предметов, клонирование голоса и кинотеатральный мастер.',
    noSlopBadge: 'НОЛЬ AI SLOP · ПОЛНОМЕТРАЖНОЕ 4K КИНО',
    trailerSpotlight: {
      badge: 'Полнометражный фильм 1+ час ИЛИ Многосерийный сериал + Трейлер 1–3 мин',
      headline: 'Расскажите историю жизни длиной от 1 часа как полнометражный фильм или захватывающий сериал — с достоверной реконструкцией каждой главы.',
      body: 'Самые важные главы жизни никогда не снимались на камеру, а генераторы коротких ИИ-клипов рассыпаются уже после 15 секунд. SceneFlow воссоздаёт каждую эпоху с закреплёнными лицами, локациями, культурой и историческим контекстом (до 60 мин / 360 постановочных 4K-кадров за $149; расширение до 150 мин или 6–8 серий), плюс кинотрейлер 1–3 мин для рассылки.',
      pill1: 'Единый полнометражный фильм 1+ час ИЛИ Сериал',
      pill2: 'Неснятые главы воссозданы с историческим и культурным контекстом',
      pill3: 'Трейлер 1–3 мин для рассылки + Расширение до 150 мин',
    },
    pillarsHeading: 'Изучите 6 студийных систем мастерства в каждом фильме',
    pillarsHint: 'Выберите любой модуль, чтобы увидеть, как SceneFlow ставит настоящие истории без «AI slop».',
    pillars: [
      {
        id: 'resonance_script',
        shortTab: 'Сценарии 90%+ резонанса',
        badge: 'Сценарная инженерия под аудиторию',
        title: 'Профессиональные сценарии с оценкой 90%+ резонанса целевой аудитории',
        summary:
          'Мы никогда не скармливаем генератору однострочный промпт. Каждый фильм начинается с многоактного сценария, выверенного по драматургии, темпу и 90%+ резонансу — чтобы тронуть семью до слёз на 80-летии, убедить покупателей элитного дома, вызвать доверие к клинике или закрепить знания сотрудников.',
        exampleLabel: 'Пример режиссёрской структуры',
        exampleHeadline: 'Завязка Акта I → Смена эпох → Эмоциональная кульминация → Памятный финал',
        exampleDetails:
          'Каждый смысловой бит оценивается под вашу аудиторию (семья, покупатели, пациенты или новые сотрудники) ещё до рендера — без воды и плоской речи.',
        highlights: [
          'Настоящая многоглавая арка 30–150 мин (до 60 мин / 360 кадров за $149)',
          'Проверка и доработка до 90%+ эмоционального и коммерческого резонанса',
          'Включает трейлер 1–3 мин + интерактивный Storyboard Blueprint',
        ],
        metricValue: '90%+',
        metricLabel: 'Резонанс аудитории',
      },
      {
        id: 'character_aging',
        shortTab: 'Дедушка в 28 лет и семья',
        badge: 'Движок идентичности и эпох',
        title: 'Воссоздайте дедушку в 28 лет и сохраните семейное сходство поколений',
        summary:
          'Есть только недавний портрет дедушки в 80 лет? Движок преемственности SceneFlow достоверно воссоздаёт его 28-летний облик для сцен 1970-х, согласует семейное сходство между родственниками и фиксирует каждое лицо на протяжении всего фильма.',
        exampleLabel: 'Пример фиксации облика',
        exampleHeadline: '1 текущее фото → Достоверно в 28 · 52 · Сегодня',
        exampleDetails:
          'Те же черты лица и тёплое выражение проходят через десятилетия — герои никогда не превращаются в чужих людей на соседнем кадре.',
        highlights: [
          'Естественное омоложение и возрастные изменения по обычным фото с телефона',
          'Достоверное сходство между супругами, детьми и внуками разных поколений',
          'Стабильный образ основателя и инструктора для бренд- и учебных фильмов',
        ],
        metricValue: '100%',
        metricLabel: 'Фиксация идентичности',
      },
      {
        id: 'location_matching',
        shortTab: 'Живые сцены и культурный стейджинг',
        badge: 'Стейджинг с фиксацией преемственности',
        title: 'Живые сцены и культурный стейджинг с фиксацией преемственности',
        summary:
          'Нет фотографий самых главных глав? Используя ваш Continuity Vault, SceneFlow ставит живые семейные застолья, региональные традиции, дома с точностью эпохи и виртуальное обновление интерьеров и мебели — сохраняя реальные лица, одежду и семейные реликвии в строгой фиксации.',
        exampleLabel: 'Активный стейджинг и фиксация среды',
        exampleHeadline: 'Несфотографированные моменты, поставленные с культурной достоверностью',
        exampleDetails:
          'Ставьте тёплые ужины нескольких поколений, 4-главные люксовые реновации «До и после» и прогулки по будущим виллам на стадии предстроительства с фиксацией горизонта, сцены первых лет клиники или региональные тренинги по технике безопасности — всё с привязкой к вашим реальным героям и архитектуре.',
        highlights: [
          'Воссоздаёт несфотографированные семейные встречи, региональные традиции и дома эпохи',
          'Люксовые реновации «До и после» в 4 главах и визуализация участков до застройки с фиксацией горизонта и береговой линии',
          'Локализованные сцены охраны труда, оборудования и заботы о пациентах/клиентах без искажения лиц',
        ],
        metricValue: 'Живой стейджинг',
        metricLabel: 'Фиксация культуры и среды',
      },
      {
        id: 'heirloom_props',
        shortTab: 'Реликвии и детали',
        badge: 'Преемственность предметов',
        title: 'Закрепите дорогие предметы — от семейной Библии до фирменного оборудования',
        summary:
          'Сильное кино держится на деталях, которые близкие узнают с первого взгляда. Модуль реквизита фиксирует значимые вещи — старинную семейную Библию, часы деда, гитару, флагманский продукт или защитное снаряжение — из сцены в сцену.',
        exampleLabel: 'Пример референсов реквизита',
        exampleHeadline: 'Семейная Библия · Памятные часы · Фирменное оборудование',
        exampleDetails:
          'Поскольку предметы закреплены в библиотеке преемственности до рендера, они не искажаются и не пропадают посреди кадра.',
        highlights: [
          'Сохраняет семейные реликвии (семейная Библия, письма, украшения, авто)',
          'Фиксирует продукцию, вывески и униформу в историях бренда',
          'Точное оборудование и наглядные материалы для курсов безопасности и SOP',
        ],
        metricValue: 'Без искажений',
        metricLabel: 'Фиксация предметов',
      },
      {
        id: 'voice_cloning',
        shortTab: 'Клонирование и мультитрек',
        badge: 'Мультиперспективное аудио и 70+ языков',
        title: 'Клонирование голоса, мультиперспективные аудиодорожки и 10-сек. фиксация произношения',
        summary:
          'Настоящий фильм звучит так же убедительно, как выглядит. SceneFlow соединяет клонирование голоса, подбор тембра под образ и 10-секундную фиксацию произношения с мультиперспективными аудиодорожками — мгновенно переключая один и тот же 4K-видеомастер между английским, японским и испанским или между мемуарами от 1-го лица и документалистикой от 3-го лица.',
        exampleLabel: 'Пример мультиперспективного аудио',
        exampleHeadline: '1 зафиксированный 4K-видеоряд → 70+ языков и разные ракурсы повествования',
        exampleDetails:
          'Практически нулевые допрасходы видеовычислений: каждый кадр остаётся неизменным, а фамилии, родные города и термины звучат безупречно на более чем 70 языках.',
        highlights: [
          'Мультиперспективные аудиодорожки: меняйте язык или рассказчика от 1-го/3-го лица на одном 4K-видеоряде',
          'Клонирование голоса и подбор тембра по возрасту/типажу с 10-секундной фонетической фиксацией',
          'Эфирный стереомикс: диалоги, диктор студии, атмосферный SFX и оркестровый саундтрек',
        ],
        metricValue: '70+ языков',
        metricLabel: 'Мультитрековая фиксация голоса',
      },
      {
        id: 'directed_4k_master',
        shortTab: 'Капсула эпохи и культуры',
        badge: 'Исторический и региональный контекст',
        title: 'Локализованный движок эпохи и культурной капсулы времени',
        summary:
          'Мы не просто зачитываем ваши заметки — наш сценарный движок вплетает подлинную музыку, экономические вехи, культурные ориентиры и повседневную атмосферу конкретного десятилетия, города и страны вашей истории, превращая личные воспоминания в долговечный исторический документальный фильм.',
        exampleLabel: 'Пример культурной капсулы времени',
        exampleHeadline: 'Исторический и региональный контекст, оживляющий прошлое',
        exampleDetails:
          'Каждый постановочный 4K-кадр (3840×2160) объединяет музыку эпохи, региональный культурно-экономический контекст и плавную 6-осевую хореографию камеры в исторический киномастер.',
        highlights: [
          'Автоматическое вплетение культурного, музыкального и экономического контекста десятилетия и региона в сценарий',
          'Фотореалистичное кино ИЛИ памятная иллюстрированная хореография в 4K UHD (3840×2160)',
          'Работайте в 14 нативных UI-порталах и создавайте культурно локализованные 4K-мастера на 70+ языках',
        ],
        metricValue: '4K эпохи',
        metricLabel: 'Культурная капсула',
      },
    ],
    immediateLift: {
      eyebrow: 'Мгновенный эффект · Частные клиенты и White-Label операторы',
      heading: 'Три встроенных движка роста за пределами видеомонтажа',
      subtitle:
        'Проводите живые мультиязычные демонстрации, вручайте осязаемые печатные издания и легко продавайте регулярные обновления глав или SOP — всё автоматически работает на базе единого Continuity Vault.',
      cards: [
        {
          id: 'multi_perspective_audio',
          badge: 'Почти ноль лишних вычислений',
          title: 'Мультиперспективные аудиодорожки',
          subtitle: 'Единый 4K-видеоряд · Разные голоса и языки',
          description:
            'Мгновенно продемонстрируйте клонирование голоса и интеллект сценария: в прямом эфире переключите один 4K-ролик между английским, японским и испанским — или между мемуарами от 1-го лица и документалистикой от 3-го лица — прямо на семейном предпросмотре или звонке с клиентом.',
          liftHighlight: 'Практически нулевые дополнительные видеовычисления на каждый новый язык или ракурс диктора',
        },
        {
          id: 'qr_print_companion',
          badge: '100% автоматический артефакт',
          title: 'Печатный PDF-компаньон с QR-кодами',
          subtitle: 'Памятная книга · Буклет объекта · Плакат SOP',
          description:
            'Превратите каждый цифровой 4K-мастер в осязаемое печатное издание для показов недвижимости, юбилейных ужинов или цехов — автоматически свёрстанное с кадрами, резюме глав и сканируемыми QR-ссылками на видео.',
          liftHighlight: 'Даёт риелторам, хозяевам праздников и тренерам материальный сувенир, обосновывающий премиальную цену',
        },
        {
          id: 'living_continuity_vault',
          badge: 'Движок регулярной выручки',
          title: 'Живой Continuity Vault',
          subtitle: 'Поэтапные обновления глав, объектов и SOP',
          description:
            'Поскольку лица, голоса и локации героев зафиксированы навсегда, операторы могут продавать ежегодные продолжения семейной хроники или квартальные обновления SOP и объектов с высокой маржой и почти нулевой переделкой.',
          liftHighlight: 'Добавляйте новые события или правки регламентов за минуты без малейшей потери преемственности',
          accessNote: 'Повторные обновления открываются по приватному Continuity Library Code (без полного пароля от аккаунта)',
        },
      ],
    },
    comparisonHeading: 'Почему полнометражное 4K-кино за $149 — это совершенно другой уровень',
    comparisonSubtitle: 'Сравните одноразовые генераторы коротких клипов с полноценным производством SceneFlow.',
    colDimension: 'Стандарт производства',
    colSlop: 'Генераторы коротких ИИ-клипов («AI Slop»)',
    colSceneFlow: 'SceneFlow Полнометражное 4K Кино ($149)',
    comparisonRows: [
      {
        dimension: 'Формат, хронометраж и сериалы',
        shortformSlop: 'Разрозненные клипы по 5–15 сек; непригодно для историй от 1 часа и сериалов',
        sceneFlowLongform: 'Полнометражный фильм 1+ час ИЛИ Многосерийный сериал (до 60 мин / 360 кадров 4K за $149; расширение до 150 мин) + трейлер 1–3 мин',
      },
      {
        dimension: 'Сценарий и резонанс',
        shortformSlop: 'Шаблонная фраза без драматургии и эмоций',
        sceneFlowLongform: 'Профессиональный многоактный сценарий с резонансом 90%+',
      },
      {
        dimension: 'Лица и возраст',
        shortformSlop: 'Лица превращаются в чужих людей каждые пару секунд',
        sceneFlowLongform: 'Фиксированная преемственность (дедушка в 28 лет и сходство родных)',
      },
      {
        dimension: 'Локации и реквизит',
        shortformSlop: 'Выдуманные комнаты и искажённые предметы',
        sceneFlowLongform: 'Реальные локации (объекты, улицы детства) и реликвии (семейная Библия и др.)',
      },
      {
        dimension: 'Голоса и сведение',
        shortformSlop: 'Роботизированный TTS, ошибки в именах, примитивные лупы',
        sceneFlowLongform: 'Клонирование голоса, подбор под образ, словарь имён, SFX и музыка',
      },
      {
        dimension: 'Визуал и мастер',
        shortformSlop: 'Мерцание, артефакты и несмотрибельный «AI slop»',
        sceneFlowLongform: 'Постановочные реалистичные или иллюстрированные 4K-кадры + киномастер',
      },
    ],
    storefrontCtaLabel: 'Начать план полного метра за $29 (засчитывается в $149 за 4K-фильм)',
    studioPrimaryCtaLabel: 'Запустить White-Label студию полного метра',
    studioSecondaryCtaLabel: 'Посмотреть живую витрину за $149',
  },
}
