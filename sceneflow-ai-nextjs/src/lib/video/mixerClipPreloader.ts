/**
 * Mixer Clip Preloader & In-Memory Blob Cache
 *
 * Eagerly preloads and buffers video clips for ScenePreviewPlayer so that:
 * 1. Clips are fetched into memory (blob: URLs when CORS permits, or warm
 *    offscreen <video preload="auto"> elements as fallback) before playback starts.
 * 2. Switching between shots in the Mixer happens without cold network fetches
 *    or mid-cut decoder freezes.
 * 3. Re-opening the Mixer or switching tabs reuses already-loaded clips
 *    synchronously (0ms load time).
 */

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

export interface CachedClipEntry {
  originalUrl: string
  /** Blob object URL when CORS fetch succeeded, otherwise the warmed original URL */
  resolvedUrl: string
  objectUrlToRevoke?: string
  durationSec?: number
  status: 'loading' | 'ready' | 'error'
  promise?: Promise<CachedClipEntry>
  lastAccessedAt: number
}

const CLIP_PRELOAD_CACHE = new Map<string, CachedClipEntry>()
const WARM_VIDEO_POOL = new Map<string, HTMLVideoElement>()

const MAX_CACHED_CLIPS = 36
const MAX_WARM_VIDEOS = 14
const DEFAULT_CLIP_TIMEOUT_MS = 12000
const PRELOAD_CONCURRENCY = 4

function normalizeUrl(url: string | null | undefined): string {
  return typeof url === 'string' ? url.trim() : ''
}

function evictOldestIfNeeded(protectedUrls?: Set<string>) {
  if (CLIP_PRELOAD_CACHE.size <= MAX_CACHED_CLIPS) return

  const entries = Array.from(CLIP_PRELOAD_CACHE.entries())
    .filter(([url, entry]) => entry.status !== 'loading' && !protectedUrls?.has(url))
    .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt)

  while (CLIP_PRELOAD_CACHE.size > MAX_CACHED_CLIPS && entries.length > 0) {
    const [victimUrl, victim] = entries.shift()!
    if (victim.objectUrlToRevoke) {
      try {
        URL.revokeObjectURL(victim.objectUrlToRevoke)
      } catch {
        // Ignore revoke errors
      }
    }
    CLIP_PRELOAD_CACHE.delete(victimUrl)
    const warmVideo = WARM_VIDEO_POOL.get(victimUrl)
    if (warmVideo) {
      warmVideo.pause()
      warmVideo.removeAttribute('src')
      warmVideo.load()
      WARM_VIDEO_POOL.delete(victimUrl)
    }
  }
}

function retainWarmVideoElement(url: string, video: HTMLVideoElement) {
  WARM_VIDEO_POOL.set(url, video)
  if (WARM_VIDEO_POOL.size > MAX_WARM_VIDEOS) {
    const oldestKey = WARM_VIDEO_POOL.keys().next().value
    if (oldestKey && oldestKey !== url) {
      const oldVideo = WARM_VIDEO_POOL.get(oldestKey)
      if (oldVideo) {
        oldVideo.pause()
        oldVideo.removeAttribute('src')
        oldVideo.load()
      }
      WARM_VIDEO_POOL.delete(oldestKey)
    }
  }
}

/**
 * Look up a clip in the preload cache synchronously.
 */
export function getCachedClipEntry(url: string | null | undefined): CachedClipEntry | null {
  const key = normalizeUrl(url)
  if (!key) return null
  const entry = CLIP_PRELOAD_CACHE.get(key)
  if (!entry) return null
  entry.lastAccessedAt = Date.now()
  return entry
}

/**
 * Returns the fastest playable URL for a clip (an in-memory blob: URL if preloaded,
 * or the original URL as fallback).
 */
export function getResolvedClipUrl(url: string | null | undefined): string {
  const key = normalizeUrl(url)
  if (!key) return ''
  const entry = CLIP_PRELOAD_CACHE.get(key)
  if (entry && entry.status === 'ready' && entry.resolvedUrl) {
    entry.lastAccessedAt = Date.now()
    return entry.resolvedUrl
  }
  return key
}

/**
 * Check synchronously if every unique non-empty URL in the list is already preloaded.
 */
export function areAllClipUrlsCached(urls: Array<string | null | undefined>): boolean {
  const unique = Array.from(new Set(urls.map(normalizeUrl).filter(Boolean)))
  if (unique.length === 0) return true
  return unique.every((u) => {
    const entry = CLIP_PRELOAD_CACHE.get(u)
    return entry?.status === 'ready' || entry?.status === 'error'
  })
}

/**
 * Probe duration and first-frame readiness of a video URL using an offscreen HTMLVideoElement.
 */
