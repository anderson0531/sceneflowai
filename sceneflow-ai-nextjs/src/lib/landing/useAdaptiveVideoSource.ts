'use client'

import { useEffect, useRef, type RefObject } from 'react'

export type AdaptiveVideoSources = {
  hlsSrc?: string
  mp4Src: string
  /** Used when the preferred MP4 404s (web encode not uploaded yet). */
  mp4SrcFallback?: string
}

function stripHash(url: string): string {
  const hash = url.indexOf('#')
  return hash >= 0 ? url.slice(0, hash) : url
}

function canPlayNativeHls(video: HTMLVideoElement): boolean {
  return video.canPlayType('application/vnd.apple.mpegurl') !== ''
}

/**
 * Attach HLS (hls.js or native Safari) or progressive MP4 to a video element.
 */
export function useAdaptiveVideoSource(
  videoRef: RefObject<HTMLVideoElement | null>,
  sources: AdaptiveVideoSources,
  enabled = true
): void {
  const hlsRef = useRef<import('hls.js').default | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !enabled) return

    const mp4 = sources.mp4Src
    const mp4Fallback = sources.mp4SrcFallback?.trim()
    const hls = sources.hlsSrc?.trim()

    let cancelled = false

    const destroyHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }

    const loadMp4 = (url = mp4) => {
      destroyHls()
      if (stripHash(video.src) !== stripHash(url)) {
        video.src = url
        video.load()
      }
    }

    const onProgressiveError = () => {
      if (!mp4Fallback || stripHash(video.src) === stripHash(mp4Fallback)) return
      console.warn('[Hero video] preferred MP4 failed, falling back', video.src)
      loadMp4(mp4Fallback)
    }

    const attach = async () => {
      if (!hls) {
        loadMp4()
        return
      }

      if (canPlayNativeHls(video)) {
        destroyHls()
        if (stripHash(video.src) !== stripHash(hls)) {
          video.src = hls
          video.load()
        }
        return
      }

      const { default: HlsConstructor } = await import('hls.js')
      if (cancelled) return

      if (!HlsConstructor.isSupported()) {
        loadMp4()
        return
      }

      destroyHls()
      const instance = new HlsConstructor({
        enableWorker: true,
        lowLatencyMode: false,
        // Let ABR pick the rung, but never request 1080p for a 360px hero tile.
        startLevel: -1,
        capLevelToPlayerSize: true,
        // Assume a modest first hop so the first segments are 360p, not 1080p.
        abrEwmaDefaultEstimate: 500_000,
      })
      hlsRef.current = instance
      instance.on(HlsConstructor.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        console.warn('[Hero HLS] fatal error, falling back to MP4', data.type, data.details)
        loadMp4()
      })
      instance.loadSource(hls)
      instance.attachMedia(video)
    }

    video.addEventListener('error', onProgressiveError)
    void attach()

    return () => {
      cancelled = true
      video.removeEventListener('error', onProgressiveError)
      destroyHls()
    }
  }, [enabled, sources.hlsSrc, sources.mp4Src, sources.mp4SrcFallback, videoRef])
}
