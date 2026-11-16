import type { FeaturePanLocaleId } from './keyFeatureNarratedPan'
import { KEY_FEATURE_ANIMATICS_MANIFEST } from './keyFeatureAnimaticsManifest'

export type KeyFeatureSuiteId =
  | 'series-room'
  | 'client-intake-portals'
  | 'blueprint-room'
  | 'continuity-selfie-studio'
  | 'shot-director-stage'
  | 'keyframes-clips-flowdirector'
  | 'mixer-streams-publishing'
  | 'screening-room-delivery'

export type KeyFeatureSuiteDefinition = {
  id: KeyFeatureSuiteId
  title: string
  featureIcons: readonly string[]
}

export const KEY_FEATURE_SUITES: readonly KeyFeatureSuiteDefinition[] = [
  {
    id: 'series-room',
    title: 'Series Room & Showrunner Bible',
    featureIcons: [
      'newSeries',
      'seriesReview',
      'seriesResonance',
      'seriesDirector',
      'directEpisode',
      'startEpisode',
    ],
  },
  {
    id: 'client-intake-portals',
    title: 'White-Label Client Intake, Blueprint Margin & Launchpad',
    featureIcons: ['clientIntake', 'blueprintShare', 'producerLaunchpad', 'budget'],
  },
  {
    id: 'blueprint-room',
    title: 'Blueprint Room, Beat Sheet & Multi-Age Cast',
    featureIcons: [
      'startBlueprint',
      'treatment',
      'castLocations',
      'blueprintDirector',
      'blueprintResonance',
      'goToProduction',
    ],
  },
  {
    id: 'continuity-selfie-studio',
    title: 'Selfie Studio, Continuity Vault, Audio & Score',
    featureIcons: ['selfieStudio', 'continuity', 'audioAgent', 'musicScore'],
  },
  {
    id: 'shot-director-stage',
    title: 'Fullscreen Scene Workflow, Shot Director & Stills Agent',
    featureIcons: [
      'sceneWorkflow',
      'directShot',
      'scriptResonance',
      'productionScript',
      'stillsAgent',
    ],
  },
  {
    id: 'keyframes-clips-flowdirector',
    title: 'Keyframes, Animatic, Omni 1.2 Clips, FlowDirector & Agents',
    featureIcons: [
      'stillsWorkbench',
      'animatic',
      'videoAgent',
      'clipsWorkbench',
      'scriptSupervisor',
      'productionAgent',
    ],
  },
  {
    id: 'mixer-streams-publishing',
    title: 'Broadcast Mixer, 70+ Language Streams & Stream Explorer',
    featureIcons: [
      'mixer',
      'languageStreams',
      'multilanguageUi',
      'promoTrailers',
      'streamsInventory',
    ],
  },
  {
    id: 'screening-room-delivery',
    title: 'Direct Publishing & Zero-Login Screening Room',
    featureIcons: ['shipPackage', 'screeningPlayer', 'screeningCollab'],
  },
] as const

export type FeatureAnimaticChapterTiming = {
  startSec: number
  endSec: number
  beatStartsSec: readonly number[]
}

export type FeatureAnimaticSuiteManifest = {
  suiteId: KeyFeatureSuiteId
  locales: Record<
    FeaturePanLocaleId,
    {
      totalDurationSec: number
      chapters: Record<string, FeatureAnimaticChapterTiming>
    }
  >
}

export type FeatureAnimaticUiCopy = {
  playLabel: string
  pauseLabel: string
  hearNarrationLabel: string
  muteLabel: string
  restartLabel: string
  enterFullscreenLabel: string
  exitFullscreenLabel: string
  beatPrefix: string
  languagePickerTitle: string
  animaticBadge: string
}

