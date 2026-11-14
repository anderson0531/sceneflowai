import type { MobileCompanionPwaCopy } from './locales/types'

export const MOBILE_COMPANION_COPY_EN: MobileCompanionPwaCopy = {
  eyebrow: 'Mobile Companion App (PWA) · iOS & Android',
  title: 'Desktop Studio Power.',
  titleAccent: 'Pocket Command for Teams & Clients.',
  subtitle:
    'Because multi-track 4K production belongs on a desktop display, SceneFlow pairs your Studio with an instant-install Mobile PWA—connecting teams, Project Managers (PMs), and subscribed customers with live notifications, milestone status, credit budgets, and shared review links.',
  whyPwaBadge: 'Instant PWA · Zero App Store Friction',
  whyPwaNote:
    'Installs in one tap from Safari or Chrome with native Web Push alerts—no downloads, gatekeeping, or version lag.',
  modeCustomerTab: 'Customer & PM Loop',
  modeTeamTab: 'Team & Budget Hub',
  customerHeading: 'Customer-Initiated Projects with Managed PM Collaboration',
  customerSubheading:
    'Subscribed customers can initiate a project and baseline Blueprint from their phone, request PM support, and iterate through four shared approval links.',
  customerSteps: [
    {
      step: '01',
      badge: 'Mobile Initiation',
      title: 'Subscribe, Initiate Project & Request PM Support',
      detail:
        'Customers subscribe, speak or type their story brief on mobile to generate a baseline Blueprint, and flag Project Manager (PM) support in one tap.',
      linkLabel: 'Mobile Companion · + New Project',
      phoneHeadline: 'Harbor Family Memoir',
      phoneStatus: 'PM Support Assigned · Blueprint Ready',
      phoneMeta: 'Customer initiated via Mobile PWA · Budget cap: 2,500 cr',
    },
    {
      step: '02',
      badge: 'Shared Blueprint & ARA',
      title: 'Iterate on Blueprint & Audience Resonance',
      detail:
        'Your PM reviews the baseline, optimizes Audience Resonance on desktop, and shares live Blueprint & Resonance links for mobile feedback and sign-off.',
      linkLabel: '/blueprint/share · /share/script-resonance',
      phoneHeadline: 'Blueprint & Resonance Review',
      phoneStatus: '94 / 100 Audience Resonance · Approved',
      phoneMeta: '2 beat notes resolved with PM · Ready for Continuity',
    },
    {
      step: '03',
      badge: 'Shared Continuity Link',
      title: 'Upload Mobile Photos & Approve Continuity',
      detail:
        'PM shares a dedicated Continuity link so customers can upload real family, property, or product photos straight from their phone gallery or camera and approve Cast, Wardrobes, Locations & Props.',
      linkLabel: '/share/continuity · Gallery & Camera Upload',
      phoneHeadline: 'Continuity & Photo Collection',
      phoneStatus: '6 Client Photos Uploaded · Cast & Sets Locked',
      phoneMeta: 'Auto-downscaled & EXIF-sanitized · 1-click Studio promote',
    },
    {
      step: '04',
      badge: 'Shared Screening Room',
      title: 'Frame-Accurate Mobile Screening & Final Sign-Off',
      detail:
        'Watch voiced Pre-Vis animatics and 4K rendered cuts on any phone, leave timestamped notes, and tap Approve Final Master for delivery.',
      linkLabel: '/share/screening-room · Final Approval',
      phoneHeadline: 'Premiere Screening Room',
      phoneStatus: 'Final 4K Master Approved ✓',
      phoneMeta: 'Multilanguage streams unlocked · Ready to publish',
    },
  ],
  teamHeading: 'Real-Time Pocket Command for Producers, Directors & PMs',
  teamSubheading:
    'Keep every production moving while away from your desk—with role-aware visibility across workspace admins and assigned Project Managers.',
  teamPillars: [
    {
      id: 'alerts',
      title: 'Instant Web Push Notifications',
      detail:
        'Get alerted the second an autonomous agent finishes rendering, a customer initiates a brief, or new Continuity photos land.',
      metric: 'Live Push + Inbox',
    },
    {
      id: 'status',
      title: '5-Stage Milestone & Pace Tracker',
      detail:
        'Monitor Blueprint, Resonance, Continuity, Production, and Screening Room progress plus daily scene schedule pace.',
      metric: 'On-Pace Visibility',
    },
    {
      id: 'budget',
      title: 'Credit Balance & Hard Budget Caps',
      detail:
        'Track available studio credits, per-project client budget caps, and PM monthly credit allowances in real time.',
      metric: 'Margin Guardrails',
    },
    {
      id: 'links',
      title: '1-Tap Native Mobile Link Sharing',
      detail:
        'Dispatch Blueprint, Resonance, Continuity Upload, and Screening Room links via SMS, WhatsApp, Slack, or Email.',
      metric: '4 Shared Portals',
    },
  ],
  phoneHeaderBrand: 'SceneFlow Companion',
  phoneCreditsPill: '14,250 cr',
  phonePmBadge: 'PM Connected',
  phoneStageBarLabels: ['Blueprint', 'Resonance', 'Continuity', 'Build', 'Screening'],
  phoneTeamAlertTitle: 'New Client Continuity Upload',
  phoneTeamAlertBody: 'Elena uploaded 6 family archive photos · Tap to review & promote',
  phoneTeamBudgetLabel: 'Project Credit Budget',
  phoneTeamBudgetValue: '1,180 / 2,500 cr',
  phoneTeamPaceBadge: 'On Pace · Under Budget',
  installIosBadge: 'iOS Safari: Share → Add to Home Screen',
  installAndroidBadge: 'Android / Chrome: 1-Tap Install App',
  ctaPrimary: 'Start with Studio + Mobile PWA ($9)',
}

