/**
 * 7-Language Conversion, Tiered Studio Ladder & White-Label Operator Copy
 * for Keepsake Cinema (`/showcase`):
 *  - Dismissible Top Operator Demo Bar (separates SaaS demo notice from 100% consumer storefront body)
 *  - Brand/Artisan framing ("Director-crafted pacing, accelerated by SceneFlow Studio")
 *  - Tiered Studio Ladder (Automated Express 4K Cinema vs. PM-Directed Full-Motion Cinema)
 *  - Niche Preset operator callout above vertical tabs
 *  - Live / Explicit Same-Day Delivery Window indicator
 *  - Per-Reel 3 Conversion Anchors (Occasion + Input Required + "Start a film like this")
 *  - Upgraded PM Full-Motion Upgrade Callout + White-Label Operator Footer Block
 */

import type { ClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import type { ShowcaseVideoSlug } from './expressCinemaCatalog'

export interface ReelConversionAnchor {
  occasion: string
  inputRequired: string
}

export interface ShowcaseConversionLocaleCopy {
  operatorBar: {
    badge: string
    body: string
    cta: string
    dismissLabel: string
  }
  artisanSuperpower: string
  studioLadder: {
    expressTabLabel: string
    fullMotionTabLabel: string
    expressCardToggle: string
    fullMotionCardToggle: string
    expressCardBadge: string
    fullMotionCardBadge: string
    expressHelper: string
    fullMotionHelper: string
    tier1Title: string
    tier1Desc: string
    tier2Title: string
    tier2Desc: string
  }
  nichePresetCallout: string
  fullMotionUpgrade: {
    heading: string
    body: string
    primaryCta: string
    secondaryCta: string
  }
  operatorFooter: {
    eyebrow: string
    heading: string
    body: string
    primaryCta: string
    secondaryCta: string
  }
  deliveryWindow: {
    badge: string
    ssrDefault: string
    sameDayToday: string
    nextMorning: string
    requirements: string
  }
  occasionLabel: string
  inputLabel: string
  startLikeThisCta: string
  reelAnchors: Record<ShowcaseVideoSlug, ReelConversionAnchor>
}

export const SHOWCASE_CONVERSION_COPY: Record<ClientPortalLocale, ShowcaseConversionLocaleCopy> = {
  en: {
    operatorBar: {
      badge: 'Live White-Label Reference Storefront · Powered by SceneFlow Studio',
      body: 'Automated 4K fulfills hands-free in 2–4 hrs; Full-Motion upgrades route to PM direction.',
      cta: 'Launch Under Your Brand',
      dismissLabel: 'Dismiss operator demo banner',
    },
    artisanSuperpower:
      'Director-crafted pacing, accelerated by SceneFlow Studio for same-day delivery.',
    studioLadder: {
      expressTabLabel: 'Express 4K Cinema · Automated ($149–$249)',
      fullMotionTabLabel: 'Full-Motion Cinema · Studio PM Directed (Preview)',
      expressCardToggle: 'Express 4K · Automated',
      fullMotionCardToggle: 'Full Motion · PM Directed',
      expressCardBadge: 'Automated · 2–4 hrs',
      fullMotionCardBadge: 'Studio PM · Preview',
      expressHelper:
        '100% Automated Same-Day Master: Photorealistic 4K scenes, Ken Burns camera motion, cloned voices, and stereo score—delivered automatically in 2–4 hours.',
      fullMotionHelper:
        'Studio Director Tier (Preview): Full-motion video generation and live-action integration directed by a dedicated Studio PM. Available anytime as a seamless upgrade using your locked Continuity Vault.',
      tier1Title: 'Express 4K Cinema ($149–$249 · Self-Serve Automated)',
      tier1Desc:
        'Directed photorealistic 4K frames, camera motion, voice cloning & score. 100% automated delivery in 2–4 hours.',
      tier2Title: 'Full-Motion Cinema (Studio Director Tier · Custom Quote)',
      tier2Desc:
        'Full-motion video scenes & live-action integration orchestrated by a dedicated Studio PM using your locked Continuity Vault.',
    },
    nichePresetCallout:
      'Every SceneFlow Studio storefront supports multiple verticals out of the box—or can be locked to a single niche like Weddings, Real Estate, or Corporate Training.',
    fullMotionUpgrade: {
      heading: 'Start Automated Today. Upgrade to PM-Directed Full Motion Anytime.',
      body: 'This Express storefront delivers 100% automated 4K Cinema films in 2–4 hours—keeping pricing transparent ($149–$249) and turnaround same-day. Ready to bring favorite chapters to life with Full-Motion AI video or live-filmed interviews? Your locked Continuity Vault transfers with zero rework to a SceneFlow Studio Production Manager for bespoke direction and custom finishing.',
      primaryCta: 'Start My $29 Automated Blueprint',
      secondaryCta: 'Request PM Full-Motion Upgrade',
    },
    operatorFooter: {
      eyebrow: 'White-Label Platform · Powered by SceneFlow Studio',
      heading: 'Run This Exact Storefront Under Your Own Brand',
      body: 'Everything you see on Keepsake Cinema runs on SceneFlow Studio’s white-label client portal engine with Whop Merchant of Record checkout. Launch under your own custom domain, lock into a single niche (Weddings, Real Estate, Clinics, or Corporate SOPs) or offer all four, collect 100% automated margin on Express 4K orders, and route Full-Motion upgrades to your production team.',
      primaryCta: 'Launch Your Branded Studio on SceneFlow',
      secondaryCta: 'Book an Operator Walkthrough',
    },
    deliveryWindow: {
      badge: 'Same-Day Delivery Window',
      ssrDefault:
        'Lock your 5-min story & photos today → 4K Feature Master + Trailer delivered in 2–4 hours.',
      sameDayToday:
        'Order & lock photos by 6:00 PM local time → Delivered tonight around {eta} (2–4 hrs after photo lock).',
      nextMorning:
        'Start your $29 Blueprint in 3 min now → Lock photos tonight for delivery tomorrow morning (~2–4 hrs after lock).',
      requirements:
        'Requirements: 5-min guided story · 15–40 phone photos (or listing/brand stills) · 10-sec name guide',
    },
    occasionLabel: 'Occasion',
    inputLabel: 'Input Required',
    startLikeThisCta: 'Start a film like this',
    reelAnchors: {
      memoir: {
        occasion: '50th Anniversary & Family Legacy',
        inputRequired: 'Created from 35 phone photos + 4 voice notes',
      },
      realestate: {
        occasion: 'Luxury Estate & MLS Showcase',
        inputRequired: 'Created from 24 MLS listing photos + 1 property sheet',
      },
      brand: {
        occasion: 'Clinic & Founder Homepage Film',
        inputRequired: 'Created from 15 clinic/team photos + 5-min voice interview',
      },
      training: {
        occasion: 'New-Hire Safety & SOP Course',
        inputRequired: 'Created from 1 SOP manual PDF + 10 workplace photos',
      },
    },
  },

  es: {
    operatorBar: {
      badge: 'Tienda Referencia Marca Blanca · Impulsada por SceneFlow Studio',
      body: '4K automatizado entrega sin intervención en 2–4 h; las mejoras Full-Motion pasan a dirección de PM.',
      cta: 'Lanza Bajo Tu Marca',
      dismissLabel: 'Cerrar barra de demo de operador',
    },
    artisanSuperpower:
      'Ritmo dirigido artesanalmente, acelerado por SceneFlow Studio para entrega el mismo día.',
    studioLadder: {
      expressTabLabel: 'Cine Express 4K · Automatizado ($149–$249)',
      fullMotionTabLabel: 'Cine Full-Motion · Dirigido por PM (Vista previa)',
      expressCardToggle: 'Express 4K · Auto',
      fullMotionCardToggle: 'Full Motion · PM',
      expressCardBadge: 'Automatizado · 2–4 h',
      fullMotionCardBadge: 'PM Estudio · Preview',
      expressHelper:
        'Máster 100% Automatizado el Mismo Día: Escenas 4K fotorrealistas, movimiento de cámara Ken Burns, voces clonadas y banda sonora estéreo entregadas automáticamente en 2–4 horas.',
      fullMotionHelper:
        'Nivel Director de Estudio (Vista previa): Video en movimiento completo e integración real dirigida por un PM dedicado. Disponible en cualquier momento desde tu Bóveda de Continuidad.',
      tier1Title: 'Cine Express 4K ($149–$249 · Autoservicio Automatizado)',
      tier1Desc:
        'Cuadros 4K fotorrealistas dirigidos, movimiento de cámara, clonación de voz y música. Entrega 100% automatizada en 2–4 horas.',
      tier2Title: 'Cine Full-Motion (Nivel Director de Estudio · Cotización)',
      tier2Desc:
        'Escenas de video Full-Motion e integración de acción real orquestadas por un PM dedicado usando tu Bóveda de Continuidad bloqueada.',
    },
    nichePresetCallout:
      'Cada tienda de SceneFlow Studio soporta múltiples verticales de fábrica—o puede bloquearse a un solo nicho como Bodas, Bienes Raíces o Capacitación Corporativa.',
    fullMotionUpgrade: {
      heading: 'Comienza Automatizado Hoy. Mejora a Full-Motion Dirigido por PM Cuando Quieras.',
      body: 'Esta tienda Express entrega películas 4K 100% automatizadas en 2–4 horas—manteniendo precios transparentes ($149–$249) y entrega el mismo día. ¿Listo para dar vida a capítulos clave con video Full-Motion o entrevistas reales? Tu Bóveda de Continuidad se transfiere sin retrabajo a un Director de Producción de SceneFlow Studio.',
      primaryCta: 'Iniciar Mi Blueprint Automatizado ($29)',
      secondaryCta: 'Solicitar Mejora Full-Motion con PM',
    },
    operatorFooter: {
      eyebrow: 'Plataforma Marca Blanca · Impulsada por SceneFlow Studio',
      heading: 'Opera Esta Misma Tienda Bajo Tu Propia Marca',
      body: 'Todo lo que ves en Keepsake Cinema funciona sobre el motor de portal marca blanca de SceneFlow Studio con cobro Whop Merchant of Record. Lanza en tu propio dominio, enfócate en un solo nicho (Bodas, Bienes Raíces, Clínicas o SOPs) u ofrece los cuatro, cobra 100% de margen automatizado en pedidos 4K y deriva mejoras Full-Motion a tu equipo de producción.',
      primaryCta: 'Lanza Tu Estudio de Marca en SceneFlow',
      secondaryCta: 'Agendar Recorrido para Operadores',
    },
    deliveryWindow: {
      badge: 'Ventana de Entrega Hoy Mismo',
      ssrDefault:
        'Confirma tu historia de 5 min y fotos hoy → Máster 4K + Tráiler entregados en 2–4 horas.',
      sameDayToday:
        'Envía y confirma fotos antes de las 6:00 PM → Entrega esta noche alrededor de las {eta} (2–4 h tras confirmar fotos).',
      nextMorning:
        'Inicia tu Blueprint de $29 en 3 min ahora → Confirma fotos esta noche para entrega mañana temprano (2–4 h).',
      requirements:
        'Requisitos: Entrevista guiada de 5 min · 15–40 fotos del celular · Guía de nombres de 10 s',
    },
    occasionLabel: 'Ocasión',
    inputLabel: 'Material Requerido',
    startLikeThisCta: 'Crear un filme como este',
    reelAnchors: {
      memoir: {
        occasion: '50.º Aniversario y Legado Familiar',
        inputRequired: 'Creado con 35 fotos del celular + 4 notas de voz',
      },
      realestate: {
        occasion: 'Residencia de Lujo y Tour MLS',
        inputRequired: 'Creado con 24 fotos del inmueble + 1 ficha técnica',
      },
      brand: {
        occasion: 'Historia de Clínica y Fundador',
        inputRequired: 'Creado con 15 fotos del equipo + entrevista de 5 min',
      },
      training: {
        occasion: 'Curso de Seguridad y SOP',
        inputRequired: 'Creado con 1 manual PDF + 10 fotos de operación',
      },
    },
  },

  pt: {
    operatorBar: {
      badge: 'Loja Referência White-Label · Powered by SceneFlow Studio',
      body: '4K automatizado entrega sem intervenção em 2–4 h; upgrades Full-Motion vão para direção de PM.',
      cta: 'Lançar Com Sua Marca',
      dismissLabel: 'Fechar barra de demonstração',
    },
    artisanSuperpower:
      'Ritmo dirigido artesanalmente, acelerado pelo SceneFlow Studio para entrega no mesmo dia.',
    studioLadder: {
      expressTabLabel: 'Cinema Express 4K · Automatizado ($149–$249)',
      fullMotionTabLabel: 'Cinema Full-Motion · Direção PM (Prévia)',
      expressCardToggle: 'Express 4K · Auto',
      fullMotionCardToggle: 'Full Motion · PM',
      expressCardBadge: 'Automatizado · 2–4 h',
      fullMotionCardBadge: 'PM Estúdio · Prévia',
      expressHelper:
        'Master 100% Automatizado no Mesmo Dia: Cenas 4K fotorrealistas, câmera Ken Burns, vozes clonadas e trilha estéreo entregues automaticamente em 2–4 horas.',
      fullMotionHelper:
        'Nível Diretor de Estúdio (Prévia): Geração de vídeo Full-Motion e integração ao vivo dirigida por um PM dedicado, aproveitando seu Cofre de Continuidade.',
      tier1Title: 'Cinema Express 4K ($149–$249 · Autoatendimento Automatizado)',
      tier1Desc:
        'Quadros 4K fotorrealistas dirigidos, movimento de câmera, clonagem de voz e trilha. Entrega 100% automatizada em 2–4 horas.',
      tier2Title: 'Cinema Full-Motion (Nível Diretor de Estúdio · Sob Consulta)',
      tier2Desc:
        'Cenas em vídeo Full-Motion e integração live-action orquestradas por um PM dedicado usando seu Cofre de Continuidade travado.',
    },
    nichePresetCallout:
      'Cada vitrine do SceneFlow Studio suporta múltiplos verticais prontos—ou pode ser travada em um único nicho como Casamentos, Imóveis ou Treinamento Corporativo.',
    fullMotionUpgrade: {
      heading: 'Comece Automatizado Hoje. Evolua para Full-Motion com PM Quando Quiser.',
      body: 'Esta vitrine Express entrega filmes 4K 100% automatizados em 2–4 horas—mantendo preços transparentes ($149–$249) e prazo no mesmo dia. Quer transformar capítulos favoritos em vídeo Full-Motion ou entrevistas reais? Seu Cofre de Continuidade vai sem retrabalho para um Gerente de Produção do SceneFlow Studio.',
      primaryCta: 'Iniciar Meu Blueprint Automatizado ($29)',
      secondaryCta: 'Solicitar Upgrade Full-Motion com PM',
    },
    operatorFooter: {
      eyebrow: 'Plataforma White-Label · Powered by SceneFlow Studio',
      heading: 'Opere Esta Mesma Vitrine Com a Sua Própria Marca',
      body: 'Tudo o que você vê na Keepsake Cinema roda no motor de portal white-label do SceneFlow Studio com checkout Whop Merchant of Record. Lance no seu domínio próprio, foque em um único nicho (Casamentos, Imóveis, Clínicas ou SOPs) ou ofereça os quatro, capture 100% da margem automatizada no Express 4K e direcione upgrades Full-Motion à sua equipe.',
      primaryCta: 'Lance Seu Estúdio de Marca no SceneFlow',
      secondaryCta: 'Agendar Tour para Operadores',
    },
    deliveryWindow: {
      badge: 'Janela de Entrega no Mesmo Dia',
      ssrDefault:
        'Envie sua história de 5 min e fotos hoje → Master 4K + Trailer entregues em 2–4 horas.',
      sameDayToday:
        'Envie e confirme fotos até as 18h → Entrega hoje à noite por volta das {eta} (2–4 h após travar as fotos).',
      nextMorning:
        'Comece seu Blueprint de $29 em 3 min agora → Trave as fotos hoje à noite para entrega amanhã cedo (2–4 h).',
      requirements:
        'Requisitos: História guiada de 5 min · 15–40 fotos do celular · Guia de pronúncia de 10 s',
    },
    occasionLabel: 'Ocasião',
    inputLabel: 'Material Necessário',
    startLikeThisCta: 'Criar um filme como este',
    reelAnchors: {
      memoir: {
        occasion: 'Bodas de Ouro e Legado Familiar',
        inputRequired: 'Criado a partir de 35 fotos do celular + 4 áudios',
      },
      realestate: {
        occasion: 'Imóvel de Alto Padrão e Tour',
        inputRequired: 'Criado a partir de 24 fotos do imóvel + 1 ficha técnica',
      },
      brand: {
        occasion: 'Filme de Clínica e Fundador',
        inputRequired: 'Criado a partir de 15 fotos da equipe + entrevista de 5 min',
      },
      training: {
        occasion: 'Curso de Segurança e SOP',
        inputRequired: 'Criado a partir de 1 manual PDF + 10 fotos do local',
      },
    },
  },

  hi: {
    operatorBar: {
      badge: 'लाइव व्हाइट-लेबल रेफ़रेंस स्टोरफ्रंट · SceneFlow Studio द्वारा संचालित',
      body: 'ऑटोमेटेड 4K ऑर्डर 2–4 घंटे में अपने आप पूरे होते हैं; फुल-मोशन अपग्रेड PM निर्देशन में जाते हैं।',
      cta: 'अपने ब्रांड से लॉन्च करें',
      dismissLabel: 'ऑपरेटर डेमो बैनर बंद करें',
    },
    artisanSuperpower:
      'निर्देशक-स्तरीय गति और कलात्मकता, उसी दिन डिलीवरी के लिए SceneFlow Studio द्वारा संचालित।',
    studioLadder: {
      expressTabLabel: 'Express 4K सिनेमा · ऑटोमेटेड ($149–$249)',
      fullMotionTabLabel: 'फुल-मोशन सिनेमा · स्टूडियो PM निर्देशित (प्रीव्यू)',
      expressCardToggle: 'Express 4K · ऑटो',
      fullMotionCardToggle: 'फुल मोशन · PM',
      expressCardBadge: 'ऑटोमेटेड · 2–4 घंटे',
      fullMotionCardBadge: 'स्टूडियो PM · प्रीव्यू',
      expressHelper:
        '100% ऑटोमेटेड सेम-डे मास्टर: फोटोरियलिस्टिक 4K दृश्य, केन बर्न्स कैमरा मोशन, क्लोन वॉइस और स्टीरियो संगीत—2–4 घंटे में स्वतः डिलीवरी।',
      fullMotionHelper:
        'स्टूडियो डायरेक्टर टियर (प्रीव्यू): समर्पित स्टूडियो PM द्वारा निर्देशित फुल-मोशन वीडियो और लाइव-एक्शन एकीकरण—आपके लॉक्ड कॉन्टिन्युटी वॉल्ट से कभी भी अपग्रेड करें।',
      tier1Title: 'Express 4K सिनेमा ($149–$249 · सेल्फ-सर्व ऑटोमेटेड)',
      tier1Desc:
        'निर्देशित फोटोरियलिस्टिक 4K फ्रेम, कैमरा मोशन, वॉइस क्लोनिंग और संगीत। 2–4 घंटे में 100% ऑटोमेटेड डिलीवरी।',
      tier2Title: 'फुल-मोशन सिनेमा (स्टूडियो डायरेक्टर टियर · कस्टम कोट)',
      tier2Desc:
        'आपके लॉक्ड कॉन्टिन्युटी वॉल्ट का उपयोग कर समर्पित स्टूडियो PM द्वारा निर्देशित फुल-मोशन वीडियो और लाइव-एक्शन दृश्य।',
    },
    nichePresetCallout:
      'हर SceneFlow Studio स्टोरफ्रंट कई वर्टिकल्स को सपोर्ट करता है—या इसे केवल वेडिंग्स, रियल एस्टेट या कॉर्पोरेट ट्रेनिंग जैसे एक निश पर लॉक किया जा सकता है।',
    fullMotionUpgrade: {
      heading: 'आज ऑटोमेटेड शुरू करें। कभी भी PM-निर्देशित फुल-मोशन में अपग्रेड करें।',
      body: 'यह Express स्टोरफ्रंट 2–4 घंटे में 100% ऑटोमेटेड 4K सिनेमा फिल्में देता है—पारदर्शी कीमत ($149–$249) और उसी दिन डिलीवरी के साथ। पसंदीदा अध्यायों को फुल-मोशन AI वीडियो या लाइव इंटरव्यू में बदलना चाहते हैं? आपका लॉक्ड कॉन्टिन्युटी वॉल्ट बिना दोबारा काम के SceneFlow Studio प्रोडक्शन मैनेजर को ट्रांसफर होता है।',
      primaryCta: 'मेरा $29 ऑटोमेटेड ब्लूप्रिंट शुरू करें',
      secondaryCta: 'PM फुल-मोशन अपग्रेड का अनुरोध करें',
    },
    operatorFooter: {
      eyebrow: 'व्हाइट-लेबल प्लेटफ़ॉर्म · SceneFlow Studio द्वारा संचालित',
      heading: 'यही पूरा स्टोरफ्रंट अपने ब्रांड के नाम से चलाएँ',
      body: 'Keepsake Cinema पर जो कुछ भी दिखता है, वह SceneFlow Studio के व्हाइट-लेबल क्लाइंट पोर्टल इंजन और Whop Merchant of Record चेकआउट पर चलता है। अपने डोमेन पर लॉन्च करें, किसी एक निश (वेडिंग्स, रियल एस्टेट, क्लिनिक्स, या कॉर्पोरेट SOP) पर फोकस करें या चारों चलाएँ, Express 4K ऑर्डर पर 100% ऑटोमेटेड मार्जिन कमाएँ और फुल-मोशन अपग्रेड अपनी प्रोडक्शन टीम को रूट करें।',
      primaryCta: 'SceneFlow पर अपना ब्रांडेड स्टूडियो लॉन्च करें',
      secondaryCta: 'ऑपरेटर वॉकथ्रू बुक करें',
    },
    deliveryWindow: {
      badge: 'उसी दिन डिलीवरी विंडो',
      ssrDefault:
        'अपनी 5-मिनट की कहानी और तस्वीरें लॉक करें → 2–4 घंटे में 4K फीचर मास्टर + ट्रेलर तैयार।',
      sameDayToday:
        'शाम 6:00 बजे तक तस्वीरें लॉक करें → आज रात लगभग {eta} तक डिलीवरी (लॉक के 2–4 घंटे बाद)।',
      nextMorning:
        'अभी 3 मिनट में $29 ब्लूप्रिंट शुरू करें → आज रात तस्वीरें लॉक करें और कल सुबह डिलीवरी पाएँ।',
      requirements:
        'आवश्यकता: 5-मिनट स्टोरी इंटरव्यू · 15–40 फोन फोटो · 10-सेकंड नाम उच्चारण नोट',
    },
    occasionLabel: 'अवसर',
    inputLabel: 'क्या चाहिए',
    startLikeThisCta: 'ऐसी ही फिल्म शुरू करें',
    reelAnchors: {
      memoir: {
        occasion: '50वीं सालगिरह और पारिवारिक विरासत',
        inputRequired: '35 फोन फोटो + 4 वॉइस नोट्स से निर्मित',
      },
      realestate: {
        occasion: 'लग्ज़री प्रॉपर्टी और MLS शोकेस',
        inputRequired: '24 प्रॉपर्टी फोटो + 1 विवरण शीट से निर्मित',
      },
      brand: {
        occasion: 'क्लिनिक और फाउंडर होमपेज फिल्म',
        inputRequired: '15 टीम/क्लिनिक फोटो + 5-मिनट वॉइस इंटरव्यू से निर्मित',
      },
      training: {
        occasion: 'नई भर्ती सुरक्षा व SOP कोर्स',
        inputRequired: '1 SOP मैनुअल PDF + 10 कार्यस्थल फोटो से निर्मित',
      },
    },
  },

  'zh-CN': {
    operatorBar: {
      badge: '实时白标参考门店 · 由 SceneFlow Studio 驱动',
      body: '全自动 4K 订单 2–4 小时无人值守交付；全动态升级直通制片经理（PM）导演团队。',
      cta: '用您的品牌上线',
      dismissLabel: '关闭运营商演示横幅',
    },
    artisanSuperpower: '导演级匠心节奏，由 SceneFlow Studio 后台加速实现当日交付。',
    studioLadder: {
      expressTabLabel: 'Express 4K 电影 · 全自动（$149–$249）',
      fullMotionTabLabel: '全动态电影 · 制片经理执导（预览）',
      expressCardToggle: 'Express 4K · 自动',
      fullMotionCardToggle: '全动态 · PM 执导',
      expressCardBadge: '全自动 · 2–4 小时',
      fullMotionCardBadge: '制片经理 · 预览',
      expressHelper:
        '100% 全自动当日母带：写实 4K 场景、Ken Burns 镜头运动、声音克隆与立体声配乐——2–4 小时自动交付。',
      fullMotionHelper:
        '工作室导演级（预览）：由专属制片经理执导全动态视频生成与实拍融合。随时使用已锁定的连续性资产库无缝升级。',
      tier1Title: 'Express 4K 电影（$149–$249 · 自助全自动）',
      tier1Desc:
        '导演级写实 4K 画面、镜头运动、语音克隆与配乐，2–4 小时 100% 全自动交付。',
      tier2Title: '全动态电影（工作室导演级 · 定制报价）',
      tier2Desc:
        '由专属制片经理基于您已锁定的连续性资产库统筹全动态视频与实拍镜头制作。',
    },
    nichePresetCallout:
      '每个 SceneFlow Studio 门店默认支持多行业场景——也可锁定单一细分领域（如婚礼、豪宅地产或企业培训）。',
    fullMotionUpgrade: {
      heading: '今日全自动启动，随时升级 PM 执导全动态电影。',
      body: '本 Express 门店在 2–4 小时内全自动交付 4K 电影——保持价格透明（$149–$249）与当日出片。想将挚爱章节升级为全动态 AI 视频或实拍访谈？您已锁定的连续性资产库将零返工移交 SceneFlow Studio 制片经理进行定制执导。',
      primaryCta: '开启 $29 全自动分镜蓝图',
      secondaryCta: '预约 PM 全动态升级',
    },
    operatorFooter: {
      eyebrow: '白标平台 · 由 SceneFlow Studio 驱动',
      heading: '用您自己的品牌运行这套完全相同的门店',
      body: '您在 Keepsake Cinema 看到的一切都运行在 SceneFlow Studio 白标客户门户引擎与 Whop 税务代收结账之上。绑定自有域名，专注单一细分市场（婚礼、地产、诊所或企业 SOP）或同时提供四大业务，全自动赚取 Express 4K 订单利润，并将全动态升级无缝路由至您的制片团队。',
      primaryCta: '在 SceneFlow 启动您的品牌工作室',
      secondaryCta: '预约运营商系统演示',
    },
    deliveryWindow: {
      badge: '当日交付时间窗',
      ssrDefault: '完成 5 分钟引导访谈并锁定照片 → 2–4 小时交付 4K 长篇母带与预告片。',
      sameDayToday: '今日 18:00 前锁定照片 → 今晚约 {eta} 交付成片（锁图后 2–4 小时）。',
      nextMorning: '现在花 3 分钟开启 $29 蓝图 → 今晚锁定照片，明早即可交付成片（2–4 小时）。',
      requirements: '仅需：5 分钟语音访谈 · 15–40 张手机照片 · 10 秒姓名发音提示',
    },
    occasionLabel: '适用场景',
    inputLabel: '所需素材',
    startLikeThisCta: '定制同款电影',
    reelAnchors: {
      memoir: {
        occasion: '金婚庆典与家族传记',
        inputRequired: '由 35 张手机照片 + 4 段语音素材打造',
      },
      realestate: {
        occasion: '高端豪宅与房源深度导览',
        inputRequired: '由 24 张房源实拍图 + 1 份物业清单打造',
      },
      brand: {
        occasion: '诊所与创始人官网品牌片',
        inputRequired: '由 15 张门店/团队照 + 5 分钟语音访谈打造',
      },
      training: {
        occasion: '新员工安全与 SOP 课程',
        inputRequired: '由 1 份 SOP 手册 PDF + 10 张现场照片打造',
      },
    },
  },

  ar: {
    operatorBar: {
      badge: 'واجهة مرجعية بالعلامة البيضاء · مدعومة من SceneFlow Studio',
      body: 'تُنفَّذ طلبات 4K الآلية ذاتياً خلال 2–4 ساعات؛ وتُحوَّل ترقيات الحركة الكاملة لإدارة مدير إنتاج.',
      cta: 'أطلق تحت علامتك التجارية',
      dismissLabel: 'إغلاق شريط العرض للمشغلين',
    },
    artisanSuperpower:
      'إيقاع إخراجي متقن، مُسرّع خلف الكواليس بواسطة SceneFlow Studio للتسليم في نفس اليوم.',
    studioLadder: {
      expressTabLabel: 'سينما 4K سريعة · آلي ($149–$249)',
      fullMotionTabLabel: 'سينما الحركة الكاملة · بإشراف مدير إنتاج (معاينة)',
      expressCardToggle: '4K سريع · آلي',
      fullMotionCardToggle: 'حركة كاملة · PM',
      expressCardBadge: 'آلي · 2–4 ساعات',
      fullMotionCardBadge: 'مدير إنتاج · معاينة',
      expressHelper:
        'ماستر آلي 100% في نفس اليوم: مشاهد 4K واقعية، حركة كاميرا Ken Burns، أصوات مستنسخة وموسيقى ستيريو تُسلَّم تلقائياً خلال 2–4 ساعات.',
      fullMotionHelper:
        'فئة مخرج الاستوديو (معاينة): فيديو بحركة كاملة ودمج تصوير حي بإشراف مدير إنتاج مخصص، متاح للترقية في أي وقت عبر خزنة الاستمرارية المقفلة.',
      tier1Title: 'سينما 4K سريعة ($149–$249 · خدمة ذاتية آلية)',
      tier1Desc:
        'إطارات 4K واقعية موجّهة، حركة كاميرا، استنساخ صوتي وموسيقى. تسليم آلي 100% خلال 2–4 ساعات.',
      tier2Title: 'سينما الحركة الكاملة (فئة مخرج الاستوديو · عرض سعر مخصص)',
      tier2Desc:
        'مشاهد فيديو بحركة كاملة ودمج حي يديرها مدير إنتاج مخصص باستخدام خزنة الاستمرارية المقفلة الخاصة بك.',
    },
    nichePresetCallout:
      'تدعم كل واجهة SceneFlow Studio عدة مجالات جاهزة—أو يمكن قفلها على تخصص واحد مثل حفلات الزفاف أو العقارات أو التدريب المؤسسي.',
    fullMotionUpgrade: {
      heading: 'ابدأ آلياً اليوم. وقم بالترقية إلى الحركة الكاملة بإشراف PM في أي وقت.',
      body: 'تسلم هذه الواجهة السريعة أفلام 4K آلية 100% خلال 2–4 ساعات بأسعار شفافة ($149–$249) وتسليم في نفس اليوم. هل ترغب في إحياء فصولك المفضلة بفيديو AI كامل الحركة أو مقابلات مصورة؟ تنتقل خزنة الاستمرارية المقفلة دون إعادة عمل إلى مدير إنتاج SceneFlow Studio.',
      primaryCta: 'ابدأ مخططي الآلي ($29)',
      secondaryCta: 'اطلب ترقية الحركة الكاملة مع PM',
    },
    operatorFooter: {
      eyebrow: 'منصة العلامة البيضاء · مدعومة من SceneFlow Studio',
      heading: 'شغّل هذه الواجهة نفسها تحت علامتك التجارية الخاصة',
      body: 'كل ما تراه في Keepsake Cinema يعمل على محرك بوابة العلامة البيضاء من SceneFlow Studio مع الدفع عبر Whop Merchant of Record. أطلق على نطاقك الخاص، خصّص تخصصاً واحداً (حفلات الزفاف، العقارات، العيادات، أو تدريب SOP) أو قدّم الأربعة جميعاً، واجمع 100% من هامش طلبات 4K الآلية مع تحويل ترقيات الحركة الكاملة لفريق الإنتاج.',
      primaryCta: 'أطلق استوديوك بعلامتك على SceneFlow',
      secondaryCta: 'احجز جولة للمشغلين',
    },
    deliveryWindow: {
      badge: 'نافذة التسليم في نفس اليوم',
      ssrDefault:
        'أكمل قصتك في 5 دقائق وثبّت الصور اليوم ← استلم فيلم 4K الطويل والإعلان خلال 2–4 ساعات.',
      sameDayToday:
        'ثبّت صورك قبل 6:00 مساءً ← التسليم الليلة حوالي {eta} (خلال 2–4 ساعات بعد تثبيت الصور).',
      nextMorning:
        'ابدأ مخطط $29 في 3 دقائق الآن ← ثبّت الصور الليلة للتسليم صباح الغد (2–4 ساعات).',
      requirements: 'المطلوب: مقابلة صوتية 5 دقائق · 15–40 صورة من الهاتف · دليل نطق 10 ثوانٍ',
    },
    occasionLabel: 'المناسبة',
    inputLabel: 'المطلوب منك',
    startLikeThisCta: 'ابدأ فيلماً مشابهاً',
    reelAnchors: {
      memoir: {
        occasion: 'اليوبيل الذهبي وإرث العائلة',
        inputRequired: 'أُنشئ من 35 صورة هاتف + 4 رسائل صوتية',
      },
      realestate: {
        occasion: 'عرض عقار فاخر وجولة MLS',
        inputRequired: 'أُنشئ من 24 صورة عقار + ورقة مواصفات واحدة',
      },
      brand: {
        occasion: 'فيلم العيادة والمؤسس للموقع',
        inputRequired: 'أُنشئ من 15 صورة للفريق + مقابلة صوتية 5 دقائق',
      },
      training: {
        occasion: 'دورة السلامة وإجراءات العمل SOP',
        inputRequired: 'أُنشئ من ملف دليل PDF واحد + 10 صور لموقع العمل',
      },
    },
  },

  th: {
    operatorBar: {
      badge: 'หน้าร้านไวท์เลเบลตัวอย่าง · ขับเคลื่อนโดย SceneFlow Studio',
      body: 'งาน 4K อัตโนมัติส่งมอบเองใน 2–4 ชม. ส่วนการอัปเกรด Full-Motion ส่งต่อให้ทีม PM กำกับโดยตรง',
      cta: 'เปิดใช้งานภายใต้แบรนด์ของคุณ',
      dismissLabel: 'ปิดแถบสาธิตสำหรับผู้ประกอบการ',
    },
    artisanSuperpower:
      'จังหวะการเล่าเรื่องระดับผู้กำกับ เร่งความเร็วเบื้องหลังด้วย SceneFlow Studio เพื่อส่งมอบภายในวันเดียว',
    studioLadder: {
      expressTabLabel: 'Express 4K Cinema · อัตโนมัติ ($149–$249)',
      fullMotionTabLabel: 'Full-Motion Cinema · กำกับโดย Studio PM (ตัวอย่าง)',
      expressCardToggle: 'Express 4K · ออโต้',
      fullMotionCardToggle: 'Full Motion · PM',
      expressCardBadge: 'อัตโนมัติ · 2–4 ชม.',
      fullMotionCardBadge: 'Studio PM · ตัวอย่าง',
      expressHelper:
        'มาสเตอร์อัตโนมัติ 100% ภายในวันเดียว: ภาพ 4K สมจริง การเคลื่อนกล้อง Ken Burns เสียงโคลน และดนตรีสเตอริโอ ส่งมอบอัตโนมัติใน 2–4 ชม.',
      fullMotionHelper:
        'ระดับผู้กำกับสตูดิโอ (ตัวอย่าง): วิดีโอ Full-Motion และการผสานภาพถ่ายจริงที่กำกับโดย Studio PM เฉพาะทาง อัปเกรดได้ทุกเมื่อจาก Continuity Vault ที่ล็อกไว้',
      tier1Title: 'Express 4K Cinema ($149–$249 · บริการตนเองอัตโนมัติ)',
      tier1Desc:
        'เฟรม 4K สมจริงที่ผ่านการกำกับ การเคลื่อนกล้อง เสียงโคลน และดนตรี ส่งมอบอัตโนมัติ 100% ใน 2–4 ชม.',
      tier2Title: 'Full-Motion Cinema (ระดับผู้กำกับสตูดิโอ · ใบเสนอราคาเฉพาะงาน)',
      tier2Desc:
        'ฉากวิดีโอ Full-Motion และการผสานภาพจริงที่ควบคุมโดย Studio PM เฉพาะทางจาก Continuity Vault ที่ล็อกไว้',
    },
    nichePresetCallout:
      'หน้าร้าน SceneFlow Studio ทุกแห่งรองรับหลายธุรกิจพร้อมกัน—หรือเลือกเจาะจงเฉพาะกลุ่ม เช่น งานแต่งงาน อสังหาริมทรัพย์ หรือการอบรมองค์กรได้ทันที',
    fullMotionUpgrade: {
      heading: 'เริ่มแบบอัตโนมัติวันนี้ อัปเกรดเป็น Full-Motion โดยทีม PM ได้ทุกเมื่อ',
      body: 'หน้าร้าน Express นี้ส่งมอบภาพยนตร์ 4K อัตโนมัติ 100% ใน 2–4 ชม. ด้วยราคาโปร่งใส ($149–$249) และรับงานได้ภายในวันเดียว หากต้องการยกระดับบทสำคัญเป็นวิดีโอ Full-Motion AI หรือบทสัมภาษณ์จริง Continuity Vault ที่ล็อกไว้จะส่งต่อให้ผู้จัดการฝ่ายผลิตของ SceneFlow Studio ทันทีโดยไม่ต้องเริ่มใหม่',
      primaryCta: 'เริ่ม Blueprint อัตโนมัติ $29 ของฉัน',
      secondaryCta: 'ขออัปเกรด Full-Motion กับ PM',
    },
    operatorFooter: {
      eyebrow: 'แพลตฟอร์มไวท์เลเบล · ขับเคลื่อนโดย SceneFlow Studio',
      heading: 'เปิดใช้งานหน้าร้านนี้ทั้งหมดภายใต้แบรนด์ของคุณเอง',
      body: 'ทุกอย่างที่คุณเห็นบน Keepsake Cinema ทำงานบนระบบพอร์ทัลลูกค้าไวท์เลเบลของ SceneFlow Studio พร้อมระบบชำระเงิน Whop Merchant of Record เปิดบนโดเมนของคุณเอง เลือกเจาะจงกลุ่มเดียว (งานแต่ง อสังหาฯ คลินิก หรืออบรม SOP) หรือเปิดครบทั้ง 4 กลุ่ม รับกำไรอัตโนมัติ 100% จากงาน Express 4K และส่งต่อการอัปเกรด Full-Motion ให้ทีมผลิตของคุณ',
      primaryCta: 'เปิดตัวสตูดิโอแบรนด์ของคุณบน SceneFlow',
      secondaryCta: 'จองรอบสาธิตสำหรับผู้ประกอบการ',
    },
    deliveryWindow: {
      badge: 'รอบส่งมอบภายในวันเดียว',
      ssrDefault:
        'เล่าเรื่อง 5 นาทีและล็อกภาพถ่ายวันนี้ → รับไฟล์ 4K Master + ตัวอย่างหนังภายใน 2–4 ชม.',
      sameDayToday:
        'สั่งและล็อกภาพก่อน 18:00 น. วันนี้ → ส่งมอบคืนนี้ประมาณ {eta} (2–4 ชม. หลังล็อกภาพ)',
      nextMorning:
        'เริ่ม Blueprint $29 ใน 3 นาทีตอนนี้ → ล็อกภาพคืนนี้เพื่อรับไฟล์พรุ่งนี้เช้า (2–4 ชม.)',
      requirements: 'สิ่งที่ต้องใช้: สัมภาษณ์เรื่องราว 5 นาที · ภาพจากมือถือ 15–40 ภาพ · แนะนำออกเสียงชื่อ 10 วิ',
    },
    occasionLabel: 'โอกาสสำคัญ',
    inputLabel: 'สิ่งที่ต้องเตรียม',
    startLikeThisCta: 'สร้างภาพยนตร์แบบนี้',
    reelAnchors: {
      memoir: {
        occasion: 'ครบรอบแต่งงาน 50 ปี และมรดกครอบครัว',
        inputRequired: 'สร้างจากภาพถ่ายมือถือ 35 ภาพ + ข้อความเสียง 4 คลิป',
      },
      realestate: {
        occasion: 'บ้านหรูและทัวร์อสังหาฯ เชิงลึก',
        inputRequired: 'สร้างจากภาพถ่ายบ้าน 24 ภาพ + รายละเอียดทรัพย์ 1 ชุด',
      },
      brand: {
        occasion: 'ภาพยนตร์คลินิกและผู้ก่อตั้งแบรนด์',
        inputRequired: 'สร้างจากภาพทีม/สถานที่ 15 ภาพ + สัมภาษณ์เสียง 5 นาที',
      },
      training: {
        occasion: 'คอร์สอบรมความปลอดภัยและ SOP',
        inputRequired: 'สร้างจากคู่มือ PDF 1 ฉบับ + ภาพสถานที่ทำงาน 10 ภาพ',
      },
    },
  },
}
