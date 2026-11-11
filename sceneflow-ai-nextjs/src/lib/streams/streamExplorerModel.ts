import { resolvePromoScreeningVideoUrl } from '@/lib/final-cut/resolveScreeningVideoStreamUrl'
import { readFinalCutSelection } from '@/hooks/final-cut/useFinalCutSelection'
import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import { promoAssetForLanguage } from '@/lib/publish/promoLanguage'
import { getPublishingState } from '@/lib/publish/publishingState'
import {
  collectPublishPreVisScenes,
  collectPublishScenes,
  listPublishChapters,
  publishUnitId,
  type PublishUnitKind,
  type PublishUnitRecord,
} from '@/lib/publish/publishUnits'
import type { ProjectStream } from '@/lib/streams/projectStreams'
import type {
  ProductionStream,
  SceneProductionData,
} from '@/components/vision/scene-production/types'
import type { PreVisMasterAsset, PromoTrailerAsset } from '@/types/publishingAssets'

export type StreamDeliverableStatus = 'published' | 'ready' | 'stitchable' | 'draft'
export type StreamDeliverableFormat = 'video' | 'animatic' | 'mixed'

export interface StreamVersionVariant {
  id: string
  version: number
  streamType: 'video' | 'animatic'
  mp4Url: string
  durationSec?: number
  resolution?: string
  completedAt?: string
  displayName?: string
}

export interface PublishedPlatformLink {
  platform: 'youtube' | 'facebook' | 'tiktok'
  url: string
}

export interface StreamDeliverableItem {
  uid: string
  kind: PublishUnitKind
  language: string
  languageLabel: string
  title: string
  subtitle: string
  format: StreamDeliverableFormat
  version: number
  totalVersions: number
  isLatestVersion: boolean
  versionVariants: StreamVersionVariant[]
  status: StreamDeliverableStatus
  canPublish: boolean
  mp4Url?: string
  durationSec?: number
  resolution?: string
  aspectRatio?: '16:9' | '9:16'
  updatedAt?: string
  sceneId?: string
  sceneNumber?: number
  beatIndex?: number
  promoId?: string
  publishedLinks: PublishedPlatformLink[]
}

export interface LanguageInventorySummary {
  code: string
  label: string
  readyCount: number
  publishedCount: number
  totalCount: number
}

export interface StreamsDashboardSummary {
  languageCount: number
  languages: LanguageInventorySummary[]
  totalReadyAssets: number
  totalPublishedAssets: number
  previs: {
    stitchedReady: number
    stitchableCount: number
    totalLanguages: number
    sceneRendersReady: number
  }
  masters: {
    ready: number
    totalLanguages: number
  }
  promos: {
    ready: number
    campaignsCount: number
  }
  chapters: {
    ready: number
    total: number
  }
  scenes: {
    ready: number
    total: number
    totalVersionTakes: number
    maxVersion: number
    availableVersions: number[]
  }
}

export type StreamStatusFilter = 'all' | 'ready' | 'published' | 'draft'
export type StreamFormatFilter = 'all' | 'video' | 'animatic'
export type StreamVersionFilter = 'latest' | 'all' | number

export interface StreamExplorerFilters {
  search: string
  type: 'all' | PublishUnitKind
  language: 'all' | string
  status: StreamStatusFilter
  format: StreamFormatFilter
  version: StreamVersionFilter
}

export const DEFAULT_STREAM_EXPLORER_FILTERS: StreamExplorerFilters = {
  search: '',
  type: 'all',
  language: 'all',
  status: 'all',
  format: 'all',
  version: 'latest',
}

export function hasActiveStreamFilters(filters: StreamExplorerFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.type !== 'all' ||
    filters.language !== 'all' ||
    filters.status !== 'all' ||
    filters.format !== 'all' ||
    filters.version !== 'latest'
  )
}

export function formatDurationBadge(seconds?: number): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null
  const rounded = Math.round(seconds)
  const mins = Math.floor(rounded / 60)
  const secs = rounded % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function isStreamComplete(stream: ProductionStream): boolean {
  return (stream.status === 'complete' || String(stream.status) === 'ready') && Boolean(stream.mp4Url)
}

