'use client'

import { Button } from '@/components/ui/Button'
import { trackCta } from '@/lib/analytics'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Menu, X, User, LogOut, Shield, Calculator, Sparkles, ChevronDown, LayoutDashboard, Settings, Pen, Image as ImageIcon, Film, BarChart3, Building2, Workflow, ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { AuthModal } from '@/components/auth/AuthModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Product definitions for dropdown
const products = [
  {
    id: 'writer',
    name: "Writer's Room",
    description: 'AI-powered script development',
    icon: Pen,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
  },
  {
    id: 'visualizer',
    name: 'Visualizer',
    description: 'Text-to-animatic generation',
    icon: ImageIcon,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  {
    id: 'editor',
    name: 'Smart Editor',
    description: 'AI post-production tools',
    icon: Film,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'analyst',
    name: 'Screening Room',
    description: 'Behavioral analytics',
    icon: BarChart3,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
]

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
            
            {/* Navigation Links - Center (Products | Workflow | Enterprise) */}
            <nav className="flex items-center space-x-2">
              {/* Products Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-4 py-2 text-gray-300 hover:text-white transition-colors cursor-pointer font-medium rounded-lg hover:bg-slate-800/50">
                    Products
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-72 p-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Modular Tools
                  </div>
                  {products.map((product) => {
                    const Icon = product.icon
                    return (
                      <DropdownMenuItem
                        key={product.id}
                        onClick={() => scrollToSection(`module-${product.id}`)}
                        className="flex items-start gap-3 p-3 rounded-lg cursor-pointer"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${product.bgColor}`}>
                          <Icon className={`w-5 h-5 ${product.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-white">{product.name}</div>
                          <div className="text-xs text-gray-400">{product.description}</div>
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => scrollToSection('pricing')}
                    className="flex items-center gap-2 p-3 text-sf-primary"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium">View All Plans</span>
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* The Workflow Link */}
              <button
                onClick={() => scrollToSection('unified-workflow')}
                className="flex items-center gap-1.5 px-4 py-2 text-gray-300 hover:text-white transition-colors cursor-pointer font-medium rounded-lg hover:bg-slate-800/50"
              >
                <Workflow className="w-4 h-4" />
                The Workflow
              </button>

              {/* Enterprise Link */}
              <button
                onClick={() => scrollToSection('pricing')}
                className="flex items-center gap-1.5 px-4 py-2 text-gray-300 hover:text-white transition-colors cursor-pointer font-medium rounded-lg hover:bg-slate-800/50"
              >
                <Building2 className="w-4 h-4" />
                Enterprise
              </button>
              
              {/* More Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-4 py-2 text-gray-300 hover:text-white transition-colors cursor-pointer font-medium rounded-lg hover:bg-slate-800/50">
                    More
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => scrollToSection('how-it-works')}>
                    How it Works
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => scrollToSection('use-cases')}>
                    Use Cases
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => scrollToSection('value-calculator')}>
                    <Calculator className="w-4 h-4 mr-2 text-emerald-400" />
                    Value Calculator
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => scrollToSection('testimonials')}>
                    Testimonials
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => scrollToSection('faq')}>
                    FAQ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
            
            {/* CTA Buttons - Right */}
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <>
                  {/* User Dropdown - Consolidates all auth controls */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <div className="w-8 h-8 bg-sf-primary rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-sf-background" />
                        </div>
                        <span className="text-sm font-medium text-white max-w-[100px] truncate">{user?.name || 'User'}</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5 text-sm text-gray-400">
                        {user?.email}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.location.href = '/dashboard/'}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => window.location.href = '/admin'}>
                          <Shield className="w-4 h-4 mr-2 text-amber-400" />
                          Admin Panel
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Primary CTA */}
                  <Button 
                    onClick={() => window.location.href = '/dashboard/'}
                    className="bg-sf-primary hover:bg-sf-accent text-sf-background shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 text-sm font-medium"
                  >
                    Go to Dashboard
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
                    onClick={() => { openAuthModal('signup') }}
                    className="bg-sf-primary hover:bg-sf-accent text-sf-background shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 text-sm font-medium"
                  >
                    Start a Project
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
                <nav className="flex flex-col space-y-1 pt-4">
                  {/* Products Section */}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Products
                  </div>
                  {products.map((product) => {
                    const Icon = product.icon
                    return (
                      <button
                        key={product.id}
                        onClick={() => scrollToSection(`module-${product.id}`)}
                        className="flex items-center gap-3 text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer font-medium text-base text-left py-3 px-3 rounded-lg"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${product.bgColor}`}>
                          <Icon className={`w-4 h-4 ${product.color}`} />
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.description}</div>
                        </div>
                      </button>
                    )
                  })}
                  
                  {/* Divider */}
                  <div className="border-t border-gray-800/50 my-2" />
                  
                  {/* Primary Navigation */}
                  <button onClick={() => scrollToSection('unified-workflow')} className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer font-medium text-base text-left py-3 px-3 rounded-lg">
                    <Workflow className="w-4 h-4" />
                    The Workflow
                  </button>
                  <button onClick={() => scrollToSection('pricing')} className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer font-medium text-base text-left py-3 px-3 rounded-lg">
                    <Building2 className="w-4 h-4" />
                    Enterprise
                  </button>
                  <button onClick={() => scrollToSection('how-it-works')} className="text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer font-medium text-base text-left py-3 px-3 rounded-lg">How it Works</button>
                  <button onClick={() => scrollToSection('use-cases')} className="text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer font-medium text-base text-left py-3 px-3 rounded-lg">Use Cases</button>
                  
                  {/* Featured: Value Calculator */}
                  <button 
                    onClick={() => { scrollToSection('value-calculator'); setIsMobileMenuOpen(false); }} 
                    className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer font-semibold text-base text-left py-3 px-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20"
                  >
                    <Calculator className="w-4 h-4" />
                    Calculate Your Savings
                    <Sparkles className="w-3 h-3" />
                  </button>
                  
                  <button onClick={() => scrollToSection('faq')} className="text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer font-medium text-base text-left py-3 px-3 rounded-lg">FAQ</button>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-800/50 my-2" />
                  
                  {/* Auth Section */}
                  <div className="flex flex-col space-y-2 pt-2">
                    {isAuthenticated ? (
                      <>
                        {/* User Info */}
                        <div className="flex items-center space-x-3 text-white py-2 px-3">
                          <div className="w-10 h-10 bg-sf-primary rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-sf-background" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{user?.name}</span>
                            <span className="text-xs text-gray-400">{user?.email}</span>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => window.location.href = '/dashboard/'}
                          className="w-full bg-sf-primary hover:bg-sf-accent text-sf-background py-3 text-base font-medium"
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Go to Dashboard
                        </Button>
                        
                        {isAdmin && (
                          <Button 
                            onClick={() => { window.location.href = '/admin' }}
                            variant="outline"
                            className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10 py-3 text-base font-medium"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Panel
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          onClick={handleLogout}
                          className="w-full border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-500/50 py-3 text-base font-medium"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => { openAuthModal('login') }}
                          className="w-full px-4 border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-background py-3 text-base font-medium"
                        >
                          Sign In
                        </Button>
                        <Button 
                          onClick={() => { openAuthModal('signup') }} 
                          className="w-full px-4 bg-sf-primary hover:bg-sf-accent text-sf-background py-3 text-base font-medium"
                        >
                          Start a Project
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