function probeAndBufferVideoElement(
  srcUrl: string,
  originalUrl: string,
  keepWarmInPool: boolean,
  timeoutMs: number
): Promise<{ durationSec?: number; ok: boolean }> {
  if (!isBrowser) {
    return Promise.resolve({ ok: true })
  }

  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    let settled = false
    let durationSec: number | undefined
    let graceTimer: ReturnType<typeof setTimeout> | null = null

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      if (graceTimer) clearTimeout(graceTimer)
      clearTimeout(hardTimer)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('loadeddata', onLoadedData)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('canplaythrough', onCanPlayThrough)
      video.removeEventListener('error', onError)

      if (ok && keepWarmInPool) {
        retainWarmVideoElement(originalUrl, video)
      } else if (!keepWarmInPool) {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
      resolve({ durationSec, ok })
    }

    const captureDuration = () => {
      const d = video.duration
      if (Number.isFinite(d) && d > 0) {
        durationSec = d
      }
    }

    const onLoadedMetadata = () => {
      captureDuration()
      // For blob: URLs, metadata + local memory means the entire clip is already in RAM
      if (srcUrl.startsWith('blob:') && video.readyState >= 1) {
        finish(true)
      }
    }

    const onLoadedData = () => {
      captureDuration()
      if (srcUrl.startsWith('blob:')) {
        finish(true)
        return
      }
      // If canplaythrough doesn't fire within 1.2s after loadeddata, readyState >= 2 is sufficient
      if (!graceTimer) {
        graceTimer = setTimeout(() => {
          finish(true)
        }, 1200)
      }
    }

    const onCanPlay = () => {
      captureDuration()
      if (srcUrl.startsWith('blob:') || video.readyState >= 3) {
        finish(true)
        return
      }
      if (!graceTimer) {
        graceTimer = setTimeout(() => {
          finish(true)
        }, 600)
      }
    }

    const onCanPlayThrough = () => {
      captureDuration()
      finish(true)
    }

    const onError = () => {
      finish(false)
    }

    const hardTimer = setTimeout(() => {
      captureDuration()
      finish(video.readyState >= 1)
    }, timeoutMs)

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('loadeddata', onLoadedData)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('canplaythrough', onCanPlayThrough)
    video.addEventListener('error', onError)

    video.src = srcUrl
    video.load()
  })
}

/**
 * Preload a single video clip into memory (blob: URL if CORS allows, or warm <video> buffer).
 */
export function preloadVideoClip(
  rawUrl: string,
  options?: { timeoutMs?: number }
): Promise<CachedClipEntry> {
  const url = normalizeUrl(rawUrl)
  if (!url || !isBrowser) {
    return Promise.resolve({
      originalUrl: url,
      resolvedUrl: url,
      status: 'ready',
      lastAccessedAt: Date.now(),
    })
  }

  const existing = CLIP_PRELOAD_CACHE.get(url)
  if (existing) {
    existing.lastAccessedAt = Date.now()
    if (existing.status === 'ready') {
      return Promise.resolve(existing)
    }
    if (existing.status === 'loading' && existing.promise) {
      return existing.promise
    }
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_CLIP_TIMEOUT_MS

  const entry: CachedClipEntry = {
    originalUrl: url,
    resolvedUrl: url,
    status: 'loading',
    lastAccessedAt: Date.now(),
  }

  const loadPromise = (async (): Promise<CachedClipEntry> => {
    // If already a blob: or data: URL, just probe duration
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      const probe = await probeAndBufferVideoElement(url, url, false, timeoutMs)
      entry.durationSec = probe.durationSec
      entry.status = probe.ok ? 'ready' : 'error'
      entry.lastAccessedAt = Date.now()
      delete entry.promise
      return entry
    }

    // Step 1: Attempt CORS fetch into an in-memory Blob URL for instant 0ms seeking & switching
    try {
      const controller = new AbortController()
      const fetchTimer = setTimeout(() => controller.abort(), timeoutMs)
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
      })
      clearTimeout(fetchTimer)

      if (response.ok) {
        const blob = await response.blob()
        if (blob.size > 0) {
          const blobUrl = URL.createObjectURL(blob)
          const probe = await probeAndBufferVideoElement(blobUrl, url, false, 4000)
          if (probe.ok) {
            entry.resolvedUrl = blobUrl
            entry.objectUrlToRevoke = blobUrl
            entry.durationSec = probe.durationSec
            entry.status = 'ready'
            entry.lastAccessedAt = Date.now()
            delete entry.promise
            return entry
          } else {
            URL.revokeObjectURL(blobUrl)
          }
        }
      }
    } catch {
      // CORS or network fetch error — fall back to native <video preload="auto"> buffering
    }

    // Step 2: Fallback to native offscreen <video preload="auto"> element buffering
    const fallbackProbe = await probeAndBufferVideoElement(url, url, true, timeoutMs)
    entry.resolvedUrl = url
    entry.durationSec = fallbackProbe.durationSec
    entry.status = fallbackProbe.ok ? 'ready' : 'error'
    entry.lastAccessedAt = Date.now()
    delete entry.promise
    return entry
  })()

  entry.promise = loadPromise
  CLIP_PRELOAD_CACHE.set(url, entry)

  return loadPromise
}

