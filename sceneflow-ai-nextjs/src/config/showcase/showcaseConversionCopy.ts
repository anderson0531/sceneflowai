/**
 * 14-Language Conversion, Tiered Studio Ladder & White-Label Operator Copy
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
      eyebrow: 'White-Label Platform · 14 Native Portals × 70+ Culturally Localized Masters',
      heading: 'Operate in 14 Native Portals. Produce Culturally Authentic Films in 70+ Languages.',
      body: 'Review and manage projects in 14 high-impact portal languages (English, Spanish, Portuguese, Hindi, Chinese, Arabic, Thai, Japanese, Korean, German, French, Italian, Dutch, and Russian)—while SceneFlow’s story and visual engine produces culturally localized 4K masters in 70+ languages, complete with region-accurate historical context, local architectural/interior staging, native pronunciation locks, Multi-Perspective Audio Tracks, QR-Linked Print Companion PDFs, and recurring Living Continuity Vault updates (unlocked via Continuity Library Code).',
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
      eyebrow: 'Plataforma Marca Blanca · 14 Portales Nativos × 70+ Másteres Culturalmente Localizados',
      heading: 'Opera en 14 Portales Nativos. Produce Películas Culturalmente Auténticas en 70+ Idiomas.',
      body: 'Revisa y gestiona proyectos en 14 idiomas de portal de alto impacto (inglés, español, portugués, hindi, chino, árabe, tailandés, japonés, coreano, alemán, francés, italiano, neerlandés y ruso)—mientras el motor narrativo y visual de SceneFlow produce másteres 4K culturalmente localizados en 70+ idiomas, completos con contexto histórico preciso de cada región, escenografía arquitectónica y de interiores local, bloqueos de pronunciación nativa, Pistas de Audio Multiperspectiva, PDFs Imprimibles Vinculados por QR y actualizaciones recurrentes de la Bóveda de Continuidad Viva (desbloqueadas mediante Código de Biblioteca de Continuidad).',
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
      eyebrow: 'Plataforma White-Label · 14 Portais Nativos × 70+ Masters Culturalmente Localizados',
      heading: 'Opere em 14 Portais Nativos. Produza Filmes Culturalmente Autênticos em 70+ Idiomas.',
      body: 'Revise e gerencie projetos em 14 idiomas de portal de alto impacto (inglês, espanhol, português, hindi, chinês, árabe, tailandês, japonês, coreano, alemão, francês, italiano, holandês e russo)—enquanto o motor narrativo e visual do SceneFlow produz masters 4K culturalmente localizados em 70+ idiomas, completos com contexto histórico fiel à região, ambientação arquitetônica e de interiores local, travas de pronúncia nativa, Faixas de Áudio Multiperspectiva, PDFs Complementares Impressos com QR Code e atualizações recorrentes do Cofre de Continuidade Vivo (desbloqueadas via Código da Biblioteca de Continuidade).',
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
      eyebrow: 'व्हाइट-लेबल प्लेटफ़ॉर्म · 14 नेटिव पोर्टल × 70+ सांस्कृतिक रूप से लोकलाइज़्ड मास्टर्स',
      heading: '14 नेटिव पोर्टल में संचालन करें। 70+ भाषाओं में सांस्कृतिक रूप से प्रामाणिक फिल्में बनाएँ।',
      body: '14 उच्च-प्रभाव वाली पोर्टल भाषाओं (अंग्रेज़ी, स्पेनिश, पुर्तगाली, हिंदी, चीनी, अरबी, थाई, जापानी, कोरियाई, जर्मन, फ़्रेंच, इटैलियन, डच और रूसी) में प्रोजेक्ट की समीक्षा और प्रबंधन करें—जबकि SceneFlow का स्टोरी और विज़ुअल इंजन 70+ भाषाओं में सांस्कृतिक रूप से लोकलाइज़्ड 4K मास्टर्स तैयार करता है, जिनमें क्षेत्र-सटीक ऐतिहासिक संदर्भ, स्थानीय वास्तुकला व इंटीरियर स्टेजिंग, मूल उच्चारण लॉक, मल्टी-पर्सपेक्टिव ऑडियो ट्रैक्स, QR-लिंक्ड प्रिंट कम्पेनियन PDF और निरंतर लिविंग कॉन्टिन्युटी वॉल्ट अपडेट्स (कॉन्टिन्युटी लाइब्रेरी कोड से अनलॉक) शामिल हैं।',
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
      eyebrow: '白标平台 · 14 种原生门户 × 70+ 种文化本地化母带',
      heading: '在 14 种原生门户中高效运营，以 70+ 种语言制作原汁原味的文化本地化影片。',
      body: '使用 14 种高影响力门户语言（英语、西班牙语、葡萄牙语、印地语、中文、阿拉伯语、泰语、日语、韩语、德语、法语、意大利语、荷兰语和俄语）审片与管理项目——同时，SceneFlow 的叙事与视觉引擎可产出 70+ 种语言的深度文化本地化 4K 母带，涵盖契合地域的历史背景、本土建筑与室内布景、母语级发音锁定、多视角音轨、QR 码关联印刷伴读 PDF，以及可持续演进的“动态连续性资产库”更新（通过连续性资产库代码解锁）。',
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
      eyebrow: 'منصة العلامة البيضاء · 14 بوابة أصلية × +70 نسخة ماستر موطّنة ثقافياً',
      heading: 'أدِر أعمالك عبر 14 بوابة أصلية. وأنتِج أفلاماً أصيلة ثقافياً بأكثر من 70 لغة.',
      body: 'راجع المشاريع وأدِرها بـ 14 لغة بوابة عالية التأثير (الإنجليزية، الإسبانية، البرتغالية، الهندية، الصينية، العربية، التايلاندية، اليابانية، الكورية، الألمانية، الفرنسية، الإيطالية، الهولندية، والروسية)—بينما ينتج محرك السرد والصورة في SceneFlow نسخ ماستر 4K موطّنة ثقافياً بأكثر من 70 لغة، مكتملة بسياق تاريخي دقيق لكل منطقة، وتصميم معماري وداخلي محلي، وقفل نطق أصلي، ومسارات صوتية متعددة المنظورات، وملفات PDF مطبوعة مرافقة مرتبطة برموز QR، وتحديثات متكررة لخزنة الاستمرارية الحيّة (تُفتح عبر رمز مكتبة الاستمرارية).',
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
      eyebrow: 'แพลตฟอร์มไวท์เลเบล · 14 พอร์ทัลภาษาท้องถิ่น × มาสเตอร์ปรับบริบทวัฒนธรรมกว่า 70 ภาษา',
      heading: 'บริหารงานผ่าน 14 พอร์ทัลภาษาท้องถิ่น ผลิตภาพยนตร์ที่สมจริงตามบริบทวัฒนธรรมในกว่า 70 ภาษา',
      body: 'ตรวจสอบและจัดการโปรเจกต์ได้ใน 14 ภาษาพอร์ทัลหลัก (อังกฤษ, สเปน, โปรตุเกส, ฮินดี, จีน, อาหรับ, ไทย, ญี่ปุ่น, เกาหลี, เยอรมัน, ฝรั่งเศส, อิตาลี, ดัตช์ และรัสเซีย)—ขณะที่เอนจินเล่าเรื่องและภาพของ SceneFlow ผลิตไฟล์มาสเตอร์ 4K ที่ปรับเข้ากับวัฒนธรรมท้องถิ่นกว่า 70 ภาษา ครบถ้วนด้วยบริบททางประวัติศาสตร์ที่ตรงภูมิภาค การจัดฉากสถาปัตยกรรมและตกแต่งภายในแบบท้องถิ่น ระบบล็อกการออกเสียงแบบเจ้าของภาษา แทร็กเสียงหลายมุมมอง (Multi-Perspective Audio Tracks) ไฟล์ PDF คู่มือสิ่งพิมพ์เชื่อม QR Code และการอัปเดต Living Continuity Vault อย่างต่อเนื่อง (ปลดล็อกด้วยรหัส Continuity Library Code)',
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

  ja: {
    operatorBar: {
      badge: 'ホワイトラベル実稼働デモストア · Powered by SceneFlow Studio',
      body: '自動4K制作は2〜4時間で無人納品。フルモーションへのアップグレードは専任PMディレクションへ連携されます。',
      cta: '自社ブランドで開設',
      dismissLabel: '運営者向けデモバナーを閉じる',
    },
    artisanSuperpower:
      '監督品質の演出と間合いを、SceneFlow Studioの自動処理で当日納品へ。',
    studioLadder: {
      expressTabLabel: 'Express 4K シネマ · 自動制作（$149–$249）',
      fullMotionTabLabel: 'フルモーション・シネマ · スタジオPM監督（プレビュー）',
      expressCardToggle: 'Express 4K · 自動',
      fullMotionCardToggle: 'フルモーション · PM監督',
      expressCardBadge: '自動制作 · 2〜4時間',
      fullMotionCardBadge: 'スタジオPM · プレビュー',
      expressHelper:
        '100%自動の当日マスター：フォトリアルな4Kシーン、ケン・バーンズのカメラワーク、クローン音声、ステレオ音楽を2〜4時間で自動納品します。',
      fullMotionHelper:
        'スタジオ監督プラン（プレビュー）：専任のスタジオPMがフルモーション映像生成と実写合成をディレクション。ロック済みのコンティニュイティ・ボールトからいつでもシームレスにアップグレード可能です。',
      tier1Title: 'Express 4K シネマ（$149–$249 · セルフサービス自動制作）',
      tier1Desc:
        '演出済みフォトリアル4Kフレーム、カメラワーク、音声クローン、オリジナル楽曲。2〜4時間で100%自動納品。',
      tier2Title: 'フルモーション・シネマ（スタジオ監督プラン · 個別見積）',
      tier2Desc:
        'ロック済みのコンティニュイティ・ボールトを活用し、専任スタジオPMがフルモーション映像と実写統合を指揮します。',
    },
    nichePresetCallout:
      'すべてのSceneFlow Studioストアフロントは複数業種に標準対応。ウェディング、不動産、企業研修など単一ジャンル専用にロックすることも可能です。',
    fullMotionUpgrade: {
      heading: 'まずは自動制作で今日スタート。いつでもPM監督のフルモーションへ。',
      body: 'このExpressストアは100%自動の4Kシネマ作品を2〜4時間でお届けし、明朗価格（$149–$249）と当日納品を実現します。お気に入りの章をフルモーションAI映像や実写インタビューへ発展させたい時は、ロック済みのコンティニュイティ・ボールトを手戻りゼロでSceneFlow Studioの制作マネージャーへ引き継げます。',
      primaryCta: '$29 自動ブループリントを始める',
      secondaryCta: 'PMフルモーション・アップグレードを相談',
    },
    operatorFooter: {
      eyebrow: 'ホワイトラベル基盤 · 14言語ネイティブポータル × 70以上の文化ローカライズ4Kマスター',
      heading: '14のネイティブポータルで運営し、70以上の言語で文化に根ざした本格映画を制作。',
      body: '影響力の高い14言語のポータル（英語、スペイン語、ポルトガル語、ヒンディー語、中国語、アラビア語、タイ語、日本語、韓国語、ドイツ語、フランス語、イタリア語、オランダ語、ロシア語）で案件をレビュー・管理しながら、SceneFlowの物語・映像エンジンが70以上の言語で文化的にローカライズされた4Kマスターを生成。地域に即した歴史的背景、現地の建築・内装演出、ネイティブ発音ロック、マルチパースペクティブ音声トラック、QRコード連動の印刷用コンパニオンPDF、そして継続的なリビング・コンティニュイティ・ボールト更新（コンティニュイティ・ライブラリコードでロック解除）まで完備しています。',
      primaryCta: 'SceneFlowで自社ブランドスタジオを開設',
      secondaryCta: '導入デモ・個別説明を予約',
    },
    deliveryWindow: {
      badge: '当日納品スケジュール',
      ssrDefault:
        '5分のインタビューと写真ロックを本日完了 → 4K本編マスター＋予告編を2〜4時間で納品。',
      sameDayToday:
        '本日18:00までに写真をロック → 今夜 {eta} 頃に納品（写真ロック後2〜4時間）。',
      nextMorning:
        '今すぐ3分で $29 ブループリントを開始 → 今夜写真をロックすれば明朝納品（ロック後約2〜4時間）。',
      requirements: 'ご用意いただくもの：5分のガイド付きインタビュー · スマホ写真15〜40枚 · 10秒の名前発音ガイド',
    },
    occasionLabel: '用途・シーン',
    inputLabel: '必要な素材',
    startLikeThisCta: 'このスタイルで制作を始める',
    reelAnchors: {
      memoir: {
        occasion: '金婚式・家族の自分史',
        inputRequired: 'スマホ写真35枚＋音声メモ4本から制作',
      },
      realestate: {
        occasion: '高級レジデンス・物件紹介4Kツアー',
        inputRequired: '物件写真24枚＋物件概要シート1枚から制作',
      },
      brand: {
        occasion: 'クリニック・創業者ストーリー映画',
        inputRequired: '施設・チーム写真15枚＋5分音声インタビューから制作',
      },
      training: {
        occasion: '新入社員向け安全教育・SOP講座',
        inputRequired: 'SOPマニュアルPDF 1冊＋現場写真10枚から制作',
      },
    },
  },

  ko: {
    operatorBar: {
      badge: '화이트라벨 라이브 레퍼런스 스토어 · Powered by SceneFlow Studio',
      body: '자동화 4K 주문은 2~4시간 내 무인 완성되며, 풀모션 업그레이드는 전담 PM 연출로 연결됩니다.',
      cta: '내 브랜드로 출시하기',
      dismissLabel: '운영자 데모 배너 닫기',
    },
    artisanSuperpower:
      '감독 수준의 연출 호흡을 SceneFlow Studio 자동화로 당일 완성합니다.',
    studioLadder: {
      expressTabLabel: 'Express 4K 시네마 · 자동화 ($149–$249)',
      fullMotionTabLabel: '풀모션 시네마 · 스튜디오 PM 연출 (미리보기)',
      expressCardToggle: 'Express 4K · 자동',
      fullMotionCardToggle: '풀모션 · PM 연출',
      expressCardBadge: '자동화 · 2~4시간',
      fullMotionCardBadge: '스튜디오 PM · 미리보기',
      expressHelper:
        '100% 자동 당일 마스터: 포토리얼 4K 장면, 켄 번즈 카메라 무빙, 보이스 클로닝, 스테레오 스코어를 2~4시간 안에 자동 납품합니다.',
      fullMotionHelper:
        '스튜디오 디렉터 티어(미리보기): 전담 스튜디오 PM이 풀모션 AI 영상과 실사 촬영 통합을 직접 연출합니다. 잠긴 연속성 볼트로 언제든 매끄럽게 업그레이드할 수 있습니다.',
      tier1Title: 'Express 4K 시네마 ($149–$249 · 셀프 자동화)',
      tier1Desc:
        '연출된 포토리얼 4K 프레임, 카메라 무빙, 음성 클로닝 및 오리지널 음악. 2~4시간 내 100% 자동 납품.',
      tier2Title: '풀모션 시네마 (스튜디오 디렉터 티어 · 맞춤 견적)',
      tier2Desc:
        '잠긴 연속성 볼트를 기반으로 전담 스튜디오 PM이 풀모션 영상 장면과 실사 통합을 총괄 연출합니다.',
    },
    nichePresetCallout:
      '모든 SceneFlow Studio 스토어프런트는 다중 업종을 기본 지원하며, 웨딩·부동산·기업 교육 등 단일 전문 분야로 고정할 수도 있습니다.',
    fullMotionUpgrade: {
      heading: '오늘은 자동화로 시작하고, 원할 때 PM 연출 풀모션으로 업그레이드하세요.',
      body: '이 Express 스토어는 2~4시간 만에 100% 자동 4K 시네마 영화를 제공하여 투명한 가격($149–$249)과 당일 납품을 지켜냅니다. 마음에 드는 챕터를 풀모션 AI 영상이나 실사 인터뷰로 확장하고 싶다면, 잠긴 연속성 볼트가 재작업 없이 SceneFlow Studio 프로덕션 매니저에게 전달됩니다.',
      primaryCta: '$29 자동 블루프린트 시작하기',
      secondaryCta: 'PM 풀모션 업그레이드 문의',
    },
    operatorFooter: {
      eyebrow: '화이트라벨 플랫폼 · 14개 네이티브 포털 × 70개 이상 언어 문화 현지화 마스터',
      heading: '14개 네이티브 포털로 운영하고, 70개 이상 언어로 문화적 진정성을 담은 영화를 제작하세요.',
      body: '파급력 높은 14개 포털 언어(영어, 스페인어, 포르투갈어, 힌디어, 중국어, 아랍어, 태국어, 일본어, 한국어, 독일어, 프랑스어, 이탈리아어, 네덜란드어, 러시아어)로 프로젝트를 검토하고 관리하세요—동시에 SceneFlow의 스토리·비주얼 엔진은 지역 고증에 충실한 역사적 맥락, 현지 건축·인테리어 연출, 원어민 발음 잠금, 멀티 퍼스펙티브 오디오 트랙, QR 연동 인쇄용 컴패니언 PDF, 그리고 지속적인 리빙 연속성 볼트 업데이트(연속성 라이브러리 코드로 잠금 해제)를 갖춘 70개 이상 언어의 문화 현지화 4K 마스터를 제작합니다.',
      primaryCta: 'SceneFlow에서 브랜드 스튜디오 시작',
      secondaryCta: '운영자 워크스루 예약',
    },
    deliveryWindow: {
      badge: '당일 납품 안내',
      ssrDefault:
        '오늘 5분 스토리와 사진 잠금을 완료하면 → 2~4시간 내 4K 본편 마스터 + 예고편 전달.',
      sameDayToday:
        '현지 시각 오후 6:00 전 사진 잠금 완료 시 → 오늘 밤 {eta}경 전달 (잠금 후 2~4시간).',
      nextMorning:
        '지금 3분 만에 $29 블루프린트 시작 → 오늘 밤 사진 잠금 시 내일 아침 전달 (약 2~4시간 소요).',
      requirements: '준비물: 5분 가이드 스토리 · 휴대폰 사진 15~40장 · 10초 이름 발음 가이드',
    },
    occasionLabel: '활용 분야',
    inputLabel: '필요 자료',
    startLikeThisCta: '이런 영화 만들기',
    reelAnchors: {
      memoir: {
        occasion: '결혼 50주년 & 가족 유산 다큐',
        inputRequired: '휴대폰 사진 35장 + 음성 메모 4개로 제작',
      },
      realestate: {
        occasion: '고급 주택 & 매물 4K 쇼케이스',
        inputRequired: '매물 사진 24장 + 매물 정보 시트 1장으로 제작',
      },
      brand: {
        occasion: '클리닉 & 창업자 홈페이지 브랜드 필름',
        inputRequired: '클리닉/팀 사진 15장 + 5분 음성 인터뷰로 제작',
      },
      training: {
        occasion: '신입 안전 교육 & SOP 매뉴얼 과정',
        inputRequired: 'SOP 매뉴얼 PDF 1부 + 현장 사진 10장으로 제작',
      },
    },
  },

  de: {
    operatorBar: {
      badge: 'Live-White-Label-Referenzshop · Powered by SceneFlow Studio',
      body: 'Automatisiertes 4K wird vollautomatisch in 2–4 Std. geliefert; Full-Motion-Upgrades gehen an die PM-Regie.',
      cta: 'Unter eigener Marke starten',
      dismissLabel: 'Betreiber-Demobanner schließen',
    },
    artisanSuperpower:
      'Regiegeführtes Pacing, beschleunigt durch SceneFlow Studio für die Lieferung am selben Tag.',
    studioLadder: {
      expressTabLabel: 'Express 4K Kino · Automatisiert ($149–$249)',
      fullMotionTabLabel: 'Full-Motion Kino · Studio-PM-Regie (Vorschau)',
      expressCardToggle: 'Express 4K · Auto',
      fullMotionCardToggle: 'Full Motion · PM-Regie',
      expressCardBadge: 'Automatisiert · 2–4 Std.',
      fullMotionCardBadge: 'Studio-PM · Vorschau',
      expressHelper:
        '100 % automatisierter Same-Day-Master: Fotorealistische 4K-Szenen, Ken-Burns-Kamerafahrten, geklonte Stimmen und Stereo-Score – automatisch in 2–4 Stunden geliefert.',
      fullMotionHelper:
        'Studio-Director-Stufe (Vorschau): Full-Motion-Videogenerierung und Realfilm-Integration unter Leitung eines dedizierten Studio-PM. Jederzeit nahtlos über Ihren gesicherten Continuity Vault aufrüstbar.',
      tier1Title: 'Express 4K Kino ($149–$249 · Self-Service Automatisiert)',
      tier1Desc:
        'Inszenierte fotorealistische 4K-Frames, Kamerafahrten, Voice-Cloning & Score. 100 % automatisierte Lieferung in 2–4 Stunden.',
      tier2Title: 'Full-Motion Kino (Studio-Director-Stufe · Individuelles Angebot)',
      tier2Desc:
        'Full-Motion-Videoszenen und Realfilm-Integration, orchestriert durch einen dedizierten Studio-PM aus Ihrem Continuity Vault.',
    },
    nichePresetCallout:
      'Jeder SceneFlow Studio Storefront unterstützt mehrere Branchen ab Werk – oder lässt sich auf eine einzige Nische wie Hochzeiten, Immobilien oder Firmenschulungen fokussieren.',
    fullMotionUpgrade: {
      heading: 'Heute automatisiert starten. Jederzeit auf PM-geführtes Full Motion upgraden.',
      body: 'Dieser Express-Storefront liefert 100 % automatisierte 4K-Kinofilme in 2–4 Stunden – mit transparenten Preisen ($149–$249) und Lieferung am selben Tag. Möchten Sie Lieblingskapitel mit Full-Motion-KI-Video oder echten Interviews zum Leben erwecken? Ihr gesicherter Continuity Vault wird ohne Nacharbeit an einen SceneFlow Studio Production Manager übergeben.',
      primaryCta: 'Meinen $29 Auto-Blueprint starten',
      secondaryCta: 'PM Full-Motion-Upgrade anfragen',
    },
    operatorFooter: {
      eyebrow: 'White-Label-Plattform · 14 native Portale × 70+ kulturell lokalisierte Master',
      heading: 'In 14 nativen Portalen arbeiten. Kulturell authentische Filme in 70+ Sprachen produzieren.',
      body: 'Prüfen und verwalten Sie Projekte in 14 reichweitenstarken Portalsprachen (Englisch, Spanisch, Portugiesisch, Hindi, Chinesisch, Arabisch, Thailändisch, Japanisch, Koreanisch, Deutsch, Französisch, Italienisch, Niederländisch und Russisch) – während die Story- und Visual-Engine von SceneFlow kulturell lokalisierte 4K-Master in über 70 Sprachen erstellt, inklusive regional präziser historischer Kontexte, lokaler Architektur- und Interieur-Inszenierung, nativer Aussprache-Locks, Multi-Perspektiven-Audiospuren, QR-verknüpfter Print-Begleit-PDFs sowie fortlaufender Living-Continuity-Vault-Updates (freigeschaltet per Continuity-Library-Code).',
      primaryCta: 'Eigenes Marken-Studio auf SceneFlow starten',
      secondaryCta: 'Betreiber-Walkthrough buchen',
    },
    deliveryWindow: {
      badge: 'Same-Day-Lieferfenster',
      ssrDefault:
        '5-Min.-Story & Fotos heute freigeben → 4K-Hauptfilm-Master + Trailer in 2–4 Stunden geliefert.',
      sameDayToday:
        'Fotos bis 18:00 Uhr Ortszeit freigeben → Lieferung heute Abend gegen {eta} (2–4 Std. nach Fotofreigabe).',
      nextMorning:
        'Jetzt in 3 Min. den $29 Blueprint starten → Fotos heute Abend freigeben für die Lieferung morgen früh (2–4 Std.).',
      requirements: 'Benötigt: 5-Min.-Story-Interview · 15–40 Handyfotos · 10-Sek.-Aussprachehilfe',
    },
    occasionLabel: 'Anlass',
    inputLabel: 'Benötigtes Material',
    startLikeThisCta: 'Ähnlichen Film starten',
    reelAnchors: {
      memoir: {
        occasion: 'Goldene Hochzeit & Familienvermächtnis',
        inputRequired: 'Erstellt aus 35 Handyfotos + 4 Sprachnotizen',
      },
      realestate: {
        occasion: 'Luxusimmobilie & Exposé-Tour',
        inputRequired: 'Erstellt aus 24 Immobilienfotos + 1 Exposé-Blatt',
      },
      brand: {
        occasion: 'Klinik- & Gründer-Homepage-Film',
        inputRequired: 'Erstellt aus 15 Praxis-/Teamfotos + 5-Min.-Sprachinterview',
      },
      training: {
        occasion: 'Sicherheits- & SOP-Schulungskurs',
        inputRequired: 'Erstellt aus 1 SOP-Handbuch-PDF + 10 Betriebsfotos',
      },
    },
  },

  fr: {
    operatorBar: {
      badge: 'Vitrine de référence en marque blanche · Propulsée par SceneFlow Studio',
      body: 'Les films 4K automatisés sont livrés sans intervention en 2–4 h ; les upgrades Full Motion sont dirigés par un PM.',
      cta: 'Lancer sous votre marque',
      dismissLabel: 'Fermer la bannière démo opérateur',
    },
    artisanSuperpower:
      'Un rythme cinématographique digne d’un réalisateur, accéléré par SceneFlow Studio pour une livraison le jour même.',
    studioLadder: {
      expressTabLabel: 'Cinéma Express 4K · Automatisé ($149–$249)',
      fullMotionTabLabel: 'Cinéma Full Motion · Dirigé par PM Studio (Aperçu)',
      expressCardToggle: 'Express 4K · Auto',
      fullMotionCardToggle: 'Full Motion · PM',
      expressCardBadge: 'Automatisé · 2–4 h',
      fullMotionCardBadge: 'PM Studio · Aperçu',
      expressHelper:
        'Master 100 % automatisé le jour même : scènes 4K photoréalistes, mouvements de caméra Ken Burns, voix clonées et bande originale stéréo livrés en 2 à 4 heures.',
      fullMotionHelper:
        'Gamme Réalisateur Studio (Aperçu) : génération vidéo Full Motion et intégration de prises de vues réelles dirigées par un chef de production dédié, à tout moment depuis votre coffre de continuité.',
      tier1Title: 'Cinéma Express 4K ($149–$249 · Libre-service automatisé)',
      tier1Desc:
        'Plans 4K photoréalistes mis en scène, mouvements de caméra, clonage vocal et musique. Livraison 100 % automatisée en 2–4 heures.',
      tier2Title: 'Cinéma Full Motion (Gamme Réalisateur Studio · Sur devis)',
      tier2Desc:
        'Scènes vidéo Full Motion et intégration live-action orchestrées par un PM Studio dédié à partir de votre coffre de continuité verrouillé.',
    },
    nichePresetCallout:
      'Chaque vitrine SceneFlow Studio prend en charge plusieurs secteurs d’emblée — ou peut être dédiée à une seule niche comme le mariage, l’immobilier ou la formation en entreprise.',
    fullMotionUpgrade: {
      heading: 'Démarrez en automatisé aujourd’hui. Passez au Full Motion dirigé par PM quand vous voulez.',
      body: 'Cette vitrine Express livre des films Cinéma 4K 100 % automatisés en 2–4 heures, avec des tarifs transparents ($149–$249) et une livraison le jour même. Envie d’animer certains chapitres en vidéo IA Full Motion ou d’ajouter des interviews filmées ? Votre coffre de continuité verrouillé est transféré sans reprise à un Directeur de Production SceneFlow Studio.',
      primaryCta: 'Démarrer mon Blueprint automatisé ($29)',
      secondaryCta: 'Demander un upgrade Full Motion PM',
    },
    operatorFooter: {
      eyebrow: 'Plateforme en marque blanche · 14 portails natifs × 70+ masters culturellement localisés',
      heading: 'Opérez dans 14 portails natifs. Produisez des films culturellement authentiques dans plus de 70 langues.',
      body: 'Révisez et gérez vos projets dans 14 langues de portail à fort impact (anglais, espagnol, portugais, hindi, chinois, arabe, thaï, japonais, coréen, allemand, français, italien, néerlandais et russe) — tandis que le moteur narratif et visuel de SceneFlow produit des masters 4K culturellement localisés dans plus de 70 langues, avec contexte historique fidèle à chaque région, mise en scène architecturale et intérieure locale, verrous de prononciation native, pistes audio multi-perspectives, PDF compagnons imprimables liés par QR code et mises à jour récurrentes du Coffre de Continuité Vivant (déverrouillées via le Code de Bibliothèque de Continuité).',
      primaryCta: 'Lancer votre studio de marque sur SceneFlow',
      secondaryCta: 'Réserver une démo opérateur',
    },
    deliveryWindow: {
      badge: 'Fenêtre de livraison le jour même',
      ssrDefault:
        'Validez votre récit de 5 min et vos photos aujourd’hui → Master long métrage 4K + bande-annonce livrés en 2–4 heures.',
      sameDayToday:
        'Commandez et validez vos photos avant 18 h → Livraison ce soir vers {eta} (2–4 h après validation).',
      nextMorning:
        'Lancez votre Blueprint à $29 en 3 min → Validez vos photos ce soir pour une livraison demain matin (2–4 h).',
      requirements: 'Requis : entretien guidé de 5 min · 15–40 photos de téléphone · guide de prononciation de 10 s',
    },
    occasionLabel: 'Occasion',
    inputLabel: 'Éléments requis',
    startLikeThisCta: 'Créer un film comme celui-ci',
    reelAnchors: {
      memoir: {
        occasion: 'Noces d’or & patrimoine familial',
        inputRequired: 'Créé à partir de 35 photos mobile + 4 notes vocales',
      },
      realestate: {
        occasion: 'Propriété de prestige & visite 4K',
        inputRequired: 'Créé à partir de 24 photos immobilières + 1 fiche technique',
      },
      brand: {
        occasion: 'Film d’accueil clinique & fondateur',
        inputRequired: 'Créé à partir de 15 photos d’équipe + entretien vocal de 5 min',
      },
      training: {
        occasion: 'Formation sécurité & procédures SOP',
        inputRequired: 'Créé à partir d’1 manuel PDF + 10 photos sur site',
      },
    },
  },

  it: {
    operatorBar: {
      badge: 'Vetrina di riferimento White-Label · Powered by SceneFlow Studio',
      body: 'Il 4K automatizzato consegna in autonomia in 2–4 ore; gli upgrade Full-Motion passano alla regia di un PM.',
      cta: 'Lancia con il tuo brand',
      dismissLabel: 'Chiudi il banner demo per operatori',
    },
    artisanSuperpower:
      'Ritmo da regista artigianale, accelerato da SceneFlow Studio per la consegna in giornata.',
    studioLadder: {
      expressTabLabel: 'Cinema Express 4K · Automatizzato ($149–$249)',
      fullMotionTabLabel: 'Cinema Full-Motion · Regia PM Studio (Anteprima)',
      expressCardToggle: 'Express 4K · Auto',
      fullMotionCardToggle: 'Full Motion · PM',
      expressCardBadge: 'Automatizzato · 2–4 ore',
      fullMotionCardBadge: 'PM Studio · Anteprima',
      expressHelper:
        'Master 100% automatizzato in giornata: scene 4K fotorealistiche, movimenti di camera Ken Burns, voci clonate e colonna sonora stereo consegnati in 2–4 ore.',
      fullMotionHelper:
        'Livello Regista Studio (Anteprima): generazione video Full-Motion e integrazione live-action diretta da un PM Studio dedicato, attivabile in qualsiasi momento dal tuo Vault di Continuità.',
      tier1Title: 'Cinema Express 4K ($149–$249 · Self-Service Automatizzato)',
      tier1Desc:
        'Fotogrammi 4K fotorealistici diretti, movimenti di camera, clonazione vocale e musica. Consegna 100% automatizzata in 2–4 ore.',
      tier2Title: 'Cinema Full-Motion (Livello Regista Studio · Preventivo su misura)',
      tier2Desc:
        'Scene video Full-Motion e riprese dal vivo orchestrate da un PM Studio dedicato usando il tuo Vault di Continuità bloccato.',
    },
    nichePresetCallout:
      'Ogni vetrina SceneFlow Studio supporta più settori fin da subito — oppure può essere focalizzata su una singola nicchia come Matrimoni, Immobiliare o Formazione Aziendale.',
    fullMotionUpgrade: {
      heading: 'Inizia automatizzato oggi. Passa al Full-Motion diretto da PM quando vuoi.',
      body: 'Questa vetrina Express consegna film Cinema 4K 100% automatizzati in 2–4 ore, mantenendo prezzi trasparenti ($149–$249) e consegna in giornata. Vuoi dare vita ai capitoli preferiti con video AI Full-Motion o interviste dal vivo? Il tuo Vault di Continuità bloccato passa senza rilavorazioni a un Production Manager di SceneFlow Studio.',
      primaryCta: 'Avvia il mio Blueprint automatizzato ($29)',
      secondaryCta: 'Richiedi upgrade Full-Motion con PM',
    },
    operatorFooter: {
      eyebrow: 'Piattaforma White-Label · 14 Portali Nativi × 70+ Master Culturalmente Localizzati',
      heading: 'Opera in 14 Portali Nativi. Produci Film Culturalmente Autentici in Oltre 70 Lingue.',
      body: 'Rivedi e gestisci i progetti in 14 lingue di portale ad alto impatto (inglese, spagnolo, portoghese, hindi, cinese, arabo, thailandese, giapponese, coreano, tedesco, francese, italiano, olandese e russo) — mentre il motore narrativo e visivo di SceneFlow produce master 4K culturalmente localizzati in oltre 70 lingue, completi di contesto storico accurato per ogni area, allestimenti architettonici e d’interni locali, blocchi di pronuncia nativa, Tracce Audio Multi-Prospettiva, PDF Stampabili di Accompagnamento collegati via QR e aggiornamenti ricorrenti del Vault di Continuità Vivo (sbloccabili tramite Codice Libreria di Continuità).',
      primaryCta: 'Lancia il tuo studio brandizzato su SceneFlow',
      secondaryCta: 'Prenota una demo per operatori',
    },
    deliveryWindow: {
      badge: 'Finestra di consegna in giornata',
      ssrDefault:
        'Completa la storia in 5 min e conferma le foto oggi → Master 4K + Trailer consegnati in 2–4 ore.',
      sameDayToday:
        'Ordina e conferma le foto entro le 18:00 → Consegna stasera verso le {eta} (2–4 ore dopo la conferma).',
      nextMorning:
        'Avvia il Blueprint da $29 in 3 min ora → Conferma le foto stasera per la consegna domattina (2–4 ore).',
      requirements: 'Requisiti: intervista guidata di 5 min · 15–40 foto da smartphone · guida pronuncia di 10 sec',
    },
    occasionLabel: 'Occasione',
    inputLabel: 'Materiale richiesto',
    startLikeThisCta: 'Crea un film come questo',
    reelAnchors: {
      memoir: {
        occasion: 'Nozze d’oro & memoria di famiglia',
        inputRequired: 'Creato da 35 foto da smartphone + 4 note vocali',
      },
      realestate: {
        occasion: 'Residenza di lusso & tour immobiliare',
        inputRequired: 'Creato da 24 foto dell’immobile + 1 scheda tecnica',
      },
      brand: {
        occasion: 'Film homepage per clinica & fondatore',
        inputRequired: 'Creato da 15 foto clinica/team + intervista vocale di 5 min',
      },
      training: {
        occasion: 'Corso sicurezza & procedure SOP',
        inputRequired: 'Creato da 1 manuale SOP PDF + 10 foto aziendali',
      },
    },
  },

  nl: {
    operatorBar: {
      badge: 'Live White-Label Referentieshop · Powered by SceneFlow Studio',
      body: 'Geautomatiseerde 4K-levering gebeurt handsfree in 2–4 uur; Full-Motion upgrades gaan naar PM-regie.',
      cta: 'Start onder eigen merk',
      dismissLabel: 'Sluit demobalk voor studio-eigenaren',
    },
    artisanSuperpower:
      'Regiewaardig tempo, versneld door SceneFlow Studio voor levering op dezelfde dag.',
    studioLadder: {
      expressTabLabel: 'Express 4K Cinema · Geautomatiseerd ($149–$249)',
      fullMotionTabLabel: 'Full-Motion Cinema · Studio PM-regie (Voorbeeld)',
      expressCardToggle: 'Express 4K · Auto',
      fullMotionCardToggle: 'Full Motion · PM',
      expressCardBadge: 'Geautomatiseerd · 2–4 uur',
      fullMotionCardBadge: 'Studio PM · Voorbeeld',
      expressHelper:
        '100% geautomatiseerde same-day master: fotorealistische 4K-scènes, Ken Burns-camerabewegingen, gekloonde stemmen en stereoscore — automatisch geleverd in 2–4 uur.',
      fullMotionHelper:
        'Studio Director-niveau (Voorbeeld): Full-Motion videogeneratie en live-action integratie onder regie van een vaste Studio PM. Altijd naadloos te upgraden vanuit je vergrendelde Continuity Vault.',
      tier1Title: 'Express 4K Cinema ($149–$249 · Selfservice geautomatiseerd)',
      tier1Desc:
        'Geregisseerde fotorealistische 4K-frames, camerabeweging, stemkloning & score. 100% automatische levering in 2–4 uur.',
      tier2Title: 'Full-Motion Cinema (Studio Director-niveau · Maatwerkofferte)',
      tier2Desc:
        'Full-Motion videoscènes en live-action integratie georkestreerd door een vaste Studio PM met jouw vergrendelde Continuity Vault.',
    },
    nichePresetCallout:
      'Elke SceneFlow Studio-storefront ondersteunt standaard meerdere sectoren — of kan worden gericht op één niche zoals Bruiloften, Vastgoed of Bedrijfstraining.',
    fullMotionUpgrade: {
      heading: 'Start vandaag geautomatiseerd. Upgrade altijd naar PM-geregisseerde Full Motion.',
      body: 'Deze Express-storefront levert 100% geautomatiseerde 4K-bioscoopfilms in 2–4 uur — met transparante prijzen ($149–$249) en levering op dezelfde dag. Klaar om favoriete hoofdstukken tot leven te brengen met Full-Motion AI-video of echte interviews? Je vergrendelde Continuity Vault gaat zonder herwerk over naar een SceneFlow Studio Production Manager.',
      primaryCta: 'Start mijn $29 Auto-Blueprint',
      secondaryCta: 'Vraag PM Full-Motion upgrade aan',
    },
    operatorFooter: {
      eyebrow: 'White-Label Platform · 14 Native Portalen × 70+ Cultureel Gelokaliseerde Masters',
      heading: 'Werk in 14 Native Portalen. Produceer Cultureel Authentieke Films in 70+ Talen.',
      body: 'Beoordeel en beheer projecten in 14 krachtige portaaltalen (Engels, Spaans, Portugees, Hindi, Chinees, Arabisch, Thais, Japans, Koreaans, Duits, Frans, Italiaans, Nederlands en Russisch) — terwijl de verhaal- en visuele engine van SceneFlow cultureel gelokaliseerde 4K-masters produceert in meer dan 70 talen, compleet met regionaal nauwkeurige historische context, lokale architectuur- en interieurstaging, native uitspraaklocks, Multi-Perspectief Audiotracks, QR-gekoppelde Print Companion PDF’s en doorlopende Living Continuity Vault-updates (ontgrendeld via de Continuity Library Code).',
      primaryCta: 'Lanceer jouw eigen studio op SceneFlow',
      secondaryCta: 'Boek een rondleiding voor aanbieders',
    },
    deliveryWindow: {
      badge: 'Leveringsvenster vandaag nog',
      ssrDefault:
        'Rond je verhaal van 5 min en foto’s vandaag af → 4K-hoofdfilm + trailer geleverd in 2–4 uur.',
      sameDayToday:
        'Bestel en bevestig foto’s vóór 18:00 uur → Vanavond rond {eta} geleverd (2–4 uur na fotobevestiging).',
      nextMorning:
        'Start je $29 Blueprint nu in 3 min → Bevestig foto’s vanavond voor levering morgenochtend (2–4 uur).',
      requirements: 'Nodig: 5-min. begeleid verhaal · 15–40 telefoonfoto’s · 10-sec. uitspraakgids',
    },
    occasionLabel: 'Gelegenheid',
    inputLabel: 'Benodigde input',
    startLikeThisCta: 'Start zo’n film',
    reelAnchors: {
      memoir: {
        occasion: '50-jarig jubileum & familiegeschiedenis',
        inputRequired: 'Gemaakt van 35 telefoonfoto’s + 4 spraakberichten',
      },
      realestate: {
        occasion: 'Luxe woning & 4K vastgoedtour',
        inputRequired: 'Gemaakt van 24 woningfoto’s + 1 objectomschrijving',
      },
      brand: {
        occasion: 'Kliniek- & oprichtersfilm voor homepage',
        inputRequired: 'Gemaakt van 15 praktijk-/teamfoto’s + 5-min. spraakinterview',
      },
      training: {
        occasion: 'Veiligheids- & SOP-inwerkcursus',
        inputRequired: 'Gemaakt van 1 SOP-handboek PDF + 10 werkplekfoto’s',
      },
    },
  },

  ru: {
    operatorBar: {
      badge: 'Демо-витрина White-Label · На платформе SceneFlow Studio',
      body: 'Автоматический 4K выполняется без участия оператора за 2–4 ч; апгрейды Full-Motion передаются продакшн-менеджеру (PM).',
      cta: 'Запустить под своим брендом',
      dismissLabel: 'Скрыть демонстрационную панель оператора',
    },
    artisanSuperpower:
      'Режиссёрский ритм и подача, ускоренные SceneFlow Studio для выдачи готового фильма в тот же день.',
    studioLadder: {
      expressTabLabel: 'Express 4K Кино · Автоматически ($149–$249)',
      fullMotionTabLabel: 'Full-Motion Кино · Режиссура PM (Превью)',
      expressCardToggle: 'Express 4K · Авто',
      fullMotionCardToggle: 'Full Motion · PM',
      expressCardBadge: 'Автоматически · 2–4 ч',
      fullMotionCardBadge: 'PM Студии · Превью',
      expressHelper:
        '100% автоматический мастер в тот же день: фотореалистичные 4K-сцены, движение камеры Ken Burns, клонированные голоса и стереосаундтрек — автоматически за 2–4 часа.',
      fullMotionHelper:
        'Уровень режиссёра студии (Превью): генерация Full-Motion видео и интеграция живых съёмок под руководством персонального PM. Доступно как бесшовный апгрейд из вашего хранилища преемственности.',
      tier1Title: 'Express 4K Кино ($149–$249 · Автоматический сервис)',
      tier1Desc:
        'Постановочные фотореалистичные 4K-кадры, движение камеры, клонирование голоса и музыка. 100% автоматическая выдача за 2–4 часа.',
      tier2Title: 'Full-Motion Кино (Уровень режиссёра студии · Индивидуальный расчёт)',
      tier2Desc:
        'Видеосцены Full-Motion и интеграция живых съёмок под управлением выделенного PM на базе вашего закреплённого хранилища преемственности.',
    },
    nichePresetCallout:
      'Каждая витрина SceneFlow Studio поддерживает несколько направлений из коробки — либо настраивается под одну нишу: свадьбы, недвижимость или корпоративное обучение.',
    fullMotionUpgrade: {
      heading: 'Начните автоматически сегодня. Перейдите на Full-Motion с PM в любой момент.',
      body: 'Эта Express-витрина выпускает 100% автоматические 4K-фильмы за 2–4 часа, сохраняя прозрачную цену ($149–$249) и готовность в тот же день. Хотите оживить любимые главы с помощью Full-Motion ИИ-видео или живых интервью? Ваше хранилище преемственности без переделок передаётся продакшн-менеджеру SceneFlow Studio.',
      primaryCta: 'Начать авто-план за $29',
      secondaryCta: 'Запросить апгрейд Full-Motion с PM',
    },
    operatorFooter: {
      eyebrow: 'Платформа White-Label · 14 нативных порталов × 70+ культурно локализованных мастеров',
      heading: 'Управляйте в 14 нативных порталах. Создавайте культурно аутентичные фильмы на 70+ языках.',
      body: 'Проверяйте и ведите проекты на 14 ключевых языках портала (английский, испанский, португальский, хинди, китайский, арабский, тайский, японский, корейский, немецкий, французский, итальянский, нидерландский и русский) — пока сюжетный и визуальный движок SceneFlow создаёт культурно локализованные 4K-мастера на 70+ языках с регионально точным историческим контекстом, локальной архитектурой и интерьерами, фиксацией нативного произношения, многоракурсными аудиодорожками, печатными PDF-компаньонами с QR-ссылками и регулярными обновлениями Живого хранилища преемственности (разблокируемыми через Код библиотеки преемственности).',
      primaryCta: 'Запустить брендовую студию на SceneFlow',
      secondaryCta: 'Записаться на обзор для операторов',
    },
    deliveryWindow: {
      badge: 'Выдача готового фильма сегодня',
      ssrDefault:
        'Запишите 5-минутную историю и закрепите фото сегодня → 4K-фильм и трейлер будут готовы через 2–4 часа.',
      sameDayToday:
        'Закрепите фото до 18:00 по местному времени → Готовый фильм сегодня около {eta} (2–4 ч после загрузки фото).',
      nextMorning:
        'Начните план за $29 за 3 минуты прямо сейчас → Закрепите фото вечером, и фильм будет готов завтра утром (2–4 ч).',
      requirements: 'Понадобится: 5-мин. голосовое интервью · 15–40 фото с телефона · 10-сек. подсказка произношения',
    },
    occasionLabel: 'Событие',
    inputLabel: 'Исходные материалы',
    startLikeThisCta: 'Создать похожий фильм',
    reelAnchors: {
      memoir: {
        occasion: 'Золотая свадьба и семейная летопись',
        inputRequired: 'Создано из 35 фото с телефона + 4 голосовых заметок',
      },
      realestate: {
        occasion: 'Элитная недвижимость и 4K-обзор',
        inputRequired: 'Создано из 24 фото объекта + 1 описания лота',
      },
      brand: {
        occasion: 'Имиджевый фильм клиники и основателя',
        inputRequired: 'Создано из 15 фото клиники/команды + 5-мин. голосового интервью',
      },
      training: {
        occasion: 'Курс по технике безопасности и SOP',
        inputRequired: 'Создано из 1 PDF-инструкции SOP + 10 фото рабочего пространства',
      },
    },
  },
}
