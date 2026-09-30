'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  shouldShowInstallOffer,
  type InstallSurface,
} from '@/lib/pwa/installPromptVisibility'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const NEVER_KEY = 'pwa-install-never-show'

function readNeverAsk(): boolean {
  try {
    return localStorage.getItem(NEVER_KEY) === 'true'
  } catch {
    return false
  }
}

export function AppInstallCard({
  surface,
  authStatus = 'unauthenticated',
  pathname = null,
}: {
  surface: InstallSurface
  authStatus?: string
  pathname?: string | null
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [neverAsk, setNeverAsk] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const isStandaloneDisplay =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    setStandalone(isStandaloneDisplay)
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent))
    setNeverAsk(readNeverAsk())

    const handler = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const visible = shouldShowInstallOffer({
    surface,
    authStatus,
    pathname,
    standalone,
    neverAsk,
    isIOS,
    hasDeferredPrompt: Boolean(deferredPrompt),
  })

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    } catch {
      // Ignore storage failures.
    }
  }, [])

  const never = useCallback(() => {
    setNeverAsk(true)
    try {
      localStorage.setItem(NEVER_KEY, 'true')
    } catch {
      // Ignore storage failures.
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } catch {
      // The browser rejected the prompt; hide the offer either way.
    }
    setDeferredPrompt(null)
    setDismissed(true)
  }, [deferredPrompt])

  if (!visible || dismissed) return null

  const instructions = !deferredPrompt
  const shell =
    surface === 'banner'
      ? 'fixed bottom-4 left-1/2 z-[120] w-[92%] max-w-xl -translate-x-1/2'
      : 'mb-4 w-full'

  return (
    <div className={shell}>
      <div className="rounded-xl border border-sf-border bg-sf-surface p-3 text-sf-text-primary shadow-lg sm:p-4">
        {instructions ? (
          <div>
            <div className="text-sm">
              <div className="mb-1 font-semibold">Add SceneFlow Studio to Home Screen</div>
              <div className="text-sf-text-secondary">
                {isIOS
                  ? 'Open the Share menu and tap "Add to Home Screen".'
                  : 'Open the browser menu and choose Install app, or Add to Home Screen.'}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={never}
                className="text-xs text-sf-text-secondary transition-colors hover:text-sf-text-primary"
              >
                Don&apos;t ask again
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-md border border-sf-border px-3 py-1.5 text-sm transition-colors hover:bg-gray-800/50"
              >
                Not now
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-semibold">Install SceneFlow Studio</div>
                <div className="text-sf-text-secondary">Get a faster, app-like experience.</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-md border border-sf-border px-3 py-1.5 text-sm transition-colors hover:bg-gray-800/50"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={() => void install()}
                  className="rounded-md bg-sf-gradient px-3 py-1.5 text-sm text-sf-background transition-opacity hover:opacity-90"
                >
                  Install
                </button>
              </div>
            </div>
            <div className="mt-2 border-t border-sf-border/50 pt-2">
              <button
                type="button"
                onClick={never}
                className="text-xs text-sf-text-secondary transition-colors hover:text-sf-text-primary"
              >
                Don&apos;t ask again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}