export const MOBILE_COMPANION_COPY_ES: MobileCompanionPwaCopy = {
  eyebrow: 'App Móvil Complementaria (PWA) · iOS y Android',
  title: 'Potencia de Estudio en Escritorio.',
  titleAccent: 'Control Móvil para Equipos y Clientes.',
  subtitle:
    'Como la producción 4K multipista requiere pantalla de escritorio, SceneFlow combina tu Estudio con una PWA móvil de instalación instantánea—conectando equipos, Project Managers (PM) y clientes suscritos con alertas, estado de hitos, presupuesto de créditos y enlaces de revisión.',
  whyPwaBadge: 'PWA Instantánea · Sin Fricción de App Store',
  whyPwaNote:
    'Instálala en un toque desde Safari o Chrome con alertas Web Push nativas—sin descargas pesadas ni esperas.',
  modeCustomerTab: 'Ciclo Cliente y PM',
  modeTeamTab: 'Equipo y Presupuesto',
  customerHeading: 'Proyectos Iniciados por el Cliente con Soporte de PM',
  customerSubheading:
    'Los clientes suscritos inician su proyecto y Blueprint base desde el móvil, solicitan un PM e iteran mediante cuatro enlaces compartidos.',
  customerSteps: [
    {
      step: '01',
      badge: 'Inicio Móvil',
      title: 'Suscribirse, Iniciar Proyecto y Solicitar PM',
      detail:
        'El cliente suscrito dicta o escribe su idea desde el teléfono para generar el Blueprint inicial y activa el soporte de Project Manager (PM).',
      linkLabel: 'App Móvil · + Nuevo Proyecto',
      phoneHeadline: 'Memoria Familiar del Puerto',
      phoneStatus: 'PM Asignado · Blueprint Listo',
      phoneMeta: 'Iniciado en PWA Móvil · Límite: 2,500 cr',
    },
    {
      step: '02',
      badge: 'Blueprint y Resonancia',
      title: 'Iterar en Blueprint y Audience Resonance',
      detail:
        'El PM revisa la base, optimiza Audience Resonance en escritorio y comparte enlaces vivos de Blueprint y Resonancia para aprobación móvil.',
      linkLabel: '/blueprint/share · /share/script-resonance',
      phoneHeadline: 'Revisión de Blueprint y Resonancia',
      phoneStatus: '94 / 100 Audience Resonance · Aprobado',
      phoneMeta: '2 notas resueltas con el PM · Listo para Continuidad',
    },
    {
      step: '03',
      badge: 'Enlace de Continuidad',
      title: 'Subir Fotos desde el Móvil y Aprobar Continuidad',
      detail:
        'El PM comparte un enlace de Continuidad para que el cliente suba fotos reales desde su galería o cámara y apruebe Elenco, Vestuario, Locaciones y Utilería.',
      linkLabel: '/share/continuity · Galería y Cámara',
      phoneHeadline: 'Continuidad y Carga de Fotos',
      phoneStatus: '6 Fotos Subidas · Elenco y Sets Fijados',
      phoneMeta: 'Optimización automática sin EXIF · Promoción en 1 clic',
    },
    {
      step: '04',
      badge: 'Screening Room Compartido',
      title: 'Revisión en Screening Room y Aprobación Final',
      detail:
        'Reproduce animatics con voz y cortes 4K en cualquier teléfono, deja notas con marca de tiempo y aprueba el máster final.',
      linkLabel: '/share/screening-room · Aprobación Final',
      phoneHeadline: 'Screening Room de Estreno',
      phoneStatus: 'Máster 4K Final Aprobado ✓',
      phoneMeta: 'Streams multilingües listos para publicar',
    },
  ],
  teamHeading: 'Centro de Mando de Bolsillo para Productores, Directores y PMs',
  teamSubheading:
    'Mantén cada producción en marcha lejos del escritorio con visibilidad completa para administradores y Project Managers asignados.',
  teamPillars: [
    {
      id: 'alerts',
      title: 'Notificaciones Web Push al Instante',
      detail:
        'Recibe alertas cuando termina un render autónomo, un cliente inicia un proyecto o llegan nuevas fotos de Continuidad.',
      metric: 'Push + Bandeja Viva',
    },
    {
      id: 'status',
      title: 'Seguimiento de 5 Etapas y Ritmo',
      detail:
        'Supervisa Blueprint, Resonancia, Continuidad, Producción y Screening Room junto al ritmo diario de escenas.',
      metric: 'Visibilidad en Ritmo',
    },
    {
      id: 'budget',
      title: 'Saldo de Créditos y Topes de Presupuesto',
      detail:
        'Controla créditos disponibles, topes por proyecto de cliente y límites mensuales por PM en tiempo real.',
      metric: 'Protección de Margen',
    },
    {
      id: 'links',
      title: 'Envío de Enlaces en 1 Toque',
      detail:
        'Comparte enlaces de Blueprint, Resonancia, Continuidad y Screening Room por WhatsApp, SMS, Slack o correo.',
      metric: '4 Portales Compartidos',
    },
  ],
  phoneHeaderBrand: 'SceneFlow Companion',
  phoneCreditsPill: '14,250 cr',
  phonePmBadge: 'PM Conectado',
  phoneStageBarLabels: ['Blueprint', 'Resonancia', 'Continuidad', 'Rodaje', 'Screening'],
  phoneTeamAlertTitle: 'Nueva Foto de Continuidad del Cliente',
  phoneTeamAlertBody: 'Elena subió 6 fotos familiares · Toca para revisar y promover',
  phoneTeamBudgetLabel: 'Presupuesto de Créditos',
  phoneTeamBudgetValue: '1,180 / 2,500 cr',
  phoneTeamPaceBadge: 'En Ritmo · Bajo Presupuesto',
  installIosBadge: 'iOS Safari: Compartir → Añadir a inicio',
  installAndroidBadge: 'Android / Chrome: Instalar App en 1 toque',
  ctaPrimary: 'Empezar con Estudio + PWA Móvil ($9)',
}