function extractPublishedLinks(
  units: PublishUnitRecord[] | undefined,
  kind: PublishUnitKind,
  language: string,
  sceneId?: string,
  beatIndex?: number,
  fallbackYoutubeUrl?: string
): PublishedPlatformLink[] {
  const links: PublishedPlatformLink[] = []
  const seen = new Set<string>()
  const id16 = publishUnitId(kind, '16:9', language, sceneId, beatIndex)
  const id9 = publishUnitId(kind, '9:16', language, sceneId, beatIndex)

  for (const unit of units || []) {
    if (unit.id !== id16 && unit.id !== id9) continue
    const dests = unit.destinations || {}
    for (const platform of ['youtube', 'facebook', 'tiktok'] as const) {
      const entry = dests[platform]
      if (entry?.status === 'published' && entry.url && !seen.has(`${platform}:${entry.url}`)) {
        seen.add(`${platform}:${entry.url}`)
        links.push({ platform, url: entry.url })
      }
    }
  }

  if (fallbackYoutubeUrl && !seen.has(`youtube:${fallbackYoutubeUrl}`)) {
    links.push({ platform: 'youtube', url: fallbackYoutubeUrl })
  }

  return links
}

export interface BuildStreamInventoryArgs {
  streams: ProjectStream[]
  projectScenes: Array<Record<string, unknown>>
  sceneProductionState: Record<string, SceneProductionData>
  metadata: unknown
  coverageByLanguage?: Record<string, { ready: number; total: number }>
}

