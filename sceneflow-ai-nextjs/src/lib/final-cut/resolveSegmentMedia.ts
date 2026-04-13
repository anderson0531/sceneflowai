import type { StreamSegment } from '@/lib/types/finalCut'

/** Resolve production segment row from project metadata (Final Cut segments may omit assetUrl). */
export function pickProductionSegment(
  sceneProductionState: Record<string, unknown>,
  sourceSceneId: string,
  seg: StreamSegment
): Record<string, unknown> | null {
  const pd = sceneProductionState[sourceSceneId] as { segments?: unknown } | undefined
  const list = Array.isArray(pd?.segments) ? (pd!.segments as Record<string, unknown>[]) : []
  if (list.length === 0) return null
  if (seg.sourceSegmentId) {
    const hit = list.find((s) => s.segmentId === seg.sourceSegmentId)
    if (hit) return hit
  }
  const byId = list.find((s) => s.segmentId === seg.id)
  if (byId) return byId
  return list[seg.sequenceIndex] ?? null
}

export function mediaUrlFromProductionSegment(prodSeg: Record<string, unknown> | null): string {
  if (!prodSeg) return ''
  const takes = Array.isArray(prodSeg.takes) ? (prodSeg.takes as Record<string, unknown>[]) : []
  const lastTake = takes.length ? takes[takes.length - 1] : null
  const fromTake =
    (typeof lastTake?.videoUrl === 'string' && lastTake.videoUrl.trim()) ||
    (typeof lastTake?.assetUrl === 'string' && lastTake.assetUrl.trim()) ||
    ''
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const refs = prodSeg.references as Record<string, unknown> | undefined
  return (
    s(prodSeg.activeAssetUrl) ||
    fromTake ||
    s(refs?.endFrameUrl) ||
    s(refs?.startFrameUrl) ||
    s(prodSeg.visualFrame)
  )
}

export function refineAssetTypeFromUrl(url: string, assetType: 'video' | 'image'): 'video' | 'image' {
  const path = url.split('?')[0].toLowerCase()
  if (/\.(mp4|webm|mov|m4v|mkv)$/.test(path)) return 'video'
  if (/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(path)) return 'image'
  return assetType
}

export function resolveStreamSegmentMediaForExport(
  seg: StreamSegment,
  sourceSceneId: string,
  sceneProductionState: Record<string, unknown>
): { assetUrl: string; assetType: 'video' | 'image' } | null {
  let url = (seg.assetUrl || '').trim()
  let assetType: 'video' | 'image' = seg.assetType === 'video' ? 'video' : 'image'

  if (!url) {
    const prodSeg = pickProductionSegment(sceneProductionState, sourceSceneId, seg)
    const resolved = mediaUrlFromProductionSegment(prodSeg)
    if (!resolved) return null
    url = resolved
    const at = prodSeg?.assetType
    if (at === 'video' || at === 'image') assetType = at
  }

  return { assetUrl: url, assetType: refineAssetTypeFromUrl(url, assetType) }
}
