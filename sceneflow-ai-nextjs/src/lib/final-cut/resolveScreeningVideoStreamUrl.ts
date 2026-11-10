import type {
  FinalCutSelection,
  FinalCutSceneOverride,
  ProductionLanguage,
} from '@/lib/types/finalCut'
import { resolveSceneStreamUrl } from '@/lib/final-cut/resolveSegmentMedia'
import { isPromoCinematicScene } from '@/lib/publish/buildPromoScene'

function screeningOverrideForLanguage(
  sceneId: string,
  language: string,
  finalCut?: FinalCutSelection | null
): Record<string, FinalCutSceneOverride> | undefined {
  const raw = finalCut?.perSceneOverrides?.[sceneId]
  if (!raw || raw.streamType !== 'video') return undefined
  if (raw.language && raw.language !== language) return undefined
  return { [sceneId]: raw }
}

/**
 * Resolve the video stream URL for Screening Room preview playback.
 * Honors metadata.finalCut per-scene version pins; falls back to latest complete video.
 */
export function resolveScreeningVideoStreamUrl(
  sceneId: string,
  sceneProductionState: Record<string, unknown>,
  language: string,
  finalCut?: FinalCutSelection | null
): string | null {
  const selection = {
    format: 'full-video' as const,
    language,
    perSceneOverrides: screeningOverrideForLanguage(sceneId, language, finalCut),
  }
  const videoUrl = resolveSceneStreamUrl(sceneProductionState, sceneId, selection).url
  if (videoUrl) return videoUrl
  return resolveSceneStreamUrl(sceneProductionState, sceneId, {
    format: 'animatic',
    language: language as ProductionLanguage,
  }).url
}

export interface ResolvePromoScreeningVideoOptions {
  scenes?: unknown[] | null
  sceneProductionState?: Record<string, unknown> | null
  language?: string | null
  finalCut?: FinalCutSelection | null
  activePromoId?: string | null
  fallbackPromoTrailerUrl?: string | null
}

interface PromoStreamRowLike {
  id?: string
  streamType?: string
  language?: string
  streamVersion?: number
  mp4Url?: string | null
  status?: string
  completedAt?: string
  createdAt?: string
}

function readNonDeletedReadyPromoStreams(
  prodScene: Record<string, unknown> | undefined
): PromoStreamRowLike[] {
  if (!prodScene) return []
  const list = prodScene.productionStreams
  if (!Array.isArray(list)) return []
  const deletedRaw = prodScene.deletedStreamIds
  const deletedIds = new Set(
    Array.isArray(deletedRaw)
      ? deletedRaw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : []
  )
  return (list as PromoStreamRowLike[]).filter((row) => {
    if (!row || (row.id && deletedIds.has(row.id))) return false
    const url = typeof row.mp4Url === 'string' ? row.mp4Url.trim() : ''
    if (!url) return false
    return !row.status || row.status === 'complete' || row.status === 'ready'
  })
}