export const MOBILE_COMPANION_COPY_PT: MobileCompanionPwaCopy = {
  eyebrow: 'App Móvel Complementar (PWA) · iOS e Android',
  title: 'Potência de Estúdio no Desktop.',
  titleAccent: 'Comando no Bolso para Equipes e Clientes.',
  subtitle:
    'Como a edição 4K multifaixa exige tela de desktop, o SceneFlow une o Estúdio a um PWA Móvel de instalação imediata—conectando equipes, Project Managers (PMs) e clientes assinantes com notificações, status, orçamento de créditos e links de aprovação.',
  whyPwaBadge: 'PWA Instantâneo · Sem Burocracia de App Store',
  whyPwaNote:
    'Instale com um toque pelo Safari ou Chrome com alertas Web Push nativos—sem downloads pesados.',
  modeCustomerTab: 'Fluxo Cliente e PM',
  modeTeamTab: 'Equipe e Orçamento',
  customerHeading: 'Projetos Iniciados pelo Cliente com Suporte de PM',
  customerSubheading:
    'Clientes assinantes iniciam o projeto e o Blueprint pelo celular, solicitam suporte de PM e iteram por quatro links compartilhados.',
  customerSteps: [
    {
      step: '01',
      badge: 'Início no Celular',
      title: 'Assinar, Iniciar Projeto e Solicitar PM',
      detail:
        'O cliente dita ou digita o briefing no celular para gerar o Blueprint base e aciona o suporte de um Project Manager (PM).',
      linkLabel: 'App Móvel · + Novo Projeto',
      phoneHeadline: 'Memória da Família Porto',
      phoneStatus: 'PM Atribuído · Blueprint Pronto',
      phoneMeta: 'Iniciado via PWA Móvel · Teto: 2.500 cr',
    },
    {
      step: '02',
      badge: 'Blueprint e Ressonância',
      title: 'Iterar em Blueprint e Audience Resonance',
      detail:
        'O PM refina a estrutura e a pontuação de Audience Resonance no desktop e compartilha o link para revisão e aprovação.',
      linkLabel: '/blueprint/share · /share/script-resonance',
      phoneHeadline: 'Revisão de Blueprint e Ressonância',
      phoneStatus: '94 / 100 Audience Resonance · Aprovado',
      phoneMeta: '2 ajustes alinhados com o PM · Pronto para Continuidade',
    },
    {
      step: '03',
      badge: 'Link de Continuidade',
      title: 'Enviar Fotos pelo Celular e Aprovar Continuidade',
      detail:
        'O PM envia um link dedicado de Continuidade para o cliente subir fotos da galeria ou câmera e aprovar Elenco, Figurinos, Locações e Objetos.',
      linkLabel: '/share/continuity · Galeria e Câmera',
      phoneHeadline: 'Continuidade e Envio de Fotos',
      phoneStatus: '6 Fotos Enviadas · Elenco e Cenários Travados',
      phoneMeta: 'Redimensionamento automático sem EXIF · Promoção em 1 clique',
    },
    {
      step: '04',
      badge: 'Screening Room',
      title: 'Revisão Móvel no Screening Room e Aprovação Final',
      detail:
        'Assista ao animatic narrado e cortes 4K no celular, deixe notas por segundo e aprove o master final.',
      linkLabel: '/share/screening-room · Aprovação Final',
      phoneHeadline: 'Screening Room de Estreia',
      phoneStatus: 'Master 4K Final Aprovado ✓',
      phoneMeta: 'Versões multilíngues liberadas para entrega',
    },
  ],
  teamHeading: 'Comando em Tempo Real para Produtores, Diretores e PMs',
  teamSubheading:
    'Acompanhe cada entrega longe da mesa com visibilidade integrada para administradores e Project Managers.',
  teamPillars: [
    {
      id: 'alerts',
      title: 'Alertas Web Push Instantâneos',
      detail:
        'Receba avisos quando renders terminam, clientes iniciam projetos ou novas fotos de Continuidade chegam.',
      metric: 'Push + Inbox ao Vivo',
    },
    {
      id: 'status',
      title: 'Status em 5 Etapas e Ritmo',
      detail:
        'Monitore Blueprint, Ressonância, Continuidade, Produção e Screening Room além do cronograma de cenas.',
      metric: 'Ritmo Transparente',
    },
    {
      id: 'budget',
      title: 'Saldo de Créditos e Tetos de Custo',
      detail:
        'Veja créditos disponíveis, tetos de orçamento por projeto e franquias mensais de cada PM.',
      metric: 'Margem Protegida',
    },
    {
      id: 'links',
      title: 'Compartilhamento Nativo em 1 Toque',
      detail:
        'Envie links de Blueprint, Ressonância, Continuidade e Screening Room via WhatsApp, SMS, Slack ou e-mail.',
      metric: '4 Portais Ativos',
    },
  ],
  phoneHeaderBrand: 'SceneFlow Companion',
  phoneCreditsPill: '14.250 cr',
  phonePmBadge: 'PM Conectado',
  phoneStageBarLabels: ['Blueprint', 'Ressonância', 'Continuidade', 'Produção', 'Screening'],
  phoneTeamAlertTitle: 'Novas Fotos de Continuidade',
  phoneTeamAlertBody: 'Elena enviou 6 fotos de arquivo · Toque para revisar e promover',
  phoneTeamBudgetLabel: 'Orçamento de Créditos',
  phoneTeamBudgetValue: '1.180 / 2.500 cr',
  phoneTeamPaceBadge: 'No Prazo · Abaixo do Teto',
  installIosBadge: 'iOS Safari: Compartilhar → Tela de Início',
  installAndroidBadge: 'Android / Chrome: Instalar App em 1 toque',
  ctaPrimary: 'Começar com Estúdio + PWA Móvel ($9)',
}

