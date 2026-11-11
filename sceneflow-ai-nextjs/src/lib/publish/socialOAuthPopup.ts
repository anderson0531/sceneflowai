import {
  isTrustedSceneFlowOrigin,
  type SocialOAuthPlatform,
  type SocialOAuthPopupStatus,
} from '@/lib/publish/oauthPopupResponse'

export interface SocialOAuthCompletionEvent {
  type: 'sceneflow:social-oauth'
  platform: SocialOAuthPlatform
  status: SocialOAuthPopupStatus | 'popup_closed'
  message?: string
  ts?: number
}

export interface OpenSocialOAuthPopupOptions {
  platform: SocialOAuthPlatform
  authUrl: string
  onComplete: (result: SocialOAuthCompletionEvent) => void
}

/**
 * Opens a centered OAuth login & consent popup window (e.g. Google Sign-In for YouTube)
 * so the user stays inside SceneFlow Studio without a full-page reload.
 * Falls back cleanly to full-page redirect only if the browser blocks popups.
 */
export function openSocialOAuthPopup({
  platform,
  authUrl,
  onComplete,
}: OpenSocialOAuthPopupOptions): { usedPopup: boolean; cleanup: () => void } {
  if (typeof window === 'undefined') {
    return { usedPopup: false, cleanup: () => undefined }
  }

  const popupUrl = new URL(authUrl, window.location.origin)
  popupUrl.searchParams.set('popup', '1')

  const width = 540
  const height = 680
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2))
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2))
  const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`

  const popup = window.open(
    popupUrl.toString(),
    `sceneflow_${platform}_oauth`,
    features
  )

  if (!popup) {
    // Never navigate the main Studio tab away (prevents cross-domain logout & unsaved state loss).
    onComplete({
      type: 'sceneflow:social-oauth',
      platform,
      status: 'error',
      message:
        'Your browser blocked the sign-in popup window. Please allow popups for SceneFlow and click Authorize again.',
    })
    return { usedPopup: false, cleanup: () => undefined }
  }

  try {
    popup.focus()
  } catch {
    // Ignore focus errors
  }

  let finished = false
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let bc: BroadcastChannel | null = null

  const finish = (event: SocialOAuthCompletionEvent) => {
    if (finished) return
    finished = true
    cleanup()
    onComplete(event)
  }

  const isMatchingPayload = (raw: unknown): raw is SocialOAuthCompletionEvent => {
    if (!raw || typeof raw !== 'object') return false
    const rec = raw as Record<string, unknown>
    return rec.type === 'sceneflow:social-oauth' && rec.platform === platform && typeof rec.status === 'string'
  }

  const onWindowMessage = (evt: MessageEvent) => {
    if (evt.origin !== window.location.origin && !isTrustedSceneFlowOrigin(evt.origin)) return
    if (isMatchingPayload(evt.data)) {
      finish(evt.data)
    }
  }

  const onStorage = (evt: StorageEvent) => {
    if (evt.key !== 'sceneflow:social-oauth' || !evt.newValue) return
    try {
      const parsed = JSON.parse(evt.newValue) as unknown
      if (isMatchingPayload(parsed)) {
        finish(parsed)
      }
    } catch {
      // Ignore malformed storage payload
    }
  }

  window.addEventListener('message', onWindowMessage)
  window.addEventListener('storage', onStorage)

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('sceneflow-social-oauth')
      bc.onmessage = (evt: MessageEvent) => {
        if (isMatchingPayload(evt.data)) {
          finish(evt.data)
        }
      }
    }
  } catch {
    bc = null
  }

  pollTimer = setInterval(() => {
    try {
      if (popup.closed) {
        // Give BroadcastChannel / storage event 200ms to arrive before resolving as popup_closed
        setTimeout(() => {
          finish({
            type: 'sceneflow:social-oauth',
            platform,
            status: 'popup_closed',
          })
        }, 200)
      }
    } catch {
      // Cross-origin access error while popup is on accounts.google.com — normal in some browsers
    }
  }, 600)

  function cleanup() {
    window.removeEventListener('message', onWindowMessage)
    window.removeEventListener('storage', onStorage)
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    if (bc) {
      try {
        bc.close()
      } catch {
        // Ignore
      }
      bc = null
    }
  }

  return { usedPopup: true, cleanup }
}
