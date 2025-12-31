'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to check if a media query matches
 * @param query - CSS media query string (e.g., '(min-width: 1024px)')
 * @returns boolean indicating if the query matches, null during SSR
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    
    // Set initial value
    setMatches(mediaQuery.matches)

    // Create event listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener for changes
    mediaQuery.addEventListener('change', handler)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])

  return matches
}

/**
 * Hook to check if screen is at least tablet/desktop size (1024px)
 * @returns boolean - true if screen is >= 1024px, null during SSR
 */
export function useIsDesktopOrTablet(): boolean | null {
  return useMediaQuery('(min-width: 1024px)')
}

/**
 * Hook to check if screen is mobile size (< 768px)
 * @returns boolean - true if screen is < 768px, null during SSR
 */
export function useIsMobile(): boolean | null {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  if (isDesktop === null) return null
  return !isDesktop
}

/**
 * Hook to get current breakpoint
 * @returns 'mobile' | 'tablet' | 'desktop' | 'large' | null (null during SSR)
 */
export function useBreakpoint(): 'mobile' | 'tablet' | 'desktop' | 'large' | null {
  const isSm = useMediaQuery('(min-width: 640px)')
  const isMd = useMediaQuery('(min-width: 768px)')
  const isLg = useMediaQuery('(min-width: 1024px)')
  const isXl = useMediaQuery('(min-width: 1280px)')

  // During SSR, return null
  if (isSm === null) return null

  if (isXl) return 'large'
  if (isLg) return 'desktop'
  if (isMd) return 'tablet'
  return 'mobile'
}
