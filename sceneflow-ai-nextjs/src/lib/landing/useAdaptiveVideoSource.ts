'use client'

import { useEffect, useRef, type RefObject } from 'react'

export type AdaptiveVideoSources = {
  hlsSrc?: string
  mp4Src: string
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
    const hls = sources.hlsSrc?.trim()

    let cancelled = false

    const destroyHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }

    const loadMp4 = () => {
      destroyHls()
      const next = mp4
      if (stripHash(video.src) !== stripHash(next)) {
        video.src = next
        video.load()
      }
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
        startLevel: -1,
      })
      hlsRef.current = instance
      instance.loadSource(hls)
      instance.attachMedia(video)
    }

    void attach()

    return () => {
      cancelled = true
      destroyHls()
    }
  }, [enabled, sources.hlsSrc, sources.mp4Src, videoRef])
}