export const MOBILE_COMPANION_COPY_HI: MobileCompanionPwaCopy = {
  eyebrow: 'मोबाइल कम्पैनियन ऐप (PWA) · iOS और Android',
  title: 'डेस्कटॉप स्टूडियो की शक्ति।',
  titleAccent: 'टीम और ग्राहकों के लिए पॉकेट कमांड।',
  subtitle:
    'चूंकि मल्टी-ट्रैक 4K प्रोडक्शन डेस्कटॉप स्क्रीन के लिए बना है, SceneFlow आपके स्टूडियो को इंस्टेंट-इंस्टॉल मोबाइल PWA से जोड़ता है—जिससे टीमें, प्रोजेक्ट मैनेजर (PM) और सब्सक्राइबर ग्राहक लाइव नोटिफिकेशन, स्थिति, बजट और शेयर लिंक से जुड़े रहते हैं।',
  whyPwaBadge: 'इंस्टेंट PWA · बिना ऐप स्टोर झंझट',
  whyPwaNote:
    'Safari या Chrome से एक टैप में होम स्क्रीन पर इंस्टॉल करें और तुरंत Web Push अलर्ट पाएं।',
  modeCustomerTab: 'ग्राहक और PM लूप',
  modeTeamTab: 'टीम और बजट हब',
  customerHeading: 'PM सहायता के साथ ग्राहक-प्रारंभित प्रोजेक्ट',
  customerSubheading:
    'सब्सक्राइबर ग्राहक फ़ोन से प्रोजेक्ट और Blueprint शुरू करते हैं, PM सपोर्ट चुनते हैं और चार साझा लिंक से समीक्षा करते हैं।',
  customerSteps: [
    {
      step: '01',
      badge: 'मोबाइल शुरुआत',
      title: 'सब्सक्राइब करें, प्रोजेक्ट व Blueprint शुरू करें',
      detail:
        'ग्राहक मोबाइल पर बोलकर या टाइप करके बेसलाइन Blueprint बनाते हैं और एक टैप में Project Manager (PM) सहायता मांगते हैं।',
      linkLabel: 'मोबाइल ऐप · + नया प्रोजेक्ट',
      phoneHeadline: 'हार्बर फैमिली मेमॉयर',
      phoneStatus: 'PM नियुक्त · Blueprint तैयार',
      phoneMeta: 'मोबाइल PWA से शुरू · बजट सीमा: 2,500 cr',
    },
    {
      step: '02',
      badge: 'Blueprint व रेज़ोनेंस',
      title: 'Blueprint और Audience Resonance पर सहयोग',
      detail:
        'PM डेस्कटॉप पर Blueprint और Audience Resonance स्कोर निखारते हैं और ग्राहक समीक्षा हेतु लाइव लिंक भेजते हैं।',
      linkLabel: '/blueprint/share · /share/script-resonance',
      phoneHeadline: 'Blueprint और रेज़ोनेंस समीक्षा',
      phoneStatus: '94 / 100 Audience Resonance · स्वीकृत',
      phoneMeta: 'PM के साथ 2 नोट्स हल · कंटिन्यूटी के लिए तैयार',
    },
    {
      step: '03',
      badge: 'साझा कंटिन्यूटी लिंक',
      title: 'मोबाइल से फोटो अपलोड और कंटिन्यूटी मंज़ूरी',
      detail:
        'PM साझा कंटिन्यूटी लिंक भेजते हैं जिससे ग्राहक फ़ोन गैलरी या कैमरे से असली फ़ोटो अपलोड करते हैं और पात्र, पोशाक, लोकेशन व प्रॉप्स मंज़ूर करते हैं।',
      linkLabel: '/share/continuity · गैलरी और कैमरा अपलोड',
      phoneHeadline: 'कंटिन्यूटी और फोटो संग्रह',
      phoneStatus: '6 फोटो अपलोड · कास्ट और लोकेशन लॉक',
      phoneMeta: 'ऑटो-ऑप्टिमाइज़्ड व EXIF सुरक्षित · 1-क्लिक स्टूडियो प्रमोट',
    },
    {
      step: '04',
      badge: 'साझा Screening Room',
      title: 'मोबाइल Screening Room समीक्षा और अंतिम मंज़ूरी',
      detail:
        'किसी भी फ़ोन पर Pre-Vis एनिमैटिक और 4K कट देखें, टाइमस्टैम्प नोट्स दें और फाइनल मास्टर मंज़ूर करें।',
      linkLabel: '/share/screening-room · अंतिम मंज़ूरी',
      phoneHeadline: 'प्रीमियर Screening Room',
      phoneStatus: 'फाइनल 4K मास्टर स्वीकृत ✓',
      phoneMeta: 'बहुभाषी स्ट्रीम डिलीवरी के लिए तैयार',
    },
  ],
  teamHeading: 'प्रोड्यूसर, डायरेक्टर और PM के लिए रियल-टाइम पॉकेट कमांड',
  teamSubheading:
    'डेस्क से दूर रहते हुए भी हर प्रोजेक्ट की रफ़्तार, फीडबैक और क्रेडिट बजट नियंत्रण में रखें।',
  teamPillars: [
    {
      id: 'alerts',
      title: 'तुरंत Web Push नोटिफिकेशन',
      detail:
        'रेंडर पूरा होने, ग्राहक ब्रीफ आने या कंटिन्यूटी फोटो अपलोड होते ही फ़ोन पर अलर्ट पाएं।',
      metric: 'लाइव पुश + इनबॉक्स',
    },
    {
      id: 'status',
      title: '5-चरण माइलस्टोन और गति ट्रैकर',
      detail:
        'Blueprint, रेज़ोनेंस, कंटिन्यूटी, प्रोडक्शन और Screening Room की लाइव स्थिति ट्रैक करें।',
      metric: 'ऑन-पेस ट्रैकिंग',
    },
    {
      id: 'budget',
      title: 'क्रेडिट बैलेंस और बजट कैप',
      detail:
        'उपलब्ध क्रेडिट, प्रति-प्रोजेक्ट बजट सीमा और PM मासिक अलाउंस रियल टाइम में देखें।',
      metric: 'मार्जिन सुरक्षा',
    },
    {
      id: 'links',
      title: '1-टैप मोबाइल लिंक शेयरिंग',
      detail:
        'WhatsApp, SMS, Slack या ईमेल से चारों समीक्षा और अपलोड लिंक तुरंत साझा करें।',
      metric: '4 साझा पोर्टल',
    },
  ],
  phoneHeaderBrand: 'SceneFlow Companion',
  phoneCreditsPill: '14,250 cr',
  phonePmBadge: 'PM कनेक्टेड',
  phoneStageBarLabels: ['Blueprint', 'रेज़ोनेंस', 'कंटिन्यूटी', 'प्रोडक्शन', 'स्क्रीनिंग'],
  phoneTeamAlertTitle: 'नया कंटिन्यूटी फोटो अपलोड',
  phoneTeamAlertBody: 'एलेना ने 6 पारिवारिक फोटो अपलोड किए · समीक्षा हेतु टैप करें',
  phoneTeamBudgetLabel: 'प्रोजेक्ट क्रेडिट बजट',
  phoneTeamBudgetValue: '1,180 / 2,500 cr',
  phoneTeamPaceBadge: 'समय पर · बजट के भीतर',
  installIosBadge: 'iOS Safari: Share → Add to Home Screen',
  installAndroidBadge: 'Android / Chrome: 1-टैप ऐप इंस्टॉल',
  ctaPrimary: 'स्टूडियो + मोबाइल PWA शुरू करें ($9)',
}

