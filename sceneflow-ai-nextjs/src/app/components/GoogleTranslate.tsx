'use client'

import { useEffect, useState } from 'react'
import { LANDING_TRANSLATE_INCLUDED_LANGUAGES } from '@/config/landingTranslateLanguages'

export function GoogleTranslate() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    // Check if script is already present to prevent duplicates
    if (!document.querySelector('#google-translate-script')) {
      // Define the initialization function globally
      ;(window as any).googleTranslateElementInit = () => {
        if ((window as any).google && (window as any).google.translate) {
          new (window as any).google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              includedLanguages: LANDING_TRANSLATE_INCLUDED_LANGUAGES,
              autoDisplay: false,
            },
            'google_translate_element'
          )
        }
      }

      // Add CSS to completely hide the Google Translate widget and its iframe
      const style = document.createElement('style')
      style.innerHTML = `
        .goog-te-banner-frame { display: none !important; }
        .goog-te-menu-value { display: none !important; }
        .goog-tooltip { display: none !important; }
        .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; border: none !important; box-shadow: none !important; }
        body { top: 0 !important; }
        #google_translate_element { display: none !important; }
      `
      document.head.appendChild(style)

      // Add the Google Translate script
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  // Avoid hydration errors by not rendering the container on the server
  if (!isClient) {
    return <div className="w-[140px] h-[36px]" />
  }

  return (
    <div 
      id="google_translate_element" 
      className="hidden" 
    />
  )
}
