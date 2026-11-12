import type {
  LanguageClipVersionSet,
  LanguageClipVersions,
  SceneSegment,
  SceneSegmentTake,
} from '@/components/vision/scene-production/types'
import {
  MEDIA_VERSION_CAP,
  appendSegmentTake,
  chronologicalPlayableTakes,
  listPlayableTakes,
  resolveLiveTake,
} from '@/lib/storyboard/mediaVersions'

export const MASTER_STREAM_LANGUAGE = 'en'

export function normalizeStreamLanguage(language?: string | null): string {
  const code = language?.trim().toLowerCase()
  return code || MASTER_STREAM_LANGUAGE
}

export function isMasterStreamLanguage(language?: string | null): boolean {
  return normalizeStreamLanguage(language) === MASTER_STREAM_LANGUAGE
}

/** A non-English stream that stores its own clip versions. */
export function isLanguageClipTarget(language?: string | null): boolean {
  const code = language?.trim()
  return !!code && !isMasterStreamLanguage(code)
}

export function streamLanguageLabel(code: string, name?: string | null): string {
  if (isMasterStreamLanguage(code)) return 'English (master)'
  const label = name?.trim()
  return label || normalizeStreamLanguage(code)
}

export function appendLanguageClipTake(
  versions: LanguageClipVersions | undefined,
  language: string,
  take: SceneSegmentTake
): LanguageClipVersions {
  const lang = normalizeStreamLanguage(language)
  const existing = versions?.[lang]
  return {
    ...(versions || {}),
    [lang]: {
      takes: appendSegmentTake(existing?.takes, take),
      currentTakeId: take.id,
      selectedAt: new Date().toISOString(),
    },
  }
}

export interface LanguageClipVersionOption {
  id: string
  version: number
  label: string
  url: string
  isCurrent: boolean
}

/** Oldest stored clip is v1. The current pointer is the live version. */
export function listLanguageClipVersionOptions(
  set: LanguageClipVersionSet | undefined
): LanguageClipVersionOption[] {
  const chronological = chronologicalPlayableTakes(set?.takes, undefined)
  const newestId = chronological[chronological.length - 1]?.id
  const currentId =
    set?.currentTakeId && chronological.some((take) => take.id === set.currentTakeId)
      ? set.currentTakeId
      : newestId
  return chronological.map((take, index) => ({
    id: take.id,
    version: index + 1,
    label: `v${index + 1}`,
    url: take.url,
    isCurrent: take.id === currentId,
  }))
}

export function latestLanguageClipOption(
  options: LanguageClipVersionOption[]
): LanguageClipVersionOption | undefined {
  return [...options].sort((a, b) => b.version - a.version)[0]
}

/** `latest` when the live pointer is the newest clip; otherwise that clip's id. */
export function languageClipSelectionValue(options: LanguageClipVersionOption[]): string {
  if (options.length === 0) return 'latest'
  const newest = latestLanguageClipOption(options)
  const current = options.find((option) => option.isCurrent)
  if (!current || !newest || current.id === newest.id) return 'latest'
  return current.id
}

export function withSelectedLanguageClip<T extends Pick<SceneSegment, 'languageVersions'>>(
  segment: T,
  language: string,
  takeId: string
): T {
  const lang = normalizeStreamLanguage(language)
  const set = segment.languageVersions?.[lang]
  if (!set) return segment
  const playable = listPlayableTakes(set.takes, undefined)
  const selected = playable.find((take) => take.id === takeId)
  if (!selected && !set.takes.some((take) => take.id === takeId)) return segment
  const normalizedTakes = selected
    ? set.takes.map((row) => {
        const rowUrl = row.videoUrl?.trim() || row.assetUrl?.trim()
        if (!row.id?.trim() && rowUrl === selected.url) {
          return { ...row, id: selected.id }
        }
        return row
      })
    : set.takes
  return {
    ...segment,
    languageVersions: {
      ...segment.languageVersions,
      [lang]: {
        ...set,
        takes: normalizedTakes,
        currentTakeId: selected?.id ?? takeId,
        selectedAt: new Date().toISOString(),
      },
    },
  }
}

export function resolveLanguageClipPlayback(
  segment: Pick<SceneSegment, 'takes' | 'currentTakeId' | 'activeAssetUrl' | 'languageVersions'>,
  language?: string | null
): { url?: string; takeId?: string; usingMaster: boolean } {
  const master = resolveLiveTake(segment.takes, segment.currentTakeId, segment.activeAssetUrl)
  if (!isLanguageClipTarget(language)) {
    return { url: master?.url, takeId: master?.id, usingMaster: true }
  }
  const set = segment.languageVersions?.[normalizeStreamLanguage(language)]
  const live = resolveLiveTake(set?.takes, set?.currentTakeId, undefined)
  if (live?.url) return { url: live.url, takeId: live.id, usingMaster: false }
  return { url: master?.url, takeId: master?.id, usingMaster: true }
}

/** Preview/render copy. Does not change the stored master pointer. */
export function presentSegmentForStream<
  T extends Pick<
    SceneSegment,
    'activeAssetUrl' | 'assetType' | 'status' | 'takes' | 'currentTakeId' | 'languageVersions'
  >,