function promoStreamTimestampMs(row: PromoStreamRowLike | undefined): number {
  if (!row) return 0
  const raw = row.completedAt || row.createdAt
  if (typeof raw !== 'string' || !raw.trim()) return 0
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function pickLatestPromoStream(list: PromoStreamRowLike[]): PromoStreamRowLike | undefined {
  if (list.length === 0) return undefined
  return list.reduce((best, cur) => {
    const bt = promoStreamTimestampMs(best)
    const ct = promoStreamTimestampMs(cur)
    if (bt > 0 && ct > 0 && bt !== ct) {
      return ct > bt ? cur : best
    }
    const bv = Number(best?.streamVersion) || 1
    const cv = Number(cur?.streamVersion) || 1
    return cv >= bv ? cur : best
  }, list[0])
}

/**
 * Resolve the Promo video URL for Screening Room Promo playback.
 * Prioritizes designated/rendered stream versions on the Promo scene in `sceneProductionState`
 * (`metadata.finalCut.perSceneOverrides`, `currentStreamId`, `productionStreams`, `renderedSceneUrl`),
 * falling back to legacy `fallbackPromoTrailerUrl` only when no Promo scene stream exists.
 */
export function resolvePromoScreeningVideoUrl(
  options: ResolvePromoScreeningVideoOptions
): string | null {
  const {
    scenes,
    sceneProductionState,
    language,
    finalCut,
    activePromoId,
    fallbackPromoTrailerUrl,
  } = options
  const targetLang = typeof language === 'string' && language.trim() ? language.trim() : 'en'
  const prodState =
    sceneProductionState && typeof sceneProductionState === 'object'
      ? sceneProductionState
      : {}
  const overrides = finalCut?.perSceneOverrides ?? {}

  interface PromoCandidate {
    candidateIds: string[]
    sceneObj?: Record<string, unknown>
    hasOverride: boolean
    matchesActivePromo: boolean
    hasCurrentStreamId: boolean
  }

  const candidates: PromoCandidate[] = []
  const seenIds = new Set<string>()

  if (Array.isArray(scenes)) {
    scenes.forEach((rawScene, idx) => {
      if (!isPromoCinematicScene(rawScene)) return
      const sceneObj = rawScene as Record<string, unknown>
      const ids = Array.from(
        new Set(
          [sceneObj.sceneId, sceneObj.id, sceneObj.promoId, `scene-${idx}`]
            .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
            .map((v) => v.trim())
        )
      )
      ids.forEach((id) => seenIds.add(id))
      const hasOverride = ids.some((id) => Boolean(overrides[id]))
      const matchesActivePromo = Boolean(
        activePromoId?.trim() && ids.includes(activePromoId.trim())
      )
      const hasCurrentStreamId = ids.some((id) => {
        const p = prodState[id] as Record<string, unknown> | undefined
        return typeof p?.currentStreamId === 'string' && p.currentStreamId.trim().length > 0
      })
      candidates.push({
        candidateIds: ids,
        sceneObj,
        hasOverride,
        matchesActivePromo,
        hasCurrentStreamId,
      })
    })
  }

  // Also check any promo-* keys in sceneProductionState or finalCut.perSceneOverrides not already covered
  const extraPromoKeys = Array.from(
    new Set([...Object.keys(prodState), ...Object.keys(overrides)])
  ).filter((key) => /^promo\b/i.test(key.trim()) && !seenIds.has(key.trim()))

  for (const key of extraPromoKeys) {
    const trimmed = key.trim()
    const p = prodState[trimmed] as Record<string, unknown> | undefined
    candidates.push({
      candidateIds: [trimmed],
      hasOverride: Boolean(overrides[trimmed]),
      matchesActivePromo: Boolean(activePromoId?.trim() && activePromoId.trim() === trimmed),
      hasCurrentStreamId: Boolean(
        typeof p?.currentStreamId === 'string' && p.currentStreamId.trim().length > 0
      ),
    })
  }

  // Prioritize: 1) explicit finalCut override, 2) activePromoId match, 3) currentStreamId set
  const orderedCandidates = [...candidates].sort((a, b) => {
    if (a.hasOverride !== b.hasOverride) return a.hasOverride ? -1 : 1
    if (a.matchesActivePromo !== b.matchesActivePromo) return a.matchesActivePromo ? -1 : 1
    if (a.hasCurrentStreamId !== b.hasCurrentStreamId) return a.hasCurrentStreamId ? -1 : 1
    return 0
  })

  for (const candidate of orderedCandidates) {
    const prodKey = candidate.candidateIds.find(
      (id) => prodState[id] && typeof prodState[id] === 'object'
    )
    const prod = prodKey ? (prodState[prodKey] as Record<string, unknown>) : undefined
    const rawOverride = candidate.candidateIds
      .map((id) => overrides[id])
      .find((ov): ov is FinalCutSceneOverride => Boolean(ov))

    if (prodKey && prod) {
      const normalizedFinalCut: FinalCutSelection | null = rawOverride
        ? {
            format: rawOverride.streamType === 'animatic' ? 'animatic' : 'full-video',
            language: (rawOverride.language || targetLang) as ProductionLanguage,
            perSceneOverrides: { [prodKey]: rawOverride },
          }
        : finalCut ?? null

      // 1. If an explicit per-scene override is designated on the promo scene:
      if (rawOverride) {
        if (!rawOverride.language || rawOverride.language === targetLang) {
          const byTargetLang = resolveScreeningVideoStreamUrl(
            prodKey,
            prodState,
            targetLang,
            normalizedFinalCut
          )
          if (byTargetLang) return byTargetLang
        }
        if (rawOverride.language) {
          const byOverrideLang = resolveScreeningVideoStreamUrl(
            prodKey,
            prodState,
            rawOverride.language,
            normalizedFinalCut
          )
          if (byOverrideLang) return byOverrideLang
        }
      }

      // 2. Try resolving for the active language (honors currentStreamId or latest video stream in targetLang):
      const byLang = resolveScreeningVideoStreamUrl(
        prodKey,
        prodState,
        targetLang,
        normalizedFinalCut
      )
      if (byLang) return byLang

      // 3. Check if currentStreamId points to a ready stream on the promo scene:
      const readyRows = readNonDeletedReadyPromoStreams(prod)
      const currentStreamId =
        typeof prod.currentStreamId === 'string' ? prod.currentStreamId.trim() : ''
      if (currentStreamId) {
        const pinned = readyRows.find((r) => r.id === currentStreamId)
        if (pinned?.mp4Url?.trim()) {
          return pinned.mp4Url.trim()
        }
      }

      // 4. Fallback to English or latest ready video/animatic stream on the promo scene:
      if (targetLang !== 'en') {
        const byEn = resolveScreeningVideoStreamUrl(prodKey, prodState, 'en', normalizedFinalCut)
        if (byEn) return byEn
      }
      if (readyRows.length > 0) {
        const videoRows = readyRows.filter((r) => !r.streamType || r.streamType === 'video')
        const best = pickLatestPromoStream(videoRows.length > 0 ? videoRows : readyRows)
        if (best?.mp4Url?.trim()) {
          return best.mp4Url.trim()
        }
      }

      // 5. Fallback to renderedSceneUrl on the promo scene production state (when no streams were deleted):
      const deletedRaw = prod.deletedStreamIds
      const hasDeleted = Array.isArray(deletedRaw) && deletedRaw.length > 0
      const renderedSceneUrl =
        typeof prod.renderedSceneUrl === 'string' ? prod.renderedSceneUrl.trim() : ''
      if (!hasDeleted && renderedSceneUrl) {
        return renderedSceneUrl
      }
    }

    const sceneRenderedUrl =
      typeof candidate.sceneObj?.renderedSceneUrl === 'string'
        ? candidate.sceneObj.renderedSceneUrl.trim()
        : ''
    if (sceneRenderedUrl) {
      return sceneRenderedUrl
    }
  }

  return typeof fallbackPromoTrailerUrl === 'string' && fallbackPromoTrailerUrl.trim()
    ? fallbackPromoTrailerUrl.trim()
    : null
}