export function buildStreamInventory({
  streams,
  projectScenes,
  sceneProductionState,
  metadata,
  coverageByLanguage = {},
}: BuildStreamInventoryArgs): {
  items: StreamDeliverableItem[]
  summary: StreamsDashboardSummary
} {
  const publishingState = getPublishingState(metadata)
  const finalCut = readFinalCutSelection(metadata)
  const items: StreamDeliverableItem[] = []

  const allVersionsSet = new Set<number>([1])
  let totalSceneVersionTakes = 0
  let totalPreVisSceneRenders = 0

  for (const stream of streams) {
    const lang = stream.language
    const langLabel = getLanguageDisplayName(lang)
    const previsMaster: PreVisMasterAsset | undefined = publishingState.previsByLanguage?.[lang]

    const publishScenes = collectPublishScenes(projectScenes, sceneProductionState as never, lang)
    const previsScenes = collectPublishPreVisScenes(projectScenes, sceneProductionState as never, lang)

    const readyPreVisScenesCount = previsScenes.filter((s) => Boolean(s.mp4Url)).length
    totalPreVisSceneRenders += readyPreVisScenesCount

    // 1. Stitched Pre-Vis deliverable
    const stitchedPreVisUrl =
      previsMaster?.mp4Url ||
      (stream.format === 'animatic' && stream.mp4Url ? stream.mp4Url : undefined)
    const previsCanStitch =
      !stitchedPreVisUrl &&
      (readyPreVisScenesCount >= 2 ||
        (previsScenes.length === 1 && readyPreVisScenesCount === 1))
    const previsLinks = extractPublishedLinks(publishingState.units, 'previs', lang)
    const previsStatus: StreamDeliverableStatus =
      previsLinks.length > 0 && (stitchedPreVisUrl || previsCanStitch)
        ? 'published'
        : stitchedPreVisUrl
          ? 'ready'
          : previsCanStitch
            ? 'stitchable'
            : 'draft'

    items.push({
      uid: `${lang}:previs`,
      kind: 'previs',
      language: lang,
      languageLabel: langLabel,
      title: 'Pre-Vis (Stitched)',
      subtitle: stitchedPreVisUrl
        ? `Combined Pre-Vis MP4 · ${previsMaster?.sceneCount || readyPreVisScenesCount || projectScenes.length} scenes`
        : previsCanStitch
          ? `${readyPreVisScenesCount}/${previsScenes.length} scenes ready · 1-click stitch & publish`
          : `${readyPreVisScenesCount}/${previsScenes.length} Pre-Vis scenes rendered`,
      format: 'animatic',
      version: 1,
      totalVersions: 1,
      isLatestVersion: true,
      versionVariants: [],
      status: previsStatus,
      canPublish: Boolean(stitchedPreVisUrl || previsCanStitch),
      mp4Url: stitchedPreVisUrl,
      durationSec: previsMaster?.durationSec,
      resolution: previsMaster?.resolution || '720p',
      aspectRatio: '16:9',
      updatedAt: previsMaster?.renderedAt || (stream.format === 'animatic' ? stream.renderedAt : undefined),
      publishedLinks: previsLinks,
    })

    // 2. Master deliverable
    const masterVideoUrl =
      stream.format !== 'animatic' && stream.mp4Url ? stream.mp4Url : undefined
    const cov = coverageByLanguage[lang]
    const masterLinks = extractPublishedLinks(
      publishingState.units,
      'master',
      lang,
      undefined,
      undefined,
      stream.publish?.youtubeUrl
    )
    const masterStatus: StreamDeliverableStatus =
      masterLinks.length > 0 && masterVideoUrl
        ? 'published'
        : masterVideoUrl
          ? 'ready'
          : 'draft'

    items.push({
      uid: `${lang}:master`,
      kind: 'master',
      language: lang,
      languageLabel: langLabel,
      title: 'Master',
      subtitle: masterVideoUrl
        ? `Final ${langLabel} Master MP4`
        : cov
          ? `${cov.ready}/${cov.total} scenes ready for Master assembly`
          : 'Assemble & render Master stream',
      format: stream.format === 'animatic' ? 'animatic' : 'video',
      version: 1,
      totalVersions: 1,
      isLatestVersion: true,
      versionVariants: [],
      status: masterStatus,
      canPublish: Boolean(masterVideoUrl),
      mp4Url: masterVideoUrl,
      aspectRatio: '16:9',
      updatedAt: stream.renderedAt,
      publishedLinks: masterLinks,
    })

    // 3. Promo deliverable(s) — active promo + any additional rendered campaigns in this language
    const promoBlock = publishingState.promo
    const activePromoAsset: PromoTrailerAsset | undefined = promoAssetForLanguage(promoBlock, lang)
    const resolvedPromoUrl = resolvePromoScreeningVideoUrl({
      scenes: projectScenes,
      sceneProductionState: sceneProductionState as Record<string, unknown>,
      language: lang,
      finalCut,
      activePromoId: promoBlock?.activePromoId,
      fallbackPromoTrailerUrl: activePromoAsset?.mp4Url || null,
    })
    const promoLinks = extractPublishedLinks(publishingState.units, 'promo', lang)
    const promoAspect: '16:9' | '9:16' =
      activePromoAsset?.aspect === '16:9' || promoBlock?.aspect === '16:9' ? '16:9' : '9:16'

    const activeCampaign = promoBlock?.campaigns?.find((c) => c.id === promoBlock.activePromoId)
    const promoTitle = activeCampaign?.name ? `Promo · ${activeCampaign.name}` : 'Promo'

    items.push({
      uid: `${lang}:promo:active`,
      kind: 'promo',
      language: lang,
      languageLabel: langLabel,
      title: promoTitle,
      subtitle: resolvedPromoUrl
        ? `Rendered ${promoAspect} trailer ready`
        : 'Create trailer in Promo Builder',
      format: 'video',
      version: 1,
      totalVersions: 1,
      isLatestVersion: true,
      versionVariants: [],
      status:
        promoLinks.length > 0 && resolvedPromoUrl
          ? 'published'
          : resolvedPromoUrl
            ? 'ready'
            : 'draft',
      canPublish: Boolean(resolvedPromoUrl),
      mp4Url: resolvedPromoUrl || undefined,
      durationSec: activePromoAsset?.durationSec,
      aspectRatio: promoAspect,
      updatedAt: activePromoAsset?.renderedAt,
      promoId: activeCampaign?.id,
      publishedLinks: promoLinks,
    })

    // Surface additional rendered promo campaigns if multiple exist
    for (const campaign of promoBlock?.campaigns || []) {
      if (campaign.id === activeCampaign?.id) continue
      const campAsset =
        campaign.trailersByLanguage?.[lang] ||
        (lang === (campaign.primaryLanguage || 'en') ? campaign.trailer : undefined)
      if (!campAsset?.mp4Url) continue
      items.push({
        uid: `${lang}:promo:${campaign.id}`,
        kind: 'promo',
        language: lang,
        languageLabel: langLabel,
        title: `Promo · ${campaign.name}`,
        subtitle: `Campaign ${campAsset.aspect || campaign.aspect || '9:16'} trailer`,
        format: 'video',
        version: 1,
        totalVersions: 1,
        isLatestVersion: true,
        versionVariants: [],
        status: 'ready',
        canPublish: true,
        mp4Url: campAsset.mp4Url,
        durationSec: campAsset.durationSec,
        aspectRatio: campAsset.aspect || campaign.aspect || '9:16',
        updatedAt: campAsset.renderedAt || campaign.updatedAt,
        promoId: campaign.id,
        publishedLinks: [],
      })
    }

    // Build per-scene stream versions for this language
    const mergedSceneInputs = publishScenes.map((sc, idx) => {
      const pv = previsScenes[idx]
      const rawScene = projectScenes[idx] as Record<string, unknown> | undefined
      const rawStreams = (sceneProductionState[sc.id]?.productionStreams || []).filter(
        (s) => (s.language === lang || (!s.language && lang === 'en')) && isStreamComplete(s)
      )
      // Sort newest version first (prefer video over animatic when versions tie, or newer completedAt)
      const sortedTakes = rawStreams.slice().sort((a, b) => {
        const typeScoreA = a.streamType === 'video' ? 1 : 0
        const typeScoreB = b.streamType === 'video' ? 1 : 0
        if (typeScoreB !== typeScoreA) return typeScoreB - typeScoreA
        const vDiff = (b.streamVersion ?? 1) - (a.streamVersion ?? 1)
        if (vDiff !== 0) return vDiff
        const tB = b.completedAt ? Date.parse(b.completedAt) || 0 : 0
        const tA = a.completedAt ? Date.parse(a.completedAt) || 0 : 0
        return tB - tA
      })

      const variants: StreamVersionVariant[] = sortedTakes.map((t) => {
        const ver = t.streamVersion ?? 1
        allVersionsSet.add(ver)
        return {
          id: t.id,
          version: ver,
          streamType: t.streamType === 'video' ? 'video' : 'animatic',
          mp4Url: t.mp4Url!,
          durationSec: t.duration,
          resolution: t.resolution,
          completedAt: t.completedAt,
          displayName: t.displayName,
        }
      })

      // Include legacy scene-level renderedSceneUrl / mp4Url / Pre-Vis fallback if not in productionStreams
      if (variants.length === 0) {
        const directLegacyEnUrl =
          lang === 'en'
            ? (sceneProductionState[sc.id] as { renderedSceneUrl?: string } | undefined)
                ?.renderedSceneUrl ||
              (typeof rawScene?.mp4Url === 'string' ? rawScene.mp4Url : undefined) ||
              (typeof rawScene?.videoUrl === 'string' ? rawScene.videoUrl : undefined)
            : undefined
        const fallbackUrl = pv?.mp4Url || directLegacyEnUrl
        if (fallbackUrl) {
          variants.push({
            id: `${sc.id}-${lang}-v1`,
            version: 1,
            streamType: pv?.mp4Url ? 'animatic' : 'video',
            mp4Url: fallbackUrl,
            durationSec: pv?.duration ?? sc.duration,
          })
        }
      }

      totalSceneVersionTakes += variants.length
      const primary = variants[0]
      return {
        scene: sc,
        variants,
        primary,
        mp4Url: primary?.mp4Url,
        duration: primary?.durationSec ?? sc.duration,
      }
    })

    // 4. Chapters in this language
    const chapters = listPublishChapters(
      mergedSceneInputs.map((m) => ({
        ...m.scene,
        mp4Url: m.mp4Url,
        duration: m.duration,
      }))
    )

    for (const chapter of chapters) {
      const members = mergedSceneInputs.filter((m) => chapter.sceneIds.includes(m.scene.id))
      const readyMembers = members.filter((m) => Boolean(m.mp4Url))
      const isChapterReady = readyMembers.length > 0
      const hasVideo = readyMembers.some((m) => m.primary?.streamType === 'video')
      const hasAnimatic = readyMembers.some((m) => m.primary?.streamType === 'animatic')
      const chapterFormat: StreamDeliverableFormat =
        hasVideo && hasAnimatic ? 'mixed' : hasAnimatic ? 'animatic' : 'video'
      const totalDuration = readyMembers.reduce((sum, m) => sum + (m.duration || 0), 0)
      const chapterLinks = extractPublishedLinks(
        publishingState.units,
        'chapter',
        lang,
        undefined,
        chapter.beatIndex
      )

      items.push({
        uid: `${lang}:chapter:${chapter.beatIndex}`,
        kind: 'chapter',
        language: lang,
        languageLabel: langLabel,
        title: chapter.title,
        subtitle: `${readyMembers.length}/${members.length} scene${members.length === 1 ? '' : 's'} rendered`,
        format: chapterFormat,
        version: 1,
        totalVersions: 1,
        isLatestVersion: true,
        versionVariants: [],
        status:
          chapterLinks.length > 0 && isChapterReady
            ? 'published'
            : isChapterReady
              ? 'ready'
              : 'draft',
        canPublish: isChapterReady,
        mp4Url: readyMembers.length === 1 ? readyMembers[0]?.mp4Url : undefined,
        durationSec: totalDuration > 0 ? totalDuration : undefined,
        aspectRatio: '16:9',
        beatIndex: chapter.beatIndex,
        publishedLinks: chapterLinks,
      })
    }

    // 5. Scenes (latest take + optional historical version rows when multiple takes exist)
    for (const entry of mergedSceneInputs) {
      const { scene, variants, primary } = entry
      const sceneLinks = extractPublishedLinks(publishingState.units, 'scene', lang, scene.id)

      if (variants.length === 0) {
        items.push({
          uid: `${lang}:scene:${scene.id}:draft`,
          kind: 'scene',
          language: lang,
          languageLabel: langLabel,
          title: scene.title,
          subtitle: `Scene ${scene.sceneNumber} · Not rendered`,
          format: 'video',
          version: 1,
          totalVersions: 0,
          isLatestVersion: true,
          versionVariants: [],
          status: 'draft',
          canPublish: false,
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          publishedLinks: sceneLinks,
        })
        continue
      }

      variants.forEach((variant, idx) => {
        const isLatest = idx === 0
        const typeTag = variant.streamType === 'animatic' ? 'Pre-Vis' : 'AI Video'
        items.push({
          uid: `${lang}:scene:${scene.id}:${variant.id}`,
          kind: 'scene',
          language: lang,
          languageLabel: langLabel,
          title: variant.displayName || scene.title,
          subtitle: `Scene ${scene.sceneNumber} · ${typeTag} v${variant.version}${
            variants.length > 1 && isLatest ? ` (${variants.length} takes)` : ''
          }`,
          format: variant.streamType,
          version: variant.version,
          totalVersions: variants.length,
          isLatestVersion: isLatest,
          versionVariants: variants,
          status:
            isLatest && sceneLinks.length > 0
              ? 'published'
              : 'ready',
          canPublish: Boolean(primary?.mp4Url),
          mp4Url: variant.mp4Url,
          durationSec: variant.durationSec,
          resolution: variant.resolution,
          aspectRatio: '16:9',
          updatedAt: variant.completedAt,
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          publishedLinks: isLatest ? sceneLinks : [],
        })
      })
    }
  }

  // Compute Executive Dashboard Summary from latest-version items
  const latestItems = items.filter((item) => item.isLatestVersion)
  const previsItems = latestItems.filter((i) => i.kind === 'previs')
  const masterItems = latestItems.filter((i) => i.kind === 'master')
  const promoItems = latestItems.filter((i) => i.kind === 'promo')
  const chapterItems = latestItems.filter((i) => i.kind === 'chapter')
  const sceneItems = latestItems.filter((i) => i.kind === 'scene')

  const availableVersions = Array.from(allVersionsSet).sort((a, b) => a - b)
  const maxVersion = availableVersions[availableVersions.length - 1] || 1

  const languageSummaries: LanguageInventorySummary[] = streams.map((s) => {
    const inLang = latestItems.filter((i) => i.language === s.language)
    return {
      code: s.language,
      label: getLanguageDisplayName(s.language),
      readyCount: inLang.filter((i) => i.canPublish).length,
      publishedCount: inLang.filter((i) => i.publishedLinks.length > 0).length,
      totalCount: inLang.length,
    }
  })

  const promoBlock = publishingState.promo
  const campaignsCount = Math.max(
    promoBlock?.campaigns?.length || 0,
    promoItems.some((p) => p.canPublish) ? 1 : 0
  )

  const summary: StreamsDashboardSummary = {
    languageCount: streams.length,
    languages: languageSummaries,
    totalReadyAssets: latestItems.filter((i) => i.canPublish).length,
    totalPublishedAssets: latestItems.filter((i) => i.publishedLinks.length > 0).length,
    previs: {
      stitchedReady: previsItems.filter((i) => Boolean(i.mp4Url)).length,
      stitchableCount: previsItems.filter((i) => i.status === 'stitchable').length,
      totalLanguages: streams.length,
      sceneRendersReady: totalPreVisSceneRenders,
    },
    masters: {
      ready: masterItems.filter((i) => i.canPublish).length,
      totalLanguages: streams.length,
    },
    promos: {
      ready: promoItems.filter((i) => i.canPublish).length,
      campaignsCount,
    },
    chapters: {
      ready: chapterItems.filter((i) => i.canPublish).length,
      total: chapterItems.length,
    },
    scenes: {
      ready: sceneItems.filter((i) => i.canPublish).length,
      total: sceneItems.length,
      totalVersionTakes: totalSceneVersionTakes,
      maxVersion,
      availableVersions,
    },
  }

  return { items, summary }
}

