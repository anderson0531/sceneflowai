/**
 * Localized UI copy (all 7 priority languages: en, es, pt, hi, zh, ar, th) and
 * beat-synchronized 5K panned screenshot choreography for the interim Studio Door
 * Walkthrough Modal (Series Room, Blueprint Room, Production Stage, Screening Room)
 * before live database-backed shared project links are enabled.
 */

import type { FeatureRoomId } from '@/config/landing/featureRoomMedia'
import type { HeroDubLocaleId } from '@/config/landing/featureRoomScripts'
import {
  AUDIO_AGENT_SCREENSHOT_WEBP,
  BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP,
  BLUEPRINT_RESONANCE_SCREENSHOT_WEBP,
  CLIPS_AGENT_SCREENSHOT_WEBP,
  CONTINUITY_LIBRARY_SCREENSHOT_WEBP,
  DIRECT_BEATS_SCREENSHOT_WEBP,
  DIRECT_EPISODE_SCREENSHOT_WEBP,
  DIRECT_PUBLISHING_SCREENSHOT_WEBP,
  GO_TO_PRODUCTION_SCREENSHOT_WEBP,
  PRE_VIS_ANIMATIC_SCREENSHOT_WEBP,
  PRODUCTION_AGENT_SCREENSHOT_WEBP,
  PRODUCTION_MIXER_SCREENSHOT_WEBP,
  PRODUCTION_PLANNER_SCREENSHOT_WEBP,
  PRODUCTION_SCRIPT_SCREENSHOT_WEBP,
  PROMO_TRAILERS_SCREENSHOT_WEBP,
  SCENE_DIRECTOR_SCREENSHOT_WEBP,
  SCENE_WORKFLOW_SCREENSHOT_WEBP,
  SCREENING_COLLAB_SCREENSHOT_WEBP,
  SCREENING_PLAYER_SCREENSHOT_WEBP,
  SERIES_DIRECTOR_SCREENSHOT_WEBP,
  SERIES_RESONANCE_SCREENSHOT_WEBP,
  SERIES_REVIEW_SCREENSHOT_WEBP,
  START_BLUEPRINT_SCREENSHOT_WEBP,
  START_EPISODE_SCREENSHOT_WEBP,
  STILLS_AGENT_SCREENSHOT_WEBP,
  STREAMS_MULTILANGUAGE_SCREENSHOT_WEBP,
} from '@/config/landing/keyFeatureScreenshots'
import type { ReviewerMilestoneId } from '@/config/landing/productionPipelineDemo'

export function milestoneToFeatureRoomId(milestone: ReviewerMilestoneId): FeatureRoomId {
  switch (milestone) {
    case 'series':
      return 'series-desk'
    case 'blueprint':
      return 'blueprint-board'
    case 'script-ar':
      return 'production-stage'
    case 'screening':
      return 'screening-room'
  }
}

export function featureRoomIdToMilestone(roomId: FeatureRoomId): ReviewerMilestoneId {
  switch (roomId) {
    case 'series-desk':
      return 'series'
    case 'blueprint-board':
      return 'blueprint'
    case 'production-stage':
      return 'script-ar'
    case 'screening-room':
      return 'screening'
  }
}

export function normalizeWalkthroughDubLocale(locale?: string): HeroDubLocaleId {
  const cleaned = (locale ?? 'en').trim().toLowerCase()
  if (cleaned.startsWith('zh')) return 'zh'
  const base = cleaned.split(/[-_]/)[0] ?? 'en'
  if (
    base === 'en' ||
    base === 'es' ||
    base === 'pt' ||
    base === 'hi' ||
    base === 'zh' ||
    base === 'ar' ||
    base === 'th'
  ) {
    return base
  }
  return 'en'
}

export type PannedSlideKeyframe = {
  imageUrl: string
  /** CSS object-position at beat start, e.g. '50% 0%' */
  fromPos: string
  /** CSS object-position at beat end, e.g. '50% 85%' */
  toPos: string
  /** Subtle Ken Burns zoom start -> end */
  fromScale: number
  toScale: number
}

/**
 * Aligned 1:1 with `FEATURE_ROOM_SCRIPTS[roomId].beatStartSeconds` so every spoken
 * voiceover beat pans smoothly across the exact matching 5K lossless Studio screen.
 */
