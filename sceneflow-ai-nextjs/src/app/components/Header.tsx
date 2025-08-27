'use client'

import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Menu, X, User, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const { user, isAuthenticated, logout } = useAuth()

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
    logout()
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <motion.header 
        className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Header */}
          <div className="hidden lg:flex justify-between items-center h-24">
            {/* Logo - Large and Prominent */}
            <div className="flex items-center space-x-4">
              {/* Updated Logo with teal-green accent matching dashboard */}
              <div className="relative">
                <div className="w-16 h-16 bg-sf-surface-light rounded-lg flex items-center justify-center">
                  <div className="w-10 h-10 bg-sf-primary rounded-md flex items-center justify-center">
                    <div className="w-5 h-5 bg-sf-background rounded-sm"></div>
                  </div>
                </div>
                {/* Small connector triangle in teal-green */}
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-2 border-l-sf-primary border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
              </div>
              
              {/* App Name and Tagline */}
              <div className="flex flex-col space-y-1">
                <h1 className="text-3xl font-bold">
                  <span className="text-white">SceneFlow </span>
                  <span className="text-sf-primary">AI</span>
                </h1>
                <p className="text-sm text-gray-400 font-medium tracking-wide">
                  Imagine. Generate. Flow.
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
                    onClick={() => openAuthModal('signup')}
                    className="bg-sf-primary hover:bg-sf-accent text-sf-background shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-4 py-2 text-sm font-medium"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Header - Large Logo and App Name */}
          <div className="lg:hidden">
            {/* Top Line - Large Logo and Mobile Menu Button */}
            <div className="flex justify-between items-center h-20">
              {/* Large Mobile Logo */}
              <div className="flex items-center space-x-3">
                {/* Updated Mobile Logo with teal-green accent matching dashboard */}
                <div className="relative">
                  <div className="w-12 h-12 bg-sf-surface-light rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 bg-sf-primary rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 bg-sf-background rounded-sm"></div>
                    </div>
                  </div>
                  {/* Small connector triangle in teal-green */}
                  <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-2 border-l-sf-primary border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                </div>
                
                {/* Mobile App Name and Tagline */}
                <div className="flex flex-col space-y-1">
                  <h1 className="text-lg font-bold">
                    <span className="text-white">SceneFlow </span>
                    <span className="text-sf-primary">AI</span>
                  </h1>
                  <p className="text-xs text-gray-400 font-medium tracking-wide">
                    Imagine. Generate. Flow.
                  </p>
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
                          onClick={() => openAuthModal('login')}
                          className="w-full px-4 bg-gray-800/50 hover:bg-gray-700/50 border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-background py-3 text-base font-medium"
                        >
                          Sign In
                        </Button>
                        <Button 
                          onClick={() => openAuthModal('signup')} 
                          className="w-full px-4 bg-sf-primary hover:bg-sf-accent text-sf-background py-3 text-base font-medium"
                        >
                          Get Started
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
