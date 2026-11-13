import type { StudioLandingCopy } from './types'

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
        badge: 'Luz Verde Antes de Gastar',
        title: 'Revisión Experta con Audience Resonance y FlowDirector',
        description:
          'Audience Resonance califica tu Serie, Blueprint y Guion frente a tu público objetivo, mientras FlowDirector detecta caídas de ritmo y aplica mejoras creativas en un clic antes de renderizar.',
        outcomeTag: 'Puntuación de Serie · Blueprint · Guion',
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
        arLabel: 'Audience Resonance',
        arStatus: 'Luz Verde Lista · 3 Etapas',
        gateSeries: 'Serie 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: 'Guion 94',
        flowDirectorNote: 'FlowDirector: refuerzo emocional en el clímax con 1 clic (+6 pts)',
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
    eyebrow: 'Monetiza tu Creatividad · Servicios B2B y para Clientes',
    title: 'Convierte SceneFlow en un',
    titleAccent: 'Negocio de Video de Alto Margen',
    subtitle:
      'Familias, inmobiliarias, escuelas y negocios locales pagan de $200 a $2,500+ por videos narrativos personalizados — mientras los rodajes tradicionales cuestan miles. Entrega producciones inolvidables en horas y conserva el 100% de tus ingresos.',
    commercialRightsBadge: '100% Propiedad Comercial · Entrega Masters a tus Clientes',
    verticalsHeading: '1. Elige un Servicio de Alta Demanda',
    whoBuysLabel: 'Quiénes Compran Recurrentemente',
    marginAdvantageLabel: 'Ventaja de Margen con SceneFlow',
    calculatorBadge: 'Simulador Interactivo de Economía Unitaria',
    calculatorTitle: '2. Estima tus Ingresos Mensuales por Servicios',
    volumeLabel: 'Entregas a clientes / mes:',
    projectsPerMonthSuffix: 'proyectos/mes',
    typicalFeeLabel: 'Precio típico al cliente',
    estComputeLabel: 'Cómputo est. en SceneFlow',
    activeHandsOnLabel: 'Dirección activa',
    monthlyGrossLabel: 'Facturación Mensual Estimada',
    monthlyNetLabel: 'Ingreso Neto Est. del Creador (antes del plan base)',
    perMonthSuffix: '/ mes',
    marginBadgeSuffix: 'margen bruto',
    disclaimer:
      'Estimaciones ilustrativas usando el flujo híbrido de Animatic Pre-vis + clips IA 4K selectivos ($0.01/crédito adicional). Tú defines tus propios precios y condiciones con tus clientes.',
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
        badge: '$350–$799 / filme · Alto Valor Emocional',
        title: 'Historias de Vida, Homenajes y Biografías Familiares',
        description:
          'Combina fotografías familiares reales con recreaciones cinematográficas de época con IA y continuidad precisa por edades (17 → 32 → 62 años) narradas con voces cálidas y naturales.',
        clientBuyer:
          'Familias, aniversarios y cumpleaños clave, planificadores patrimoniales, residencias de mayores y casas conmemorativas',
        typicalRetailUsd: 450,
        retailRangeLabel: '$350–$799',
        estComputeUsd: 75,
        activeMinutesLabel: '~45 min',
        keyAdvantage:
          'El modo Documental Híbrido une fotos reales de archivo con clips IA clave para lograr márgenes superiores al 80%.',
      },
      {
        id: 'realestate',
        tabLabel: 'Tours Inmobiliarios',
        badge: '$199–$399 / propiedad · Volumen Recurrente',
        title: 'Recorridos Narrados de Propiedades y Hoteles Boutique',
        description:
          'Transforma fotos de propiedades y atractivos del vecindario en recorridos cinematográficos con música y locución — más versiones al instante en inglés, chino, árabe o portugués para compradores internacionales.',
        clientBuyer:
          'Agentes inmobiliarios residenciales, agencias de lujo, alquileres vacacionales y hoteles boutique',
        typicalRetailUsd: 275,
        retailRangeLabel: '$199–$399',
        estComputeUsd: 22,
        activeMinutesLabel: '~20 min',
        keyAdvantage:
          'Un solo corredor con 4 propiedades al mes se convierte en una cuenta de iguala mensual recurrente.',
      },
      {
        id: 'training',
        tabLabel: 'Capacitación y SOPs',
        badge: '$600–$2,500 / curso · 70+ Idiomas',
        title: 'Inducción Corporativa, Seguridad y Cursos Multilingües',
        description:
          'Bloquea un instructor consistente, uniformes y entornos de trabajo en tu Bóveda de Continuidad — y entrega módulos claros localizados al idioma nativo de cada empleado.',
        clientBuyer:
          'Equipos de RR. HH. y formación, plantas industriales, clínicas médicas, restaurantes y franquicias',
        typicalRetailUsd: 950,
        retailRangeLabel: '$600–$2,500',
        estComputeUsd: 80,
        activeMinutesLabel: '~60 min',
        keyAdvantage:
          'Actualiza una norma o procedimiento en minutos sin volver a contratar actores ni repetir rodajes.',
      },
      {
        id: 'brand',
        tabLabel: 'Historias de Marca',
        badge: '$400–$1,200 / paquete · Web + Redes',
        title: 'Historias de Fundadores, Videos para Clínicas y Anuncios',
        description:
          'Produce historias de marca de alta conversión para sitios web junto con tráilers verticales 9:16 automáticos para Instagram, TikTok y YouTube Shorts — revisados con el cliente en Screening Room.',
        clientBuyer:
          'Consultorios médicos y dentales, despachos legales, PyMEs locales, agencias y marcas de comercio electrónico',
        typicalRetailUsd: 600,
        retailRangeLabel: '$400–$1,200',
        estComputeUsd: 40,
        activeMinutesLabel: '~35 min',
        keyAdvantage:
          'Vende campañas promocionales de temporada reutilizando la Bóveda de Continuidad guardada del cliente.',
      },
    ],
  },
  guidedTour: {
    eyebrow: 'Recorrido Visual del Estudio · Sin Jerga',
    title: 'Cuatro Salas Conectadas.',
    titleAccent: 'Un Flujo Sin Esfuerzo.',
    subtitle:
      'Descubre cómo una idea avanza desde la entrevista inicial hasta el máster aprobado por tu audiencia o cliente — con muestras reales de nuestro Sandbox en lugar de un denso manual técnico.',
    stepPrefix: 'Paso',
    lensLabel: 'Enfoque de vista previa:',
    lensCreator: 'Serie Original («The Glass Ledger»)',
    lensService: 'Servicio a Clientes («Video Memoria de Vida»)',
    watchRoomVideoLabel: 'Ver Tour de 30s',
    inspectFullScreenLabel: 'Ver Pantalla Completa del Estudio',
    openLiveScreeningLabel: 'Abrir Screening Room en Vivo',
    screeningModalTitle: 'The Glass Ledger — Screening Room de Demostración',
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
  directoryDrawer: {
    badge: 'Especificación Completa del Estudio · Más de 30 Capacidades',
    title: '¿Quieres Todos los Detalles Técnicos? Explora el Directorio Completo del Estudio',
    subtitle:
      'Abre el catálogo interactivo sala por sala para inspeccionar capturas reales de trabajo en resolución 5K de Series Room, Blueprint Room, Production Stage, Production Mixer y Screening Room.',
    expandCta: 'Abrir Directorio Completo de 30+ Funciones',
    collapseCta: 'Ocultar Directorio de 30+ Funciones',
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
} satisfies StudioLandingCopy
