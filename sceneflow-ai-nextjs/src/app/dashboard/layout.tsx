'use client';

import { Sidebar } from '@/components/layout/Sidebar'
import DashboardHeader from './components/DashboardHeader'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { useCue } from '@/store/useCueStore'
import { AICoPilotPanel } from '@/components/studio/AICoPilotPanel'
import { useState, useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isSidebarOpen } = useCue()
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
    <div className="min-h-screen bg-base text-sf-text-secondary">
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader />
          <div className="flex-1 overflow-hidden">
            {isMobile ? (
              // Mobile layout - full width content
              <div className="h-full overflow-y-auto bg-base">
                <div className="p-4 sm:p-8">
                  <div className="max-w-7xl mx-auto">
                    {children}
                  </div>
                </div>
              </div>
            ) : (
              // Desktop layout - resizable panels
              <PanelGroup direction="horizontal" className="h-full">
                {/* Main content panel */}
                <Panel 
                  defaultSize={isSidebarOpen ? 70 : 100} 
                  minSize={30}
                  className="min-w-0"
                >
                  <div className="h-full overflow-y-auto bg-base">
                    <div className="p-4 sm:p-8">
                      <div className="max-w-7xl mx-auto">
                        {children}
                      </div>
                    </div>
                  </div>
                </Panel>

                {/* Cue sidebar panel */}
                {isSidebarOpen && (
                  <>
                    <PanelResizeHandle className="w-1 bg-sf-border hover:bg-sf-primary transition-colors" />
                    <Panel 
                      defaultSize={30} 
                      minSize={20}
                      maxSize={50}
                      className="min-w-0"
                    >
                      <div className="h-full bg-sf-surface-light border-l border-sf-border">
                        <AICoPilotPanel />
                      </div>
                    </Panel>
                  </>
                )}
              </PanelGroup>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
