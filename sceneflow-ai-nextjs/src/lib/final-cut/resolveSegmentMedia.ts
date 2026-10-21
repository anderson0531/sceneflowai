/**
 * Final Cut viewer media resolvers.
 */

import type { FinalCutSelection, ProductionFormat } from '@/lib/types/finalCut'

interface ProductionStreamRow {
  id?: string
  streamType?: 'animatic' | 'video' | string
  language?: string
  streamVersion?: number
  mp4Url?: string | null
  status?: string
  duration?: number
  completedAt?: string
  createdAt?: string
}

export function refineAssetTypeFromUrl(url: string, fallback: 'video' | 'image'): 'video' | 'image' {
  const path = url.split('?')[0].toLowerCase()
  if (/\.(mp4|webm|mov|m4v|mkv)$/.test(path)) return 'video'
  if (/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(path)) return 'image'
  return fallback
}

export function streamTypeFromFormat(format: ProductionFormat): 'animatic' | 'video' {
  return format === 'animatic' ? 'animatic' : 'video'
}

export function formatFromStreamType(streamType: 'animatic' | 'video'): ProductionFormat {
  return streamType === 'animatic' ? 'animatic' : 'full-video'
}

function readProductionStreams(prodScene: Record<string, unknown> | undefined): ProductionStreamRow[] {
  if (!prodScene) return []
  const list = (prodScene as { productionStreams?: unknown }).productionStreams
  if (!Array.isArray(list)) return []
  const deletedRaw = (prodScene as { deletedStreamIds?: unknown }).deletedStreamIds
  const deletedIds = new Set(
    Array.isArray(deletedRaw)
      ? deletedRaw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : []
  )
  return (list as ProductionStreamRow[]).filter(
    (row) => !row?.id || !deletedIds.has(row.id)
  )
}

