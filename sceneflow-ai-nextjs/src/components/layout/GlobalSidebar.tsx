'use client';

import { Sidebar } from './Sidebar'
import { useEnhancedStore } from '@/store/enhancedStore'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface GlobalSidebarProps {
  children: React.ReactNode
}

export function GlobalSidebar({ children }: GlobalSidebarProps) {
  const { sidebarOpen, setSidebarOpen } = useEnhancedStore()
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Check if we're on mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      // Run the auto state alignment only once on mount
      if (!initialized) {
        if (mobile) {
          setSidebarOpen(false)
        } else {
          setSidebarOpen(true)
        }
        setInitialized(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [initialized, setSidebarOpen])

  // Don't show sidebar on landing page
  const isLandingPage = pathname === '/'

  return (
    <>
      {/* Main Navigation Sidebar - conditionally rendered */}
      {!isLandingPage && sidebarOpen && <Sidebar />}
      
      {/* Mobile close button when open */}
      {!isLandingPage && isMobile && sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-24 left-4 z-[10000] w-10 h-10 flex items-center justify-center rounded-full bg-gray-900/90 border border-gray-700 text-gray-200 shadow-lg active:scale-95 transition"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Desktop hide chevron when sidebar is open */}
      {!isLandingPage && !isMobile && sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-28 left-80 z-[9999] w-8 h-14 -ml-2 flex items-center justify-center rounded-l-lg bg-gray-800/90 border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 transition-all duration-300 shadow-lg"
          aria-label="Hide menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Toggle when sidebar is closed */}
      {!isLandingPage && !sidebarOpen && (
        <>
          {/* Desktop chevron */}
          {!isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed top-28 left-0 z-[9999] w-8 h-14 flex items-center justify-center rounded-r-lg bg-gray-800/90 border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 transition-all duration-300 shadow-lg"
              aria-label="Show menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {/* Mobile floating hamburger */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed top-24 left-4 z-[9999] w-10 h-10 flex items-center justify-center rounded-full bg-gray-900/90 border border-gray-700 text-gray-200 shadow-lg active:scale-95 transition"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </>
      )}

      {/* Content wrapper shifts when sidebar is open on desktop to avoid overlay */}
      <div className={`${!isLandingPage && !isMobile && sidebarOpen ? 'lg:pl-80' : ''} transition-[padding] duration-300`}>
        {children}
      </div>
    </>
  )
}