export const ROOM_PANNED_SLIDES: Record<FeatureRoomId, readonly PannedSlideKeyframe[]> = {
  'series-desk': [
    { imageUrl: SERIES_REVIEW_SCREENSHOT_WEBP, fromPos: '50% 0%', toPos: '50% 35%', fromScale: 1.02, toScale: 1.07 },
    { imageUrl: SERIES_REVIEW_SCREENSHOT_WEBP, fromPos: '50% 25%', toPos: '50% 65%', fromScale: 1.05, toScale: 1.02 },
    { imageUrl: SERIES_REVIEW_SCREENSHOT_WEBP, fromPos: '50% 55%', toPos: '50% 95%', fromScale: 1.02, toScale: 1.06 },
    { imageUrl: CONTINUITY_LIBRARY_SCREENSHOT_WEBP, fromPos: '20% 50%', toPos: '80% 50%', fromScale: 1.04, toScale: 1.08 },
    { imageUrl: SERIES_RESONANCE_SCREENSHOT_WEBP, fromPos: '50% 5%', toPos: '50% 85%', fromScale: 1.02, toScale: 1.06 },
    { imageUrl: SERIES_DIRECTOR_SCREENSHOT_WEBP, fromPos: '35% 40%', toPos: '65% 60%', fromScale: 1.03, toScale: 1.08 },
    { imageUrl: DIRECT_EPISODE_SCREENSHOT_WEBP, fromPos: '50% 10%', toPos: '50% 85%', fromScale: 1.02, toScale: 1.06 },
    { imageUrl: START_EPISODE_SCREENSHOT_WEBP, fromPos: '50% 15%', toPos: '50% 85%', fromScale: 1.02, toScale: 1.06 },
  ],
  'blueprint-board': [
    { imageUrl: START_BLUEPRINT_SCREENSHOT_WEBP, fromPos: '50% 20%', toPos: '50% 70%', fromScale: 1.02, toScale: 1.07 },
    { imageUrl: START_BLUEPRINT_SCREENSHOT_WEBP, fromPos: '30% 50%', toPos: '70% 50%', fromScale: 1.06, toScale: 1.02 },
    { imageUrl: DIRECT_BEATS_SCREENSHOT_WEBP, fromPos: '50% 4%', toPos: '50% 48%', fromScale: 1.02, toScale: 1.05 },
    { imageUrl: DIRECT_BEATS_SCREENSHOT_WEBP, fromPos: '50% 48%', toPos: '50% 94%', fromScale: 1.04, toScale: 1.07 },
    { imageUrl: BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP, fromPos: '30% 35%', toPos: '70% 65%', fromScale: 1.03, toScale: 1.08 },
    { imageUrl: BLUEPRINT_RESONANCE_SCREENSHOT_WEBP, fromPos: '50% 6%', toPos: '50% 88%', fromScale: 1.02, toScale: 1.06 },
    { imageUrl: GO_TO_PRODUCTION_SCREENSHOT_WEBP, fromPos: '50% 15%', toPos: '50% 80%', fromScale: 1.02, toScale: 1.07 },
  ],
  'production-stage': [
    { imageUrl: SCENE_WORKFLOW_SCREENSHOT_WEBP, fromPos: '30% 40%', toPos: '70% 60%', fromScale: 1.02, toScale: 1.07 },
    { imageUrl: PRODUCTION_SCRIPT_SCREENSHOT_WEBP, fromPos: '50% 15%', toPos: '50% 80%', fromScale: 1.03, toScale: 1.07 },
    { imageUrl: CONTINUITY_LIBRARY_SCREENSHOT_WEBP, fromPos: '25% 45%', toPos: '75% 55%', fromScale: 1.03, toScale: 1.08 },
    { imageUrl: SCENE_DIRECTOR_SCREENSHOT_WEBP, fromPos: '50% 10%', toPos: '50% 85%', fromScale: 1.02, toScale: 1.06 },
    { imageUrl: PRODUCTION_PLANNER_SCREENSHOT_WEBP, fromPos: '50% 8%', toPos: '50% 88%', fromScale: 1.02, toScale: 1.06 },
    { imageUrl: AUDIO_AGENT_SCREENSHOT_WEBP, fromPos: '30% 45%', toPos: '70% 55%', fromScale: 1.03, toScale: 1.08 },
    { imageUrl: STILLS_AGENT_SCREENSHOT_WEBP, fromPos: '30% 45%', toPos: '70% 55%', fromScale: 1.03, toScale: 1.08 },
    { imageUrl: PRE_VIS_ANIMATIC_SCREENSHOT_WEBP, fromPos: '40% 35%', toPos: '60% 65%', fromScale: 1.02, toScale: 1.08 },
    { imageUrl: CLIPS_AGENT_SCREENSHOT_WEBP, fromPos: '30% 45%', toPos: '70% 55%', fromScale: 1.03, toScale: 1.08 },
    { imageUrl: PRODUCTION_MIXER_SCREENSHOT_WEBP, fromPos: '50% 8%', toPos: '50% 88%', fromScale: 1.02, toScale: 1.06 },
    { imageUrl: PROMO_TRAILERS_SCREENSHOT_WEBP, fromPos: '50% 8%', toPos: '50% 88%', fromScale: 1.02, toScale: 1.06 },
    { imageUrl: PRODUCTION_AGENT_SCREENSHOT_WEBP, fromPos: '35% 40%', toPos: '65% 60%', fromScale: 1.02, toScale: 1.07 },
  ],
  'screening-room': [
    { imageUrl: SCREENING_PLAYER_SCREENSHOT_WEBP, fromPos: '40% 40%', toPos: '60% 60%', fromScale: 1.02, toScale: 1.07 },
    { imageUrl: SCREENING_PLAYER_SCREENSHOT_WEBP, fromPos: '25% 50%', toPos: '75% 50%', fromScale: 1.06, toScale: 1.02 },
    { imageUrl: STREAMS_MULTILANGUAGE_SCREENSHOT_WEBP, fromPos: '50% 15%', toPos: '50% 80%', fromScale: 1.03, toScale: 1.07 },
    { imageUrl: SCREENING_COLLAB_SCREENSHOT_WEBP, fromPos: '30% 45%', toPos: '70% 55%', fromScale: 1.03, toScale: 1.08 },
    { imageUrl: DIRECT_PUBLISHING_SCREENSHOT_WEBP, fromPos: '35% 40%', toPos: '65% 60%', fromScale: 1.02, toScale: 1.07 },
  ],
}

