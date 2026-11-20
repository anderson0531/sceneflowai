/**
 * Localized YouTube publishing metadata & high-CTR thumbnail copy
 * for the SceneFlow Studio Global Paid Social Promo Series.
 *
 * Local currencies match `src/lib/i18n/landingCurrency.ts` exactly:
 *   en: USD ($)      · es: MXN (MX$, 18.85) · pt: BRL (R$, 5.86)
 *   hi: INR (₹, 93.8) · zh: CNY (¥, 6.65)    · ar: SAR (ر.س, 3.75) · th: THB (฿, 34)
 *
 * Target Channel: @sceneflowaistudio (UCSXGf2gMfCRtktBCrFBDc0g)
 * Category: 28 (Science & Technology)
 */

import type { SocialPromoLocale, SocialPromoSpotId } from './socialPromoScripts'

export const YOUTUBE_CHANNEL_HANDLE = 'sceneflowaistudio'
export const YOUTUBE_CHANNEL_ID = 'UCSXGf2gMfCRtktBCrFBDc0g'
export const YOUTUBE_CATEGORY_ID = '28' // Science & Technology

export const YOUTUBE_BCP47_MAP: Record<SocialPromoLocale, string> = {
  en: 'en',
  es: 'es',
  pt: 'pt-BR',
  hi: 'hi',
  zh: 'zh-Hans',
  ar: 'ar',
  th: 'th',
}

export interface SpotThumbnailSpec {
  eyebrow: string
  headlineTop: string
  headlineAccent: string
  statLine: string
  ctaPill: string
  rtl?: boolean
}

export interface SpotYouTubeLocaleMeta {
  locale: SocialPromoLocale
  language: string
  title: string
  shortsTitle: string
  description: string
  tags: string[]
  thumbnail: SpotThumbnailSpec
}

export interface SpotYouTubeConfig {
  spotId: SocialPromoSpotId
  heroFrameBlock: 1 | 2 | 3
  heroFrameTimestampSec: number
  locales: Record<SocialPromoLocale, SpotYouTubeLocaleMeta>
}

function siteUrl(spotId: SocialPromoSpotId, locale: SocialPromoLocale): string {
  const locParam = locale === 'zh' ? 'zh-CN' : locale
  return `https://sceneflowai.studio/?locale=${locParam}&utm_source=youtube&utm_medium=channel_promo&utm_campaign=${spotId}`
}

