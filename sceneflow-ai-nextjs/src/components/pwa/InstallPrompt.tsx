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

    // Check if user permanently dismissed
    try {
      const permanentDismissal = localStorage.getItem('pwa-install-never-show')
      if (permanentDismissal === 'true') {
        return
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler as any)

    return () => window.removeEventListener('beforeinstallprompt', handler as any)
  }, [])

  // Don't show if app is already installed
  if (isStandalone) return null
  
  // Don't show if user dismissed or no prompt available
  if (!showBanner) return null
  
  // Don't show on non-iOS if no deferred prompt
  if (!isIOS && !deferredPrompt) return null

  const handleDismiss = () => {
    setShowBanner(false)
    // Store dismissal in localStorage to prevent showing again this session
    try {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  const handleDontAskAgain = () => {
    setShowBanner(false)
    // Permanently store dismissal preference
    try {
      localStorage.setItem('pwa-install-never-show', 'true')
    } catch (e) {
      // Ignore localStorage errors
    }
  }

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
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-semibold">Install SceneFlow AI</div>
                <div className="text-sf-text-secondary">Get a faster, app-like experience.</div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDismiss} className="px-3 py-1.5 rounded-md border border-sf-border text-sm hover:bg-gray-800/50 transition-colors">
                  Not now
                </button>
                <button onClick={install} className="px-3 py-1.5 rounded-md bg-sf-gradient text-sf-background text-sm hover:opacity-90 transition-opacity">
                  Install
                </button>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-sf-border/50">
              <button onClick={handleDontAskAgain} className="text-xs text-sf-text-secondary hover:text-sf-text-primary transition-colors">
                Don't ask again
              </button>
            </div>
          </div>
        )}
        {isIOS && (
          <div>
            <div className="text-sm">
              <div className="font-semibold mb-1">Add SceneFlow AI to Home Screen</div>
              <div className="text-sf-text-secondary">Open the Share menu and tap "Add to Home Screen".</div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <button onClick={handleDontAskAgain} className="text-xs text-sf-text-secondary hover:text-sf-text-primary transition-colors">
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
