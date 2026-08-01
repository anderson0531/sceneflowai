import type { ProductionLanguage } from '@/lib/types/finalCut'

export interface LocalePublishMetadata {
  title: string
  description: string
  tags: string[]
  thumbnailUrl?: string
}

export interface PremiereDistributionMetadata {
  locales: Partial<Record<ProductionLanguage, LocalePublishMetadata>>
  defaultLocale: ProductionLanguage
  includeSceneFlowCta?: boolean
  updatedAt?: string
}

export const SCENEFLOW_CTA: Record<string, string> = {
  en: '\n\n---\nCreated with SceneFlow AI — turn ideas into publish-ready video. Try free at sceneflow.ai',
  es: '\n\n---\nCreado con SceneFlow AI — convierte ideas en video listo para publicar. Prueba gratis en sceneflow.ai',
  fr: '\n\n---\nCréé avec SceneFlow AI — transformez vos idées en vidéos prêtes à publier. Essayez gratuitement sur sceneflow.ai',
  de: '\n\n---\nErstellt mit SceneFlow AI — verwandeln Sie Ideen in veröffentlichungsfertige Videos. Kostenlos testen auf sceneflow.ai',
  pt: '\n\n---\nCriado com SceneFlow AI — transforme ideias em vídeo pronto para publicar. Experimente grátis em sceneflow.ai',
  hi: '\n\n---\nSceneFlow AI के साथ बनाया गया — विचारों को प्रकाशन-तैयार वीडियो में बदलें। sceneflow.ai पर मुफ्त आज़माएँ',
  zh: '\n\n---\n由 SceneFlow AI 创建 — 将创意转化为可发布的视频。在 sceneflow.ai 免费试用',
  ar: '\n\n---\nتم إنشاؤه بواسطة SceneFlow AI — حوّل الأفكار إلى فيديو جاهز للنشر. جرّب مجاناً على sceneflow.ai',
  th: '\n\n---\nสร้างด้วย SceneFlow AI — เปลี่ยนไอเดียเป็นวิดีโอพร้อมเผยแพร่ ทดลองใช้ฟรีที่ sceneflow.ai',
}

export function appendSceneFlowCta(description: string, locale: string, include = true): string {
  if (!include) return description
  const cta = SCENEFLOW_CTA[locale] || SCENEFLOW_CTA.en
  if (description.includes('sceneflow.ai')) return description
  return `${description.trim()}${cta}`
}

export function readPremiereDistribution(metadata: unknown): PremiereDistributionMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null
  const raw = (metadata as { premiereDistribution?: PremiereDistributionMetadata }).premiereDistribution
  if (!raw || typeof raw !== 'object') return null
  return raw
}