export const SOCIAL_PROMO_YOUTUBE_META: Partial<Record<SocialPromoSpotId, SpotYouTubeConfig>> = {
  'svc-01': {
    spotId: 'svc-01',
    heroFrameBlock: 2,
    heroFrameTimestampSec: 8.0,
    locales: {
      en: {
        locale: 'en',
        language: YOUTUBE_BCP47_MAP.en,
        title: 'Beyond Random AI Clips: The Automated 4K Client Studio | SceneFlow Studio',
        shortsTitle: 'Stop Babysitting AI Clips — Run an Automated 4K Studio #Shorts',
        description: [
          'Ordinary AI video tools only spit out random 5-second clips — leaving you trapped babysitting prompts, fixing drifting faces, and stitching audio all night.',
          '',
          `Start your $9 Explorer Test Flight → ${siteUrl('svc-01', 'en')}`,
          '',
          'WHY AGENCIES & OPERATORS CHOOSE SCENEFLOW STUDIO:',
          '• Continuity Vault™ — locks cast faces, wardrobe, voices, and sets across every scene',
          '• Walk-Away Production Agent — builds full 4K films, mixes synced audio, and auto-heals shots',
          '• 100% White-Label Client Portals — zero client login, Blueprint sign-off, timestamped Screening Room',
          '• Up to 90% net margins delivering Life Memoirs, Real Estate Tours, and Corporate Training',
          '',
          `Launch your automated studio today: ${siteUrl('svc-01', 'en')}`,
          'Channel: https://www.youtube.com/@sceneflowaistudio',
          '',
          '#SceneFlowStudio #AIVideoPlatform #VideoAgency #WhiteLabelVideo #ProductionAutomation #AIFilmmaking',
        ].join('\n'),
        tags: [
          'SceneFlow Studio',
          'automated AI video studio',
          'AI video production platform',
          'white label video portal',
          'consistent AI characters',
          'AI production agent',
          'video production agency',
          'life memoir video service',
          'real estate 4K video',
          'corporate training video',
        ],
        thumbnail: {
          eyebrow: 'AUTOMATED 4K STUDIO · WHITE-LABEL',
          headlineTop: 'BEYOND AI CLIPS',
          headlineAccent: '→ AUTO-BUILT FILMS',
          statLine: 'Continuity Vault · Client Portals · 90% Margin',
          ctaPill: 'Start for $9 · sceneflowai.studio',
        },
      },
      es: {
        locale: 'es',
        language: YOUTUBE_BCP47_MAP.es,
        title: 'Más Allá de Clips con IA: Tu Estudio 4K Automatizado | SceneFlow Studio',
        shortsTitle: 'Deja de Editar Clips Sueltos de IA — Estudio 4K Automatizado #Shorts',
        description: [
          'Las herramientas de IA comunes solo generan clips sueltos de 5 segundos, atrapándote toda la noche entre prompts manuales, rostros cambiantes y edición.',
          '',
          `Empieza tu prueba completa por MX$170 → ${siteUrl('svc-01', 'es')}`,
          '',
          'POR QUÉ LAS AGENCIAS ELIGEN SCENEFLOW STUDIO:',
          '• Continuity Vault™ — bloquea rostros, vestuario, voces y locaciones sin cambios entre escenas',
          '• Production Agent autónomo — construye películas 4K completas, mezcla audio y corrige tomas solas',
          '• Portales de clientes 100% Marca Blanca — sin registro, aprobación de guion y sala privada',
          '• Hasta 90% de margen neto entregando Memorias, Tours Inmobiliarios y Capacitación Corporativa',
          '',
          `Lanza tu estudio automatizado hoy: ${siteUrl('svc-01', 'es')}`,
          'Canal oficial: https://www.youtube.com/@sceneflowaistudio',
          '',
          '#SceneFlowStudio #ProduccionAutomatizada #EstudioDeVideoIA #MarcaBlanca #AgenciaDeVideo #Video4K',
        ].join('\n'),
        tags: [
          'SceneFlow Studio',
          'plataforma de video con IA',
          'producción audiovisual automatizada',
          'agencia de video marca blanca',
          'personajes consistentes IA',
          'agente de producción IA',
          'tours inmobiliarios 4K',
          'capacitación corporativa video',
          'video memorias',
        ],
        thumbnail: {
          eyebrow: 'ESTUDIO 4K AUTOMATIZADO · MARCA BLANCA',
          headlineTop: 'NO MÁS CLIPS SUELTOS',
          headlineAccent: '→ ESTUDIO AUTOMÁTICO',
          statLine: 'Elenco Fijo · Portales Propios · 90% Margen',
          ctaPill: 'Prueba por MX$170 · sceneflowai.studio',
        },
      },
      pt: {
        locale: 'pt',
        language: YOUTUBE_BCP47_MAP.pt,
        title: 'Além de Clipes de IA: Sua Produtora 4K Automatizada | SceneFlow Studio',
        shortsTitle: 'Pare de Montar Clipes Soltos de IA — Produtora 4K Automática #Shorts',
        description: [
          'Ferramentas comuns de IA só geram clipes soltos de 5 segundos — prendendo você a noite toda em prompts manuais, rostos inconsistentes e edição.',
          '',
          `Comece seu teste completo por R$53 → ${siteUrl('svc-01', 'pt')}`,
          '',
          'POR QUE PRODUTORAS E AGÊNCIAS ESCOLHEM O SCENEFLOW STUDIO:',
          '• Continuity Vault™ — trava elenco, figurinos, vozes e cenários em todas as cenas',
          '• Production Agent autônomo — produz filmes 4K completos, mixa áudio e corrige planos automaticamente',
          '• Portais de clientes 100% com a sua marca — sem login, aprovação prévia e sala privada',
          '• Até 90% de margem líquida em Memórias de Vida, Tours Imobiliários e Treinamentos Corporativos',
          '',
          `Lance sua produtora automatizada hoje: ${siteUrl('svc-01', 'pt')}`,
          'Canal oficial: https://www.youtube.com/@sceneflowaistudio',
          '',
          '#SceneFlowStudio #ProdutoraAutomatizada #VideoComIA #MarcaPropria #AgenciaDeVideo #Video4K',
        ].join('\n'),
        tags: [
          'SceneFlow Studio',
          'plataforma de produção de vídeo IA',
          'produtora 4K automatizada',
          'portal de clientes marca própria',
          'personagens consistentes IA',
          'agente de produção IA',
          'tours imobiliários 4K',
          'treinamento corporativo vídeo',
          'memórias de vida',
        ],
        thumbnail: {
          eyebrow: 'PRODUTORA 4K AUTOMÁTICA · SUA MARCA',
          headlineTop: 'CHEGA DE CLIPES SOLTOS',
          headlineAccent: '→ FILMES AUTOMÁTICOS',
          statLine: 'Elenco Travado · Portais Próprios · 90% Margem',
          ctaPill: 'Teste por R$53 · sceneflowai.studio',
        },
      },
      hi: {
        locale: 'hi',
        language: YOUTUBE_BCP47_MAP.hi,
        title: 'रैंडम AI क्लिप्स से आगे बढ़ें: पूरा ऑटोमेटेड 4K वीडियो स्टूडियो | SceneFlow Studio',
        shortsTitle: 'आम AI क्लिप टूल छोड़ें — पूरा ऑटोमेटेड 4K स्टूडियो चलाएँ #Shorts',
        description: [
          'आम AI टूल सिर्फ़ 5 सेकंड के अलग-अलग क्लिप देते हैं — जिससे आप पूरी रात मैनुअल प्रॉम्प्ट, बदलते चेहरों और ऑडियो एडिटिंग में उलझे रहते हैं।',
          '',
          `सिर्फ़ ₹845 में पूरा टेस्ट फ़्लाइट शुरू करें → ${siteUrl('svc-01', 'hi')}`,
          '',
          'वीडियो एजेंसियाँ SceneFlow Studio क्यों चुनती हैं:',
          '• Continuity Vault™ — हर सीन में किरदार, पहनावा, आवाज़ और लोकेशन एक जैसा लॉक',
          '• ऑटोनॉमस Production Agent — पूरी 4K फ़िल्म खुद तैयार करे, ऑडियो मिलाए और शॉट्स सुधारे',
          '• 100% आपके ब्रांड में क्लाइंट पोर्टल — बिना लॉगिन अप्रूवल और प्राइवेट स्क्रीनिंग रूम',
          '• मेमॉयर, रियल एस्टेट टूर और कॉर्पोरेट ट्रेनिंग पर 90% तक नेट मार्जिन',
          '',
          `आज ही अपना ऑटोमेटेड स्टूडियो शुरू करें: ${siteUrl('svc-01', 'hi')}`,
          'आधिकारिक चैनल: https://www.youtube.com/@sceneflowaistudio',
          '',
          '#SceneFlowStudio #ऑटोमेटेडवीडियोस्टूडियो #एआईवीडियो #वीडियोएजेंसी #रियलएस्टेटवीडियो #4Kवीडियो',
        ].join('\n'),
        tags: [
          'SceneFlow Studio',
          'ऑटोमेटेड एआई वीडियो स्टूडियो',
          'एआई वीडियो प्रोडक्शन प्लेटफ़ॉर्म',
          'वीडियो एजेंसी बिज़नेस',
          'ब्रांडेड क्लाइंट पोर्टल',
          'रियल एस्टेट 4K टूर',
          'कॉर्पोरेट ट्रेनिंग वीडियो',
          'लाइफ मेमॉयर वीडियो',
        ],
        thumbnail: {
          eyebrow: 'ऑटोमेटेड 4K स्टूडियो · आपका ब्रांड',
          headlineTop: 'रैंडम AI क्लिप्स छोड़ें',
          headlineAccent: '→ ऑटोमेटेड 4K स्टूडियो',
          statLine: 'लॉक किरदार · क्लाइंट पोर्टल · 90% मार्जिन',
          ctaPill: '₹845 से शुरू · sceneflowai.studio',
        },
      },
      zh: {
        locale: 'zh',
        language: YOUTUBE_BCP47_MAP.zh,
        title: '告别随机 5 秒碎片：全流程自动化 4K 商业影视平台 | SceneFlow Studio',
        shortsTitle: '别再通宵拼 AI 碎片了——全自动 4K 白标影视平台 #Shorts',
        description: [
          '普通 AI 工具只会吐出随机的 5 秒碎片，让你整晚困在反复改提示词、修变脸和手动拼剪音频的噩梦里。',
          '',
          `仅需 ¥60 开启全功能试用 → ${siteUrl('svc-01', 'zh')}`,
          '',
          '为什么专业机构与服务商选择 SceneFlow Studio：',
          '• 连续性资产库（Continuity Vault™）——跨镜头精准锁定角色面孔、服装、音色与场景',
          '• 无人值守自动制片代理 —— 一键生成完整 4K 成片、自动混音并智能修复失败镜头',
          '• 100% 白标客户审片门户 —— 客户无需登录即可审定蓝图并打点批注',
          '• 交付人生传记、房产巡礼与企业培训片，净利率高达 90%',
          '',
          `立即启动你的自动化工作室：${siteUrl('svc-01', 'zh')}`,
          '官方频道：https://www.youtube.com/@sceneflowaistudio',
          '',
          '#SceneFlowStudio #自动化制片 #AI视频平台 #白标影视工作室 #角色一致性 #4K商业视频',
        ].join('\n'),
        tags: [
          'SceneFlow Studio',
          '全自动AI制片平台',
          'AI视频工作室',
          '白标客户审片门户',
          '角色一致性AI视频',
          '自动制片代理',
          '房产巡礼4K视频',
          '企业培训视频',
          '人生传记影片',
        ],
        thumbnail: {
          eyebrow: '全自动 4K 制片平台 · 白标门户',
          headlineTop: '告别 5 秒 AI 碎片',
          headlineAccent: '→ 全自动 4K 成片',
          statLine: '角色锁定 · 白标客户门户 · 90% 净利',
          ctaPill: '¥60 开启试用 · sceneflowai.studio',
        },
      },
      ar: {
        locale: 'ar',
        language: YOUTUBE_BCP47_MAP.ar,
        title: 'تجاوز مقاطع الذكاء الاصطناعي العشوائية: منصة إنتاج 4K آلية | SceneFlow Studio',
        shortsTitle: 'توقف عن ترقيع مقاطع AI — منصة إنتاج 4K آلية متكاملة #Shorts',
        description: [
          'أدوات الذكاء الاصطناعي العادية تنتج مقاطع عشوائية من 5 ثوانٍ فقط، فتتركك طوال الليل تصلح تغيّر الوجوه وتدمج الصوت يدوياً.',
          '',
          `ابدأ تجربتك الكاملة مقابل 34 ر.س فقط ← ${siteUrl('svc-01', 'ar')}`,
          '',
          'لماذا تختار الوكالات ومقدمو خدمات الفيديو SceneFlow Studio:',
          '• خزنة الاستمرارية (Continuity Vault™) — تثبيت كامل لوجوه الشخصيات والأزياء والأصوات والمواقع',
          '• وكيل الإنتاج الآلي — يبني أفلام 4K كاملة ويمزج الصوت ويصلح اللقطات المتعثرة تلقائياً',
          '• بوابات عملاء بعلامتك التجارية 100% — دون تسجيل دخول وبقاعة عرض ومراجعة بالثانية',
          '• هوامش ربح صافية تصل إلى 90% في أفلام السيرة الذاتية والعقارات والتدريب المؤسسي',
          '',
          `أطلق استوديوك الآلي اليوم: ${siteUrl('svc-01', 'ar')}`,
          'القناة الرسمية: https://www.youtube.com/@sceneflowaistudio',
          '',
          '#SceneFlowStudio #انتاج_فيديو_آلي #منصة_فيديو_AI #وكالة_فيديو #علامة_تجارية #فيديو_4K',
        ].join('\n'),
        tags: [
          'SceneFlow Studio',
          'منصة إنتاج فيديو آلية',
          'إنتاج فيديو بالذكاء الاصطناعي',
          'وكيل إنتاج فيديو',
          'ثبات الشخصيات بالذكاء الاصطناعي',
          'بوابة عملاء بعلامتك التجارية',
          'وكالة إنتاج فيديو 4K',
        ],
        thumbnail: {
          eyebrow: 'منصة إنتاج آلية بعلامتك التجارية',
          headlineTop: 'وداعاً للمقاطع العشوائية',
          headlineAccent: 'منصة إنتاج آلية متكاملة',
          statLine: 'شخصيات ثابتة · بوابات عملاء · ربح تسعين بالمئة',
          ctaPill: '34 ر.س · sceneflowai.studio',
          rtl: true,
        },
      },
      th: {
        locale: 'th',
        language: YOUTUBE_BCP47_MAP.th,
        title: 'เหนือกว่าคลิป AI สั้นๆ: แพลตฟอร์มผลิตวิดีโอ 4K อัตโนมัติครบวงจร | SceneFlow Studio',
        shortsTitle: 'เลิกนั่งต่อคลิป AI ทั้งคืน — สตูดิโอ 4K อัตโนมัติครบวงจร #Shorts',
        description: [
          'เครื่องมือ AI ทั่วไปสร้างได้แค่คลิปสุ่ม 5 วินาที ทำให้คุณต้องนั่งแก้พรอมต์ แก้หน้าตัวละครเพี้ยน และตัดต่อเสียงเองทั้งคืน',
          '',
          `ทดลองระบบเต็มรูปแบบเพียง ฿306 → ${siteUrl('svc-01', 'th')}`,
          '',
          'ทำไมเอเจนซี่และผู้ให้บริการวิดีโอเลือก SceneFlow Studio:',
          '• Continuity Vault™ — ล็อกใบหน้าตัวละคร ชุด เสียง และฉากให้ต่อเนื่องทุกซีน',
          '• Production Agent อัตโนมัติ — สร้างหนัง 4K เต็มเรื่อง มิกซ์เสียง และแก้ช็อตที่ล้มเหลวให้เอง',
          '• พอร์ทัลลูกค้าภายใต้แบรนด์ของคุณ 100% — ไม่ต้องล็อกอิน อนุมัติบทและตรวจงานตามวินาที',
          '• ทำกำไรสุทธิสูงสุด 90% กับงานชีวประวัติ ทัวร์อสังหา และสื่ออบรมองค์กร',
          '',
          `เริ่มเปิดสตูดิโออัตโนมัติของคุณวันนี้: ${siteUrl('svc-01', 'th')}`,
          'ช่องอย่างเป็นทางการ: https://www.youtube.com/@sceneflowaistudio',
          '',
          '#SceneFlowStudio #สตูดิโอAIอัตโนมัติ #ผลิตวิดีโอ4K #เอเจนซี่วิดีโอ #พอร์ทัลแบรนด์ตัวเอง',
        ].join('\n'),
        tags: [
          'SceneFlow Studio',
          'แพลตฟอร์มผลิตวิดีโอ AI อัตโนมัติ',
          'สตูดิโอวิดีโอ 4K',
          'ล็อกใบหน้าตัวละคร AI',
          'พอร์ทัลลูกค้าแบรนด์ตัวเอง',
          'เอเจนซี่วิดีโอ',
          'ทัวร์อสังหาริมทรัพย์ 4K',
          'สื่ออบรมองค์กร',
        ],
        thumbnail: {
          eyebrow: 'สตูดิโอ 4K อัตโนมัติ · แบรนด์คุณ 100%',
          headlineTop: 'เลิกทำแค่คลิป AI สุ่มๆ',
          headlineAccent: '→ สตูดิโอ 4K อัตโนมัติ',
          statLine: 'ล็อกตัวละคร · พอร์ทัลลูกค้า · กำไร 90%',
          ctaPill: 'ทดลอง ฿306 · sceneflowai.studio',
        },
      },
    },
  },
}
