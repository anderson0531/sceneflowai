/**
 * Final Cut viewer media resolvers.
 *
 * Final Cut is a preview-only surface over Production renders. These helpers
 * read the canonical `metadata.visionPhase.production.scenes[sceneId]` blob
 * (and the legacy `sceneProductionState` fallback merged by
 * `getSceneProductionStateFromMetadata`) and return the appropriate scene-level
 * playable URL for a given (format, language, version) selection.
 */

import type { FinalCutSelection, ProductionFormat } from '@/lib/types/finalCut'

interface ProductionStreamRow {
  id?: string
  streamType?: 'animatic' | 'video' | string
  language?: string
  streamVersion?: number
  mp4Url?: string | null
  status?: string
}

export function refineAssetTypeFromUrl(url: string, fallback: 'video' | 'image'): 'video' | 'image' {
  const path = url.split('?')[0].toLowerCase()
  if (/\.(mp4|webm|mov|m4v|mkv)$/.test(path)) return 'video'
  if (/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(path)) return 'image'
  return fallback
}

function streamTypeFromFormat(format: ProductionFormat): 'animatic' | 'video' {
  return format === 'animatic' ? 'animatic' : 'video'
}

function readProductionStreams(prodScene: Record<string, unknown> | undefined): ProductionStreamRow[] {
  if (!prodScene) return []
  const list = (prodScene as { productionStreams?: unknown }).productionStreams
  return Array.isArray(list) ? (list as ProductionStreamRow[]) : []
}

function isReadyStream(row: ProductionStreamRow): boolean {
  if (!row) return false
  const url = typeof row.mp4Url === 'string' ? row.mp4Url.trim() : ''
  if (!url) return false
  return row.status === 'complete'
}

/**
 * Available production versions for `(scene, format, language)`, sorted ascending by streamVersion.
 * Only "complete" rows with an mp4 URL are considered.
 */
export function getAvailableSceneVersions(
  sceneProductionState: Record<string, unknown>,
  sourceSceneId: string,
  format: ProductionFormat,
  language: string
): number[] {
  const prod = sceneProductionState[sourceSceneId] as Record<string, unknown> | undefined
  const target = streamTypeFromFormat(format)
  const rows = readProductionStreams(prod).filter(
    (s) => s.streamType === target && (s.language ?? '') === language && isReadyStream(s)
  )
  const versions = new Set<number>()
  for (const row of rows) {
    const v = Number(row.streamVersion)
    versions.add(Number.isFinite(v) && v > 0 ? v : 1)
  }
  return Array.from(versions).sort((a, b) => a - b)
}

/**
 * Languages that have at least one ready production stream for `format`.
 */
export function getAvailableLanguagesForFormat(
  sceneProductionState: Record<string, unknown>,
  format: ProductionFormat
): string[] {
  const target = streamTypeFromFormat(format)
  const set = new Set<string>()
  for (const sceneId of Object.keys(sceneProductionState)) {
    const prod = sceneProductionState[sceneId] as Record<string, unknown> | undefined
    for (const row of readProductionStreams(prod)) {
      if (row.streamType === target && row.language && isReadyStream(row)) {
        set.add(row.language)
      }
    }
  }
  return Array.from(set).sort()
}

export interface ResolvedSceneStream {
  /** Playable URL of the chosen production stream, when available. */
  url: string | null
  /** Resolved 1-based version, when matched. */
  streamVersion?: number
  /** Effective duration in seconds (from production stream metadata, when present). */
  durationSec?: number
  /** All ready versions for `(format, language)` in this scene, ascending. */
  availableVersions: number[]
}

/**
 * Resolve the scene-level playable URL for the active selection.
 *
 * Order of preference:
 *  1. `selection.perSceneOverrides[sceneId].streamVersion` (when ready).
 *  2. Highest ready `streamVersion` matching `(streamType=format, language)`.
 *  3. `renderedSceneUrl` on the production state, when its extension matches the format kind.
 *
 * Returns `{ url: null, ... }` so the UI can render a "missing" badge.
 */
export function resolveSceneStreamUrl(
  sceneProductionState: Record<string, unknown>,
  sourceSceneId: string,
  selection: Pick<FinalCutSelection, 'format' | 'language' | 'perSceneOverrides'>
): ResolvedSceneStream {
  const prod = sceneProductionState[sourceSceneId] as Record<string, unknown> | undefined
  const target = streamTypeFromFormat(selection.format)
  const language = selection.language

  const rows = readProductionStreams(prod).filter(
    (s) => s.streamType === target && (s.language ?? '') === language && isReadyStream(s)
  )

  const availableVersions = Array.from(
    new Set(rows.map((r) => Number(r.streamVersion) || 1))
  ).sort((a, b) => a - b)

  const requestedVersion = selection.perSceneOverrides?.[sourceSceneId]?.streamVersion

  let chosen: ProductionStreamRow | undefined
  if (typeof requestedVersion === 'number' && requestedVersion > 0) {
    chosen = rows.find((r) => (Number(r.streamVersion) || 1) === requestedVersion)
  }
  if (!chosen && rows.length > 0) {
    chosen = rows.reduce((best: ProductionStreamRow, cur: ProductionStreamRow) => {
      const bv = Number(best?.streamVersion) || 1
      const cv = Number(cur?.streamVersion) || 1
      return cv >= bv ? cur : best
    }, rows[0])
  }

  if (chosen) {
    const url = typeof chosen.mp4Url === 'string' ? chosen.mp4Url.trim() : ''
    if (url) {
      const duration = (chosen as { duration?: number }).duration
      return {
        url,
        streamVersion: Number(chosen.streamVersion) || 1,
        durationSec: typeof duration === 'number' && duration > 0 ? duration : undefined,
        availableVersions,
      }
    }
  }

  // Fallback: legacy single-render scene URL when format matches.
  const rendered = (prod?.renderedSceneUrl as string | undefined)?.trim() ?? ''
  if (rendered) {
    const refined = refineAssetTypeFromUrl(rendered, 'video')
    const formatExpectsVideo = target === 'video' || target === 'animatic'
    if (formatExpectsVideo && refined === 'video') {
      return { url: rendered, availableVersions }
    }
  }

  return { url: null, availableVersions }
}
