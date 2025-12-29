'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ReactNode } from 'react'

/**
 * ThemeProvider - Forces dark mode only
 * 
 * SceneFlow AI uses a dark-only theme to match industry standards
 * for video production tools (Premiere, DaVinci, Final Cut).
 * Dark interfaces reduce eye strain during long editing sessions.
 * 
 * Light mode was removed to reduce complexity - the implementation
 * would require updating 50+ components with dark:/light: variants.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={true}
    >
      {children}
    </NextThemesProvider>
  )
}
