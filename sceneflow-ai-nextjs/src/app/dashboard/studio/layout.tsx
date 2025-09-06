'use client';

import { PanelGroup, Panel } from 'react-resizable-panels'
import { useState, useEffect } from 'react'

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobile, setIsMobile] = useState(false)

  // Check if we're on mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