export interface PreloadSceneClipsCallbacks {
  onProgress?: (loadedCount: number, totalCount: number) => void
  onDurationsMeasured?: (durationsBySegmentId: Record<string, number>) => void
}

/**
 * Preload all video clips for a scene in sequence order with bounded concurrency.
 */
export async function preloadSceneVideoClips(
  segments: Array<{ segmentId: string; activeAssetUrl?: string | null }>,
  callbacks?: PreloadSceneClipsCallbacks,
  signal?: AbortSignal
): Promise<{
  resolvedUrlsBySegmentId: Record<string, string>
  durationsBySegmentId: Record<string, number>
}> {
  const validSegments = segments.filter((s) => Boolean(normalizeUrl(s.activeAssetUrl)))
  const uniqueUrls = Array.from(
    new Set(validSegments.map((s) => normalizeUrl(s.activeAssetUrl)).filter(Boolean))
  )

  const protectedSet = new Set(uniqueUrls)
  evictOldestIfNeeded(protectedSet)

  const totalCount = uniqueUrls.length
  if (totalCount === 0) {
    callbacks?.onProgress?.(0, 0)
    return { resolvedUrlsBySegmentId: {}, durationsBySegmentId: {} }
  }

  let loadedCount = 0
  const durationsByUrl = new Map<string, number>()
  const resolvedByUrl = new Map<string, string>()

  // Count already-ready clips immediately
  const pendingUrls: string[] = []
  for (const url of uniqueUrls) {
    const cached = CLIP_PRELOAD_CACHE.get(url)
    if (cached && (cached.status === 'ready' || cached.status === 'error')) {
      cached.lastAccessedAt = Date.now()
      loadedCount += 1
      resolvedByUrl.set(url, cached.resolvedUrl || url)
      if (cached.durationSec && Number.isFinite(cached.durationSec) && cached.durationSec > 0) {
        durationsByUrl.set(url, cached.durationSec)
      }
    } else {
      pendingUrls.push(url)
    }
  }

  callbacks?.onProgress?.(loadedCount, totalCount)

  const emitDurations = () => {
    if (!callbacks?.onDurationsMeasured) return
    const durationsBySegmentId: Record<string, number> = {}
    for (const seg of validSegments) {
      const u = normalizeUrl(seg.activeAssetUrl)
      const d = durationsByUrl.get(u)
      if (d != null && Number.isFinite(d) && d > 0) {
        durationsBySegmentId[seg.segmentId] = d
      }
    }
    if (Object.keys(durationsBySegmentId).length > 0) {
      callbacks.onDurationsMeasured(durationsBySegmentId)
    }
  }

  if (durationsByUrl.size > 0) {
    emitDurations()
  }

  if (pendingUrls.length > 0 && !signal?.aborted) {
    let cursor = 0
    const workerCount = Math.min(PRELOAD_CONCURRENCY, pendingUrls.length)

    const workers = Array.from({ length: workerCount }, async () => {
      while (cursor < pendingUrls.length && !signal?.aborted) {
        const index = cursor++
        const url = pendingUrls[index]
        const entry = await preloadVideoClip(url)
        if (signal?.aborted) return

        resolvedByUrl.set(url, entry.resolvedUrl || url)
        if (entry.durationSec && Number.isFinite(entry.durationSec) && entry.durationSec > 0) {
          durationsByUrl.set(url, entry.durationSec)
        }
        loadedCount += 1
        callbacks?.onProgress?.(loadedCount, totalCount)
        emitDurations()
      }
    })

    await Promise.all(workers)
  }

  const resolvedUrlsBySegmentId: Record<string, string> = {}
  const durationsBySegmentId: Record<string, number> = {}
  for (const seg of validSegments) {
    const u = normalizeUrl(seg.activeAssetUrl)
    resolvedUrlsBySegmentId[seg.segmentId] = resolvedByUrl.get(u) || u
    const d = durationsByUrl.get(u)
    if (d != null && Number.isFinite(d) && d > 0) {
      durationsBySegmentId[seg.segmentId] = d
    }
  }

  return { resolvedUrlsBySegmentId, durationsBySegmentId }
}
