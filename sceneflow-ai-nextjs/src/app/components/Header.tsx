'use client'

import { Button } from '@/components/ui/Button'
import { trackCta } from '@/lib/analytics'
import { motion } from 'framer-motion'
import { Menu, X, User, LogOut, Shield, Sparkles, ChevronDown, LayoutDashboard, Film, Building2, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  getDashboardUrl,
  getLoginUrl,
  getLoginUrlFromLegacySearch,
  navigateToDashboard,
} from '@/lib/auth/postLoginRedirect'
import { LanguageSelector } from './LanguageSelector'
import { SceneFlowStudioBrand } from '@/components/layout/SceneFlowStudioBrand'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { getLandingLocalePath } from '@/i18n/locale'

export function Header() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const homeHref = getLandingLocalePath(locale)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const { data: session } = useSession()
  const isAuthenticated = !!session?.user
  const user = session?.user

  const loginUrl = getLoginUrl({ returnUrl: getDashboardUrl(), mode: 'login' })
  const signupUrl = getLoginUrl({ mode: 'signup' })

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

  const goToLogin = () => {
    window.location.href = loginUrl
    setIsMobileMenuOpen(false)
  }

  const goToSignup = () => {
    window.location.href = signupUrl
    setIsMobileMenuOpen(false)
  }

  // Redirect legacy auth query params on landing to dedicated /login page
  useEffect(() => {
    if (typeof window === 'undefined' || isAuthenticated) return
    const legacyLoginUrl = getLoginUrlFromLegacySearch(window.location.search)
    if (legacyLoginUrl) {
      window.location.replace(legacyLoginUrl)
    }
  }, [isAuthenticated])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    signOut()
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <motion.header 
        className={`landing-header fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-sf-brand-navy/95 backdrop-blur-md shadow-lg shadow-black/20' 
            : 'bg-transparent backdrop-blur-sm'
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800/50">
          <motion.div 
            className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500"
            style={{ width: `${scrollProgress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Header */}
          <div className="hidden lg:flex justify-between items-center h-20">
            <SceneFlowStudioBrand
              href={homeHref}
              variant="landing"
              nameClassName="text-white"
            />
            
            {/* Navigation Links - Center */}
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => scrollToSection('use-cases')}
                className="flex items-center gap-1.5 px-4 py-2 text-gray-300 hover:text-white transition-colors cursor-pointer font-medium rounded-lg hover:bg-slate-800/50"
              >
                <Building2 className="w-4 h-4" />
                {t('useCases')}
              </button>

              <button
                onClick={() => scrollToSection('pipeline')}
                className="flex items-center gap-1.5 px-4 py-2 text-gray-300 hover:text-white transition-colors cursor-pointer font-medium rounded-lg hover:bg-slate-800/50"
              >
                <Film className="w-4 h-4" />
                {t('pipeline')}
              </button>

              <button
                onClick={() => scrollToSection('pricing')}
                className="flex items-center gap-1.5 px-4 py-2 text-gray-300 hover:text-white transition-colors cursor-pointer font-medium rounded-lg hover:bg-slate-800/50"
              >
                <Sparkles className="w-4 h-4 text-sf-primary" />
                {t('plansPricing')}
              </button>
            </nav>
            
            {/* CTA Buttons - Right */}
            <div className="flex items-center space-x-3">
              <LanguageSelector />
              {isAuthenticated ? (
                <>
                  {/* User Dropdown - Consolidates all auth controls */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <div className="w-8 h-8 bg-sf-primary rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-sf-background" />
                        </div>
                        <span className="text-sm font-medium text-white max-w-[100px] truncate">{user?.name || t('userFallback')}</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5 text-sm text-gray-400">
                        {user?.email}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigateToDashboard()}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {t('dashboard')}
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => window.location.href = '/admin'}>
                          <Shield className="w-4 h-4 mr-2 text-amber-400" />
                          {t('adminPanel')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400">
                        <LogOut className="w-4 h-4 mr-2" />
                        {t('signOut')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Primary CTA */}
                  <Button 
                    onClick={() => navigateToDashboard()}
                    className="bg-sf-primary hover:bg-sf-accent text-sf-background shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 text-sm font-medium"
                  >
                    {t('goToDashboard')}
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={goToLogin}
                    variant="outline"
                    className="border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-background transition-all duration-200"
                  >
                    {t('signIn')}
                  </Button>
                  <Button 
                    onClick={goToSignup}
                    className="bg-sf-primary hover:bg-sf-accent text-sf-background shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 text-sm font-medium"
                  >
                    {t('startProject')}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Header - Consistent with App */}
          <div className="lg:hidden">
            {/* Top Line - Logo and Mobile Menu Button */}
            <div className="flex justify-between items-center h-16">
              <SceneFlowStudioBrand
                href="/"
                variant="landing"
                nameClassName="text-white"
              />
              
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
                  <button onClick={() => scrollToSection('use-cases')} className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer font-medium text-base text-left py-3 px-3 rounded-lg">
                    <Building2 className="w-4 h-4" />
                    {t('useCases')}
                  </button>
                  <button onClick={() => scrollToSection('pipeline')} className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer font-medium text-base text-left py-3 px-3 rounded-lg">
                    <Film className="w-4 h-4" />
                    {t('pipeline')}
                  </button>
                  <button onClick={() => scrollToSection('pricing')} className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer font-medium text-base text-left py-3 px-3 rounded-lg">
                    <Sparkles className="w-4 h-4 text-sf-primary" />
                    {t('plansPricing')}
                  </button>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-800/50 my-2" />
                  
                  {/* Auth Section */}
                  <div className="flex flex-col space-y-2 pt-2">
                    <div className="px-3 pb-2 flex justify-start">
                      <LanguageSelector />
                    </div>
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
                          onClick={() => navigateToDashboard()}
                          className="w-full bg-sf-primary hover:bg-sf-accent text-sf-background py-3 text-base font-medium"
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          {t('goToDashboard')}
                        </Button>
                        
                        {isAdmin && (
                          <Button 
                            onClick={() => { window.location.href = '/admin' }}
                            variant="outline"
                            className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10 py-3 text-base font-medium"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            {t('adminPanel')}
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          onClick={handleLogout}
                          className="w-full border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-500/50 py-3 text-base font-medium"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {t('signOut')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={goToLogin}
                          className="w-full px-4 border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-background py-3 text-base font-medium"
                        >
                          {t('signIn')}
                        </Button>
                        <Button 
                          onClick={goToSignup} 
                          className="w-full px-4 bg-sf-primary hover:bg-sf-accent text-sf-background py-3 text-base font-medium"
                        >
                          {t('startProject')}
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
    </>
  )
}
