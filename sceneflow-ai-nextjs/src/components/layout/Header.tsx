'use client'

import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { 
  Settings, 
  LogOut, 
  Coins,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const { user, setUser, setAuthenticated, sidebarOpen, setSidebarOpen } = useStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = () => {
    setUser(null)
    setAuthenticated(false)
    setUserMenuOpen(false)
  }

  return (
    <header className="bg-dark-card border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Mobile Menu Button */}
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-dark-text-secondary hover:text-dark-text hover:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-dark-accent md:hidden"
            >
              {sidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            
            <div className="flex items-center ml-4 md:ml-0">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SF</span>
                </div>
                <h1 className="ml-3 text-lg font-bold text-dark-text">
                  SceneFlow AI
                </h1>
              </div>
            </div>
          </div>

          {/* Right side - Credits and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Credits Display */}
            {user && (
              <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-dark-accent/10 rounded-lg">
                <Coins className="w-4 h-4 text-dark-accent" />
                <span className="text-sm font-medium text-dark-accent">
                  {user.credits} Credits
                </span>
              </div>
            )}

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-dark-accent"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm font-medium text-dark-text">
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
                <Button variant="outline" size="sm" className="border-dark-border text-dark-text hover:bg-dark-bg">
                  Sign In
                </Button>
                <Button size="sm" className="bg-dark-accent hover:bg-dark-accent-hover">
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