export function filterStreamDeliverables(
  items: StreamDeliverableItem[],
  filters: StreamExplorerFilters
): StreamDeliverableItem[] {
  const query = filters.search.trim().toLowerCase()

  return items.filter((item) => {
    // 1. Version filter
    if (filters.version === 'latest') {
      if (!item.isLatestVersion) return false
    } else if (typeof filters.version === 'number') {
      // If user picked e.g. v2, show exact v2 scene takes (or non-scene deliverables if v1)
      if (item.kind === 'scene') {
        if (item.version !== filters.version || item.status === 'draft') return false
      } else if (filters.version !== 1) {
        return false
      }
    }
    // ('all' keeps every take row!)

    // 2. Deliverable Type filter
    if (filters.type !== 'all' && item.kind !== filters.type) {
      return false
    }

    // 3. Language filter
    if (filters.language !== 'all' && item.language !== filters.language) {
      return false
    }

    // 4. Status filter
    if (filters.status === 'ready' && !item.canPublish) {
      return false
    }
    if (filters.status === 'published' && item.publishedLinks.length === 0) {
      return false
    }
    if (filters.status === 'draft' && item.canPublish) {
      return false
    }

    // 5. Format filter ('video' vs 'animatic')
    if (filters.format === 'video' && item.format === 'animatic') {
      return false
    }
    if (filters.format === 'animatic' && item.format === 'video') {
      return false
    }

    // 6. Search filter
    if (query) {
      const haystack = [
        item.title,
        item.subtitle,
        item.kind,
        item.language,
        item.languageLabel,
        item.format,
        item.resolution || '',
        `v${item.version}`,
        item.sceneNumber ? `scene ${item.sceneNumber}` : '',
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }

    return true
  })
}
