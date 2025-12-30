'use client'

import { useState, useEffect } from 'react'
import { X, Cookie, Settings, Shield } from 'lucide-react'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'sceneflow-cookie-consent'

type ConsentLevel = 'all' | 'essential' | 'none' | null

interface CookiePreferences {
  essential: boolean // Always true - required for site to work
  analytics: boolean
  marketing: boolean
  consentDate: string
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    consentDate: ''
  })

  useEffect(() => {
    // Check if user has already consented
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) {
      // Delay showing banner slightly for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    } else {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences
        setPreferences(parsed)
      } catch {
        // Invalid stored data, show banner again
        setShowBanner(true)
      }
    }
  }, [])

  const saveConsent = (prefs: CookiePreferences) => {
    const withDate = { ...prefs, consentDate: new Date().toISOString() }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(withDate))
    setPreferences(withDate)
    setShowBanner(false)
    setShowSettings(false)
  }

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      consentDate: ''
    })
  }

  const handleEssentialOnly = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      consentDate: ''
    })
  }

  const handleSavePreferences = () => {
    saveConsent(preferences)
  }

  if (!showBanner) return null

  return (
    <>
      {/* Backdrop for settings modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/60 z-[9998]" 
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Main Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4">
        <div className="max-w-4xl mx-auto">
          {showSettings ? (
            /* Detailed Settings Panel */
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Cookie Preferences</h3>
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-gray-400 text-sm mb-6">
                  We use cookies to enhance your experience. You can customize your preferences below.
                  For more details, see our <Link href="/privacy" className="text-purple-400 hover:underline">Privacy Policy</Link>.
                </p>

                <div className="space-y-4">
                  {/* Essential Cookies - Always On */}
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div>
                      <h4 className="font-medium text-white">Essential Cookies</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Required for the website to function. Cannot be disabled.
                      </p>
                    </div>
                    <div className="relative">
                      <div className="w-12 h-6 bg-purple-600 rounded-full">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div>
                      <h4 className="font-medium text-white">Analytics Cookies</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Help us understand how visitors interact with our website.
                      </p>
                    </div>
                    <button
                      onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                      className="relative"
                    >
                      <div className={`w-12 h-6 rounded-full transition-colors ${preferences.analytics ? 'bg-purple-600' : 'bg-gray-600'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${preferences.analytics ? 'right-1' : 'left-1'}`}></div>
                      </div>
                    </button>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div>
                      <h4 className="font-medium text-white">Marketing Cookies</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Used to deliver relevant advertisements and track campaign performance.
                      </p>
                    </div>
                    <button
                      onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                      className="relative"
                    >
                      <div className={`w-12 h-6 rounded-full transition-colors ${preferences.marketing ? 'bg-purple-600' : 'bg-gray-600'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${preferences.marketing ? 'right-1' : 'left-1'}`}></div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSavePreferences}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Save Preferences
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Accept All
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Simple Banner */
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-1">We value your privacy</h3>
                  <p className="text-gray-400 text-sm">
                    We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
                    By clicking &quot;Accept All&quot;, you consent to our use of cookies. 
                    <Link href="/privacy" className="text-purple-400 hover:underline ml-1">Learn more</Link>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex-1 md:flex-none px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    Customize
                  </button>
                  <button
                    onClick={handleEssentialOnly}
                    className="flex-1 md:flex-none px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    Essential Only
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="flex-1 md:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Accept All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/**
 * Hook to check cookie consent status
 * Use this to conditionally load analytics/marketing scripts
 */
export function useCookieConsent(): CookiePreferences | null {
  const [consent, setConsent] = useState<CookiePreferences | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (stored) {
      try {
        setConsent(JSON.parse(stored))
      } catch {
        setConsent(null)
      }
    }
  }, [])

  return consent
}
