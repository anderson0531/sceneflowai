import type { StudioLandingCopy } from './types'
import { MOBILE_COMPANION_COPY_ES } from '../mobileCompanionCopy'

export const STUDIO_LANDING_COPY_ES = {
  heroDock: {
    tagline:
      'Dirige películas y series originales — o crea un negocio rentable de producción de video. Sin escuela de cine ni ingeniería de prompts.',
    primaryCta: 'Iniciar Studio ($9)',
    businessCta: 'Negocio de Servicios de Video',
    howItWorksCta: 'Cómo Funciona',
  },
  audienceGateway: {
    eyebrow: 'Un Estudio · Tres Caminos para Triunfar',
    title: 'Crea Mundos Originales.',
    titleAccent: 'O Construye un Negocio Rentable de Video.',
    subtitle:
      'SceneFlow combina un equipo experto de producción con IA y dirección conversacional — impulsando a narradores independientes, creadores de series y negocios de producción para clientes.',
    cards: [
      {
        id: 'services',
        badge: 'Oportunidad de Ingresos · 65–85% de Margen Típico',
        title: 'Negocios de Servicios de Video',
        description:
          'Entrega Memorias de Vida, Recorridos Inmobiliarios, Capacitación Corporativa y Videos de Marca para clientes en horas en lugar de semanas — con propiedad comercial total.',
        highlights: [
          'Entrevista guiada centrada en la historia y continuidad de elenco por edades',
          'Enlaces compartidos de Blueprint, Continuidad y Screening Room para aprobación',
          'Modo híbrido con fotos reales + escenas IA en 4K para altos márgenes',
        ],
        ctaLabel: 'Ver Modelos de Negocio y Márgenes',
        targetAnchor: 'video-services',
      },
      {
        id: 'aspiring',
        badge: 'Sin Escuela de Cine ni Prompts Complejos',
        title: 'Narradores y Autores Emergentes',
        description:
          '¿Tienes una memoria, novela o idea de canal en mente? Describe tu historia con tus propias palabras por voz o texto y deja que SceneFlow genere una base experta lista para dirigir.',
        highlights: [
          'Base experta instantánea para Serie, Blueprint y Guion de Producción',
          'Habla o escribe cambios en lenguaje cotidiano — cero sintaxis técnica',
          'Mira tu Animatic con voces antes de gastar créditos en video',
        ],
        ctaLabel: 'Hacer el Recorrido de 4 Pasos',
        targetAnchor: 'studio-tour',
      },
      {
        id: 'experienced',
        badge: 'Canales de Series · Podcasts · Pre-vis para Inversores',
        title: 'Creadores y Cineastas con Experiencia',
        description:
          'Olvida las regeneraciones al azar. Bloquea rostros recurrentes, vestuario por plano, voces y escenarios en tu Bóveda de Continuidad — y escala tu producción 10x con agentes autónomos.',
        highlights: [
          'Bóveda de Continuidad multiepisodio y vestuario seleccionable por plano',
          'Evaluación ejecutiva con Audience Resonance y FlowDirector',
          'Agentes autónomos producen 27+ escenas y doblajes en 70+ idiomas',
        ],
        ctaLabel: 'Ver los 5 Superpoderes del Estudio',
        targetAnchor: 'five-superpowers',
      },
    ],
  },
  superpowers: {
    eyebrow: 'La Filosofía de Diseño de SceneFlow',
    title: 'Cinco Superpoderes de Estudio.',
    titleAccent: 'Cero Manuales Técnicos.',
    subtitle:
      'El video con IA tradicional te obliga a unir herramientas sueltas y escribir cientos de prompts frágiles. SceneFlow te entrega una base experta, dirección natural por voz o texto, revisión ejecutiva y agentes autónomos.',
    watchClipLabel: 'Ver Resumen de 30s',
    pillars: [
      {
        id: 'baseline',
        number: '01',
        badge: 'Nunca Enfrentes una Página en Blanco',
        title: 'Generación Automática de Base Experta',
        description:
          'Comienza con una idea sencilla o entrevista guiada. SceneFlow redacta automáticamente una Biblia de Serie, un Blueprint Cinematográfico y un Guion de Producción con arcos individuales, épocas y escenarios.',
        outcomeTag: 'Serie · Blueprint · Guion de Producción',
        videoClipKey: 'comparison',
      },
      {
        id: 'dialog',
        number: '02',
        badge: 'Dirección por Voz o Texto',
        title: 'Control Total de Director mediante Diálogo Inteligente',
        description:
          'Dirige como cineasta, no como ingeniero de prompts. Habla o escribe para ajustar momentos clave, separar personajes por etapas de vida (17, 32, 62 años), elegir vestuario exacto por plano o refinar encuadres.',
        outcomeTag: 'Cero Ingeniería de Prompts',
        videoClipKey: 'direction',
      },
      {
        id: 'review',
        number: '03',
        badge: 'Control Experto Pre y Post Render',
        title: 'Revisión de Video con Audience Resonance y FlowDirector',
        description:
          'Audience Resonance califica tu Serie, Blueprint y Guion antes de producir, y FlowDirector revisa los videos de escena desde la perspectiva de Audiencia y Director, aplicando arreglos en 1 clic vía Shot Director para recrear clips en 20+ proyectos.',
        outcomeTag: 'QA de Video Audiencia + Director · Arreglo en 1 Clic',
      },
      {
        id: 'agents',
        number: '04',
        badge: 'Escala Sin Fricción',
        title: 'Agentes Autónomos de Producción Rápida',
        description:
          'Cuando tu guion y Animatic Pre-vis estén listos, lanza Audio Agent, Stills Agent, Clips Agent o los Production Agents completos para producir decenas de escenas y corregir tomas automáticamente.',
        outcomeTag: 'Reemplaza 300+ Prompts Manuales',
        videoClipKey: 'agent',
      },
      {
        id: 'collaboration',
        number: '05',
        badge: 'Aprobación de Clientes y Alcance Global',
        title: 'Enlaces Compartidos, Screening Room y 70+ Idiomas',
        description:
          'Comparte enlaces limpios de navegador para aprobar Blueprint, Guion y cortes con precisión de cuadro en Screening Room — y entrega versiones en más de 70 idiomas operando en 7 idiomas de interfaz.',
        outcomeTag: 'Enlaces · Screening Room · 70+ Doblajes',
        videoClipKey: 'publish',
      },
    ],
    microVisuals: {
      baseline: {
        intakePrompt: 'Entrevista Inicial: «Cuéntame tu historia...»',
        autoBadge: 'Generado en Segundos',
        steps: [
          { step: '1 · Biblia de Serie', detail: 'Arco de 6 Ep. + Bóveda Compartida' },
          { step: '2 · Blueprint del Filme', detail: 'Momentos Clave + Elenco por Edades' },
          { step: '3 · Guion de Producción', detail: 'Diálogos, Vestuario y Cámara' },
        ],
      },
      dialog: {
        quote:
          '«Divide a John en 17, 32 y 62 años — y ponle a Elara su abrigo de seda de gala en el Plano 2.»',
        chipCast: '✓ 3 Fichas de Edad Bloqueadas',
        chipWardrobe: '✓ Plano 2 Vestuario: Abrigo de Gala',
      },
      review: {
        arLabel: 'Audience Resonance + FlowDirector',
        arStatus: 'Etapas Pre-Render + QA de Video',
        gateSeries: 'Serie 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: 'Escena AR 86→89',
        flowDirectorNote:
          'FlowDirector QA de Video: Audiencia AR 86 + Director 81 → reparación en 1 clic recrea el clip (+3 AR)',
      },
      agents: {
        rows: [
          { label: 'Audio Agent · Voces, SFX y Música', status: '27 / 27 Listos' },
          { label: 'Stills Agent · Fotogramas con Continuidad', status: '100% Fijado' },
          { label: 'Clips Agent · Movimiento Autocorregido', status: 'Verificado' },
        ],
      },
      collaboration: {
        approvedBadge: 'Aprobado ✓',
        dubsChip: '+70 Idiomas',
      },
    },
  },
  videoServices: {
    eyebrow: 'Servicios de Entrega de Video · Operadores Independientes y Agencias',
    title: 'Entrega Valor de Producción de $1,500+ con un',
    titleAccent: '50%–80% Menos Costo de Entrega',
    subtitle:
      'Los equipos tradicionales y 30 horas de edición dejan fuera al 90% de las familias, inmobiliarias y comercios. Empieza con Video Memorias insignia mediante socios locales — y suma contratos mensuales recurrentes reduciendo tu costo total (cómputo + tiempo PM) entre un 50% y un 80%.',
    commercialRightsBadge: '100% Propiedad Comercial · Portales de Marca Blanca (Pro+)',
    costSavingsPillLabel: 'Video Memorias Insignia + Contratos B2B Recurrentes',
    verticalsHeading: '1. Lidera con Nuestro Servicio Insignia — y Escala con Retainers Mensuales',
    globalDemandLabel: 'Oportunidad de Mercado Global',
    whoBuysLabel: 'Quiénes Compran Recurrentemente',
    partnerChannelsLabel: 'Aliados de Referidos sin Gasto en Anuncios',
    marginAdvantageLabel: 'Ventaja de Margen y Alcance en SceneFlow',
    calculatorBadge: 'Calculadora por Alcance de Costo y Ganancia',
    calculatorTitle: '2. Pon a Prueba Costo de Entrega y Ganancia Mensual',
    priceTierLabel: 'Paquete para el cliente:',
    priceTierNames: ['Accesible', 'Estándar', 'Boutique'],
    tierScopePrefix: 'Alcance del paquete:',
    volumeLabel: 'Entregas a clientes / mes:',
    projectsPerMonthSuffix: 'proyectos/mes',
    projectsUnitLabel: 'proyectos',
    stressTestToggleLabel: 'Prueba conservadora: Mes 1 de aprendizaje + Plan Pro ($149/mes)',
    stressTestActiveNote:
      'Modo conservador activo: +60% de tiempo PM inicial, +30% de margen extra en retomas y membresía Pro de $149/mes (incluye 15,000 créditos base/mes).',
    proPlanLineLabel: 'Plan Pro ($149/mes) + cómputo extra',
    perProjectProfitLabel: 'Ganancia del servicio / proyecto',
    traditionalMarketLabel: 'Tarifa tradicional del mercado',
    typicalFeeLabel: 'Tu precio al cliente',
    fullyLoadedCostLabel: 'Costo de entrega / proyecto',
    costBreakdownSubLabel: 'Créditos + tiempo PM',
    estComputeLabel: 'Cómputo (incl. 20% margen retomas)',
    activeHandsOnLabel: 'Tiempo operador / PM (@$50/h)',
    monthlyGrossLabel: 'Facturación Mensual Estimada',
    monthlyNetLabel: 'Ganancia Mensual Est. del Servicio (tras cómputo y tiempo PM)',
    perMonthSuffix: '/ mes',
    marginBadgeSuffix: 'margen de servicio',
    disclaimer:
      'El costo por alcance incluye cómputo en SceneFlow ($0.01/crédito con 20% de margen de retomas) más tiempo PM valorado a $50/h. Activa la Prueba Conservadora para incluir curva de aprendizaje y Plan Pro ($149/mes); excluye captación comercial.',
    launchBusinessCta: 'Crea tu Primer Filme de Muestra ($9)',
    launchBusinessSubnote:
      'Usa el plan Explorer de $9 para producir un portafolio sin marca de agua para aliados locales — y sube a Pro ($149/mes) para activar Portales 100% de Marca Blanca.',
    trustShieldHeading: 'Escudo Empresarial de Margen, Privacidad e IP Comercial',
    trustShieldPillars: [
      {
        title: 'Portales de Marca Blanca sin Login (Pro+)',
        detail:
          'Tus clientes revisan bajo tu nombre, logo y colores sin crear cuenta en SceneFlow ni ver costos de créditos.',
      },
      {
        title: 'Cortafuegos Animatic y Límites de Rondas',
        detail:
          'El cliente aprueba Blueprint, Continuidad y Animatic narrado antes de renderizar video — con topes de rondas y créditos.',
      },
      {
        title: 'Nunca Entrenamos Modelos con Fotos del Cliente',
        detail:
          'Las fotos familiares y corporativas jamás entrenan modelos compartidos, eliminan GPS EXIF al subir y registran consentimiento.',
      },
    ],
    playbooksBadge: 'Kits Operativos «Servicio en Caja» Incluidos',
    playbooksHeading: 'Playbooks por Vertical, Tarifarios y Guiones para Aliados',
    playbooksSubtitle:
      'Evita empezar desde cero con procedimientos comerciales probados integrados directamente en SceneFlow Studio:',
    playbooksItems: [
      'Entrevistas IA de Biógrafo y B2B en 7 Idiomas',
      'Tarifarios de 3 Niveles y Calculadora de Margen Mínimo',
      'Plantilla de Comisión 20% para Residencias, Funerarias e Inmobiliarias',
      'Registro Integrado de Consentimiento de Medios, Edades y Voz',
    ],
    workflowHeading: 'Cómo Fluye un Proyecto de Marca Blanca en 4 Pasos Simples',
    stepPrefix: 'Paso',
    workflowSteps: [
      {
        step: '01',
        title: 'Entrevista Guiada sin Registro',
        detail:
          'Envía un enlace /intake con tu marca y consentimiento de imagen para capturar momentos e individuos clave.',
      },
      {
        step: '02',
        title: 'Aprobación por Enlace de Blueprint',
        detail:
          'Valida con Audience Resonance y asegura la firma del cliente en el Blueprint antes de gastar en video.',
      },
      {
        step: '03',
        title: 'Carga Móvil de Fotos y Continuidad',
        detail:
          'El cliente sube fotos desde su móvil (sin EXIF GPS) y aprueba Elenco multiedad, Vestuario y Sets con rondas limitadas.',
      },
      {
        step: '04',
        title: 'Entrega en Screening Room',
        detail:
          'Comparte un Screening Room sin login, entrega másters 4K en 70+ idiomas y purga archivos crudos en 1 clic.',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'Video Memorias',
        roleTag: '★ Servicio Insignia de Alto Margen',
        badge: '$349–$1,250 / filme · Mercado: $1,200–$4,500+',
        title: 'Historias de Vida, Homenajes y Biografías Familiares',
        description:
          'Combina fotografías familiares reales con recreaciones cinematográficas de época con IA, bloqueo de reliquias y continuidad precisa por edades (17 → 32 → 62 años) narradas con voces cálidas.',
        globalMarketNeed:
          'Cientos de millones de padres mayores, bodas de oro y homenajes de vida ocurren cada año en el mundo, pero más del 90% nunca se filma porque un equipo de $2,000+ es inaccesible.',
        clientBuyer:
          'Familias celebrando cumpleaños clave, bodas de oro, jubilaciones y homenajes familiares',
        partnerChannels:
          'Planificadores patrimoniales, residencias sénior, directores funerarios y organizadores de eventos (comisión del 15–20%)',
        traditionalMarketRangeLabel: '$1,200–$4,500+',
        typicalRetailUsd: 599,
        priceTiersUsd: [349, 599, 1250],
        tierScopeLabels: [
          'Homenaje 5 min · 75% Fotos + Clips 1080p→4K · 1 Idioma',
          'Memoria Familiar 12 min · Elenco Multiedad + Épocas · 2 Idiomas',
          'Documental Legado 20 min · Épocas 4K + Reliquias · 4 Idiomas',
        ],
        computeTiersUsd: [18, 34, 72],
        operatorTiersUsd: [62, 88, 150],
        activeTimeTiersLabels: ['~1.25 h', '~1.75 h', '~3.0 h'],
        retailRangeLabel: '$349–$1,250',
        estComputeUsd: 34,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1.75 h',
        keyAdvantage:
          'Nuestro nicho de mayor convicción: la continuidad multiedad entrega un filme de nivel $2,000 por ~$122 de costo total (~$34 cómputo + ~$88 tiempo PM).',
      },
      {
        id: 'realestate',
        tabLabel: 'Tours Inmobiliarios',
        roleTag: '↻ Retainer Mensual Inmobiliario',
        badge: '$199–$549 / propiedad · Mercado: $450–$1,500+',
        title: 'Recorridos Narrados de Propiedades y Hoteles Boutique',
        description:
          'Transforma fotos de propiedades y atractivos del vecindario en recorridos cinematográficos con música y locución — más versiones al instante en inglés, chino, árabe o portugués para compradores internacionales.',
        globalMarketNeed:
          'Decenas de millones de propiedades residenciales, alquileres vacacionales y hoteles boutique compiten cada mes por compradores locales y extranjeros usando solo fotos fijas.',
        clientBuyer:
          'Agentes inmobiliarios residenciales, agencias de lujo, alquileres vacacionales y hoteles boutique',
        partnerChannels:
          'Estudios de fotografía inmobiliaria, equipos de home staging, brókers de lujo y consultores hoteleros',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [199, 299, 549],
        tierScopeLabels: [
          'Tour Fotos MLS 90s · Cine 1080p + 1 Idioma',
          'Recorrido Narrado 2 min · Escalado 4K + 2 Idiomas',
          'Filme Propiedad de Lujo 3 min + Reels 9:16 · 4 Idiomas',
        ],
        computeTiersUsd: [10, 15, 28],
        operatorTiersUsd: [38, 50, 88],
        activeTimeTiersLabels: ['~45 min', '~1.0 h', '~1.75 h'],
        retailRangeLabel: '$199–$549',
        estComputeUsd: 15,
        estOperatorUsd: 50,
        activeMinutesLabel: '~1.0 h',
        keyAdvantage:
          'Alta repetición por agencia: un equipo con 4 captaciones al mes genera pedidos constantes sin viajes ni demoras por clima (~$65 de costo total).',
      },
      {
        id: 'training',
        tabLabel: 'Capacitación y SOPs',
        roleTag: '↻ Retainer Corporativo B2B',
        badge: '$599–$1,800 / módulo · Mercado: $1,500–$5,000+',
        title: 'Inducción Corporativa, Seguridad y Cursos Multilingües',
        description:
          'Bloquea un instructor consistente, uniformes y entornos de trabajo en tu Bóveda de Continuidad — y entrega módulos claros localizados al idioma nativo de cada empleado.',
        globalMarketNeed:
          'Cada planta industrial, red de clínicas, restaurante y franquicia en el mundo enfrenta rotación de personal, normas de seguridad y equipos multilingües que requieren video SOP.',
        clientBuyer:
          'Equipos de RR. HH. y formación, plantas industriales, clínicas médicas, restaurantes y franquicias',
        partnerChannels:
          'Consultores externos de RR. HH., auditores de seguridad laboral, integradores LMS y asociaciones de franquicias',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [599, 950, 1800],
        tierScopeLabels: [
          'Módulo SOP 5 min · Instructor Fijo + 1 Idioma',
          'Curso Seguridad / Inducción 10 min · 3 Idiomas',
          'Currículo Multi-Capítulo 20 min · 6+ Idiomas',
        ],
        computeTiersUsd: [24, 40, 78],
        operatorTiersUsd: [88, 125, 210],
        activeTimeTiersLabels: ['~1.75 h', '~2.5 h', '~4.2 h'],
        retailRangeLabel: '$599–$1,800',
        estComputeUsd: 40,
        estOperatorUsd: 125,
        activeMinutesLabel: '~2.5 h',
        keyAdvantage:
          'Contratos B2B duraderos: 70%+ menos costo (~$165 vs $3,000+ en vivo) y cobras actualizaciones rápidas cada vez que cambia una norma.',
      },
      {
        id: 'brand',
        tabLabel: 'Historias de Marca',
        roleTag: '↻ Paquete Recurrente PyME y Agencia',
        badge: '$399–$1,200 / paquete · Mercado: $3,000–$8,000+',
        title: 'Historias de Fundadores, Videos para Clínicas y Anuncios',
        description:
          'Produce historias de marca de alta conversión para sitios web junto con tráilers verticales 9:16 automáticos para Instagram, TikTok y YouTube Shorts — revisados con el cliente en Screening Room.',
        globalMarketNeed:
          'Más de 30 millones de clínicas, despachos legales, restaurantes y comercios locales en el mundo necesitan videos web de confianza y anuncios 9:16, pero no pueden pagar $5,000+.',
        clientBuyer:
          'Consultorios médicos y dentales, despachos legales, PyMEs locales, agencias web y comercio electrónico',
        partnerChannels:
          'Estudios de diseño web, agencias SEO/Ads, cámaras empresariales y consultores médicos/legales',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [399, 650, 1200],
        tierScopeLabels: [
          'Spot Confianza Clínica/PyME 60s + 1 Corte 9:16',
          'Historia de Fundador 2 min + 2 Cortes Sociales 9:16',
          'Filme de Marca + 4 Variaciones Multilingües de Anuncios',
        ],
        computeTiersUsd: [16, 28, 56],
        operatorTiersUsd: [62, 88, 150],
        activeTimeTiersLabels: ['~1.25 h', '~1.75 h', '~3.0 h'],
        retailRangeLabel: '$399–$1,200',
        estComputeUsd: 28,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1.75 h',
        keyAdvantage:
          'Producción marca blanca para agencias web y clínicas locales (~$116 de costo total) con cortes verticales 9:16 automáticos.',
      },
    ],
  },
  guidedTour: {
    eyebrow: 'Recorrido Visual del Estudio · Sin Jerga',
    title: 'Cuatro Salas Conectadas.',
    titleAccent: 'Un Flujo Sin Esfuerzo.',
    subtitle:
      'Conoce las 4 puertas del Estudio en 60 segundos —Series Room, Blueprint Room, Production Stage y Screening Room— antes de probar esos mismos enlaces interactivos en los 6 Ejemplos de Producción completos que siguen.',
    stepPrefix: 'Paso',
    lensLabel: 'Enfoque de vista previa:',
    lensCreator: 'Serie Original («The Glass Ledger»)',
    lensService: 'Servicio a Clientes («Video Memoria de Vida»)',
    watchRoomVideoLabel: 'Ver Tour de 30s',
    inspectFullScreenLabel: 'Ver Pantalla Completa del Estudio',
    openLiveScreeningLabel: 'Abrir Screening Room en Vivo',
    screeningModalTitle: 'The Glass Ledger — Screening Room de Demostración',
    examplesBridgeText:
      'Ahora que conoces las 4 salas del Estudio, pruébalas en vivo en 6 géneros completos:',
    examplesBridgeCta: 'Probar las 4 Salas en los Ejemplos de Producción',
    rooms: [
      {
        id: 'series-desk',
        stepNumber: '01',
        tabLabel: 'Series Room',
        badge: 'Universo Multiepisodio y Biblia de Continuidad',
        title: 'Construye un Universo Reutilizable una Vez — No un Solo Clip',
        promise:
          'Describe un canal de series, programa de formación o biografía por capítulos una sola vez. SceneFlow crea tu Biblia de Historia, Pizarra de Episodios y Reference Library compartida para mantener coherencia total.',
        creatorExampleTitle: 'The Glass Ledger · Thriller Neo-Noir de 6 Episodios',
        creatorExampleNote:
          'Elenco compartido (Elara Vance, Marcus Thorne, Dr. Aris Kael), escenario de la Bóveda y utilería del Códice bloqueados en los 6 episodios con 91/100 en Audience Resonance.',
        serviceExampleTitle: 'Legado Familiar por Capítulos o Currículo Empresarial',
        serviceExampleNote:
          'Guarda los presentadores aprobados, épocas familiares o sedes del cliente una vez — y genera del Episodio 2 al 10 en un clic sin desviación visual.',
        callouts: [
          {
            label: 'Base Instantánea y Puntaje de Audience Resonance',
            detail:
              'Genera automáticamente sinopsis, arcos por episodio y análisis de resonancia antes de producir.',
          },
          {
            label: 'Reference Library Compartida',
            detail:
              'Personajes, voces, vestuarios, locaciones y objetos se transfieren automáticamente a cada episodio.',
          },
          {
            label: 'Dirección de Serie por Voz o Texto',
            detail:
              'Habla o escribe ajustes para remodelar arcos de temporada o episodios individuales sin esfuerzo.',
          },
        ],
        visuals: {
          topBadge: 'Audience Resonance Serie: 91 / 100 · 6 Episodios Sincronizados',
          bottomBadge: 'Reference Library Compartida Fijada en Todos los Episodios',
          thumbLabels: [
            'Elara Vance · Protagonista',
            'Marcus Thorne · Elenco',
            'Bóveda de Archivo · Set',
            'Códice de Cuarzo · Utilería',
          ],
        },
      },
      {
        id: 'blueprint-board',
        stepNumber: '02',
        tabLabel: 'Blueprint Room',
        badge: 'Entrevista Guiada, Elenco por Edades y Luz Verde',
        title: 'Asegura una Historia Emotiva y tu Elenco Antes de Gastar en Video',
        promise:
          'Comienza con una entrevista natural o concepto. Blueprint Room estructura tus momentos clave, destaca personajes individuales por escena, fija identidad multiedad y permite aprobar vía enlace compartido.',
        creatorExampleTitle: 'Tratamiento por Escenas y Estilo Visual Bloqueado',
        creatorExampleNote:
          'Cada momento une intención dramática, personajes participantes, reglas de iluminación anamórfica y comentarios narrados de Audience Resonance.',
        serviceExampleTitle: 'Entrevista Inteligente de Memorias y Continuidad por Edades',
        serviceExampleNote:
          'Inicia con «Cuéntame tu historia», afina los momentos más emotivos y crea personajes separados por edad (17, 32 y 62 años) con herencia física intacta.',
        callouts: [
          {
            label: 'Entrevista Guiada Centrada en la Historia',
            detail:
              'Extrae relatos personales o de marca profundos e identifica personas individuales en cada escena.',
          },
          {
            label: 'Continuidad de Personajes por Etapas de Edad',
            detail:
              'Crea referencias separadas por época para que la juventud de los años 70 y la madurez actual nunca se mezclen.',
          },
          {
            label: 'Audience Resonance + Enlace de Blueprint Compartido',
            detail:
              'Verifica el impacto narrativo con IA y obtén la aprobación del cliente desde cualquier navegador.',
          },
        ],
        visuals: {
          topBadge: 'Blueprint AR: 92 / 100 · Elenco Destacado por Escena',
          bottomBadge: 'Continuidad Multiedad + Enlace de Aprobación para Clientes',
          thumbLabels: [
            'Arco de Protagonista',
            'Dr. Aris Kael · Escena 2',
            'Muelle del Puerto · Acto II',
            'Llave Crono · Objeto Clave',
          ],
        },
      },
      {
        id: 'production-stage',
        stepNumber: '03',
        tabLabel: 'Production Stage',
        badge: 'Shot Director, Control de Vestuario y Agentes Autónomos',
        title: 'Previsualiza el Animatic con Voces — Luego Deja que los Agentes Produzcan',
        promise:
          'Revisa tu Guion de Producción base, bloquea referencias de continuidad, reproduce el Animatic Pre-vis completo con voces, elige el vestuario exacto por plano en Shot Director y ejecuta agentes autónomos.',
        creatorExampleTitle: 'Escena 1: Bóveda Subterránea · Anamórfico 4K',
        creatorExampleNote:
          'Cambia el vestuario de Elara por plano, dirige encuadres por voz o texto, mezcla diálogo/SFX/música en Production Mixer y lanza los Production Agents.',
        serviceExampleTitle: 'Fotos Reales del Cliente + Recreaciones Cinematográficas',
        serviceExampleNote:
          'Combina fotografías reales con efecto Ken Burns y recreaciones IA en 4K para recuerdos no fotografiados — manteniendo una memoria de 15 minutos por debajo de ~$75 en cómputo.',
        callouts: [
          {
            label: 'Vestuario por Plano y Shot Director por Voz/Texto',
            detail:
              'Selecciona atuendos exactos en cada toma y refina encuadres o expresiones conversando.',
          },
          {
            label: 'Cortafuegos de Presupuesto con Animatic Pre-vis',
            detail:
              'Escucha diálogos, narración, efectos y música sobre fotogramas antes de gastar créditos de movimiento.',
          },
          {
            label: 'Audio Agent, Stills Agent y Clips Agent Autónomos',
            detail:
              'Genera escena por escena o activa la producción automatizada completa.',
          },
        ],
        visuals: {
          topBadge: 'Shot Director · Vestuario Seleccionado · Animatic Pre-vis Listo',
          bottomBadge: 'Audio Agent, Stills Agent y Clips Agent Orquestan Todas las Escenas',
          thumbLabels: [
            'Plano 1 · Plano General Bóveda',
            'Plano 3 · Macro Bisagra',
            'Escena 2 · Entrega de Llave',
            'Escena 3 · Travelling Pasillo',
          ],
        },
      },
      {
        id: 'screening-room',
        stepNumber: '04',
        tabLabel: 'Screening Room',
        badge: 'Revisión Precisa por Cuadro, 70+ Idiomas y Publicación',
        title: 'Colabora por Enlace Privado y Entrega en Cualquier Idioma',
        promise:
          'Proyecta animatics, cortes preliminares y masters 4K finales en un solo reproductor. Recibe notas con código de tiempo, genera más de 70 versiones dobladas y exporta o publica donde quieras.',
        creatorExampleTitle: 'Máster de Estreno, Tráilers Verticales y Doblajes Globales',
        creatorExampleNote:
          'Genera avances verticales 9:16 automáticamente, adapta diálogos en más de 70 mercados y publica en YouTube o postula a SceneFlow Originals.',
        serviceExampleTitle: 'Revisión Sin Fricción para Clientes y Entrega Multilingüe',
        serviceExampleNote:
          'Tus clientes ven el corte en móvil o escritorio sin iniciar sesión, dejan comentarios puntuales y reciben archivos MP4 listos en el idioma de su familia o equipo.',
        callouts: [
          {
            label: 'Enlaces de Revisión Sin Inicio de Sesión',
            detail:
              'Envía enlaces privados `/share/screening-room/` para aprobación rápida de clientes, directivos o familiares.',
          },
          {
            label: 'Sincronización en Escena en 70+ Idiomas',
            detail:
              'Conserva la música y el ambiente sonoro mientras adapta voces y diálogos para audiencias globales.',
          },
          {
            label: 'Exportación Máster 4K y Recortes Promocionales',
            detail:
              'Descarga masters limpios con 100% de derechos comerciales o publica avances directamente en redes sociales.',
          },
        ],
        visuals: {
          topBadge: 'Notas con Código de Tiempo · Enlace para Clientes Sin Registro',
          bottomBadge: '7 Idiomas de Interfaz · Más de 70 Canales de Doblaje en Escena',
          thumbLabels: [
            'EN · Máster Original',
            'ES / PT · Doblaje Sincronizado',
            'ZH / TH / HI · Versiones',
            '9:16 Tráiler Vertical',
          ],
        },
      },
    ],
  },
  useCaseDirectory: {
    viewByUseCaseLabel: 'Explorar por Caso de Uso',
    viewByRoomLabel: 'Explorar por Sala del Estudio',
    tracks: [
      {
        id: 'memoir-services',
        tabLabel: 'Video Memorias y Legado Familiar',
        badge: 'Servicio de Alto Margen · $300–$950/Filme',
        headline: 'Transforma Entrevistas Familiares y Fotos Antiguas en Cine Conmemorativo',
        description:
          'Captura una historia de vida con entrevista inteligente, bloquea retratos multiedad desde los años 70 hasta hoy, ejecuta Production Agents autónomos, recrea clips en 1 clic con FlowDirector y entrega por enlace privado de Screening Room.',
        featureIcons: [
          'clientIntake',
          'selfieStudio',
          'startBlueprint',
          'treatment',
          'continuity',
          'directShot',
          'animatic',
          'scriptSupervisor',
          'productionAgent',
          'screeningCollab',
          'languageStreams',
        ],
      },
      {
        id: 'commercial-training',
        tabLabel: 'Agencias de 20 Proyectos y Capacitación',
        badge: '20+ Proyectos Activos · Agentes Autónomos + FlowDirector QA',
        headline: 'Gestiona 20 Proyectos Simultáneos con un 50%–80% Menos de Costo mediante Automatización',
        description:
          'Activa portales marca blanca y topes de créditos para PMs, valida márgenes en Blueprints compartidos, lanza agentes autónomos en 20 proyectos activos, revisa videos en FlowDirector con arreglos en 1 clic y entrega en 70+ idiomas.',
        featureIcons: [
          'producerLaunchpad',
          'blueprintShare',
          'scriptSupervisor',
          'productionAgent',
          'budget',
          'castLocations',
          'audioAgent',
          'stillsAgent',
          'videoAgent',
          'multilanguageUi',
          'screeningPlayer',
        ],
      },
      {
        id: 'series-animation',
        tabLabel: 'Series Episódicas y Animación 3D',
        badge: 'IP Multiepisodio · Arte y Elenco Bloqueados',
        headline: 'Dirige una Biblia de Showrunner Completa desde el Piloto hasta el Final de Temporada',
        description:
          'Construye arcos de temporada multiepisodio, congela dirección de arte fotorrealista o animación 3D estilizada en cada entrega, dirige beats y fotogramas clave y renderiza clips de cine.',
        featureIcons: [
          'newSeries',
          'seriesReview',
          'seriesDirector',
          'directEpisode',
          'startEpisode',
          'stillsWorkbench',
          'videoAgent',
          'clipsWorkbench',
        ],
      },
      {
        id: 'creator-podcast',
        tabLabel: 'Canales de YouTube y Podcasts Narrativos',
        badge: 'Canales de Alta Retención · Shows Multivoz',
        headline: 'Publica Episodios Semanales con Voces de Estudio, Música Original y Mezcla Fina',
        description:
          'Evalúa ganchos de retención antes de producir, dirige química entre múltiples anfitriones y banda sonora a medida, ajusta tiempos en Production Mixer y publica paquetes 16:9 + 9:16 con OAuth en 1 clic.',
        featureIcons: [
          'sceneWorkflow',
          'seriesResonance',
          'musicScore',
          'scriptSupervisor',
          'mixer',
          'streamsInventory',
          'shipPackage',
        ],
      },
      {
        id: 'filmmaker-pitch',
        tabLabel: 'Pre-Vis de Cineastas y Tráilers de Pitch',
        badge: 'Carpetas de Luz Verde · Cine Proof-of-Concept',
        headline: 'Pon a Prueba tu Guion y Entra a Reuniones de Pitch con un Tráiler Terminado',
        description:
          'Co-escribe con FlowDirector, mide ritmo estructural con Audience Resonance en Blueprint y Guion, comparte storyboards ilustrados, formatea guiones estándar y monta tráilers cinematográficos.',
        featureIcons: [
          'blueprintDirector',
          'blueprintResonance',
          'blueprintShare',
          'goToProduction',
          'productionScript',
          'scriptResonance',
          'promoTrailers',
        ],
      },
    ],
  },
  directoryDrawer: {
    badge: 'Automatización y 39 Capacidades · Animatics WebM Narrados en 7 Idiomas',
    title: 'Automatiza Producción y Control de Calidad en 20+ Proyectos Simultáneos',
    subtitle:
      'Cada herramienta incluye ahora un animatic WebM limpio con narración completa de estudio en 7 idiomas. Descubre los Portales Marca Blanca, el Estudio de Selfies, FlowDirector en 1 clic y los agentes autónomos.',
    expandCta: 'Explorar 39 Capacidades Narradas',
    collapseCta: 'Ocultar Directorio de Capacidades',
    automationEyebrow: 'Diseñado para Creadores de Alto Volumen y Proveedores con 20 Proyectos',
    automationTitle: 'Automatización Integral: Los Agentes Producen. FlowDirector Audita y Repara en 1 Clic.',
    automationSubtitle:
      'Deja de vigilar prompts plano por plano. Los agentes de Audio, Stills, Clips y Producción construyen escenas en segundo plano mientras FlowDirector evalúa cada MP4 en Audience Resonance y Cumplimiento del Director, recreando clips en un clic.',
    spotlightFlowDirectorLabel: 'FlowDirector QA de Video',
    spotlightFlowDirectorMeta: 'Audiencia AR + Director · Recrea Clips en 1 Clic',
    spotlightAgentsLabel: 'Agentes Autónomos de Producción',
    spotlightAgentsMeta: '300+ Prompts Automatizados · Escala a 20 Proyectos Activos',
    spotlightNarrated5kLabel: '39 Capacidades · Animatics Narrados',
    spotlightNarrated5kMeta: 'Videos Animatic WebM 16:9 + Narración de Estudio en los 7 Idiomas',
  },
  academyStrip: {
    badge: 'Garantía de Curva de Aprendizaje Cero · Studio Academy',
    title: 'Nunca te Sientas Abrumado. Pulsa ? en Cualquier Pantalla para una Guía Visual de 60 Segundos.',
    subtitle:
      'Cada sala del estudio incluye un Mapa Visual Just-In-Time con indicadores numerados, acciones en un clic, protección de créditos Pre-vis y el simulador interactivo «Tu Primera Película en 10 Minutos».',
    pills: [
      'Mapas Visuales Contextuales con ?',
      'Simulador «Primera Película en 10 Min»',
      'Protección de Créditos Pre-vis Integrada',
    ],
    watchAcademyCta: 'Ver Tour de Academy (30s)',
    startExplorerCta: 'Comenzar con Explorer — $9',
  },
  mobileCompanion: MOBILE_COMPANION_COPY_ES,
} satisfies StudioLandingCopy