function streamTimestampMs(row: ProductionStreamRow | undefined): number {
  if (!row) return 0
  const raw = row.completedAt || row.createdAt
  if (typeof raw !== 'string' || !raw.trim()) return 0
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function pickLatestStream(list: ProductionStreamRow[]): ProductionStreamRow | undefined {
  if (list.length === 0) return undefined
  return list.reduce((best: ProductionStreamRow, cur: ProductionStreamRow) => {
    const bt = streamTimestampMs(best)
    const ct = streamTimestampMs(cur)
    if (bt > 0 && ct > 0 && bt !== ct) {
      return ct > bt ? cur : best
    }
    const bv = Number(best?.streamVersion) || 1
    const cv = Number(cur?.streamVersion) || 1
    return cv >= bv ? cur : best
  }, list[0])
}

function isReadyStream(row: ProductionStreamRow): boolean {
  if (!row) return false
  const url = typeof row.mp4Url === 'string' ? row.mp4Url.trim() : ''
  if (!url) return false
  return row.status === 'complete'
}

export interface SceneStreamTarget {
  streamType: 'animatic' | 'video'
  language: string
}

/** Effective stream target for a scene (override → global defaults). */
export function getSceneStreamTarget(
  selection: Pick<FinalCutSelection, 'format' | 'language' | 'perSceneOverrides'>,
  sceneId: string
): SceneStreamTarget {
  const override = selection.perSceneOverrides?.[sceneId]
  return {
    streamType: override?.streamType ?? streamTypeFromFormat(selection.format),
    language: override?.language ?? selection.language,
  }
}

export function sceneHasReadyStream(
  sceneProductionState: Record<string, unknown>,
  sceneId: string,
  streamType: 'animatic' | 'video',
  language: string
): boolean {
  const prod = sceneProductionState[sceneId] as Record<string, unknown> | undefined
  return readProductionStreams(prod).some(
    (s) => s.streamType === streamType && (s.language ?? '') === language && isReadyStream(s)
  )
}

export function getAvailableLanguagesForSceneStream(
  sceneProductionState: Record<string, unknown>,
  sceneId: string,
  streamType: 'animatic' | 'video'
): string[] {
  const prod = sceneProductionState[sceneId] as Record<string, unknown> | undefined
  const set = new Set<string>()
  for (const row of readProductionStreams(prod)) {
    if (row.streamType === streamType && row.language && isReadyStream(row)) {
      set.add(row.language)
    }
  }
  return Array.from(set).sort()
}

export function getAvailableStreamTypesForScene(
  sceneProductionState: Record<string, unknown>,
  sceneId: string,
  language?: string
): Array<'animatic' | 'video'> {
  const prod = sceneProductionState[sceneId] as Record<string, unknown> | undefined
  const set = new Set<'animatic' | 'video'>()
  for (const row of readProductionStreams(prod)) {
    if (!isReadyStream(row)) continue
    if (language && (row.language ?? '') !== language) continue
    if (row.streamType === 'animatic' || row.streamType === 'video') {
      set.add(row.streamType)
    }
  }
  return Array.from(set)
}

export function getAvailableSceneVersions(
  sceneProductionState: Record<string, unknown>,
  sourceSceneId: string,
  streamType: 'animatic' | 'video',
  language: string
): number[] {
  const prod = sceneProductionState[sourceSceneId] as Record<string, unknown> | undefined
  const rows = readProductionStreams(prod).filter(
    (s) => s.streamType === streamType && (s.language ?? '') === language && isReadyStream(s)
  )
  const versions = new Set<number>()
  for (const row of rows) {
    const v = Number(row.streamVersion)
    versions.add(Number.isFinite(v) && v > 0 ? v : 1)
  }
  return Array.from(versions).sort((a, b) => a - b)
}

/** Back-compat wrapper using global format. */
export function getAvailableSceneVersionsForFormat(
  sceneProductionState: Record<string, unknown>,
  sourceSceneId: string,
  format: ProductionFormat,
  language: string
): number[] {
  return getAvailableSceneVersions(
    sceneProductionState,
    sourceSceneId,
    streamTypeFromFormat(format),
    language
  )
}

export function getAvailableLanguagesForFormat(
  sceneProductionState: Record<string, unknown>,
  format: ProductionFormat
): string[] {
  const target = streamTypeFromFormat(format)
  const set = new Set<string>()
  for (const sceneId of Object.keys(sceneProductionState)) {
    for (const lang of getAvailableLanguagesForSceneStream(sceneProductionState, sceneId, target)) {
      set.add(lang)
    }
  }
  return Array.from(set).sort()
}

export interface ResolvedSceneStream {
  url: string | null
  streamVersion?: number
  streamType?: 'animatic' | 'video'
  language?: string
  durationSec?: number
  availableVersions: number[]
}

export function resolveSceneStreamUrl(
  sceneProductionState: Record<string, unknown>,
  sourceSceneId: string,
  selection: Pick<FinalCutSelection, 'format' | 'language' | 'perSceneOverrides'>
): ResolvedSceneStream {
  const prod = sceneProductionState[sourceSceneId] as Record<string, unknown> | undefined
  const target = getSceneStreamTarget(selection, sourceSceneId)

  const rows = readProductionStreams(prod).filter(
    (s) =>
      s.streamType === target.streamType &&
      (s.language ?? '') === target.language &&
      isReadyStream(s)
  )

  const availableVersions = Array.from(
    new Set(rows.map((r) => Number(r.streamVersion) || 1))
  ).sort((a, b) => a - b)

  const requestedVersion = selection.perSceneOverrides?.[sourceSceneId]?.streamVersion
  const currentStreamId = typeof prod?.currentStreamId === 'string' ? prod.currentStreamId.trim() : ''
  const renderedUrl = typeof prod?.renderedSceneUrl === 'string' ? prod.renderedSceneUrl.trim() : ''
  const latestOverall = pickLatestStream(rows)

  let chosen: ProductionStreamRow | undefined
  if (typeof requestedVersion === 'number' && requestedVersion > 0) {
    const matching = rows.filter((r) => (Number(r.streamVersion) || 1) === requestedVersion)
    if (matching.length > 0) {
      chosen =
        (currentStreamId ? matching.find((r) => r.id === currentStreamId) : undefined) ??
        pickLatestStream(matching)
      // Heal stale overrides where an older deleted stream was resurrected in DB
      // before a newer render completed (or where client designated v1 while DB assigned v2).
      if (chosen && latestOverall && chosen !== latestOverall) {
        const chosenTs = streamTimestampMs(chosen)
        const latestTs = streamTimestampMs(latestOverall)
        const latestMatchesCurrent = Boolean(currentStreamId && latestOverall.id === currentStreamId)
        const latestMatchesRendered =
          Boolean(renderedUrl && latestOverall.mp4Url?.trim() === renderedUrl) &&
          (!currentStreamId || currentStreamId !== chosen.id)
        if (latestMatchesCurrent || (chosenTs > 0 && latestTs > chosenTs && latestMatchesRendered)) {
          chosen = latestOverall
        }
      }
    }
  }
  if (!chosen && rows.length > 0) {
    const pinned = currentStreamId ? rows.find((r) => r.id === currentStreamId) : undefined
    if (
      pinned &&
      (!latestOverall ||
        streamTimestampMs(pinned) === 0 ||
        streamTimestampMs(latestOverall) === 0 ||
        streamTimestampMs(pinned) >= streamTimestampMs(latestOverall))
    ) {
      chosen = pinned
    } else {
      chosen = latestOverall
    }
  }

  if (chosen) {
    const url = typeof chosen.mp4Url === 'string' ? chosen.mp4Url.trim() : ''
    if (url) {
      const duration = chosen.duration
      return {
        url,
        streamVersion: Number(chosen.streamVersion) || 1,
        streamType: target.streamType,
        language: target.language,
        durationSec: typeof duration === 'number' && duration > 0 ? duration : undefined,
        availableVersions,
      }
    }
  }

  const deletedRaw = (prod as { deletedStreamIds?: unknown } | undefined)?.deletedStreamIds
  const hasDeletedStreams = Array.isArray(deletedRaw) && deletedRaw.length > 0
  if (!hasDeletedStreams && renderedUrl && target.streamType === 'video') {
    const refined = refineAssetTypeFromUrl(renderedUrl, 'video')
    if (refined === 'video') {
      return {
        url: renderedUrl,
        streamType: 'video',
        language: target.language,
        availableVersions,
      }
    }
  }

  return { url: null, streamType: target.streamType, language: target.language, availableVersions }
}
