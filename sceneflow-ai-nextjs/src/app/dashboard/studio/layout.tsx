'use client';

import { PanelGroup, Panel } from 'react-resizable-panels'
import { useState, useEffect } from 'react'

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Ensure component is mounted before accessing window
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if we're on mobile/tablet
  useEffect(() => {
    if (!mounted) return
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [mounted])

  // Show a simple container during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="h-full overflow-hidden">
        <div className="h-full overflow-y-auto bg-base">
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-hidden">
      {isMobile ? (
        // Mobile layout - full width content
        <div className="h-full overflow-y-auto bg-base">
          <div className="flex-1">
            {children}
          </div>
        </div>
      ) : (
        // Desktop layout - resizable panels
        <PanelGroup direction="horizontal" className="h-full">
          {/* Main content panel */}
          <Panel 
            defaultSize={100} 
            minSize={30}
            className="min-w-0"
          >
            <div className="h-full overflow-y-auto bg-base">
              <div className="flex-1">
                {children}
              </div>
            </div>
          </Panel>


        </PanelGroup>
      )}
    </div>
  )
}
