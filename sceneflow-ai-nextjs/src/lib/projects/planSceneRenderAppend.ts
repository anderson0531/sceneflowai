import { getNextProductionStreamVersion } from '@/components/vision/scene-production/defaults'
import type { ProductionStream } from '@/components/vision/scene-production/types'

export interface PlannedSceneRenderAppend {
  streams: ProductionStream[]
  renderedSceneUrl: string
  renderedAt: string
}

function asStreamList(value: ProductionStream[] | null | undefined): ProductionStream[] {
  return Array.isArray(value) ? value : []
}

/**
 * Add one finished render to the stream list.
 * A repeated id replaces that row. Shot clips are not part of this value.
 */
export function planSceneRenderAppend(input: {
  streams?: ProductionStream[] | null
  renderedSceneUrl?: string | null
  stream: ProductionStream
  previousUrl?: string
  now?: string
}): PlannedSceneRenderAppend {
  const now = input.now ?? new Date().toISOString()
  const streams = asStreamList(input.streams)
  const streamId = input.stream.id
  const previous = streams.find((stream) => stream.id === streamId)
  const streamType = input.stream.streamType === 'animatic' ? 'animatic' : 'video'
  const streamVersion =
    previous?.streamVersion ??
    getNextProductionStreamVersion(
      streams.filter((stream) => stream.id !== streamId),
      input.stream.language,
      streamType
    )
  const duration = input.stream.duration ?? previous?.duration
  const nextStream: ProductionStream = {
    ...previous,
    ...input.stream,
    streamType,
    streamVersion,
    status: 'complete',
    source: input.stream.source ?? previous?.source ?? 'render',
    completedAt: input.stream.completedAt || now,
    ...(duration !== undefined ? { duration } : {}),
  }
  const nextStreams = previous
    ? streams.map((stream) => (stream.id === streamId ? nextStream : stream))
    : [...streams, nextStream]

  const currentUrl = input.renderedSceneUrl?.trim() || ''
  const previousUrl = input.previousUrl?.trim() || ''
  const downloadUrl = nextStream.mp4Url?.trim() || ''
  const renderedSceneUrl =
    previousUrl && currentUrl && currentUrl !== previousUrl ? currentUrl : downloadUrl || currentUrl

  return {
    streams: nextStreams,
    renderedSceneUrl,
    renderedAt: now,
  }
}

/** Local scene row after a render is added. Existing shot fields stay as they are. */
export function withAppendedProductionStream<
  T extends {
    productionStreams?: ProductionStream[]
    renderedSceneUrl?: string | null
    renderedAt?: string | null
  },
>(current: T, stream: ProductionStream, previousUrl?: string): T {
  const planned = planSceneRenderAppend({
    streams: current.productionStreams,
    renderedSceneUrl: current.renderedSceneUrl,
    stream,
    previousUrl,
  })
  return {
    ...current,
    productionStreams: planned.streams,
    renderedSceneUrl: planned.renderedSceneUrl,
    renderedAt: planned.renderedAt,
  }
}