export type DoorWalkthroughLocaleCopy = {
  interimBadge: string
  narratedPreviewTag: string
  modeScreenVideo: string
  modePannedScreens: string
  beatsHeading: string
  beatPrefix: string
  closeLabel: string
  playLabel: string
  pauseLabel: string
  muteLabel: string
  unmuteLabel: string
  doorButtonHint: string
  rooms: Record<FeatureRoomId, string>
}

export const DOOR_WALKTHROUGH_COPY: Record<HeroDubLocaleId, DoorWalkthroughLocaleCopy> = {
  en: {
    interimBadge: '7-Language Narrated Tour · Live Shared Link Coming Soon',
    narratedPreviewTag: 'Narrated Walkthrough',
    modeScreenVideo: 'Narrated Video',
    modePannedScreens: 'Panned 5K Screens',
    beatsHeading: 'Voiceover Steps — Click any step to jump',
    beatPrefix: 'Beat',
    closeLabel: 'Close walkthrough',
    playLabel: 'Play narration',
    pauseLabel: 'Pause narration',
    muteLabel: 'Mute audio',
    unmuteLabel: 'Unmute audio',
    doorButtonHint: 'Watch 7-language narrated room walkthrough (live project link coming soon)',
    rooms: {
      'series-desk': 'Series Room',
      'blueprint-board': 'Blueprint Room',
      'production-stage': 'Production Stage',
      'screening-room': 'Screening Room',
    },
  },
  es: {
    interimBadge: 'Recorrido Narrado en 7 Idiomas · Enlace Compartido en Vivo Próximamente',
    narratedPreviewTag: 'Recorrido Narrado',
    modeScreenVideo: 'Video Narrado',
    modePannedScreens: 'Pantallas 5K en Paneo',
    beatsHeading: 'Pasos Narrados — Haz clic para saltar',
    beatPrefix: 'Paso',
    closeLabel: 'Cerrar recorrido',
    playLabel: 'Reproducir narración',
    pauseLabel: 'Pausar narración',
    muteLabel: 'Silenciar audio',
    unmuteLabel: 'Activar audio',
    doorButtonHint: 'Ver recorrido narrado en 7 idiomas (enlace compartido en vivo próximamente)',
    rooms: {
      'series-desk': 'Sala de Series',
      'blueprint-board': 'Sala Blueprint',
      'production-stage': 'Producción',
      'screening-room': 'Sala Proyección',
    },
  },
  pt: {
    interimBadge: 'Tour Narrado em 7 Idiomas · Link Compartilhado ao Vivo em Breve',
    narratedPreviewTag: 'Tour Narrado',
    modeScreenVideo: 'Vídeo Narrado',
    modePannedScreens: 'Telas 5K em Panorâmica',
    beatsHeading: 'Etapas Narradas — Clique para avançar',
    beatPrefix: 'Etapa',
    closeLabel: 'Fechar tour',
    playLabel: 'Reproduzir narração',
    pauseLabel: 'Pausar narração',
    muteLabel: 'Silenciar áudio',
    unmuteLabel: 'Ativar áudio',
    doorButtonHint: 'Assistir ao tour narrado em 7 idiomas (link ao vivo em breve)',
    rooms: {
      'series-desk': 'Sala de Séries',
      'blueprint-board': 'Sala Blueprint',
      'production-stage': 'Produção',
      'screening-room': 'Sala Exibição',
    },
  },
  hi: {
    interimBadge: '7 भाषाओं में वॉइसओवर टूर · लाइव शेयर लिंक जल्द आ रहा है',
    narratedPreviewTag: 'वॉइसओवर टूर',
    modeScreenVideo: 'नैरेटेड वीडियो',
    modePannedScreens: '5K पैन स्क्रीन',
    beatsHeading: 'वॉइसओवर चरण — किसी भी चरण पर जाने के लिए क्लिक करें',
    beatPrefix: 'चरण',
    closeLabel: 'टूर बंद करें',
    playLabel: 'नैरेशन चलाएँ',
    pauseLabel: 'नैरेशन रोकें',
    muteLabel: 'ऑडियो म्यूट करें',
    unmuteLabel: 'ऑडियो चालू करें',
    doorButtonHint: '7 भाषाओं में नैरेटेड स्टूडियो टूर देखें (लाइव लिंक जल्द आ रहा है)',
    rooms: {
      'series-desk': 'सीरीज़ रूम',
      'blueprint-board': 'ब्लूप्रिंट रूम',
      'production-stage': 'प्रोडक्शन स्टेज',
      'screening-room': 'स्क्रीनिंग रूम',
    },
  },
  zh: {
    interimBadge: '7 语种配音导览 · 实时共享项目链接即将上线',
    narratedPreviewTag: '配音导览',
    modeScreenVideo: '配音录屏导览',
    modePannedScreens: '5K 全景平移画面',
    beatsHeading: '配音解说节点 — 点击任意步骤跳转',
    beatPrefix: '节点',
    closeLabel: '关闭导览',
    playLabel: '播放解说',
    pauseLabel: '暂停解说',
    muteLabel: '静音',
    unmuteLabel: '开启声音',
    doorButtonHint: '观看 7 语种配音工作室导览（实时共享链接即将推出）',
    rooms: {
      'series-desk': '剧集室',
      'blueprint-board': '蓝图室',
      'production-stage': '制作舞台',
      'screening-room': '放映室',
    },
  },
  ar: {
    interimBadge: 'جولة صوتية بـ 7 لغات · رابط المشاركة المباشر قريباً',
    narratedPreviewTag: 'جولة صوتية',
    modeScreenVideo: 'فيديو مُعلَّق صوتياً',
    modePannedScreens: 'شاشات 5K متحركة',
    beatsHeading: 'خطوات التعليق الصوتي — انقر للانتقال الفوري',
    beatPrefix: 'خطوة',
    closeLabel: 'إغلاق الجولة',
    playLabel: 'تشغيل التعليق',
    pauseLabel: 'إيقاف مؤقت',
    muteLabel: 'كتم الصوت',
    unmuteLabel: 'تشغيل الصوت',
    doorButtonHint: 'شاهد الجولة الصوتية بـ 7 لغات (رابط المشروع المباشر قريباً)',
    rooms: {
      'series-desk': 'غرفة المسلسلات',
      'blueprint-board': 'غرفة المخطط',
      'production-stage': 'منصة الإنتاج',
      'screening-room': 'غرفة العرض',
    },
  },
  th: {
    interimBadge: 'ทัวร์พากย์เสียง 7 ภาษา · ลิงก์แชร์โปรเจกต์จริงเร็วๆ นี้',
    narratedPreviewTag: 'ทัวร์พากย์เสียง',
    modeScreenVideo: 'วิดีโอพากย์เสียง',
    modePannedScreens: 'ภาพหน้าจอ 5K แพนอัตโนมัติ',
    beatsHeading: 'ลำดับเสียงบรรยาย — คลิกเพื่อข้ามไปยังจุดที่ต้องการ',
    beatPrefix: 'ช่วงที่',
    closeLabel: 'ปิดหน้าต่างทัวร์',
    playLabel: 'เล่นเสียงบรรยาย',
    pauseLabel: 'หยุดชั่วคราว',
    muteLabel: 'ปิดเสียง',
    unmuteLabel: 'เปิดเสียง',
    doorButtonHint: 'ชมทัวร์ห้องสตูดิโอพากย์เสียง 7 ภาษา (ลิงก์แชร์จริงเร็วๆ นี้)',
    rooms: {
      'series-desk': 'ห้องซีรีส์',
      'blueprint-board': 'ห้องบลูพรินต์',
      'production-stage': 'สเตจโปรดักชัน',
      'screening-room': 'ห้องฉายภาพยนตร์',
    },
  },
}
