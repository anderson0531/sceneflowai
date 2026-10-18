type NativeFullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
  webkitExitFullscreen?: () => void
  webkitDisplayingFullscreen?: boolean
  webkitRequestFullscreen?: () => Promise<void> | void
}

/** Phones use the native video player so the clip can rotate into landscape. */
export function isPhoneViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 767px)').matches
}

/** Touch phones, including landscape, where the page itself must not go fullscreen. */
export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: none) and (pointer: coarse), (max-width: 767px)').matches
}

/**
 * True on handsets in both portrait and landscape (short viewport edge < 768px)
 * so rotating a phone to landscape does not flip responsive `md:` layouts and
 * unmount/hide an active fullscreen video.
 */
export function isPhoneHandset(): boolean {
  if (typeof window === 'undefined') return false
  const shortEdge = Math.min(window.innerWidth, window.innerHeight)
  return isCoarsePointer() && shortEdge > 0 && shortEdge < 768
}

export function isNativeVideoFullscreen(video: HTMLVideoElement): boolean {
  return Boolean((video as NativeFullscreenVideo).webkitDisplayingFullscreen)
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
      // If metadata has not finished loading yet, enter fullscreen as soon as it is ready.
      if (video.readyState < 1) {
        const enterWhenReady = () => {
          video.removeEventListener('loadedmetadata', enterWhenReady)
          video.removeEventListener('canplay', enterWhenReady)
          try {
            element.webkitEnterFullscreen?.()
          } catch {
            // Ignore if the user navigated away before metadata loaded.
          }
        }
        video.addEventListener('loadedmetadata', enterWhenReady, { once: true })
        video.addEventListener('canplay', enterWhenReady, { once: true })
        return true
      }
      // Fall through to the standard Fullscreen API.
    }
  }
  if (typeof video.requestFullscreen === 'function') {
    void video.requestFullscreen().catch(() => {
      try {
        element.webkitEnterFullscreen?.()
      } catch {
        // Ignore fallback failure.
      }
    })
    return true
  }
  if (typeof element.webkitRequestFullscreen === 'function') {
    try {
      void element.webkitRequestFullscreen()
      return true
    } catch {
      return false
    }
  }
  return false
}