export const MOBILE_COMPANION_COPY_ZH_CN: MobileCompanionPwaCopy = {
  eyebrow: '移动伴侣应用 (PWA) · 支持 iOS 与 Android',
  title: '桌面级制片性能，',
  titleAccent: '装进口袋的团队与客户控制中心。',
  subtitle:
    '多轨 4K 精细制片专为桌面大屏设计，因此 SceneFlow 配备即装即用的移动伴侣 PWA——通过实时通知、里程碑状态、积分预算与共享审阅链接，无缝连接制作团队、项目经理 (PM) 与订阅客户。',
  whyPwaBadge: '即装 PWA · 零应用商店门槛',
  whyPwaNote:
    '通过 Safari 或 Chrome 一键添加至主屏幕，支持原生 Web Push 推送提醒，免下载等待、实时同步更新。',
  modeCustomerTab: '客户与 PM 协作环',
  modeTeamTab: '团队与预算中枢',
  customerHeading: '客户自主发起项目 + PM 全程托管协作',
  customerSubheading:
    '订阅客户可在手机端直接发起项目与初始 Blueprint，一键开启 PM 支持，并通过四个共享链接高效迭代定稿。',
  customerSteps: [
    {
      step: '01',
      badge: '手机端发起',
      title: '订阅并创建项目与 Blueprint（申请 PM 支持）',
      detail:
        '客户在手机上语音或文字输入需求即可生成初始故事 Blueprint，并一键勾选项目经理 (PM) 协作支持。',
      linkLabel: '移动伴侣 · + 新建项目',
      phoneHeadline: '海港家族回忆录',
      phoneStatus: '已指派 PM · Blueprint 已就绪',
      phoneMeta: '通过移动 PWA 发起 · 预算上限：2,500 cr',
    },
    {
      step: '02',
      badge: '共享 Blueprint 与共鸣评分',
      title: '协同打磨 Blueprint 与受众共鸣 (ARA)',
      detail:
        'PM 在桌面端优化剧本结构与受众共鸣评分，并分享 Blueprint 与共鸣评估链接供客户手机审阅确认。',
      linkLabel: '/blueprint/share · /share/script-resonance',
      phoneHeadline: 'Blueprint 与共鸣审阅',
      phoneStatus: '94 / 100 受众共鸣评分 · 已批准',
      phoneMeta: '已与 PM 确认 2 处节拍调整 · 进入连续性阶段',
    },
    {
      step: '03',
      badge: '共享连续性链接',
      title: '手机上传参考照片并确认角色/场景连续性',
      detail:
        'PM 发送专属连续性链接，客户直接从手机相册或相机上传家庭老照片、房产实景或产品图，并逐项确认角色、服装、场景与道具。',
      linkLabel: '/share/continuity · 相册与相机上传',
      phoneHeadline: '视觉连续性与照片采集',
      phoneStatus: '已上传 6 张实拍图 · 角色与场景已锁定',
      phoneMeta: '自动压缩并清除 EXIF 隐私 · 一键同步至制片库',
    },
    {
      step: '04',
      badge: '共享审片室',
      title: '手机端逐帧审片与成片签收',
      detail:
        '在手机端随时观看配音动态预演与 4K 成片，添加时间戳批注，一键点击批准最终母带。',
      linkLabel: '/share/screening-room · 最终签收',
      phoneHeadline: '首映审片室 Screening Room',
      phoneStatus: '4K 最终母带已签收 ✓',
      phoneMeta: '多语种音轨已就绪 · 随时交付发布',
    },
  ],
  teamHeading: '制片人、导演与 PM 的随身指挥舱',
  teamSubheading:
    '离开办公桌也能掌控全局，全面支持工作区管理员与项目经理的权限协同与预算管控。',
  teamPillars: [
    {
      id: 'alerts',
      title: '即时 Web Push 手机推送',
      detail:
        '当智能体渲染完成、客户发起新项目或上传连续性照片时，第一时间收到手机通知。',
      metric: '实时推送 + 收件箱',
    },
    {
      id: 'status',
      title: '5 阶段里程碑与排期进度',
      detail:
        '一目了然查看 Blueprint、共鸣、连续性、制作与审片室进度以及每日场次完成节奏。',
      metric: '全流程进度可视',
    },
    {
      id: 'budget',
      title: '积分余额与硬性预算上限',
      detail:
        '实时监控账户积分、单项目客户预算上限以及每位 PM 的月度积分额度，严守交付利润率。',
      metric: '利润率护栏',
    },
    {
      id: 'links',
      title: '一键调用手机原生分享',
      detail:
        '通过微信、WhatsApp、短信、Slack 或邮件一键发送四大共享审阅与照片上传链接。',
      metric: '4 大共享门户',
    },
  ],
  phoneHeaderBrand: 'SceneFlow 移动伴侣',
  phoneCreditsPill: '14,250 cr',
  phonePmBadge: 'PM 已连接',
  phoneStageBarLabels: ['Blueprint', '共鸣评估', '连续性', '制作中', '审片室'],
  phoneTeamAlertTitle: '客户上传了新的连续性照片',
  phoneTeamAlertBody: 'Elena 上传了 6 张家族档案照 · 点击审阅并入库',
  phoneTeamBudgetLabel: '项目积分预算',
  phoneTeamBudgetValue: '1,180 / 2,500 cr',
  phoneTeamPaceBadge: '进度正常 · 预算可控',
  installIosBadge: 'iOS Safari：分享 → 添加到主屏幕',
  installAndroidBadge: 'Android / Chrome：一键安装应用',
  ctaPrimary: '开启桌面制片室 + 移动 PWA ($9)',
}

