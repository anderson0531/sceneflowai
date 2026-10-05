type NativeFullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
}

/** Phones use the native video player so the clip can rotate into landscape. */
export function isPhoneViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 767px)').matches
}

/**
 * Enter native video fullscreen from a click.
 * iOS uses webkitEnterFullscreen; other phones use the Fullscreen API.
 */
export function enterPhoneVideoFullscreen(video: HTMLVideoElement): boolean {
  const element = video as NativeFullscreenVideo
  if (typeof element.webkitEnterFullscreen === 'function') {
    try {
      element.webkitEnterFullscreen()
      return true
    } catch {
      // Fall through to the standard Fullscreen API.
    }
  }
  if (typeof video.requestFullscreen === 'function') {
    void video.requestFullscreen().catch(() => {})
    return true
  }
  return false
}
