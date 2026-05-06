'use client'

import { useEffect, useState } from 'react'

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
              autoDisplay: false 
            },
            'google_translate_element'
          )
        }
      }

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
      className="google-translate-container flex items-center h-[36px]" 
    />
  )
}