export const MOBILE_COMPANION_COPY_AR: MobileCompanionPwaCopy = {
  eyebrow: 'تطبيق الرفيق المحمول (PWA) · لنظامي iOS و Android',
  title: 'قوة الاستوديو على سطح المكتب.',
  titleAccent: 'وقيادة فورية في جيبك للفرق والعملاء.',
  subtitle:
    'لأن الإنتاج الاحترافي بدقة 4K متعدد المسارات مصمم لشاشات سطح المكتب، يقرن SceneFlow الاستوديو بتطبيق ويب تقدمي (PWA) فوري التثبيت—لربط الفرق ومديري المشاريع (PMs) والعملاء المشتركين بالإشعارات الحية وحالة المراحل والميزانية وروابط المراجعة.',
  whyPwaBadge: 'تطبيق PWA فوري · بدون قيود متاجر التطبيقات',
  whyPwaNote:
    'يُثبّت بلمسة واحدة من Safari أو Chrome مع إشعارات Web Push أصلية وتحديثات فورية.',
  modeCustomerTab: 'حلقة العميل ومدير المشروع',
  modeTeamTab: 'مركز الفريق والميزانية',
  customerHeading: 'مشاريع يبدأها العميل بدعم متكامل من مدير المشروع (PM)',
  customerSubheading:
    'يمكن للعملاء المشتركين بدء المشروع والـ Blueprint من هواتفهم، وطلب دعم مدير المشروع، والمراجعة عبر أربعة روابط مشتركة.',
  customerSteps: [
    {
      step: '01',
      badge: 'بدء من الهاتف',
      title: 'الاشتراك وبدء المشروع وطلب دعم PM',
      detail:
        'يشترك العميل ويكتب أو يملي ملخص قصته عبر الهاتف لتوليد Blueprint أساسي مع تفعيل دعم مدير المشروع بلمسة واحدة.',
      linkLabel: 'تطبيق الهاتف · + مشروع جديد',
      phoneHeadline: 'مذكرات عائلة الميناء',
      phoneStatus: 'تم تعيين PM · الـ Blueprint جاهز',
      phoneMeta: 'بدأ عبر تطبيق PWA · سقف الميزانية: 2,500 cr',
    },
    {
      step: '02',
      badge: 'Blueprint وصدى الجمهور',
      title: 'تطوير الـ Blueprint ومؤشر صدى الجمهور',
      detail:
        'يراجع مدير المشروع الخطة ويحسّن درجة صدى الجمهور على سطح المكتب ثم يشارك روابط المراجعة الحية مع العميل.',
      linkLabel: '/blueprint/share · /share/script-resonance',
      phoneHeadline: 'مراجعة Blueprint وصدى الجمهور',
      phoneStatus: '94 / 100 صدى الجمهور · معتمد',
      phoneMeta: 'تمت معالجة ملاحظتين مع PM · جاهز للاستمرارية',
    },
    {
      step: '03',
      badge: 'رابط الاستمرارية المشترك',
      title: 'رفع الصور من الهاتف واعتماد الاستمرارية',
      detail:
        'يرسل مدير المشروع رابط الاستمرارية ليرفع العميل صور العائلة أو العقار أو المنتج من ألبوم الهاتف أو الكاميرا ويعتمد الشخصيات والأزياء والمواقع.',
      linkLabel: '/share/continuity · رفع من الألبوم أو الكاميرا',
      phoneHeadline: 'الاستمرارية وجمع الصور',
      phoneStatus: 'تم رفع 6 صور · تم تثبيت الشخصيات والمواقع',
      phoneMeta: 'تصغير تلقائي وإزالة بيانات EXIF · ترقية بنقرة واحدة',
    },
    {
      step: '04',
      badge: 'غرفة العرض المشتركة',
      title: 'مراجعة دقيقة عبر الهاتف والاعتماد النهائي',
      detail:
        'شاهد العروض المسبقة والنسخ النهائية بدقة 4K على أي هاتف، وأضف ملاحظات زمنية، واعتمد النسخة النهائية.',
      linkLabel: '/share/screening-room · الاعتماد النهائي',
      phoneHeadline: 'غرفة العرض الأولى',
      phoneStatus: 'تم اعتماد نسخة 4K النهائية ✓',
      phoneMeta: 'النسخ متعددة اللغات جاهزة للتسليم',
    },
  ],
  teamHeading: 'غرفة عمليات محمولة للمنتجين والمخرجين ومديري المشاريع',
  teamSubheading:
    'تابع كل مشروع أثناء تنقلك مع صلاحيات متكاملة للمسؤولين ومديري المشاريع المعينين.',
  teamPillars: [
    {
      id: 'alerts',
      title: 'إشعارات Web Push فورية',
      detail:
        'تلقَّ تنبيهات لحظة اكتمال التصيير أو بدء مشروع عميل جديد أو رفع صور استمرارية جديدة.',
      metric: 'تنبيهات فورية',
    },
    {
      id: 'status',
      title: 'متابعة 5 مراحل وسرعة الإنجاز',
      detail:
        'راقب تقدم Blueprint والصدى والاستمرارية والإنتاج وغرفة العرض مع وتيرة المشاهد اليومية.',
      metric: 'رؤية شاملة للمراحل',
    },
    {
      id: 'budget',
      title: 'رصيد النقاط وسقوف الميزانية',
      detail:
        'تابع الرصيد المتاح وسقف ميزانية كل مشروع والحد الشهري لكل مدير مشروع لحظة بلحظة.',
      metric: 'حماية هامش الربح',
    },
    {
      id: 'links',
      title: 'مشاركة الروابط بلمسة واحدة',
      detail:
        'أرسل روابط Blueprint والصدى والاستمرارية وغرفة العرض عبر واتساب أو الرسائل أو البريد.',
      metric: '4 بوابات مشتركة',
    },
  ],
  phoneHeaderBrand: 'مرافق SceneFlow',
  phoneCreditsPill: '14,250 cr',
  phonePmBadge: 'متصل بـ PM',
  phoneStageBarLabels: ['Blueprint', 'الصدى', 'الاستمرارية', 'الإنتاج', 'العرض'],
  phoneTeamAlertTitle: 'صور استمرارية جديدة من العميل',
  phoneTeamAlertBody: 'رفعت إيلينا 6 صور أرشيفية · اضغط للمراجعة والاعتماد',
  phoneTeamBudgetLabel: 'ميزانية رصيد المشروع',
  phoneTeamBudgetValue: '1,180 / 2,500 cr',
  phoneTeamPaceBadge: 'ضمن الجدول · تحت السقف',
  installIosBadge: 'iOS Safari: مشاركة ← إضافة إلى الشاشة الرئيسية',
  installAndroidBadge: 'Android / Chrome: تثبيت التطبيق بلمسة واحدة',
  ctaPrimary: 'ابدأ مع الاستوديو وتطبيق PWA ($9)',
}

