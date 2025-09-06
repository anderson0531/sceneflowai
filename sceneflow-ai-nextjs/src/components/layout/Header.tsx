'use client'

import { useAuth } from '@/contexts/AuthContext'
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
import { useState } from 'react'

export function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { sidebarOpen } = useEnhancedStore()

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
  }

  return (
    <header className={`sf-brand bg-dark-card border-b border-dark-border sticky top-0 z-40 ${sidebarOpen ? 'lg:pl-80' : ''}`}>
      <div className="w-full px-6 sm:px-8">
        <div className="flex items-center justify-between h-24">
          {/* Logo and App Name - left aligned */}
          <div className="flex items-center">
            <div className="flex items-center ml-0">
              <div className="flex-shrink-0 flex items-center">
                {/* Brand mark matching landing header styling, increased size */}
                <div className="relative">
                  <div className="w-20 h-20 bg-sf-surface-light rounded-2xl flex items-center justify-center">
                    <div className="w-14 h-14 bg-sf-primary rounded-xl flex items-center justify-center">
                      <div className="w-7 h-7 bg-sf-background rounded-sm"></div>
                    </div>
                  </div>
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-sf-primary border-t-4 border-t-transparent border-b-4 border-b-transparent" />
                </div>
                <h1 className="app-name-text ml-5 font-extrabold text-dark-text tracking-tight" style={{ fontSize: '3.5rem', lineHeight: '1.03', fontWeight: 800 }}>
                  <span className="text-white">SceneFlow </span>
                  <span className="text-sf-primary">AI</span>
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
            {isAuthenticated && user && (
              <div
                className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 bg-dark-accent/10 rounded-lg"
                aria-label={`${user.credits} Credits`}
                title={`${user.credits} Credits`}
              >
                <Coins className="w-5 h-5 text-dark-accent" />
                <span className="text-sm sm:text-base font-medium text-dark-accent">
                  {user.credits}
                </span>
              </div>
            )}

            {/* User Menu */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-dark-accent"
                >
                  <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden md:block text-base font-medium text-dark-text">
                    {user.name}
                  </span>
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-dark-card rounded-md shadow-lg py-1 z-50 border border-dark-border">
                    <div className="px-4 py-2 border-b border-dark-border">
                      <p className="text-sm font-medium text-dark-text">{user.name}</p>
                      <p className="text-sm text-dark-text-secondary">{user.email}</p>
                    </div>
                    
                    <a
                      href="/settings"
                      className="flex items-center px-4 py-2 text-sm text-dark-text hover:bg-dark-bg"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </a>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-dark-text hover:bg-dark-bg"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" className="border-dark-border text-dark-text hover:bg-dark-bg" onClick={() => { window.location.href='/?login=1' }}>
                  Sign In
                </Button>
                <Button size="sm" className="bg-dark-accent hover:bg-dark-accent-hover" onClick={() => { window.location.href='/?signup=1' }}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
