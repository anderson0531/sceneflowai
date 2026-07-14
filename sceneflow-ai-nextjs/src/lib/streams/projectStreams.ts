import { buildFinalCutClips, type BuildFinalCutClipsArgs } from '@/lib/final-cut/useFinalCutClips'
import { getAvailablePublishLanguages } from '@/lib/publish/buildLanguageAudioTrack'
import type { FinalCutSelection, ProductionFormat } from '@/lib/types/finalCut'

type ProjectLike = NonNullable<BuildFinalCutClipsArgs['project']>

export interface ProjectStreamPublish {
  shareUrl?: string
  shareSlug?: string
  youtubeUrl?: string
  publishedAt?: string
}

export interface ProjectStream {
  id: string
  language: string
  format: 'animatic' | 'full-video'
  status: 'draft' | 'rendering' | 'ready' | 'error'
  mp4Url?: string | null
  renderedAt?: string
  jobId?: string
  finalCutSnapshot?: FinalCutSelection
  publish?: ProjectStreamPublish
  localize?: StreamLocalizeState
}

export type StreamLocalizeMode = 'off' | 'dub' | 'lipsync'

export type StreamStemMode = 'mute-all' | 'keep-background'

export type StreamLocalizeStatus =
  | 'idle'
  | 'preparing'
  | 'lipsyncing'
  | 'rendering'
  | 'stitching'
  | 'ready'
  | 'error'

export interface StreamLocalizeSceneStatus {
  status: string
  mp4Url?: string
  jobId?: string
  error?: string
}

export interface StreamLocalizeState {
  mode: StreamLocalizeMode
  /** Global dialogue playback rate (0.5–1.5). */
  speed: number
  stemMode: StreamStemMode
  status: StreamLocalizeStatus
  sceneStatuses?: Record<string, StreamLocalizeSceneStatus>
  updatedAt?: string
  error?: string
}

export const DEFAULT_STREAM_LOCALIZE_STATE: StreamLocalizeState = {
  mode: 'dub',
  speed: 1,
  stemMode: 'keep-background',
  status: 'idle',
}

export function getLocalizeState(stream: ProjectStream): StreamLocalizeState {
  return {
    ...DEFAULT_STREAM_LOCALIZE_STATE,
    ...stream.localize,
  }
}

export function withLocalizeState(
  stream: ProjectStream,
  patch: Partial<StreamLocalizeState>
): ProjectStream {
  return {
    ...stream,
    localize: {
      ...getLocalizeState(stream),
      ...patch,
      updatedAt: new Date().toISOString(),
    },
  }
}

export function isLocalizeEligibleLanguage(language: string): boolean {
  return language !== 'en'
}

export interface StreamCoverage {
  ready: number
  pending: number
  missing: number
  total: number
}

export function getProjectStreams(metadata: unknown): ProjectStream[] {
  const streams = (metadata as { visionPhase?: { streams?: ProjectStream[] } } | null)?.visionPhase
    ?.streams
  return Array.isArray(streams) ? streams : []
}

export function findStreamByLanguage(
  streams: ProjectStream[],
  language: string
): ProjectStream | undefined {
  return streams.find((s) => s.language === language)
}

export function findStreamMaster(
  streams: ProjectStream[],
  language: string,
  format?: ProductionFormat
): ProjectStream | null {
  const ready = streams.filter(
    (s) => s.status === 'ready' && s.mp4Url && s.language === language
  )
  if (format) {
    return ready.find((s) => s.format === format) ?? null
  }
  return (
    ready.find((s) => s.format === 'full-video') ??
    ready.find((s) => s.format === 'animatic') ??
    null
  )
}

export function upsertProjectStream(
  metadata: Record<string, unknown>,
  stream: ProjectStream
): Record<string, unknown> {
  const visionPhase = (metadata.visionPhase as Record<string, unknown>) || {}
  const existing = getProjectStreams(metadata)
  const idx = existing.findIndex(
    (s) => s.id === stream.id || s.language === stream.language
  )
  const next = [...existing]
  if (idx >= 0) {
    next[idx] = { ...next[idx], ...stream }
  } else {
    next.push(stream)
  }
  return {
    ...metadata,
    visionPhase: {
      ...visionPhase,
      streams: next,
    },
  }
}

export function deriveStreamLanguages(project: ProjectLike): string[] {
  return getAvailablePublishLanguages(project.metadata)
}

export function buildDraftStream(language: string): ProjectStream {
  return {
    id: `stream-${language}`,
    language,
    format: 'full-video',
    status: 'draft',
  }
}

export function mergeStreamsWithLanguages(
  metadata: unknown,
  project: ProjectLike
): ProjectStream[] {
  const stored = getProjectStreams(metadata)
  const languages = deriveStreamLanguages(project)
  const merged: ProjectStream[] = []

  for (const language of languages) {
    const existing = findStreamByLanguage(stored, language)
    merged.push(existing ?? buildDraftStream(language))
  }

  for (const stream of stored) {
    if (!merged.some((s) => s.language === stream.language)) {
      merged.push(stream)
    }
  }

  return merged.sort((a, b) => a.language.localeCompare(b.language))
}

export function resolveStreamCoverage(
  project: ProjectLike,
  language: string,
  format: ProductionFormat,
  finalCutSnapshot?: FinalCutSelection
): StreamCoverage {
  const selection: FinalCutSelection =
    finalCutSnapshot ??
    ({
      format,
      language,
      presetId: format === 'animatic' ? 'all-animatic' : 'all-video',
      perSceneOverrides: {},
    } as FinalCutSelection)

  const clips = buildFinalCutClips({ project, selection })
  let ready = 0
  let pending = 0
  let missing = 0

  for (const clip of clips) {
    if (clip.status === 'ready') ready += 1
    else if (clip.status === 'pending') pending += 1
    else missing += 1
  }

  return { ready, pending, missing, total: clips.length }
}

export function getReadyStreamLanguages(streams: ProjectStream[]): string[] {
  return Array.from(
    new Set(
      streams
        .filter((s) => s.status === 'ready' && s.mp4Url)
        .map((s) => s.language)
    )
  ).sort()
}

/** Languages configured in Streams tab (always includes English as source). */
export function getConfiguredStreamLanguages(streams: ProjectStream[]): string[] {
  const langs = new Set<string>(['en'])
  for (const s of streams) {
    if (s.language?.trim()) langs.add(s.language.trim())
  }
  return Array.from(langs).sort((a, b) => {
    if (a === 'en') return -1
    if (b === 'en') return 1
    return a.localeCompare(b)
  })
}
