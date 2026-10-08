/**
 * The cut a person can watch before the cloud stitch.
 * A clip plays when one exists. A still holds. A bare shot shows its label.
 */

export type PromoPreviewKind = 'clip' | 'still' | 'label'

export interface PromoPreviewShot {
  key: string
  kind: PromoPreviewKind
  durationSec: number
  label?: string
  videoUrl?: string
  imageUrl?: string
}

export function promoPreviewDurationSec(durationSec: number | undefined, fallback = 5): number {
  if (typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec > 0) {
    return durationSec
  }
  return fallback
}

export function buildPromoPreviewSequence(
  shots: Array<{
    key: string
    label?: string
    durationSec?: number
    videoUrl?: string
    imageUrl?: string
  }>
): PromoPreviewShot[] {
  return shots.map((shot) => {
    const durationSec = promoPreviewDurationSec(shot.durationSec)
    const label = shot.label?.trim() || undefined
    const videoUrl = shot.videoUrl?.trim()
    const imageUrl = shot.imageUrl?.trim()
    if (videoUrl) {
      return { key: shot.key, kind: 'clip', durationSec, label, videoUrl }
    }
    if (imageUrl) {
      return { key: shot.key, kind: 'still', durationSec, label, imageUrl }
    }
    return { key: shot.key, kind: 'label', durationSec, label }
  })
}
