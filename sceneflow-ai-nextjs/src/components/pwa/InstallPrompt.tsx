"use client"

import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detect installed / display-mode
    const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    setIsStandalone(!!isStandaloneDisplay)

    // iOS heuristic
    const ua = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(ua))

    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler as any)

    return () => window.removeEventListener('beforeinstallprompt', handler as any)
  }, [])

  if (isStandalone || (!deferredPrompt && !isIOS)) return null

  const install = async () => {
    try {
      if (deferredPrompt) {
        deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        // Hide regardless of outcome; we can re-show later if dismissed
        setShowBanner(false)
        setDeferredPrompt(null)
        // optionally: log choice.outcome
      }
    } catch {
      setShowBanner(false)
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl">
      <div className="rounded-xl border border-sf-border bg-sf-surface text-sf-text-primary shadow-lg p-3 sm:p-4">
        {!isIOS && deferredPrompt && (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-semibold">Install SceneFlow AI</div>
              <div className="text-sf-text-secondary">Get a faster, app-like experience.</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowBanner(false)} className="px-3 py-1.5 rounded-md border border-sf-border text-sm">Not now</button>
              <button onClick={install} className="px-3 py-1.5 rounded-md bg-sf-gradient text-sf-background text-sm">Install</button>
            </div>
          </div>
        )}
        {isIOS && (
          <div className="text-sm">
            <div className="font-semibold mb-1">Add SceneFlow AI to Home Screen</div>
            <div className="text-sf-text-secondary">Open the Share menu and tap “Add to Home Screen”.</div>
          </div>
        )}
      </div>
    </div>
  )
}
