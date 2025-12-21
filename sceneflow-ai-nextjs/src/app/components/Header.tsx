'use client'

import { Button } from '@/components/ui/Button'
import { trackCta } from '@/lib/analytics'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Menu, X, User, LogOut, Shield } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { AuthModal } from '@/components/auth/AuthModal'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const { data: session } = useSession()
  const isAuthenticated = !!session?.user
  const user = session?.user

  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/is-admin', { cache: 'no-store' })
        const json = await res.json().catch(()=>({})) as any
        if (!cancelled) setIsAdmin(Boolean(json?.isAdmin))
      } catch { if (!cancelled) setIsAdmin(false) }
    })()
    return () => { cancelled = true }
  }, [user?.email])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  const scrollToPricing = () => {
    const element = document.getElementById('pricing')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
  }

  const handleLogout = () => {
    signOut()
    setIsMobileMenuOpen(false)
  }

  // Auto-open modal if query contains ?login=1 or ?signup=1
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('login') === '1') {
      setAuthMode('login')
      setIsAuthModalOpen(true)
    }
    if (params.get('signup') === '1') {
      setAuthMode('signup')
      setIsAuthModalOpen(true)
    }
  }, [])

  return (
    <>
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Header */}
          <div className="hidden lg:flex justify-between items-center h-20">
            {/* Logo - Large and Prominent */}
            <div className="flex items-center space-x-4">
              {/* Gradient Logo Mark */}
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 via-purple-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <span className="text-xl font-bold text-white">SF</span>
              </div>
              
              {/* App Name - Larger and More Prominent */}
              <div className="flex flex-col">
                <h1 className="text-3xl font-bold tracking-tight">
                  <span className="text-white">SceneFlow</span>
                  <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent"> AI</span>
                </h1>
                <p className="text-xs text-gray-400 font-medium tracking-wider uppercase">
                  From Idea to Cinematic Reality
                </p>
              </div>
            </div>
            
            {/* Navigation Links - Center */}
            <nav className="flex items-center space-x-8">
              <button onClick={() => scrollToSection('how-it-works')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-lg">How it Works</button>
              <button onClick={() => scrollToSection('features')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-lg">Features</button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-lg">Pricing</button>
              <button onClick={() => scrollToSection('faq')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-lg">FAQ</button>
            </nav>
            
            {/* CTA Buttons - Right */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <Button 
                      onClick={() => { window.location.href = '/admin' }}
                      variant="outline"
                      className="border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-background transition-all duration-200"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  )}
                  <div className="flex items-center space-x-3 text-white">
                    <div className="w-8 h-8 bg-sf-primary rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{user?.name}</span>
                  </div>
                  <Button 
                    onClick={() => window.location.href = '/dashboard/'}
                    className="bg-sf-primary hover:bg-sf-accent text-sf-background shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-4 py-2 text-sm font-medium"
                  >
                    Go to Dashboard
                  </Button>
                  <Button 
                    onClick={handleLogout}
                    variant="outline"
                    className="border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-background transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => openAuthModal('login')}
                    variant="outline"
                    className="border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-background transition-all duration-200"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => { /*trackCta({ event: 'click', label: 'start-trial', location: 'header' });*/ openAuthModal('signup') }}
                    className="bg-sf-primary hover:bg-sf-accent text-sf-background shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-4 py-2 text-sm font-medium"
                  >
                    Start 7-Day Trial — $5
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Header - Large Logo and App Name */}
          <div className="lg:hidden">
            {/* Top Line - Large Logo and Mobile Menu Button */}
            <div className="flex justify-between items-center h-16">
              {/* Large Mobile Logo */}
              <div className="flex items-center space-x-3">
                {/* Gradient Logo Mark */}
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 via-purple-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <span className="text-lg font-bold text-white">SF</span>
                </div>
                
                {/* Mobile App Name */}
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold tracking-tight">
                    <span className="text-white">SceneFlow</span>
                    <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent"> AI</span>
                  </h1>
                </div>
              </div>
              
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-300 hover:text-white transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
            
            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
              <div className="lg:hidden pb-4 border-t border-gray-800/50">
                <nav className="flex flex-col space-y-3 pt-4">
                  <button onClick={() => scrollToSection('how-it-works')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-base text-left py-2">How it Works</button>
                  <button onClick={() => scrollToSection('features')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-base text-left py-2">Features</button>
                  <button onClick={() => scrollToSection('pricing')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-base text-left py-2">Pricing</button>
                  <button onClick={() => scrollToSection('faq')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-base text-left py-2">FAQ</button>
                  {isAuthenticated && isAdmin && (
                    <Button 
                      onClick={() => { window.location.href = '/admin' }}
                      variant="outline"
                      className="w-full bg-gray-800/50 hover:bg-gray-700/50 border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-background py-3 text-base font-medium"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  )}
                  
                  <div className="flex flex-col space-y-3 pt-4">
                    {isAuthenticated ? (
                      <>
                        <div className="flex items-center space-x-3 text-white py-2">
                          <div className="w-8 h-8 bg-sf-primary rounded-full flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">{user?.name}</span>
                        </div>
                        <Button 
                          onClick={() => window.location.href = '/dashboard/'}
                          className="w-full bg-sf-primary hover:bg-sf-accent text-sf-background py-3 text-base font-medium"
                        >
                          Go to Dashboard
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleLogout}
                          className="w-full bg-gray-800/50 hover:bg-gray-700/50 border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-background py-3 text-base font-medium"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Logout
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => { /*trackCta({ event: 'click', label: 'sign-in', location: 'mobile-menu' });*/ openAuthModal('login') }}
                          className="w-full px-4 bg-gray-800/50 hover:bg-gray-700/50 border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-background py-3 text-base font-medium"
                        >
                          Sign In
                        </Button>
                        <Button 
                          onClick={() => { /*trackCta({ event: 'click', label: 'start-trial', location: 'mobile-menu' });*/ openAuthModal('signup') }} 
                          className="w-full px-4 bg-sf-primary hover:bg-sf-accent text-sf-background py-3 text-base font-medium"
                        >
                          Start 7-Day Trial — $5
                        </Button>
                      </>
                    )}
                  </div>
                </nav>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authMode}
      />
    </>
  )
}