export const FEATURE_ANIMATIC_UI_COPY: Record<FeaturePanLocaleId, FeatureAnimaticUiCopy> = {
  en: {
    playLabel: 'Play feature animatic',
    pauseLabel: 'Pause feature animatic',
    hearNarrationLabel: 'Unmute studio narration',
    muteLabel: 'Mute studio narration',
    restartLabel: 'Replay feature animatic from start',
    enterFullscreenLabel: 'View fullscreen',
    exitFullscreenLabel: 'Exit fullscreen',
    beatPrefix: 'Part',
    languagePickerTitle: 'Select studio narration language (7 languages)',
    animaticBadge: 'Narrated Studio Animatic',
  },
  es: {
    playLabel: 'Reproducir animatic de función',
    pauseLabel: 'Pausar animatic de función',
    hearNarrationLabel: 'Activar narración de estudio',
    muteLabel: 'Silenciar narración de estudio',
    restartLabel: 'Repetir animatic desde el inicio',
    enterFullscreenLabel: 'Pantalla completa',
    exitFullscreenLabel: 'Salir de pantalla completa',
    beatPrefix: 'Parte',
    languagePickerTitle: 'Elegir idioma de narración (7 idiomas)',
    animaticBadge: 'Animatic Narrado de Estudio',
  },
  pt: {
    playLabel: 'Reproduzir animatic do recurso',
    pauseLabel: 'Pausar animatic do recurso',
    hearNarrationLabel: 'Ativar narração de estúdio',
    muteLabel: 'Silenciar narração de estúdio',
    restartLabel: 'Repetir animatic do início',
    enterFullscreenLabel: 'Tela cheia',
    exitFullscreenLabel: 'Sair da tela cheia',
    beatPrefix: 'Parte',
    languagePickerTitle: 'Selecionar idioma da narração (7 idiomas)',
    animaticBadge: 'Animatic Narrado de Estúdio',
  },
  hi: {
    playLabel: 'फ़ीचर एनिमैटिक चलाएँ',
    pauseLabel: 'फ़ीचर एनिमैटिक रोकें',
    hearNarrationLabel: 'स्टूडियो नैरेशन सुनें',
    muteLabel: 'स्टूडियो नैरेशन म्यूट करें',
    restartLabel: 'शुरू से दोबारा चलाएँ',
    enterFullscreenLabel: 'फ़ुलस्क्रीन देखें',
    exitFullscreenLabel: 'फ़ुलस्क्रीन बंद करें',
    beatPrefix: 'भाग',
    languagePickerTitle: 'स्टूडियो नैरेशन भाषा चुनें (7 भाषाएँ)',
    animaticBadge: 'नैरेटेड स्टूडियो एनिमैटिक',
  },
  zh: {
    playLabel: '播放功能动态分镜',
    pauseLabel: '暂停功能动态分镜',
    hearNarrationLabel: '开启演播室语音解说',
    muteLabel: '静音演播室解说',
    restartLabel: '从头重播本功能演示',
    enterFullscreenLabel: '全屏观看',
    exitFullscreenLabel: '退出全屏',
    beatPrefix: '段落',
    languagePickerTitle: '选择演播室配音语言（支持7种语言）',
    animaticBadge: '演播室配音动态演示',
  },
  ar: {
    playLabel: 'تشغيل العرض التوضيحي للميزة',
    pauseLabel: 'إيقاف العرض التوضيحي مؤقتاً',
    hearNarrationLabel: 'تفعيل التعليق الصوتي للاستوديو',
    muteLabel: 'كتم التعليق الصوتي للاستوديو',
    restartLabel: 'إعادة تشغيل الميزة من البداية',
    enterFullscreenLabel: 'ملء الشاشة',
    exitFullscreenLabel: 'إنهاء ملء الشاشة',
    beatPrefix: 'جزء',
    languagePickerTitle: 'اختر لغة التعليق الصوتي (7 لغات)',
    animaticBadge: 'عرض استوديو مروي',
  },
  th: {
    playLabel: 'เล่นวิดีโอแนะนำฟีเจอร์',
    pauseLabel: 'หยุดวิดีโอชั่วคราว',
    hearNarrationLabel: 'เปิดเสียงบรรยายสตูดิโอ',
    muteLabel: 'ปิดเสียงบรรยายสตูดิโอ',
    restartLabel: 'เล่นซ้ำตั้งแต่ต้น',
    enterFullscreenLabel: 'ดูแบบเต็มจอ',
    exitFullscreenLabel: 'ออกจากโหมดเต็มจอ',
    beatPrefix: 'ช่วงที่',
    languagePickerTitle: 'เลือกภาษาเสียงบรรยายสตูดิโอ (7 ภาษา)',
    animaticBadge: 'วิดีโอแนะนำฟีเจอร์พร้อมเสียงบรรยาย',
  },
}

const ICON_TO_SUITE_LOOKUP: ReadonlyMap<
  string,
  { suiteId: KeyFeatureSuiteId; chapterIndex: number }
> = (() => {
  const map = new Map<string, { suiteId: KeyFeatureSuiteId; chapterIndex: number }>()
  for (const suite of KEY_FEATURE_SUITES) {
    suite.featureIcons.forEach((icon, idx) => {
      map.set(icon, { suiteId: suite.id, chapterIndex: idx })
    })
  }
  return map
})()

export function getKeyFeatureSuiteForIcon(
  featureIcon?: string | null
): { suiteId: KeyFeatureSuiteId; chapterIndex: number } | null {
  if (!featureIcon) return null
  return ICON_TO_SUITE_LOOKUP.get(featureIcon) ?? null
}

export function getKeyFeatureAnimaticWebmPath(
  suiteId: KeyFeatureSuiteId,
  locale: FeaturePanLocaleId
): string {
  return `/landing/key-features/animatics/${suiteId}-${locale}.webm`
}

export function getKeyFeatureAnimaticMp4Path(
  suiteId: KeyFeatureSuiteId,
  locale: FeaturePanLocaleId
): string {
  return `/landing/key-features/animatics/${suiteId}-${locale}.mp4`
}

export function getKeyFeatureAnimaticPosterPath(suiteId: KeyFeatureSuiteId): string {
  return `/landing/key-features/animatics/${suiteId}-poster.webp`
}

export function getKeyFeatureChapterTiming(
  featureIcon: string | undefined | null,
  locale: FeaturePanLocaleId
): {
  suiteId: KeyFeatureSuiteId
  chapterIndex: number
  totalSuiteDurationSec: number
  timing: FeatureAnimaticChapterTiming
} | null {
  if (!featureIcon) return null
  const found = getKeyFeatureSuiteForIcon(featureIcon)
  if (!found) return null
  const suiteManifest = KEY_FEATURE_ANIMATICS_MANIFEST[found.suiteId]
  const locManifest = suiteManifest?.locales?.[locale] ?? suiteManifest?.locales?.en
  const timing = locManifest?.chapters?.[featureIcon]
  if (!locManifest || !timing) return null
  return {
    suiteId: found.suiteId,
    chapterIndex: found.chapterIndex,
    totalSuiteDurationSec: locManifest.totalDurationSec,
    timing,
  }
}