>(segment: T, language?: string | null): T {
  if (!isLanguageClipTarget(language)) return segment
  const playback = resolveLanguageClipPlayback(segment, language)
  if (playback.usingMaster || !playback.url) return segment
  const langKey = normalizeStreamLanguage(language)
  const langSet = segment.languageVersions?.[langKey]
  const langTakes =
    Array.isArray(langSet?.takes) && langSet.takes.length > 0 ? langSet.takes : segment.takes
  const rawStem = (segment as { stemSeparation?: SceneSegment['stemSeparation'] }).stemSeparation
  const keepStem = rawStem?.sourceAudioUrl === playback.url
  return {
    ...segment,
    activeAssetUrl: playback.url,
    ...(playback.takeId ? { currentTakeId: playback.takeId } : {}),
    takes: langTakes,
    ...(rawStem && !keepStem ? { stemSeparation: undefined } : {}),
    assetType: 'video',
    status: 'COMPLETE',
  }
}

/**
 * Commit a generated clip onto a language stream.
 * Returns null for the English master so callers keep the existing take path.
 */
export function applyGeneratedClipTake<T extends SceneSegment>(
  segment: T,
  take: SceneSegmentTake,
  clipLanguage?: string | null
): T | null {
  if (!isLanguageClipTarget(clipLanguage)) return null
  if (!take.assetUrl?.trim()) return null
  return {
    ...segment,
    isStale: false,
    languageVersions: appendLanguageClipTake(segment.languageVersions, clipLanguage, take),
  }
}

export function mergeLanguageClipVersions(
  incoming?: LanguageClipVersions | null,
  existing?: LanguageClipVersions | null
): LanguageClipVersions | undefined {
  const keys = new Set([
    ...Object.keys(existing || {}),
    ...Object.keys(incoming || {}),
  ])
  if (keys.size === 0) return undefined
  const merged: LanguageClipVersions = {}
  for (const lang of keys) {
    const inc = incoming?.[lang]
    const ex = existing?.[lang]
    const incTakes = Array.isArray(inc?.takes) ? inc.takes : []
    const exTakes = Array.isArray(ex?.takes) ? ex.takes : []
    const incKeys = new Set(
      incTakes.map((t) => t.id?.trim() || t.assetUrl?.trim()).filter(Boolean)
    )
    const exKeys = new Set(
      exTakes.map((t) => t.id?.trim() || t.assetUrl?.trim()).filter(Boolean)
    )
    const incNewestMs = Math.max(
      0,
      ...incTakes.map((t) => Date.parse(t.createdAt || '') || 0)
    )
    const exNewestMs = Math.max(
      0,
      ...exTakes.map((t) => Date.parse(t.createdAt || '') || 0)
    )
    const incSelectedMs = Date.parse(inc?.selectedAt || '') || 0
    const exSelectedMs = Date.parse(ex?.selectedAt || '') || 0
    const incActivityMs = Math.max(incSelectedMs, incNewestMs)
    const exActivityMs = Math.max(exSelectedMs, exNewestMs)
    const exHasNewerOnly =
      exTakes.some((t) => {
        const k = t.id?.trim() || t.assetUrl?.trim()
        return Boolean(k && !incKeys.has(k))
      }) &&
      !incTakes.some((t) => {
        const k = t.id?.trim() || t.assetUrl?.trim()
        return Boolean(k && !exKeys.has(k))
      })
    const preferExistingCurrent =
      exActivityMs > incActivityMs || (exActivityMs === incActivityMs && exHasNewerOnly)
    const orderedCandidates = preferExistingCurrent
      ? [...exTakes, ...incTakes]
      : [...incTakes, ...exTakes]
    const byKey = new Map<string, SceneSegmentTake>()
    for (const row of orderedCandidates) {
      const key =
        row.id?.trim() ||
        row.assetUrl?.trim() ||
        (row as { videoUrl?: string }).videoUrl?.trim()
      if (!key || byKey.has(key)) continue
      byKey.set(key, row)
    }
    const takes = Array.from(byKey.values())
      .sort((a, b) => {
        const ta = Date.parse(a.createdAt || '') || 0
        const tb = Date.parse(b.createdAt || '') || 0
        return tb - ta
      })
      .slice(0, MEDIA_VERSION_CAP)
    if (takes.length === 0) continue
    const requested = preferExistingCurrent
      ? ex?.currentTakeId ?? inc?.currentTakeId
      : inc?.currentTakeId ?? ex?.currentTakeId
    const currentTakeId =
      requested && takes.some((take) => take.id === requested) ? requested : takes[0]?.id
    const selectedAt = preferExistingCurrent
      ? ex?.selectedAt || inc?.selectedAt
      : inc?.selectedAt || ex?.selectedAt
    merged[normalizeStreamLanguage(lang)] = {
      takes,
      ...(currentTakeId ? { currentTakeId } : {}),
      ...(selectedAt ? { selectedAt } : {}),
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined
}

/** Keep language clip history when a language re-derive replaces the segment list. */
export function keepLanguageClipVersions(
  incoming: SceneSegment[],
  previous: SceneSegment[]
): SceneSegment[] {
  return incoming.map((segment) => {
    const prior =
      previous.find((row) => row.segmentId === segment.segmentId) ||
      previous.find((row) => !!segment.beatId && row.beatId === segment.beatId)
    if (!prior?.languageVersions) return segment
    const languageVersions = mergeLanguageClipVersions(
      segment.languageVersions,
      prior.languageVersions
    )
    return languageVersions ? { ...segment, languageVersions } : segment
  })
}
