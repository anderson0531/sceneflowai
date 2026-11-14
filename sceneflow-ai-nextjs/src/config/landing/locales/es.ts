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
      'Los equipos de rodaje tradicionales y 30 horas de edición manual dejan fuera por precio al 90% de las familias, agentes inmobiliarios y comercios locales. SceneFlow reduce entre un 50% y un 80% tu costo total de entrega —créditos de cómputo más tiempo de gestión—, permitiéndote captar clientes con precios accesibles y conservar entre un 65% y un 85% de ganancia neta real.',
    commercialRightsBadge: '100% Propiedad Comercial · Entrega Masters a tus Clientes',
    costSavingsPillLabel: '50%–80% Menor Costo de Entrega · Enorme Demanda Global',
    verticalsHeading: '1. Elige un Servicio Global de Alta Demanda',
    globalDemandLabel: 'Oportunidad de Mercado Global',
    whoBuysLabel: 'Quiénes Compran Recurrentemente',
    marginAdvantageLabel: 'Ventaja de Bajo Costo en SceneFlow',
    calculatorBadge: 'Calculadora Transparente de Costo y Ganancia',
    calculatorTitle: '2. Compara Costo de Entrega y Ganancia Mensual',
    priceTierLabel: 'Nivel de precio al cliente:',
    priceTierNames: ['Accesible', 'Estándar', 'Boutique'],
    volumeLabel: 'Entregas a clientes / mes:',
    projectsPerMonthSuffix: 'proyectos/mes',
    projectsUnitLabel: 'proyectos',
    perProjectProfitLabel: 'Ganancia neta / proyecto',
    traditionalMarketLabel: 'Tarifa tradicional del mercado',
    typicalFeeLabel: 'Tu precio al cliente',
    fullyLoadedCostLabel: 'Costo total de entrega',
    costBreakdownSubLabel: 'Créditos + tiempo PM',
    estComputeLabel: 'Créditos SceneFlow',
    activeHandsOnLabel: 'Tiempo operador / PM',
    monthlyGrossLabel: 'Facturación Mensual Estimada',
    monthlyNetLabel: 'Ganancia Neta Mensual Est. (tras créditos y tiempo PM)',
    perMonthSuffix: '/ mes',
    marginBadgeSuffix: 'margen neto',
    disclaimer:
      'El costo total de entrega incluye créditos de cómputo en SceneFlow ($0.01/crédito adicional) más el tiempo estimado del operador/PM en entrevista, dirección y revisión en Screening Room. Tú defines tus precios.',
    launchBusinessCta: 'Lanza tu Servicio de Video ($9)',
    workflowHeading: 'Cómo Fluye un Proyecto de Cliente en 4 Pasos Simples',
    stepPrefix: 'Paso',
    workflowSteps: [
      {
        step: '01',
        title: 'Entrevista Guiada con el Cliente',
        detail:
          'Conversa con tu cliente («Cuéntame tu historia») para capturar momentos emotivos y las personas clave de cada etapa.',
      },
      {
        step: '02',
        title: 'Aprobación por Enlace de Blueprint',
        detail:
          'Valida con Audience Resonance y envía un enlace limpio de Blueprint para la firma del cliente antes de producir.',
      },
      {
        step: '03',
        title: 'Producción Híbrida Fotos + IA',
        detail:
          'Combina fotografías reales del cliente con elenco multiedad, vestuario por escena y Audio Agent / Clips Agent.',
      },
      {
        step: '04',
        title: 'Entrega en Screening Room',
        detail:
          'Comparte un enlace privado de Screening Room para revisión cuadro por cuadro, exporta el máster 4K y cobra tu entrega.',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'Video Memorias',
        badge: '$300–$950 / filme · Mercado: $800–$3,500+',
        title: 'Historias de Vida, Homenajes y Biografías Familiares',
        description:
          'Combina fotografías familiares reales con recreaciones cinematográficas de época con IA y continuidad precisa por edades (17 → 32 → 62 años) narradas con voces cálidas y naturales.',
        globalMarketNeed:
          'Cientos de millones de padres mayores, bodas de oro y cumpleaños clave ocurren cada año en el mundo, pero más del 90% nunca se filma porque un equipo de $2,000+ es inaccesible.',
        clientBuyer:
          'Familias, aniversarios y cumpleaños clave, planificadores patrimoniales, residencias de mayores y casas conmemorativas',
        traditionalMarketRangeLabel: '$800–$3,500+',
        typicalRetailUsd: 499,
        priceTiersUsd: [300, 499, 950],
        retailRangeLabel: '$300–$950',
        estComputeUsd: 22,
        estOperatorUsd: 78,
        activeMinutesLabel: '~1.5–2 h',
        keyAdvantage:
          'Entrega una memoria de nivel $1,500 por ~$100 de costo total (~$22 en créditos + ~$78 de tiempo PM) — cobrar $300–$500 conquista familias excluidas por las productoras tradicionales.',
      },
      {
        id: 'realestate',
        tabLabel: 'Tours Inmobiliarios',
        badge: '$199–$549 / propiedad · Mercado: $450–$1,500+',
        title: 'Recorridos Narrados de Propiedades y Hoteles Boutique',
        description:
          'Transforma fotos de propiedades y atractivos del vecindario en recorridos cinematográficos con música y locución — más versiones al instante en inglés, chino, árabe o portugués para compradores internacionales.',
        globalMarketNeed:
          'Decenas de millones de propiedades residenciales, alquileres vacacionales y hoteles boutique compiten cada mes por compradores locales y extranjeros usando solo fotos fijas.',
        clientBuyer:
          'Agentes inmobiliarios residenciales, agencias de lujo, alquileres vacacionales y hoteles boutique',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [199, 299, 549],
        retailRangeLabel: '$199–$549',
        estComputeUsd: 12,
        estOperatorUsd: 48,
        activeMinutesLabel: '~45–60 min',
        keyAdvantage:
          'Sin desplazamientos ni demoras por clima: convierte fotos inmobiliarias en recorridos narrados multilingües por ~$60 de costo total — más de 60% menos que un rodaje presencial.',
      },
      {
        id: 'training',
        tabLabel: 'Capacitación y SOPs',
        badge: '$599–$1,800 / módulo · Mercado: $1,500–$5,000+',
        title: 'Inducción Corporativa, Seguridad y Cursos Multilingües',
        description:
          'Bloquea un instructor consistente, uniformes y entornos de trabajo en tu Bóveda de Continuidad — y entrega módulos claros localizados al idioma nativo de cada empleado.',
        globalMarketNeed:
          'Cada planta industrial, red de clínicas, restaurante y franquicia en el mundo enfrenta rotación de personal, normas de seguridad y equipos multilingües que requieren video SOP.',
        clientBuyer:
          'Equipos de RR. HH. y formación, plantas industriales, clínicas médicas, restaurantes y franquicias',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [599, 950, 1800],
        retailRangeLabel: '$599–$1,800',
        estComputeUsd: 35,
        estOperatorUsd: 115,
        activeMinutesLabel: '~2–2.5 h',
        keyAdvantage:
          '70% menos costo de entrega (~$150 vs $3,000+ en vivo) — y cuando cambia una norma, actualizas una escena en minutos sin volver a grabar.',
      },
      {
        id: 'brand',
        tabLabel: 'Historias de Marca',
        badge: '$399–$1,200 / paquete · Mercado: $3,000–$8,000+',
        title: 'Historias de Fundadores, Videos para Clínicas y Anuncios',
        description:
          'Produce historias de marca de alta conversión para sitios web junto con tráilers verticales 9:16 automáticos para Instagram, TikTok y YouTube Shorts — revisados con el cliente en Screening Room.',
        globalMarketNeed:
          'Más de 30 millones de clínicas, despachos legales, restaurantes y comercios locales en el mundo necesitan videos web de confianza y anuncios 9:16, pero no pueden pagar $5,000+.',
        clientBuyer:
          'Consultorios médicos y dentales, despachos legales, PyMEs locales, agencias y marcas de comercio electrónico',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [399, 650, 1200],
        retailRangeLabel: '$399–$1,200',
        estComputeUsd: 22,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1.5–2 h',
        keyAdvantage:
          'Abre el mercado de clínicas, restaurantes y despachos por ~$110 de costo total — incluyendo cortes verticales 9:16 automáticos.',
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
          'Pronostica créditos Pre-vis, lanza agentes autónomos de Audio, Stills, Clips y Producción en 20 proyectos activos, revisa videos desde perspectiva de Audiencia y Director en FlowDirector con recreación de clips en 1 clic, y entrega en 70+ idiomas.',
        featureIcons: [
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
          'Evalúa ganchos de retención antes de producir, dirige química entre múltiples anfitriones y banda sonora a medida, ajusta tiempos en Production Mixer y exporta paquetes 16:9 + 9:16.',
        featureIcons: [
          'sceneWorkflow',
          'seriesResonance',
          'musicScore',
          'scriptSupervisor',
          'mixer',
          'shipPackage',
        ],
      },
      {
        id: 'filmmaker-pitch',
        tabLabel: 'Pre-Vis de Cineastas y Tráilers de Pitch',
        badge: 'Carpetas de Luz Verde · Cine Proof-of-Concept',
        headline: 'Pon a Prueba tu Guion y Entra a Reuniones de Pitch con un Tráiler Terminado',
        description:
          'Co-escribe con FlowDirector, mide ritmo estructural con Audience Resonance en Blueprint y Guion, formatea guiones estándar de la industria y monta tráilers cinematográficos.',
        featureIcons: [
          'blueprintDirector',
          'blueprintResonance',
          'goToProduction',
          'productionScript',
          'scriptResonance',
          'promoTrailers',
        ],
      },
    ],
  },
  directoryDrawer: {
    badge: 'Automatización y 34 Capacidades · Recorrido 5K Narrado en 7 Idiomas',
    title: 'Automatiza Producción y Control de Calidad en 20+ Proyectos Simultáneos',
    subtitle:
      'Cada herramienta incluye ahora un recorrido 5K panorámico y narrado en 7 idiomas. Descubre cómo FlowDirector evalúa el video desde la perspectiva de Audiencia y Director con recreación de clips en 1 clic, y cómo los agentes reemplazan 300+ prompts.',
    expandCta: 'Explorar 34 Capacidades 5K Narradas',
    collapseCta: 'Ocultar Directorio de Capacidades',
    automationEyebrow: 'Diseñado para Creadores de Alto Volumen y Proveedores con 20 Proyectos',
    automationTitle: 'Automatización Integral: Los Agentes Producen. FlowDirector Audita y Repara en 1 Clic.',
    automationSubtitle:
      'Deja de vigilar prompts plano por plano. Los agentes de Audio, Stills, Clips y Producción construyen escenas en segundo plano mientras FlowDirector evalúa cada MP4 en Audience Resonance y Cumplimiento del Director, recreando clips en un clic.',
    spotlightFlowDirectorLabel: 'FlowDirector QA de Video',
    spotlightFlowDirectorMeta: 'Audiencia AR + Director · Recrea Clips en 1 Clic',
    spotlightAgentsLabel: 'Agentes Autónomos de Producción',
    spotlightAgentsMeta: '300+ Prompts Automatizados · Escala a 20 Proyectos Activos',
    spotlightNarrated5kLabel: '34 Capacidades · Tour 5K Narrado',
    spotlightNarrated5kMeta: 'Paneo 5K Sincronizado + Voz Neuronal en los 7 Idiomas',
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
