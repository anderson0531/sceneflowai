"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { canShowInstallPrompt } from '@/lib/pwa/installPromptVisibility'

export default function InstallPrompt() {
  const { status } = useSession()
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const allowed = canShowInstallPrompt(status, pathname)

  useEffect(() => {
    const isStandaloneDisplay =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone
    setIsStandalone(!!isStandaloneDisplay)

    const ua = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(ua))

    try {
      if (localStorage.getItem('pwa-install-never-show') === 'true') {
        return
      }
    } catch {
      // Ignore localStorage errors
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    if (!allowed || isStandalone) {
      setShowBanner(false)
      return
    }

    try {
      if (localStorage.getItem('pwa-install-never-show') === 'true') {
        setShowBanner(false)
        return
      }
    } catch {
      // Ignore localStorage errors
    }

    if (isIOS || deferredPrompt) {
      setShowBanner(true)
    }
  }, [allowed, isStandalone, isIOS, deferredPrompt])

  if (!allowed) return null
  if (isStandalone) return null
  if (!showBanner) return null
  if (!isIOS && !deferredPrompt) return null

  const handleDismiss = () => {
    setShowBanner(false)
    try {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    } catch {
      // Ignore localStorage errors
    }
  }

  const handleDontAskAgain = () => {
    setShowBanner(false)
    try {
      localStorage.setItem('pwa-install-never-show', 'true')
    } catch {
      // Ignore localStorage errors
    }
  }

  const install = async () => {
    try {
      if (deferredPrompt) {
        deferredPrompt.prompt()
        await deferredPrompt.userChoice
        setShowBanner(false)
        setDeferredPrompt(null)
      }
    } catch {
      setShowBanner(false)
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl">
      <div className="rounded-xl border border-sf-border bg-sf-surface text-sf-text-primary shadow-lg p-3 sm:p-4">
        {!isIOS && deferredPrompt && (
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-semibold">Install SceneFlow AI</div>
                <div className="text-sf-text-secondary">Get a faster, app-like experience.</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-md border border-sf-border text-sm hover:bg-gray-800/50 transition-colors"
                >
                  Not now
                </button>
                <button
                  onClick={install}
                  className="px-3 py-1.5 rounded-md bg-sf-gradient text-sf-background text-sm hover:opacity-90 transition-opacity"
                >
                  Install
                </button>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-sf-border/50">
              <button
                onClick={handleDontAskAgain}
                className="text-xs text-sf-text-secondary hover:text-sf-text-primary transition-colors"
              >
                Don't ask again
              </button>
            </div>
          </div>
        )}
        {isIOS && (
          <div>
            <div className="text-sm">
              <div className="font-semibold mb-1">Add SceneFlow AI to Home Screen</div>
              <div className="text-sf-text-secondary">
                Open the Share menu and tap "Add to Home Screen".
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={handleDontAskAgain}
                className="text-xs text-sf-text-secondary hover:text-sf-text-primary transition-colors"
              >
                Don't ask again
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-md border border-sf-border text-sm hover:bg-gray-800/50 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
