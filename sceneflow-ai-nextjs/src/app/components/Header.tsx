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
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const { data: session } = useSession()
  const isAuthenticated = !!session?.user
  const user = session?.user

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0
      setScrollProgress(progress)
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial state
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  // Only open auth modal if explicitly requested via URL query params
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('login') === '1' && !isAuthenticated) {
      setAuthMode('login')
      setIsAuthModalOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('signup') === '1' && !isAuthenticated) {
      setAuthMode('signup')
      setIsAuthModalOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [isAuthenticated])

  return (
    <>
      <motion.header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-slate-900/95 backdrop-blur-md shadow-lg shadow-black/10' 
            : 'bg-transparent backdrop-blur-sm'
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800/50">
          <motion.div 
            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
            style={{ width: `${scrollProgress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Header */}
          <div className="hidden lg:flex justify-between items-center h-20">
            {/* Logo - Consistent with App */}
            <div className="flex items-center gap-3">
              {/* Logo matching app style */}
              <div className="w-11 h-11 bg-sf-surface-light rounded-xl flex items-center justify-center">
                <div className="w-6 h-6 bg-sf-primary rounded-lg flex items-center justify-center">
                  <div className="w-3 h-3 bg-sf-background rounded-sm" />
                </div>
              </div>
              
              {/* App Name - Larger and properly aligned */}
              <span className="text-2xl font-bold tracking-tight leading-none">
                <span className="text-white">SceneFlow</span>
                <span className="text-sf-primary"> AI</span>
              </span>
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
                    Get Started — $5
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Header - Consistent with App */}
          <div className="lg:hidden">
            {/* Top Line - Logo and Mobile Menu Button */}
            <div className="flex justify-between items-center h-16">
              {/* Mobile Logo - Matching app style */}
              <div className="flex items-center space-x-3">
                {/* Logo matching app style */}
                <div className="w-10 h-10 bg-sf-surface-light rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 bg-sf-primary rounded-md flex items-center justify-center">
                    <div className="w-3 h-3 bg-sf-background rounded-sm" />
                  </div>
                </div>
                
                {/* Mobile App Name */}
                <h1 className="text-xl font-bold tracking-tight">
                  <span className="text-white">SceneFlow</span>
                  <span className="text-sf-primary"> AI</span>
                </h1>
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
                          Get Started — $5
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
