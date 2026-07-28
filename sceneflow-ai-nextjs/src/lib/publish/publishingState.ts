import {
  getProjectStreams,
  mergeStreamsWithLanguages,
  type ProjectStream,
} from '@/lib/streams/projectStreams'
import type {
  ProjectPublishingState,
  PublishingReadiness,
  PublishingStreamRecord,
  StreamRenderSettings,
  YoutubePublishBundle,
} from '@/types/publishingAssets'
import { DEFAULT_STREAM_RENDER_SETTINGS } from '@/types/publishingAssets'
import { resolveStreamCoverage } from '@/lib/streams/projectStreams'
import type { BuildFinalCutClipsArgs } from '@/lib/final-cut/useFinalCutClips'

type ProjectLike = NonNullable<BuildFinalCutClipsArgs['project']>

function emptyPublishingState(): ProjectPublishingState {
  return {
    streams: [],
    youtubeByLanguage: {},
  }
}

/** Read publishing state from project metadata, hydrating from legacy streams. */
export function getPublishingState(metadata: unknown, project?: ProjectLike): ProjectPublishingState {
  const visionPhase = (metadata as { visionPhase?: Record<string, unknown> } | null)?.visionPhase
  const raw = visionPhase?.publishing as ProjectPublishingState | undefined

  const legacyStreams = getProjectStreams(metadata)
  const mergedStreams: PublishingStreamRecord[] = project
    ? mergeStreamsWithLanguages(metadata, project).map((s) => hydrateStreamRecord(s, raw?.streams))
    : legacyStreams.map((s) => hydrateStreamRecord(s, raw?.streams))

  if (!raw) {
    return {
      streams: mergedStreams,
      youtubeByLanguage: buildYoutubeFromStreams(mergedStreams),
      promo: undefined,
      readiness: computePublishingReadiness(project, mergedStreams),
    }
  }

  return {
    streams: mergedStreams.map((s) => {
      const fromRaw = raw.streams?.find(
        (r) => r.id === s.id || r.language === s.language
      )
      return hydrateStreamRecord(s, fromRaw ? [fromRaw] : undefined)
    }),
    promo: raw.promo,
    youtubeByLanguage: { ...buildYoutubeFromStreams(mergedStreams), ...raw.youtubeByLanguage },
    readiness: raw.readiness ?? computePublishingReadiness(project, mergedStreams),
  }
}

function hydrateStreamRecord(
  stream: ProjectStream,
  rawStreams?: PublishingStreamRecord[]
): PublishingStreamRecord {
  const match = rawStreams?.find(
    (r) => r.id === stream.id || r.language === stream.language
  )
  return {
    ...stream,
    renderSettings: match?.renderSettings ?? DEFAULT_STREAM_RENDER_SETTINGS,
    publish: { ...stream.publish, ...match?.publish },
    screeningId: match?.screeningId,
  }
}

function buildYoutubeFromStreams(
  streams: PublishingStreamRecord[]
): Record<string, YoutubePublishBundle> {
  const out: Record<string, YoutubePublishBundle> = {}
  for (const stream of streams) {
    if (stream.language) {
      out[stream.language] = buildYoutubeBundleFromStream(stream)
    }
  }
  return out
}

function buildYoutubeBundleFromStream(stream: PublishingStreamRecord): YoutubePublishBundle {
  return {
    language: stream.language,
    title: '',
    description: '',
    privacyStatus: 'private',
    youtubeUrl: stream.publish?.youtubeUrl,
    publishedAt: stream.publish?.publishedAt,
    status: stream.publish?.youtubeUrl ? 'published' : 'draft',
  }
}

export function computePublishingReadiness(
  project: ProjectLike | undefined,
  streams: PublishingStreamRecord[]
): PublishingReadiness {
  const blockers: string[] = []
  let readyStreamCount = 0

  for (const stream of streams) {
    if (stream.status === 'ready' && stream.mp4Url) {
      readyStreamCount += 1
    } else if (project) {
      const coverage = resolveStreamCoverage(
        project,
        stream.language,
        stream.format,
        stream.finalCutSnapshot
      )
      if (coverage.missing > 0) {
        blockers.push(
          `${stream.language}: ${coverage.missing} scene(s) missing renders`
        )
      }
    }
  }

  if (readyStreamCount === 0 && streams.length > 0) {
    blockers.push('No language streams are ready — render a master first')
  }

  return {
    lastCheckedAt: new Date().toISOString(),
    blockers: Array.from(new Set(blockers)),
    readyStreamCount,
    totalStreamCount: streams.length,
  }
}

export function upsertPublishingState(
  metadata: Record<string, unknown>,
  patch: Partial<ProjectPublishingState>
): Record<string, unknown> {
  const visionPhase = (metadata.visionPhase as Record<string, unknown>) || {}
  const current = (visionPhase.publishing as ProjectPublishingState) || emptyPublishingState()

  const next: ProjectPublishingState = {
    streams: patch.streams ?? current.streams,
    promo: patch.promo ?? current.promo,
    youtubeByLanguage: patch.youtubeByLanguage ?? current.youtubeByLanguage,
    readiness: patch.readiness ?? current.readiness,
  }

  // Keep legacy visionPhase.streams in sync for backward compatibility
  return {
    ...metadata,
    visionPhase: {
      ...visionPhase,
      streams: next.streams,
      publishing: next,
    },
  }
}

export function upsertPublishingStream(
  metadata: Record<string, unknown>,
  stream: PublishingStreamRecord
): Record<string, unknown> {
  const state = getPublishingState(metadata)
  const idx = state.streams.findIndex(
    (s) => s.id === stream.id || s.language === stream.language
  )
  const nextStreams = [...state.streams]
  if (idx >= 0) {
    nextStreams[idx] = { ...nextStreams[idx], ...stream }
  } else {
    nextStreams.push(stream)
  }
  return upsertPublishingState(metadata, {
    streams: nextStreams,
    readiness: computePublishingReadiness(undefined, nextStreams),
  })
}

export function upsertYoutubeBundle(
  metadata: Record<string, unknown>,
  language: string,
  bundle: Partial<YoutubePublishBundle>
): Record<string, unknown> {
  const state = getPublishingState(metadata)
  const existing = state.youtubeByLanguage[language] ?? {
    language,
    title: '',
    description: '',
    privacyStatus: 'private' as const,
    status: 'draft' as const,
  }
  return upsertPublishingState(metadata, {
    youtubeByLanguage: {
      ...state.youtubeByLanguage,
      [language]: { ...existing, ...bundle, language },
    },
  })
}

export function resolveStreamRenderSettings(
  stream: PublishingStreamRecord | undefined
): StreamRenderSettings {
  return stream?.renderSettings ?? DEFAULT_STREAM_RENDER_SETTINGS
}
