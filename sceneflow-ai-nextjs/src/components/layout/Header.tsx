'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useEnhancedStore } from '@/store/enhancedStore'
import { Button } from '@/components/ui/Button'
import { 
  Settings, 
  LogOut, 
  Coins,
  Menu,
  X,
  HelpCircle
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { AuthModal } from '@/components/auth/AuthModal'

export function Header() {
  const { data: session } = useSession()
  const user = session?.user
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const { sidebarOpen } = useEnhancedStore()
  const pathname = usePathname()

  // Derive current page title for header suffix
  const pageTitle = (() => {
    const p = pathname || ''
    if (p.includes('/dashboard/studio') || p.includes('/dashboard/projects/new') || p.includes('/dashboard/workflow/ideation')) {
      return 'The Blueprint'
    }
    if (p.includes('/projects/') && p.includes('/vision')) {
      return 'VISION'
    }
    if (p.includes('/dashboard/templates')) return 'Templates'
    if (p.includes('/dashboard/story-insights')) return 'Story Insights'
    if (p.includes('/dashboard/project-bible')) return 'Series Bible'
    return ''
  })()

  const handleLogout = () => {
    signOut()
    setUserMenuOpen(false)
  }

  return (
    <>
      <header className={`sf-brand bg-black border-b border-dark-border sticky top-0 z-40 ${sidebarOpen ? 'lg:pl-80' : ''}`}>
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo and App Name - left aligned */}
            <div className="flex items-center">
              <div className="flex items-center ml-0">
                <div className="flex-shrink-0 flex items-center">
                  {/* Brand mark matching landing header styling, increased size */}
                  <div className="relative">
                    <div className="w-16 h-16 bg-sf-surface-light rounded-xl flex items-center justify-center">
                      <div className="w-10 h-10 bg-sf-primary rounded-lg flex items-center justify-center">
                        <div className="w-5 h-5 bg-sf-background rounded-sm"></div>
                      </div>
                    </div>
                    <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-sf-primary border-t-4 border-t-transparent border-b-4 border-b-transparent" />
                  </div>
                  <h1 className="app-name-text ml-4 font-extrabold text-dark-text tracking-tight flex items-end leading-none">
                    <span className="text-white text-2xl sm:text-3xl md:text-4xl">SceneFlow</span>
                    <span className="text-sf-primary text-2xl sm:text-3xl md:text-4xl ml-1">AI</span>
                    {pageTitle && (
                      <span
                        aria-label="Current section"
                        className="ml-4 pl-4 border-l border-white/20 font-semibold 
                                   text-sm sm:text-base md:text-lg text-blue-300"
                      >
                        {pageTitle}
                      </span>
                    )}
                  </h1>
                </div>
              </div>
            </div>

            {/* Right side - Help, Credits, and User Menu */}
            <div className="flex items-center space-x-3 sm:space-x-5">
              {/* Help link (icon-only on small) */}
              <a
                href="/dashboard/help"
                className="flex items-center space-x-2 px-2.5 sm:px-3 py-2 rounded-lg text-dark-text-secondary hover:text-dark-text hover:bg-dark-bg"
                aria-label="Help"
                title="Help"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="hidden md:inline text-base font-medium">Help</span>
              </a>
              {/* Credits Display (compact on small) */}
              {session && user && (
                <div
                  className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 bg-dark-accent/10 rounded-lg"
                  aria-label={`Credits available`}
                  title={`Credits available`}
                >
                  <Coins className="w-5 h-5 text-dark-accent" />
                  <span className="text-sm sm:text-base font-medium text-dark-accent">
                    Credits
                  </span>
                </div>
              )}

              {/* User Menu */}
              {session && user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-dark-accent"
                  >
                    <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="hidden md:block text-base font-medium text-dark-text">
                      {user.name}
                    </span>
                  </button>

                  {/* User Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-2xl z-50 border border-dark-border bg-gray-900">
                      <div className="px-4 py-3 border-b border-dark-border">
                        <p className="text-sm font-semibold text-white">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                      <a
                        href="/dashboard/settings"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </a>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="border-dark-border text-dark-text hover:bg-dark-bg" onClick={() => setAuthModalOpen(true)}>
                    Sign In
                  </Button>
                  <Button size="sm" className="bg-dark-accent hover:bg-dark-accent-hover" onClick={() => setAuthModalOpen(true)}>
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}
