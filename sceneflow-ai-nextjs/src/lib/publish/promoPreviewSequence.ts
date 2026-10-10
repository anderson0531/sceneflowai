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
  /** Dialogue and narration duck the music bed in the in-tab preview. */
  beatKind?: string
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
    beatKind?: string
  }>
): PromoPreviewShot[] {
  return shots.map((shot) => {
    const durationSec = promoPreviewDurationSec(shot.durationSec)
    const label = shot.label?.trim() || undefined
    const videoUrl = shot.videoUrl?.trim()
    const imageUrl = shot.imageUrl?.trim()
    const beatKind = shot.beatKind?.trim() || undefined
    const spoken = beatKind ? { beatKind } : {}
    if (videoUrl) {
      return { key: shot.key, kind: 'clip' as const, durationSec, label, videoUrl, ...spoken }
    }
    if (imageUrl) {
      return { key: shot.key, kind: 'still' as const, durationSec, label, imageUrl, ...spoken }
    }
    return { key: shot.key, kind: 'label' as const, durationSec, label, ...spoken }
  })
}