export const MOBILE_COMPANION_COPY_TH: MobileCompanionPwaCopy = {
  eyebrow: 'แอปมือถือคู่ใจ (PWA) · รองรับ iOS และ Android',
  title: 'พลังสตูดิโอบนเดสก์ท็อป',
  titleAccent: 'ควบคุมงานและดูแลลูกค้าได้จากมือถือ',
  subtitle:
    'เพราะการตัดต่อและผลิตวิดีโอ 4K หลายแทร็กออกแบบมาเพื่อจอเดสก์ท็อป SceneFlow จึงจับคู่สตูดิโอเข้ากับแอปมือถือ PWA ที่ติดตั้งได้ทันที—เชื่อมทีมงาน ผู้จัดการโปรเจกต์ (PM) และลูกค้าสมาชิกด้วยการแจ้งเตือนสด สถานะงาน งบเครดิต และลิงก์ตรวจทานร่วมกัน',
  whyPwaBadge: 'ติดตั้ง PWA ทันที · ไม่ต้องผ่าน App Store',
  whyPwaNote:
    'เพิ่มลงหน้าจอโฮมจาก Safari หรือ Chrome ในแตะเดียว พร้อมแจ้งเตือน Web Push และอัปเดตอัตโนมัติ',
  modeCustomerTab: 'ลูปทำงานลูกค้า & PM',
  modeTeamTab: 'ศูนย์ทีม & งบประมาณ',
  customerHeading: 'ลูกค้าเริ่มโปรเจกต์เองได้ พร้อม PM ดูแลครบวงจร',
  customerSubheading:
    'ลูกค้าที่สมัครสมาชิกสามารถเปิดโปรเจกต์และสร้าง Blueprint ตั้งต้นจากมือถือ ขอรับการดูแลจาก PM และตรวจงานผ่าน 4 ลิงก์แชร์',
  customerSteps: [
    {
      step: '01',
      badge: 'เริ่มงานบนมือถือ',
      title: 'สมัครสมาชิก เริ่มโปรเจกต์ & ขอรับการดูแลจาก PM',
      detail:
        'ลูกค้าพูดหรือพิมพ์บรีฟบนมือถือเพื่อสร้าง Blueprint ตั้งต้น และกดเลือกให้ Project Manager (PM) เข้ามาดูแลได้ทันที',
      linkLabel: 'แอปมือถือ · + โปรเจกต์ใหม่',
      phoneHeadline: 'วิดีโอความทรงจำครอบครัวฮาร์เบอร์',
      phoneStatus: 'มอบหมาย PM แล้ว · Blueprint พร้อมตรวจ',
      phoneMeta: 'เริ่มผ่าน Mobile PWA · เพดานงบ: 2,500 cr',
    },
    {
      step: '02',
      badge: 'แชร์ Blueprint & ARA',
      title: 'ปรับจูน Blueprint และคะแนน Audience Resonance',
      detail:
        'PM ตรวจและยกระดับคะแนน Audience Resonance บนเดสก์ท็อป แล้วแชร์ลิงก์ให้ลูกค้าตรวจและอนุมัติบนมือถือ',
      linkLabel: '/blueprint/share · /share/script-resonance',
      phoneHeadline: 'ตรวจทาน Blueprint & Resonance',
      phoneStatus: '94 / 100 Audience Resonance · อนุมัติแล้ว',
      phoneMeta: 'ปรับแก้ 2 จุดร่วมกับ PM · พร้อมสู่ขั้นความต่อเนื่อง',
    },
    {
      step: '03',
      badge: 'ลิงก์ความต่อเนื่อง',
      title: 'อัปโหลดรูปจากมือถือ & อนุมัติความต่อเนื่อง',
      detail:
        'PM ส่งลิงก์ความต่อเนื่องให้ลูกค้าอัปโหลดภาพถ่ายครอบครัว สถานที่ หรือสินค้าจากอัลบั้มมือถือหรือกล้อง พร้อมอนุมัตินักแสดง ชุด สถานที่ และพร็อพ',
      linkLabel: '/share/continuity · อัปโหลดจากอัลบั้ม & กล้อง',
      phoneHeadline: 'ความต่อเนื่อง & อัปโหลดรูปภาพ',
      phoneStatus: 'อัปโหลดแล้ว 6 รูป · ล็อกนักแสดงและฉากแล้ว',
      phoneMeta: 'ย่อขนาดอัตโนมัติและล้าง EXIF · กดเข้าสตูดิโอในคลิกเดียว',
    },
    {
      step: '04',
      badge: 'ลิงก์ห้องฉาย Screening Room',
      title: 'ตรวจงานละเอียดบนมือถือ & อนุมัติมาสเตอร์สุดท้าย',
      detail:
        'รับชม Pre-Vis พร้อมเสียงพากย์และงานเรนเดอร์ 4K บนมือถือ คอมเมนต์ระบุเวลา และกดอนุมัติไฟล์มาสเตอร์ขั้นสุดท้าย',
      linkLabel: '/share/screening-room · อนุมัติขั้นสุดท้าย',
      phoneHeadline: 'ห้องฉาย Screening Room',
      phoneStatus: 'อนุมัติมาสเตอร์ 4K สุดท้ายแล้ว ✓',
      phoneMeta: 'พร้อมส่งมอบเวอร์ชันหลายภาษาทันที',
    },
  ],
  teamHeading: 'ศูนย์บัญชาการพกพาสำหรับโปรดิวเซอร์ ผู้กำกับ และ PM',
  teamSubheading:
    'ขับเคลื่อนทุกโปรเจกต์แม้ไม่ได้อยู่หน้าโต๊ะทำงาน รองรับสิทธิ์ทั้งแอดมินและ PM ประจำโปรเจกต์',
  teamPillars: [
    {
      id: 'alerts',
      title: 'แจ้งเตือน Web Push ทันใจ',
      detail:
        'รับแจ้งเตือนทันทีเมื่อเอเจนต์เรนเดอร์เสร็จ ลูกค้าเปิดบรีฟใหม่ หรืออัปโหลดรูปความต่อเนื่องเข้ามา',
      metric: 'แจ้งเตือนสด + กล่องข้อความ',
    },
    {
      id: 'status',
      title: 'ติดตาม 5 ขั้นตอน & จังหวะตารางงาน',
      detail:
        'ดูความคืบหน้า Blueprint, Resonance, ความต่อเนื่อง, การผลิต และห้องฉาย พร้อมสถานะความเร็วรายวัน',
      metric: 'เห็นสถานะครบทุกขั้น',
    },
    {
      id: 'budget',
      title: 'ยอดเครดิตคงเหลือ & เพดานงบ',
      detail:
        'ตรวจสอบเครดิตคงเหลือ เพดานงบรายโปรเจกต์ของลูกค้า และโควตาเครดิตรายเดือนของ PM แบบเรียลไทม์',
      metric: 'คุมกำไรแม่นยำ',
    },
    {
      id: 'links',
      title: 'แชร์ลิงก์ผ่านมือถือในแตะเดียว',
      detail:
        'ส่งลิงก์ Blueprint, Resonance, อัปโหลดความต่อเนื่อง และห้องฉายผ่าน LINE, WhatsApp, SMS หรืออีเมลทันที',
      metric: '4 พอร์ทัลแชร์งาน',
    },
  ],
  phoneHeaderBrand: 'SceneFlow Companion',
  phoneCreditsPill: '14,250 cr',
  phonePmBadge: 'เชื่อมต่อ PM แล้ว',
  phoneStageBarLabels: ['Blueprint', 'Resonance', 'ความต่อเนื่อง', 'ผลิตงาน', 'ห้องฉาย'],
  phoneTeamAlertTitle: 'ลูกค้าอัปโหลดรูปความต่อเนื่องใหม่',
  phoneTeamAlertBody: 'Elena อัปโหลดภาพครอบครัว 6 รูป · แตะเพื่อตรวจและนำเข้า',
  phoneTeamBudgetLabel: 'งบเครดิตโปรเจกต์',
  phoneTeamBudgetValue: '1,180 / 2,500 cr',
  phoneTeamPaceBadge: 'ตามแผน · ไม่เกินงบ',
  installIosBadge: 'iOS Safari: แชร์ → เพิ่มไปยังหน้าจอโฮม',
  installAndroidBadge: 'Android / Chrome: ติดตั้งแอปในแตะเดียว',
  ctaPrimary: 'เริ่มต้นใช้งานสตูดิโอ + แอป PWA ($9)',
}
