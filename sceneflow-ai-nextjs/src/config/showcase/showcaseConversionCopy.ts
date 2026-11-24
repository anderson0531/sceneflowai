/**
 * 7-Language Conversion & Operationalization Copy for Keepsake Cinema (`/showcase`):
 *  - Brand/Artisan framing ("Director-crafted pacing, accelerated by SceneFlow Studio")
 *  - Live / Explicit Same-Day Delivery Window indicator
 *  - Per-Reel 3 Conversion Anchors (Occasion + Input Required + "Start a film like this")
 */

import type { ClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import type { ShowcaseVideoSlug } from './expressCinemaCatalog'

export interface ReelConversionAnchor {
  occasion: string
  inputRequired: string
}

export interface ShowcaseConversionLocaleCopy {
  artisanSuperpower: string
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
    artisanSuperpower:
      'Director-crafted pacing, accelerated by SceneFlow Studio for same-day delivery.',
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
    artisanSuperpower:
      'Ritmo dirigido artesanalmente, acelerado por SceneFlow Studio para entrega el mismo día.',
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
    artisanSuperpower:
      'Ritmo dirigido artesanalmente, acelerado pelo SceneFlow Studio para entrega no mesmo dia.',
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
    artisanSuperpower:
      'निर्देशक-स्तरीय गति और कलात्मकता, उसी दिन डिलीवरी के लिए SceneFlow Studio द्वारा संचालित।',
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
    artisanSuperpower: '导演级匠心节奏，由 SceneFlow Studio 后台加速实现当日交付。',
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
    artisanSuperpower:
      'إيقاع إخراجي متقن، مُسرّع خلف الكواليس بواسطة SceneFlow Studio للتسليم في نفس اليوم.',
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
    artisanSuperpower:
      'จังหวะการเล่าเรื่องระดับผู้กำกับ เร่งความเร็วเบื้องหลังด้วย SceneFlow Studio เพื่อส่งมอบภายในวันเดียว',
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
